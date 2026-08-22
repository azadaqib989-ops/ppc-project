// Dummy/mock data for dashboards — relevant to PCPP but not real ministry data.

export type ProjectStatus = "Draft" | "Submitted" | "Under Review" | "Approved" | "Returned";

export interface PipelineProject {
  id: number;
  title: string;
  province: string;
  sector: string;
  wef: ("Water" | "Energy" | "Food")[];
  status: ProjectStatus;
  costUSD: number; // total project cost
  fundingGapUSD: number;
  beneficiaries: number;
  jobs: number;
  readiness: number; // 0-100
  submittedBy: string;
  updated: string; // ISO date
}

export const PROVINCES = [
  { name: "Punjab", projects: 812, fundingGapM: 1240, saturation: "High" as const },
  { name: "Sindh", projects: 654, fundingGapM: 980, saturation: "High" as const },
  { name: "Khyber Pakhtunkhwa", projects: 438, fundingGapM: 610, saturation: "Medium" as const },
  { name: "Balochistan", projects: 296, fundingGapM: 705, saturation: "Low" as const },
  { name: "Azad Jammu & Kashmir", projects: 224, fundingGapM: 340, saturation: "Low" as const },
  { name: "Gilgit-Baltistan", projects: 176, fundingGapM: 265, saturation: "Low" as const },
];

export const SECTOR_DATA = [
  { name: "Water Security", count: 486, color: "#1c2d7a" },
  { name: "Clean Energy", count: 372, color: "#17a4c2" },
  { name: "Food Systems", count: 318, color: "#e8a020" },
  { name: "Ecosystems & Land", count: 264, color: "#2f9e6d" },
  { name: "Climate Adaptation", count: 421, color: "#7c5cd6" },
  { name: "Resilient Infrastructure", count: 739, color: "#c0455f" },
];

export const WEF_NEXUS_SPLIT = [
  { name: "Water", value: 1120, color: "#1c2d7a" },
  { name: "Energy", value: 860, color: "#17a4c2" },
  { name: "Food", value: 620, color: "#e8a020" },
];

export const PIPELINE_TREND = [
  { month: "Sep '25", submitted: 1980, approved: 1690 },
  { month: "Oct '25", submitted: 2080, approved: 1780 },
  { month: "Nov '25", submitted: 2160, approved: 1840 },
  { month: "Dec '25", submitted: 2260, approved: 1910 },
  { month: "Jan '26", submitted: 2340, approved: 1975 },
  { month: "Feb '26", submitted: 2410, approved: 2040 },
  { month: "Mar '26", submitted: 2470, approved: 2100 },
  { month: "Apr '26", submitted: 2520, approved: 2160 },
  { month: "May '26", submitted: 2560, approved: 2210 },
  { month: "Jun '26", submitted: 2585, approved: 2250 },
  { month: "Jul '26", submitted: 2600, approved: 2280 },
  { month: "Aug '26", submitted: 2612, approved: 2305 },
];

export const STATUS_DISTRIBUTION: { name: ProjectStatus; value: number; color: string }[] = [
  { name: "Approved", value: 2305, color: "#2f9e6d" },
  { name: "Under Review", value: 168, color: "#e8a020" },
  { name: "Submitted", value: 94, color: "#17a4c2" },
  { name: "Draft", value: 33, color: "#94a3b8" },
  { name: "Returned", value: 12, color: "#c0455f" },
];

export const IMPACT_METRICS = {
  totalProjects: 2612,
  approvedProjects: 2305,
  totalCostUSD: 18_400_000_000,
  fundingGapUSD: 6_140_000_000,
  beneficiaries: 42_600_000,
  jobs: 318_000,
};

const provincesCycle = PROVINCES.map(p => p.name);
const sectorsCycle = SECTOR_DATA.map(s => s.name);

function seedProjects(count: number, statusPool: ProjectStatus[], startId: number): PipelineProject[] {
  const titles = [
    "Climate-resilient irrigation modernization", "Solar mini-grid for public health facilities",
    "Community watershed restoration", "Coastal mangrove and livelihoods resilience",
    "Mountain flood early-warning system", "Climate-smart food systems corridor",
    "Groundwater recharge and drip irrigation", "Wind-hybrid power for border districts",
    "Urban wastewater reuse for agriculture", "Rangeland restoration and livestock resilience",
    "Riverine flood protection embankment", "Cold-chain storage for smallholder produce",
    "Rooftop solar for rural schools", "Glacial lake outburst flood mitigation",
    "Drought-tolerant seed distribution network", "Industrial energy-efficiency retrofit program",
  ];
  const wefOptions: PipelineProject["wef"][] = [["Water"], ["Energy"], ["Food"], ["Water", "Food"], ["Water", "Energy"], ["Energy", "Food"], ["Water", "Energy", "Food"]];
  const names = ["M. Tariq Bashir", "Sana Iqbal", "Farrukh Zaman", "Ayesha Noor", "Bilal Aslam", "Rukhsana Kareem", "Imran Sheikh", "Zara Hameed"];

  return Array.from({ length: count }, (_, i) => {
    const id = startId + i;
    const cost = Math.round((5 + Math.random() * 120) * 1_000_000);
    return {
      id,
      title: titles[i % titles.length],
      province: provincesCycle[i % provincesCycle.length],
      sector: sectorsCycle[i % sectorsCycle.length],
      wef: wefOptions[i % wefOptions.length],
      status: statusPool[i % statusPool.length],
      costUSD: cost,
      fundingGapUSD: Math.round(cost * (0.25 + Math.random() * 0.5)),
      beneficiaries: Math.round(5_000 + Math.random() * 250_000),
      jobs: Math.round(50 + Math.random() * 4_000),
      readiness: Math.round(35 + Math.random() * 65),
      submittedBy: names[i % names.length],
      updated: new Date(2026, 7 - (i % 6), 1 + (i % 27)).toISOString().slice(0, 10),
    };
  });
}

// Ministry review queue: mix of pending statuses first
export const REVIEW_QUEUE: PipelineProject[] = seedProjects(18, ["Under Review", "Submitted", "Returned", "Draft"], 3001);

// Investor-facing catalogue: approved projects only
export const CATALOGUE_PROJECTS: PipelineProject[] = seedProjects(24, ["Approved"], 4001);

export const RECENT_NOTIFICATIONS = [
  { id: 1, text: "3 new project submissions await ministry review", time: "2h ago" },
  { id: 2, text: "Punjab focal point updated funding gap on 2 projects", time: "5h ago" },
  { id: 3, text: "Investor interest expressed on 'Solar mini-grid for public health facilities'", time: "1d ago" },
  { id: 4, text: "Sindh province pipeline reached 650+ approved projects", time: "2d ago" },
];

export const INVESTOR_SAVED_IDS = [4001, 4004, 4009];
export const INVESTOR_INTERESTS = [
  { id: 4001, status: "Awaiting response", date: "2026-08-12" },
  { id: 4004, status: "In discussion", date: "2026-08-05" },
  { id: 4009, status: "Connected", date: "2026-07-28" },
];

export function formatUSD(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
