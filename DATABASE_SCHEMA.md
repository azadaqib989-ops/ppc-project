# PCPP Database Schema Guide
## For Backend Development Team

---

## Table of Contents
1. Core Tables
2. Relationships & Foreign Keys
3. Indexes for Performance
4. Sample Data Queries
5. Implementation Notes

---

## 1. CORE TABLES

### 1.1 Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role ENUM('admin', 'reviewer', 'focal', 'investor') NOT NULL,
  title VARCHAR(100),
  organization VARCHAR(100),
  province_id UUID,
  province_name VARCHAR(100),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  
  -- Constraints
  CONSTRAINT email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_province_id ON users(province_id);
CREATE INDEX idx_users_active ON users(active);
```

**Purpose**: Stores all user accounts across roles  
**Fields Explained**:
- `role`: Determines dashboard access (admin/reviewer for ministry, focal for provincial, investor for investment partners)
- `province_id`: Foreign key to provinces table (only for focal point role)
- `active`: Soft delete flag (don't physically delete users)
- `password_hash`: Use bcrypt or similar secure hashing

---

### 1.2 Provinces Table
```sql
CREATE TABLE provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  code VARCHAR(10) UNIQUE,
  region VARCHAR(100),
  focal_point_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_provinces_name ON provinces(name);
CREATE INDEX idx_provinces_focal_point_id ON provinces(focal_point_id);
```

**Purpose**: Stores all Pakistani provinces/administrative divisions  
**Sample Data**:
- Punjab
- Sindh
- Khyber Pakhtunkhwa
- Balochistan
- Azad Jammu & Kashmir
- Gilgit-Baltistan

---

### 1.3 Sectors Table
```sql
CREATE TABLE sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  color VARCHAR(7),  -- Hex color code
  icon VARCHAR(50),  -- Icon name for frontend
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_sectors_name ON sectors(name);
```

**Purpose**: Stores project classification sectors  
**Sample Data**:
- Water Security
- Clean Energy
- Food Systems
- Ecosystems & Land
- Climate Adaptation
- Resilient Infrastructure

---

### 1.4 SDG Table (Sustainable Development Goals)
```sql
CREATE TABLE sdgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE NOT NULL,  -- e.g., "SDG 1", "SDG 6"
  title VARCHAR(200) NOT NULL,
  description TEXT,
  color VARCHAR(7),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_sdgs_code ON sdgs(code);
```

**Purpose**: Stores UN Sustainable Development Goals reference data  
**Sample Data**:
- SDG 1: No Poverty
- SDG 6: Clean Water and Sanitation
- SDG 7: Affordable and Clean Energy
- ... SDG 17

---

### 1.5 Projects Table
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  title VARCHAR(200) NOT NULL,
  summary TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  
  -- Geography & Classification
  province_id UUID NOT NULL REFERENCES provinces(id),
  district VARCHAR(100),
  sector_id UUID NOT NULL REFERENCES sectors(id),
  primary_sector_id UUID REFERENCES sectors(id),
  secondary_sector_id UUID REFERENCES sectors(id),
  
  -- Financial Data
  cost_usd DECIMAL(15, 2) NOT NULL CHECK (cost_usd > 0),
  funding_gap_usd DECIMAL(15, 2) NOT NULL CHECK (funding_gap_usd >= 0 AND funding_gap_usd <= cost_usd),
  co_financing_usd DECIMAL(15, 2) CHECK (co_financing_usd >= 0),
  available_funding_usd DECIMAL(15, 2),
  
  -- Impact Data
  beneficiaries INT NOT NULL CHECK (beneficiaries > 0),
  jobs INT NOT NULL CHECK (jobs >= 0),
  readiness INT DEFAULT 40 CHECK (readiness >= 0 AND readiness <= 100),
  
  -- Timeline
  start_date DATE,
  end_date DATE CHECK (end_date >= start_date),
  
  -- Implementation
  implementing_agency VARCHAR(255),
  
  -- Contact Info
  contact_name VARCHAR(100),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  
  -- Risk & Notes
  risk_notes TEXT,
  
  -- Status & Metadata
  status ENUM('Draft', 'Submitted', 'Under Review', 'Approved', 'Returned') DEFAULT 'Draft',
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT email_format CHECK (contact_email IS NULL OR contact_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_province_id ON projects(province_id);
CREATE INDEX idx_projects_sector_id ON projects(sector_id);
CREATE INDEX idx_projects_created_by ON projects(created_by_user_id);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_readiness ON projects(readiness);
CREATE INDEX idx_projects_cost_usd ON projects(cost_usd);
CREATE INDEX idx_projects_province_status ON projects(province_id, status);  -- Compound for focal point queries
```

