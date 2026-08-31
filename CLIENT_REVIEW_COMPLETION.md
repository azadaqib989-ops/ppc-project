# Client Review Completion

Date: 2026-08-26

The platform is configured as a browser-only demonstration. Backend/API calls are bypassed for authentication, projects, review actions, investor interests, saved projects, reference data, progress updates, and reports. Data is seeded in `localStorage` and survives reloads. Use the demo accounts shown on the login screen or the accounts in `src/app/lib/store.ts`.

## Review items

| ID | Result | Implementation / note |
|---|---|---|
| GEN-01 | Done | Dashboard project cards now display relevant project imagery from the local project record, with meaningful project-specific alt text. |
| ADM-01 | Done | Admin charts use a consistent chart font size, tooltip treatment, grid treatment, colors, and labels. |
| ADM-02 | Done | Status radial chart has separated legend space and an explicit numeric list for Approved, Under Review, Submitted, Draft, and Returned. Center shows total projects. |
| ADM-03 | Done | Geography panel defines High as 600+ projects, Medium as 300–599, and Low as below 300. It is explicitly described as a portfolio-volume signal, not a quality score. |
| PRV-01 | Done | Provincial overview now carries portfolio KPIs, returned-work queue, sector mix, and a dedicated analytics/report view. |
| PRV-02 | Done | Provincial overview shows total funding required, available funding, and funding gap. Available funding is calculated as total cost less funding gap for the demo dataset. |
| PRV-03 | Done | Returned projects are surfaced on the provincial overview and remain editable from My Projects. |
| PRV-04 | Done | Submission creates `Submitted` status and places the record in the local ministry review queue. It is not visible in the investor catalogue until an admin approves it. |
| PRV-05 | Done | My Projects supports text filtering by title, sector, or district and status filtering. |
| PRV-06 | Done | The six-step submission wizard captures basics, location/timeline, financials/impact, contacts/risks, WEF/documents, and review/submit. Draft save is available on every step. |
| PRV-07 | Done | Submission captures primary sector, optional secondary sector, and one or more SDG values. These are shown in project detail. |
| PRV-08 | Done | Project detail explains the demo readiness score: scope, financials, timeline, ownership, WEF linkage, and evidence completeness. Ministry review or project updates can change the record. |
| PRV-09 | Done | Status history distinguishes Draft, Submitted, Under Review, Returned, and Approved. Submitted means sent by the province; Under Review means assigned to ministry review. |
| PRV-10 | Done | Interest actions are implemented locally: Awaiting response, In discussion, Connected, and Declined. Both provincial and investor screens show the interaction timeline and stage. |
| PRV-11 | Done | Provincial Analytics & Reports view provides project count, approved/returned count, average readiness, and province-scoped portfolio data. |
| PRV-12 | Done | Provincial Analytics & Reports provides a downloadable CSV report for the selected status-filtered project set. |
| PRV-13 | Done | Investor interest is recorded against a project, with an optional proposed commitment amount, visible to the provincial owner and investor with stage and timeline. Connected is the demo handoff state for a confirmed interaction. |
| INV-01 | Done | Catalogue and saved project cards display relevant imagery and open the shared project detail view through View details/title/image actions. |
| INV-02 | Done | Readiness buckets and sector chart categories are clickable. Each selection reveals the underlying projects, which open the shared project detail view. |

## Demo flow to verify

1. Sign in as a focal point, create or edit a project, save a draft, and submit it for ministry review.
2. Sign in as the admin, open Project Review Queue, review the status history, approve or return the project with a note and attachments.
3. Confirm returned projects appear on the focal overview and can be edited and resubmitted.
4. Sign in as the investor, open the approved catalogue, save a project, open its details, and express interest.
5. Return to the focal account, move the interest to discussion or connected, and confirm the timeline updates.
6. Open provincial Analytics & Reports and download the CSV; open investor Analytics and drill into readiness or sector categories.

## Known demo assumptions

- Persistence is browser-local and intentionally replaces server persistence for this review build.
- Available funding is derived from seeded total cost and funding gap because the original project model did not contain a separate committed-funding backend field.
- Readiness is a seeded demo score until the client confirms the production scoring formula.
- Investor/province communication is represented by interest status and timeline; a full messaging system is outside the supplied review scope.
