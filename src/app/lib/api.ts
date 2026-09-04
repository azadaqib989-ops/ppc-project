// Thin REST client for the PPCA backend (see BACKEND_REQUIREMENTS_PROMPT.md / API doc shared in chat).
// All calls unwrap the { success, data } / { success, error } envelope and throw a
// plain Error with a human-readable message on failure, so callers can just
// `catch (e) { toast.error(e.message) }`.
import { API_BASE_URL } from "./auth";
import type { StoreProject, ProjectAttachment } from "./store";
import type { ProjectExtendedDetails } from "./mockData";

export interface ApiPage<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiProject {
  id: string;
  title: string;
  summary: string;
  imageUrl?: string;
  coverImageUrl?: string;
  provinceName: string;
  district?: string;
  sectorName: string;
  status: string;
  costUsd: number;
  fundingGapUsd: number;
  coFinancingUsd?: number;
  beneficiaries: number;
  jobs: number;
  readiness: number;
  startDate?: string;
  endDate?: string;
  implementingAgency?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  riskNotes?: string;
  wefTags: string[];
  attachments: ApiAttachment[];
  createdAt: string;
  modifiedAt: string;
  extendedDetails?: ProjectExtendedDetails;
}

export interface ApiAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface ApiStatusEvent {
  id: string;
  status: string;
  note: string | null;
  changedByUserName: string;
  createdAt: string;
  attachments?: ApiAttachment[];
}

export interface ApiProgressUpdate {
  id: string;
  text: string;
  authorName: string;
  createdAt: string;
  attachments?: ApiAttachment[];
}

export interface ApiInvestorInterest {
  id: string;
  projectId: string;
  projectTitle: string;
  status: string;
  message: string;
  createdAt: string;
  modifiedAt: string;
}

export interface ApiSavedProject {
  id: string;
  project: ApiProject;
  savedAt: string;
}

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  title?: string;
  organization?: string;
  country?: string;
  imageUrl?: string;
  role: string;
  provinceId?: string | null;
  provinceName?: string | null;
  active?: boolean;
  createdAt?: string;
}

export interface ApiCurrentUser extends ApiUser {
  provinceId?: string | null;
  provinceName?: string | null;
  active?: boolean;
}

// Verified against the actual backend DTO (LoginResponse in AuthAndUserDtos.cs / AuthService.cs):
// POST /auth/login returns { success: true, data: { accessToken, refreshToken, user: { id, name, email, role, organization, provinceId } } }.
export interface ApiLoginUser {
  id: string;
  name: string;
  email: string;
  role: string;
  organization?: string | null;
  provinceId?: string | null;
}

export interface ApiLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: ApiLoginUser;
}

export interface ApiAdminOverview {
  totalProjects: number;
  approvedProjects: number;
  submittedProjects: number;
  underReviewProjects: number;
  returnedProjects: number;
  draftProjects: number;
  totalCostUsd: number;
  fundingGapUsd: number;
  totalBeneficiaries: number;
  totalJobs: number;
  projectsByProvince: Array<{ provinceName: string; count: number; fundingGapUsd: number }>;
  projectsBySector: Array<{ sectorName: string; count: number }>;
  projectsByStatus: Array<{ status: string; count: number; percentage: number }>;
  pipelineTrend: Array<{ month: string; submitted: number; approved: number }>;
}

export interface ApiProvince { id: string; name: string; createdAt?: string }
export interface ApiSector { id: string; name: string; color: string; createdAt?: string }
export interface ApiWefTag { value: string; label: string }

export interface ApiAnalytics {
  wefNexus: Array<{ name: string; value: number; color: string }>;
  sectorBreakdown: Array<{ sector: string; count: number; funding: number }>;
  geography: Array<{ province: string; count: number; funding: number; saturation: string }>;
}

export interface ApiNotification {
  id: string;
  audience: string;
  text: string;
  createdAt: string;
  isRead: boolean;
}

export interface ApiComment {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
  attachments?: Array<ApiAttachment | string>;
}

