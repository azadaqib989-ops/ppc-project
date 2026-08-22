import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  LayoutDashboard, ClipboardList, Map as MapIcon, Waves, Users2, FileBarChart2,
  Building2, HandCoins, TrendingUp, Check, RotateCcw, Search, MessageSquare, Plus, ShieldCheck,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, AreaChart, Area, Legend, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, LabelList, RadialBarChart, RadialBar, Sector,
} from "recharts";
import { DashboardShell, type NavItem } from "./DashboardShell";
import { KpiCard, Panel, StatusBadge, SaturationBadge } from "./dashboardWidgets";
import { ProjectDetailModal } from "./ProjectDetail";
import { useAuth } from "../lib/auth";
import {
  PROVINCES, SECTOR_DATA, WEF_NEXUS_SPLIT, PIPELINE_TREND, STATUS_DISTRIBUTION,
  IMPACT_METRICS, formatUSD, formatNumber, type ProjectStatus,
} from "../lib/mockData";
import {
  getProjects, updateProject, getUsers, saveUsers, pushNotification,
  type StoreProject, type AppUser,
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
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function OverviewTab() {
  const totalStatus = STATUS_DISTRIBUTION.reduce((s, d) => s + d.value, 0);
  const approvedPct = Math.round((STATUS_DISTRIBUTION.find(s => s.name === "Approved")?.value ?? 0) / totalStatus * 100);
  const radialData = STATUS_DISTRIBUTION.map(s => ({ ...s, fullValue: totalStatus }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Building2, label: "Total Pipeline", value: formatNumber(IMPACT_METRICS.totalProjects), sub: "Projects nationwide", accent: "#1c2d7a" },
          { icon: Check, label: "Approved", value: formatNumber(IMPACT_METRICS.approvedProjects), sub: "88.2% of pipeline", accent: "#2f9e6d" },
          { icon: HandCoins, label: "Funding Gap", value: formatUSD(IMPACT_METRICS.fundingGapUSD), sub: "Across all provinces", accent: "#e8a020" },
          { icon: TrendingUp, label: "Beneficiaries", value: formatNumber(IMPACT_METRICS.beneficiaries), sub: `${formatNumber(IMPACT_METRICS.jobs)} jobs supported`, accent: "#17a4c2" },
        ].map((k, i) => (
          <AnimatedPanel key={k.label} delay={i * 0.08}>
            <KpiCard icon={k.icon} label={k.label} value={k.value} sub={k.sub} accent={k.accent} />
          </AnimatedPanel>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <AnimatedPanel delay={0.1} className="lg:col-span-2">
          <Panel title="Pipeline growth" description="Submitted vs. approved projects, last 12 months">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={PIPELINE_TREND} margin={{ left: -10, right: 10, top: 10 }}>
                <defs>
                  <linearGradient id="gradSubmitted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#17a4c2" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#17a4c2" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1c2d7a" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#1c2d7a" stopOpacity={0.03} />
                  </linearGradient>
                  <filter id="glowLine" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#1c2d7a" floodOpacity="0.18" />
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #eef0f9" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                <Area type="monotone" dataKey="submitted" name="Submitted" stroke="#17a4c2" strokeWidth={3} fill="url(#gradSubmitted)" filter="url(#glowLine)" activeDot={{ r: 6 }} animationDuration={1400} animationEasing="ease-out" />
                <Area type="monotone" dataKey="approved" name="Approved" stroke="#1c2d7a" strokeWidth={3} fill="url(#gradApproved)" filter="url(#glowLine)" activeDot={{ r: 6 }} animationDuration={1400} animationBegin={150} animationEasing="ease-out" />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>
        </AnimatedPanel>

        <AnimatedPanel delay={0.18}>
          <Panel title="Review status" description="Where every project currently stands">
            <div className="relative">
              <ResponsiveContainer width="100%" height={280}>
                <RadialBarChart data={radialData} innerRadius="28%" outerRadius="100%" startAngle={90} endAngle={-270} barGap={4}>
                  <RadialBar background={{ fill: "#f4f7fb" }} dataKey="value" cornerRadius={10} animationDuration={1400} animationEasing="ease-out">
                    {radialData.map(s => <Cell key={s.name} fill={s.color} />)}
                  </RadialBar>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #eef0f9" }} />
                  <Legend wrapperStyle={{ fontSize: 10.5 }} layout="vertical" verticalAlign="middle" align="right" iconType="circle" />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ right: "38%" }}>
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
                  className="text-xl font-bold text-[#1c2d7a]"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {approvedPct}%
                </motion.div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Approved</div>
              </div>
            </div>
          </Panel>
        </AnimatedPanel>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <AnimatedPanel delay={0.24}>
          <Panel title="Pipeline by province" description="Project count per province / region">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={PROVINCES} layout="vertical" margin={{ left: 24, right: 24 }} barSize={16}>
                <defs>
                  <linearGradient id="gradProvince" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#17a4c2" />
                    <stop offset="100%" stopColor="#1c2d7a" />
                  </linearGradient>
                  <filter id="barShadow" x="-20%" y="-40%" width="140%" height="180%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1c2d7a" floodOpacity="0.16" />
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10.5 }} width={140} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #eef0f9" }} cursor={{ fill: "#f4f7fb" }} />
                <Bar dataKey="projects" fill="url(#gradProvince)" filter="url(#barShadow)" radius={[0, 8, 8, 0]} name="Projects" animationDuration={1200} animationEasing="ease-out">
                  <LabelList dataKey="projects" position="right" style={{ fontSize: 11, fontWeight: 700, fill: "#1c2d7a" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </AnimatedPanel>

        <AnimatedPanel delay={0.3}>
          <Panel title="Pipeline by sector" description="Distribution across investment sectors">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={SECTOR_DATA} barSize={34}>
                <defs>
                  {SECTOR_DATA.map(s => (
                    <linearGradient key={s.name} id={`gradSector-${s.name}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.color} stopOpacity={1} />
                      <stop offset="100%" stopColor={s.color} stopOpacity={0.55} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9.5 }} interval={0} angle={-18} textAnchor="end" height={60} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #eef0f9" }} cursor={{ fill: "#f4f7fb" }} />
                <Bar dataKey="count" name="Projects" radius={[8, 8, 0, 0]} animationDuration={1200} animationEasing="ease-out">
                  {SECTOR_DATA.map(s => <Cell key={s.name} fill={`url(#gradSector-${s.name})`} />)}
                  <LabelList dataKey="count" position="top" style={{ fontSize: 11, fontWeight: 700, fill: "#0f172a" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </AnimatedPanel>
      </div>
    </div>
  );
}

function ReturnModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: (note: string) => void }) {
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
        <h4 className="font-bold text-[#1c2d7a] mb-2">Return project for changes</h4>
        <p className="text-[12px] text-muted-foreground mb-3">Explain what the provincial focal point needs to revise. This note is added to the project's status history.</p>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={4} placeholder="e.g. Please provide an updated cost breakdown and confirm beneficiary estimates."
          className="w-full text-[12.5px] border border-border rounded-lg p-3 bg-[#f4f7fb] focus:outline-none focus:ring-2 focus:ring-[#1c2d7a]/15 mb-4" />
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="text-[12.5px] font-semibold px-4 py-2 rounded border border-border hover:bg-slate-50">Cancel</button>
          <button onClick={() => onConfirm(note || "Returned for revision.")} className="text-[12.5px] font-semibold px-4 py-2 rounded bg-[#c0455f] text-white hover:bg-[#a63a4f]">Return project</button>
        </div>
      </div>
    </div>
  );
}

function ReviewQueueTab({ isAdmin }: { isAdmin: boolean }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<StoreProject[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Pending" | "All">("Pending");
  const [viewing, setViewing] = useState<StoreProject | null>(null);
  const [returning, setReturning] = useState<StoreProject | null>(null);
  const [comment, setComment] = useState("");

  useEffect(() => { setProjects(getProjects()); }, []);

  const pending: ProjectStatus[] = ["Submitted", "Under Review", "Draft"];
  const filtered = useMemo(() => projects.filter(p =>
    (statusFilter === "All" || pending.includes(p.status)) &&
    (p.title.toLowerCase().includes(query.toLowerCase()) || p.province.toLowerCase().includes(query.toLowerCase()))
  ), [projects, query, statusFilter]);

  const decide = (id: number, status: ProjectStatus, note: string) => {
    const by = user?.name ?? "Ministry";
    const updated = updateProject(id, p => ({
      ...p,
      status,
      updated: new Date().toISOString().slice(0, 10),
      statusHistory: [...p.statusHistory, { status, note, date: new Date().toISOString().slice(0, 10), by }],
    }));
    setProjects(updated);
    const project = updated.find(p => p.id === id);
    if (project) {
      pushNotification({
        audience: "focal",
        province: project.province,
        text: status === "Approved"
          ? `Your project "${project.title}" was approved and published to the investor catalogue.`
          : `Your project "${project.title}" was returned for changes: ${note}`,
        date: "Just now",
      });
    }
    setViewing(null);
    setReturning(null);
    setComment("");
  };

  const addComment = (id: number) => {
    if (!comment.trim()) return;
    const by = user?.name ?? "Reviewer";
    const updated = updateProject(id, p => ({
      ...p,
      statusHistory: [...p.statusHistory, { status: p.status, note: `Reviewer comment: ${comment}`, date: new Date().toISOString().slice(0, 10), by }],
    }));
    setProjects(updated);
    setComment("");
    setViewing(updated.find(p => p.id === id) ?? null);
  };

  return (
    <>
      <Panel
        title={isAdmin ? "Project review queue" : "Review & comment"}
        description={isAdmin ? "Submissions awaiting a ministry decision" : "Examine submissions and leave comments for the ministry — read only"}
        action={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden text-[11.5px] font-semibold">
              <button onClick={() => setStatusFilter("Pending")} className={`px-3 py-1.5 ${statusFilter === "Pending" ? "bg-[#1c2d7a] text-white" : "bg-white text-muted-foreground"}`}>Pending</button>
              <button onClick={() => setStatusFilter("All")} className={`px-3 py-1.5 ${statusFilter === "All" ? "bg-[#1c2d7a] text-white" : "bg-white text-muted-foreground"}`}>All</button>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search project or province…"
                className="pl-8 pr-3 py-1.5 text-[12.5px] border border-border rounded-lg bg-[#f4f7fb] focus:outline-none focus:ring-2 focus:ring-[#1c2d7a]/15 w-56" />
            </div>
          </div>
        }
      >
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-muted-foreground uppercase text-[10.5px] tracking-wide border-b border-border">
                <th className="py-2 px-3">Project</th>
                <th className="py-2 px-3">Province</th>
                <th className="py-2 px-3">Sector</th>
                <th className="py-2 px-3">Funding gap</th>
                <th className="py-2 px-3">Readiness</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Submitted by</th>
                <th className="py-2 px-3 text-right">{isAdmin ? "Decision" : "View"}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-border hover:bg-[#f9fafc]">
                  <td className="py-2.5 px-3 font-medium text-[#0f172a] max-w-[220px] truncate cursor-pointer" onClick={() => setViewing(p)}>{p.title}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{p.province}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{p.sector}</td>
                  <td className="py-2.5 px-3 font-semibold text-[#0f172a]">{formatUSD(p.fundingGapUSD)}</td>
                  <td className="py-2.5 px-3">
                    <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-[#17a4c2]" style={{ width: `${p.readiness}%` }} />
                    </div>
                  </td>
                  <td className="py-2.5 px-3"><StatusBadge status={p.status} /></td>
                  <td className="py-2.5 px-3 text-muted-foreground">{p.submittedBy}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {isAdmin ? (
                        <>
                          <button onClick={() => decide(p.id, "Approved", "Approved by ministry administrator.")} title="Approve" className="p-1.5 rounded bg-[#e7f5ee] text-[#2f9e6d] hover:bg-[#2f9e6d] hover:text-white transition-colors"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setReturning(p)} title="Return for changes" className="p-1.5 rounded bg-[#fbe9ec] text-[#c0455f] hover:bg-[#c0455f] hover:text-white transition-colors"><RotateCcw className="w-3.5 h-3.5" /></button>
                        </>
                      ) : (
                        <button onClick={() => setViewing(p)} title="Open" className="p-1.5 rounded bg-[#eef0f9] text-[#1c2d7a] hover:bg-[#1c2d7a] hover:text-white transition-colors"><MessageSquare className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">No projects match this view.</td></tr>
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
                <button onClick={() => decide(viewing.id, "Approved", "Approved by ministry administrator.")} className="flex-1 bg-[#2f9e6d] text-white font-bold text-sm py-2.5 rounded hover:opacity-90">Approve project</button>
                <button onClick={() => setReturning(viewing)} className="flex-1 bg-[#c0455f] text-white font-bold text-sm py-2.5 rounded hover:opacity-90">Return for changes</button>
              </>
            ) : (
              <div className="w-full space-y-2">
                <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} placeholder="Add a comment for the ministry administrator…"
                  className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb] focus:outline-none focus:ring-2 focus:ring-[#1c2d7a]/15" />
                <button onClick={() => addComment(viewing.id)} className="w-full bg-[#1c2d7a] text-white font-bold text-sm py-2.5 rounded hover:bg-[#17a4c2]">Add comment</button>
              </div>
            )
          }
        />
      )}

      {returning && <ReturnModal onCancel={() => setReturning(null)} onConfirm={note => decide(returning.id, "Returned", note)} />}
    </>
  );
}

function GeographyTab() {
  return (
    <div className="space-y-5">
      <AnimatedPanel>
        <Panel title="Provincial concentration" description="Where the pipeline is saturated, and where investment could move next">
          <div className="grid md:grid-cols-2 gap-4">
            {PROVINCES.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="border border-border rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-[13.5px] text-[#1c2d7a]">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">{formatNumber(p.projects)} projects · {formatUSD(p.fundingGapM * 1_000_000)} funding gap</div>
                  </div>
                  <SaturationBadge level={p.saturation} />
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#17a4c2] to-[#1c2d7a]"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (p.projects / 900) * 100)}%` }}
                    transition={{ delay: 0.2 + i * 0.06, duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                {p.saturation === "Low" && (
                  <p className="text-[11px] text-[#2f9e6d] font-medium mt-2">Suggested: prioritize new investment outreach here</p>
                )}
              </motion.div>
            ))}
          </div>
        </Panel>
      </AnimatedPanel>
      <AnimatedPanel delay={0.15}>
        <Panel title="Funding gap by province" description="Indicative capital required to close the gap, USD millions">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={PROVINCES.map(p => ({ name: p.name, gap: p.fundingGapM }))} barSize={38}>
              <defs>
                <linearGradient id="gradFundingGap" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e8a020" />
                  <stop offset="100%" stopColor="#e8a020" stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9.5 }} interval={0} angle={-16} textAnchor="end" height={70} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #eef0f9" }} cursor={{ fill: "#f4f7fb" }} formatter={(v: number) => [`$${v}M`, "Funding gap"]} />
              <Bar dataKey="gap" fill="url(#gradFundingGap)" radius={[8, 8, 0, 0]} name="Funding gap ($M)" animationDuration={1200} animationEasing="ease-out">
                <LabelList dataKey="gap" position="top" formatter={(v: number) => `$${v}M`} style={{ fontSize: 10.5, fontWeight: 700, fill: "#0f172a" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </AnimatedPanel>
    </div>
  );
}

function renderActiveWefShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
  return (
    <g>
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#1c2d7a" style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{payload.name}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748b" style={{ fontSize: 11, fontWeight: 600 }}>{((percent ?? 0) * 100).toFixed(0)}%</text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 10} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 13} outerRadius={outerRadius + 17} startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.35} />
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
      <AnimatedPanel delay={0}>
        <Panel title="Water · Energy · Food split" description="Share of national pipeline by WEF Nexus dimension — hover a segment for detail">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={WEF_NEXUS_SPLIT} dataKey="value" nameKey="name" innerRadius={62} outerRadius={98} paddingAngle={3} cornerRadius={6}
                activeIndex={activeIndex}
                activeShape={renderActiveWefShape}
                onMouseEnter={(_, i) => setActiveIndex(i)}
                animationDuration={1200} animationEasing="ease-out"
              >
                {WEF_NEXUS_SPLIT.map(w => <Cell key={w.name} fill={w.color} stroke="white" strokeWidth={2} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #eef0f9" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
      </AnimatedPanel>
      <AnimatedPanel delay={0.12}>
        <Panel title="Provincial WEF intensity" description="Relative strength of each nexus dimension by province">
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <defs>
                <linearGradient id="gradWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1c2d7a" stopOpacity={0.5} /><stop offset="100%" stopColor="#1c2d7a" stopOpacity={0.05} /></linearGradient>
                <linearGradient id="gradEnergy" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#17a4c2" stopOpacity={0.5} /><stop offset="100%" stopColor="#17a4c2" stopOpacity={0.05} /></linearGradient>
                <linearGradient id="gradFood" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e8a020" stopOpacity={0.5} /><stop offset="100%" stopColor="#e8a020" stopOpacity={0.05} /></linearGradient>
              </defs>
              <PolarGrid stroke="#eef0f9" />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10.5 }} />
              <PolarRadiusAxis tick={{ fontSize: 9 }} />
              <Radar name="Water" dataKey="Water" stroke="#1c2d7a" strokeWidth={2} fill="url(#gradWater)" dot={{ r: 3 }} animationDuration={1300} animationEasing="ease-out" />
              <Radar name="Energy" dataKey="Energy" stroke="#17a4c2" strokeWidth={2} fill="url(#gradEnergy)" dot={{ r: 3 }} animationDuration={1300} animationBegin={150} animationEasing="ease-out" />
              <Radar name="Food" dataKey="Food" stroke="#e8a020" strokeWidth={2} fill="url(#gradFood)" dot={{ r: 3 }} animationDuration={1300} animationBegin={300} animationEasing="ease-out" />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #eef0f9" }} />
            </RadarChart>
          </ResponsiveContainer>
        </Panel>
      </AnimatedPanel>
    </div>
  );
}

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

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
        <h4 className="font-bold text-[#1c2d7a] mb-4">Add platform user</h4>
        <div className="space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Temporary password" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          <select value={role} onChange={e => setRole(e.target.value as AppUser["role"])} className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]">
            <option value="focal">Provincial / Sectoral Focal Point</option>
            <option value="reviewer">Reviewer / Analyst</option>
            <option value="investor">Investor / Development Partner</option>
            <option value="admin">Central Ministry Administrator</option>
          </select>
          {role === "focal" && (
            <select value={province} onChange={e => setProvince(e.target.value)} className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]">
              {PROVINCES.map(p => <option key={p.name}>{p.name}</option>)}
            </select>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCancel} className="text-[12.5px] font-semibold px-4 py-2 rounded border border-border hover:bg-slate-50">Cancel</button>
          <button
            onClick={() => name && email && onSave({ name, email, password, role, title: role === "focal" ? `Provincial Focal Point — ${province}` : ROLE_LABELS[role], province: role === "focal" ? province : undefined })}
            className="text-[12.5px] font-semibold px-4 py-2 rounded bg-[#1c2d7a] text-white hover:bg-[#17a4c2]"
          >
            Add user
          </button>
        </div>
      </div>
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
  };

  return (
    <Panel
      title="Users & roles"
      description="Role model aligned with institutional responsibilities — added users can immediately sign in with these credentials"
      action={<button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-[#1c2d7a] px-3 py-1.5 rounded-lg hover:bg-[#17a4c2]"><Plus className="w-3.5 h-3.5" /> Add user</button>}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-left text-muted-foreground uppercase text-[10.5px] tracking-wide border-b border-border">
              <th className="py-2 px-3">Name</th>
              <th className="py-2 px-3">Role</th>
              <th className="py-2 px-3">Scope of access</th>
              <th className="py-2 px-3">Email / password</th>
              <th className="py-2 px-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-border hover:bg-[#f9fafc]">
                <td className="py-2.5 px-3 font-medium text-[#0f172a]">{u.name}</td>
                <td className="py-2.5 px-3 text-muted-foreground">{ROLE_LABELS[u.role]}</td>
                <td className="py-2.5 px-3 text-muted-foreground">{u.role === "focal" ? `${u.province} only` : u.role === "admin" ? "Full, national" : u.role === "reviewer" ? "Read / comment — national" : "Approved catalogue only"}</td>
                <td className="py-2.5 px-3 text-muted-foreground">{u.email} · {u.password}</td>
                <td className="py-2.5 px-3 text-right">
                  <button onClick={() => toggleActive(u.id)} className={`text-[11px] font-semibold px-2.5 py-1 rounded ${u.active ? "bg-[#e7f5ee] text-[#2f9e6d]" : "bg-slate-100 text-slate-500"}`}>
                    {u.active ? "Active" : "Deactivated"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && <UserForm onCancel={() => setShowForm(false)} onSave={addUser} />}
    </Panel>
  );
}

function ReportsTab() {
  return (
    <Panel title="Reports" description="Exportable summaries for ministry leadership and international partners">
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { name: "National pipeline summary", meta: "PDF · Updated Aug 2026" },
          { name: "Provincial funding gap report", meta: "XLSX · Updated Aug 2026" },
          { name: "WEF Nexus impact brief", meta: "PDF · Updated Jul 2026" },
        ].map(r => (
          <div key={r.name} className="border border-border rounded-lg p-4 flex flex-col gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#eef0f9] flex items-center justify-center"><FileBarChart2 className="w-4 h-4 text-[#1c2d7a]" /></div>
            <div>
              <div className="font-semibold text-[13px] text-[#0f172a]">{r.name}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{r.meta}</div>
            </div>
            <button className="mt-auto text-[12px] font-semibold text-[#17a4c2] hover:underline text-left">Download (demo)</button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

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
        <div className="mb-5 flex items-center gap-2 bg-[#eef0f9] text-[#1c2d7a] text-[12px] font-semibold px-4 py-2.5 rounded-lg">
          <ShieldCheck className="w-4 h-4" /> Read / comment access — approval authority is reserved for the Central Ministry Administrator.
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
