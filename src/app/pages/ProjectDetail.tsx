import { type ReactNode } from "react";
import { X, MapPin, Droplets, Sun, Leaf, Clock } from "lucide-react";
import { StatusBadge } from "./dashboardWidgets";
import { formatUSD, formatNumber } from "../lib/mockData";
import type { StoreProject } from "../lib/store";

const wefIcon = { Water: Droplets, Energy: Sun, Food: Leaf } as const;

// Shared, detailed project view used across the ministry, focal-point and investor
// experiences — evidence, WEF-Nexus tags, status history and progress updates.
export function ProjectDetailModal({ project, onClose, actions }: { project: StoreProject; onClose: () => void; actions?: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[88vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
        <div className="h-1.5 w-full bg-gradient-to-r from-[#1c2d7a] via-[#17a4c2] to-[#e8a020]" />
        <button onClick={onClose} className="absolute top-5 right-5 text-muted-foreground hover:text-foreground bg-white rounded-full p-1"><X className="w-4 h-4" /></button>

        <div className="p-6 sm:p-7">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <StatusBadge status={project.status} />
            {project.wef.map(w => {
              const Icon = wefIcon[w];
              return <span key={w} className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide bg-[#eef0f9] text-[#1c2d7a] px-2 py-0.5 rounded"><Icon className="w-3 h-3" />{w}</span>;
            })}
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-[#1c2d7a] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>{project.title}</h3>
          <p className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground mb-4"><MapPin className="w-3.5 h-3.5" /> {project.province} · {project.sector}</p>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">{project.summary}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              ["Total cost", formatUSD(project.costUSD)], ["Funding gap", formatUSD(project.fundingGapUSD)],
              ["Beneficiaries", formatNumber(project.beneficiaries)], ["Jobs supported", formatNumber(project.jobs)],
            ].map(([label, value]) => (
              <div key={label} className="bg-[#f4f7fb] rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
                <div className="text-[13px] font-bold text-[#1c2d7a]">{value}</div>
              </div>
            ))}
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Readiness</span>
              <span className="text-[11px] font-bold text-[#1c2d7a]">{project.readiness}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-[#17a4c2]" style={{ width: `${project.readiness}%` }} />
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-[12.5px] font-bold text-[#1c2d7a] mb-3 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Status history</h4>
            <div className="space-y-3 border-l-2 border-[#eef0f9] pl-4">
              {project.statusHistory.map((h, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#17a4c2]" />
                  <div className="flex items-center gap-2 mb-0.5">
                    <StatusBadge status={h.status} />
                    <span className="text-[11px] text-muted-foreground">{h.date} · {h.by}</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground">{h.note}</p>
                </div>
              ))}
            </div>
          </div>

          {project.progressUpdates.length > 0 && (
            <div className="mb-6">
              <h4 className="text-[12.5px] font-bold text-[#1c2d7a] mb-3">Progress updates</h4>
              <div className="space-y-2">
                {project.progressUpdates.map(u => (
                  <div key={u.id} className="bg-[#f4f7fb] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-semibold text-[#0f172a]">{u.author}</span>
                      <span className="text-[10.5px] text-muted-foreground">{u.date}</span>
                    </div>
                    <p className="text-[12px] text-muted-foreground">{u.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {actions && <div className="pt-2 border-t border-border flex flex-col sm:flex-row gap-2.5">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
