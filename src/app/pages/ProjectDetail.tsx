import { useEffect, useState, type ReactNode } from "react";
import { X, ArrowLeft, MapPin, Droplets, Sun, Leaf, CalendarDays, Building2, User, Mail, Phone, FileText, AlertTriangle, Users, Wallet, Target, Link as LinkIcon, ExternalLink, Clock, MessageSquare } from "lucide-react";
import { StatusBadge, AttachmentList } from "./dashboardWidgets";
import { formatUSD, formatNumber } from "../lib/mockData";
import type { StoreProject } from "../lib/store";
import { getProgressUpdates, getStatusHistory, getProjectComments, mapProgressUpdate, mapStatusHistory, downloadFile, fetchFileDataUrl, type ApiComment } from "../lib/api";

const wefIcon = { Water: Droplets, Energy: Sun, Food: Leaf } as const;

function commentAttachments(comment: ApiComment) {
  return (comment.attachments ?? []).map(attachment => ({
    id: typeof attachment === "string" ? attachment : attachment.id,
    name: typeof attachment === "string" ? "Comment attachment" : attachment.fileName,
    type: typeof attachment === "string" ? "application/octet-stream" : attachment.mimeType,
    size: typeof attachment === "string" ? 0 : attachment.sizeBytes,
    dataUrl: downloadFile(typeof attachment === "string" ? attachment : attachment.id),
    uploadedBy: comment.userName,
    date: comment.createdAt.slice(0, 10),
  }));
}

function InvestorSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: ReactNode }) {
  return <section className="border-t border-slate-200 pt-6"><h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-[#1c2d7a] mb-4"><span className="w-8 h-8 rounded-lg bg-[#eef0f9] flex items-center justify-center"><Icon className="w-4 h-4" /></span>{title}</h2>{children}</section>;
}

function InvestorValue({ label, value }: { label: string; value?: ReactNode }) {
  return <div className="bg-[#f5f8fb] border border-slate-100 rounded-lg p-3"><div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">{label}</div><div className="text-[13px] font-semibold text-[#0f172a] break-words">{value || "Not provided"}</div></div>;
}

export function ProjectDetailPage({ project, onBack, actions, showComments = true }: { project: StoreProject; onBack: () => void; actions?: ReactNode; showComments?: boolean }) {
  const details = project.extendedDetails;
  const [mediaProject, setMediaProject] = useState(project);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(Boolean(project.apiId));
  useEffect(() => {
    setMediaProject(project);
    const protectedAttachments = project.attachments.filter(attachment => typeof attachment.id === "string" && attachment.dataUrl.includes("/files/"));
    if (protectedAttachments.length > 0) {
      Promise.all(protectedAttachments.map(async attachment => ({ ...attachment, dataUrl: await fetchFileDataUrl(String(attachment.id)) })))
        .then(hydrated => setMediaProject(current => ({ ...current, attachments: current.attachments.map(attachment => hydrated.find(item => item.id === attachment.id) ?? attachment) })))
        .catch(() => { /* leave the authenticated download link available */ });
    }
    if (!project.apiId || !showComments) {
      setComments([]);
      setCommentsLoading(false);
      return;
    }
    setCommentsLoading(true);
    getProjectComments(project.apiId).then(setComments).catch(() => setComments([])).finally(() => setCommentsLoading(false));
  }, [project, showComments]);
  const displayAttachments = mediaProject.attachments;
  const coverAttachment = displayAttachments.find(attachment => attachment.type.startsWith("image/"));
  const displayCover = mediaProject.coverImageUrl?.includes("/files/") ? coverAttachment?.dataUrl || mediaProject.coverImageUrl : mediaProject.coverImageUrl || coverAttachment?.dataUrl || mediaProject.imageUrl;
  const location = [details?.address, details?.city, project.district, project.province].filter(Boolean).join(", ");
  return <div className="min-h-full bg-[#f7f9fc] -m-4 sm:-m-6 lg:-m-8">
    <header className="relative isolate min-h-[430px] overflow-hidden bg-[#10264b] text-white sm:min-h-[500px]">
      {displayCover && <img src={displayCover} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,25,53,.94)_0%,rgba(9,25,53,.73)_44%,rgba(9,25,53,.25)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(9,25,53,.9)_0%,transparent_55%)]" />
      <div className="relative mx-auto flex min-h-[430px] max-w-6xl flex-col justify-between px-5 py-7 sm:min-h-[500px] sm:px-8 sm:py-10 lg:px-12">
        <button onClick={onBack} className="inline-flex w-fit items-center gap-2 text-[12px] font-semibold text-white/80 transition-colors hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to projects</button>
        <div className="max-w-3xl pb-2 sm:pb-4">
          <div className="mb-4 flex flex-wrap gap-2"><StatusBadge status={project.status} />{project.wef.map(w => { const Icon = wefIcon[w] ?? Target; return <span key={w} className="inline-flex items-center gap-1 rounded bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm"><Icon className="h-3 w-3" />{w}</span>; })}</div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7ee1e8]">Approved investment opportunity</p>
          <h1 className="max-w-3xl text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl" style={{ fontFamily: "'Playfair Display', serif" }}>{project.title}</h1>
          <p className="mt-5 flex items-center gap-2 text-sm text-white/80"><MapPin className="h-4 w-4 shrink-0 text-[#7ee1e8]" />{location || project.province} <span className="text-white/40">·</span> {project.sector}</p>
        </div>
      </div>
    </header>
    <main className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-12 py-8 sm:py-10 space-y-8">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3"><InvestorValue label="Total cost" value={formatUSD(project.costUSD)} /><InvestorValue label="Funding gap" value={formatUSD(project.fundingGapUSD)} /><InvestorValue label="Expected ROI" value={details?.expectedRoi !== undefined ? `${details.expectedRoi}%` : undefined} /><InvestorValue label="Readiness" value={`${project.readiness}%`} /></div>
      <InvestorSection title="Project overview" icon={Target}><div className="space-y-4"><div><div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Abstract</div><p className="text-sm leading-7 text-slate-700">{details?.abstract || project.summary}</p></div>{details?.fullDescription && <div><div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Full description</div><p className="text-sm leading-7 text-slate-700 whitespace-pre-line">{details.fullDescription}</p></div>}<div className="flex flex-wrap gap-2 text-[11px]">{[project.primarySector && `Primary sector: ${project.primarySector}`, details?.subSectors?.length && `Sub-sectors: ${details.subSectors.join(", ")}`, details?.sdgGoals?.length && `SDGs: ${details.sdgGoals.join(", ")}`, details?.trl && `TRL: ${details.trl}`].filter(Boolean).map(item => <span key={String(item)} className="rounded-full bg-[#eef0f9] px-3 py-1.5 font-semibold text-[#1c2d7a]">{item}</span>)}</div></div></InvestorSection>
      <InvestorSection title="Location and timeline" icon={MapPin}><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3"><InvestorValue label="Province" value={project.province} /><InvestorValue label="District / city" value={[project.district, details?.city].filter(Boolean).join(" / ")} /><InvestorValue label="Address" value={details?.address} /><InvestorValue label="Coordinates" value={details?.latitude !== undefined && details?.longitude !== undefined ? `${details.latitude}, ${details.longitude}` : undefined} /><InvestorValue label="Start date" value={project.startDate} /><InvestorValue label="Expected completion" value={project.endDate} /><InvestorValue label="Duration" value={details?.durationMonths ? `${details.durationMonths} months` : undefined} /></div></InvestorSection>
      <InvestorSection title="Financial information" icon={Wallet}><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3"><InvestorValue label="Currency" value={details?.currency} /><InvestorValue label="Research fund" value={details?.researchFund !== undefined ? formatUSD(details.researchFund) : undefined} /><InvestorValue label="Equity fund" value={details?.equityFund !== undefined ? formatUSD(details.equityFund) : undefined} /><InvestorValue label="Debt / loan" value={details?.debtLoan !== undefined ? formatUSD(details.debtLoan) : undefined} /><InvestorValue label="Grant amount" value={details?.grantAmount !== undefined ? formatUSD(details.grantAmount) : undefined} /><InvestorValue label="Minimum investment" value={details?.minimumInvestment !== undefined ? formatUSD(details.minimumInvestment) : undefined} /><InvestorValue label="Payback period" value={details?.paybackPeriodMonths ? `${details.paybackPeriodMonths} months` : undefined} /><InvestorValue label="Co-financing" value={project.coFinancingUSD ? formatUSD(project.coFinancingUSD) : undefined} /></div></InvestorSection>
      <InvestorSection title="Impact" icon={Leaf}><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3"><InvestorValue label="Direct beneficiaries" value={details?.directBeneficiaries !== undefined ? formatNumber(details.directBeneficiaries) : formatNumber(project.beneficiaries)} /><InvestorValue label="Indirect beneficiaries" value={details?.indirectBeneficiaries !== undefined ? formatNumber(details.indirectBeneficiaries) : undefined} /><InvestorValue label="Jobs created" value={formatNumber(project.jobs)}></InvestorValue></div>{details?.additionalImpactMetrics?.length ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">{details.additionalImpactMetrics.map((metric, index) => <InvestorValue key={`${metric.name}-${index}`} label={metric.name} value={`${metric.value}${metric.unit ? ` ${metric.unit}` : ""}`} />)}</div> : null}</InvestorSection>
      <InvestorSection title="Organization and stakeholders" icon={Building2}><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3"><InvestorValue label="Organization" value={details?.organizationName || project.implementingAgency} /><InvestorValue label="Organization type" value={details?.organizationType} /><InvestorValue label="Website" value={details?.organizationWebsite} />{details?.projectLead && <InvestorValue label="Project lead" value={[details.projectLead.name, details.projectLead.designation, details.projectLead.email].filter(Boolean).join(" · ")} />}</div>{details?.teamMembers?.length ? <div className="mt-5"><h3 className="text-xs font-bold text-slate-700 mb-2">Team members</h3><div className="grid sm:grid-cols-2 gap-2">{details.teamMembers.map((member, index) => <InvestorValue key={`${member.name}-${index}`} label={member.lead ? "Lead" : member.designation || "Team member"} value={[member.name, member.email, member.phone, member.website].filter(Boolean).join(" · ")} />)}</div></div> : null}{details?.shareholders?.length ? <div className="mt-5"><h3 className="text-xs font-bold text-slate-700 mb-2">Shareholders</h3><div className="grid sm:grid-cols-2 gap-2">{details.shareholders.map((holder, index) => <InvestorValue key={`${holder.name}-${index}`} label={holder.type || "Shareholder"} value={[holder.name, holder.sharePercentage !== undefined && `${holder.sharePercentage}%`, holder.investmentAmount !== undefined && formatUSD(holder.investmentAmount), holder.status].filter(Boolean).join(" · ")} />)}</div></div> : null}</InvestorSection>
      <InvestorSection title="Contacts and risk notes" icon={Phone}><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3"><InvestorValue label="Contact name" value={project.contactName} /><InvestorValue label="Contact email" value={project.contactEmail} /><InvestorValue label="Contact phone" value={project.contactPhone} /><InvestorValue label="Implementing agency" value={project.implementingAgency} /></div>{project.riskNotes && <p className="mt-3 rounded-lg bg-[#fdf3e2] p-3 text-sm leading-6 text-[#7a5a15]"><strong>Risks and mitigation:</strong> {project.riskNotes}</p>}</InvestorSection>
      <InvestorSection title="Future plans and supporting information" icon={FileText}>{details?.futurePlans?.length ? <div className="space-y-2 mb-5">{details.futurePlans.map((plan, index) => <div key={`${plan.title}-${index}`} className="border-l-2 border-[#17a4c2] pl-3"><p className="text-sm font-semibold text-slate-800">{plan.phaseName} · {plan.title}</p><p className="text-xs text-slate-600">{[plan.timeline, plan.description, plan.estimatedCost !== undefined && formatUSD(plan.estimatedCost)].filter(Boolean).join(" · ")}</p></div>)}</div> : null}<div className="grid sm:grid-cols-2 gap-2">{details?.documents?.map((doc, index) => <InvestorValue key={`doc-${index}`} label={doc.documentType || "Document"} value={<span className="inline-flex items-center gap-1">{doc.url ? <a href={doc.url} target="_blank" rel="noreferrer" className="text-[#17a4c2] hover:underline">{doc.filename} <ExternalLink className="inline w-3 h-3" /></a> : doc.filename}</span>} />)}{details?.videos?.map((video, index) => <InvestorValue key={`video-${index}`} label={`Video · ${video.duration || ""}`} value={<a href={video.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#17a4c2] hover:underline">{video.title}<ExternalLink className="w-3 h-3" /></a>} />)}</div>{details?.tags?.length ? <p className="text-xs text-slate-600 mt-4"><strong>Tags:</strong> {details.tags.join(", ")}</p> : null}{details?.relatedProjectIds?.length ? <p className="text-xs text-slate-600 mt-2"><strong>Related projects:</strong> {details.relatedProjectIds.join(", ")}</p> : null}{details?.infographicUrl && <a href={details.infographicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#17a4c2] mt-3 hover:underline">View infographic <ExternalLink className="w-3 h-3" /></a>}</InvestorSection>
      {displayAttachments.length > 0 && <InvestorSection title="Uploaded files" icon={FileText}><AttachmentList attachments={displayAttachments} /></InvestorSection>}
      {showComments && <InvestorSection title="Project comments" icon={MessageSquare}><div className="space-y-3">{commentsLoading ? <p className="text-sm text-slate-500">Loading comments...</p> : comments.length === 0 ? <p className="text-sm text-slate-500">No comments yet.</p> : comments.map(comment => <div key={comment.id} className="bg-[#f5f8fb] rounded-lg p-3"><div className="flex items-center justify-between gap-3"><span className="text-[12px] font-semibold text-slate-800">{comment.userName}</span><span className="text-[10.5px] text-slate-500">{comment.createdAt.slice(0, 10)}</span></div><p className="text-sm text-slate-700 mt-1 whitespace-pre-line">{comment.text}</p><AttachmentList attachments={commentAttachments(comment)} dense /></div>)}</div></InvestorSection>}
      {actions && <div className="border-t border-slate-200 pt-6">{actions}</div>}
    </main>
  </div>;
}
// Shared, detailed project view used across the ministry, focal-point and investor
// experiences — evidence, WEF-Nexus tags, status history and progress updates.
export function ProjectDetailModal({ project, onClose, actions }: { project: StoreProject; onClose: () => void; actions?: ReactNode }) {
  const [liveProject, setLiveProject] = useState(project);
  const [mediaProject, setMediaProject] = useState(project);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(Boolean(project.apiId));

  useEffect(() => {
    setLiveProject(project);
    setMediaProject(project);
    const protectedAttachments = project.attachments.filter(attachment => typeof attachment.id === "string" && attachment.dataUrl.includes("/files/"));
    if (protectedAttachments.length > 0) {
      Promise.all(protectedAttachments.map(async attachment => ({ ...attachment, dataUrl: await fetchFileDataUrl(String(attachment.id)) })))
        .then(hydrated => setMediaProject(current => ({ ...current, attachments: current.attachments.map(attachment => hydrated.find(item => item.id === attachment.id) ?? attachment) })))
        .catch(() => { /* leave the authenticated download link available */ });
    }
    if (!project.apiId) {
      setComments([]);
      setCommentsLoading(false);
      return;
    }
    setCommentsLoading(true);
    Promise.all([
      getStatusHistory(project.apiId),
      getProgressUpdates(project.apiId),
      getProjectComments(project.apiId),
    ])
      .then(([history, updates, projectComments]) => {
        setLiveProject(current => ({
          ...current,
          statusHistory: mapStatusHistory(history),
          progressUpdates: updates.map(mapProgressUpdate),
        }));
        setComments(projectComments);
      })
      .catch(() => { /* keep the project summary visible if optional detail calls fail */ })
      .finally(() => setCommentsLoading(false));
  }, [project]);

  const displayedProject = { ...liveProject, attachments: mediaProject.attachments };
  const coverAttachment = displayedProject.attachments.find(attachment => attachment.type.startsWith("image/"));
  const displayCover = displayedProject.coverImageUrl?.includes("/files/") ? coverAttachment?.dataUrl || displayedProject.coverImageUrl : displayedProject.coverImageUrl || coverAttachment?.dataUrl || displayedProject.imageUrl;
  const details = displayedProject.extendedDetails;
  const detailRows = [
    ["Abstract", details?.abstract], ["Full description", details?.fullDescription], ["TRL", details?.trl], ["Priority", details?.priorityLevel], ["Risk level", details?.riskLevel],
    ["Address", details?.address], ["City", details?.city], ["Coordinates", details?.latitude !== undefined && details?.longitude !== undefined ? `${details.latitude}, ${details.longitude}` : undefined], ["Duration", details?.durationMonths ? `${details.durationMonths} months` : undefined],
    ["Currency", details?.currency], ["Research fund", details?.researchFund !== undefined ? formatUSD(details.researchFund) : undefined], ["Equity fund", details?.equityFund !== undefined ? formatUSD(details.equityFund) : undefined], ["Debt / loan", details?.debtLoan !== undefined ? formatUSD(details.debtLoan) : undefined], ["Grant", details?.grantAmount !== undefined ? formatUSD(details.grantAmount) : undefined], ["Minimum investment", details?.minimumInvestment !== undefined ? formatUSD(details.minimumInvestment) : undefined], ["Expected ROI", details?.expectedRoi !== undefined ? `${details.expectedRoi}%` : undefined], ["Payback", details?.paybackPeriodMonths ? `${details.paybackPeriodMonths} months` : undefined],
    ["Direct beneficiaries", details?.directBeneficiaries !== undefined ? formatNumber(details.directBeneficiaries) : undefined], ["Indirect beneficiaries", details?.indirectBeneficiaries !== undefined ? formatNumber(details.indirectBeneficiaries) : undefined], ["Jobs created", formatNumber(displayedProject.jobs)], ["Organization", details?.organizationName], ["Organization type", details?.organizationType], ["Organization website", details?.organizationWebsite],
  ].filter(([, value]) => value);
  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[88vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
        <div className="h-1.5 w-full bg-gradient-to-r from-[#1c2d7a] via-[#17a4c2] to-[#e8a020]" />
        <button onClick={onClose} className="absolute top-5 right-5 text-muted-foreground hover:text-foreground bg-white rounded-full p-1"><X className="w-4 h-4" /></button>

        <div className="p-6 sm:p-7">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <StatusBadge status={displayedProject.status} />
            {displayedProject.wef.map(w => {
              const Icon = wefIcon[w] ?? Target;
              return <span key={w} className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide bg-[#eef0f9] text-[#1c2d7a] px-2 py-0.5 rounded"><Icon className="w-3 h-3" />{w}</span>;
            })}
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-[#1c2d7a] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>{displayedProject.title}</h3>
          <p className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground mb-4"><MapPin className="w-3.5 h-3.5" /> {displayedProject.province}{displayedProject.district ? ` · ${displayedProject.district}` : ""} · {displayedProject.sector}</p>
          {(displayedProject.primarySector || displayedProject.secondarySector || displayedProject.sdgs?.length) && <p className="text-[11.5px] text-muted-foreground mb-4">Primary sector: <strong>{displayedProject.primarySector ?? displayedProject.sector}</strong>{displayedProject.secondarySector ? ` · Secondary: ${displayedProject.secondarySector}` : ""}{displayedProject.sdgs?.length ? ` · SDGs: ${displayedProject.sdgs.join(", ")}` : ""}</p>}
          {displayCover && <img src={displayCover} alt={displayedProject.title} className="w-full aspect-[2/1] object-cover rounded-xl mb-5" />}
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">{displayedProject.summary}</p>

          {details && <div className="mb-6">
            <h4 className="text-[12.5px] font-bold text-[#1c2d7a] mb-3 flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Project information</h4>
            <div className="grid sm:grid-cols-2 gap-2">{detailRows.map(([label, value]) => <div key={label} className="bg-[#f4f7fb] rounded-lg p-2.5"><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div><div className="text-[12px] font-semibold text-[#0f172a] break-words">{String(value)}</div></div>)}</div>
            {details.subSectors?.length ? <p className="text-[12px] text-muted-foreground mt-3"><strong>Sub-sectors:</strong> {details.subSectors.join(", ")}</p> : null}
            {details.sdgGoals?.length ? <p className="text-[12px] text-muted-foreground mt-1"><strong>SDG goals:</strong> {details.sdgGoals.join(", ")}</p> : null}
            {details.tags?.length ? <p className="text-[12px] text-muted-foreground mt-1"><strong>Tags:</strong> {details.tags.join(", ")}</p> : null}
          </div>}

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

          <div className="mb-6">
            <h4 className="text-[12.5px] font-bold text-[#1c2d7a] mb-3 flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Project comments</h4>
            {commentsLoading ? <p className="text-[12px] text-muted-foreground">Loading comments...</p> : comments.length === 0 ? <p className="text-[12px] text-muted-foreground">No comments yet.</p> : <div className="space-y-2">{comments.map(comment => <div key={comment.id} className="bg-[#f4f7fb] rounded-lg p-3"><div className="flex items-center justify-between gap-2 mb-1"><span className="text-[12px] font-semibold text-[#0f172a]">{comment.userName}</span><span className="text-[10.5px] text-muted-foreground">{comment.createdAt.slice(0, 10)}</span></div><p className="text-[12px] text-muted-foreground whitespace-pre-line">{comment.text}</p><AttachmentList attachments={commentAttachments(comment)} dense /></div>)}</div>}
          </div>

          {details && (details.projectLead || details.teamMembers?.length || details.shareholders?.length || details.additionalImpactMetrics?.length || details.futurePlans?.length || details.documents?.length || details.videos?.length || details.relatedProjectIds?.length || details.sdgAssociations?.length || details.infographicUrl) ? <div className="mb-6 space-y-4">
            {details.projectLead && <div><h4 className="text-[12.5px] font-bold text-[#1c2d7a] mb-2 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Project lead</h4><p className="text-[12px] text-muted-foreground">{details.projectLead.name}{details.projectLead.designation ? ` · ${details.projectLead.designation}` : ""}{details.projectLead.email ? ` · ${details.projectLead.email}` : ""}{details.projectLead.phone ? ` · ${details.projectLead.phone}` : ""}{details.projectLead.website ? ` · ${details.projectLead.website}` : ""}{details.projectLead.socialProfiles?.length ? ` · ${details.projectLead.socialProfiles.join(", ")}` : ""}</p></div>}
            {details.teamMembers?.length ? <div><h4 className="text-[12.5px] font-bold text-[#1c2d7a] mb-2 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Team members</h4><div className="space-y-1">{details.teamMembers.map((m, i) => <p key={`${m.name}-${i}`} className="text-[12px] text-muted-foreground">{m.lead ? "Lead · " : ""}{m.name}{m.designation ? ` · ${m.designation}` : ""}{m.email ? ` · ${m.email}` : ""}{m.phone ? ` · ${m.phone}` : ""}{m.website ? ` · ${m.website}` : ""}{m.socialProfiles?.length ? ` · ${m.socialProfiles.join(", ")}` : ""}</p>)}</div></div> : null}
            {details.shareholders?.length ? <div><h4 className="text-[12.5px] font-bold text-[#1c2d7a] mb-2 flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Shareholders</h4><div className="space-y-1">{details.shareholders.map((s, i) => <p key={`${s.name}-${i}`} className="text-[12px] text-muted-foreground">{s.name}{s.type ? ` · ${s.type}` : ""}{s.sharePercentage !== undefined ? ` · ${s.sharePercentage}%` : ""}{s.investmentAmount !== undefined ? ` · ${formatUSD(s.investmentAmount)}` : ""}{s.email ? ` · ${s.email}` : ""}{s.website ? ` · ${s.website}` : ""}{s.status ? ` · ${s.status}` : ""}</p>)}</div></div> : null}
            {details.additionalImpactMetrics?.length ? <div><h4 className="text-[12.5px] font-bold text-[#1c2d7a] mb-2">Additional impact metrics</h4>{details.additionalImpactMetrics.map((m, i) => <p key={`${m.name}-${i}`} className="text-[12px] text-muted-foreground">{m.name}: <strong>{m.value}</strong>{m.unit ? ` ${m.unit}` : ""}</p>)}</div> : null}
            {details.futurePlans?.length ? <div><h4 className="text-[12.5px] font-bold text-[#1c2d7a] mb-2">Future plans</h4>{details.futurePlans.map((p, i) => <p key={`${p.title}-${i}`} className="text-[12px] text-muted-foreground">{p.phaseName} · {p.title}{p.timeline ? ` · ${p.timeline}` : ""}{p.estimatedCost !== undefined ? ` · ${formatUSD(p.estimatedCost)}` : ""}{p.description ? `: ${p.description}` : ""}</p>)}</div> : null}
            {details.documents?.length || details.videos?.length ? <div><h4 className="text-[12.5px] font-bold text-[#1c2d7a] mb-2 flex items-center gap-1.5"><LinkIcon className="w-3.5 h-3.5" /> Linked media</h4>{details.documents?.map((d, i) => <p key={`d-${i}`} className="text-[12px] text-muted-foreground">Document: {d.documentType ? `${d.documentType} · ` : ""}{d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="text-[#17a4c2] hover:underline">{d.filename} <ExternalLink className="inline w-3 h-3" /></a> : d.filename}{d.size !== undefined ? ` · ${d.size} bytes` : ""}{d.uploader ? ` · uploaded by ${d.uploader}` : ""}</p>)}{details.videos?.map((v, i) => <p key={`v-${i}`} className="text-[12px] text-muted-foreground">Video: <a href={v.url} target="_blank" rel="noreferrer" className="text-[#17a4c2] hover:underline">{v.title} <ExternalLink className="inline w-3 h-3" /></a>{v.duration ? ` · ${v.duration}` : ""}</p>)}</div> : null}
            {details.relatedProjectIds?.length ? <p className="text-[12px] text-muted-foreground"><strong>Related projects:</strong> {details.relatedProjectIds.join(", ")}</p> : null}
            {details.sdgAssociations?.length ? <p className="text-[12px] text-muted-foreground"><strong>SDG associations:</strong> {details.sdgAssociations.join(", ")}</p> : null}
            {details.infographicUrl ? <p className="text-[12px] text-muted-foreground"><strong>Infographic:</strong> <a href={details.infographicUrl} target="_blank" rel="noreferrer" className="text-[#17a4c2] hover:underline">Open infographic <ExternalLink className="inline w-3 h-3" /></a></p> : null}
          </div> : null}

          {actions && <div className="pt-2 border-t border-border flex flex-col sm:flex-row gap-2.5">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
