# Admin Dashboard — Backend API Requirements
## For Backend Development Team

This document lists **every API the Admin Dashboard needs**, scoped specifically to:
1. User creation & management
2. Project list / review queue
3. Project status changes (approve / return / submit)
4. Comments on projects
5. Supporting dashboard data (overview, provinces, reports)

Most of these already exist in `API_SPECIFICATION.md`. Where an endpoint is **missing or
insufficient for the Admin Dashboard's actual usage**, it is called out under **⚠️ GAP**.
Base path for everything below: `/api/v1`.

Standard success envelope: `{ "success": true, "data": ... }` (paged lists also include
`page`, `pageSize`, `total`, `totalPages`). Standard error envelope:
`{ "success": false, "error": { "message": "string", "details": [...] } }`.
All endpoints below (except login/signup) require `Authorization: Bearer <token>` and
`role = Admin` (Reviewer gets read-only access — see Access column).

---

## 1. User Management

### 1.1 GET `/users` — List all users
**Access**: Admin only

Query params:
| Param | Type | Notes |
|---|---|---|
| `role` | string | `Admin \| Reviewer \| Focal \| Investor` (optional filter) |
| `province` | string | filter focal users by province name (optional) |
| `search` | string | matches name or email (optional) |
| `page` | number | default 1 |
| `pageSize` | number | default 20 |

Response `data[]` item:
```json
{
  "id": "string",
  "email": "string",
  "name": "string",
  "role": "Admin | Reviewer | Focal | Investor",
  "title": "string",
  "organization": "string",
  "provinceId": "string | null",
  "provinceName": "string | null",
  "active": true,
  "createdAt": "ISO8601"
}
```

---

### 1.2 POST `/users` — Admin creates a user directly ⚠️ GAP (does not exist yet)
**Access**: Admin only

The dashboard's "Add user" form lets an admin create a user of **any role**
(Admin, Reviewer, Focal, Investor) without that person going through public signup or
knowing their own password up front. The current spec only has `POST /auth/signup`,
which is documented as **public** and restricted to `role: investor | focal` — it must
not be reused for this, since letting the public self-register as Admin/Reviewer is a
security hole. **Please add a dedicated admin-only endpoint:**

Request body:
```json
{
  "name": "string (required, 2-100 chars)",
  "email": "string (required, unique, email format)",
  "role": "Admin | Reviewer | Focal | Investor (required)",
  "provinceId": "string (required if role = Focal, must be valid province id)",
  "organization": "string (optional)",
  "title": "string (optional)",
  "password": "string (optional — see below)"
}
```

Behavior:
- If `password` is omitted, generate a temporary password (or a signed invite/reset
  token) and email it to the user; return `temporaryPassword` in the response **only**
  in non-production environments, otherwise send it via email and never return it in
  the API response.
- Validate `email` uniqueness (409 if already exists).
- `provinceId` required and must exist when `role = Focal`; reject with 400 otherwise.
- Only `Admin` role callers may hit this endpoint (403 for anyone else, including
  Reviewer).

Response (201):
```json
{
  "success": true,
  "data": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "string",
    "provinceId": "string | null",
    "createdAt": "ISO8601"
  }
}
```

---

### 1.3 PUT `/users/:userId` — Update user
**Access**: Self (limited fields) or Admin (all fields)

Request body (all optional, send only changed fields):
```json
{
  "name": "string (2-100 chars)",
  "title": "string (0-100 chars)",
  "organization": "string (0-100 chars)",
  "role": "Admin | Reviewer | Focal | Investor (admin only)",
  "provinceId": "string (admin only, required if role becomes Focal)",
  "active": "boolean (admin only)"
}
```
- Non-admin callers attempting to change `role`, `provinceId`, or `active` → 403.
- Response: updated user object (same shape as 1.1 list item).

---

### 1.4 DELETE `/users/:userId` — Deactivate user
**Access**: Admin only

