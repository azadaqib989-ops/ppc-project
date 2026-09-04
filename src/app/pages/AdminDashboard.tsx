import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import {
  LayoutDashboard, ClipboardList, Map as MapIcon, Waves, Users2, FileBarChart2,
  Building2, HandCoins, TrendingUp, Check, RotateCcw, Search, MessageSquare, Plus,
  ShieldCheck, Filter, Download, Loader2, AlertCircle, Pencil,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, AreaChart, Area, Legend, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, LabelList, RadialBarChart, RadialBar, Sector,
} from "recharts";
import { DashboardShell, type NavItem } from "./DashboardShell";
import { KpiCard, Panel, StatusBadge, SaturationBadge, AttachmentPicker, AttachmentList, filesToAttachments } from "./dashboardWidgets";
import { ProjectDetailPage } from "./ProjectDetail";
import { useAuth } from "../lib/auth";
import {
  PROVINCES, SECTOR_DATA, WEF_NEXUS_SPLIT, PIPELINE_TREND, STATUS_DISTRIBUTION,
  IMPACT_METRICS, formatUSD, formatNumber, type ProjectStatus,
} from "../lib/mockData";
import {
  getProjects,
  type StoreProject, type ProjectAttachment,
} from "../lib/store";
import {
  getAdminOverview, getAdminReviewQueue, getAdminProvinceSummary, mapApiProjectToStore,
  approveProject, returnProject, addProjectComment,
  getAllUsers, updateUser, deactivateUser, createUser, getProvinces,
  getWefNexusAnalytics, getGeographyAnalytics,
  downloadReportFile,
  uploadFile,
  type ApiAdminOverview, type ApiProvinceSummary, type ApiUser,
} from "../lib/api";

