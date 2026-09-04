import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  LayoutDashboard, LayoutGrid, Bookmark, Handshake, PieChart as PieChartIcon,
  Search, MapPin, Droplets, Sun, Leaf, Loader2, ImageOff,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { DashboardShell, type NavItem } from "./DashboardShell";
import { KpiCard, Panel, StatusBadge } from "./dashboardWidgets";
import { ProjectDetailPage } from "./ProjectDetail";
import { useAuth } from "../lib/auth";
import { PROVINCES, SECTOR_DATA, IMPACT_METRICS, formatUSD, formatNumber } from "../lib/mockData";
import { getCatalogue, getSavedProjects, saveProject, unsaveProject, createInterest, getInvestorInterests, getInterestTimeline, addInterestTimeline, getSectorAnalytics, type ApiInvestorInterest, getProvinces, getSectors, mapApiProjectToStore, type ApiProvince, type ApiSector } from "../lib/api";
import type { StoreProject } from "../lib/store";

/* Blue-only chart palette — follows the PCPP theme (#1c2d7a → #17a4c2 range). */
const INVESTOR_BLUE_SCALE = ["#10264b", "#1c2d7a", "#24409c", "#2f56c4", "#3f74d4", "#17a4c2", "#4fc3dd", "#7ee1e8"];

const NAV_ITEMS: NavItem[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "catalogue", label: "Project Catalogue", icon: LayoutGrid },
  { key: "saved", label: "Saved Projects", icon: Bookmark },
  { key: "interests", label: "My Interests", icon: Handshake },
  { key: "analytics", label: "Opportunity Analytics", icon: PieChartIcon },
];

// Loads the live, approved project catalogue from the backend (GET /projects/catalogue).
function useCatalogue() {
  const [projects, setProjects] = useState<StoreProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    getCatalogue({ page: 1, pageSize: 100 }).then(page => {
      setProjects(page.data.filter(p => p.status === "Approved").map((p, i) => mapApiProjectToStore(p, i + 1)));
    }).catch(e => setError(e instanceof Error ? e.message : "Unable to load the project catalogue.")).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  return { projects, loading, error, refresh: load };
}

// Loads province/sector reference data from the backend for filter dropdowns.
function useReferenceData() {
  const [provinces, setProvinces] = useState<ApiProvince[]>([]);
  const [sectors, setSectors] = useState<ApiSector[]>([]);
  useEffect(() => {
    Promise.all([getProvinces(), getSectors()]).then(([provinceData, sectorData]) => { setProvinces(provinceData); setSectors(sectorData); }).catch(() => undefined);
  }, []);
  return { provinces, sectors };
}

