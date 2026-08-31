import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  LayoutDashboard, FolderKanban, FilePlus2, Handshake,
  Building2, HandCoins, CheckCircle2, ArrowRight, ArrowLeft, MapPin, Pencil, Send, Loader2, Search, FileDown,
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { DashboardShell, type NavItem } from "./DashboardShell";
import { KpiCard, Panel, StatusBadge, AttachmentPicker, AttachmentList, filesToAttachments } from "./dashboardWidgets";
import { ProjectDetailModal } from "./ProjectDetail";
import { useAuth } from "../lib/auth";
import { SECTOR_DATA, formatUSD, formatNumber, type ProjectStatus } from "../lib/mockData";
import {
  addProject, updateProject, getProjects, getInterests, updateInterest,
  type StoreProject, type ProjectAttachment,
} from "../lib/store";

const NAV_ITEMS: NavItem[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "projects", label: "My Projects", icon: FolderKanban },
  { key: "submit", label: "New Submission", icon: FilePlus2 },
  { key: "interests", label: "Investor Interests", icon: Handshake },
  { key: "analytics", label: "Analytics & Reports", icon: FileDown },
];

function useProvinceProjects(provinceId?: string) {
  const [projects, setProjects] = useState<StoreProject[]>([]);
  const refresh = () => {
    setProjects(getProjects().filter(p => !provinceId || p.province.toLowerCase().replace(/[^a-z]/g, "") === provinceId.toLowerCase().replace(/[^a-z]/g, "")));
  };
  useEffect(() => { refresh(); }, [provinceId]);
  return { projects, refresh };
}

