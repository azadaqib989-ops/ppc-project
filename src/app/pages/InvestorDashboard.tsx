import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, LayoutGrid, Bookmark, Handshake, PieChart as PieChartIcon,
  Search, MapPin, Droplets, Sun, Leaf,
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
import {
  getProjects, getSaved, toggleSaved, getInterests, addInterest,
  type StoreProject, type InvestorInterest,
} from "../lib/store";

const NAV_ITEMS: NavItem[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "catalogue", label: "Project Catalogue", icon: LayoutGrid },
  { key: "saved", label: "Saved Projects", icon: Bookmark },
  { key: "interests", label: "My Interests", icon: Handshake },
  { key: "analytics", label: "Opportunity Analytics", icon: PieChartIcon },
];

function useCatalogue() {
  const [projects, setProjects] = useState<StoreProject[]>([]);
  useEffect(() => { setProjects(getProjects().filter(p => p.status === "Approved")); }, []);
  return projects;
}

function OverviewTab({ catalogue }: { catalogue: StoreProject[] }) {
  const { user } = useAuth();
  const saved = user ? getSaved(user.email) : [];
  const interests = getInterests().filter(i => i.investorEmail === user?.email);
  const fundingGap = catalogue.reduce((s, p) => s + p.fundingGapUSD, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={LayoutGrid} label="Approved Opportunities" value={formatNumber(catalogue.length)} sub="Published & investable" />
        <KpiCard icon={Bookmark} label="Saved Projects" value={String(saved.length)} accent="#17a4c2" />
        <KpiCard icon={Handshake} label="Active Interests" value={String(interests.length)} accent="#e8a020" />
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

function ExpressInterestForm({ project, onCancel, onSend }: { project: StoreProject; onCancel: () => void; onSend: (msg: string) => void }) {
  const [message, setMessage] = useState(`We are interested in learning more about "${project.title}" — please share the current procurement timeline and co-financing options.`);
  return (
    <div className="w-full space-y-2">
      <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
        className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb] focus:outline-none focus:ring-2 focus:ring-[#1c2d7a]/15" />
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 text-[12.5px] font-semibold py-2 rounded border border-border hover:bg-slate-50">Cancel</button>
        <button onClick={() => onSend(message)} className="flex-1 bg-[#17a4c2] text-white font-bold text-sm py-2 rounded hover:bg-[#1c2d7a]">Send interest</button>
      </div>
    </div>
  );
}

function CatalogueTab({ catalogue }: { catalogue: StoreProject[] }) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [province, setProvince] = useState("All");
  const [sector, setSector] = useState("All");
  const [saved, setSaved] = useState<number[]>(user ? getSaved(user.email) : []);
  const [viewing, setViewing] = useState<StoreProject | null>(null);
  const [expressing, setExpressing] = useState(false);
  const [sentMsg, setSentMsg] = useState(false);

  const filtered = useMemo(() => catalogue.filter(p =>
    (province === "All" || p.province === province) &&
    (sector === "All" || p.sector === sector) &&
    p.title.toLowerCase().includes(query.toLowerCase())
  ), [catalogue, query, province, sector]);

  const toggleSave = (id: number) => {
    if (!user) return;
    setSaved(toggleSaved(user.email, id));
  };

  const sendInterest = (message: string) => {
    if (!user || !viewing) return;
    const interest: InvestorInterest = {
      id: Date.now(),
      projectId: viewing.id,
      investorEmail: user.email,
      investorName: user.name,
      message,
      status: "Awaiting response",
      createdAt: new Date().toISOString().slice(0, 10),
      timeline: [{ note: "Interest submitted to project owner.", date: new Date().toISOString().slice(0, 10), by: user.name }],
    };
    addInterest(interest);
    setExpressing(false);
    setSentMsg(true);
    setTimeout(() => { setSentMsg(false); setViewing(null); }, 1400);
  };

  return (
    <div className="space-y-4">
      <Panel title="Filter the catalogue" description="Narrow ~2,600 national projects to what matters for your mandate">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search projects…"
              className="pl-8 pr-3 py-2 text-[12.5px] border border-border rounded-lg bg-[#f4f7fb] w-full focus:outline-none focus:ring-2 focus:ring-[#1c2d7a]/15" />
          </div>
          <select value={province} onChange={e => setProvince(e.target.value)} className="px-3 py-2 text-[12.5px] border border-border rounded-lg bg-[#f4f7fb]">
            <option>All</option>
            {PROVINCES.map(p => <option key={p.name}>{p.name}</option>)}
          </select>
          <select value={sector} onChange={e => setSector(e.target.value)} className="px-3 py-2 text-[12.5px] border border-border rounded-lg bg-[#f4f7fb]">
            <option>All</option>
            {SECTOR_DATA.map(s => <option key={s.name}>{s.name}</option>)}
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
              <ExpressInterestForm project={viewing} onCancel={() => setExpressing(false)} onSend={sendInterest} />
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
  const [saved, setSaved] = useState<number[]>(user ? getSaved(user.email) : []);
  const projects = catalogue.filter(p => saved.includes(p.id));

  return (
    <Panel title="Saved projects" description="Opportunities you have bookmarked for closer review">
      {projects.length === 0 ? (
        <p className="text-[12.5px] text-muted-foreground">No saved projects yet — bookmark opportunities from the catalogue.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <ProjectCard key={p.id} p={p} saved onToggleSave={() => user && setSaved(toggleSaved(user.email, p.id))} onView={() => {}} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function InterestsTab({ catalogue }: { catalogue: StoreProject[] }) {
  const { user } = useAuth();
  const [interests, setInterests] = useState<InvestorInterest[]>([]);
  useEffect(() => { setInterests(getInterests().filter(i => i.investorEmail === user?.email)); }, [user]);

  const rows = interests.map(i => ({ ...i, project: catalogue.find(p => p.id === i.projectId) }));

  return (
    <Panel title="My investor interests" description="Track the conversations you've started with project owners">
      {rows.length === 0 ? (
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
              {rows.map(r => r.project && (
                <tr key={r.id} className="border-b border-border hover:bg-[#f9fafc]">
                  <td className="py-2.5 px-3 font-medium text-[#0f172a]">{r.project.title}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{r.project.province}</td>
                  <td className="py-2.5 px-3 font-semibold">{formatUSD(r.project.fundingGapUSD)}</td>
                  <td className="py-2.5 px-3"><StatusBadge status={r.status} /></td>
                  <td className="py-2.5 px-3 text-muted-foreground">{r.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function AnalyticsTab({ catalogue }: { catalogue: StoreProject[] }) {
  const readinessBuckets = [
    { name: "0-40%", count: catalogue.filter(p => p.readiness < 40).length },
    { name: "40-60%", count: catalogue.filter(p => p.readiness >= 40 && p.readiness < 60).length },
    { name: "60-80%", count: catalogue.filter(p => p.readiness >= 60 && p.readiness < 80).length },
    { name: "80-100%", count: catalogue.filter(p => p.readiness >= 80).length },
  ];
  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <Panel title="Readiness distribution" description="How investable the current catalogue is, at a glance">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={readinessBuckets}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="count" fill="#1c2d7a" radius={[4, 4, 0, 0]} name="Projects" />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
      <Panel title="Sector opportunity mix" description="Approved projects by sector">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={SECTOR_DATA} dataKey="count" nameKey="name" outerRadius={95} label={({ name, percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}>
              {SECTOR_DATA.map(s => <Cell key={s.name} fill={s.color} />)}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 10.5 }} />
          </PieChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}

export default function InvestorDashboard() {
  const [active, setActive] = useState("overview");
  const catalogue = useCatalogue();

  return (
    <DashboardShell
      navItems={NAV_ITEMS}
      active={active}
      onNavigate={setActive}
      title="Investor Workspace"
      subtitle="Pakistan Climate Project Pipeline · Approved catalogue"
    >
      {active === "overview" && <OverviewTab catalogue={catalogue} />}
      {active === "catalogue" && <CatalogueTab catalogue={catalogue} />}
      {active === "saved" && <SavedTab catalogue={catalogue} />}
      {active === "interests" && <InterestsTab catalogue={catalogue} />}
      {active === "analytics" && <AnalyticsTab catalogue={catalogue} />}
    </DashboardShell>
  );
}
