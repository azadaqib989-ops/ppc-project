import { type ReactNode } from "react";
import { motion } from "motion/react";
import { Paperclip, X, Download } from "lucide-react";
import { cn } from "../components/ui/utils";
import type { ProjectAttachment } from "../lib/store";

/* ─── Shared chart primitives (consistent look across all dashboards) ─── */

const CHART_FONT = "Arial, sans-serif";

export function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value: number; color: string; dataKey?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-xl shadow-lg shadow-slate-200/50 px-4 py-3 min-w-[140px]"
    >
      {label && <p className="text-[11px] font-bold text-[#1c2d7a] mb-1.5 tracking-wide uppercase">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 text-[11.5px]">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-500">{entry.name}</span>
            <span className="ml-auto font-semibold text-[#0f172a] tabular-nums">{typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function ChartLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload?.length) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-2">
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-[11px] font-medium text-slate-500" style={{ fontFamily: CHART_FONT }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function PieActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
  const sin = Math.sin(-Math.PI / 180 * startAngle);
  const cos = Math.cos(-Math.PI / 180 * startAngle);
  const sin2 = Math.sin(-Math.PI / 180 * endAngle);
  const cos2 = Math.cos(-Math.PI / 180 * endAngle);
  const r = outerRadius + 4;
  const x0 = cx + r * sin;
  const y0 = cy + r * cos;
  const x1 = cx + r * sin2;
  const y1 = cy + r * cos2;
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  const path = `M ${x0},${y0} A ${r},${r} 0 ${largeArcFlag} 1 ${x1},${y1} L ${cx},${cy} Z`;
  return (
    <g>
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#1c2d7a" style={{ fontSize: 22, fontWeight: 700, fontFamily: CHART_FONT }}>
        {`${((percent ?? 0) * 100).toFixed(0)}%`}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#64748b" style={{ fontSize: 11, fontFamily: CHART_FONT }}>
        {payload?.name}
      </text>
      <path d={path} fill={fill} />
    </g>
  );
}

export function KpiCard({
  icon: Icon, label, value, sub, accent = "#1c2d7a",
}: { icon: React.ElementType; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white border border-border rounded-xl p-5 flex items-start gap-4 shadow-sm">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${accent}14` }}>
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide truncate">{label}</div>
        <div className="text-xl font-bold text-[#0f172a] mt-0.5 tabular-nums">{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export function Panel({ title, description, action, children, className }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("bg-white border border-border rounded-xl p-5 shadow-sm", className)}>
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h3 className="text-[14px] font-bold text-[#1c2d7a]">{title}</h3>
          {description && <p className="text-[11.5px] text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Approved: "bg-[#e7f5ee] text-[#2f9e6d]",
    "Under Review": "bg-[#fdf3e2] text-[#b7791f]",
    Submitted: "bg-[#e6f6fa] text-[#17a4c2]",
    Draft: "bg-slate-100 text-slate-500",
    Returned: "bg-[#fbe9ec] text-[#c0455f]",
    "Awaiting response": "bg-[#fdf3e2] text-[#b7791f]",
    "In discussion": "bg-[#e6f6fa] text-[#17a4c2]",
    Connected: "bg-[#e7f5ee] text-[#2f9e6d]",
    Declined: "bg-[#fbe9ec] text-[#c0455f]",
  };
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold", map[status] || "bg-slate-100 text-slate-500")}>{status}</span>;
}

export function SaturationBadge({ level }: { level: "High" | "Medium" | "Low" }) {
  const map = { High: "bg-[#fbe9ec] text-[#c0455f]", Medium: "bg-[#fdf3e2] text-[#b7791f]", Low: "bg-[#e7f5ee] text-[#2f9e6d]" };
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold", map[level])}>{level} concentration</span>;
}

// ─── Attachments (used by submission wizard, reviews, comments, updates) ──
export function filesToAttachments(files: FileList | null, uploadedBy: string): Promise<ProjectAttachment[]> {
  if (!files || files.length === 0) return Promise.resolve([]);
  const jobs = Array.from(files).map(
    (file, i) =>
      new Promise<ProjectAttachment>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          resolve({
            id: Date.now() + i,
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size,
            dataUrl: reader.result as string,
            uploadedBy,
            date: new Date().toISOString().slice(0, 10),
          });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      })
  );
  return Promise.all(jobs);
}

export function AttachmentPicker({ label = "Attach files", onAdd }: { label?: string; onAdd: (files: FileList) => void }) {
  return (
    <label className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#1c2d7a] bg-[#eef0f9] px-3 py-1.5 rounded cursor-pointer hover:bg-[#1c2d7a] hover:text-white transition-colors w-fit">
      <Paperclip className="w-3.5 h-3.5" /> {label}
      <input
        type="file"
        multiple
        className="hidden"
        onChange={e => {
          if (e.target.files && e.target.files.length > 0) onAdd(e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}

export function AttachmentList({ attachments, onRemove, dense }: { attachments: ProjectAttachment[]; onRemove?: (id: number) => void; dense?: boolean }) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {attachments.map(a => (
        <div key={a.id} className={cn("flex items-center justify-between gap-2 bg-[#f4f7fb] border border-border rounded-lg px-2.5", dense ? "py-1 text-[11px]" : "py-1.5 text-[11.5px]")}>
          <a href={a.dataUrl} download={a.name} className="flex items-center gap-1.5 text-[#1c2d7a] font-semibold hover:underline truncate min-w-0">
            <Download className="w-3 h-3 shrink-0" />
            <span className="truncate">{a.name}</span>
            <span className="text-muted-foreground font-normal whitespace-nowrap">({(a.size / 1024).toFixed(0)} KB)</span>
          </a>
          {onRemove ? (
            <button onClick={() => onRemove(a.id)} className="text-muted-foreground hover:text-[#c0455f] shrink-0"><X className="w-3 h-3" /></button>
          ) : (
            <span className="text-muted-foreground whitespace-nowrap shrink-0">{a.uploadedBy} · {a.date}</span>
          )}
        </div>
      ))}
    </div>
  );
}