export interface ApiProvinceSummary {
  id: string;
  name: string;
  totalProjects: number;
  approvedProjects: number;
  focalPointName: string;
  fundingGapUsd: number;
  saturation: string;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("pcpp_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { ...authHeaders(), ...(options.headers || {}) },
    });
  } catch {
    throw new Error("Unable to reach the server. Please check your connection and try again.");
  }

  let payload: any = null;
  try { payload = await response.json(); } catch { /* empty/non-JSON body */ }

  if (response.status === 401 && !path.startsWith("/auth/refresh") && localStorage.getItem("pcpp_refresh_token")) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request<T>(path, options);
  }

  const hasStandardEnvelope = payload && typeof payload === "object" && "success" in payload;
  if (hasStandardEnvelope && !payload.success) {
    const details = payload?.error?.details;
    const detailMsg = Array.isArray(details) && details.length
      ? details.map((d: any) => d.errorMessage || d.message || d.propertyName).filter(Boolean).join(" ")
      : "";
    const errorMessage = typeof payload.error === "string" ? payload.error : payload?.error?.message;
    throw new Error(errorMessage || detailMsg || `Request failed (${response.status}).`);
  }

  if (!response.ok && !hasStandardEnvelope) {
    const message = payload?.message || payload?.error?.message || `Request failed (${response.status}).`;
    throw new Error(message);
  }

  if (hasStandardEnvelope) return payload.data as T;
  if (payload !== null && payload !== undefined) return payload as T;
  return undefined as unknown as T;
}

