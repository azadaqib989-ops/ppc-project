import { useEffect, useState } from "react";
import {
  LayoutDashboard, FolderKanban, FilePlus2, Handshake,
  Building2, HandCoins, CheckCircle2, ArrowRight, ArrowLeft, MapPin,
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { DashboardShell, type NavItem } from "./DashboardShell";
import { KpiCard, Panel, StatusBadge } from "./dashboardWidgets";
import { ProjectDetailModal } from "./ProjectDetail";
import { useAuth } from "../lib/auth";
import { SECTOR_DATA, formatUSD, formatNumber, type ProjectStatus } from "../lib/mockData";
import {
  getProjects, addProject, updateProject, getInterests, updateInterest, pushNotification,
  type StoreProject, type InvestorInterest,
} from "../lib/store";

const NAV_ITEMS: NavItem[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "projects", label: "My Projects", icon: FolderKanban },
  { key: "submit", label: "New Submission", icon: FilePlus2 },
  { key: "interests", label: "Investor Interests", icon: Handshake },
];

function useProvinceProjects(province?: string) {
  const [projects, setProjects] = useState<StoreProject[]>([]);
  const refresh = () => setProjects(getProjects().filter(p => p.province === province));
  useEffect(() => { refresh(); }, [province]);
  return { projects, refresh };
}

function OverviewTab({ projects }: { projects: StoreProject[] }) {
  const approved = projects.filter(p => p.status === "Approved").length;
  const pending = projects.filter(p => ["Submitted", "Under Review"].includes(p.status)).length;
  const fundingGap = projects.reduce((s, p) => s + p.fundingGapUSD, 0);
  const bySector = SECTOR_DATA.map(s => ({ ...s, count: projects.filter(p => p.sector === s.name).length })).filter(s => s.count > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Building2} label="Total Projects" value={formatNumber(projects.length)} sub="In your province" />
        <KpiCard icon={CheckCircle2} label="Approved" value={formatNumber(approved)} accent="#2f9e6d" />
        <KpiCard icon={FolderKanban} label="Awaiting Decision" value={formatNumber(pending)} accent="#e8a020" />
        <KpiCard icon={HandCoins} label="Funding Gap" value={formatUSD(fundingGap)} sub="Across your pipeline" accent="#17a4c2" />
      </div>
      <Panel title="Your pipeline by sector" description="Where your province's submissions are concentrated">
        {bySector.length === 0 ? <p className="text-[12.5px] text-muted-foreground">No projects yet — start a new submission.</p> : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={bySector} dataKey="count" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                {bySector.map(s => <Cell key={s.name} fill={s.color} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 10.5 }} layout="vertical" verticalAlign="middle" align="right" />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Panel>
    </div>
  );
}

function ProjectsTab({ projects, refresh }: { projects: StoreProject[]; refresh: () => void }) {
  const { user } = useAuth();
  const [viewing, setViewing] = useState<StoreProject | null>(null);
  const [updateText, setUpdateText] = useState("");

  const submitDraft = (id: number) => {
    const by = user?.name ?? "Focal point";
    updateProject(id, p => ({
      ...p,
      status: "Submitted",
      updated: new Date().toISOString().slice(0, 10),
      statusHistory: [...p.statusHistory, { status: "Submitted", note: "Submitted for ministry review.", date: new Date().toISOString().slice(0, 10), by }],
    }));
    pushNotification({ audience: "admin", text: `New submission from ${user?.province}: a project awaits ministry review.`, date: "Just now" });
    refresh();
    setViewing(null);
  };

  const postUpdate = (id: number) => {
    if (!updateText.trim()) return;
    const by = user?.name ?? "Focal point";
    const updated = updateProject(id, p => ({
      ...p,
      progressUpdates: [...p.progressUpdates, { id: Date.now(), date: new Date().toISOString().slice(0, 10), author: by, text: updateText }],
    }));
    setUpdateText("");
    refresh();
    setViewing(updated.find(p => p.id === id) ?? null);
  };

  return (
    <>
      <Panel title="My projects" description="Every project you own — you can edit drafts, submit for review and post progress updates">
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
              {projects.map(p => (
                <tr key={p.id} className="border-b border-border hover:bg-[#f9fafc]">
                  <td className="py-2.5 px-3 font-medium text-[#0f172a] max-w-[220px] truncate cursor-pointer" onClick={() => setViewing(p)}>{p.title}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{p.sector}</td>
                  <td className="py-2.5 px-3 font-semibold">{formatUSD(p.fundingGapUSD)}</td>
                  <td className="py-2.5 px-3"><StatusBadge status={p.status} /></td>
                  <td className="py-2.5 px-3 text-muted-foreground">{p.updated}</td>
                  <td className="py-2.5 px-3 text-right">
                    {(p.status === "Draft" || p.status === "Returned") && (
                      <button onClick={() => submitDraft(p.id)} className="text-[11.5px] font-semibold text-white bg-[#1c2d7a] px-2.5 py-1.5 rounded hover:bg-[#17a4c2]">Submit</button>
                    )}
                    {p.status === "Approved" && (
                      <button onClick={() => setViewing(p)} className="text-[11.5px] font-semibold text-[#1c2d7a] bg-[#eef0f9] px-2.5 py-1.5 rounded hover:bg-[#1c2d7a] hover:text-white">Post update</button>
                    )}
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No projects yet — create your first submission.</td></tr>
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
            viewing.status === "Draft" || viewing.status === "Returned" ? (
              <button onClick={() => submitDraft(viewing.id)} className="w-full bg-[#1c2d7a] text-white font-bold text-sm py-2.5 rounded hover:bg-[#17a4c2]">Submit for ministry review</button>
            ) : viewing.status === "Approved" ? (
              <div className="w-full space-y-2">
                <textarea value={updateText} onChange={e => setUpdateText(e.target.value)} rows={2} placeholder="Share a progress update investors and the ministry can see…"
                  className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb] focus:outline-none focus:ring-2 focus:ring-[#1c2d7a]/15" />
                <button onClick={() => postUpdate(viewing.id)} className="w-full bg-[#17a4c2] text-white font-bold text-sm py-2.5 rounded hover:bg-[#1c2d7a]">Post update</button>
              </div>
            ) : undefined
          }
        />
      )}
    </>
  );
}

