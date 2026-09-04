# PCPP Frontend-to-API Mapping Guide
## Quick Reference for Backend Team

---

## Overview
This document maps each frontend view/component to the specific API endpoints it requires, making it easy to understand which endpoints to prioritize.

---

## 1. PUBLIC LANDING PAGE
**File**: `src/app/App.tsx` (Landing Page sections)  
**Access**: Public (no authentication required)

### Required APIs:
- `GET /api/v1/reference/provinces` - For provinces overview section
- `GET /api/v1/projects/catalogue?status=Approved` - For featured projects display (take top 6)

### Data Displayed:
- Provinces with project counts
- Featured approved projects with images and brief details

---

## 2. LOGIN PAGE
**File**: `src/app/App.tsx` (Login Form)  
**Access**: Public

### Required APIs:
- `POST /api/v1/auth/login` - User authentication

### Data Used:
- Email, password credentials
- Returns user object and JWT token

### Response Handling:
- Success: Store token, redirect to role-specific dashboard
- Failure: Display error toast

---

## 3. SIGNUP/REGISTRATION PAGE
**File**: `src/app/App.tsx` (Signup Form)  
**Access**: Public

### Required APIs:
- `GET /api/v1/reference/provinces` - Province dropdown for focal point signup
- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/login` - Auto-login after signup (optional)

### Data Used:
- Email, password, name
- Role (investor or focal)
- Province (if focal point)

---

## 4. ADMIN DASHBOARD - OVERVIEW TAB
**File**: `src/app/pages/AdminDashboard.tsx` - `OverviewTab()` function  
**Access**: Admin, Reviewer roles  
**Component**: Overview page with KPI cards and charts

### Required APIs:

#### 4.1 Main Dashboard Metrics
```
GET /api/v1/admin/dashboard/overview
```
Returns all KPI metrics at once:
- Total projects, approved, submitted, under review, returned, draft
- Total cost, funding gap, beneficiaries, jobs
- Projects by province, sector, status
- Pipeline trend (12-month historical data)

### KPI Cards Display (4 cards):
1. **Total Pipeline**: Uses `totalProjects` from overview endpoint
2. **Approved**: Uses `approvedProjects` from overview endpoint
3. **Funding Gap**: Uses `fundingGapUsd` from overview endpoint
4. **Beneficiaries**: Uses `totalBeneficiaries` and `totalJobs` from overview endpoint

### Charts Used:
1. **Funding Overview (Horizontal Bar)**: Uses `projectsByProvince` array
   - Chart Type: Horizontal Bar Chart
   - Data: Province name (Y-axis), project count (X-axis)
   - Colors: Blue gradient (#1c2d7a to #0b5a7d)

2. **Projects by Sector (Vertical Bar)**: Uses `projectsBySector` array
   - Chart Type: Vertical Bar Chart
   - Data: Sector name (X-axis), count (Y-axis)
   - Colors: Different color per sector

3. **Pipeline Trend (Area Chart)**: Uses `pipelineTrend` array
   - Chart Type: Area Chart showing 2 lines
   - Data: Month on X-axis, submitted/approved on Y-axis
   - Colors: Blue for approved, lighter blue for submitted

4. **Status Distribution (5 boxes)**: Uses `projectsByStatus` array
   - Display: Count and percentage for each status
   - Backgrounds: Light colored boxes with count in blue

### Impact Metrics Grid (4 columns):
- Uses impact metrics from overview response
- Total projects, investment value, beneficiaries, jobs

---

## 5. ADMIN DASHBOARD - REVIEW QUEUE TAB
**File**: `src/app/pages/AdminDashboard.tsx` - `ReviewQueueTab()` function  
**Access**: Admin, Reviewer roles  
**Component**: Project review list with filtering

### Required APIs:

#### 5.1 Get Review Queue
```
GET /api/v1/admin/review-queue
?status=Submitted|Under Review|Returned
?province=<optional>
?sector=<optional>
?page=<current_page>
?pageSize=20
?sort=date
```

#### 5.2 Get Project Detail (when clicked)
```
GET /api/v1/projects/:projectId
```

#### 5.3 Update Project Status
```
POST /api/v1/projects/:projectId/status
Body: { status: "Approved|Under Review|Returned", note: "...", attachments: [] }
```

### Table Columns:
- Title
- Province
- Sector
- Status (badge)
- Cost USD
- Funding Gap USD
- Readiness score
- Submitted date
- Action buttons (Review, Approve, Return)

### Filtering:
- Status dropdown: Submitted, Under Review, Returned
- Province dropdown
- Sector dropdown
- Search by title
- Pagination: Load more or page selector

---

## 6. ADMIN DASHBOARD - GEOGRAPHY TAB
**File**: `src/app/pages/AdminDashboard.tsx` - `GeographyTab()` function  
**Access**: Admin, Reviewer roles

### Required APIs:

#### 6.1 Get Geography Data
```
GET /api/v1/admin/provinces
```

Returns for each province:
- Province name
- Total projects count
- Approved projects count
- Funding gap
- Focal point name and email
- Saturation level (High/Medium/Low)

### Displays:
- Province cards showing key stats
- Focal point contact information
- Funding gap and saturation indicators

---

## 7. ADMIN DASHBOARD - WEF NEXUS TAB
**File**: `src/app/pages/AdminDashboard.tsx` - `NexusTab()` function  
**Access**: Admin, Reviewer roles

### Required APIs:

#### 7.1 Get WEF Nexus Analysis
```
GET /api/v1/analytics/wef-nexus
```

Returns:
- Projects by Water/Energy/Food dimension
- Combinations (Water+Energy, etc.)
- Cost, beneficiaries, jobs for each

### Charts:
1. **WEF Split (Pie/Donut)**: Water, Energy, Food projects
2. **Nexus Combinations (Bar)**: Water+Energy, Water+Food, etc.

---

## 8. ADMIN DASHBOARD - USERS TAB (Admin only)
**File**: `src/app/pages/AdminDashboard.tsx` - `UsersTab()` function  
**Access**: Admin only

### Required APIs:

#### 8.1 List Users
```
GET /api/v1/users
?role=<optional>
?province=<optional>
?page=<page>
?pageSize=20
?search=<optional>
```

#### 8.2 Update User
```
PUT /api/v1/users/:userId
Body: { name, title, organization, role, active }
```

#### 8.3 Delete User
```
DELETE /api/v1/users/:userId
```

### Table Display:
- Email
- Name
- Role
- Title
- Organization
- Province (for focal points)
- Active status
- Action buttons (Edit, Deactivate)

---

## 9. ADMIN DASHBOARD - REPORTS TAB
**File**: `src/app/pages/AdminDashboard.tsx` - `ReportsTab()` function  
**Access**: Admin, Reviewer roles

### Required APIs:

#### 9.1 Generate Report
```
GET /api/v1/admin/reports
?format=csv|json|pdf
?type=all-projects|approved|submitted|by-province|by-sector
?dateFrom=<ISO8601>
?dateTo=<ISO8601>
?province=<optional>
```

### Features:
- Format selector: CSV, JSON, PDF
- Report type selector
- Date range filter
- Province filter (optional)
- Download button

---

## 10. FOCAL DASHBOARD - OVERVIEW TAB
**File**: `src/app/pages/FocalDashboard.tsx` - `OverviewTab()` function  
**Access**: Focal Point role (Provincial)

### Required APIs:

#### 10.1 Dashboard Overview (filtered to province)
```
GET /api/v1/projects
?province=<focal_user_province>
?status=Draft|Submitted|Under Review|Approved|Returned
```

#### 10.2 Get Analytics for Province
```
GET /api/v1/analytics/sector-breakdown
?province=<focal_user_province>
```

#### 10.3 Get Reference Data
```
GET /api/v1/reference/sectors
```

### KPI Cards (4 cards):
1. **Total Projects**: Count of all projects in province
2. **Approved**: Count of approved projects in province
3. **In Review**: Count of projects with status "Under Review"
4. **Funding Gap**: Sum of fundingGapUsd across all projects

### Secondary Stats (3 cards):
1. **Beneficiaries**: Sum of beneficiaries across all projects
2. **Jobs**: Sum of jobs created across all projects
3. **Readiness**: Average readiness score across projects

### Charts:
1. **Status Distribution (Horizontal Bar)**: Shows project counts by status
2. **Sector Distribution (Vertical Bar)**: Projects by sector in province
3. **Funding Analysis Grid**: Shows cost, gap, co-financing by project

---

## 11. FOCAL DASHBOARD - SUBMISSIONS TAB
**File**: `src/app/pages/FocalDashboard.tsx` - `SubmissionsTab()` function  
**Access**: Focal Point role

### Required APIs:

#### 11.1 List User's Projects
```
GET /api/v1/projects
?status=Draft|Submitted|Under Review|Returned
?province=<focal_user_province>
?page=<page>
?pageSize=20
```

#### 11.2 Update Project (Draft only)
```
PUT /api/v1/projects/:projectId
Body: { title, summary, sector, costUsd, ... }
```

#### 11.3 Submit Project
```
POST /api/v1/projects/:projectId/submit
Body: { note: "optional" }
```

#### 11.4 Create New Project
```
POST /api/v1/projects
Body: { title, summary, sector, costUsd, beneficiaries, jobs, ... }
```

### Table Display:
- Project title
- Status (badge with color)
- Cost USD
- Funding Gap
- Readiness score
- Last modified date
- Action buttons (Edit, Submit, View, Delete)

### Filter Options:
- Status filter
- Sector filter
- Search by title
- Sort by date/readiness/funding

---

## 12. FOCAL DASHBOARD - REVIEW FEEDBACK TAB
**File**: `src/app/pages/FocalDashboard.tsx` - `ReviewFeedbackTab()` function  
**Access**: Focal Point role

### Required APIs:

#### 12.1 List Submitted/Under Review Projects
```
GET /api/v1/projects
?status=Submitted|Under Review|Returned|Approved
?province=<focal_user_province>
?page=<page>
?pageSize=20
```

#### 12.2 Get Project Details (including status history)
```
GET /api/v1/projects/:projectId
```
- Returns statusHistory array with notes, dates, changed-by info

#### 12.3 Add Progress Update (for approved projects)
```
POST /api/v1/projects/:projectId/progress-update
Body: { text: "update", attachments: [] }
```

### Display Sections:
1. **Returned Projects Alert**: Shows returned projects with return notes
2. **Status Timeline**: For each submitted project, shows:
   - Current status
   - History of status changes with reviewer notes
   - Date of each change
   - Reviewer name

---

## 13. INVESTOR DASHBOARD - OVERVIEW TAB
**File**: `src/app/pages/InvestorDashboard.tsx` - `OverviewTab()` function  
**Access**: Investor role

### Required APIs:

#### 13.1 Dashboard Stats
```
GET /api/v1/projects/catalogue
?limit=100 (to calculate total)
```

#### 13.2 Sector Analysis
```
GET /api/v1/analytics/sector-breakdown
```

#### 13.3 Province Analysis
```
GET /api/v1/analytics/geography
```

### KPI Cards (4 cards):
1. **Approved Opportunities**: Total count of approved projects
2. **Saved Projects**: Count of investor's saved projects
3. **Active Interests**: Count of investor's active interests
4. **Funding Gap in View**: Sum of funding gaps in current catalogue view

### Charts:
1. **Opportunities by Sector (Pie/Donut)**: Sector distribution
2. **Opportunities by Province (Horizontal Bar)**: Geographic spread

---

## 14. INVESTOR DASHBOARD - CATALOGUE TAB
**File**: `src/app/pages/InvestorDashboard.tsx` - `CatalogueTab()` function  
**Access**: Investor role (Public for view only)

### Required APIs:

#### 14.1 List Approved Projects
```
GET /api/v1/projects/catalogue
?sector=<optional>
?province=<optional>
?wefTag=<optional>
?readiness=<optional>
?search=<optional>
?page=<page>
?pageSize=20
?sort=readiness
?order=desc
```

#### 14.2 Get Project Details
```
GET /api/v1/projects/:projectId
```

#### 14.3 Save Project
```
POST /api/v1/projects/:projectId/save
```

#### 14.4 Remove Saved Project
```
DELETE /api/v1/projects/:projectId/save
```

### Grid Display:
- Project card showing:
  - Title, summary, image
  - Province, sector, WEF tags
  - Cost, funding gap, readiness
  - Beneficiaries, jobs
  - Contact info
  - Save button
  - View details link

### Filters:
- Sector dropdown
- Province dropdown
- WEF nexus checkboxes (Water, Energy, Food)
- Readiness level
- Search by title
- Funding gap range slider
- Sort options

### Pagination:
- Page selector or "Load more" button

---

## 15. INVESTOR DASHBOARD - SAVED TAB
**File**: `src/app/pages/InvestorDashboard.tsx` - `SavedTab()` function  
**Access**: Investor role

### Required APIs:

#### 15.1 Get Saved Projects
```
GET /api/v1/investors/saved-projects
?page=<page>
?pageSize=20
```

#### 15.2 Remove from Saved
```
DELETE /api/v1/projects/:projectId/save
```

#### 15.3 Express Interest
```
POST /api/v1/investors/interests
Body: { projectId, message, commitmentUsd }
```

### Display:
- List of saved projects in card format
- Save date shown
- Action: Express Interest button
- Action: Remove from Saved button

---

## 16. INVESTOR DASHBOARD - INTERESTS TAB
**File**: `src/app/pages/InvestorDashboard.tsx` - `InterestsTab()` function  
**Access**: Investor role

### Required APIs:

#### 16.1 Get Investor's Interests
```
GET /api/v1/investors/interests
?status=<optional>
?page=<page>
?pageSize=20
```

#### 16.2 Track Interest Timeline
- Uses timeline array from interests response
- Shows all updates and responses from ministry/focal point

### Display for Each Interest:
- Project title
- Current status badge (Awaiting response, In discussion, Connected, Declined)
- Investor message
- Ministry/focal point response notes
- Timeline of all interactions
- Dates of status changes

### Filters:
- Status filter: All, Awaiting response, In discussion, Connected, Declined

---

## 17. INVESTOR DASHBOARD - ANALYTICS TAB
**File**: `src/app/pages/InvestorDashboard.tsx` - `AnalyticsTab()` function  
**Access**: Investor role

### Required APIs:

#### 17.1 Sector Analysis
```
GET /api/v1/analytics/sector-breakdown
```

#### 17.2 WEF Nexus Analysis
```
GET /api/v1/analytics/wef-nexus
```

#### 17.3 Geography Analysis
```
GET /api/v1/analytics/geography
```

### Charts/Displays:
1. **Sector Opportunity (Pie)**: Sector distribution with percentages
2. **WEF Nexus (Bar)**: Water, Energy, Food project counts
3. **Province Saturation (Horizontal Bar)**: Projects per province
4. **Investment Readiness (Scatter/Bubble)**: Cost vs Readiness

---

## 18. PROJECT DETAIL MODAL
**File**: `src/app/pages/ProjectDetail.tsx` - `ProjectDetailModal` component  
**Access**: Varies by role and project status

### Required APIs:

#### 18.1 Get Full Project Details
```
GET /api/v1/projects/:projectId
```

Returns:
- All project fields
- statusHistory array (for timeline)
- progressUpdates array (for approved projects)
- attachments array

#### 18.2 Download Attachment
```
GET /api/v1/files/:fileId/download
```

#### 18.3 Add Progress Update (Focal only, approved projects)
```
POST /api/v1/projects/:projectId/progress-update
Body: { text, attachments }
```

#### 18.4 Upload File
```
POST /api/v1/files/upload
Body: FormData { file, projectId }
```

### Display Sections:
1. **Project Header**: Title, province, sector, WEF tags, image
2. **Key Metrics**: Cost, funding gap, beneficiaries, jobs, readiness
3. **Details Tab**: Full description, agency, contact info, dates
4. **Timeline Tab**: Status history with reviewer notes
5. **Progress Tab** (if approved): Progress updates from focal point
6. **Attachments Tab**: List of files with download links
7. **Comments Tab** (if reviewer/admin): Add comments/notes

---

## 19. FILE UPLOAD FLOWS
**Used in multiple components for project attachments**

### Required APIs:

#### 19.1 Upload File
```
POST /api/v1/files/upload
Content-Type: multipart/form-data
Body:
  file: <binary>
  projectId: string