function json(path: string, method: string, body?: unknown) {
  return request(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function loginApi(email: string, password: string): Promise<ApiLoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password }),
  });

  let payload: any = null;
  try { payload = await response.json(); } catch { /* empty/non-JSON body */ }

  if (!payload || (typeof payload === "object" && "success" in payload && !payload.success)) {
    throw new Error(payload?.error?.message || `Login failed (${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error?.message || `Login failed (${response.status}).`);
  }

  const data = payload.data ?? payload;
  const user: ApiLoginUser = data.user;
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user,
  };
}

// ─── Reference data ─────────────────────────────────────────────────────
export const getProvinces = () => request<ApiProvince[]>("/reference/provinces");
export const getSectors = () => request<ApiSector[]>("/reference/sectors");
export const getWefTags = () => request<ApiWefTag[]>("/reference/wef-tags");

// ─── Projects ───────────────────────────────────────────────────────────
export function getCatalogue(params: Record<string, string | number | undefined> = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "" && v !== "All") qs.set(k, String(v)); });
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request<ApiPage<ApiProject>>(`/projects/catalogue${suffix}`);
}
export const getMyProjects = (params: Record<string, string | number | undefined> = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "" && v !== "All") qs.set(k, String(v)); });
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request<ApiPage<ApiProject>>(`/projects${suffix}`);
};
export const getProject = (id: string) => request<ApiProject>(`/projects/${id}`);
export const createProject = (form: FormData) => request<ApiProject>("/projects", { method: "POST", body: form });
export const updateProjectApi = (id: string, form: FormData) => request<ApiProject>(`/projects/${id}`, { method: "PATCH", body: form });
export const uploadProjectAttachment = (id: string, file: File) => {
  const form = new FormData();
  form.append("file", file);
  form.append("projectId", id);
  return request<ApiAttachment>("/files/upload", { method: "POST", body: form });
};
export const submitProject = (id: string, note: string) => json(`/projects/${id}/submit`, "POST", { note }) as Promise<ApiProject>;
// Backend exposes dedicated /approve and /return endpoints (not a generic /status endpoint).
export const approveProject = (id: string, note: string) => json(`/projects/${id}/approve`, "POST", { note }) as Promise<ApiProject>;
export const returnProject = (id: string, note: string, attachmentIds: string[] = []) =>
  json(`/projects/${id}/return`, "POST", { note, attachmentIds }) as Promise<ApiProject>;
export const addProgressUpdate = (id: string, text: string, attachmentIds: string[] = []) =>
  json(`/projects/${id}/progress-update`, "POST", { text, attachments: attachmentIds }) as Promise<ApiProgressUpdate>;
export const getProgressUpdates = (id: string) => request<ApiProgressUpdate[]>(`/projects/${id}/progress-updates`);
export const getStatusHistory = (id: string) => request<ApiStatusEvent[]>(`/projects/${id}/status-history`);
export const addProjectComment = (id: string, note: string, attachmentIds: string[] = []) =>
  json(`/projects/${id}/comments`, "POST", { note, attachmentIds }) as Promise<ApiProject>;

// ─── Investor ───────────────────────────────────────────────────────────
export function getSavedProjects(params: Record<string, string | number | undefined> = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") qs.set(k, String(v)); });
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request<ApiPage<ApiSavedProject>>(`/investor/saved-projects${suffix}`);
}
export const saveProject = (projectId: string) => request<ApiSavedProject>(`/investor/saved-projects/${projectId}`, { method: "POST" });
export const unsaveProject = (projectId: string) => request<void>(`/investor/saved-projects/${projectId}`, { method: "DELETE" });
export const createInterest = (projectId: string, message: string) =>
  json("/investor/interests", "POST", { projectId, message }) as Promise<ApiInvestorInterest>;
export function getInvestorInterests(params: Record<string, string | number | undefined> = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "" && v !== "All") qs.set(k, String(v)); });
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request<ApiInvestorInterest[]>(`/investor/interests${suffix}`).then(data => ({ data, page: 1, pageSize: data.length, total: data.length, totalPages: 1 }));
}
export const getInterestTimeline = (id: string) => request<{ id: string; note: string; byUserName: string; createdAt: string }[]>(`/investor/interests/${id}/timeline`);
export const addInterestTimeline = (id: string, note: string) =>
  json(`/investor/interests/${id}/timeline`, "POST", { note }) as Promise<{ id: string; note: string; byUserName: string; createdAt: string }[]>;
export const getFocalInterests = () => request<ApiInvestorInterest[]>("/investor/focal-interests");
// Wire enum per backend doc is InDiscussion|Connected|Declined (no spaces) — map the UI's
// "In discussion" display label to "InDiscussion" before calling this.
export const updateInterestStatus = (id: string, status: string) => json(`/investor/interests/${id}`, "PATCH", { status }) as Promise<ApiInvestorInterest>;

// ─── Users ──────────────────────────────────────────────────────────────
export const getCurrentUserProfile = () => request<ApiCurrentUser>("/auth/me");
// GET /api/v1/users supports 1-based page/pageSize paging per Users API spec (Admin only).
export function getAllUsers(params: { page?: number; pageSize?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request<ApiUser[]>(`/users${suffix}`);
}
export const getUserById = (id: string) => request<ApiUser>(`/users/${id}`);
// POST /api/v1/users — Admin only. Role must be one of Admin|Reviewer|Focal|Investor.
export interface UserCreateRequest {
  name: string;
  email: string;
  password: string;
  role: "Admin" | "Reviewer" | "Focal" | "Investor";
  title?: string;
  provinceId?: string;
}
export interface UserUpdateRequest {
  name?: string;
  title?: string;
}
export const createUser = (body: UserCreateRequest) => json("/users", "POST", body) as Promise<ApiUser>;
export const updateUser = (userId: string, data: UserUpdateRequest) => json(`/users/${userId}`, "PUT", data) as Promise<ApiUser>;
export const deactivateUser = (userId: string) => json(`/users/${userId}`, "DELETE") as Promise<{ success: boolean; message: string }>;
// Backend only implements investor self-signup (POST /auth/signup-investor) for public signup —
// use `createUser` (POST /users, Admin only) for admin-created accounts of any role.
export const signupInvestor = (body: { name: string; email: string; password: string; organization?: string; country?: string }) =>
  json("/auth/signup-investor", "POST", body) as Promise<{ id: string; email: string; name: string; role: string }>;
export const signupFocal = (body: { name: string; email: string; password: string; provinceId: string; organization?: string; title?: string }) =>
  json("/auth/signup-focal", "POST", body) as Promise<{ id: string; email: string; name: string; role: string; provinceId?: string }>;

export const getAdminOverview = () => request<ApiAdminOverview>("/admin/dashboard/overview");
export function getAdminReviewQueue(params: Record<string, string | number | undefined> = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "" && v !== "All") qs.set(k, String(v)); });
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request<ApiPage<ApiProject>>(`/admin/review-queue${suffix}`);
}
export const getAdminProvinceSummary = () => request<ApiProvinceSummary[]>("/admin/provinces");

// ─── Projects (create/update/status) ──────────────────────────────────────
export const createProjectApi = (payload: Record<string, unknown>) => json("/projects", "POST", payload) as Promise<ApiProject>;
export const updateProjectDraftApi = (projectId: string | number, payload: Record<string, unknown>) => json(`/projects/${projectId}`, "PATCH", payload) as Promise<ApiProject>;
export const submitProjectApi = (projectId: string | number, note?: string) => json(`/projects/${projectId}/submit`, "POST", { note: note ?? "" }) as Promise<ApiProject>;

// ─── Analytics ───────────────────────────────────────────────────────────
// Backend analytics shapes differ from the old assumptions — normalize here so every
// dashboard gets a consistent chart-ready shape regardless of the raw payload.
// GET /analytics/wef-nexus   -> data: { byDimension: [{ name, projectCount, totalCostUsd, beneficiaries, jobs }] }
export const getWefNexusAnalytics = async () => {
  const raw = await request<{ byDimension?: Array<{ name: string; projectCount: number; totalCostUsd: number; beneficiaries: number; jobs: number }> }>("/analytics/wef-nexus");
  const rows = Array.isArray(raw?.byDimension) ? raw.byDimension : [];
  return rows.map(d => ({ name: d.name, value: d.projectCount, color: "", totalCostUsd: d.totalCostUsd, beneficiaries: d.beneficiaries, jobs: d.jobs }));
};
// GET /analytics/sector-breakdown -> data: [{ sectorName, projectCount, totalCostUsd, fundingGapUsd, beneficiaries, jobs }]
export const getSectorAnalytics = async () => {
  const raw = await request<Array<{ sectorName: string; projectCount: number; totalCostUsd: number; fundingGapUsd: number; beneficiaries: number; jobs: number }>>("/analytics/sector-breakdown");
  const rows = Array.isArray(raw) ? raw : [];
  return rows.map(d => ({ sector: d.sectorName, count: d.projectCount, funding: d.fundingGapUsd, totalCostUsd: d.totalCostUsd, beneficiaries: d.beneficiaries, jobs: d.jobs }));
};
// GET /analytics/geography -> data: [{ provinceName, projectCount, approvedCount, totalCostUsd, fundingGapUsd }]
export const getGeographyAnalytics = async () => {
  const raw = await request<Array<{ provinceName: string; projectCount: number; approvedCount: number; totalCostUsd: number; fundingGapUsd: number }>>("/analytics/geography");
  const rows = Array.isArray(raw) ? raw : [];
  return rows.map(d => ({ province: d.provinceName, count: d.projectCount, approved: d.approvedCount, funding: d.fundingGapUsd, saturation: "" }));
};

// ─── Notifications ───────────────────────────────────────────────────────
export function getNotifications(params: { unreadOnly?: boolean; page?: number; pageSize?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.unreadOnly) qs.set("unreadOnly", "true");
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request<ApiPage<ApiNotification>>(`/notifications${suffix}`);
}
export const markNotificationRead = (notificationId: string) => json(`/notifications/${notificationId}/read`, "POST") as Promise<void>;
export const markAllNotificationsRead = () => json("/notifications/read-all", "POST") as Promise<void>;

// ─── Files ───────────────────────────────────────────────────────────────
export const uploadFile = (file: File, projectId?: string) => {
  const form = new FormData();
  form.append("file", file);
  if (projectId) form.append("projectId", projectId);
  return request<ApiAttachment>("/files/upload", { method: "POST", body: form });
};

export const downloadFile = (fileId: string) => `${API_BASE_URL}/files/${fileId}/download`;
export async function fetchFileDataUrl(fileId: string, retry = true): Promise<string> {
  const response = await fetch(downloadFile(fileId), { headers: authHeaders() });
  if (response.status === 401 && retry && localStorage.getItem("pcpp_refresh_token") && await refreshAccessToken()) {
    return fetchFileDataUrl(fileId, false);
  }
  if (!response.ok) throw new Error(`Unable to load file (${response.status}).`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read file."));
    reader.readAsDataURL(blob);
  });
}
export const deleteFile = (fileId: string) => json(`/files/${fileId}`, "DELETE") as Promise<{ success: boolean; message: string }>;

// ─── Comments ────────────────────────────────────────────────────────────
export const getProjectComments = (projectId: string) => request<ApiComment[]>(`/projects/${projectId}/comments`);

// ─── Reports ─────────────────────────────────────────────────────────────
export const downloadReport = (type: string, format: "csv" | "json" | "pdf", params?: Record<string, string>) => {
  const qs = new URLSearchParams({ type, format, ...params });
  return `${API_BASE_URL}/admin/reports?${qs.toString()}`;
};

export async function downloadReportFile(type: string, format: "csv" | "json" | "pdf", params?: Record<string, string>) {
  const qs = new URLSearchParams({ type, format, ...params });
  const response = await fetch(`${API_BASE_URL}/admin/reports?${qs.toString()}`, {
    headers: authHeaders(),
  });
  if (!response.ok) {
    let message = `Report download failed (${response.status}).`;
    try {
      const payload = await response.json();
      message = payload?.error?.message || payload?.message || message;
    } catch { /* non-JSON error response */ }
    throw new Error(message);
  }
  return response.blob();
}

export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("pcpp_refresh_token");
  if (!refreshToken) return false;
  try {
    const data = await request<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken }),
    });
    localStorage.setItem("pcpp_access_token", data.accessToken);
    localStorage.setItem("pcpp_refresh_token", data.refreshToken);
    return true;
  } catch { return false; }
}

export const logoutApi = (refreshToken: string) => json("/auth/logout", "POST", { refreshToken }) as Promise<void>;

// ─── Mapping helpers (API shape -> the shape the existing dashboard UI expects) ──
const KNOWN_WEF = ["Water", "Energy", "Food"] as const;

function mapAttachment(a: ApiAttachment): ProjectAttachment {
  return { id: a.id, name: a.fileName, type: a.mimeType, size: a.sizeBytes, dataUrl: `${API_BASE_URL}/files/${a.id}/download`, uploadedBy: "", date: a.createdAt.slice(0, 10) };
}

function coverFromAttachments(attachments: ProjectAttachment[]) {
  return attachments.find(attachment => attachment.type.startsWith("image/"))?.dataUrl;
}

export function mapApiProjectToStore(ap: ApiProject, syntheticId: number): StoreProject {
  const attachments = (ap.attachments || []).map(mapAttachment);
  return {
    id: syntheticId,
    apiId: ap.id,
    title: ap.title,
    summary: ap.summary,
    coverImageUrl: ap.coverImageUrl || ap.imageUrl || coverFromAttachments(attachments),
    province: ap.provinceName,
    district: ap.district,
    sector: ap.sectorName,
    wef: (ap.wefTags || []).filter((t): t is typeof KNOWN_WEF[number] => (KNOWN_WEF as readonly string[]).includes(t)),
    status: ap.status as StoreProject["status"],
    costUSD: ap.costUsd,
    fundingGapUSD: ap.fundingGapUsd,
    coFinancingUSD: ap.coFinancingUsd,
    beneficiaries: ap.beneficiaries,
    jobs: ap.jobs,
    readiness: ap.readiness,
    startDate: ap.startDate?.slice(0, 10),
    endDate: ap.endDate?.slice(0, 10),
    implementingAgency: ap.implementingAgency,
    contactName: ap.contactName,
    contactEmail: ap.contactEmail,
    contactPhone: ap.contactPhone,
    riskNotes: ap.riskNotes,
    primarySector: ap.extendedDetails?.primarySector ?? ap.sectorName,
    secondarySector: ap.extendedDetails?.subSectors?.[0],
    sdgs: ap.extendedDetails?.sdgGoals,
    submittedBy: ap.contactName || "",
    updated: ap.modifiedAt.slice(0, 10),
    extendedDetails: ap.extendedDetails,
    statusHistory: [],
    progressUpdates: [],
    attachments,
  };
}

export function mapStatusHistory(events: ApiStatusEvent[]) {
  return events.map(e => ({ status: e.status, note: e.note || "", date: e.createdAt.slice(0, 10), by: e.changedByUserName, attachments: (e.attachments || []).map(mapAttachment) }));
}

export function mapProgressUpdate(u: ApiProgressUpdate) {
  return { id: u.id, date: u.createdAt.slice(0, 10), author: u.authorName, text: u.text, attachments: (u.attachments || []).map(mapAttachment) };
}

