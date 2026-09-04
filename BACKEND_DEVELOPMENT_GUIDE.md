# PCPP Backend Documentation Package
## Complete Guide for Development Team

---

## 📦 What's Included

This package contains **3 comprehensive documents** for your backend development team:

### 1. **API_SPECIFICATION.md** (Comprehensive)
**Size**: ~50KB | **Sections**: 8 major sections | **APIs**: 40+ endpoints

**Contains**:
- Complete REST API endpoint documentation
- Request/response formats with JSON examples
- Field validation rules for every endpoint
- HTTP status codes and error handling
- Authentication and authorization requirements
- Rate limiting recommendations
- Security requirements

**Best Used For**: 
- Backend API development
- Contract testing
- API documentation in Swagger/OpenAPI

---

### 2. **FRONTEND_TO_API_MAPPING.md** (Quick Reference)
**Size**: ~45KB | **Sections**: 20 views | **Priority**: 5 phases

**Contains**:
- Which API endpoints are used in each frontend view
- Specific query parameters and filters needed
- Data fields required for each display
- Priority implementation order (phased approach)
- Testing checklist for QA

**Best Used For**:
- Understanding which APIs to implement first
- Integrating frontend with backend
- Sprint planning and task allocation
- Frontend developer reference

---

### 3. **DATABASE_SCHEMA.md** (Technical Design)
**Size**: ~40KB | **Sections**: 5 sections | **Tables**: 15 core tables

**Contains**:
- Complete SQL schema for all tables
- Table relationships and foreign keys
- Indexes for performance optimization
- Sample queries for common operations
- Data validation constraints
- Audit trail and backup strategies

**Best Used For**:
- Database design and implementation
- Understanding data relationships
- Performance tuning
- Security and compliance planning

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Week 1)
**Priority**: CRITICAL - Must complete first
- [ ] Set up database (PostgreSQL 12+)
- [ ] Implement Users table and authentication
- [ ] Implement Reference Data (Provinces, Sectors, SDGs)
- [ ] Create Auth APIs: Login, Logout, Get Me
- [ ] Create Reference APIs: Get Provinces, Get Sectors

**Key Files**: API_SPECIFICATION.md (Sections 1-2, 9)  
**Database**: DATABASE_SCHEMA.md (Tables 1.1, 1.2, 1.3, 1.4)

---

### Phase 2: Dashboard Support (Week 2)
**Priority**: HIGH - Enables all dashboard views
- [ ] Implement Projects table and basic CRUD
- [ ] Create Project list endpoint with filtering
- [ ] Create Project detail endpoint
- [ ] Create Admin Dashboard overview endpoint
- [ ] Create Analytics endpoints (sector, geography, WEF)

**Key Files**: API_SPECIFICATION.md (Sections 3-6)  
**Database**: DATABASE_SCHEMA.md (Tables 1.5-1.7, Queries section)

**Unlocks**: Admin Dashboard, Focal Dashboard, Investor Dashboard can show data

---

### Phase 3: Review & Workflow (Week 3)
**Priority**: HIGH - Core business logic
- [ ] Implement Project Status workflow
- [ ] Create Status History tracking
- [ ] Create Review Queue endpoint
- [ ] Implement Project status update endpoint
- [ ] Create Province management endpoints

**Key Files**: API_SPECIFICATION.md (Section 4), FRONTEND_TO_API_MAPPING.md (Section 5-6, 8-9, 12)  
**Database**: DATABASE_SCHEMA.md (Tables 1.8, 1.9, Queries)

**Unlocks**: Ministry review workflows, admin/focal dashboard features

---

### Phase 4: Investor Features (Week 4)
**Priority**: MEDIUM - Investor-specific functionality
- [ ] Create Saved Projects feature
- [ ] Implement Investor Interests workflow
- [ ] Create Interests response endpoint
- [ ] Create Investor-specific analytics
- [ ] Implement Interest status tracking

**Key Files**: API_SPECIFICATION.md (Section 5), FRONTEND_TO_API_MAPPING.md (Section 14-17)  
**Database**: DATABASE_SCHEMA.md (Tables 1.12-1.13, 1.14)

