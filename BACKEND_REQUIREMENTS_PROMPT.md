# Backend AI Prompt and Requirements (PCPP)

Use this file as a direct handoff to a backend AI agent.

## Copy-Paste Prompt for Backend AI

You are a senior backend architect and implementation engineer.
Build the production-ready backend for a Climate Project Pipeline platform (PCPP) used by four roles: admin, reviewer, focal, investor.

### Goal
Design and implement:
1. Database schema (PostgreSQL preferred)
2. REST APIs (OpenAPI 3.1 spec required)
3. Authentication and role-based authorization
4. File upload support for project evidence and comments
5. Notification and investor-interest workflows
6. Seed data and migration scripts
7. Automated tests for critical flows

The frontend already exists and currently uses local storage with these functional behaviors:
- Roles: admin, reviewer, focal, investor
- Project lifecycle statuses: Draft, Submitted, Under Review, Approved, Returned
- Focal users create/edit drafts, submit projects, post progress updates
- Admin approves/returns projects, and manages users
- Reviewer can review/comment but cannot approve/return
- Investors view approved catalogue, save projects, and express interest
- Focal users respond to investor interest (In discussion, Connected, Declined)
- Attachments can be added to project submission, status events, and progress updates
- Notifications are audience-based and can be marked as read

Implement the backend to exactly support these workflows.

### Tech and Output Requirements
- Language/framework: Node.js + TypeScript + NestJS or Express (your choice, but keep modular structure)
- DB: PostgreSQL
- ORM: Prisma or TypeORM
- Auth: JWT access token + refresh token
- API docs: Swagger/OpenAPI auto-generated and committed
- Validation: request DTO validation and strong typing
- Migrations: versioned, idempotent
- Testing: unit tests + integration tests for status transitions and RBAC
- Deliverables:
  - Source code
  - SQL/ORM migrations
  - OpenAPI spec
  - Seed script
  - Postman collection or HTTP examples
  - README with setup/run instructions

### Core Business Rules
- Only admin can approve or return projects.
- Reviewer can add review comments but cannot change project status to Approved/Returned.
- Focal can only access projects in their own province.
- Investor can only see Approved projects in catalogue.
- Investor signup creates investor role only.
- Ministry/focal/reviewer/admin accounts are created by admin (not public signup).
- Every project status change must create a status-history event (audit trail).
- Attachments must be metadata in DB and binary stored in object storage (S3-compatible or local adapter).

### Required API Domains
1. Auth
2. Users and roles
3. Projects and status workflow
4. Attachments
5. Notifications
6. Saved projects
7. Investor interests and response timeline
8. Reference/taxonomy data
9. Reports export metadata/endpoints

### Required Non-Functional Requirements
- Pagination, sorting, filtering on list endpoints
- Structured error format
- Rate limiting on auth endpoints
- Basic audit logging for critical actions
- Soft deletes where appropriate
- UTC timestamps everywhere

Now implement the complete backend and provide code plus API docs.

---

## Detailed Backend Requirements

## 1. Roles and Access Matrix

- admin:
  - Full access
  - Approve/return projects
  - Manage users (create/deactivate)
  - View all provinces
- reviewer:
  - Read all submitted/under-review projects
  - Add review comments and optional attachments
  - No approve/return permission
- focal:
  - Province-scoped access only
  - Create/edit own projects (draft and returned)
  - Submit for review
  - Post progress updates on approved projects
  - Respond to investor interests on own province projects
- investor:
  - View approved catalogue only
  - Save/unsave projects
  - Express interest in projects
  - Track own interest statuses

## 2. Domain Model (Entities)

### User
- id (uuid)
- name
- email (unique)
- password_hash
- role enum: admin, reviewer, focal, investor
- title
- province_id nullable (required if focal)
- organization nullable (investor)
- country nullable (investor)
- active boolean
- created_at, updated_at, deleted_at nullable

### Province
- id (uuid)
- name (unique)

### Sector
- id (uuid)
- name (unique)
- color nullable

### Project
- id (uuid)
- title
- summary text
- province_id
- district nullable
- sector_id
- status enum: Draft, Submitted, Under Review, Approved, Returned
- cost_usd numeric(18,2)
- funding_gap_usd numeric(18,2)
- co_financing_usd numeric(18,2) nullable
- beneficiaries int nullable
- jobs int nullable
- readiness int (0-100)
- start_date nullable
- end_date nullable
- implementing_agency nullable
- contact_name nullable
- contact_email nullable
- contact_phone nullable
- risk_notes text nullable
- submitted_by_user_id
- updated_at (business update date)
- created_at, modified_at, deleted_at nullable

### ProjectWEFTag
- project_id
- wef_tag enum: Water, Energy, Food
- composite unique(project_id, wef_tag)

### Attachment
- id (uuid)
- file_name
- mime_type
- size_bytes
- storage_key (object storage path)
- uploaded_by_user_id
- created_at

### ProjectAttachment
- project_id
- attachment_id

### ProjectStatusEvent
- id (uuid)
- project_id
- status enum (same as project status)
- note text
- by_user_id
- created_at

### ProjectStatusEventAttachment
- status_event_id
- attachment_id

### ProgressUpdate
- id (uuid)
- project_id
- author_user_id
- text
- created_at

### ProgressUpdateAttachment
- progress_update_id
- attachment_id

### Notification
- id (uuid)
- audience enum: admin, reviewer, focal, investor, public
- province_id nullable (for focal targeting)
- text
- created_at

### NotificationRead
- id (uuid)
- notification_id
- user_id
- read_at
- unique(notification_id, user_id)

