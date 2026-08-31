import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import {
  LayoutDashboard, ClipboardList, Map as MapIcon, Waves, Users2, FileBarChart2,
  Building2, HandCoins, TrendingUp, Check, RotateCcw, Search, MessageSquare, Plus,
  ShieldCheck, Filter, Download,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, AreaChart, Area, Legend, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, LabelList, RadialBarChart, RadialBar, Sector,
} from "recharts";
import { DashboardShell, type NavItem } from "./DashboardShell";
import { KpiCard, Panel, StatusBadge, SaturationBadge, AttachmentPicker, AttachmentList, filesToAttachments } from "./dashboardWidgets";
import { ProjectDetailModal } from "./ProjectDetail";
import { useAuth } from "../lib/auth";
import {
  PROVINCES, SECTOR_DATA, WEF_NEXUS_SPLIT, PIPELINE_TREND, STATUS_DISTRIBUTION,
  IMPACT_METRICS, formatUSD, formatNumber, type ProjectStatus,
} from "../lib/mockData";
import {
  getProjects, updateProject, getUsers, saveUsers,
  type StoreProject, type AppUser, type ProjectAttachment,
} from "../lib/store";

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

/* ───────────────────────── Overview ───────────────────────── */

function OverviewTab() {
  const totalStatus = STATUS_DISTRIBUTION.reduce((s, d) => s + d.value, 0);
  const radialData = STATUS_DISTRIBUTION.map(s => ({ ...s, fullValue: totalStatus }));

  const kpis = [
    { icon: Building2, label: "Total Pipeline", value: formatNumber(IMPACT_METRICS.totalProjects), sub: "Projects nationwide", accent: "#1c2d7a" },
    { icon: Check, label: "Approved", value: formatNumber(IMPACT_METRICS.approvedProjects), sub: "88.2% of pipeline", accent: "#2f9e6d" },
    { icon: HandCoins, label: "Funding Gap", value: formatUSD(IMPACT_METRICS.fundingGapUSD), sub: "Across all provinces", accent: "#e8a020" },
    { icon: TrendingUp, label: "Beneficiaries", value: formatNumber(IMPACT_METRICS.beneficiaries), sub: `${formatNumber(IMPACT_METRICS.jobs)} jobs supported`, accent: "#17a4c2" },
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
              <AreaChart data={PIPELINE_TREND} margin={{ left: -8, right: 12, top: 12 }}>
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
              {STATUS_DISTRIBUTION.map(status => (
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
              <BarChart data={PROVINCES} layout="vertical" margin={{ left: 8, right: 28 }} barSize={14}>
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
              <BarChart data={SECTOR_DATA} barSize={32} margin={{ top: 8 }}>
                <defs>
                  {SECTOR_DATA.map(s => (
                    <linearGradient key={s.name} id={`gradSector-${s.name}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.color} stopOpacity={1} />
                      <stop offset="100%" stopColor={s.color} stopOpacity={0.5} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: "#64748b" }} interval={0} angle={-18} textAnchor="end" height={58} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="count" name="Projects" radius={[6, 6, 0, 0]} animationDuration={1100}>
                  {SECTOR_DATA.map(s => <Cell key={s.name} fill={`url(#gradSector-${s.name})`} />)}
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

function ReturnModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: (note: string, attachments: ProjectAttachment[]) => void }) {
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
            className="text-[13px] font-semibold px-4 py-2.5 rounded-xl bg-[#c0455f] text-white hover:bg-[#a63a4f] transition-colors shadow-sm"
          >
            Return project
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ReviewQueueTab({ isAdmin }: { isAdmin: boolean }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<StoreProject[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Pending" | "All">("Pending");
  const [provinceFilter, setProvinceFilter] = useState("All");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [wefFilter, setWefFilter] = useState("All");
  const [readinessFilter, setReadinessFilter] = useState("All");
  const [viewing, setViewing] = useState<StoreProject | null>(null);
  const [returning, setReturning] = useState<StoreProject | null>(null);
  const [comment, setComment] = useState("");
  const [commentFiles, setCommentFiles] = useState<ProjectAttachment[]>([]);

  useEffect(() => { setProjects(getProjects()); }, []);

  const pending: ProjectStatus[] = ["Submitted", "Under Review", "Draft"];
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
    if (!project) return;
    const today = new Date().toISOString().slice(0, 10);
    const updated = updateProject(id, p => ({
      ...p,
      status,
      updated: today,
      statusHistory: [...p.statusHistory, { status, note, date: today, by: user?.name ?? "Ministry", attachments }],
    }));
    setProjects(updated);
    toast.success(`Project ${status.toLowerCase()} successfully.`);
    setViewing(null);
    setReturning(null);
    setComment("");
    setCommentFiles([]);
  };

  const addComment = async (id: number) => {
    if (!comment.trim() && commentFiles.length === 0) return;
    const project = projects.find(p => p.id === id);
    if (!project) return;
    const today = new Date().toISOString().slice(0, 10);
    setProjects(updateProject(id, p => ({
      ...p,
      statusHistory: [...p.statusHistory, {
        status: p.status,
        note: comment || "Reviewer attached supporting file(s).",
        date: today,
        by: user?.name ?? "Reviewer",
        attachments: commentFiles,
      }],
    })));
    setComment("");
    setCommentFiles([]);
    setViewing(null);
    toast.success("Comment added.");
  };

  const addCommentFiles = (files: FileList) => {
    filesToAttachments(files, user?.name ?? "Reviewer").then(newFiles => setCommentFiles(a => [...a, ...newFiles]));
  };

  const selectClass = "px-2.5 py-1.5 text-[12px] border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1c2d7a]/15";

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

      {viewing && (
        <ProjectDetailModal
          project={viewing}
          onClose={() => setViewing(null)}
          actions={
            isAdmin ? (
              <>
                <button
                  onClick={() => decide(viewing.id, "Approved", "Approved by ministry administrator.")}
                  className="flex-1 bg-emerald-600 text-white font-bold text-sm py-2.5 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  Approve project
                </button>
                <button
                  onClick={() => setReturning(viewing)}
                  className="flex-1 bg-rose-600 text-white font-bold text-sm py-2.5 rounded-xl hover:bg-rose-700 transition-colors shadow-sm"
                >
                  Return for changes
                </button>
              </>
            ) : (
              <div className="w-full space-y-2.5">
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={2}
                  placeholder="Add a comment for the ministry administrator…"
                  className="w-full text-[13px] border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1c2d7a]/20 resize-none"
                />
                <AttachmentList attachments={commentFiles} onRemove={id => setCommentFiles(a => a.filter(f => f.id !== id))} dense />
                <div className="flex items-center justify-between gap-2">
                  <AttachmentPicker label="Attach file" onAdd={addCommentFiles} />
                  <button
                    onClick={() => addComment(viewing.id)}
                    className="flex-1 bg-[#1c2d7a] text-white font-bold text-sm py-2.5 rounded-xl hover:bg-[#17a4c2] transition-colors shadow-sm"
                  >
                    Add comment
                  </button>
                </div>
              </div>
            )
          }
        />
      )}

      {returning && (
        <ReturnModal
          onCancel={() => setReturning(null)}
          onConfirm={(note, attachments) => decide(returning.id, "Returned", note, attachments)}
        />
      )}
    </>
  );
}

/* ───────────────────────── Geography ───────────────────────── */

function GeographyTab() {
  return (
    <div className="space-y-5">
      <AnimatedPanel>
        <Panel
          title="Provincial concentration"
          description="High: 600+ projects · Medium: 300–599 · Low: below 300. Portfolio volume signal, not a quality score."
        >
          <div className="grid md:grid-cols-2 gap-4">
            {PROVINCES.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35 }}
                className="border border-slate-100 rounded-xl p-4 bg-white hover:border-slate-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-[14px] text-[#1c2d7a]">{p.name}</div>
                    <div className="text-[12px] text-slate-500 mt-0.5">
                      {formatNumber(p.projects)} projects · {formatUSD(p.fundingGapM * 1_000_000)} gap
                    </div>
                  </div>
                  <SaturationBadge level={p.saturation} />
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#17a4c2] to-[#1c2d7a]"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (p.projects / 900) * 100)}%` }}
                    transition={{ delay: 0.15 + i * 0.05, duration: 0.7, ease: "easeOut" }}
                  />
                </div>
                {p.saturation === "Low" && (
                  <p className="text-[11.5px] text-emerald-600 font-medium mt-2.5">Suggested: prioritize new investment outreach</p>
                )}
              </motion.div>
            ))}
          </div>
        </Panel>
      </AnimatedPanel>

      <AnimatedPanel delay={0.12}>
        <Panel title="Funding gap by province" description="Indicative capital required to close the gap (USD millions)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={PROVINCES.map(p => ({ name: p.name, gap: p.fundingGapM }))} barSize={36} margin={{ top: 12 }}>
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
  const radarData = [
    { dimension: "Punjab", Water: 82, Energy: 64, Food: 74 },
    { dimension: "Sindh", Water: 76, Energy: 58, Food: 66 },
    { dimension: "KP", Water: 68, Energy: 44, Food: 52 },
    { dimension: "Balochistan", Water: 54, Energy: 40, Food: 48 },
    { dimension: "AJK", Water: 46, Energy: 36, Food: 34 },
    { dimension: "GB", Water: 58, Energy: 30, Food: 28 },
  ];

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <AnimatedPanel>
        <Panel title="Water · Energy · Food split" description="Share of national pipeline by WEF Nexus dimension">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={WEF_NEXUS_SPLIT}
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
                {WEF_NEXUS_SPLIT.map(w => (
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
        <Panel title="Provincial WEF intensity" description="Relative strength of each nexus dimension by province">
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <defs>
                <linearGradient id="gradWater" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1c2d7a" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#1c2d7a" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="gradEnergy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#17a4c2" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#17a4c2" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="gradFood" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e8a020" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#e8a020" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: "#475569" }} />
              <PolarRadiusAxis tick={{ fontSize: 9, fill: "#94a3b8" }} />
              <Radar name="Water" dataKey="Water" stroke="#1c2d7a" strokeWidth={2} fill="url(#gradWater)" dot={{ r: 3 }} animationDuration={1200} />
              <Radar name="Energy" dataKey="Energy" stroke="#17a4c2" strokeWidth={2} fill="url(#gradEnergy)" dot={{ r: 3 }} animationDuration={1200} animationBegin={120} />
              <Radar name="Food" dataKey="Food" stroke="#e8a020" strokeWidth={2} fill="url(#gradFood)" dot={{ r: 3 }} animationDuration={1200} animationBegin={240} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} />
            </RadarChart>
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

function UserForm({ onCancel, onSave }: { onCancel: () => void; onSave: (u: Omit<AppUser, "id" | "active">) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Welcome@123");
  const [role, setRole] = useState<AppUser["role"]>("focal");
  const [province, setProvince] = useState(PROVINCES[0].name);

  const inputClass = "w-full text-[13px] border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1c2d7a]/20";

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100"
        onClick={e => e.stopPropagation()}
      >
        <h4 className="font-bold text-[#1c2d7a] text-[15px] mb-4">Add platform user</h4>
        <div className="space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className={inputClass} />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email" className={inputClass} />
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Temporary password" className={inputClass} />
          <select value={role} onChange={e => setRole(e.target.value as AppUser["role"])} className={inputClass}>
            <option value="focal">Provincial / Sectoral Focal Point</option>
            <option value="reviewer">Reviewer / Analyst</option>
            <option value="investor">Investor / Development Partner</option>
            <option value="admin">Central Ministry Administrator</option>
          </select>
          {role === "focal" && (
            <select value={province} onChange={e => setProvince(e.target.value)} className={inputClass}>
              {PROVINCES.map(p => <option key={p.name}>{p.name}</option>)}
            </select>
          )}
        </div>
        <div className="flex justify-end gap-2.5 mt-6">
          <button onClick={onCancel} className="text-[13px] font-semibold px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={() =>
              name && email &&
              onSave({
                name,
                email,
                password,
                role,
                title: role === "focal" ? `Provincial Focal Point — ${province}` : ROLE_LABELS[role],
                province: role === "focal" ? province : undefined,
              })
            }
            className="text-[13px] font-semibold px-4 py-2.5 rounded-xl bg-[#1c2d7a] text-white hover:bg-[#17a4c2] transition-colors shadow-sm"
          >
            Add user
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { setUsers(getUsers()); }, []);

  const toggleActive = (id: number) => {
    const updated = users.map(u => (u.id === id ? { ...u, active: !u.active } : u));
    setUsers(updated);
    saveUsers(updated);
  };

  const addUser = (u: Omit<AppUser, "id" | "active">) => {
    const updated = [...users, { ...u, id: Date.now(), active: true }];
    setUsers(updated);
    saveUsers(updated);
    setShowForm(false);
    toast.success("User added (demo data — no account-creation endpoint yet).");
  };

  return (
    <div className="space-y-5">
      <Panel
        title="Platform users"
        description="Browser-only seeded accounts. This table does not create or update database users."
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
                <th className="py-3 px-4 font-semibold">Email / password</th>
                <th className="py-3 px-4 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-800">{u.name}</td>
                  <td className="py-3 px-4 text-slate-500">{ROLE_LABELS[u.role]}</td>
                  <td className="py-3 px-4 text-slate-500">
                    {u.role === "focal"
                      ? `${u.province} only`
                      : u.role === "admin"
                      ? "Full, national"
                      : u.role === "reviewer"
                      ? "Read / comment — national"
                      : "Approved catalogue only"}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono text-[12px]">{u.email} · {u.password}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => toggleActive(u.id)}
                      className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                        u.active ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {u.active ? "Active" : "Deactivated"}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-[13px]">No users in local cache.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {showForm && <UserForm onCancel={() => setShowForm(false)} onSave={addUser} />}
    </div>
  );
}

/* ───────────────────────── Reports ───────────────────────── */

function ReportsTab() {
  const reports = [
    { name: "National pipeline summary", meta: "PDF · Updated Aug 2026", icon: FileBarChart2 },
    { name: "Provincial funding gap report", meta: "XLSX · Updated Aug 2026", icon: FileBarChart2 },
    { name: "WEF Nexus impact brief", meta: "PDF · Updated Jul 2026", icon: FileBarChart2 },
  ];

  return (
    <Panel title="Reports" description="Exportable summaries for ministry leadership and international partners">
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
            <button className="mt-auto inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#17a4c2] hover:text-[#1c2d7a] transition-colors">
              <Download className="w-3.5 h-3.5" /> Download (demo)
            </button>
          </div>
        ))}
      </div>
    </Panel>
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