import { type ReactNode } from "react";
import { Paperclip, X, Download } from "lucide-react";
import { cn } from "../components/ui/utils";
import type { ProjectAttachment } from "../lib/store";

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
        <div className="text-xl font-bold text-[#0f172a] mt-0.5" style={{ fontFamily: "'Playfair Display', serif" }}>{value}</div>
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
          <h3 className="text-[14px] font-bold text-[#1c2d7a]" style={{ fontFamily: "'Inter', sans-serif" }}>{title}</h3>
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
