import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  LayoutDashboard, LayoutGrid, Bookmark, Handshake, PieChart as PieChartIcon,
  Search, MapPin, Droplets, Sun, Leaf, Loader2,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { DashboardShell, type NavItem } from "./DashboardShell";
import { KpiCard, Panel, StatusBadge } from "./dashboardWidgets";
import { ProjectDetailModal } from "./ProjectDetail";
import { useAuth } from "../lib/auth";
import { PROVINCES, SECTOR_DATA, IMPACT_METRICS, formatUSD, formatNumber } from "../lib/mockData";
import { getProjects, getSaved, toggleSaved, getInterests, addInterest, type StoreProject } from "../lib/store";

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
    setProjects(getProjects().filter(p => p.status === "Approved"));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  return { projects, loading, error, refresh: load };
}

// Loads province/sector reference data from the backend for filter dropdowns.
function useReferenceData() {
  const provinces = PROVINCES.map((p, i) => ({ id: String(i), name: p.name }));
  const sectors = SECTOR_DATA.map((s, i) => ({ id: String(i), name: s.name, color: s.color }));
  return { provinces, sectors };
}

function OverviewTab({ catalogue }: { catalogue: StoreProject[] }) {
  const { user } = useAuth();
  const [savedCount, setSavedCount] = useState(0);
  const [interestCount, setInterestCount] = useState(0);
  useEffect(() => {
    setSavedCount(getSaved(user?.email ?? "investor@pcpp.gov.pk").length);
    setInterestCount(getInterests().filter(i => i.investorEmail === (user?.email ?? "investor@pcpp.gov.pk")).length);
  }, [user?.email]);
  const fundingGap = catalogue.reduce((s, p) => s + p.fundingGapUSD, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={LayoutGrid} label="Approved Opportunities" value={formatNumber(catalogue.length)} sub="Published & investable" />
        <KpiCard icon={Bookmark} label="Saved Projects" value={String(savedCount)} accent="#17a4c2" />
        <KpiCard icon={Handshake} label="Active Interests" value={String(interestCount)} accent="#e8a020" />
        <KpiCard icon={Droplets} label="Funding Gap in View" value={formatUSD(fundingGap)} sub="Across visible catalogue" accent="#2f9e6d" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Opportunities by sector" description="Where approved projects are concentrated">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={SECTOR_DATA} dataKey="count" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                {SECTOR_DATA.map(s => <Cell key={s.name} fill={s.color} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 10.5 }} layout="vertical" verticalAlign="middle" align="right" />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Opportunities by province" description="Geographic spread of the national pipeline">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={PROVINCES} layout="vertical" margin={{ left: 24 }}>
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
            { label: "Total projects", value: formatNumber(IMPACT_METRICS.totalProjects) },
            { label: "Total investment value", value: formatUSD(IMPACT_METRICS.totalCostUSD) },
            { label: "Beneficiaries reached", value: formatNumber(IMPACT_METRICS.beneficiaries) },
            { label: "Jobs supported", value: formatNumber(IMPACT_METRICS.jobs) },
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
  return (
    <div className="bg-white border border-border rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <button onClick={onView} className="h-32 w-full overflow-hidden rounded-lg bg-slate-100" aria-label={`View ${p.title}`}>
        <img src={p.imageUrl} alt={p.title} className="h-full w-full object-cover transition-transform hover:scale-105" />
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
  const [saved, setSaved] = useState<number[]>([]);
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
    setSaved(getSaved(user?.email ?? "investor@pcpp.gov.pk"));
  }, [user?.email]);

  const toggleSave = async (id: number) => {
    if (!user) return;
    setSaved(toggleSaved(user.email, id));
  };

  const sendInterest = async (message: string, commitmentUSD?: number) => {
    if (!user || !viewing) {
      toast.error("Please sign in before expressing interest.");
      return;
    }
    setSending(true);
    try {
      addInterest({ id: Date.now(), projectId: viewing.id, investorEmail: user.email, investorName: user.name, message, commitmentUSD, status: "Awaiting response", createdAt: new Date().toISOString().slice(0, 10), timeline: [{ note: "Interest submitted to project owner.", date: new Date().toISOString().slice(0, 10), by: user.name }] });
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
          <ProjectCard key={p.id} p={p} saved={saved.includes(p.id)} onToggleSave={() => toggleSave(p.id)} onView={() => setViewing(p)} />
        ))}
        {filtered.length === 0 && <p className="text-[12.5px] text-muted-foreground col-span-full text-center py-8">No opportunities match these filters.</p>}
      </div>
      {viewing && (
        <ProjectDetailModal
          project={viewing}
          onClose={() => { setViewing(null); setExpressing(false); }}
          actions={
            sentMsg ? (
              <p className="w-full text-center text-[13px] font-semibold text-[#2f9e6d]">Interest sent — track it under "My Interests".</p>
            ) : expressing ? (
              <ExpressInterestForm project={viewing} onCancel={() => setExpressing(false)} onSend={sendInterest} sending={sending} />
            ) : (
              <button onClick={() => setExpressing(true)} className="w-full bg-[#17a4c2] text-white font-bold text-sm py-2.5 rounded hover:bg-[#1c2d7a]">Express interest</button>
            )
          }
        />
      )}
    </div>
  );
}