- Soft-delete (`active = false`), do not hard-delete (project/comment history must
  keep referencing the user's name).
- Response: `{ "success": true, "message": "User deactivated" }`.
- Should be idempotent (deactivating an already-inactive user still returns 200).

---

## 2. Project List / Review Queue

### 2.1 GET `/admin/review-queue` — Projects awaiting a decision
**Access**: Admin, Reviewer

Query params:
| Param | Type | Notes |
|---|---|---|
| `status` | string | `Draft \| Submitted \| Under Review \| Approved \| Returned` (optional; omit = all) |
| `province` | string | optional |
| `sector` | string | optional |
| `wefTag` | string | `Water \| Energy \| Food` (optional) |
| `readiness` | string | `Low \| Medium \| High` (optional, buckets: Low <40, Medium 40-69, High ≥70) |
| `search` | string | matches title or province (optional) |
| `page` | number | default 1 |
| `pageSize` | number | default 20 |
| `sort` | string | `date \| readiness \| fundingGap` (optional) |

Response `data[]` item — **must include full project shape** (the dashboard opens a
detail modal straight from this list, it does not re-fetch by id first):
```json
{
  "id": "string",
  "title": "string",
  "summary": "string",
  "provinceName": "string",
  "district": "string | null",
  "sectorName": "string",
  "status": "string",
  "costUsd": "number",
  "fundingGapUsd": "number",
  "coFinancingUsd": "number | null",
  "beneficiaries": "number",
  "jobs": "number",
  "readiness": "number",
  "startDate": "ISO8601 | null",
  "endDate": "ISO8601 | null",
  "implementingAgency": "string | null",
  "contactName": "string | null",
  "contactEmail": "string | null",
  "contactPhone": "string | null",
  "riskNotes": "string | null",
  "wefTags": ["Water", "Energy"],
  "attachments": [
    { "id": "string", "fileName": "string", "mimeType": "string", "sizeBytes": 0, "createdAt": "ISO8601" }
  ],
  "createdAt": "ISO8601",
  "modifiedAt": "ISO8601"
}
```

---

### 2.2 GET `/admin/dashboard/overview` — KPI + chart data
**Access**: Admin, Reviewer

Response:
```json
{
  "totalProjects": 0,
  "approvedProjects": 0,
  "submittedProjects": 0,
  "underReviewProjects": 0,
  "returnedProjects": 0,
  "draftProjects": 0,
  "totalCostUsd": 0,
  "fundingGapUsd": 0,
  "totalBeneficiaries": 0,
  "totalJobs": 0,
  "projectsByProvince": [{ "provinceName": "string", "count": 0, "fundingGapUsd": 0 }],
  "projectsBySector": [{ "sectorName": "string", "count": 0 }],
  "projectsByStatus": [{ "status": "string", "count": 0, "percentage": 0 }],
  "pipelineTrend": [{ "month": "Jan 25", "submitted": 0, "approved": 0 }]
}
```
`pipelineTrend` should cover the trailing 12 months, oldest first.

---

### 2.3 GET `/admin/provinces` — Province summary (Geography tab)
**Access**: Admin, Reviewer

Response `data[]` item:
```json
{
  "id": "string",
  "name": "string",
  "totalProjects": 0,
  "approvedProjects": 0,
  "focalPointName": "string",
  "focalPointEmail": "string",
  "fundingGapUsd": 0,
  "saturation": "High | Medium | Low"
}
```
`saturation` is a computed field (e.g. by funding-gap-to-cost ratio or project density
vs. other provinces) — please document the exact formula used so the frontend legend
can stay consistent.

---

### 2.4 GET `/admin/reports` — Downloadable exports
**Access**: Admin

Query params: `format=csv|json|pdf`, `type=all-projects|approved|submitted|by-province|by-sector`,
`dateFrom`, `dateTo`, `province` (all optional, default format=csv, type=all-projects).
Response: raw file stream with correct `Content-Type` / `Content-Disposition`.

---

## 3. Project Status Changes

### 3.1 POST `/projects/:id/approve`
**Access**: Admin (Reviewer should get 403 — reviewers can comment but not decide)

Request body: `{ "note": "string (optional)" }`
Effect: sets `status = Approved`, appends a status-history entry with `note` and the
acting user's name.
Response: updated project (`id`, `status`, `modifiedAt` at minimum).

### 3.2 POST `/projects/:id/return`
**Access**: Admin

Request body: `{ "note": "string (required — reason for returning)" }`
- 400 if `note` is empty (focal point needs an actionable reason).
Effect: sets `status = Returned`, appends status-history entry.

### 3.3 POST `/projects/:id/submit`
**Access**: Project creator (Focal). Listed here only because Admin's review queue
reads the resulting `Submitted` status — no admin-side action needed, included for
completeness of the state machine: `Draft → Submitted → Under Review → Approved | Returned`.

### 3.4 GET `/projects/:id/status-history`
**Access**: Admin, Reviewer, project creator

Response `data[]` item:
```json
{ "id": "string", "status": "string", "note": "string | null", "changedByUserName": "string", "createdAt": "ISO8601" }
```

---

## 4. Comments ⚠️ GAP (not in current API_SPECIFICATION.md)

The Admin/Reviewer "Review & Comment" panel needs to leave feedback on a project
**without changing its status** (distinct from the return-with-note flow above — a
Reviewer role can comment but cannot approve/return). Please add:

### 4.1 POST `/projects/:id/comments`
**Access**: Admin, Reviewer

Request body:
```json
{ "note": "string (required, 1-2000 chars)" }
```
Effect: appends an entry visible in the project's activity/status-history feed, tagged
with the commenting user's name and role, **without** changing `status`.
Response: the updated project (or at minimum `{ id, modifiedAt }`) so the frontend can
refresh the activity feed.

### 4.2 GET `/projects/:id/comments`
**Access**: Admin, Reviewer, project creator

Response `data[]` item:
```json
{ "id": "string", "projectId": "string", "userId": "string", "userName": "string", "text": "string", "createdAt": "ISO8601" }
```

> Note: comments and file attachments can be combined in one request — if a comment
> has attached files, accept them as `multipart/form-data` with `note` + `files[]`,
> or require the file to be uploaded first via `POST /files/upload` and then pass the
> returned file id(s) as `attachments: [fileId]` alongside `note`. Either is fine —
> just confirm which so the frontend can match it.

---

## 5. Reference Data (needed to populate dropdowns on the above forms)

Already covered elsewhere in `API_SPECIFICATION.md` but restated here since the
Admin "Add user" (province dropdown for Focal role) and project filters depend on them:

- `GET /reference/provinces` → `[{ "id": "string", "name": "string" }]`
- `GET /reference/sectors` → `[{ "id": "string", "name": "string", "color": "string" }]`
- `GET /reference/wef-tags` → `[{ "value": "string", "label": "string" }]`

---

## Summary checklist for backend

| # | Method | Path | Status |
|---|---|---|---|
| 1 | GET | `/users` | ✅ exists |
| 2 | POST | `/users` | ⚠️ **new — needed for admin user creation** |
| 3 | PUT | `/users/:userId` | ✅ exists |
| 4 | DELETE | `/users/:userId` | ✅ exists |
| 5 | GET | `/admin/review-queue` | ✅ exists |
| 6 | GET | `/admin/dashboard/overview` | ✅ exists |
| 7 | GET | `/admin/provinces` | ✅ exists |
| 8 | GET | `/admin/reports` | ✅ exists |
| 9 | POST | `/projects/:id/approve` | ✅ exists |
| 10 | POST | `/projects/:id/return` | ✅ exists |
| 11 | GET | `/projects/:id/status-history` | ✅ exists |
| 12 | POST | `/projects/:id/comments` | ⚠️ **new — needed for comment-only feedback** |
| 13 | GET | `/projects/:id/comments` | ⚠️ **new — needed to render comment history** |
| 14 | GET | `/reference/provinces` \| `/sectors` \| `/wef-tags` | ✅ exists |

Items 2, 12, 13 are the only genuinely new endpoints; everything else is already
specified in `API_SPECIFICATION.md` and just needs to be implemented per that doc.