```

#### 19.2 Download File
```
GET /api/v1/files/:fileId/download
```

#### 19.3 Delete File (if needed)
```
DELETE /api/v1/files/:fileId
```

### Used in:
- Project creation/editing forms
- Status change dialogs (for return notes/docs)
- Progress update forms
- Interest response forms

---

## 20. NOTIFICATIONS SYSTEM
**Used across all authenticated pages**

### Required APIs:

#### 20.1 Get Notifications
```
GET /api/v1/notifications
?unreadOnly=false
?page=1
?pageSize=20
```

#### 20.2 Mark as Read
```
POST /api/v1/notifications/:notificationId/read
```

#### 20.3 Mark All as Read
```
POST /api/v1/notifications/read-all
```

### Display:
- Bell icon in header with unread count
- Notification dropdown/sidebar
- Types: project_submitted, status_changed, comment_added, interest_expressed

---

## Priority Implementation Order

### Phase 1 (Critical - All dashboards depend on these):
1. Authentication APIs (Login, Logout, Get Me)
2. Reference Data APIs (Provinces, Sectors, SDGs)
3. User Management APIs (Create, List, Update, Delete)

### Phase 2 (Dashboard Support):
4. Admin Dashboard Overview API
5. Projects List API (with role-based filtering)
6. Project Detail API
7. Analytics APIs (Sector, Geography, WEF)

### Phase 3 (Feature Implementation):
8. Project Creation/Update APIs
9. Project Status Management APIs
10. Review Queue API

### Phase 4 (Investor Features):
11. Saved Projects APIs
12. Interest Expression APIs
13. Interest Response APIs

### Phase 5 (File & Notifications):
14. File Upload/Download APIs
15. Notification APIs

---

## Testing Checklist for Backend Team

- [ ] All endpoints return proper error responses
- [ ] Role-based access control works correctly
- [ ] Pagination works on all list endpoints
- [ ] Filters work correctly (status, province, sector, etc.)
- [ ] File uploads validate file types and size
- [ ] Status transitions follow business rules
- [ ] Timestamps are in ISO8601 format
- [ ] Numeric fields have proper precision (USD amounts)
- [ ] Search functionality works across all list endpoints
- [ ] Sorting works on all list endpoints
- [ ] Rate limiting is enforced
- [ ] Database indexes exist on frequently filtered fields

---

**Document Version**: 1.0  
**Last Updated**: September 2026  