**Purpose**: Core project pipeline data  
**Status Values**: Draft → Submitted → Under Review → {Approved | Returned}  
**Key Constraints**:
- Cost must be positive
- Funding gap must be 0 to cost amount
- Beneficiaries must be positive
- Readiness 0-100 scale
- End date must be after start date

---

### 1.6 Project WEF Tags Table
```sql
CREATE TABLE project_wef_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  wef_tag ENUM('Water', 'Energy', 'Food') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique constraint to prevent duplicate tags per project
  UNIQUE(project_id, wef_tag)
);

-- Indexes
CREATE INDEX idx_project_wef_tags_project_id ON project_wef_tags(project_id);
CREATE INDEX idx_project_wef_tags_wef_tag ON project_wef_tags(wef_tag);
```

**Purpose**: Links projects to Water-Energy-Food nexus tags (many-to-many)  
**Why Separate Table**: Projects can have multiple WEF tags (0-3)

---

### 1.7 Project SDG Links Table
```sql
CREATE TABLE project_sdgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sdg_id UUID NOT NULL REFERENCES sdgs(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique constraint
  UNIQUE(project_id, sdg_id)
);

-- Indexes
CREATE INDEX idx_project_sdgs_project_id ON project_sdgs(project_id);
CREATE INDEX idx_project_sdgs_sdg_id ON project_sdgs(sdg_id);
```

**Purpose**: Links projects to SDG goals (many-to-many)

---

### 1.8 Project Status History Table
```sql
CREATE TABLE project_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  old_status ENUM('Draft', 'Submitted', 'Under Review', 'Approved', 'Returned'),
  new_status ENUM('Draft', 'Submitted', 'Under Review', 'Approved', 'Returned') NOT NULL,
  changed_by_user_id UUID NOT NULL REFERENCES users(id),
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- We don't usually update status history, so no updated_at
  CHECK (old_status != new_status)
);

-- Indexes
CREATE INDEX idx_project_status_history_project_id ON project_status_history(project_id);
CREATE INDEX idx_project_status_history_created_at ON project_status_history(created_at);
CREATE INDEX idx_project_status_history_changed_by ON project_status_history(changed_by_user_id);
```

**Purpose**: Audit trail of all project status changes  
**Key Fields**:
- `old_status`: Previous status (can be NULL for first creation)
- `new_status`: Current status after this change
- `changed_by_user_id`: Which user/admin made this change
- `note`: Reason for change (especially important for "Returned" status)

---

### 1.9 Project Attachments Table
```sql
CREATE TABLE project_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_path VARCHAR(500) NOT NULL,  -- S3 path or local filesystem path
  file_size_bytes INT NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 52428800),  -- Max 50MB
  upload_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT valid_mime_type CHECK (mime_type IN (
    'application/pdf', 
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png', 'image/jpeg', 'image/gif'
  ))
);

-- Indexes
CREATE INDEX idx_project_attachments_project_id ON project_attachments(project_id);
CREATE INDEX idx_project_attachments_created_at ON project_attachments(created_at);
```

**Purpose**: Stores project attachment metadata  
**Notes**:
- Actual files stored in S3 or local storage
- Only metadata (filename, size, path) in database
- Supports: PDF, Word, Excel, PowerPoint, PNG, JPG, GIF
- Max file size: 50MB

---

