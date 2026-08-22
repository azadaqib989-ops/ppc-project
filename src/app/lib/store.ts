// Local persistence layer — everything the demo mutates (project status, review
// comments, user accounts, notifications, saved projects, investor interests,
// progress updates) is cached in localStorage so it survives page reloads.
import {
  PROVINCES, SECTOR_DATA, REVIEW_QUEUE, CATALOGUE_PROJECTS, RECENT_NOTIFICATIONS,
  INVESTOR_SAVED_IDS, INVESTOR_INTERESTS, type PipelineProject, type ProjectStatus,
} from "./mockData";
import type { Role } from "./auth";

const KEYS = {
  seeded: "pcpp_seeded_v2",
  projects: "pcpp_projects_v2",
  users: "pcpp_users_v2",
  notifications: "pcpp_notifications_v2",
  saved: "pcpp_saved_v2",
  interests: "pcpp_interests_v2",
} as const;

export interface StatusEvent { status: ProjectStatus; note: string; date: string; by: string }
export interface ProgressUpdate { id: number; date: string; author: string; text: string }

export interface StoreProject extends PipelineProject {
  statusHistory: StatusEvent[];
  progressUpdates: ProgressUpdate[];
  summary: string;
}

export interface AppUser {
  id: number;
  name: string;
  email: string;
  password: string;
  role: Role;
  province?: string;
  title: string;
  active: boolean;
}

export type NotificationAudience = "admin" | "reviewer" | "focal" | "investor" | "public";
export interface AppNotification {
  id: number;
  audience: NotificationAudience;
  province?: string; // restricts a "focal" notification to one province
  text: string;
  date: string;
  read: boolean;
}

export interface InvestorInterest {
  id: number;
  projectId: number;
  investorEmail: string;
  investorName: string;
  message: string;
  status: "Awaiting response" | "In discussion" | "Connected" | "Declined";
  createdAt: string;
  timeline: { note: string; date: string; by: string }[];
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

const SUMMARIES = [
  "A public-sector opportunity focused on strengthening resilience for the communities it serves, with clear provincial ownership and a defined funding gap.",
  "Combines infrastructure renewal with measurable climate co-benefits, positioned for blended public-private financing.",
  "Addresses an urgent adaptation priority identified in the province's development program, ready for investor engagement.",
];

function seedProjects(): StoreProject[] {
  const all = [...REVIEW_QUEUE, ...CATALOGUE_PROJECTS];
  return all.map((p, i) => ({
    ...p,
    summary: SUMMARIES[i % SUMMARIES.length],
    statusHistory: [
      { status: "Draft" as ProjectStatus, note: "Project drafted by provincial focal point.", date: p.updated, by: p.submittedBy },
      ...(p.status !== "Draft" ? [{ status: "Submitted" as ProjectStatus, note: "Submitted for ministry review.", date: p.updated, by: p.submittedBy }] : []),
      ...(p.status === "Approved" ? [{ status: "Approved" as ProjectStatus, note: "Approved and published to the investor catalogue.", date: p.updated, by: "Ayesha Raza" }] : []),
      ...(p.status === "Returned" ? [{ status: "Returned" as ProjectStatus, note: "Returned — additional evidence requested on cost breakdown.", date: p.updated, by: "Ayesha Raza" }] : []),
      ...(p.status === "Under Review" ? [{ status: "Under Review" as ProjectStatus, note: "Assigned to ministry reviewer.", date: p.updated, by: "Farrukh Zaman" }] : []),
    ],
    progressUpdates: p.status === "Approved" ? [
      { id: p.id * 10 + 1, date: p.updated, author: p.submittedBy, text: "Procurement of core works is on schedule; community consultations completed." },
    ] : [],
  }));
}

function seedUsers(): AppUser[] {
  return [
    { id: 1, name: "Ayesha Raza", email: "admin@pcpp.gov.pk", password: "Admin@123", role: "admin", title: "Central Ministry Administrator", active: true },
    { id: 2, name: "Farrukh Zaman", email: "reviewer@pcpp.gov.pk", password: "Reviewer@123", role: "reviewer", title: "Reviewer / Analyst", active: true },
    { id: 3, name: "M. Tariq Bashir", email: "focal@pcpp.gov.pk", password: "Focal@123", role: "focal", province: "Punjab", title: "Provincial Focal Point — Punjab", active: true },
    { id: 4, name: "Sana Iqbal", email: "focal.sindh@pcpp.gov.pk", password: "Focal@123", role: "focal", province: "Sindh", title: "Provincial Focal Point — Sindh", active: true },
    { id: 5, name: "James Whitfield", email: "investor@pcpp.gov.pk", password: "Investor@123", role: "investor", title: "Investment Partner · Global Climate Fund", active: true },
  ];
}

function seedNotifications(): AppNotification[] {
  return RECENT_NOTIFICATIONS.map((n, i) => ({
    id: n.id,
    audience: (["admin", "focal", "investor", "public"] as NotificationAudience[])[i % 4],
    text: n.text,
    date: n.time,
    read: false,
  }));
}

function seedInterests(): InvestorInterest[] {
  return INVESTOR_INTERESTS.map((i, idx) => ({
    id: i.id,
    projectId: i.id,
    investorEmail: "investor@pcpp.gov.pk",
    investorName: "James Whitfield",
    message: "We would like to understand the current procurement timeline and co-financing options.",
    status: i.status as InvestorInterest["status"],
    createdAt: i.date,
    timeline: [
      { note: "Interest submitted to project owner.", date: i.date, by: "James Whitfield" },
      ...(idx === 1 ? [{ note: "Focal point replied with updated cost breakdown.", date: "2026-08-09", by: "M. Tariq Bashir" }] : []),
      ...(idx === 2 ? [{ note: "Introductory call scheduled with provincial team.", date: "2026-08-01", by: "Sana Iqbal" }] : []),
    ],
  }));
}

export function ensureSeeded() {
  if (localStorage.getItem(KEYS.seeded)) return;
  write(KEYS.projects, seedProjects());
  write(KEYS.users, seedUsers());
  write(KEYS.notifications, seedNotifications());
  write(KEYS.saved, { "investor@pcpp.gov.pk": INVESTOR_SAVED_IDS } as Record<string, number[]>);
  write(KEYS.interests, seedInterests());
  localStorage.setItem(KEYS.seeded, "1");
}

export function resetDemoData() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  ensureSeeded();
}