### SavedProject
- id (uuid)
- investor_user_id
- project_id
- created_at
- unique(investor_user_id, project_id)

### InvestorInterest
- id (uuid)
- project_id
- investor_user_id
- message text
- status enum: Awaiting response, In discussion, Connected, Declined
- created_at
- modified_at

### InvestorInterestTimeline
- id (uuid)
- interest_id
- note text
- by_user_id
- created_at

### AuditLog
- id (uuid)
- actor_user_id
- action
- entity_type
- entity_id
- metadata jsonb
- created_at

## 3. Status Workflow Rules

Allowed transitions:
- Draft -> Submitted (focal)
- Draft -> Draft (focal update)
- Returned -> Returned (focal update)
- Returned -> Submitted (focal)
- Submitted -> Under Review (system/admin/reviewer assignment optional)
- Submitted -> Approved (admin)
- Submitted -> Returned (admin)
- Under Review -> Approved (admin)
- Under Review -> Returned (admin)
- Approved -> Approved (progress updates only)

Rules:
- Every transition writes ProjectStatusEvent.
- Reviewer comments create ProjectStatusEvent with current status unchanged.
- Investor can never update project status.

## 4. API Specification (REST)

All endpoints under /api/v1.
All list endpoints support page, pageSize, sortBy, sortOrder, and filters.

### 4.1 Auth
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout
- POST /auth/signup-investor
- GET /auth/me

### 4.2 Users (admin only unless noted)
- GET /users
- POST /users
- GET /users/{id}
- PATCH /users/{id}
- PATCH /users/{id}/activate
- PATCH /users/{id}/deactivate

### 4.3 Reference Data
- GET /reference/provinces
- GET /reference/sectors
- GET /reference/wef-tags

### 4.4 Projects
- GET /projects
  - role-aware filtering:
    - focal: only own province
    - investor: only Approved
- POST /projects (focal create draft)
- GET /projects/{id}
- PATCH /projects/{id} (focal edit own draft/returned, admin edits if needed)
- POST /projects/{id}/submit (focal)
- POST /projects/{id}/approve (admin)
- POST /projects/{id}/return (admin, note required)
- POST /projects/{id}/comments (reviewer/admin)
- GET /projects/{id}/status-history
- POST /projects/{id}/progress-updates (focal for approved projects)
- GET /projects/{id}/progress-updates
- GET /projects/catalogue (approved only)

### 4.5 Attachments
- POST /attachments/upload-url (or multipart upload endpoint)
- POST /attachments (register metadata after upload)
- GET /attachments/{id}/download-url
- DELETE /attachments/{id} (with authorization checks)

### 4.6 Notifications
- GET /notifications
- POST /notifications (admin/system)
- POST /notifications/{id}/read
- POST /notifications/read-all

### 4.7 Saved Projects (investor)
- GET /investor/saved-projects
- POST /investor/saved-projects/{projectId}
- DELETE /investor/saved-projects/{projectId}

### 4.8 Investor Interests
- GET /investor/interests (investor own)
- POST /investor/interests (investor creates interest)
- GET /focal/interests (focal sees interests for own province projects)
- PATCH /focal/interests/{id}/status (In discussion/Connected/Declined)
- POST /focal/interests/{id}/timeline
- GET /interests/{id}/timeline

### 4.9 Reports
- GET /reports/summary
- GET /reports/provincial-funding-gap
- GET /reports/wef-impact

## 5. Request/Response Contract Notes

Use a consistent envelope:
- success responses:
  - { data, meta?, message? }
- errors:
  - { error: { code, message, details?, traceId? } }

Standard metadata for lists:
- page
- pageSize
- total
- totalPages

## 6. Validation Rules

- email must be valid and unique.
- password policy for investor signup and admin-created users.
- focal user must have province.
- project title required.
- cost_usd and funding_gap_usd must be non-negative.
- readiness between 0 and 100.
- end_date must be >= start_date when both provided.
- wef tags must include at least 1 entry for project submission.

## 7. Security Requirements

- JWT access token short TTL (for example 15m), refresh token longer TTL.
- Refresh token rotation and revocation table.
- Password hashing with bcrypt/argon2.
- RBAC middleware/guards at endpoint level.
- Input sanitization and size limits for text fields.
- File upload validation (type and max size).
- HTTPS assumed in production.

## 8. Seed Data Requirements

Seed these role accounts:
- admin@pcpp.gov.pk (admin)
- reviewer@pcpp.gov.pk (reviewer)
- focal@pcpp.gov.pk (focal, Punjab)
- focal.sindh@pcpp.gov.pk (focal, Sindh)
- investor@pcpp.gov.pk (investor)

Seed reference provinces and sectors used in frontend.
Seed sample projects across statuses including approved catalogue entries.

## 9. Implementation Order

1. Auth and RBAC
2. Reference tables and users
3. Projects + status history
4. Attachments integration
5. Notifications
6. Saved projects + investor interests
7. Reports and analytics endpoints
8. Tests and OpenAPI polish

## 10. Acceptance Criteria

- All role-specific frontend workflows are fully supported by backend APIs.
- No local-storage dependency remains for core business data.
- Status history and investor timelines are persisted and queryable.
- API docs are complete and match implementation.
- Migrations and seed script run cleanly on a fresh database.
- Critical RBAC and workflow transition tests pass.

## 11. Nice-to-Have (Optional)

- Event bus for notifications
- Background jobs for report generation
- Full text search for project catalogue
- Caching for read-heavy analytics endpoints