### 1.10 Project Progress Updates Table
```sql
CREATE TABLE project_progress_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Progress updates only for approved projects
  CONSTRAINT text_length CHECK (char_length(text) >= 10 AND char_length(text) <= 2000)
);

-- Indexes
CREATE INDEX idx_project_progress_updates_project_id ON project_progress_updates(project_id);
CREATE INDEX idx_project_progress_updates_created_at ON project_progress_updates(created_at);
CREATE INDEX idx_project_progress_updates_created_by ON project_progress_updates(created_by_user_id);
```

**Purpose**: Stores project status updates posted by focal points  
**Used For**: Approved projects only, to track implementation progress

---

### 1.11 Progress Update Attachments Table
```sql
CREATE TABLE progress_update_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progress_update_id UUID NOT NULL REFERENCES project_progress_updates(id) ON DELETE CASCADE,
  attachment_id UUID NOT NULL REFERENCES project_attachments(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_progress_update_attachments_progress_update_id ON progress_update_attachments(progress_update_id);
```

**Purpose**: Links progress updates to their attachments (many-to-many)

---

### 1.12 Investor Interests Table
```sql
CREATE TABLE investor_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  investor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  commitment_usd DECIMAL(15, 2),
  status ENUM('Awaiting response', 'In discussion', 'Connected', 'Declined') DEFAULT 'Awaiting response',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Each investor can only express interest once per project
  UNIQUE(project_id, investor_user_id),
  
  -- Constraints
  CONSTRAINT message_length CHECK (char_length(message) >= 10 AND char_length(message) <= 1000),
  CONSTRAINT commitment_positive CHECK (commitment_usd IS NULL OR commitment_usd > 0)
);

-- Indexes
CREATE INDEX idx_investor_interests_project_id ON investor_interests(project_id);
CREATE INDEX idx_investor_interests_investor_user_id ON investor_interests(investor_user_id);
CREATE INDEX idx_investor_interests_status ON investor_interests(status);
CREATE INDEX idx_investor_interests_investor_status ON investor_interests(investor_user_id, status);
```

**Purpose**: Records investor interest in projects  
**Status Progression**: Awaiting response → {In discussion, Declined} → Connected

---

### 1.13 Interest Updates Table
```sql
CREATE TABLE interest_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interest_id UUID NOT NULL REFERENCES investor_interests(id) ON DELETE CASCADE,
  old_status ENUM('Awaiting response', 'In discussion', 'Connected', 'Declined'),
  new_status ENUM('Awaiting response', 'In discussion', 'Connected', 'Declined') NOT NULL,
  note TEXT NOT NULL,
  updated_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_interest_updates_interest_id ON interest_updates(interest_id);
CREATE INDEX idx_interest_updates_created_at ON interest_updates(created_at);
```

**Purpose**: Audit trail for investor interest status changes

---

### 1.14 Saved Projects Table
```sql
CREATE TABLE saved_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Each investor can only save a project once
  UNIQUE(investor_user_id, project_id)
);

-- Indexes
CREATE INDEX idx_saved_projects_investor_user_id ON saved_projects(investor_user_id);
CREATE INDEX idx_saved_projects_project_id ON saved_projects(project_id);
```

**Purpose**: Tracks which projects investors have bookmarked

---