function SavedTab({ catalogue }: { catalogue: StoreProject[] }) {
  const { user } = useAuth();
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [viewing, setViewing] = useState<StoreProject | null>(null);
  useEffect(() => { setSavedIds(getSaved(user?.email ?? "investor@pcpp.gov.pk")); }, [user?.email]);
  const projects = catalogue.filter(p => savedIds.includes(p.id));

  return (
    <Panel title="Saved projects" description="Opportunities you have bookmarked for closer review">
      {projects.length === 0 ? (
        <p className="text-[12.5px] text-muted-foreground">No saved projects yet — bookmark opportunities from the catalogue.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <ProjectCard key={p.id} p={p} saved onToggleSave={() => { if (user) setSavedIds(toggleSaved(user.email, p.id)); }} onView={() => setViewing(p)} />
          ))}
        </div>
      )}
      {viewing && <ProjectDetailModal project={viewing} onClose={() => setViewing(null)} />}
    </Panel>
  );
}

function InterestsTab({ catalogue }: { catalogue: StoreProject[] }) {
  const [interests, setInterests] = useState<ReturnType<typeof getInterests>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    setInterests(getInterests());
    setLoading(false);
  }, []);

  const rows = interests.map(i => ({ ...i, project: catalogue.find(p => p.id === i.projectId), projectTitle: catalogue.find(p => p.id === i.projectId)?.title ?? "Project" }));

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
                  <td className="py-2.5 px-3 font-medium text-[#0f172a]">{r.projectTitle}<div className="text-[10.5px] text-muted-foreground">{r.commitmentUSD ? `Proposed: ${formatUSD(r.commitmentUSD)}` : "No amount proposed"}</div></td>
                  <td className="py-2.5 px-3 text-muted-foreground">{r.project?.province ?? "—"}</td>
                  <td className="py-2.5 px-3 font-semibold">{r.project ? formatUSD(r.project.fundingGapUSD) : "—"}</td>
                  <td className="py-2.5 px-3"><StatusBadge status={r.status} /></td>
                  <td className="py-2.5 px-3 text-muted-foreground">{r.createdAt.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.map(r => <div key={`timeline-${r.id}`} className="mt-3 border border-border rounded-lg p-3"><div className="text-[11px] font-bold uppercase tracking-wide text-[#1c2d7a]">{r.projectTitle} interaction timeline</div>{r.timeline.map((event, i) => <div key={i} className="text-[11.5px] text-muted-foreground mt-1">{event.date} · {event.by}: {event.note}</div>)}</div>)}
        </div>
      )}
    </Panel>
  );
}

function AnalyticsTab({ catalogue }: { catalogue: StoreProject[] }) {
  const [selected, setSelected] = useState<StoreProject[]>([]);
  const [viewing, setViewing] = useState<StoreProject | null>(null);
  const readinessBuckets = [
    { name: "0-40%", count: catalogue.filter(p => p.readiness < 40).length, projects: catalogue.filter(p => p.readiness < 40) },
    { name: "40-60%", count: catalogue.filter(p => p.readiness >= 40 && p.readiness < 60).length, projects: catalogue.filter(p => p.readiness >= 40 && p.readiness < 60) },
    { name: "60-80%", count: catalogue.filter(p => p.readiness >= 60 && p.readiness < 80).length, projects: catalogue.filter(p => p.readiness >= 60 && p.readiness < 80) },
    { name: "80-100%", count: catalogue.filter(p => p.readiness >= 80).length, projects: catalogue.filter(p => p.readiness >= 80) },
  ];
  const sectorMix = SECTOR_DATA.map(s => ({ ...s, count: catalogue.filter(p => p.sector === s.name).length, projects: catalogue.filter(p => p.sector === s.name) })).filter(s => s.count > 0);
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
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={sectorMix} dataKey="count" nameKey="name" outerRadius={95} label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`} onClick={data => setSelected(data.projects)}>
              {sectorMix.map(s => <Cell key={s.name} fill={s.color} />)}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 10.5 }} />
          </PieChart>
        </ResponsiveContainer>
      </Panel>
      {selected.length > 0 && <Panel title="Projects in selected category" description="Select a project to open its full detail record" className="lg:col-span-2">
        <div className="grid sm:grid-cols-2 gap-2">
          {selected.map(p => <button key={p.id} className="text-left border border-border rounded-lg p-3 hover:border-[#17a4c2]" onClick={() => setViewing(p)}>
            <div className="font-semibold text-[12.5px] text-[#1c2d7a]">{p.title}</div><div className="text-[11px] text-muted-foreground">{p.province} · {p.readiness}% readiness</div>
          </button>)}
        </div>
      </Panel>}
      {viewing && <ProjectDetailModal project={viewing} onClose={() => setViewing(null)} />}
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
