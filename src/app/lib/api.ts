// Thin REST client for the PPCA backend (see BACKEND_REQUIREMENTS_PROMPT.md / API doc shared in chat).
// All calls unwrap the { success, data } / { success, error } envelope and throw a
// plain Error with a human-readable message on failure, so callers can just
// `catch (e) { toast.error(e.message) }`.
import { API_BASE_URL } from "./auth";
import type { StoreProject, ProjectAttachment } from "./store";

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
}

export interface ApiProgressUpdate {
  id: string;
  text: string;
  authorName: string;
  createdAt: string;
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
  role: string;
  provinceId?: string | null;
  provinceName?: string | null;
  active: boolean;
  createdAt: string;
}

export interface ApiCurrentUser extends ApiUser {
  provinceId?: string | null;
  provinceName?: string | null;
  active?: boolean;
}
export interface ApiLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: ApiUser;
}

export interface ApiProvince { id: string; name: string; createdAt?: string }
export interface ApiSector { id: string; name: string; color: string; createdAt?: string }
export interface ApiWefTag { value: string; label: string }

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
    throw new Error(payload?.error?.message || detailMsg || `Request failed (${response.status}).`);
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

export const loginApi = (email: string, password: string) =>
  json("/auth/login", "POST", { email: email.trim(), password }) as Promise<ApiLoginResponse>;

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
  return request<ApiAttachment>(`/projects/${id}/attachments`, { method: "POST", body: form });
};
export const submitProject = (id: string, note: string) => json(`/projects/${id}/submit`, "POST", { note }) as Promise<ApiProject>;
export const approveProject = (id: string, note: string) => json(`/projects/${id}/approve`, "POST", { note }) as Promise<ApiProject>;
export const returnProject = (id: string, note: string) => json(`/projects/${id}/return`, "POST", { note }) as Promise<ApiProject>;
export const addProgressUpdate = (id: string, text: string) => json(`/projects/${id}/progress-updates`, "POST", { text }) as Promise<ApiProgressUpdate>;
export const getProgressUpdates = (id: string) => request<ApiProgressUpdate[]>(`/projects/${id}/progress-updates`);
export const getStatusHistory = (id: string) => request<ApiStatusEvent[]>(`/projects/${id}/status-history`);
export const addProjectComment = (id: string, note: string) => json(`/projects/${id}/comments`, "POST", { note }) as Promise<ApiProject>;

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
export const updateInterestStatus = (id: string, status: string) => json(`/investor/interests/${id}`, "PATCH", { status }) as Promise<ApiInvestorInterest>;

// ─── Users ──────────────────────────────────────────────────────────────
export const getCurrentUserProfile = () => request<ApiCurrentUser>("/auth/me");
export const getAllUsers = () => request<ApiUser[]>("/users");
export const getUserById = (id: string) => request<ApiUser>(`/users/${id}`);
export const signupInvestor = (body: { name: string; email: string; password: string; organization: string; country: string }) => json("/auth/signup-investor", "POST", body) as Promise<ApiUser>;

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
  return { id: a.id, name: a.fileName, type: a.mimeType, size: a.sizeBytes, dataUrl: "", uploadedBy: "", date: a.createdAt.slice(0, 10) };
}

export function mapApiProjectToStore(ap: ApiProject, syntheticId: number): StoreProject {
  return {
    id: syntheticId,
    apiId: ap.id,
    title: ap.title,
    summary: ap.summary,
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
    submittedBy: ap.contactName || "",
    updated: ap.modifiedAt.slice(0, 10),
    statusHistory: [],
    progressUpdates: [],
    attachments: (ap.attachments || []).map(mapAttachment),
  };
}

export function mapStatusHistory(events: ApiStatusEvent[]) {
  return events.map(e => ({ status: e.status, note: e.note || "", date: e.createdAt.slice(0, 10), by: e.changedByUserName }));
}

export function mapProgressUpdate(u: ApiProgressUpdate) {
  return { id: u.id, date: u.createdAt.slice(0, 10), author: u.authorName, text: u.text };
}