function OverviewTab({ projects }: { projects: StoreProject[] }) {
  const approved = projects.filter(p => p.status === "Approved").length;
  const pending = projects.filter(p => ["Submitted", "Under Review"].includes(p.status)).length;
  const returned = projects.filter(p => p.status === "Returned");
  const totalRequired = projects.reduce((s, p) => s + p.costUSD, 0);
  const fundingGap = projects.reduce((s, p) => s + p.fundingGapUSD, 0);
  const availableFunding = Math.max(0, totalRequired - fundingGap);
  const bySector = SECTOR_DATA.map(s => ({ ...s, count: projects.filter(p => p.sector === s.name).length })).filter(s => s.count > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Building2} label="Total Projects" value={formatNumber(projects.length)} sub="In your province" />
        <KpiCard icon={CheckCircle2} label="Approved" value={formatNumber(approved)} accent="#2f9e6d" />
        <KpiCard icon={FolderKanban} label="Awaiting Decision" value={formatNumber(pending)} accent="#e8a020" />
        <KpiCard icon={HandCoins} label="Funding Required" value={formatUSD(totalRequired)} sub="Total project cost" accent="#17a4c2" />
        <KpiCard icon={HandCoins} label="Available Funding" value={formatUSD(availableFunding)} sub="Cost less funding gap" accent="#2f9e6d" />
        <KpiCard icon={HandCoins} label="Funding Gap" value={formatUSD(fundingGap)} sub="Across your pipeline" accent="#e8a020" />
      </div>
      {returned.length > 0 && <Panel title="Returned projects needing action" description="Review the ministry note, update the project, then submit it again">
        <div className="space-y-2">{returned.map(p => <div key={p.id} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0"><span className="text-[12.5px] font-semibold text-[#0f172a] truncate">{p.title}</span><StatusBadge status="Returned" /></div>)}</div>
      </Panel>}
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
    const by = user?.name ?? "Focal point";
    const project = projects.find(p => p.id === id);
    if (!project) return;
    const today = new Date().toISOString().slice(0, 10);
    updateProject(id, p => ({ ...p, status: "Submitted", updated: today, statusHistory: [...p.statusHistory, { status: "Submitted", note: "Submitted for ministry review.", date: today, by }] }));
    toast.success("Project submitted for ministry review.");
    refresh();
    setViewing(null);
  };

  const postUpdate = async (id: number) => {
    if (!updateText.trim() && updateAttachments.length === 0) return;
    const by = user?.name ?? "Focal point";
    const project = projects.find(p => p.id === id);
    if (!project) return;
    updateProject(id, p => ({ ...p, progressUpdates: [...p.progressUpdates, { id: Date.now(), date: new Date().toISOString().slice(0, 10), author: by, text: updateText || "Shared new supporting documents.", attachments: updateAttachments }] }));
    toast.success("Progress update posted.");
    setUpdateText("");
    setUpdateAttachments([]);
    refresh();
    setViewing(null);
  };

  const addUpdateFiles = (files: FileList) => {
    filesToAttachments(files, user?.name ?? "Focal point").then(newFiles => setUpdateAttachments(a => [...a, ...newFiles]));
  };

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
                          <button onClick={() => onEdit(p)} title="Edit" className="p-1.5 rounded bg-[#eef0f9] text-[#1c2d7a] hover:bg-[#1c2d7a] hover:text-white transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => submitDraft(p.id)} className="text-[11.5px] font-semibold text-white bg-[#1c2d7a] px-2.5 py-1.5 rounded hover:bg-[#17a4c2]">Submit</button>
                        </>
                      )}
                      {p.status === "Approved" && (
                        <button onClick={() => setViewing(p)} className="text-[11.5px] font-semibold text-[#1c2d7a] bg-[#eef0f9] px-2.5 py-1.5 rounded hover:bg-[#1c2d7a] hover:text-white">Post update</button>
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

      {viewing && (
        <ProjectDetailModal
          project={viewing}
          onClose={() => setViewing(null)}
          actions={
            viewing.status === "Draft" || viewing.status === "Returned" ? (
              <div className="w-full flex flex-col sm:flex-row gap-2.5">
                <button onClick={() => onEdit(viewing)} className="flex-1 bg-[#eef0f9] text-[#1c2d7a] font-bold text-sm py-2.5 rounded hover:bg-[#1c2d7a] hover:text-white">Edit details</button>
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
        />
      )}
    </>
  );
}

function AnalyticsTab({ projects }: { projects: StoreProject[] }) {
  const [status, setStatus] = useState("All");
  const filteredProjects = projects.filter(p => status === "All" || p.status === status);
  const download = () => {
    const rows = ["Title,Province,Sector,Status,Funding gap,Readiness", ...filteredProjects.map(p => [p.title, p.province, p.sector, p.status, p.fundingGapUSD, p.readiness].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))];
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    const link = document.createElement("a"); link.href = url; link.download = "provincial-project-report.csv"; link.click(); URL.revokeObjectURL(url);
  };
  return <Panel title="Provincial analytics and reports" description="A local portfolio view for your province, with a downloadable filtered report."><div className="flex flex-wrap items-center gap-2 mb-4"><label className="text-[11px] font-semibold text-muted-foreground">Report filter</label><select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2 text-[12px] border border-border rounded-lg bg-[#f4f7fb]"><option>All</option>{["Draft", "Submitted", "Under Review", "Approved", "Returned"].map(s => <option key={s}>{s}</option>)}</select></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">{[["Projects", filteredProjects.length], ["Approved", filteredProjects.filter(p => p.status === "Approved").length], ["Returned", filteredProjects.filter(p => p.status === "Returned").length], ["Readiness", `${Math.round(filteredProjects.reduce((s, p) => s + p.readiness, 0) / Math.max(1, filteredProjects.length))}%`]].map(([label, value]) => <div key={String(label)} className="bg-[#f4f7fb] rounded-lg p-3"><div className="text-lg font-bold text-[#1c2d7a]">{value}</div><div className="text-[11px] text-muted-foreground">{label}</div></div>)}</div><button onClick={download} className="inline-flex items-center gap-2 text-[12px] font-semibold px-3 py-2 rounded bg-[#1c2d7a] text-white"><FileDown className="w-3.5 h-3.5" /> Download CSV report</button></Panel>;
}


const STEPS = ["Basics", "Location & Timeline", "Financials & Impact", "Contacts", "WEF Nexus & Documents", "Review & Submit"];

function SubmissionWizard({ editingProject, onCreated, onCancel }: { editingProject?: StoreProject | null; onCreated: () => void; onCancel: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [draftId, setDraftId] = useState<number | null>(editingProject?.id ?? null);
  const [title, setTitle] = useState(editingProject?.title ?? "");
  const [summary, setSummary] = useState(editingProject?.summary ?? "");
  const [district, setDistrict] = useState(editingProject?.district ?? "");
  const [sector, setSector] = useState(editingProject?.sector ?? SECTOR_DATA[0].name);
  const [primarySector, setPrimarySector] = useState(editingProject?.primarySector ?? editingProject?.sector ?? SECTOR_DATA[0].name);
  const [secondarySector, setSecondarySector] = useState(editingProject?.secondarySector ?? "");
  const [sdgs, setSdgs] = useState(editingProject?.sdgs?.join(", ") ?? "SDG 13");
  const [startDate, setStartDate] = useState(editingProject?.startDate ?? "");
  const [endDate, setEndDate] = useState(editingProject?.endDate ?? "");
  const [cost, setCost] = useState(editingProject ? String(editingProject.costUSD / 1_000_000) : "");
  const [fundingGap, setFundingGap] = useState(editingProject ? String(editingProject.fundingGapUSD / 1_000_000) : "");
  const [coFinancing, setCoFinancing] = useState(editingProject?.coFinancingUSD ? String(editingProject.coFinancingUSD / 1_000_000) : "");
  const [beneficiaries, setBeneficiaries] = useState(editingProject ? String(editingProject.beneficiaries) : "");
  const [jobs, setJobs] = useState(editingProject ? String(editingProject.jobs) : "");
  const [implementingAgency, setImplementingAgency] = useState(editingProject?.implementingAgency ?? "");
  const [contactName, setContactName] = useState(editingProject?.contactName ?? user?.name ?? "");
  const [contactEmail, setContactEmail] = useState(editingProject?.contactEmail ?? user?.email ?? "");
  const [contactPhone, setContactPhone] = useState(editingProject?.contactPhone ?? "");
  const [riskNotes, setRiskNotes] = useState(editingProject?.riskNotes ?? "");
  const [wef, setWef] = useState<("Water" | "Energy" | "Food")[]>(editingProject?.wef ?? []);
  const [attachments, setAttachments] = useState<ProjectAttachment[]>(editingProject?.attachments ?? []);
  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const [done, setDone] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [apiId, setApiId] = useState<string | undefined>(editingProject?.apiId);
  const [sectorOptions, setSectorOptions] = useState<{ id: string; name: string; color: string }[]>([]);

  useEffect(() => {
    setSectorOptions(SECTOR_DATA.map((s, i) => ({ ...s, id: String(i + 1) })));
  }, []);

  const toggleWef = (w: "Water" | "Energy" | "Food") => setWef(w0 => (w0.includes(w) ? w0.filter(x => x !== w) : [...w0, w]));

  const addFiles = (files: FileList) => {
    filesToAttachments(files, user?.name ?? "Focal point").then(newFiles => setAttachments(a => [...a, ...newFiles]));
    setRawFiles(f => [...f, ...Array.from(files)]);
  };


  const canNext = [
    title.trim().length > 0,
    true,
    cost.trim().length > 0 && fundingGap.trim().length > 0,
    true,
    wef.length > 0,
    true,
  ][step];

  const buildProject = (status: ProjectStatus, by: string, today: string, backendId?: string): StoreProject => {
    const base = editingProject;
    return {
      id: draftId ?? Date.now(),
      apiId: backendId ?? apiId,
      title: title || "Untitled submission",
      province: user?.province ?? "Punjab",
      district: district || undefined,
      sector,
      primarySector,
      secondarySector: secondarySector || undefined,
      sdgs: sdgs.split(",").map(s => s.trim()).filter(Boolean),
      wef: wef.length ? wef : ["Water"],
      status,
      costUSD: Number(cost) * 1_000_000 || base?.costUSD || 1_000_000,
      fundingGapUSD: Number(fundingGap) * 1_000_000 || base?.fundingGapUSD || 500_000,
      coFinancingUSD: coFinancing.trim() ? Number(coFinancing) * 1_000_000 : base?.coFinancingUSD,
      beneficiaries: Number(beneficiaries) || base?.beneficiaries || 1000,
      jobs: Number(jobs) || base?.jobs || 50,
      readiness: base?.readiness ?? 40,
      startDate: startDate || base?.startDate,
      endDate: endDate || base?.endDate,
      implementingAgency: implementingAgency || base?.implementingAgency,
      contactName: contactName || base?.contactName,
      contactEmail: contactEmail || base?.contactEmail,
      contactPhone: contactPhone || base?.contactPhone,
      riskNotes: riskNotes || base?.riskNotes,
      submittedBy: user?.name ?? base?.submittedBy ?? "Focal point",
      updated: today,
      summary: summary || base?.summary || "New provincial submission awaiting completion and ministry review.",
      statusHistory: base?.statusHistory ?? [{ status: "Draft", note: "Project drafted by provincial focal point.", date: today, by }],
      progressUpdates: base?.progressUpdates ?? [],
      attachments,
    };
  };

  const persist = (status: ProjectStatus, note: string, backendId?: string) => {
    if (!user) return null;
    const today = new Date().toISOString().slice(0, 10);
    const by = user.name;
    const project = buildProject(status, by, today, backendId);
    const isNew = draftId === null;
    if (isNew) {
      addProject(project);
      setDraftId(project.id);
    } else {
      updateProject(project.id, p => ({
        ...project,
        statusHistory: status !== p.status
          ? [...p.statusHistory, { status, note, date: today, by }]
          : p.statusHistory,
      }));
    }
    return project;
  };

  const saveAsDraft = async () => {
    setSaving(true);
    try {
      persist(editingProject?.status ?? "Draft", "Draft updated by provincial focal point.");
      toast.success("Draft saved locally.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save draft locally.");
      persist(editingProject?.status ?? "Draft", "Draft updated by provincial focal point.");
    } finally {
      setSaving(false);
    }
    setSavedMsg("Draft saved. You can keep editing or come back later from \"My Projects\".");
    setTimeout(() => setSavedMsg(""), 3500);
  };

  const submitForReview = async () => {
    setSaving(true);
    try {
      toast.success("Project submitted for ministry review.");
      persist("Submitted", "Submitted for ministry review.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit to the server — saved locally as a draft.");
      persist("Draft", "Submitted for ministry review.");
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
        <div className="grid sm:grid-cols-2 gap-3 max-w-lg">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Province</label>
            <div className="flex items-center gap-1.5 text-[12.5px] text-[#0f172a] bg-[#f4f7fb] border border-border rounded-lg p-2.5"><MapPin className="w-3.5 h-3.5 text-muted-foreground" /> {user?.province ?? "Punjab"} <span className="text-muted-foreground ml-1">(fixed to your focal-point scope)</span></div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">District / city</label>
            <input value={district} onChange={e => setDistrict(e.target.value)} placeholder="e.g. Multan" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
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
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Planned start date</label>
            <input value={startDate} onChange={e => setStartDate(e.target.value)} type="date" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Planned end date</label>
            <input value={endDate} onChange={e => setEndDate(e.target.value)} type="date" min={startDate || undefined} className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
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
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Co-financing secured (USD millions)</label>
            <input value={coFinancing} onChange={e => setCoFinancing(e.target.value)} type="number" min="0" placeholder="2" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
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
        <div className="grid sm:grid-cols-2 gap-3 max-w-lg">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Implementing agency</label>
            <input value={implementingAgency} onChange={e => setImplementingAgency(e.target.value)} placeholder="e.g. Provincial Irrigation Department" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
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
            <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+92-3xx-xxxxxxx" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Risks & mitigation notes (optional)</label>
            <textarea value={riskNotes} onChange={e => setRiskNotes(e.target.value)} rows={2} placeholder="Any known risks (land acquisition, permits, seasonal access) and how they'll be mitigated." className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="max-w-lg space-y-5">
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
        </div>
      )}

      {step === 5 && (
        <div className="max-w-lg space-y-2 text-[12.5px]">
          {[
            ["Title", title || "—"], ["Province", user?.province ?? "Punjab"], ["District", district || "—"], ["Sector", sector],
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

      {savedMsg && <p className="text-[11.5px] font-semibold text-[#2f9e6d] mt-4">{savedMsg}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2.5 mt-7">
        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="flex items-center gap-1.5 text-[12.5px] font-semibold px-4 py-2 rounded border border-border disabled:opacity-40 hover:bg-slate-50"><ArrowLeft className="w-3.5 h-3.5" /> Back</button>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={saveAsDraft} disabled={saving} className="flex items-center gap-1.5 text-[12.5px] font-semibold px-4 py-2 rounded border border-[#1c2d7a] text-[#1c2d7a] hover:bg-[#eef0f9] disabled:opacity-50">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save as draft
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => canNext && setStep(s => s + 1)} disabled={!canNext} className="flex items-center gap-1.5 text-[12.5px] font-semibold px-4 py-2 rounded bg-[#1c2d7a] text-white disabled:opacity-40 hover:bg-[#17a4c2]">Next <ArrowRight className="w-3.5 h-3.5" /></button>
          ) : (
            <button onClick={submitForReview} disabled={!title.trim() || saving} className="flex items-center gap-1.5 text-[12.5px] font-semibold px-4 py-2 rounded bg-[#2f9e6d] text-white disabled:opacity-40 hover:opacity-90">
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
  const [interests, setInterests] = useState<ReturnType<typeof getInterests>>([]);
  const [reply, setReply] = useState<Record<string, string>>({});
  const projectIds = projects.map(p => p.id);

  useEffect(() => {
    setInterests(getInterests().filter(i => projects.some(p => p.id === i.projectId)));
  }, [projects.length]);

  const respond = async (interestId: string, status: string) => {
    const note = reply[interestId] || `Status updated to ${status}.`;
    const by = user?.name ?? "Focal point";
    const localInterest = interests.find(i => String(i.id) === String(interestId));
    if (!localInterest) return;
    const today = new Date().toISOString().slice(0, 10);
    const updated = updateInterest(localInterest.id, i => ({ ...i, status: status as typeof i.status, timeline: [...i.timeline, { note, date: today, by }] }));
    setInterests(updated.filter(i => projects.some(p => p.id === i.projectId)));
    setReply(r => ({ ...r, [interestId]: "" }));
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
                <p className="text-[12px] text-muted-foreground mb-2">{i.commitmentUSD ? `Proposed commitment: ${formatUSD(i.commitmentUSD)}` : "No commitment amount proposed"}</p>
                <p className="text-[12.5px] bg-[#f4f7fb] rounded-lg p-2.5 mb-3">{i.message}</p>
                <div className="border-l-2 border-[#eef0f9] pl-3 mb-3">{i.timeline.map((event, index) => <div key={index} className="text-[11px] text-muted-foreground mb-1">{event.date} · {event.by}: {event.note}</div>)}</div>
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