const STEPS = ["Basics", "Location & Sector", "Financials & Impact", "WEF Nexus", "Review & Submit"];

function SubmissionWizard({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [sector, setSector] = useState(SECTOR_DATA[0].name);
  const [cost, setCost] = useState("");
  const [fundingGap, setFundingGap] = useState("");
  const [beneficiaries, setBeneficiaries] = useState("");
  const [jobs, setJobs] = useState("");
  const [wef, setWef] = useState<("Water" | "Energy" | "Food")[]>([]);
  const [done, setDone] = useState(false);

  const toggleWef = (w: "Water" | "Energy" | "Food") => setWef(w0 => (w0.includes(w) ? w0.filter(x => x !== w) : [...w0, w]));

  const canNext = [
    title.trim().length > 0,
    true,
    cost.trim().length > 0 && fundingGap.trim().length > 0,
    wef.length > 0,
    true,
  ][step];

  const submit = () => {
    if (!user) return;
    const id = Date.now();
    const today = new Date().toISOString().slice(0, 10);
    const project: StoreProject = {
      id,
      title,
      province: user.province ?? "Punjab",
      sector,
      wef: wef.length ? wef : ["Water"],
      status: "Draft",
      costUSD: Number(cost) * 1_000_000 || 1_000_000,
      fundingGapUSD: Number(fundingGap) * 1_000_000 || 500_000,
      beneficiaries: Number(beneficiaries) || 1000,
      jobs: Number(jobs) || 50,
      readiness: 40,
      submittedBy: user.name,
      updated: today,
      summary: summary || "New provincial submission awaiting completion and ministry review.",
      statusHistory: [{ status: "Draft", note: "Project drafted by provincial focal point.", date: today, by: user.name }],
      progressUpdates: [],
    };
    addProject(project);
    setDone(true);
    setTimeout(onCreated, 1400);
  };

  if (done) {
    return (
      <Panel title="Submission saved">
        <div className="flex flex-col items-center py-8 gap-3">
          <div className="w-14 h-14 rounded-full bg-[#e7f5ee] flex items-center justify-center"><CheckCircle2 className="w-7 h-7 text-[#2f9e6d]" /></div>
          <p className="font-semibold text-[#1c2d7a] text-sm">Draft saved to "My Projects". Submit it for ministry review whenever it's ready.</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="New project submission" description="A guided, step-by-step process — you can save as a draft and come back later">
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={s} className={`flex items-center gap-1.5 text-[11.5px] font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${i === step ? "bg-[#1c2d7a] text-white" : i < step ? "bg-[#e7f5ee] text-[#2f9e6d]" : "bg-slate-100 text-muted-foreground"}`}>
            <span>{i + 1}</span> {s}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-3 max-w-lg">
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Project title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Community-based solar irrigation scheme" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Summary (optional)</label>
            <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3} placeholder="Briefly describe the project's purpose and expected impact." className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3 max-w-lg">
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Province</label>
            <div className="flex items-center gap-1.5 text-[12.5px] text-[#0f172a] bg-[#f4f7fb] border border-border rounded-lg p-2.5"><MapPin className="w-3.5 h-3.5 text-muted-foreground" /> {user?.province ?? "Punjab"} <span className="text-muted-foreground ml-1">(fixed to your focal-point scope)</span></div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Sector *</label>
            <select value={sector} onChange={e => setSector(e.target.value)} className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]">
              {SECTOR_DATA.map(s => <option key={s.name}>{s.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid sm:grid-cols-2 gap-3 max-w-lg">
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Total cost (USD millions) *</label>
            <input value={cost} onChange={e => setCost(e.target.value)} type="number" min="0" placeholder="25" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Funding gap (USD millions) *</label>
            <input value={fundingGap} onChange={e => setFundingGap(e.target.value)} type="number" min="0" placeholder="10" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Beneficiaries</label>
            <input value={beneficiaries} onChange={e => setBeneficiaries(e.target.value)} type="number" min="0" placeholder="50000" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Jobs supported</label>
            <input value={jobs} onChange={e => setJobs(e.target.value)} type="number" min="0" placeholder="300" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-lg">
          <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Water – Energy – Food Nexus dimensions *</label>
          <div className="flex gap-2">
            {(["Water", "Energy", "Food"] as const).map(w => (
              <button key={w} onClick={() => toggleWef(w)} className={`flex-1 text-[12.5px] font-semibold py-2.5 rounded-lg border transition-colors ${wef.includes(w) ? "bg-[#1c2d7a] text-white border-[#1c2d7a]" : "bg-[#f4f7fb] text-[#1c2d7a] border-border"}`}>{w}</button>
            ))}
          </div>
          <p className="text-[11.5px] text-muted-foreground mt-2">Select every dimension this project meaningfully affects.</p>
        </div>
      )}

      {step === 4 && (
        <div className="max-w-lg space-y-2 text-[12.5px]">
          {[["Title", title || "—"], ["Province", user?.province ?? "Punjab"], ["Sector", sector], ["Total cost", cost ? `$${cost}M` : "—"], ["Funding gap", fundingGap ? `$${fundingGap}M` : "—"], ["WEF Nexus", wef.join(", ") || "—"]].map(([label, value]) => (
            <div key={label} className="flex justify-between bg-[#f4f7fb] rounded-lg p-2.5">
              <span className="text-muted-foreground">{label}</span><span className="font-semibold text-[#0f172a]">{value}</span>
            </div>
          ))}
          <p className="text-[11.5px] text-muted-foreground pt-1">Saved as a draft first — you decide when to submit it for ministry review.</p>
        </div>
      )}

      <div className="flex justify-between mt-7">
        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="flex items-center gap-1.5 text-[12.5px] font-semibold px-4 py-2 rounded border border-border disabled:opacity-40 hover:bg-slate-50"><ArrowLeft className="w-3.5 h-3.5" /> Back</button>
        {step < STEPS.length - 1 ? (
          <button onClick={() => canNext && setStep(s => s + 1)} disabled={!canNext} className="flex items-center gap-1.5 text-[12.5px] font-semibold px-4 py-2 rounded bg-[#1c2d7a] text-white disabled:opacity-40 hover:bg-[#17a4c2]">Next <ArrowRight className="w-3.5 h-3.5" /></button>
        ) : (
          <button onClick={submit} className="flex items-center gap-1.5 text-[12.5px] font-semibold px-4 py-2 rounded bg-[#2f9e6d] text-white hover:opacity-90">Save draft <CheckCircle2 className="w-3.5 h-3.5" /></button>
        )}
      </div>
    </Panel>
  );
}

function InterestsTab({ projects }: { projects: StoreProject[] }) {
  const { user } = useAuth();
  const [interests, setInterests] = useState<InvestorInterest[]>([]);
  const [reply, setReply] = useState<Record<number, string>>({});
  const projectIds = projects.map(p => p.id);

  useEffect(() => { setInterests(getInterests().filter(i => projectIds.includes(i.projectId))); }, [projects.length]);

  const respond = (interestId: number, status: InvestorInterest["status"]) => {
    const note = reply[interestId] || `Status updated to ${status}.`;
    const by = user?.name ?? "Focal point";
    const updated = updateInterest(interestId, i => ({ ...i, status, timeline: [...i.timeline, { note, date: new Date().toISOString().slice(0, 10), by }] }));
    setInterests(updated.filter(i => projectIds.includes(i.projectId)));
    setReply(r => ({ ...r, [interestId]: "" }));
  };

  return (
    <Panel title="Investor interests" description="Respond to interest expressed in your province's projects">
      {interests.length === 0 ? (
        <p className="text-[12.5px] text-muted-foreground">No investor interest yet on your projects.</p>
      ) : (
        <div className="space-y-4">
          {interests.map(i => {
            const project = projects.find(p => p.id === i.projectId);
            return (
              <div key={i.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-[13px] text-[#0f172a]">{project?.title}</span>
                  <StatusBadge status={i.status} />
                </div>
                <p className="text-[12px] text-muted-foreground mb-2">From {i.investorName} · {i.createdAt}</p>
                <p className="text-[12.5px] bg-[#f4f7fb] rounded-lg p-2.5 mb-3">{i.message}</p>
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
  const { projects, refresh } = useProvinceProjects(user?.province);

  return (
    <DashboardShell
      navItems={NAV_ITEMS}
      active={active}
      onNavigate={setActive}
      title={`Provincial Focal Point — ${user?.province ?? ""}`}
      subtitle="Pakistan Climate Project Pipeline · Scoped to your province"
    >
      {active === "overview" && <OverviewTab projects={projects} />}
      {active === "projects" && <ProjectsTab projects={projects} refresh={refresh} />}
      {active === "submit" && <SubmissionWizard onCreated={() => { refresh(); setActive("projects"); }} />}
      {active === "interests" && <InterestsTab projects={projects} />}
    </DashboardShell>
  );
}