**Unlocks**: Investor dashboard catalog, interests management

---

### Phase 5: Advanced Features (Week 5)
**Priority**: MEDIUM - Polish and notifications
- [ ] Implement File Upload/Download
- [ ] Create Notification system
- [ ] Implement Progress Updates
- [ ] Add Report generation
- [ ] Set up audit logging

**Key Files**: API_SPECIFICATION.md (Sections 7-8), FRONTEND_TO_API_MAPPING.md (Section 18-20)  
**Database**: DATABASE_SCHEMA.md (Tables 1.10-1.11, 1.15)

---

## 📋 Quick Reference Guide

### Most Used Endpoints (Priority to implement)

```
🔴 CRITICAL (All dashboards need these)
├─ POST   /api/v1/auth/login
├─ GET    /api/v1/auth/me
├─ GET    /api/v1/reference/provinces
├─ GET    /api/v1/reference/sectors
├─ GET    /api/v1/projects
├─ GET    /api/v1/projects/:projectId
└─ GET    /api/v1/admin/dashboard/overview

🟠 HIGH (Dashboard features)
├─ GET    /api/v1/admin/review-queue
├─ GET    /api/v1/admin/provinces
├─ GET    /api/v1/analytics/sector-breakdown
├─ GET    /api/v1/analytics/geography
└─ GET    /api/v1/analytics/wef-nexus

🟡 MEDIUM (Business logic)
├─ POST   /api/v1/projects
├─ PUT    /api/v1/projects/:projectId
├─ POST   /api/v1/projects/:projectId/status
├─ POST   /api/v1/projects/:projectId/submit
└─ GET    /api/v1/users

🟢 LOW (Nice to have)
├─ POST   /api/v1/files/upload
├─ GET    /api/v1/notifications
├─ POST   /api/v1/investors/interests
└─ GET    /api/v1/admin/reports
```

---

## 🔧 Technology Stack Recommendations

### Backend
- **Framework**: Express.js (Node.js) or Django/FastAPI (Python)
- **Database**: PostgreSQL 12+ (as specified in schema)
- **Authentication**: JWT with refresh tokens
- **File Storage**: AWS S3 or local with backup
- **Caching**: Redis for reference data
- **Logging**: ELK stack or Datadog

### Key Libraries
- bcrypt for password hashing
- jsonwebtoken for JWT handling
- multer or werkzeug for file uploads
- joi or pydantic for validation
- winston or structlog for logging

---

## 📊 Database Overview

### 15 Core Tables

```
Users (auth & roles)
  ↓
Provinces (geography)
  ↓
Sectors & SDGs (classification)
  ↓
Projects (core data) ← Multiple related tables
  ├─ project_wef_tags
  ├─ project_sdgs
  ├─ project_attachments
  ├─ project_progress_updates
  ├─ project_status_history
  ├─ investor_interests
  ├─ saved_projects
  └─ notifications
```

### Table Sizes (Expected)
- Users: 100-500 rows
- Projects: 500-10,000 rows (grows as more provinces submit)
- Status History: 5-50x projects count
- Investor Interests: 100-1000 rows
- Notifications: 10,000+ rows (may need archiving)

---

## 🔐 Security Checklist

- [ ] All passwords hashed with bcrypt (cost: 12)
- [ ] JWT tokens with 24-hour expiration
- [ ] Refresh tokens for extended sessions
- [ ] Role-based access control (RBAC)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] CORS properly configured
- [ ] HTTPS enforced
- [ ] Rate limiting implemented
- [ ] Audit logging for all state changes
- [ ] Sensitive data encrypted at rest
- [ ] File upload validation (type, size)

---

## ✅ Testing Strategy

### Unit Testing
- Validate all business logic functions
- Test validation rules
- Test error handling

### Integration Testing
- Test endpoint workflows (create → submit → approve)
- Test filtering and sorting
- Test access control (same tests with different roles)