function useAdminNav(isAdmin: boolean): NavItem[] {
  return [
    { key: "overview", label: "Executive Overview", icon: LayoutDashboard },
    { key: "review", label: isAdmin ? "Project Review Queue" : "Review & Comment", icon: ClipboardList },
    { key: "geography", label: "Geography & Provinces", icon: MapIcon },
    { key: "nexus", label: "WEF Nexus", icon: Waves },
    ...(isAdmin ? [{ key: "users", label: "Users & Roles", icon: Users2 }] : []),
    { key: "reports", label: "Reports", icon: FileBarChart2 },
  ];
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

/* Blue-only chart palette — follows the PCPP theme (#1c2d7a → #17a4c2 range). */
const ADMIN_BLUE_SCALE = ["#10264b", "#1c2d7a", "#24409c", "#2f56c4", "#3f74d4", "#17a4c2", "#4fc3dd", "#7ee1e8"];

/* ───────────────────────── Overview ───────────────────────── */

function OverviewTab() {
  const [overview, setOverview] = useState<ApiAdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getAdminOverview()
      .then(data => { if (active) setOverview(data); })
      .catch(err => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load dashboard overview.");
        toast.error(err instanceof Error ? err.message : "Failed to load dashboard overview.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1c2d7a]" /></div>;
  }
  if (error || !overview) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-semibold text-red-900 mb-1">Unable to load dashboard overview</h3>
          <p className="text-[13px] text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  const statusDistribution = (overview.projectsByStatus || []).map((s, index) => ({
    name: s.status,
    value: s.count,
    color: ADMIN_BLUE_SCALE[index % ADMIN_BLUE_SCALE.length],
  }));
  const totalStatus = statusDistribution.reduce((s, d) => s + d.value, 0) || 1;
  const radialData = statusDistribution.map(s => ({ ...s, fullValue: totalStatus }));
  const pipelineTrend = overview.pipelineTrend || [];
  const provinceData = (overview.projectsByProvince || []).map(p => ({ name: p.provinceName, projects: p.count }));
  const sectorData = (overview.projectsBySector || []).map(s => ({ name: s.sectorName, count: s.count }));

  const kpis = [
    { icon: Building2, label: "Total Pipeline", value: formatNumber(overview.totalProjects), sub: "Projects nationwide", accent: "#1c2d7a" },
    { icon: Check, label: "Approved", value: formatNumber(overview.approvedProjects), sub: `${overview.totalProjects > 0 ? Math.round((overview.approvedProjects / overview.totalProjects) * 100) : 0}% of pipeline`, accent: "#24409c" },
    { icon: HandCoins, label: "Funding Gap", value: formatUSD(overview.fundingGapUsd), sub: "Across all provinces", accent: "#2f56c4" },
    { icon: TrendingUp, label: "Beneficiaries", value: formatNumber(overview.totalBeneficiaries), sub: `${formatNumber(overview.totalJobs)} jobs supported`, accent: "#17a4c2" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <AnimatedPanel key={k.label} delay={i * 0.06}>
            <KpiCard icon={k.icon} label={k.label} value={k.value} sub={k.sub} accent={k.accent} />
          </AnimatedPanel>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <AnimatedPanel delay={0.1} className="lg:col-span-2">
          <Panel title="Pipeline growth" description="Submitted vs. approved projects · last 12 months">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={pipelineTrend} margin={{ left: -8, right: 12, top: 12 }}>
                <defs>
                  <linearGradient id="gradSubmitted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#17a4c2" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#17a4c2" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1c2d7a" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="#1c2d7a" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 8px 24px rgba(15,23,42,0.08)" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                <Area type="monotone" dataKey="submitted" name="Submitted" stroke="#17a4c2" strokeWidth={2.5} fill="url(#gradSubmitted)" activeDot={{ r: 5 }} animationDuration={1200} />
                <Area type="monotone" dataKey="approved" name="Approved" stroke="#1c2d7a" strokeWidth={2.5} fill="url(#gradApproved)" activeDot={{ r: 5 }} animationDuration={1200} animationBegin={120} />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>
        </AnimatedPanel>

        <AnimatedPanel delay={0.16}>
          <Panel title="Review status" description="Current status of every project">
            <div className="relative">
              <ResponsiveContainer width="100%" height={260}>
                <RadialBarChart data={radialData} innerRadius="30%" outerRadius="95%" startAngle={90} endAngle={-270} barGap={3}>
                  <RadialBar background={{ fill: "#f1f5f9" }} dataKey="value" cornerRadius={8} animationDuration={1200}>
                    {radialData.map(s => <Cell key={s.name} fill={s.color} />)}
                  </RadialBar>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ right: "36%" }}>
                <div className="text-2xl font-bold text-[#1c2d7a] tracking-tight">{totalStatus}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 px-1 mt-1">
              {statusDistribution.map(status => (
                <div key={status.name} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: status.color }} />
                    {status.name}
                  </span>
                  <strong className="text-slate-800 tabular-nums">{formatNumber(status.value)}</strong>
                </div>
              ))}
            </div>
          </Panel>
        </AnimatedPanel>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <AnimatedPanel delay={0.22}>
          <Panel title="Pipeline by province" description="Project count per province / region">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={provinceData} layout="vertical" margin={{ left: 8, right: 28 }} barSize={14}>
                <defs>
                  <linearGradient id="gradProvince" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#17a4c2" />
                    <stop offset="100%" stopColor="#1c2d7a" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10.5, fill: "#475569" }} width={130} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="projects" fill="url(#gradProvince)" radius={[0, 6, 6, 0]} name="Projects" animationDuration={1100}>
                  <LabelList dataKey="projects" position="right" style={{ fontSize: 11, fontWeight: 600, fill: "#1c2d7a" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </AnimatedPanel>

        <AnimatedPanel delay={0.28}>
          <Panel title="Pipeline by sector" description="Distribution across investment sectors">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={sectorData} barSize={32} margin={{ top: 8 }}>
                <defs>
                  {sectorData.map(s => (
                    <linearGradient key={s.name} id={`gradSector-${s.name}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1c2d7a" stopOpacity={1} />
                      <stop offset="100%" stopColor="#17a4c2" stopOpacity={0.5} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: "#64748b" }} interval={0} angle={-18} textAnchor="end" height={58} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="count" name="Projects" radius={[6, 6, 0, 0]} animationDuration={1100}>
                  {sectorData.map(s => <Cell key={s.name} fill={`url(#gradSector-${s.name})`} />)}
                  <LabelList dataKey="count" position="top" style={{ fontSize: 11, fontWeight: 600, fill: "#0f172a" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </AnimatedPanel>
      </div>
    </div>
  );
}

/* ───────────────────────── Review Queue ───────────────────────── */

function ReturnModal({ onCancel, onConfirm, submitting }: { onCancel: () => void; onConfirm: (note: string, attachments: ProjectAttachment[]) => void; submitting: boolean }) {
  const { user } = useAuth();
  const [note, setNote] = useState("");
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);

  const addFiles = (files: FileList) => {
    filesToAttachments(files, user?.name ?? "Ministry").then(newFiles => setAttachments(a => [...a, ...newFiles]));
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100"
        onClick={e => e.stopPropagation()}
      >
        <h4 className="font-bold text-[#1c2d7a] text-[15px] mb-1">Return project for changes</h4>
        <p className="text-[12.5px] text-slate-500 mb-4 leading-relaxed">
          Explain what the provincial focal point needs to revise. This note is added to the project’s status history.
        </p>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={4}
          placeholder="e.g. Please provide an updated cost breakdown and confirm beneficiary estimates."
          className="w-full text-[13px] border border-slate-200 rounded-xl p-3.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1c2d7a]/20 focus:border-[#1c2d7a]/40 mb-3 resize-none"
        />
        <div className="mb-5 space-y-2">
          <AttachmentList attachments={attachments} onRemove={id => setAttachments(a => a.filter(f => f.id !== id))} dense />
          <AttachmentPicker label="Attach supporting file" onAdd={addFiles} />
        </div>
        <div className="flex justify-end gap-2.5">
          <button onClick={onCancel} className="text-[13px] font-semibold px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(note || "Returned for revision.", attachments)}
            disabled={submitting}
            className="text-[13px] font-semibold px-4 py-2.5 rounded-xl bg-[#c0455f] text-white hover:bg-[#a63a4f] disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {submitting ? "Returning..." : "Return project"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ReviewQueueTab({ isAdmin }: { isAdmin: boolean }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<StoreProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Pending" | "All">("Pending");
  const [provinceFilter, setProvinceFilter] = useState("All");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [wefFilter, setWefFilter] = useState("All");
  const [readinessFilter, setReadinessFilter] = useState("All");
  const [viewing, setViewing] = useState<StoreProject | null>(null);
  const [returning, setReturning] = useState<StoreProject | null>(null);
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [comment, setComment] = useState("");
  const [commentFiles, setCommentFiles] = useState<ProjectAttachment[]>([]);
  const [addingComment, setAddingComment] = useState(false);

  const loadQueue = () => {
    setLoading(true);
    getAdminReviewQueue({ page: 1, pageSize: 200 })
      .then(page => setProjects(page.data.map((p, idx) => mapApiProjectToStore(p, idx + 1))))
      .catch(err => toast.error(err instanceof Error ? err.message : "Failed to load review queue."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadQueue(); }, []);

  const pending: ProjectStatus[] = ["Submitted", "Under Review"];
  const filtered = useMemo(() => projects.filter(p =>
    (statusFilter === "All" || pending.includes(p.status)) &&
    (provinceFilter === "All" || p.province === provinceFilter) &&
    (sectorFilter === "All" || p.sector === sectorFilter) &&
    (wefFilter === "All" || p.wef.includes(wefFilter as "Water" | "Energy" | "Food")) &&
    (readinessFilter === "All" ||
      (readinessFilter === "Low" && p.readiness < 40) ||
      (readinessFilter === "Medium" && p.readiness >= 40 && p.readiness < 70) ||
      (readinessFilter === "High" && p.readiness >= 70)) &&
    (p.title.toLowerCase().includes(query.toLowerCase()) || p.province.toLowerCase().includes(query.toLowerCase()))
  ), [projects, query, statusFilter, provinceFilter, sectorFilter, wefFilter, readinessFilter]);

  const clearFilters = () => {
    setQuery(""); setStatusFilter("Pending"); setProvinceFilter("All");
    setSectorFilter("All"); setWefFilter("All"); setReadinessFilter("All");
  };

  const decide = async (id: number, status: ProjectStatus, note: string, attachments: ProjectAttachment[] = []) => {
    const project = projects.find(p => p.id === id);
    if (!project?.apiId) return;
    if (status === "Returned") setSubmittingReturn(true);
    try {
      if (status === "Approved") await approveProject(project.apiId, note);
      else if (status === "Returned") {
        const uploaded = await Promise.all(attachments.map(file => uploadFileFromAttachment(file, project.apiId!)));
        await returnProject(project.apiId, note, uploaded.map(file => file.id));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${status.toLowerCase()} project.`);
      return;
    } finally {
      if (status === "Returned") setSubmittingReturn(false);
    }
    loadQueue();
    toast.success(`Project ${status.toLowerCase()} successfully.`);
    setViewing(null);
    setReturning(null);
    setComment("");
    setCommentFiles([]);
  };

  const uploadFileFromAttachment = async (file: ProjectAttachment, projectId?: string) => {
    const response = await fetch(file.dataUrl);
    if (!response.ok) throw new Error(`Could not read ${file.name}.`);
    const blob = await response.blob();
    return uploadFile(new File([blob], file.name, { type: file.type }), projectId);
  };

  const addComment = async (id: number) => {
    if (!comment.trim() && commentFiles.length === 0) return;
    const project = projects.find(p => p.id === id);
    if (!project?.apiId) return;
    setAddingComment(true);
    try {
      const uploaded = await Promise.all(commentFiles.map(file => uploadFileFromAttachment(file)));
      await addProjectComment(project.apiId, comment || "Reviewer attached supporting file(s).", uploaded.map(file => file.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add comment.");
      return;
    } finally {
      setAddingComment(false);
    }
    setComment("");
    setCommentFiles([]);
    setViewing(null);
    toast.success("Comment added.");
  };

  const addCommentFiles = (files: FileList) => {
    filesToAttachments(files, user?.name ?? "Reviewer").then(newFiles => setCommentFiles(a => [...a, ...newFiles]));
  };

  const selectClass = "px-2.5 py-1.5 text-[12px] border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1c2d7a]/15";

  if (viewing) {
    return <ProjectDetailPage
      project={viewing}
      onBack={() => setViewing(null)}
      actions={isAdmin ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-lg bg-[#eef0f9] flex items-center justify-center shrink-0"><ShieldCheck className="w-4 h-4 text-[#1c2d7a]" /></span>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#1c2d7a]">Review decision</h3>
              <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">Approve to publish this project to the investor catalogue, or return it to the provincial focal point with revision notes.</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3.5">
            <button onClick={() => decide(viewing.id, "Approved", "Approved by ministry administrator.")} className="inline-flex items-center justify-center gap-2 bg-[#1c2d7a] text-white font-bold text-sm px-5 py-3 rounded-xl hover:bg-[#17a4c2] transition-colors shadow-sm">
              <Check className="w-4 h-4" /> Approve project
            </button>
            <button onClick={() => { setReturning(viewing); setViewing(null); }} className="inline-flex items-center justify-center gap-2 bg-white text-slate-600 border border-slate-300 font-bold text-sm px-5 py-3 rounded-xl hover:border-[#c0455f] hover:text-[#c0455f] hover:bg-[#fdf5f6] transition-colors shadow-sm">
              <RotateCcw className="w-4 h-4" /> Return for changes
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full space-y-2.5">
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} placeholder="Add a comment for the ministry administrator…" className="w-full text-[13px] border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1c2d7a]/20 resize-none" />
          <AttachmentList attachments={commentFiles} onRemove={id => setCommentFiles(a => a.filter(f => f.id !== id))} dense />
          <div className="flex items-center justify-between gap-2">
            <AttachmentPicker label="Attach file" onAdd={addCommentFiles} />
            <button onClick={() => addComment(viewing.id)} disabled={addingComment || (commentFiles.length === 0 && !comment.trim())} className="flex-1 bg-[#1c2d7a] text-white font-bold text-sm py-2.5 rounded-xl hover:bg-[#17a4c2] transition-colors shadow-sm disabled:opacity-50">{addingComment ? "Saving comment..." : "Add comment"}</button>
          </div>
        </div>
      )}
    />;
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1c2d7a]" /></div>;
  }

  return (
    <>
      <Panel
        title={isAdmin ? "Project review queue" : "Review & comment"}
        description={isAdmin ? "Submissions awaiting a ministry decision" : "Examine submissions and leave comments for the ministry"}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-[12px] font-semibold shadow-sm">
              <button
                onClick={() => setStatusFilter("Pending")}
                className={`px-3.5 py-1.5 transition-colors ${statusFilter === "Pending" ? "bg-[#1c2d7a] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter("All")}
                className={`px-3.5 py-1.5 transition-colors ${statusFilter === "All" ? "bg-[#1c2d7a] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
              >
                All
              </button>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search project or province…"
                className="pl-8 pr-3 py-1.5 text-[12.5px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1c2d7a]/15 w-52"
              />
            </div>
            <select aria-label="Filter province" value={provinceFilter} onChange={e => setProvinceFilter(e.target.value)} className={selectClass}>
              <option value="All">All provinces</option>
              {PROVINCES.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
            <select aria-label="Filter sector" value={sectorFilter} onChange={e => setSectorFilter(e.target.value)} className={selectClass}>
              <option value="All">All sectors</option>
              {SECTOR_DATA.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
            <select aria-label="Filter WEF" value={wefFilter} onChange={e => setWefFilter(e.target.value)} className={selectClass}>
              <option value="All">All WEF</option>
              {["Water", "Energy", "Food"].map(w => <option key={w} value={w}>{w}</option>)}
            </select>
            <select aria-label="Filter readiness" value={readinessFilter} onChange={e => setReadinessFilter(e.target.value)} className={selectClass}>
              <option value="All">All readiness</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
            <button
              onClick={clearFilters}
              title="Clear filters"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-semibold text-[#1c2d7a] border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Filter className="w-3.5 h-3.5" /> Clear
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto -mx-1 rounded-xl border border-slate-100">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-slate-500 uppercase text-[10.5px] tracking-wider bg-slate-50/80 border-b border-slate-100">
                <th className="py-3 px-4 font-semibold">Project</th>
                <th className="py-3 px-4 font-semibold">Province</th>
                <th className="py-3 px-4 font-semibold">Sector</th>
                <th className="py-3 px-4 font-semibold">Funding gap</th>
                <th className="py-3 px-4 font-semibold">Readiness</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Submitted by</th>
                <th className="py-3 px-4 text-right font-semibold">{isAdmin ? "Decision" : "View"}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td
                    className="py-3 px-4 font-medium text-slate-800 max-w-[220px] truncate cursor-pointer hover:text-[#1c2d7a]"
                    onClick={() => setViewing(p)}
                  >
                    {p.title}
                  </td>
                  <td className="py-3 px-4 text-slate-500">{p.province}</td>
                  <td className="py-3 px-4 text-slate-500">{p.sector}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800 tabular-nums">{formatUSD(p.fundingGapUSD)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-[#17a4c2]" style={{ width: `${p.readiness}%` }} />
                      </div>
                      <span className="text-[11px] text-slate-500 tabular-nums">{p.readiness}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4"><StatusBadge status={p.status} /></td>
                  <td className="py-3 px-4 text-slate-500">{p.submittedBy}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1.5">
                      {isAdmin ? (
                        <>
                          <button
                            onClick={() => decide(p.id, "Approved", "Approved by ministry administrator.")}
                            title="Approve"
                            className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setReturning(p)}
                            title="Return for changes"
                            className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setViewing(p)}
                          title="Open"
                          className="p-2 rounded-lg bg-slate-100 text-[#1c2d7a] hover:bg-[#1c2d7a] hover:text-white transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="text-slate-400 text-[13px]">No projects match the current filters.</div>
                    <button onClick={clearFilters} className="mt-2 text-[12.5px] font-semibold text-[#1c2d7a] hover:underline">
                      Clear filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {returning && (
        <ReturnModal
          onCancel={() => setReturning(null)}
          submitting={submittingReturn}
          onConfirm={(note, attachments) => decide(returning.id, "Returned", note, attachments)}
        />
      )}
    </>
  );
}

/* ───────────────────────── Geography ───────────────────────── */

function GeographyTab() {
  const [provinces, setProvinces] = useState<ApiProvinceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getAdminProvinceSummary()
      .then(data => { if (active) setProvinces(data); })
      .catch(err => toast.error(err instanceof Error ? err.message : "Failed to load province data."))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1c2d7a]" /></div>;
  }

  const maxProjects = Math.max(1, ...provinces.map(p => p.totalProjects));

  return (
    <div className="space-y-5">
      <AnimatedPanel>
        <Panel
          title="Provincial concentration"
          description="High: 600+ projects · Medium: 300–599 · Low: below 300. Portfolio volume signal, not a quality score."
        >
          <div className="grid md:grid-cols-2 gap-4">
            {provinces.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35 }}
                className="border border-slate-100 rounded-xl p-4 bg-white hover:border-slate-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-[14px] text-[#1c2d7a]">{p.name}</div>
                    <div className="text-[12px] text-slate-500 mt-0.5">
                      {formatNumber(p.totalProjects)} projects · {formatUSD(p.fundingGapUsd)} gap
                    </div>
                    {p.focalPointName && (
                      <div className="text-[11px] text-slate-400 mt-0.5">Focal point: {p.focalPointName}</div>
                    )}
                  </div>
                  <SaturationBadge level={(p.saturation as "High" | "Medium" | "Low") ?? "Low"} />
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#17a4c2] to-[#1c2d7a]"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (p.totalProjects / maxProjects) * 100)}%` }}
                    transition={{ delay: 0.15 + i * 0.05, duration: 0.7, ease: "easeOut" }}
                  />
                </div>
                {p.saturation === "Low" && (
                  <p className="text-[11.5px] text-emerald-600 font-medium mt-2.5">Suggested: prioritize new investment outreach</p>
                )}
              </motion.div>
            ))}
            {provinces.length === 0 && (
              <div className="col-span-2 text-center py-8 text-slate-400 text-[13px]">No province data available.</div>
            )}
          </div>
        </Panel>
      </AnimatedPanel>

      <AnimatedPanel delay={0.12}>
        <Panel title="Funding gap by province" description="Indicative capital required to close the gap (USD millions)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={provinces.map(p => ({ name: p.name, gap: Math.round((p.fundingGapUsd / 1_000_000) * 100) / 100 }))} barSize={36} margin={{ top: 12 }}>
              <defs>
                <linearGradient id="gradFundingGap" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e8a020" />
                  <stop offset="100%" stopColor="#e8a020" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: "#64748b" }} interval={0} angle={-16} textAnchor="end" height={68} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }}
                cursor={{ fill: "#f8fafc" }}
                formatter={(v: number) => [`$${v}M`, "Funding gap"]}
              />
              <Bar dataKey="gap" fill="url(#gradFundingGap)" radius={[6, 6, 0, 0]} name="Funding gap ($M)" animationDuration={1100}>
                <LabelList dataKey="gap" position="top" formatter={(v: number) => `$${v}M`} style={{ fontSize: 10.5, fontWeight: 600, fill: "#0f172a" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </AnimatedPanel>
    </div>
  );
}

/* ───────────────────────── WEF Nexus ───────────────────────── */

function renderActiveWefShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
  return (
    <g>
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#1c2d7a" style={{ fontSize: 14, fontWeight: 700 }}>
        {payload.name}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748b" style={{ fontSize: 12, fontWeight: 600 }}>
        {((percent ?? 0) * 100).toFixed(0)}%
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 11} outerRadius={outerRadius + 15} startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.3} />
    </g>
  );
}

function NexusTab() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [wefData, setWefData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [geographyData, setGeographyData] = useState<Array<{ province: string; count: number; funding: number; saturation: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getWefNexusAnalytics(), getGeographyAnalytics()])
      .then(([wef, geography]) => {
        setWefData((Array.isArray(wef) ? wef : []).map((w, i) => ({ ...w, color: ADMIN_BLUE_SCALE[(i + 2) % ADMIN_BLUE_SCALE.length] })));
        setGeographyData(Array.isArray(geography) ? geography : []);
      })
      .catch(err => toast.error(err instanceof Error ? err.message : "Failed to load nexus analytics."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1c2d7a]" /></div>;

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <AnimatedPanel>
        <Panel title="Water · Energy · Food split" description="Share of national pipeline by WEF Nexus dimension">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={wefData}
                dataKey="value"
                nameKey="name"
                innerRadius={64}
                outerRadius={100}
                paddingAngle={3}
                cornerRadius={5}
                activeIndex={activeIndex}
                activeShape={renderActiveWefShape}
                onMouseEnter={(_, i) => setActiveIndex(i)}
                animationDuration={1100}
              >
                {wefData.map(w => (
                  <Cell key={w.name} fill={w.color} stroke="white" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
      </AnimatedPanel>

      <AnimatedPanel delay={0.1}>
        <Panel title="Provincial pipeline intensity" description="Live project concentration and funding gap by province">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={geographyData} layout="vertical" margin={{ left: 22, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="province" width={100} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} />
              <Bar dataKey="count" name="Projects" fill="#17a4c2" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </AnimatedPanel>
    </div>
  );
}

/* ───────────────────────── Users ───────────────────────── */

const ROLE_LABELS: Record<string, string> = {
  admin: "Central Ministry Administrator",
  reviewer: "Reviewer / Analyst",
  focal: "Provincial / Sectoral Focal Point",
  investor: "Investor / Development Partner",
};

type UserFormValues = { name: string; email: string; password: string; role: string; title?: string; provinceId?: string };

function UserForm({ editingUser, onCancel, onSave, saving }: { editingUser?: ApiUser | null; onCancel: () => void; onSave: (u: UserFormValues) => void; saving: boolean }) {
  const isEdit = !!editingUser;
  const [name, setName] = useState(editingUser?.name ?? "");
  const [email, setEmail] = useState(editingUser?.email ?? "");
  const [password, setPassword] = useState("Welcome@123");
  const [title, setTitle] = useState(editingUser?.title ?? "");
  type Role = "focal" | "reviewer" | "investor" | "admin";
  const [role, setRole] = useState<Role>(
    (editingUser?.role.toLowerCase() as Role) ?? "focal"
  );
  const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
  const [provinceId, setProvinceId] = useState(editingUser?.provinceId ?? "");

  useEffect(() => {
    getProvinces()
      .then(list => {
        setProvinces(list);
        if (list.length && !provinceId) setProvinceId(list[0].id);
      })
      .catch(() => toast.error("Failed to load provinces."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inputClass = "w-full text-[13px] border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1c2d7a]/20";

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100"
        onClick={e => e.stopPropagation()}
      >
        <h4 className="font-bold text-[#1c2d7a] text-[15px] mb-4">{isEdit ? "Edit platform user" : "Add platform user"}</h4>
        <div className="space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className={inputClass} />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email" disabled={isEdit} className={`${inputClass} ${isEdit ? "opacity-60 cursor-not-allowed" : ""}`} />
          {!isEdit && (
            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Temporary password" className={inputClass} />
          )}
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (optional)" className={inputClass} />
          <select value={role} onChange={e => setRole(e.target.value as typeof role)} disabled={isEdit} className={`${inputClass} ${isEdit ? "opacity-60 cursor-not-allowed" : ""}`}>
            <option value="focal">Provincial / Sectoral Focal Point</option>
            <option value="reviewer">Reviewer / Analyst</option>
            <option value="investor">Investor / Development Partner</option>
            <option value="admin">Central Ministry Administrator</option>
          </select>
          {role === "focal" && (
            <select value={provinceId} onChange={e => setProvinceId(e.target.value)} className={inputClass}>
              {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>
        <div className="flex justify-end gap-2.5 mt-6">
          <button onClick={onCancel} className="text-[13px] font-semibold px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={() => {
              const trimmedName = name.trim();
              const trimmedEmail = email.trim();
              if (trimmedName.length < 2 || trimmedName.length > 100) return toast.error("Name must be between 2 and 100 characters.");
              if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) return toast.error("Enter a valid email address.");
              if (!isEdit && password.length < 8) return toast.error("Password must be at least 8 characters.");
              if (!isEdit && role === "focal" && !provinceId) return toast.error("Select a province for a Focal user.");
              onSave({
                name: trimmedName,
                email: trimmedEmail,
                password,
                role,
                title: title.trim() || undefined,
                provinceId: role === "focal" ? provinceId : undefined,
              });
            }}
            className="text-[13px] font-semibold px-4 py-2.5 rounded-xl bg-[#1c2d7a] text-white hover:bg-[#17a4c2] transition-colors shadow-sm disabled:opacity-60"
          >
            {saving ? (isEdit ? "Saving…" : "Adding…") : (isEdit ? "Save changes" : "Add user")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const ROLE_TO_API: Record<string, "Admin" | "Reviewer" | "Focal" | "Investor"> = {
  admin: "Admin", reviewer: "Reviewer", focal: "Focal", investor: "Investor",
};

function UsersTab() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [saving, setSaving] = useState(false);

  const loadUsers = () => {
    setLoading(true);
    getAllUsers()
      .then(setUsers)
      .catch(err => toast.error(err instanceof Error ? err.message : "Failed to load users."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const toggleActive = async (u: ApiUser) => {
    if (!u.active) return;
    try {
      await deactivateUser(u.id);
      toast.success(`${u.name} deactivated.`);
      setUsers(prev => prev.map(x => (x.id === u.id ? { ...x, active: false } : x)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate user.");
    }
  };

  const addUser = async (u: UserFormValues) => {
    setSaving(true);
    try {
      await createUser({
        name: u.name,
        email: u.email,
        password: u.password,
        role: ROLE_TO_API[u.role] ?? "Investor",
        title: u.title,
        provinceId: u.provinceId,
      });
      toast.success(`User ${u.email} created.`);
      setShowForm(false);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create user.");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (u: UserFormValues) => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const updated = await updateUser(editingUser.id, {
        name: u.name,
        title: u.title,
      });
      toast.success(`${u.name} updated.`);
      setUsers(prev => prev.map(x => (x.id === editingUser.id ? { ...x, ...updated } : x)));
      setEditingUser(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1c2d7a]" /></div>;
  }

  return (
    <div className="space-y-5">
      <Panel
        title="Platform users"
        description="Live user accounts from the PCPP backend."
        action={
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3.5 py-2 rounded-xl bg-[#1c2d7a] text-white hover:bg-[#17a4c2] transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Add user
          </button>
        }
      >
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-slate-500 uppercase text-[10.5px] tracking-wider bg-slate-50/80 border-b border-slate-100">
                <th className="py-3 px-4 font-semibold">Name</th>
                <th className="py-3 px-4 font-semibold">Role</th>
                <th className="py-3 px-4 font-semibold">Scope of access</th>
                <th className="py-3 px-4 font-semibold">Email</th>
                <th className="py-3 px-4 text-right font-semibold">Status</th>
                <th className="py-3 px-4 text-right font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const roleKey = u.role.toLowerCase();
                return (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800">{u.name}</td>
                    <td className="py-3 px-4 text-slate-500">{ROLE_LABELS[roleKey] ?? u.role}</td>
                    <td className="py-3 px-4 text-slate-500">
                      {roleKey === "focal"
                        ? `${u.provinceName ?? "—"} only`
                        : roleKey === "admin"
                        ? "Full, national"
                        : roleKey === "reviewer"
                        ? "Read / comment — national"
                        : "Approved catalogue only"}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[12px]">{u.email}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => toggleActive(u)}
                        disabled={!u.active}
                        className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                          u.active ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 cursor-default"
                        }`}
                      >
                        {u.active ? "Active" : "Deactivated"}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setEditingUser(u)}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-[#1c2d7a] hover:bg-slate-100 transition-colors"
                        title="Edit user"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-[13px]">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {showForm && <UserForm onCancel={() => setShowForm(false)} onSave={addUser} saving={saving} />}
      {editingUser && <UserForm editingUser={editingUser} onCancel={() => setEditingUser(null)} onSave={saveEdit} saving={saving} />}
    </div>
  );
}

/* ───────────────────────── Reports ───────────────────────── */

function ReportsTab() {
  const [overview, setOverview] = useState<ApiAdminOverview | null>(null);
  const [provinces, setProvinces] = useState<ApiProvinceSummary[]>([]);
  const [wefSplit, setWefSplit] = useState<Array<{ name: string; value: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([getAdminOverview(), getAdminProvinceSummary(), getWefNexusAnalytics()])
      .then(([overviewData, provinceData, wefData]) => {
        if (!active) return;
        setOverview(overviewData);
        setProvinces(provinceData);
        setWefSplit(wefData);
      })
      .catch(err => {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Failed to load reports data.";
        setError(message);
        toast.error(message);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const reports = [
    { name: "National pipeline summary", meta: "CSV · Live export", type: "all-projects", icon: FileBarChart2 },
    { name: "Provincial funding gap report", meta: "CSV · Live export", type: "province-summary", icon: FileBarChart2 },
    { name: "WEF Nexus impact brief", meta: "CSV · Live export", type: "wef-nexus", icon: FileBarChart2 },
  ];

  const download = async (type: string, name: string) => {
    try {
      const blob = await downloadReportFile(type, "csv");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download report.");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1c2d7a]" /></div>;
  }
  if (error || !overview) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-semibold text-red-900 mb-1">Unable to load reports</h3>
          <p className="text-[13px] text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  const approvalRate = overview.totalProjects > 0 ? Math.round((overview.approvedProjects / overview.totalProjects) * 100) : 0;
  const avgProjectCost = overview.totalProjects > 0 ? overview.totalCostUsd / overview.totalProjects : 0;
  const kpis = [
    { icon: Building2, label: "Total projects", value: formatNumber(overview.totalProjects), sub: "Nationwide pipeline", accent: "#1c2d7a" },
    { icon: Check, label: "Approval rate", value: `${approvalRate}%`, sub: `${formatNumber(overview.approvedProjects)} approved`, accent: "#24409c" },
    { icon: HandCoins, label: "Total investment", value: formatUSD(overview.totalCostUsd), sub: `Avg ${formatUSD(avgProjectCost)} / project`, accent: "#2f56c4" },
    { icon: TrendingUp, label: "Funding gap", value: formatUSD(overview.fundingGapUsd), sub: "Unfunded requirement", accent: "#17a4c2" },
    { icon: Users2, label: "Beneficiaries", value: formatNumber(overview.totalBeneficiaries), sub: "People impacted", accent: "#3f74d4" },
    { icon: ShieldCheck, label: "Jobs supported", value: formatNumber(overview.totalJobs), sub: "Direct employment", accent: "#4fc3dd" },
  ];

  const statusData = (Array.isArray(overview.projectsByStatus) ? overview.projectsByStatus : []).map((s, i) => ({
    name: s.status, value: s.count, percentage: s.percentage, fill: ADMIN_BLUE_SCALE[i % ADMIN_BLUE_SCALE.length],
  }));
  const funnelData = [
    { name: "Draft", value: overview.draftProjects },
    { name: "Submitted", value: overview.submittedProjects },
    { name: "Under review", value: overview.underReviewProjects },
    { name: "Returned", value: overview.returnedProjects },
    { name: "Approved", value: overview.approvedProjects },
  ];
  const provinceProjects = provinces.map(p => ({ name: p.name, Projects: p.totalProjects, Approved: p.approvedProjects }));
  const provinceFunding = provinces.map(p => ({ name: p.name, gap: Math.round(p.fundingGapUsd / 100_000) / 10 }));
  const sectorData = (Array.isArray(overview.projectsBySector) ? overview.projectsBySector : []).map((s, i) => ({ name: s.sectorName, count: s.count, fill: ADMIN_BLUE_SCALE[i % ADMIN_BLUE_SCALE.length] }));
  const wefData = (Array.isArray(wefSplit) ? wefSplit : []).map((w, i) => ({ name: w.name, value: w.value, fill: ADMIN_BLUE_SCALE[(i + 3) % ADMIN_BLUE_SCALE.length] }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map(k => <KpiCard key={k.label} icon={k.icon} label={k.label} value={k.value} sub={k.sub} accent={k.accent} />)}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Panel title="Pipeline trend" description="Submissions vs approvals · last 12 months" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={overview.pipelineTrend || []} margin={{ left: -14, right: 10, top: 10 }}>
              <defs>
                <linearGradient id="reportSubmitted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#17a4c2" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#17a4c2" stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id="reportApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1c2d7a" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#1c2d7a" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              <Area type="monotone" dataKey="submitted" name="Submitted" stroke="#17a4c2" strokeWidth={2.5} fill="url(#reportSubmitted)" />
              <Area type="monotone" dataKey="approved" name="Approved" stroke="#1c2d7a" strokeWidth={2.5} fill="url(#reportApproved)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Status distribution" description="Share of pipeline by review status">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={56} outerRadius={88} paddingAngle={2} cornerRadius={4}>
                {statusData.map(s => <Cell key={s.name} fill={s.fill} stroke="white" strokeWidth={2} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} formatter={(value, name, item) => [`${formatNumber(Number(value))} (${item.payload.percentage}%)`, name]} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Review funnel" description="Volume at each stage of the ministry review process">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={funnelData} barSize={38} margin={{ top: 14 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: "#475569" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} cursor={{ fill: "#f8fafc" }} />
              <Bar dataKey="value" name="Projects" radius={[6, 6, 0, 0]}>
                {funnelData.map((f, i) => <Cell key={f.name} fill={ADMIN_BLUE_SCALE[i % ADMIN_BLUE_SCALE.length]} />)}
                <LabelList dataKey="value" position="top" style={{ fontSize: 11, fontWeight: 600, fill: "#1c2d7a" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="WEF Nexus split" description="Water · Energy · Food share of the pipeline">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={wefData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={3} cornerRadius={5}>
                {wefData.map(w => <Cell key={w.name} fill={w.fill} stroke="white" strokeWidth={2} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Projects by province" description="Total vs approved projects per province">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={provinceProjects} layout="vertical" margin={{ left: 8, right: 20 }} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10.5, fill: "#475569" }} width={118} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} cursor={{ fill: "#f8fafc" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
              <Bar dataKey="Projects" fill="#1c2d7a" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Approved" fill="#17a4c2" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Funding gap by province" description="Unfunded requirement, USD millions">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={provinceFunding} layout="vertical" margin={{ left: 8, right: 34 }} barSize={14}>
              <defs>
                <linearGradient id="reportGap" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#17a4c2" />
                  <stop offset="100%" stopColor="#1c2d7a" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10.5, fill: "#475569" }} width={118} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} formatter={value => [`$${formatNumber(Number(value))}M`, "Funding gap"]} cursor={{ fill: "#f8fafc" }} />
              <Bar dataKey="gap" name="Funding gap ($M)" fill="url(#reportGap)" radius={[0, 6, 6, 0]}>
                <LabelList dataKey="gap" position="right" style={{ fontSize: 10.5, fontWeight: 600, fill: "#1c2d7a" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel title="Sector distribution" description="Projects across investment sectors">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={sectorData} barSize={36} margin={{ top: 14 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: "#64748b" }} interval={0} angle={-16} textAnchor="end" height={56} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} cursor={{ fill: "#f8fafc" }} />
            <Bar dataKey="count" name="Projects" radius={[6, 6, 0, 0]}>
              {sectorData.map(s => <Cell key={s.name} fill={s.fill} />)}
              <LabelList dataKey="count" position="top" style={{ fontSize: 11, fontWeight: 600, fill: "#1c2d7a" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Provincial oversight" description="Focal point coverage, approvals and saturation by province">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-slate-500 uppercase text-[10.5px] tracking-wide border-b border-slate-200">
                <th className="py-2 px-3">Province</th>
                <th className="py-2 px-3">Focal point</th>
                <th className="py-2 px-3 text-right">Projects</th>
                <th className="py-2 px-3 text-right">Approved</th>
                <th className="py-2 px-3 text-right">Funding gap</th>
                <th className="py-2 px-3">Saturation</th>
              </tr>
            </thead>
            <tbody>
              {provinces.map(p => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2.5 px-3 font-semibold text-[#0f172a]">{p.name}</td>
                  <td className="py-2.5 px-3 text-slate-600">{p.focalPointName}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatNumber(p.totalProjects)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatNumber(p.approvedProjects)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatUSD(p.fundingGapUsd)}</td>
                  <td className="py-2.5 px-3"><SaturationBadge level={(p.saturation as "High" | "Medium" | "Low") || "Low"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Exportable reports" description="Download live data for ministry leadership and international partners">
        <div className="grid md:grid-cols-3 gap-4">
          {reports.map(r => (
            <div
              key={r.name}
              className="border border-slate-100 rounded-xl p-5 flex flex-col gap-3 bg-white hover:border-slate-200 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-[#eef0f9] flex items-center justify-center">
                <r.icon className="w-4.5 h-4.5 text-[#1c2d7a]" />
              </div>
              <div>
                <div className="font-semibold text-[13.5px] text-slate-800">{r.name}</div>
                <div className="text-[12px] text-slate-500 mt-0.5">{r.meta}</div>
              </div>
              <button onClick={() => download(r.type, r.name)} className="mt-auto inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#17a4c2] hover:text-[#1c2d7a] transition-colors">
                <Download className="w-3.5 h-3.5" /> Download CSV
              </button>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ───────────────────────── Shell ───────────────────────── */

export default function AdminDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [active, setActive] = useState("overview");
  const navItems = useAdminNav(isAdmin);

  return (
    <DashboardShell
      navItems={navItems}
      active={active}
      onNavigate={setActive}
      title={isAdmin ? "Ministry Executive Dashboard" : "Reviewer / Analyst Workspace"}
      subtitle="Pakistan Climate Project Pipeline · National oversight"
    >
      {!isAdmin && (
        <div className="mb-5 flex items-center gap-2.5 bg-[#eef0f9] text-[#1c2d7a] text-[12.5px] font-semibold px-4 py-3 rounded-xl border border-[#1c2d7a]/8">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          Read / comment access — approval authority is reserved for the Central Ministry Administrator.
        </div>
      )}
      {active === "overview" && <OverviewTab />}
      {active === "review" && <ReviewQueueTab isAdmin={isAdmin} />}
      {active === "geography" && <GeographyTab />}
      {active === "nexus" && <NexusTab />}
      {active === "users" && isAdmin && <UsersTab />}
      {active === "reports" && <ReportsTab />}
    </DashboardShell>
  );
}