// ─── Projects ─────────────────────────────────────────────────────────────
export function getProjects(): StoreProject[] {
  ensureSeeded();
  return read(KEYS.projects, []);
}
export function saveProjects(projects: StoreProject[]) {
  write(KEYS.projects, projects);
}
export function updateProject(id: number, updater: (p: StoreProject) => StoreProject) {
  const projects = getProjects().map(p => (p.id === id ? updater(p) : p));
  saveProjects(projects);
  return projects;
}
export function addProject(project: StoreProject) {
  const projects = [project, ...getProjects()];
  saveProjects(projects);
  return projects;
}

// ─── Users ────────────────────────────────────────────────────────────────
export function getUsers(): AppUser[] {
  ensureSeeded();
  return read(KEYS.users, []);
}
export function saveUsers(users: AppUser[]) {
  write(KEYS.users, users);
}

// ─── Notifications ────────────────────────────────────────────────────────
export function getNotifications(): AppNotification[] {
  ensureSeeded();
  return read(KEYS.notifications, []);
}
export function pushNotification(n: Omit<AppNotification, "id" | "read">) {
  const notifications = [{ ...n, id: Date.now(), read: false }, ...getNotifications()];
  write(KEYS.notifications, notifications);
  return notifications;
}
export function markNotificationsRead(audience: NotificationAudience) {
  const notifications = getNotifications().map(n => (n.audience === audience ? { ...n, read: true } : n));
  write(KEYS.notifications, notifications);
  return notifications;
}

// ─── Saved projects (per investor) ────────────────────────────────────────
export function getSaved(email: string): number[] {
  ensureSeeded();
  const all = read<Record<string, number[]>>(KEYS.saved, {});
  return all[email] || [];
}
export function toggleSaved(email: string, projectId: number): number[] {
  const all = read<Record<string, number[]>>(KEYS.saved, {});
  const current = all[email] || [];
  all[email] = current.includes(projectId) ? current.filter(id => id !== projectId) : [...current, projectId];
  write(KEYS.saved, all);
  return all[email];
}

// ─── Investor interests ───────────────────────────────────────────────────
export function getInterests(): InvestorInterest[] {
  ensureSeeded();
  return read(KEYS.interests, []);
}
export function addInterest(interest: InvestorInterest) {
  const interests = [interest, ...getInterests()];
  write(KEYS.interests, interests);
  return interests;
}
export function updateInterest(id: number, updater: (i: InvestorInterest) => InvestorInterest) {
  const interests = getInterests().map(i => (i.id === id ? updater(i) : i));
  write(KEYS.interests, interests);
  return interests;
}

export { PROVINCES, SECTOR_DATA };
