import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import {
  LayoutDashboard, FolderKanban, FilePlus2, Handshake,
  Building2, HandCoins, CheckCircle2, ArrowRight, ArrowLeft, MapPin, Pencil, Send, Loader2, Search, FileDown,
  Droplets, TrendingUp, LayoutGrid, AlertCircle,
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { DashboardShell, type NavItem } from "./DashboardShell";
import { KpiCard, Panel, StatusBadge, AttachmentPicker, AttachmentList, filesToAttachments } from "./dashboardWidgets";
import { ProjectDetailPage } from "./ProjectDetail";
import { useAuth } from "../lib/auth";
import { SECTOR_DATA, formatUSD, formatNumber, type ProjectExtendedDetails } from "../lib/mockData";
import {
  getProjects,
  type StoreProject, type ProjectAttachment,
} from "../lib/store";
import { createProjectApi, updateProjectDraftApi, getMyProjects, getSectors, getProvinces, mapApiProjectToStore, submitProjectApi, uploadProjectAttachment, addProgressUpdate, getFocalInterests, getInterestTimeline, updateInterestStatus, addInterestTimeline } from "../lib/api";

const NAV_ITEMS: NavItem[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "projects", label: "My Projects", icon: FolderKanban },
  { key: "submit", label: "New Submission", icon: FilePlus2 },
  { key: "interests", label: "Investor Interests", icon: Handshake },
  { key: "analytics", label: "Analytics & Reports", icon: FileDown },
];

function useProvinceProjects(provinceId?: string) {
  const [projects, setProjects] = useState<StoreProject[]>([]);
  const normalizeProvince = (value?: string) => value?.toLowerCase().replace(/[^a-z]/g, "") ?? "";

  const refresh = async () => {
    const localMatches = getProjects().filter(
      p => !provinceId || normalizeProvince(p.province) === normalizeProvince(provinceId)
    );

    try {
      const page = await getMyProjects({ provinceId });
      const mapped = page.data.map((p, idx) => mapApiProjectToStore(p, idx + 1 + Date.now() % 1000));
      if (mapped.length > 0 || page.total > 0) {
        setProjects(mapped);
        return;
      }
    } catch {
      // Fallback below.
    }

    setProjects(localMatches);
  };

  useEffect(() => { void refresh(); }, [provinceId]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "pcpp_projects_v3") {
        void refresh();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => { void refresh(); }, 2000);
    return () => clearInterval(interval);
  }, []);

  return { projects, refresh: () => void refresh() };
}