### End-to-End Testing
- Test complete user journeys:
  1. Focal Point: Create → Submit → Receive feedback → Modify → Resubmit
  2. Admin: Review queue → Approve/Return
  3. Investor: Browse → Save → Express Interest → Track

### Performance Testing
- Load test with 1000+ concurrent users
- Test with 10,000+ projects in database
- Monitor API response times (target: <500ms)

---

## 📞 Communication Protocol

### Frontend Team (Already working)
- Uses `/api/v1` prefix for all calls
- Expects Bearer token authentication
- Handles 401/403 errors for re-login
- Supports pagination (page, pageSize)

### Backend Team (You)
- Implement all endpoints documented
- Return consistent error responses
- Use standard HTTP status codes
- Document any deviations immediately
- Provide test API credentials

---

## 🎯 Success Criteria

### Phase 1 (Week 1) ✅
- [ ] 5 Auth APIs working
- [ ] 3 Reference Data APIs working
- [ ] Can log in and get user info

### Phase 2 (Week 2) ✅
- [ ] Project CRUD working
- [ ] Dashboard overview shows data
- [ ] All 4 dashboards display metrics

### Phase 3 (Week 3) ✅
- [ ] Status workflow functioning
- [ ] Review queue populated
- [ ] Admin can approve/return projects

### Phase 4 (Week 4) ✅
- [ ] Investor can save projects
- [ ] Investor can express interest
- [ ] Interest responses working

### Phase 5 (Week 5) ✅
- [ ] File uploads working
- [ ] Notifications sending
- [ ] Reports generating
- [ ] All 40+ endpoints functional

---

## 📚 Document Index

| Document | Purpose | Size | Sections | Read Time |
|----------|---------|------|----------|-----------|
| API_SPECIFICATION.md | API Details | 50KB | 8 | 45 min |
| FRONTEND_TO_API_MAPPING.md | Integration Guide | 45KB | 20 | 35 min |
| DATABASE_SCHEMA.md | DB Design | 40KB | 5 | 40 min |

**Total Documentation**: ~135KB  
**Total Read Time**: ~2 hours (full package)  
**Quick Start Read**: 30 minutes (skipping sections 3-5 in each doc)

---

## 🆘 Support & Questions

### Common Questions

**Q: Which database should we use?**  
A: PostgreSQL 12+ (specified in DATABASE_SCHEMA.md). Uses JSON for flexibility with JSONB types.

**Q: What's the authentication flow?**  
A: POST /login returns JWT token. Include in Authorization header for protected endpoints.

**Q: Can we modify the API?**  
A: Only with frontend team approval. These docs were built based on frontend requirements.

**Q: Timeline for implementation?**  
A: Recommended 5 weeks following the phased approach (1 week per phase).

**Q: How to handle errors?**  
A: Use standard HTTP codes (400, 401, 403, 404, 500) and return JSON with `success: false`.

---

## 📝 Handoff Checklist

Backend team should verify:
- [ ] All 3 documents received and reviewed
- [ ] Database schema understood
- [ ] All 40+ APIs understood
- [ ] Frontend integration points clear
- [ ] Security requirements acknowledged
- [ ] Technology stack decided
- [ ] 5-phase roadmap agreed upon
- [ ] Questions documented
- [ ] Development environment setup complete

---

## Version Information

- **API Version**: v1
- **Frontend Base URL**: `/api/v1`
- **Documentation Version**: 1.0
- **Last Updated**: September 2026
- **Status**: Ready for Backend Development

---

**Next Steps**:
1. Review all 3 documents (API_SPECIFICATION.md first)
2. Set up PostgreSQL database
3. Create project scaffold with chosen framework
4. Implement Phase 1 (Auth & Reference Data)
5. Test with frontend team
6. Proceed to Phase 2

---

**This documentation package is complete and ready for production backend development.**

For frontend team: These docs are available at:
- [API_SPECIFICATION.md](./API_SPECIFICATION.md)
- [FRONTEND_TO_API_MAPPING.md](./FRONTEND_TO_API_MAPPING.md)
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)

