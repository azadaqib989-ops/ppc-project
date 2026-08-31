import { useEffect, useState, type ReactNode } from "react";
import { X, MapPin, Droplets, Sun, Leaf, Clock, CalendarDays, Building2, User, Mail, Phone, FileText, AlertTriangle } from "lucide-react";
import { StatusBadge, AttachmentList } from "./dashboardWidgets";
import { formatUSD, formatNumber } from "../lib/mockData";
import type { StoreProject } from "../lib/store";
import { getProgressUpdates, getStatusHistory, mapProgressUpdate, mapStatusHistory } from "../lib/api";

const wefIcon = { Water: Droplets, Energy: Sun, Food: Leaf } as const;

// Shared, detailed project view used across the ministry, focal-point and investor
// experiences — evidence, WEF-Nexus tags, status history and progress updates.
export function ProjectDetailModal({ project, onClose, actions }: { project: StoreProject; onClose: () => void; actions?: ReactNode }) {
  const [liveProject, setLiveProject] = useState(project);

  useEffect(() => {
    setLiveProject(project);
    if (!project.apiId) return;
    Promise.all([getStatusHistory(project.apiId), getProgressUpdates(project.apiId)])
      .then(([history, updates]) => setLiveProject(current => ({
        ...current,
        statusHistory: mapStatusHistory(history),
        progressUpdates: updates.map(mapProgressUpdate),
      })))
      .catch(() => { /* keep the project summary visible if optional detail calls fail */ });
  }, [project]);

  const displayedProject = liveProject;
  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[88vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
        <div className="h-1.5 w-full bg-gradient-to-r from-[#1c2d7a] via-[#17a4c2] to-[#e8a020]" />
        <button onClick={onClose} className="absolute top-5 right-5 text-muted-foreground hover:text-foreground bg-white rounded-full p-1"><X className="w-4 h-4" /></button>

        <div className="p-6 sm:p-7">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <StatusBadge status={displayedProject.status} />
            {displayedProject.wef.map(w => {
              const Icon = wefIcon[w];
              return <span key={w} className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide bg-[#eef0f9] text-[#1c2d7a] px-2 py-0.5 rounded"><Icon className="w-3 h-3" />{w}</span>;
            })}
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-[#1c2d7a] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>{displayedProject.title}</h3>
          <p className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground mb-4"><MapPin className="w-3.5 h-3.5" /> {displayedProject.province}{displayedProject.district ? ` · ${displayedProject.district}` : ""} · {displayedProject.sector}</p>
          {(displayedProject.primarySector || displayedProject.secondarySector || displayedProject.sdgs?.length) && <p className="text-[11.5px] text-muted-foreground mb-4">Primary sector: <strong>{displayedProject.primarySector ?? displayedProject.sector}</strong>{displayedProject.secondarySector ? ` · Secondary: ${displayedProject.secondarySector}` : ""}{displayedProject.sdgs?.length ? ` · SDGs: ${displayedProject.sdgs.join(", ")}` : ""}</p>}
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">{displayedProject.summary}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              ["Total cost", formatUSD(displayedProject.costUSD)], ["Funding gap", formatUSD(displayedProject.fundingGapUSD)],
              ["Co-financing", displayedProject.coFinancingUSD ? formatUSD(displayedProject.coFinancingUSD) : "—"],
              ["Beneficiaries", formatNumber(displayedProject.beneficiaries)], ["Jobs supported", formatNumber(displayedProject.jobs)],
            ].map(([label, value]) => (
              <div key={label} className="bg-[#f4f7fb] rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
                <div className="text-[13px] font-bold text-[#1c2d7a]">{value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-[12px]">
            {displayedProject.startDate && (
              <div className="flex items-start gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" /><div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Start date</div><div className="font-semibold text-[#0f172a]">{displayedProject.startDate}</div></div></div>
            )}
            {displayedProject.endDate && (
              <div className="flex items-start gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" /><div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">End date</div><div className="font-semibold text-[#0f172a]">{displayedProject.endDate}</div></div></div>
            )}
            {displayedProject.implementingAgency && (
              <div className="flex items-start gap-1.5"><Building2 className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" /><div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Implementing agency</div><div className="font-semibold text-[#0f172a]">{project.implementingAgency}</div></div></div>
            )}
            {displayedProject.contactName && (
              <div className="flex items-start gap-1.5"><User className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" /><div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Focal contact</div><div className="font-semibold text-[#0f172a]">{project.contactName}</div></div></div>
            )}
            {displayedProject.contactEmail && (
              <div className="flex items-start gap-1.5"><Mail className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" /><div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Email</div><div className="font-semibold text-[#0f172a] break-all">{project.contactEmail}</div></div></div>
            )}
            {displayedProject.contactPhone && (
              <div className="flex items-start gap-1.5"><Phone className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" /><div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Phone</div><div className="font-semibold text-[#0f172a]">{project.contactPhone}</div></div></div>
            )}
          </div>

          {displayedProject.riskNotes && (
            <div className="mb-6 bg-[#fdf3e2] border border-[#f2d9a8] rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-[#b7791f] mt-0.5 shrink-0" />
              <div><div className="text-[11px] font-bold uppercase tracking-wide text-[#b7791f] mb-0.5">Risks & mitigation notes</div><p className="text-[12px] text-[#7a5a15]">{displayedProject.riskNotes}</p></div>
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Readiness</span>
              <span className="text-[11px] font-bold text-[#1c2d7a]" title="Demo score based on completeness of project scope, cost, timeline, contacts, WEF tags and supporting evidence">{displayedProject.readiness}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-[#17a4c2]" style={{ width: `${displayedProject.readiness}%` }} />
            </div>
            <p className="text-[10.5px] text-muted-foreground mt-1.5">Demo readiness score: completeness of scope, financials, timeline, ownership, WEF linkage and evidence. Ministry review may raise it after updates.</p>
          </div>

          <div className="mb-6">
            <h4 className="text-[12.5px] font-bold text-[#1c2d7a] mb-3 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Status history</h4>
            <div className="space-y-3 border-l-2 border-[#eef0f9] pl-4">
              {displayedProject.statusHistory.map((h, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#17a4c2]" />
                  <div className="flex items-center gap-2 mb-0.5">
                    <StatusBadge status={h.status} />
                    <span className="text-[11px] text-muted-foreground">{h.date} · {h.by}</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground mb-1.5">{h.note}</p>
                  {h.attachments && h.attachments.length > 0 && <AttachmentList attachments={h.attachments} dense />}
                </div>
              ))}
            </div>
          </div>

          {displayedProject.attachments.length > 0 && (
            <div className="mb-6">
              <h4 className="text-[12.5px] font-bold text-[#1c2d7a] mb-3 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Documents & attachments</h4>
              <AttachmentList attachments={displayedProject.attachments} />
            </div>
          )}

          {displayedProject.progressUpdates.length > 0 && (
            <div className="mb-6">
              <h4 className="text-[12.5px] font-bold text-[#1c2d7a] mb-3">Progress updates</h4>
              <div className="space-y-2">
                {displayedProject.progressUpdates.map(u => (
                  <div key={u.id} className="bg-[#f4f7fb] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-semibold text-[#0f172a]">{u.author}</span>
                      <span className="text-[10.5px] text-muted-foreground">{u.date}</span>
                    </div>
                    <p className="text-[12px] text-muted-foreground mb-1.5">{u.text}</p>
                    {u.attachments && u.attachments.length > 0 && <AttachmentList attachments={u.attachments} dense />}
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