### 1.15 Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type ENUM('project_submitted', 'status_changed', 'comment_added', 'interest_expressed') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  related_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_notifications_recipient_user_id ON notifications(recipient_user_id);
CREATE INDEX idx_notifications_recipient_read ON notifications(recipient_user_id, read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_related_project_id ON notifications(related_project_id);
```

**Purpose**: In-app notifications for all user actions  
**Types**:
- `project_submitted`: When focal point submits a project
- `status_changed`: When admin changes project status
- `comment_added`: When reviewer adds a comment
- `interest_expressed`: When investor expresses interest

---

## 2. RELATIONSHIPS & FOREIGN KEYS

```
users
  ├─→ provinces (many focal points per province, one per user)
  ├─→ projects (created_by)
  ├─→ investor_interests (investor_user_id)
  └─→ saved_projects (investor_user_id)

provinces
  ├─→ projects (many)
  └─→ users (focal point)

sectors
  └─→ projects (many via sector_id, primary_sector_id, secondary_sector_id)

projects
  ├─→ project_wef_tags (many, 0-3 tags)
  ├─→ project_sdgs (many, 0+)
  ├─→ project_attachments (many)
  ├─→ project_progress_updates (many)
  ├─→ project_status_history (many)
  ├─→ investor_interests (many)
  └─→ saved_projects (many)

investor_interests
  └─→ interest_updates (many)

progress_update_attachments
  ├─→ project_progress_updates
  └─→ project_attachments
```

---

## 3. INDEXES FOR PERFORMANCE

### Critical Indexes (Create these first):
```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active_role ON users(active, role);

-- Project filtering by admin/focal/investor
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_province_id ON projects(province_id);
CREATE INDEX idx_projects_province_status ON projects(province_id, status);
CREATE INDEX idx_projects_created_by ON projects(created_by_user_id);

-- Timeline queries
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_project_status_history_project_id ON project_status_history(project_id);

-- Analytics queries
CREATE INDEX idx_projects_sector_id ON projects(sector_id);
CREATE INDEX idx_projects_readiness ON projects(readiness);
CREATE INDEX idx_projects_cost_usd ON projects(cost_usd);

-- Investor features
CREATE INDEX idx_investor_interests_investor_user_id ON investor_interests(investor_user_id);
CREATE INDEX idx_saved_projects_investor_user_id ON saved_projects(investor_user_id);

-- Notifications
CREATE INDEX idx_notifications_recipient_read ON notifications(recipient_user_id, read);
```

### Composite Indexes (For complex queries):
```sql
-- Focal point dashboard
CREATE INDEX idx_projects_province_status_readiness ON projects(province_id, status, readiness DESC);

-- Admin review queue
CREATE INDEX idx_projects_status_sector_created ON projects(status, sector_id, created_at DESC);

-- Analytics
CREATE INDEX idx_projects_status_sector_province ON projects(status, sector_id, province_id);
```

---

## 4. SAMPLE DATA QUERIES

### Query: Admin Dashboard Overview
```sql
SELECT 
  (SELECT COUNT(*) FROM projects) as total_projects,
  (SELECT COUNT(*) FROM projects WHERE status = 'Approved') as approved_projects,
  (SELECT COUNT(*) FROM projects WHERE status = 'Submitted') as submitted_projects,
  (SELECT COUNT(*) FROM projects WHERE status = 'Under Review') as under_review_projects,
  (SELECT COUNT(*) FROM projects WHERE status = 'Returned') as returned_projects,
  (SELECT COUNT(*) FROM projects WHERE status = 'Draft') as draft_projects,
  (SELECT SUM(cost_usd) FROM projects WHERE status = 'Approved') as total_cost_usd,
  (SELECT SUM(funding_gap_usd) FROM projects WHERE status = 'Approved') as total_funding_gap_usd,
  (SELECT SUM(beneficiaries) FROM projects WHERE status = 'Approved') as total_beneficiaries,
  (SELECT SUM(jobs) FROM projects WHERE status = 'Approved') as total_jobs;
```

### Query: Projects by Province
```sql
SELECT 
  p.name as province_name,
  COUNT(pr.id) as project_count,
  SUM(pr.funding_gap_usd) as funding_gap_usd,
  COUNT(CASE WHEN pr.status = 'Approved' THEN 1 END) as approved_count
FROM provinces p
LEFT JOIN projects pr ON p.id = pr.province_id
GROUP BY p.id, p.name
ORDER BY project_count DESC;
```

### Query: Focal Point's Draft & Submitted Projects
```sql
SELECT 
  id, title, status, cost_usd, funding_gap_usd, 
  beneficiaries, jobs, readiness, created_at, updated_at
FROM projects
WHERE created_by_user_id = $1 
  AND province_id = $2
  AND status IN ('Draft', 'Submitted', 'Returned')
ORDER BY updated_at DESC
LIMIT 20 OFFSET 0;
```

### Query: Review Queue (Admin)
```sql
SELECT 
  p.id, p.title, prov.name as province, s.name as sector,
  p.status, p.cost_usd, p.funding_gap_usd, p.readiness,
  p.submitted_at, u.name as submitted_by
FROM projects p
JOIN provinces prov ON p.province_id = prov.id
JOIN sectors s ON p.sector_id = s.id
JOIN users u ON p.created_by_user_id = u.id
WHERE p.status IN ('Submitted', 'Under Review', 'Returned')
  AND (prov.id = $1 OR $1 IS NULL)  -- Optional province filter
  AND (s.id = $2 OR $2 IS NULL)      -- Optional sector filter
ORDER BY p.submitted_at DESC
LIMIT 20 OFFSET 0;
```

### Query: Investor's Interests with Project Details
```sql
SELECT 
  ii.id, ii.status, ii.message, ii.commitment_usd,
  ii.created_at, ii.updated_at,
  p.id as project_id, p.title, p.summary,
  prov.name as province, s.name as sector,
  p.cost_usd, p.funding_gap_usd
FROM investor_interests ii
JOIN projects p ON ii.project_id = p.id
JOIN provinces prov ON p.province_id = prov.id
JOIN sectors s ON p.sector_id = s.id
WHERE ii.investor_user_id = $1
  AND (ii.status = $2 OR $2 IS NULL)  -- Optional status filter
ORDER BY ii.created_at DESC
LIMIT 20 OFFSET 0;
```

### Query: Projects by WEF Tags
```sql
SELECT 
  p.id, p.title, p.cost_usd, COUNT(pwt.id) as wef_count,
  STRING_AGG(pwt.wef_tag, ', ') as wef_tags
FROM projects p
LEFT JOIN project_wef_tags pwt ON p.id = pwt.project_id
WHERE p.status = 'Approved'
GROUP BY p.id
HAVING (pwt.wef_tag = ANY($1::text[]) OR array_length($1::text[], 1) IS NULL)
ORDER BY p.readiness DESC;
```

---

## 5. IMPLEMENTATION NOTES

### Data Validation Rules

**Projects Table**:
- `title`: 3-200 characters
- `summary`: 10-1000 characters
- `cost_usd`: Must be > 0 and <= 999,999,999,999.99
- `funding_gap_usd`: 0 <= funding_gap <= cost_usd
- `beneficiaries`: Must be > 0
- `jobs`: Must be >= 0
- `readiness`: 0-100 integer
- `start_date` and `end_date`: Must be valid dates with end >= start
- Email fields: Standard email format validation
- Phone: Must match phone number format

**Status Transitions**:
- Draft → Submitted (by focal point)
- Submitted → Under Review (by admin)
- Under Review → Approved OR Returned (by admin)
- Returned → Draft (reverted to draft for modification)
- Approved → Can't change status back (final state)

### Performance Considerations

1. **Soft Deletes**: Use `active` flag instead of physically deleting users
2. **Partitioning**: Consider partitioning `projects` table by `province_id` for large datasets
3. **Archiving**: Archive old notifications and status history to separate tables after 1 year
4. **Caching**: Cache reference data (provinces, sectors, SDGs) with 24-hour TTL
5. **Full-Text Search**: Add GIN index for full-text search on project titles/summaries

### Audit Trail

All state-changing operations should create audit log records:
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  table_name VARCHAR(100),
  record_id UUID,
  operation ENUM('INSERT', 'UPDATE', 'DELETE'),
  old_values JSONB,
  new_values JSONB,
  changed_by_user_id UUID REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Backup & Recovery

- Daily backups of all production databases
- Point-in-time recovery capability (30-day retention)
- Test restore process monthly

### Security

1. Hash all passwords with bcrypt (cost factor: 12)
2. Never store API tokens in plaintext (use hash)
3. Encrypt sensitive fields at rest:
   - Contact phone numbers
   - Contact emails
   - Risk notes
4. Implement row-level security (RLS) in PostgreSQL
5. Audit all admin actions

---

**Database Schema Version**: 1.0  
**Compatible With**: PostgreSQL 12+  
**Last Updated**: September 2026  