function AnimatedPanel({ delay = 0, className, children }: { delay?: number; className?: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function OverviewTab({ projects }: { projects: StoreProject[] }) {
  const approved = projects.filter(p => p.status === "Approved").length;
  const pending = projects.filter(p => ["Submitted", "Under Review"].includes(p.status)).length;
  const returned = projects.filter(p => p.status === "Returned").length;
  const draft = projects.filter(p => p.status === "Draft").length;
  const totalRequired = projects.reduce((s, p) => s + p.costUSD, 0);
  const fundingGap = projects.reduce((s, p) => s + p.fundingGapUSD, 0);
  const availableFunding = Math.max(0, totalRequired - fundingGap);
  const avgReadiness = projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.readiness, 0) / projects.length) : 0;
  const totalBeneficiaries = projects.reduce((s, p) => s + p.beneficiaries, 0);
  const totalJobs = projects.reduce((s, p) => s + p.jobs, 0);
  const bySector = SECTOR_DATA.map(s => ({ ...s, count: projects.filter(p => p.sector === s.name).length })).filter(s => s.count > 0);
  const statusDistribution = [
    { name: "Draft", value: draft, color: "#cbd5e1" },
    { name: "Submitted", value: pending, color: "#0b5a7d" },
    { name: "Approved", value: approved, color: "#2f9e6d" },
    { name: "Returned", value: returned, color: "#dc2626" },
  ].filter(s => s.value > 0);

  return (
    <div className="space-y-6">
      {/* 4-Column KPI Grid - White Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedPanel delay={0}>
          <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50">
                <Building2 className="w-5 h-5 text-[#1c2d7a]" />
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{projects.length}</span>
            </div>
            <div className="text-[24px] font-bold text-[#0f172a]" style={{ fontFamily: "'Playfair Display', serif" }}>{formatNumber(projects.length)}</div>
            <div className="text-[12px] font-semibold text-[#1c2d7a] mt-0.5">Total Projects</div>
            <div className="text-[11px] text-slate-500 mt-1">In your province</div>
          </div>
        </AnimatedPanel>

        <AnimatedPanel delay={0.08}>
          <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-50">
                <CheckCircle2 className="w-5 h-5 text-[#2f9e6d]" />
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">+{Math.round((approved / Math.max(1, projects.length)) * 100)}%</span>
            </div>
            <div className="text-[24px] font-bold text-[#0f172a]" style={{ fontFamily: "'Playfair Display', serif" }}>{formatNumber(approved)}</div>
            <div className="text-[12px] font-semibold text-[#2f9e6d] mt-0.5">Approved</div>
            <div className="text-[11px] text-slate-500 mt-1">{Math.round((approved / Math.max(1, projects.length)) * 100)}% of pipeline</div>
          </div>
        </AnimatedPanel>

        <AnimatedPanel delay={0.16}>
          <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50">
                <FolderKanban className="w-5 h-5 text-[#0b5a7d]" />
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{pending}</span>
            </div>
            <div className="text-[24px] font-bold text-[#0f172a]" style={{ fontFamily: "'Playfair Display', serif" }}>{formatNumber(pending)}</div>
            <div className="text-[12px] font-semibold text-[#0b5a7d] mt-0.5">In Review</div>
            <div className="text-[11px] text-slate-500 mt-1">Awaiting ministry decision</div>
          </div>
        </AnimatedPanel>

        <AnimatedPanel delay={0.24}>
          <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50">
                <HandCoins className="w-5 h-5 text-[#1c2d7a]" />
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">Total</span>
            </div>
            <div className="text-[22px] font-bold text-[#0f172a]" style={{ fontFamily: "'Playfair Display', serif" }}>{formatUSD(fundingGap / 1_000_000)}M</div>
            <div className="text-[12px] font-semibold text-[#1c2d7a] mt-0.5">Funding Gap</div>
            <div className="text-[11px] text-slate-500 mt-1">Total across pipeline</div>
          </div>
        </AnimatedPanel>
      </div>

      {/* Secondary Stats - 3 Column */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AnimatedPanel delay={0.3}>
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50">
                <Droplets className="w-4 h-4 text-[#0b5a7d]" />
              </div>
              <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Beneficiaries</span>
            </div>
            <div className="text-[22px] font-bold text-[#0f172a]" style={{ fontFamily: "'Playfair Display', serif" }}>{formatNumber(totalBeneficiaries)}</div>
            <div className="text-[11px] text-slate-500 mt-1">People impacted</div>
          </div>
        </AnimatedPanel>

        <AnimatedPanel delay={0.36}>
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-50">
                <TrendingUp className="w-4 h-4 text-[#2f9e6d]" />
              </div>
              <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Jobs Created</span>
            </div>
            <div className="text-[22px] font-bold text-[#0f172a]" style={{ fontFamily: "'Playfair Display', serif" }}>{formatNumber(totalJobs)}</div>
            <div className="text-[11px] text-slate-500 mt-1">Employment opportunities</div>
          </div>
        </AnimatedPanel>

        <AnimatedPanel delay={0.42}>
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50">
                <LayoutGrid className="w-4 h-4 text-[#1c2d7a]" />
              </div>
              <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Readiness</span>
            </div>
            <div className="text-[22px] font-bold text-[#0f172a]" style={{ fontFamily: "'Playfair Display', serif" }}>{avgReadiness}%</div>
            <div className="text-[11px] text-slate-500 mt-1">Average portfolio maturity</div>
          </div>
        </AnimatedPanel>
      </div>

      {/* Returned Projects Alert */}
      {returned > 0 && (
        <AnimatedPanel delay={0.48}>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-red-700 text-[12.5px] mb-0.5">Action Required: {returned} project(s) returned</h4>
                <p className="text-[11.5px] text-red-600">Review ministry notes and resubmit after making requested changes.</p>
              </div>
            </div>
          </div>
        </AnimatedPanel>
      )}

      {/* Charts - 2 Column Layout */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Project Status Distribution */}
        <AnimatedPanel delay={0.54}>
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-[14px] font-bold text-[#0f172a] flex items-center gap-2">
                <div className="w-1 h-5 bg-[#1c2d7a] rounded-full" />
                Project Status
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Current distribution across all statuses</p>
            </div>
            {statusDistribution.length === 0 ? (
              <p className="text-[12.5px] text-slate-500 py-8 text-center">No projects yet — start a new submission.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={statusDistribution} layout="vertical" margin={{ left: 70, right: 16 }}>
                  <defs>
                    <linearGradient id="gradStatus" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#1c2d7a" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#0b5a7d" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} width={70} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, backgroundColor: "#fff", border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="value" fill="url(#gradStatus)" radius={[0, 8, 8, 0]} animationDuration={1000} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </AnimatedPanel>

        {/* Sector Distribution */}
        <AnimatedPanel delay={0.6}>
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-[14px] font-bold text-[#0f172a] flex items-center gap-2">
                <div className="w-1 h-5 bg-[#1c2d7a] rounded-full" />
                Pipeline by Sector
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Where your submissions are concentrated</p>
            </div>
            {bySector.length === 0 ? (
              <p className="text-[12.5px] text-slate-500 py-8 text-center">No projects yet — start a new submission.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={bySector} margin={{ top: 12, right: 16, bottom: 40 }}>
                  <defs>
                    <linearGradient id="gradSector" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0b5a7d" />
                      <stop offset="100%" stopColor="#1c2d7a" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} angle={-15} textAnchor="end" height={50} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, backgroundColor: "#fff", border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="count" name="Projects" radius={[8, 8, 0, 0]} fill="url(#gradSector)" animationDuration={1000} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </AnimatedPanel>
      </div>

      {/* Funding Analysis */}
      <AnimatedPanel delay={0.66}>
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <h3 className="text-[14px] font-bold text-[#0f172a] mb-4 flex items-center gap-2">
            <div className="w-1 h-5 bg-[#1c2d7a] rounded-full" />
            Funding Analysis
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div className="text-[10px] font-bold text-[#1c2d7a] uppercase tracking-wide mb-1">Total Cost</div>
              <div className="text-[18px] font-bold text-[#0f172a]" style={{ fontFamily: "'Playfair Display', serif" }}>{formatUSD(totalRequired / 1_000_000)}M</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="text-[10px] font-bold text-[#475569] uppercase tracking-wide mb-1">Funding Gap</div>
              <div className="text-[18px] font-bold text-[#0f172a]" style={{ fontFamily: "'Playfair Display', serif" }}>{formatUSD(fundingGap / 1_000_000)}M</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <div className="text-[10px] font-bold text-[#2f9e6d] uppercase tracking-wide mb-1">Available</div>
              <div className="text-[18px] font-bold text-[#0f172a]" style={{ fontFamily: "'Playfair Display', serif" }}>{formatUSD(availableFunding / 1_000_000)}M</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="text-[10px] font-bold text-[#475569] uppercase tracking-wide mb-1">% Filled</div>
              <div className="text-[18px] font-bold text-[#0f172a]" style={{ fontFamily: "'Playfair Display', serif" }}>{totalRequired > 0 ? Math.round((availableFunding / totalRequired) * 100) : 0}%</div>
            </div>
          </div>
        </div>
      </AnimatedPanel>
    </div>
  );
}

function ProjectsTab({ projects, refresh, onEdit }: { projects: StoreProject[]; refresh: () => void; onEdit: (p: StoreProject) => void }) {
  const { user } = useAuth();
  const [viewing, setViewing] = useState<StoreProject | null>(null);
  const [updateText, setUpdateText] = useState("");
  const [updateAttachments, setUpdateAttachments] = useState<ProjectAttachment[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [sector, setSector] = useState("All");
  const [district, setDistrict] = useState("All");
  const [wef, setWef] = useState("All");
  const [readiness, setReadiness] = useState("All");
  const districts = Array.from(new Set(projects.map(p => p.district).filter(Boolean))).sort() as string[];
  const visibleProjects = projects.filter(p => {
    const matchesReadiness = readiness === "All" || (readiness === "Low" && p.readiness < 40) || (readiness === "Medium" && p.readiness >= 40 && p.readiness < 70) || (readiness === "High" && p.readiness >= 70);
    return (status === "All" || p.status === status) &&
      (sector === "All" || p.sector === sector) &&
      (district === "All" || p.district === district) &&
      (wef === "All" || p.wef.includes(wef as "Water" | "Energy" | "Food")) &&
      matchesReadiness &&
      `${p.title} ${p.sector} ${p.district ?? ""}`.toLowerCase().includes(query.toLowerCase());
  });
  const clearFilters = () => { setQuery(""); setStatus("All"); setSector("All"); setDistrict("All"); setWef("All"); setReadiness("All"); };

  const submitDraft = async (id: number) => {
    const project = projects.find(p => p.id === id);
    if (!project?.apiId) { toast.error("This project is not available on the server."); return; }
    try { await submitProjectApi(project.apiId, "Submitted for ministry review."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to submit project to the server."); return; }

    toast.success("Project submitted for ministry review.");
    refresh();
    setViewing(null);
  };

  const postUpdate = async (id: number) => {
    if (!updateText.trim() && updateAttachments.length === 0) return;
    const project = projects.find(p => p.id === id);
    if (!project) return;

    if (project.apiId) {
      try {
        const uploaded = await Promise.all(updateAttachments.map(async attachment => {
          const response = await fetch(attachment.dataUrl);
          if (!response.ok) throw new Error(`Could not read ${attachment.name}.`);
          const blob = await response.blob();
          return uploadProjectAttachment(project.apiId!, new File([blob], attachment.name, { type: attachment.type }));
        }));
        await addProgressUpdate(project.apiId, updateText || "Shared new supporting documents.", uploaded.map(attachment => attachment.id));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to post update to the server.");
        return;
      }
    } else { toast.error("This project is not available on the server."); return; }

    toast.success("Progress update posted.");
    setUpdateText("");
    setUpdateAttachments([]);
    refresh();
    setViewing(null);
  };

  const addUpdateFiles = (files: FileList) => {
    filesToAttachments(files, user?.name ?? "Focal point").then(newFiles => setUpdateAttachments(a => [...a, ...newFiles]));
  };

  if (viewing) {
    return <ProjectDetailPage
      project={viewing}
      onBack={() => setViewing(null)}
      actions={
        viewing.status === "Draft" || viewing.status === "Returned" ? (
          <div className="w-full flex flex-col sm:flex-row gap-2.5">
            <button onClick={() => onEdit(viewing)} className="flex-1 bg-[#eef0f9] text-[#1c2d7a] font-bold text-sm py-2.5 rounded hover:bg-[#1c2d7a] hover:text-white"><Pencil className="w-3.5 h-3.5 inline mr-1.5" />Edit project</button>
            <button onClick={() => submitDraft(viewing.id)} className="flex-1 bg-[#1c2d7a] text-white font-bold text-sm py-2.5 rounded hover:bg-[#17a4c2]">Submit for ministry review</button>
          </div>
        ) : viewing.status === "Approved" ? (
          <div className="w-full space-y-2">
            <textarea value={updateText} onChange={e => setUpdateText(e.target.value)} rows={2} placeholder="Share a progress update investors and the ministry can see…"
              className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb] focus:outline-none focus:ring-2 focus:ring-[#1c2d7a]/15" />
            <AttachmentList attachments={updateAttachments} onRemove={id => setUpdateAttachments(a => a.filter(f => f.id !== id))} dense />
            <div className="flex items-center justify-between gap-2">
              <AttachmentPicker label="Attach evidence" onAdd={addUpdateFiles} />
              <button onClick={() => postUpdate(viewing.id)} className="flex-1 bg-[#17a4c2] text-white font-bold text-sm py-2.5 rounded hover:bg-[#1c2d7a]">Post update</button>
            </div>
          </div>
        ) : undefined
      }
    />;
  }

  return (
    <>
      <Panel title="My projects" description="Every project you own — you can edit drafts, submit for review and post progress updates">
        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-2 mb-4">
          <div className="relative lg:col-span-2"><Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search title or keyword" className="pl-8 pr-3 py-2 text-[12.5px] border border-border rounded-lg bg-[#f4f7fb] w-full" /></div>
          <select aria-label="Filter by status" value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2 text-[12.5px] border border-border rounded-lg bg-[#f4f7fb]"><option value="All">All statuses</option>{["Draft", "Submitted", "Under Review", "Approved", "Returned"].map(s => <option key={s} value={s}>{s}</option>)}</select>
          <select aria-label="Filter by sector" value={sector} onChange={e => setSector(e.target.value)} className="px-3 py-2 text-[12.5px] border border-border rounded-lg bg-[#f4f7fb]"><option value="All">All sectors</option>{SECTOR_DATA.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}</select>
          <select aria-label="Filter by district" value={district} onChange={e => setDistrict(e.target.value)} className="px-3 py-2 text-[12.5px] border border-border rounded-lg bg-[#f4f7fb]"><option value="All">All districts</option>{districts.map(d => <option key={d} value={d}>{d}</option>)}</select>
          <select aria-label="Filter by WEF dimension" value={wef} onChange={e => setWef(e.target.value)} className="px-3 py-2 text-[12.5px] border border-border rounded-lg bg-[#f4f7fb]"><option value="All">All WEF tags</option>{["Water", "Energy", "Food"].map(w => <option key={w} value={w}>{w}</option>)}</select>
          <select aria-label="Filter by readiness" value={readiness} onChange={e => setReadiness(e.target.value)} className="px-3 py-2 text-[12.5px] border border-border rounded-lg bg-[#f4f7fb]"><option value="All">All readiness</option><option value="Low">Low (&lt;40%)</option><option value="Medium">Medium (40–69%)</option><option value="High">High (70%+)</option></select>
          <button onClick={clearFilters} className="text-[12px] font-semibold text-[#1c2d7a] border border-border rounded-lg px-3 py-2 hover:bg-[#eef0f9]">Clear filters</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-muted-foreground uppercase text-[10.5px] tracking-wide border-b border-border">
                <th className="py-2 px-3">Project</th>
                <th className="py-2 px-3">Sector</th>
                <th className="py-2 px-3">Funding gap</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Updated</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleProjects.map(p => (
                <tr key={p.id} className="border-b border-border hover:bg-[#f9fafc]">
                  <td className="py-2.5 px-3 font-medium text-[#0f172a] max-w-[220px] truncate cursor-pointer" onClick={() => setViewing(p)}>{p.title}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{p.sector}</td>
                  <td className="py-2.5 px-3 font-semibold">{formatUSD(p.fundingGapUSD)}</td>
                  <td className="py-2.5 px-3"><StatusBadge status={p.status} /></td>
                  <td className="py-2.5 px-3 text-muted-foreground">{p.updated}</td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {(p.status === "Draft" || p.status === "Returned") && (
                        <>
                          <button onClick={() => onEdit(p)} title="Edit project" className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#1c2d7a] bg-[#eef0f9] px-2.5 py-1.5 rounded hover:bg-[#1c2d7a] hover:text-white transition-colors"><Pencil className="w-3.5 h-3.5" />Edit project</button>
                          <button onClick={() => submitDraft(p.id)} className="text-[11.5px] font-semibold text-white bg-[#1c2d7a] px-2.5 py-1.5 rounded hover:bg-[#17a4c2]">Submit</button>
                        </>
                      )}
                      {p.status === "Approved" && (
                        <button onClick={() => setViewing(p)} className="text-[11.5px] font-semibold text-[#1c2d7a] bg-[#eef0f9] px-2.5 py-1.5 rounded hover:bg-[#1c2d7a] hover:text-white">Post update</button>
                      )}
                      {(p.status === "Submitted" || p.status === "Under Review") && (
                        <button onClick={() => setViewing(p)} className="text-[11.5px] font-semibold text-[#1c2d7a] bg-[#eef0f9] px-2.5 py-1.5 rounded hover:bg-[#1c2d7a] hover:text-white">View</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {visibleProjects.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No projects yet — create your first submission.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

    </>
  );
}

/* Blue-only chart palette — follows the PCPP theme (#1c2d7a → #17a4c2 range). */
const FOCAL_BLUE_SCALE = ["#10264b", "#1c2d7a", "#24409c", "#2f56c4", "#3f74d4", "#17a4c2", "#4fc3dd", "#7ee1e8"];

function AnalyticsTab({ projects }: { projects: StoreProject[] }) {
  const [status, setStatus] = useState("All");
  const filteredProjects = projects.filter(p => status === "All" || p.status === status);
  const download = () => {
    const rows = ["Title,Province,Sector,Status,Funding gap,Readiness", ...filteredProjects.map(p => [p.title, p.province, p.sector, p.status, p.fundingGapUSD, p.readiness].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))];
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    const link = document.createElement("a"); link.href = url; link.download = "provincial-project-report.csv"; link.click(); URL.revokeObjectURL(url);
  };

  const totalCost = filteredProjects.reduce((s, p) => s + p.costUSD, 0);
  const totalGap = filteredProjects.reduce((s, p) => s + p.fundingGapUSD, 0);
  const totalBeneficiaries = filteredProjects.reduce((s, p) => s + p.beneficiaries, 0);
  const totalJobs = filteredProjects.reduce((s, p) => s + p.jobs, 0);
  const avgReadiness = Math.round(filteredProjects.reduce((s, p) => s + p.readiness, 0) / Math.max(1, filteredProjects.length));

  const statusData = ["Draft", "Submitted", "Under Review", "Approved", "Returned"]
    .map((name, i) => ({ name, value: filteredProjects.filter(p => p.status === name).length, fill: FOCAL_BLUE_SCALE[i] }))
    .filter(d => d.value > 0);
  const wefData = (["Water", "Energy", "Food"] as const)
    .map((name, i) => ({ name, value: filteredProjects.filter(p => p.wef.includes(name)).length, fill: FOCAL_BLUE_SCALE[i + 3] }))
    .filter(d => d.value > 0);
  const sectorData = Array.from(new Set(filteredProjects.map(p => p.sector)))
    .map((name, i) => ({ name, count: filteredProjects.filter(p => p.sector === name).length, fill: FOCAL_BLUE_SCALE[i % FOCAL_BLUE_SCALE.length] }));
  const fundingData = [...filteredProjects]
    .sort((a, b) => b.fundingGapUSD - a.fundingGapUSD)
    .slice(0, 8)
    .map(p => ({ name: p.title.length > 28 ? `${p.title.slice(0, 28)}…` : p.title, gap: Math.round(p.fundingGapUSD / 100_000) / 10, cost: Math.round(p.costUSD / 100_000) / 10 }));
  const readinessBuckets = [
    { name: "0–40%", count: filteredProjects.filter(p => p.readiness < 40).length },
    { name: "40–60%", count: filteredProjects.filter(p => p.readiness >= 40 && p.readiness < 60).length },
    { name: "60–80%", count: filteredProjects.filter(p => p.readiness >= 60 && p.readiness < 80).length },
    { name: "80–100%", count: filteredProjects.filter(p => p.readiness >= 80).length },
  ];

  const statCards: Array<[string, string | number]> = [
    ["Projects", filteredProjects.length],
    ["Approved", filteredProjects.filter(p => p.status === "Approved").length],
    ["Returned", filteredProjects.filter(p => p.status === "Returned").length],
    ["Avg readiness", `${avgReadiness}%`],
    ["Portfolio value", formatUSD(totalCost)],
    ["Funding gap", formatUSD(totalGap)],
    ["Beneficiaries", formatNumber(totalBeneficiaries)],
    ["Jobs", formatNumber(totalJobs)],
  ];

  return (
    <div className="space-y-5">
      <Panel title="Provincial analytics and reports" description="A local portfolio view for your province, with a downloadable filtered report.">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <label className="text-[11px] font-semibold text-muted-foreground">Report filter</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2 text-[12px] border border-border rounded-lg bg-[#f4f7fb]">
            <option>All</option>
            {["Draft", "Submitted", "Under Review", "Approved", "Returned"].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {statCards.map(([label, value]) => (
            <div key={label} className="bg-[#f4f7fb] rounded-lg p-3">
              <div className="text-lg font-bold text-[#1c2d7a]">{value}</div>
              <div className="text-[11px] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
        <button onClick={download} className="inline-flex items-center gap-2 text-[12px] font-semibold px-3 py-2 rounded bg-[#1c2d7a] text-white hover:bg-[#17a4c2] transition-colors">
          <FileDown className="w-3.5 h-3.5" /> Download CSV report
        </button>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Portfolio by status" description="Where your projects sit in the review pipeline">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={2} cornerRadius={4}>
                {statusData.map(d => <Cell key={d.name} fill={d.fill} stroke="white" strokeWidth={2} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="WEF Nexus coverage" description="Water · Energy · Food dimensions in your portfolio">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={wefData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={3} cornerRadius={5}>
                {wefData.map(d => <Cell key={d.name} fill={d.fill} stroke="white" strokeWidth={2} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Projects by sector" description="Sector spread of your submissions">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sectorData} barSize={34} margin={{ top: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-14} textAnchor="end" height={50} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} cursor={{ fill: "#f8fafc" }} />
              <Bar dataKey="count" name="Projects" radius={[6, 6, 0, 0]}>
                {sectorData.map(d => <Cell key={d.name} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Readiness distribution" description="Investment readiness of your portfolio">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={readinessBuckets} barSize={38} margin={{ top: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} cursor={{ fill: "#f8fafc" }} />
              <Bar dataKey="count" name="Projects" radius={[6, 6, 0, 0]}>
                {readinessBuckets.map((b, i) => <Cell key={b.name} fill={FOCAL_BLUE_SCALE[(i + 1) % FOCAL_BLUE_SCALE.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel title="Largest funding needs" description="Total cost vs unfunded gap for your biggest projects, USD millions">
        {fundingData.length === 0 ? (
          <p className="text-[12.5px] text-muted-foreground">No projects to chart yet — submit a project to see its funding profile.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={fundingData} layout="vertical" margin={{ left: 12, right: 26 }} barSize={9}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10.5, fill: "#475569" }} width={170} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} formatter={value => [`$${Number(value)}M`, ""]} cursor={{ fill: "#f8fafc" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
              <Bar dataKey="cost" name="Total cost" fill="#1c2d7a" radius={[0, 4, 4, 0]} />
              <Bar dataKey="gap" name="Funding gap" fill="#17a4c2" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>
    </div>
  );
}


const STEPS = ["Basics", "Location & Timeline", "Financials & Impact", "Contacts", "WEF Nexus & Documents", "Review & Submit"];

function SupportingRecordsEditor({ value, onChange }: { value: ProjectExtendedDetails; onChange: (value: ProjectExtendedDetails) => void }) {
  const updateList = (key: "teamMembers" | "shareholders" | "additionalImpactMetrics" | "futurePlans" | "documents" | "videos", index: number, field: string, fieldValue: string) => {
    const next = [...((value[key] ?? []) as unknown as Record<string, unknown>[])];
    const numericFields = ["sharePercentage", "investmentAmount", "estimatedCost", "size"];
    const normalizedValue = field === "socialProfiles" ? fieldValue.split(",").map(x => x.trim()).filter(Boolean) : numericFields.includes(field) ? (fieldValue.trim() ? Number(fieldValue) : null) : fieldValue;
    next[index] = { ...next[index], [field]: normalizedValue };
    onChange({ ...value, [key]: next });
  };
  const add = (key: "teamMembers" | "shareholders" | "additionalImpactMetrics" | "futurePlans" | "documents" | "videos", item: Record<string, unknown>) => onChange({ ...value, [key]: [...((value[key] ?? []) as unknown as Record<string, unknown>[]), item] });
  const remove = (key: "teamMembers" | "shareholders" | "additionalImpactMetrics" | "futurePlans" | "documents" | "videos", index: number) => onChange({ ...value, [key]: ((value[key] ?? []) as unknown[]).filter((_, i) => i !== index) });
  const input = (key: "teamMembers" | "shareholders" | "additionalImpactMetrics" | "futurePlans" | "documents" | "videos", index: number, field: string, placeholder: string) => <input value={String(((value[key] ?? []) as unknown as Record<string, unknown>[])[index]?.[field] ?? "")} onChange={e => updateList(key, index, field, e.target.value)} placeholder={placeholder} className="w-full text-[11.5px] border border-border rounded p-2 bg-white" />;
  const section = (title: string, key: "teamMembers" | "shareholders" | "additionalImpactMetrics" | "futurePlans" | "documents" | "videos", fields: [string, string][], template: Record<string, unknown>) => <div className="border border-border rounded-lg p-3 space-y-2"><div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-wide text-[#1c2d7a]">{title}</span><button type="button" onClick={() => add(key, template)} className="text-[11px] font-semibold text-[#17a4c2]">+ Add</button></div>{((value[key] ?? []) as unknown as Record<string, unknown>[]).map((_, index) => <div key={`${key}-${index}`} className="grid sm:grid-cols-2 gap-2"><>{fields.map(([field, placeholder]) => <span key={field}>{input(key, index, field, placeholder)}</span>)}</><button type="button" onClick={() => remove(key, index)} className="text-left text-[10.5px] text-red-600">Remove {title.toLowerCase().replace(/s$/, "")}</button></div>)}</div>;
  return <div className="space-y-3">
    <div className="border border-border rounded-lg p-3 space-y-2"><div className="text-[11px] font-bold uppercase tracking-wide text-[#1c2d7a]">Project lead</div><div className="grid sm:grid-cols-2 gap-2">{(["name", "designation", "email", "phone", "website", "socialProfiles"] as const).map(field => <input key={field} value={field === "socialProfiles" ? (value.projectLead?.socialProfiles ?? []).join(", ") : String(value.projectLead?.[field] ?? "")} onChange={e => onChange({ ...value, projectLead: { lead: true, name: value.projectLead?.name ?? "", ...value.projectLead, [field]: field === "socialProfiles" ? e.target.value.split(",").map(x => x.trim()).filter(Boolean) : e.target.value } })} placeholder={field === "socialProfiles" ? "Social profiles (comma separated)" : field[0].toUpperCase() + field.slice(1)} className="w-full text-[11.5px] border border-border rounded p-2 bg-white" />)}</div></div>
    {section("Team members", "teamMembers", [["name", "Name"], ["designation", "Designation"], ["email", "Email"], ["phone", "Phone"], ["website", "Website"], ["socialProfiles", "Social profiles"]], { lead: false, name: "", designation: "", email: "", phone: "", website: "", socialProfiles: [] })}
    {section("Shareholders", "shareholders", [["name", "Name"], ["type", "Type"], ["sharePercentage", "Share %"], ["investmentAmount", "Investment amount"], ["email", "Email"], ["website", "Website"], ["status", "Status"]], { name: "", type: "", sharePercentage: "", investmentAmount: "", email: "", website: "", status: "Active" })}
    {section("Impact metrics", "additionalImpactMetrics", [["name", "Metric name"], ["value", "Value"], ["unit", "Unit"]], { name: "", value: "", unit: "" })}
    {section("Future plans", "futurePlans", [["phaseName", "Phase name"], ["title", "Title"], ["timeline", "Timeline"], ["description", "Description"], ["estimatedCost", "Estimated cost"]], { phaseName: "", title: "", timeline: "", description: "", estimatedCost: "" })}
    {section("Documents", "documents", [["documentType", "Document type"], ["filename", "Filename"], ["url", "URL"], ["size", "Size"], ["uploader", "Uploader"]], { documentType: "", filename: "", url: "", size: "", uploader: "" })}
    {section("Videos", "videos", [["title", "Title"], ["url", "URL"], ["duration", "Duration"]], { title: "", url: "", duration: "" })}
    <div className="grid sm:grid-cols-2 gap-2"><input value={(value.tags ?? []).join(", ")} onChange={e => onChange({ ...value, tags: e.target.value.split(",").map(x => x.trim()).filter(Boolean) })} placeholder="Tags (comma separated)" className="w-full text-[11.5px] border border-border rounded p-2 bg-white" /><input value={(value.relatedProjectIds ?? []).join(", ")} onChange={e => onChange({ ...value, relatedProjectIds: e.target.value.split(",").map(x => x.trim()).filter(Boolean) })} placeholder="Related project IDs (comma separated)" className="w-full text-[11.5px] border border-border rounded p-2 bg-white" /><input value={(value.sdgAssociations ?? []).join(", ")} onChange={e => onChange({ ...value, sdgAssociations: e.target.value.split(",").map(x => x.trim()).filter(Boolean) })} placeholder="SDG associations (comma separated)" className="w-full text-[11.5px] border border-border rounded p-2 bg-white" /><input value={value.infographicUrl ?? ""} onChange={e => onChange({ ...value, infographicUrl: e.target.value })} placeholder="Infographic URL" className="w-full text-[11.5px] border border-border rounded p-2 bg-white" /></div>
  </div>;
}

function SubmissionWizard({ editingProject, onCreated, onCancel }: { editingProject?: StoreProject | null; onCreated: () => void; onCancel: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [draftId, setDraftId] = useState<string | null>(editingProject?.apiId ?? null);
  const [title, setTitle] = useState(editingProject?.title ?? "");
  const [summary, setSummary] = useState(editingProject?.summary ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(editingProject?.coverImageUrl ?? "");
  const [fullDescription, setFullDescription] = useState(editingProject?.extendedDetails?.fullDescription ?? "");
  const [district, setDistrict] = useState(editingProject?.district ?? "");
  const [city, setCity] = useState(editingProject?.extendedDetails?.city ?? "");
  const [address, setAddress] = useState(editingProject?.extendedDetails?.address ?? "");
  const [latitude, setLatitude] = useState(editingProject?.extendedDetails?.latitude?.toString() ?? "");
  const [longitude, setLongitude] = useState(editingProject?.extendedDetails?.longitude?.toString() ?? "");
  const [sector, setSector] = useState(editingProject?.sector ?? SECTOR_DATA[0].name);
  const [primarySector, setPrimarySector] = useState(editingProject?.primarySector ?? editingProject?.sector ?? SECTOR_DATA[0].name);
  const [secondarySector, setSecondarySector] = useState(editingProject?.secondarySector ?? "");
  const [sdgs, setSdgs] = useState(editingProject?.sdgs?.join(", ") ?? "SDG 13");
  const [trl, setTrl] = useState(editingProject?.extendedDetails?.trl ?? "");
  const [priorityLevel, setPriorityLevel] = useState(editingProject?.extendedDetails?.priorityLevel ?? "");
  const [riskLevel, setRiskLevel] = useState(editingProject?.extendedDetails?.riskLevel ?? "");
  const [startDate, setStartDate] = useState(editingProject?.startDate ?? "");
  const [endDate, setEndDate] = useState(editingProject?.endDate ?? "");
  const [durationMonths, setDurationMonths] = useState(editingProject?.extendedDetails?.durationMonths?.toString() ?? "");
  const [cost, setCost] = useState(editingProject ? String(editingProject.costUSD / 1_000_000) : "");
  const [fundingGap, setFundingGap] = useState(editingProject ? String(editingProject.fundingGapUSD / 1_000_000) : "");
  const [coFinancing, setCoFinancing] = useState(editingProject?.coFinancingUSD ? String(editingProject.coFinancingUSD / 1_000_000) : "");
  const [currency, setCurrency] = useState(editingProject?.extendedDetails?.currency ?? "USD");
  const [researchFund, setResearchFund] = useState(editingProject?.extendedDetails?.researchFund?.toString() ?? "");
  const [equityFund, setEquityFund] = useState(editingProject?.extendedDetails?.equityFund?.toString() ?? "");
  const [debtLoan, setDebtLoan] = useState(editingProject?.extendedDetails?.debtLoan?.toString() ?? "");
  const [grantAmount, setGrantAmount] = useState(editingProject?.extendedDetails?.grantAmount?.toString() ?? "");
  const [minimumInvestment, setMinimumInvestment] = useState(editingProject?.extendedDetails?.minimumInvestment?.toString() ?? "");
  const [expectedRoi, setExpectedRoi] = useState(editingProject?.extendedDetails?.expectedRoi?.toString() ?? "");
  const [paybackPeriodMonths, setPaybackPeriodMonths] = useState(editingProject?.extendedDetails?.paybackPeriodMonths?.toString() ?? "");
  const [beneficiaries, setBeneficiaries] = useState(editingProject ? String(editingProject.beneficiaries) : "");
  const [indirectBeneficiaries, setIndirectBeneficiaries] = useState(editingProject?.extendedDetails?.indirectBeneficiaries?.toString() ?? "");
  const [jobs, setJobs] = useState(editingProject ? String(editingProject.jobs) : "");
  const [implementingAgency, setImplementingAgency] = useState(editingProject?.implementingAgency ?? "");
  const [organizationName, setOrganizationName] = useState(editingProject?.extendedDetails?.organizationName ?? "");
  const [organizationType, setOrganizationType] = useState(editingProject?.extendedDetails?.organizationType ?? "");
  const [organizationWebsite, setOrganizationWebsite] = useState(editingProject?.extendedDetails?.organizationWebsite ?? "");
  const [contactName, setContactName] = useState(editingProject?.contactName ?? user?.name ?? "");
  const [contactEmail, setContactEmail] = useState(editingProject?.contactEmail ?? user?.email ?? "");
  const [contactPhone, setContactPhone] = useState(editingProject?.contactPhone ?? "");
  const [riskNotes, setRiskNotes] = useState(editingProject?.riskNotes ?? "");
  const [wef, setWef] = useState<("Water" | "Energy" | "Food")[]>(editingProject?.wef ?? []);
  const [attachments, setAttachments] = useState<ProjectAttachment[]>(editingProject?.attachments ?? []);
  const [supportingRecords, setSupportingRecords] = useState<ProjectExtendedDetails>(() => editingProject?.extendedDetails ?? {});
  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [done, setDone] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [apiId, setApiId] = useState<string | undefined>(editingProject?.apiId);
  const [sectorOptions, setSectorOptions] = useState<{ id: string; name: string; color: string }[]>([]);
  const [provinceName, setProvinceName] = useState(user?.province ?? "");

  useEffect(() => {
    getSectors().then(options => {
      setSectorOptions(options);
      setSector(current => options.some(option => option.name === current) ? current : (options[0]?.name ?? current));
    }).catch(() => setSectorOptions(SECTOR_DATA.map((s, i) => ({ ...s, id: String(i + 1) }))));
  }, []);

  useEffect(() => {
    if (user?.province) {
      setProvinceName(user.province);
      return;
    }
    if (!user?.provinceId) return;
    getProvinces()
      .then(provinces => setProvinceName(provinces.find(province => province.id === user.provinceId)?.name ?? "Province unavailable"))
      .catch(() => setProvinceName("Province unavailable"));
  }, [user?.province, user?.provinceId]);

  const toggleWef = (w: "Water" | "Energy" | "Food") => setWef(w0 => (w0.includes(w) ? w0.filter(x => x !== w) : [...w0, w]));

  const addFiles = (files: FileList) => {
    filesToAttachments(files, user?.name ?? "Focal point").then(newFiles => setAttachments(a => [...a, ...newFiles]));
    setRawFiles(f => [...f, ...Array.from(files)]);
  };

  const addCoverImage = (files: FileList) => {
    const file = files[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Choose an image file for the cover.");
      return;
    }
    const image = new Image();
    image.onload = () => {
      const ratio = image.width / image.height;
      if (Math.abs(ratio - 2) > 0.05) {
        toast.error("Cover image must use a 2:1 ratio (the hero format is 1800 x 900).");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setCoverImageUrl(String(reader.result));
        setCoverFile(file);
      };
      reader.readAsDataURL(file);
    };
    image.onerror = () => toast.error("This image could not be read.");
    image.src = URL.createObjectURL(file);
  };


  const canNext = [
    title.trim().length > 0 && summary.trim().length > 0,
    true,
    cost.trim().length > 0 && fundingGap.trim().length > 0,
    true,
    wef.length > 0,
    true,
  ][step];

  const saveToApi = async () => {
    if (!user?.provinceId) throw new Error("Your focal account is not assigned to a province.");
    if (!title.trim()) throw new Error("Project title is required.");
    if (!summary.trim()) throw new Error("Project summary is required by the server.");
    const costUsd = Number(cost) * 1_000_000;
    const fundingGapUsd = Number(fundingGap) * 1_000_000;
    if (!Number.isFinite(costUsd) || costUsd < 0) throw new Error("Enter a valid non-negative total cost.");
    if (!Number.isFinite(fundingGapUsd) || fundingGapUsd < 0) throw new Error("Enter a valid non-negative funding gap.");
    if (fundingGapUsd > costUsd) throw new Error("Funding gap cannot exceed total cost.");
    const normalizedContactPhone = contactPhone.trim().replace(/[\s()-]/g, "");
    if (normalizedContactPhone && !/^\+?[1-9]\d{1,14}$/.test(normalizedContactPhone)) {
      throw new Error("Contact phone must use international format, for example +923001234567.");
    }
    const sectorId = sectorOptions.find(option => option.name === sector)?.id;
    if (!sectorId) throw new Error("Project sector reference data is unavailable.");
    const payload = {
      title: title.trim(), summary: summary.trim(), coverImageUrl: coverImageUrl || null, provinceId: user.provinceId,
      district: district.trim() || null, sectorId, costUsd,
      fundingGapUsd, coFinancingUsd: coFinancing.trim() ? Number(coFinancing) * 1_000_000 : null,
      beneficiaries: Number(beneficiaries) || 0, jobs: Number(jobs) || 0, readiness: editingProject?.readiness ?? 40,
      startDate: startDate || null, endDate: endDate || null, implementingAgency: implementingAgency.trim() || null,
      contactName: contactName.trim() || null, contactEmail: contactEmail.trim() || null, contactPhone: normalizedContactPhone || null,
      riskNotes: riskNotes.trim() || null, wefTags: wef.length ? wef : ["Water"],
      extendedDetails: {
        abstract: summary.trim(), fullDescription: fullDescription.trim() || null, city: city.trim() || null, address: address.trim() || null,
        latitude: latitude.trim() ? Number(latitude) : null, longitude: longitude.trim() ? Number(longitude) : null,
        durationMonths: durationMonths.trim() ? Number(durationMonths) : null, primarySector: primarySector.trim() || null, subSectors: secondarySector ? [secondarySector] : [], sdgGoals: sdgs.split(",").map(value => value.trim()).filter(Boolean), trl: trl.trim() || null,
        priorityLevel: priorityLevel.trim() || null, riskLevel: riskLevel.trim() || null, currency: currency.trim() || "USD",
        researchFund: researchFund.trim() ? Number(researchFund) : null, equityFund: equityFund.trim() ? Number(equityFund) : null, debtLoan: debtLoan.trim() ? Number(debtLoan) : null, grantAmount: grantAmount.trim() ? Number(grantAmount) : null,
        minimumInvestment: minimumInvestment.trim() ? Number(minimumInvestment) : null, expectedRoi: expectedRoi.trim() ? Number(expectedRoi) : null, paybackPeriodMonths: paybackPeriodMonths.trim() ? Number(paybackPeriodMonths) : null,
        directBeneficiaries: Number(beneficiaries) || 0, indirectBeneficiaries: indirectBeneficiaries.trim() ? Number(indirectBeneficiaries) : null, organizationName: organizationName.trim() || null, organizationType: organizationType.trim() || null, organizationWebsite: organizationWebsite.trim() || null,
        ...supportingRecords,
      },
    };
    const saved = apiId ? await updateProjectDraftApi(apiId, payload) : await createProjectApi(payload);
    setApiId(saved.id);
    setDraftId(saved.id);
    if (coverFile) await uploadProjectAttachment(saved.id, coverFile);
    for (const file of rawFiles) await uploadProjectAttachment(saved.id, file);
    return saved;
  };

  const saveAsDraft = async () => {
    setSaving(true);
    setSavedMsg("");
    try {
      await saveToApi();
      setSavedMsg("Draft saved successfully.");
      toast.success("Draft saved to the server.");
      onCreated();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not save draft to the server.";
      setSavedMsg(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const submitForReview = async () => {
    setSaving(true);
    setSavedMsg("");
    try {
      const saved = await saveToApi();
      await submitProjectApi(saved.id, "Submitted for ministry review.");
      setSavedMsg("Project submitted successfully.");
      toast.success("Project submitted for ministry review.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not submit the project to the server.";
      setSavedMsg(message);
      toast.error(message);
      return;
    } finally {
      setSaving(false);
    }
    setDone(true);
    setTimeout(onCreated, 1400);
  };

  if (done) {
    return (
      <Panel title="Submitted for review">
        <div className="flex flex-col items-center py-8 gap-3">
          <div className="w-14 h-14 rounded-full bg-[#e7f5ee] flex items-center justify-center"><CheckCircle2 className="w-7 h-7 text-[#2f9e6d]" /></div>
          <p className="font-semibold text-[#1c2d7a] text-sm">Submitted to the ministry review queue. Track its status any time from "My Projects".</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title={editingProject ? "Edit project submission" : "New project submission"}
      description="A guided, step-by-step process — save as a draft on any step and come back later"
      action={editingProject ? <button onClick={onCancel} className="text-[11.5px] font-semibold text-muted-foreground hover:text-[#1c2d7a]">Cancel edit</button> : undefined}
    >
      <div className="grid lg:grid-cols-[minmax(0,1fr)_250px] gap-7 items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
            {STEPS.map((s, i) => (
              <div key={s} className={`flex items-center gap-1.5 text-[11.5px] font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${i === step ? "bg-[#1c2d7a] text-white" : i < step ? "bg-[#e7f5ee] text-[#2f9e6d]" : "bg-slate-100 text-muted-foreground"}`}>
                <span>{i + 1}</span> {s}
              </div>
            ))}
          </div>

      {step === 0 && (
        <div className="space-y-3 w-full">
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Project title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Community-based solar irrigation scheme" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Summary *</label>
            <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3} placeholder="Briefly describe the project's purpose and expected impact." className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Hero cover image</label>
            <p className="text-[11.5px] text-muted-foreground mb-2">Upload a landscape image in a 2:1 ratio. It will be shown in the homepage hero and project cards.</p>
            <label className="block cursor-pointer border border-dashed border-[#1c2d7a]/35 rounded-lg overflow-hidden bg-[#f4f7fb] hover:border-[#17a4c2] transition-colors">
              {coverImageUrl ? (
                <img src={coverImageUrl} alt="Project cover preview" className="w-full aspect-[2/1] object-cover" />
              ) : (
                <div className="w-full aspect-[2/1] flex items-center justify-center text-[12px] font-semibold text-[#1c2d7a]">Choose 1800 x 900 cover image</div>
              )}
              <input type="file" accept="image/*" className="sr-only" onChange={event => { if (event.target.files) addCoverImage(event.target.files); }} />
            </label>
            {coverImageUrl && <button type="button" onClick={() => setCoverImageUrl("")} className="text-[11px] text-red-600 font-semibold mt-1.5">Remove cover image</button>}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Full description</label>
            <textarea value={fullDescription} onChange={e => setFullDescription(e.target.value)} rows={5} placeholder="Scope, activities, beneficiaries and delivery approach." className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="grid sm:grid-cols-2 gap-3 w-full">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Province</label>
            <div className="flex items-center gap-1.5 text-[12.5px] text-[#0f172a] bg-[#f4f7fb] border border-border rounded-lg p-2.5" aria-readonly="true"><MapPin className="w-3.5 h-3.5 text-muted-foreground" /> {provinceName || "Loading province..."} <span className="text-muted-foreground ml-1">(fixed to your focal-point scope)</span></div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">District / city</label>
            <input value={district} onChange={e => setDistrict(e.target.value)} placeholder="e.g. Multan" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
          <div><label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">City</label><input value={city} onChange={e => setCity(e.target.value)} className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" /></div>
          <div className="sm:col-span-2"><label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Address</label><input value={address} onChange={e => setAddress(e.target.value)} className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" /></div>
          <div><label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Latitude</label><input value={latitude} onChange={e => setLatitude(e.target.value)} type="number" step="any" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" /></div>
          <div><label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Longitude</label><input value={longitude} onChange={e => setLongitude(e.target.value)} type="number" step="any" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" /></div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Sector *</label>
            <select value={sector} onChange={e => setSector(e.target.value)} className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]">
              {(sectorOptions.length ? sectorOptions : SECTOR_DATA).map(s => <option key={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Primary sector *</label>
            <select value={primarySector} onChange={e => setPrimarySector(e.target.value)} className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]">
              {SECTOR_DATA.map(s => <option key={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Secondary sector</label>
            <select value={secondarySector} onChange={e => setSecondarySector(e.target.value)} className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]"><option value="">None</option>{SECTOR_DATA.map(s => <option key={s.name}>{s.name}</option>)}</select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">SDG linkage</label>
            <input value={sdgs} onChange={e => setSdgs(e.target.value)} placeholder="SDG 6, SDG 13" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
            <p className="text-[11px] text-muted-foreground mt-1">Enter one or more goals separated by commas.</p>
          </div>
          <div><label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">TRL</label><input value={trl} onChange={e => setTrl(e.target.value)} placeholder="e.g. 7" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" /></div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Priority level</label>
            <select value={priorityLevel} onChange={e => setPriorityLevel(e.target.value)} className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]">
              <option value="">Select priority</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Risk level</label>
            <select value={riskLevel} onChange={e => setRiskLevel(e.target.value)} className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]">
              <option value="">Select risk</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Planned start date</label>
            <input value={startDate} onChange={e => setStartDate(e.target.value)} type="date" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
          <div><label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Duration (months)</label><input value={durationMonths} onChange={e => setDurationMonths(e.target.value)} type="number" min="0" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" /></div>
          <div><label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Currency</label><input value={currency} onChange={e => setCurrency(e.target.value)} className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" /></div>
          {[['Research fund', researchFund, setResearchFund], ['Equity fund', equityFund, setEquityFund], ['Debt / loan', debtLoan, setDebtLoan], ['Grant amount', grantAmount, setGrantAmount], ['Minimum investment', minimumInvestment, setMinimumInvestment], ['Expected ROI (%)', expectedRoi, setExpectedRoi], ['Payback (months)', paybackPeriodMonths, setPaybackPeriodMonths]].map(([label, value, setter]) => <div key={String(label)}><label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{String(label)}</label><input value={String(value)} onChange={e => (setter as (value: string) => void)(e.target.value)} type="number" min="0" step="any" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" /></div>)}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Planned end date</label>
            <input value={endDate} onChange={e => setEndDate(e.target.value)} type="date" min={startDate || undefined} className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid sm:grid-cols-2 gap-3 w-full">
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Total cost (USD millions) *</label>
            <input value={cost} onChange={e => setCost(e.target.value)} type="number" min="0" placeholder="25" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Funding gap (USD millions) *</label>
            <input value={fundingGap} onChange={e => setFundingGap(e.target.value)} type="number" min="0" placeholder="10" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Co-financing secured (USD millions)</label>
            <input value={coFinancing} onChange={e => setCoFinancing(e.target.value)} type="number" min="0" placeholder="2" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Beneficiaries</label>
            <input value={beneficiaries} onChange={e => setBeneficiaries(e.target.value)} type="number" min="0" placeholder="50000" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Indirect beneficiaries</label>
            <input value={indirectBeneficiaries} onChange={e => setIndirectBeneficiaries(e.target.value)} type="number" min="0" placeholder="100000" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Jobs supported</label>
            <input value={jobs} onChange={e => setJobs(e.target.value)} type="number" min="0" placeholder="300" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid sm:grid-cols-2 gap-3 w-full">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Implementing agency</label>
            <input value={implementingAgency} onChange={e => setImplementingAgency(e.target.value)} placeholder="e.g. Provincial Irrigation Department" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
          <div><label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Organization name</label><input value={organizationName} onChange={e => setOrganizationName(e.target.value)} className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" /></div>
          <div><label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Organization type</label><input value={organizationType} onChange={e => setOrganizationType(e.target.value)} placeholder="Government / NGO / Private" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" /></div>
          <div className="sm:col-span-2"><label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Organization website</label><input value={organizationWebsite} onChange={e => setOrganizationWebsite(e.target.value)} type="url" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" /></div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Focal contact name</label>
            <input value={contactName} onChange={e => setContactName(e.target.value)} className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Contact email</label>
            <input value={contactEmail} onChange={e => setContactEmail(e.target.value)} type="email" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Contact phone</label>
            <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+923001234567" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Risks & mitigation notes (optional)</label>
            <textarea value={riskNotes} onChange={e => setRiskNotes(e.target.value)} rows={2} placeholder="Any known risks (land acquisition, permits, seasonal access) and how they'll be mitigated." className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="w-full space-y-5">
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Water – Energy – Food Nexus dimensions *</label>
            <div className="flex gap-2">
              {(["Water", "Energy", "Food"] as const).map(w => (
                <button key={w} onClick={() => toggleWef(w)} className={`flex-1 text-[12.5px] font-semibold py-2.5 rounded-lg border transition-colors ${wef.includes(w) ? "bg-[#1c2d7a] text-white border-[#1c2d7a]" : "bg-[#f4f7fb] text-[#1c2d7a] border-border"}`}>{w}</button>
              ))}
            </div>
            <p className="text-[11.5px] text-muted-foreground mt-2">Select every dimension this project meaningfully affects.</p>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Supporting documents (optional)</label>
            <p className="text-[11.5px] text-muted-foreground mb-2">Feasibility studies, cost breakdowns, environmental assessments, letters of support, etc.</p>
            <AttachmentList attachments={attachments} onRemove={id => setAttachments(a => a.filter(f => f.id !== id))} />
            <div className="mt-2"><AttachmentPicker onAdd={addFiles} /></div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Supporting information</label>
            <SupportingRecordsEditor value={supportingRecords} onChange={setSupportingRecords} />
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="w-full space-y-2 text-[12.5px]">
          {[
            ["Title", title || "—"], ["Province", provinceName || "Loading province..."], ["District", district || "—"], ["Sector", sector],
            ["Start date", startDate || "—"], ["End date", endDate || "—"],
            ["Total cost", cost ? `$${cost}M` : "—"], ["Funding gap", fundingGap ? `$${fundingGap}M` : "—"], ["Co-financing", coFinancing ? `$${coFinancing}M` : "—"],
            ["Implementing agency", implementingAgency || "—"], ["Contact", contactName ? `${contactName}${contactEmail ? " · " + contactEmail : ""}` : "—"],
            ["WEF Nexus", wef.join(", ") || "—"], ["Attachments", attachments.length ? `${attachments.length} file(s)` : "None"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 bg-[#f4f7fb] rounded-lg p-2.5">
              <span className="text-muted-foreground">{label}</span><span className="font-semibold text-[#0f172a] text-right">{value}</span>
            </div>
          ))}
          <p className="text-[11.5px] text-muted-foreground pt-1">Review the details above, then submit for ministry review — or keep it as a draft and finish later.</p>
        </div>
      )}
        </div>

        <aside className="hidden lg:block border-l border-border pl-6 sticky top-5">
          <div className="rounded-xl bg-[#f4f7fb] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#17a4c2]">Submission snapshot</p>
            <h3 className="mt-2 text-sm font-bold text-[#1c2d7a]">{title || "Untitled project"}</h3>
            <p className="mt-1 text-[11.5px] leading-5 text-muted-foreground">{summary || "Add a concise summary to help reviewers understand the project quickly."}</p>
            <div className="mt-4 space-y-2 border-t border-border pt-3 text-[11.5px]">
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Current step</span><span className="font-semibold text-[#0f172a]">{step + 1} of {STEPS.length}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Province</span><span className="font-semibold text-right text-[#0f172a]">{provinceName || "Loading..."}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Sector</span><span className="font-semibold text-right text-[#0f172a]">{sector || "Not selected"}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Funding gap</span><span className="font-semibold text-right text-[#0f172a]">{fundingGap ? `$${fundingGap}M` : "Not entered"}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">WEF dimensions</span><span className="font-semibold text-right text-[#0f172a]">{wef.length ? wef.join(", ") : "Required"}</span></div>
            </div>
          </div>
          <p className="mt-4 text-[11px] leading-5 text-muted-foreground">Your draft is saved to the server whenever you choose “Save as draft”. Required fields are checked before submission.</p>
        </aside>
      </div>

      {savedMsg && <p className="text-[11.5px] font-semibold text-[#2f9e6d] mt-4">{savedMsg}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2.5 mt-7">
        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0 || saving} className="flex items-center gap-1.5 text-[12.5px] font-semibold px-4 py-2 rounded border border-border disabled:opacity-40 hover:bg-slate-50"><ArrowLeft className="w-3.5 h-3.5" /> Back</button>
        <div className="flex items-center gap-2 ml-auto">
          <button type="button" onClick={() => { void saveAsDraft(); }} disabled={saving} className="flex items-center gap-1.5 text-[12.5px] font-semibold px-4 py-2 rounded border border-[#1c2d7a] text-[#1c2d7a] hover:bg-[#eef0f9] disabled:opacity-50">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save as draft
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => canNext && setStep(s => s + 1)} disabled={!canNext} className="flex items-center gap-1.5 text-[12.5px] font-semibold px-4 py-2 rounded bg-[#1c2d7a] text-white disabled:opacity-40 hover:bg-[#17a4c2]">Next <ArrowRight className="w-3.5 h-3.5" /></button>
          ) : (
            <button type="button" onClick={() => { void submitForReview(); }} disabled={!title.trim() || saving} className="flex items-center gap-1.5 text-[12.5px] font-semibold px-4 py-2 rounded bg-[#2f9e6d] text-white disabled:opacity-40 hover:opacity-90">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Submit for review <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </Panel>
  );
}


function InterestsTab({ projects }: { projects: StoreProject[] }) {
  const { user } = useAuth();
  const [interests, setInterests] = useState<Awaited<ReturnType<typeof getFocalInterests>>>([]);
  const [timelines, setTimelines] = useState<Record<string, { note: string; byUserName: string; createdAt: string }[]>>({});
  const [reply, setReply] = useState<Record<string, string>>({});
  const projectIds = projects.map(p => p.id);

  useEffect(() => {
    getFocalInterests().then(items => {
      setInterests(items.filter(i => projects.some(p => p.apiId === i.projectId)));
      return Promise.all(items.map(i => getInterestTimeline(i.id).then(timeline => [i.id, timeline] as const)));
    }).then(entries => setTimelines(Object.fromEntries(entries))).catch(e => toast.error(e instanceof Error ? e.message : "Unable to load investor interests."));
  }, [projects]);

  const respond = async (interestId: string, status: string) => {
    const note = reply[interestId] || `Status updated to ${status}.`;
    try {
      await updateInterestStatus(interestId, status === "In discussion" ? "InDiscussion" : status);
      if (reply[interestId]?.trim()) await addInterestTimeline(interestId, note);
      const updated = await getFocalInterests();
      setInterests(updated.filter(i => projects.some(p => p.apiId === i.projectId)));
      setReply(r => ({ ...r, [interestId]: "" }));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Unable to update this interest."); }
  };

  return (
    <Panel title="Investor interests" description="Respond to interest expressed in your province's projects. In discussion opens a conversation; Connected records a confirmed handoff. Both parties can see the stage and timeline here.">
      {interests.length === 0 ? (
        <p className="text-[12.5px] text-muted-foreground">No investor interest yet on your projects.</p>
      ) : (
        <div className="space-y-4">
          {interests.map(i => {
            const project = projects.find(p => p.apiId === i.projectId);
            return (
              <div key={i.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-[13px] text-[#0f172a]">{project?.title}</span>
                  <StatusBadge status={i.status} />
                </div>
                <p className="text-[12px] text-muted-foreground mb-2">Interest received · {i.createdAt.slice(0, 10)}</p>
                <p className="text-[12px] text-muted-foreground mb-2">Investor message is shown below. Discuss terms and next steps in the shared timeline.</p>
                <p className="text-[12.5px] bg-[#f4f7fb] rounded-lg p-2.5 mb-3">{i.message}</p>
                <div className="border-l-2 border-[#eef0f9] pl-3 mb-3">{(timelines[i.id] ?? []).map(event => <div key={event.createdAt + event.byUserName} className="text-[11px] text-muted-foreground mb-1">{event.createdAt.slice(0, 10)} · {event.byUserName}: {event.note}</div>)}</div>
                <textarea value={reply[i.id] || ""} onChange={e => setReply(r => ({ ...r, [i.id]: e.target.value }))} rows={2} placeholder="Write a reply (optional)…"
                  className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb] mb-2" />
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => respond(i.id, "In discussion")} className="text-[11.5px] font-semibold px-3 py-1.5 rounded bg-[#e6f6fa] text-[#17a4c2] hover:bg-[#17a4c2] hover:text-white">Move to discussion</button>
                  <button onClick={() => respond(i.id, "Connected")} className="text-[11.5px] font-semibold px-3 py-1.5 rounded bg-[#e7f5ee] text-[#2f9e6d] hover:bg-[#2f9e6d] hover:text-white">Mark connected</button>
                  <button onClick={() => respond(i.id, "Declined")} className="text-[11.5px] font-semibold px-3 py-1.5 rounded bg-[#fbe9ec] text-[#c0455f] hover:bg-[#c0455f] hover:text-white">Decline</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

export default function FocalDashboard() {
  const { user } = useAuth();
  const [active, setActive] = useState("overview");
  const { projects, refresh } = useProvinceProjects(user?.provinceId);
  const [editingProject, setEditingProject] = useState<StoreProject | null>(null);

  return (
    <DashboardShell
      navItems={NAV_ITEMS}
      active={active}
      onNavigate={key => { setEditingProject(null); setActive(key); }}
      title={`Provincial Focal Point — ${user?.province ?? ""}`}
      subtitle="Pakistan Climate Project Pipeline · Scoped to your province"
    >
      {active === "overview" && <OverviewTab projects={projects} />}
      {active === "projects" && (
        <ProjectsTab
          projects={projects}
          refresh={refresh}
          onEdit={p => { setEditingProject(p); setActive("submit"); }}
        />
      )}
      {active === "submit" && (
        <SubmissionWizard
          key={editingProject?.id ?? "new"}
          editingProject={editingProject}
          onCreated={() => { setEditingProject(null); refresh(); setActive("projects"); }}
          onCancel={() => { setEditingProject(null); setActive("projects"); }}
        />
      )}
      {active === "interests" && <InterestsTab projects={projects} />}
      {active === "analytics" && <AnalyticsTab projects={projects} />}
    </DashboardShell>
  );
}