function OverviewTab({ catalogue }: { catalogue: StoreProject[] }) {
  const { user } = useAuth();
  const [savedCount, setSavedCount] = useState(0);
  const [interestCount, setInterestCount] = useState(0);
  useEffect(() => {
    Promise.all([getSavedProjects({ page: 1, pageSize: 100 }), getInvestorInterests()]).then(([saved, interests]) => {
      setSavedCount(saved.total); setInterestCount(interests.total);
    }).catch(() => undefined);
  }, [user?.email]);
  const fundingGap = catalogue.reduce((s, p) => s + p.fundingGapUSD, 0);
  const totalCost = catalogue.reduce((s, p) => s + p.costUSD, 0);
  const beneficiaries = catalogue.reduce((s, p) => s + p.beneficiaries, 0);
  const jobs = catalogue.reduce((s, p) => s + p.jobs, 0);
  const sectorData = Array.from(new Set(catalogue.map(p => p.sector))).map((name, i) => ({ name, count: catalogue.filter(p => p.sector === name).length, color: INVESTOR_BLUE_SCALE[i % INVESTOR_BLUE_SCALE.length] }));
  const provinceData = Array.from(new Set(catalogue.map(p => p.province))).map(name => ({ name, projects: catalogue.filter(p => p.province === name).length }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={LayoutGrid} label="Approved Opportunities" value={formatNumber(catalogue.length)} sub="Published & investable" />
        <KpiCard icon={Bookmark} label="Saved Projects" value={String(savedCount)} accent="#17a4c2" />
        <KpiCard icon={Handshake} label="Active Interests" value={String(interestCount)} accent="#24409c" />
        <KpiCard icon={Droplets} label="Funding Gap in View" value={formatUSD(fundingGap)} sub="Across visible catalogue" accent="#2f56c4" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Opportunities by sector" description="Where approved projects are concentrated">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={sectorData} dataKey="count" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                {sectorData.map(s => <Cell key={s.name} fill={s.color} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 10.5 }} layout="vertical" verticalAlign="middle" align="right" />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Opportunities by province" description="Geographic spread of the national pipeline">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={provinceData} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10.5 }} width={140} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="projects" fill="#17a4c2" radius={[0, 4, 4, 0]} name="Projects" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel title="National pipeline at a glance" description="Headline figures across the full PCPP portfolio">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total projects", value: formatNumber(catalogue.length) },
            { label: "Total investment value", value: formatUSD(totalCost) },
            { label: "Beneficiaries reached", value: formatNumber(beneficiaries) },
            { label: "Jobs supported", value: formatNumber(jobs) },
          ].map(s => (
            <div key={s.label} className="bg-[#f4f7fb] rounded-lg p-4 text-center">
              <div className="text-lg font-bold text-[#1c2d7a]" style={{ fontFamily: "'Playfair Display', serif" }}>{s.value}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

const wefIcon = { Water: Droplets, Energy: Sun, Food: Leaf } as const;

function ProjectCard({ p, saved, onToggleSave, onView }: { p: StoreProject; saved: boolean; onToggleSave: () => void; onView: () => void }) {
  // API-mapped projects carry the image in coverImageUrl; imageUrl only exists on legacy mock data.
  const cover = p.coverImageUrl || p.imageUrl;
  const [imgError, setImgError] = useState(false);
  return (
    <div className="bg-white border border-border rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <button onClick={onView} className="h-32 w-full overflow-hidden rounded-lg bg-slate-100" aria-label={`View ${p.title}`}>
        {cover && !imgError ? (
          <img src={cover} alt={p.title} onError={() => setImgError(true)} className="h-full w-full object-cover transition-transform hover:scale-105" />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-[#1c2d7a] to-[#17a4c2] text-white">
            <ImageOff className="w-5 h-5 opacity-80" />
            <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80 px-2 truncate max-w-full">{p.sector}</span>
          </div>
        )}
      </button>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {p.wef.map(w => {
            const Icon = wefIcon[w];
            return <span key={w} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-[#eef0f9] text-[#1c2d7a] px-1.5 py-0.5 rounded"><Icon className="w-3 h-3" />{w}</span>;
          })}
        </div>
        <button onClick={onToggleSave} className={`p-1.5 rounded-full transition-colors ${saved ? "bg-[#17a4c2] text-white" : "bg-slate-100 text-muted-foreground hover:bg-slate-200"}`}>
          <Bookmark className="w-3.5 h-3.5" fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <h4 onClick={onView} className="font-bold text-[13.5px] text-[#0f172a] leading-snug cursor-pointer hover:text-[#1c2d7a]" style={{ fontFamily: "'Playfair Display', serif" }}>{p.title}</h4>
      <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground"><MapPin className="w-3 h-3" /> {p.province} · {p.sector}</div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-[#f4f7fb] rounded p-2"><div className="text-muted-foreground">Funding gap</div><div className="font-bold text-[#0f172a]">{formatUSD(p.fundingGapUSD)}</div></div>
        <div className="bg-[#f4f7fb] rounded p-2"><div className="text-muted-foreground">Readiness</div><div className="font-bold text-[#0f172a]">{p.readiness}%</div></div>
      </div>
      <button onClick={onView} className="w-full flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-[#0f172a] hover:text-white text-[#0f172a] text-[12.5px] font-semibold py-2 rounded transition-colors">
        View details
      </button>
    </div>
  );
}

function ExpressInterestForm({ project, onCancel, onSend, sending }: { project: StoreProject; onCancel: () => void; onSend: (msg: string) => void; sending: boolean }) {
  const [message, setMessage] = useState(`We are interested in learning more about "${project.title}" — please share the current procurement timeline and co-financing options.`);
  const [commitment, setCommitment] = useState("");
  return (
    <div className="w-full space-y-2">
      <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
        className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb] focus:outline-none focus:ring-2 focus:ring-[#1c2d7a]/15" />
      <input value={commitment} onChange={e => setCommitment(e.target.value)} type="number" min="0" placeholder="Proposed commitment (USD, optional)" className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
      <div className="flex gap-2">
        <button onClick={onCancel} disabled={sending} className="flex-1 text-[12.5px] font-semibold py-2 rounded border border-border hover:bg-slate-50 disabled:opacity-50">Cancel</button>
        <button onClick={() => onSend(message, Number(commitment) || undefined)} disabled={sending} className="flex-1 bg-[#17a4c2] text-white font-bold text-sm py-2 rounded hover:bg-[#1c2d7a] disabled:opacity-60 inline-flex items-center justify-center gap-1.5">
          {sending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Send interest
        </button>
      </div>
    </div>
  );
}

function CatalogueTab({ catalogue, provinces, sectors }: { catalogue: StoreProject[]; provinces: ApiProvince[]; sectors: ApiSector[] }) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [province, setProvince] = useState("All");
  const [sector, setSector] = useState("All");
  const [saved, setSaved] = useState<string[]>([]);
  const [viewing, setViewing] = useState<StoreProject | null>(null);
  const [expressing, setExpressing] = useState(false);
  const [sentMsg, setSentMsg] = useState(false);
  const [sending, setSending] = useState(false);

  const filtered = useMemo(() => catalogue.filter(p =>
    (province === "All" || p.province === province) &&
    (sector === "All" || p.sector === sector) &&
    p.title.toLowerCase().includes(query.toLowerCase())
  ), [catalogue, query, province, sector]);

  useEffect(() => {
    getSavedProjects({ page: 1, pageSize: 100 }).then(result => setSaved(result.data.map(item => item.project.id))).catch(() => setSaved([]));
  }, [user?.email]);

  const toggleSave = async (id: number) => {
    if (!user) return;
    const project = catalogue.find(item => item.id === id);
    if (!project?.apiId) return;
    try {
      if (saved.includes(project.apiId)) { await unsaveProject(project.apiId); setSaved(current => current.filter(savedId => savedId !== project.apiId)); }
      else { await saveProject(project.apiId); setSaved(current => [...current, project.apiId!]); }
    } catch (e) { toast.error(e instanceof Error ? e.message : "Unable to update saved projects."); }
  };

  const sendInterest = async (message: string, commitmentUSD?: number) => {
    if (!user || !viewing) {
      toast.error("Please sign in before expressing interest.");
      return;
    }
    setSending(true);
    try {
      if (!viewing.apiId) throw new Error("This project has no server identifier.");
      await createInterest(viewing.apiId, message);
      toast.success("Interest sent to the project owner.");
      setExpressing(false);
      setSentMsg(true);
      setTimeout(() => { setSentMsg(false); setViewing(null); }, 1400);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send interest.");
    } finally {
      setSending(false);
    }
  };

  if (viewing) {
    return <ProjectDetailPage project={viewing} showComments={false} onBack={() => { setViewing(null); setExpressing(false); }} actions={
      sentMsg ? <p className="w-full text-center text-sm font-semibold text-[#2f9e6d]">Interest sent. Track it under My Interests.</p> : expressing ? <ExpressInterestForm project={viewing} onCancel={() => setExpressing(false)} onSend={sendInterest} sending={sending} /> : <button onClick={() => setExpressing(true)} className="w-full sm:w-auto bg-[#17a4c2] text-white font-bold text-sm py-3 px-8 rounded-lg hover:bg-[#1c2d7a]">Express interest</button>
    } />;
  }

  return (
    <div className="space-y-4">
      <Panel title="Filter the catalogue" description="Narrow national projects to what matters for your mandate">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search projects…"
              className="pl-8 pr-3 py-2 text-[12.5px] border border-border rounded-lg bg-[#f4f7fb] w-full focus:outline-none focus:ring-2 focus:ring-[#1c2d7a]/15" />
          </div>
          <select value={province} onChange={e => setProvince(e.target.value)} className="px-3 py-2 text-[12.5px] border border-border rounded-lg bg-[#f4f7fb]">
            <option>All</option>
            {(provinces.length ? provinces.map(p => p.name) : PROVINCES.map(p => p.name)).map(name => <option key={name}>{name}</option>)}
          </select>
          <select value={sector} onChange={e => setSector(e.target.value)} className="px-3 py-2 text-[12.5px] border border-border rounded-lg bg-[#f4f7fb]">
            <option>All</option>
            {(sectors.length ? sectors.map(s => s.name) : SECTOR_DATA.map(s => s.name)).map(name => <option key={name}>{name}</option>)}
          </select>
        </div>
      </Panel>
      <p className="text-[12px] text-muted-foreground px-1">{filtered.length} of {catalogue.length} approved opportunities shown</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => (
            <ProjectCard key={p.id} p={p} saved={Boolean(p.apiId && saved.includes(p.apiId))} onToggleSave={() => toggleSave(p.id)} onView={() => setViewing(p)} />
        ))}
        {filtered.length === 0 && <p className="text-[12.5px] text-muted-foreground col-span-full text-center py-8">No opportunities match these filters.</p>}
      </div>
    </div>
  );
}

function SavedTab({ catalogue }: { catalogue: StoreProject[] }) {
  const { user } = useAuth();
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [viewing, setViewing] = useState<StoreProject | null>(null);
  useEffect(() => { getSavedProjects({ page: 1, pageSize: 100 }).then(result => setSavedIds(result.data.map(item => item.project.id))).catch(() => setSavedIds([])); }, [user?.email]);
  const projects = catalogue.filter(p => p.apiId && savedIds.includes(p.apiId));

  if (viewing) return <ProjectDetailPage project={viewing} showComments={false} onBack={() => setViewing(null)} />;

  return (
    <Panel title="Saved projects" description="Opportunities you have bookmarked for closer review">
      {projects.length === 0 ? (
        <p className="text-[12.5px] text-muted-foreground">No saved projects yet — bookmark opportunities from the catalogue.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <ProjectCard key={p.id} p={p} saved onToggleSave={async () => { if (p.apiId) { await unsaveProject(p.apiId); setSavedIds(ids => ids.filter(id => id !== p.apiId)); } }} onView={() => setViewing(p)} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function InterestsTab({ catalogue }: { catalogue: StoreProject[] }) {
  const [interests, setInterests] = useState<ApiInvestorInterest[]>([]);
  const [timelines, setTimelines] = useState<Record<string, { note: string; byUserName: string; createdAt: string }[]>>({});
  const [reply, setReply] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    getInvestorInterests().then(result => {
      setInterests(result.data);
      return Promise.all(result.data.map(i => getInterestTimeline(i.id).then(timeline => [i.id, timeline] as const)));
    }).then(entries => setTimelines(Object.fromEntries(entries))).catch(e => toast.error(e instanceof Error ? e.message : "Unable to load interests.")).finally(() => setLoading(false));
  }, []);

  const rows = interests.map(i => ({ ...i, project: catalogue.find(p => p.apiId === i.projectId), projectTitle: i.projectTitle }));
  const sendReply = async (interestId: string) => {
    const note = reply[interestId]?.trim();
    if (!note) return;
    try {
      const timeline = await addInterestTimeline(interestId, note);
      setTimelines(current => ({ ...current, [interestId]: timeline }));
      setReply(current => ({ ...current, [interestId]: "" }));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Unable to post discussion reply."); }
  };

  return (
    <Panel title="My investor interests" description="Track the conversations you've started with project owners">
      {loading ? (
        <p className="text-[12.5px] text-muted-foreground flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading your interests…</p>
      ) : rows.length === 0 ? (
        <p className="text-[12.5px] text-muted-foreground">You haven't expressed interest in a project yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-muted-foreground uppercase text-[10.5px] tracking-wide border-b border-border">
                <th className="py-2 px-3">Project</th>
                <th className="py-2 px-3">Province</th>
                <th className="py-2 px-3">Funding gap</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Since</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-border hover:bg-[#f9fafc]">
                  <td className="py-2.5 px-3 font-medium text-[#0f172a]">{r.projectTitle}<div className="text-[10.5px] text-muted-foreground">{r.message}</div></td>
                  <td className="py-2.5 px-3 text-muted-foreground">{r.project?.province ?? "—"}</td>
                  <td className="py-2.5 px-3 font-semibold">{r.project ? formatUSD(r.project.fundingGapUSD) : "—"}</td>
                  <td className="py-2.5 px-3"><StatusBadge status={r.status} /></td>
                  <td className="py-2.5 px-3 text-muted-foreground">{r.createdAt.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.map(r => <div key={`timeline-${r.id}`} className="mt-3 border border-border rounded-lg p-3"><div className="text-[11px] font-bold uppercase tracking-wide text-[#1c2d7a]">{r.projectTitle} discussion</div>{(timelines[r.id] ?? []).map(event => <div key={event.createdAt + event.byUserName} className="text-[11.5px] text-muted-foreground mt-1">{event.createdAt.slice(0, 10)} · {event.byUserName}: {event.note}</div>)}<div className="flex gap-2 mt-3"><input value={reply[r.id] ?? ""} onChange={e => setReply(current => ({ ...current, [r.id]: e.target.value }))} placeholder="Reply to the focal point" className="flex-1 text-[12px] border border-border rounded-lg px-2.5 py-2 bg-[#f4f7fb]" /><button onClick={() => sendReply(r.id)} className="text-[12px] font-semibold px-3 py-2 rounded bg-[#17a4c2] text-white hover:bg-[#1c2d7a]">Send</button></div></div>)}
        </div>
      )}
    </Panel>
  );
}

function AnalyticsTab({ catalogue }: { catalogue: StoreProject[] }) {
  const [selected, setSelected] = useState<StoreProject[]>([]);
  const [viewing, setViewing] = useState<StoreProject | null>(null);
  const [sectorAnalytics, setSectorAnalytics] = useState<Array<{ sector: string; count: number; funding: number }>>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    getSectorAnalytics()
      .then(data => { if (active) setSectorAnalytics(Array.isArray(data) ? data : []); })
      .catch(error => { if (active) setAnalyticsError(error instanceof Error ? error.message : "Unable to load opportunity analytics."); })
      .finally(() => { if (active) setAnalyticsLoading(false); });
    return () => { active = false; };
  }, []);
  const readinessBuckets = [
    { name: "0-40%", count: catalogue.filter(p => p.readiness < 40).length, projects: catalogue.filter(p => p.readiness < 40) },
    { name: "40-60%", count: catalogue.filter(p => p.readiness >= 40 && p.readiness < 60).length, projects: catalogue.filter(p => p.readiness >= 40 && p.readiness < 60) },
    { name: "60-80%", count: catalogue.filter(p => p.readiness >= 60 && p.readiness < 80).length, projects: catalogue.filter(p => p.readiness >= 60 && p.readiness < 80) },
    { name: "80-100%", count: catalogue.filter(p => p.readiness >= 80).length, projects: catalogue.filter(p => p.readiness >= 80) },
  ];
  const sectorMix = sectorAnalytics.map((s, i) => ({
    name: s.sector,
    count: s.count,
    funding: s.funding,
    color: INVESTOR_BLUE_SCALE[i % INVESTOR_BLUE_SCALE.length],
    projects: catalogue.filter(project => project.sector === s.sector),
  })).filter(s => s.count > 0);
  const provinceGapData = Array.from(new Set(catalogue.map(p => p.province)))
    .map(name => ({ name, gap: Math.round(catalogue.filter(p => p.province === name).reduce((sum, p) => sum + p.fundingGapUSD, 0) / 100_000) / 10 }))
    .sort((a, b) => b.gap - a.gap);
  const wefMix = (["Water", "Energy", "Food"] as const)
    .map((name, i) => ({ name, value: catalogue.filter(p => p.wef.includes(name)).length, fill: INVESTOR_BLUE_SCALE[(i + 3) % INVESTOR_BLUE_SCALE.length] }))
    .filter(d => d.value > 0);
  const sectorCostGap = sectorMix.map(s => ({
    name: s.name,
    cost: Math.round(catalogue.filter(p => p.sector === s.name).reduce((sum, p) => sum + p.costUSD, 0) / 100_000) / 10,
    gap: Math.round(catalogue.filter(p => p.sector === s.name).reduce((sum, p) => sum + p.fundingGapUSD, 0) / 100_000) / 10,
  }));
  if (viewing) return <ProjectDetailPage project={viewing} showComments={false} onBack={() => setViewing(null)} />;;

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <Panel title="Readiness distribution" description="How investable the current catalogue is, at a glance">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={readinessBuckets}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="count" fill="#1c2d7a" radius={[4, 4, 0, 0]} name="Projects" onClick={data => setSelected(data.projects)} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
      <Panel title="Sector opportunity mix" description="Approved projects by sector">
        {analyticsLoading ? <div className="h-[260px] flex items-center justify-center text-[12px] text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading live analytics...</div> : analyticsError ? <p className="h-[260px] flex items-center justify-center text-[12px] text-red-600 text-center">{analyticsError}</p> : sectorMix.length === 0 ? <p className="h-[260px] flex items-center justify-center text-[12px] text-muted-foreground">No sector analytics available.</p> : <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={sectorMix} dataKey="count" nameKey="name" outerRadius={95} label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`} onClick={data => setSelected(data.projects)}>
              {sectorMix.map(s => <Cell key={s.name} fill={s.color} />)}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value, name, item) => [value, `${name} · ${formatUSD(item.payload.funding)}`]} />
            <Legend wrapperStyle={{ fontSize: 10.5 }} />
          </PieChart>
        </ResponsiveContainer>}
      </Panel>
      <Panel title="Funding gap by province" description="Where unfunded demand sits, USD millions">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={provinceGapData} layout="vertical" margin={{ left: 24, right: 26 }} barSize={14}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10.5 }} width={130} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={value => [`$${Number(value)}M`, "Funding gap"]} />
            <Bar dataKey="gap" name="Funding gap" fill="#1c2d7a" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
      <Panel title="WEF Nexus mix" description="Water · Energy · Food coverage of approved projects">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={wefMix} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3} cornerRadius={5}>
              {wefMix.map(w => <Cell key={w.name} fill={w.fill} stroke="white" strokeWidth={2} />)}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 10.5 }} />
          </PieChart>
        </ResponsiveContainer>
      </Panel>
      {sectorCostGap.length > 0 && <Panel title="Investment value vs funding gap" description="Total cost compared with unfunded gap by sector, USD millions" className="lg:col-span-2">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={sectorCostGap} barSize={22} margin={{ top: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-14} textAnchor="end" height={56} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={value => [`$${Number(value)}M`, ""]} />
            <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
            <Bar dataKey="cost" name="Total investment value" fill="#1c2d7a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="gap" name="Funding gap" fill="#17a4c2" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>}
      {selected.length > 0 && <Panel title="Projects in selected category" description="Select a project to open its full detail record" className="lg:col-span-2">
        <div className="grid sm:grid-cols-2 gap-2">
          {selected.map(p => <button key={p.id} className="text-left border border-border rounded-lg p-3 hover:border-[#17a4c2]" onClick={() => setViewing(p)}>
            <div className="font-semibold text-[12.5px] text-[#1c2d7a]">{p.title}</div><div className="text-[11px] text-muted-foreground">{p.province} · {p.readiness}% readiness</div>
          </button>)}
        </div>
      </Panel>}
    </div>
  );
}

export default function InvestorDashboard() {
  const [active, setActive] = useState("overview");
  const { projects: catalogue, loading, refresh } = useCatalogue();
  const { provinces, sectors } = useReferenceData();

  return (
    <DashboardShell
      navItems={NAV_ITEMS}
      active={active}
      onNavigate={setActive}
      title="Investor Workspace"
      subtitle="Pakistan Climate Project Pipeline · Approved catalogue"
    >
      {loading ? (
        <p className="text-[12.5px] text-muted-foreground flex items-center gap-2 py-10 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Loading catalogue from server…</p>
      ) : (
        <>
          {active === "overview" && <OverviewTab catalogue={catalogue} />}
          {active === "catalogue" && <CatalogueTab catalogue={catalogue} provinces={provinces} sectors={sectors} />}
          {active === "saved" && <SavedTab catalogue={catalogue} />}
          {active === "interests" && <InterestsTab catalogue={catalogue} />}
          {active === "analytics" && <AnalyticsTab catalogue={catalogue} />}
        </>
      )}
    </DashboardShell>
  );
}
