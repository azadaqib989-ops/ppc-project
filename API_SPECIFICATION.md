# PCPP (Pakistan Climate Project Pipeline) - Complete API Specification
## For Backend Development Team

---

## Table of Contents
1. Authentication APIs
2. User Management APIs
3. Project Management APIs
4. Admin/Review APIs
5. Investor APIs
6. Dashboard Analytics APIs
7. Notification APIs
8. File Upload APIs

---

## 1. AUTHENTICATION APIs

### 1.1 POST `/api/v1/auth/login`
**Purpose**: User authentication
**Access**: Public

**Request Body**:
```json
{
  "email": "string (required, email format)",
  "password": "string (required, min 8 chars)"
}
```

**Validation Rules**:
- Email: Valid email format, required
- Password: Minimum 8 characters, required

**Response (Success - 200)**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "admin | reviewer | focal | investor",
    "organization": "string (optional)",
    "title": "string (optional)",
    "provinceId": "string (optional, for focal role)",
    "provinceName": "string (optional, for focal role)"
  },
  "token": "string (JWT)"
}
```

**Response (Error - 401)**:
```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

---

### 1.2 POST `/api/v1/auth/signup`
**Purpose**: User registration
**Access**: Public

**Request Body**:
```json
{
  "email": "string (required, unique)",
  "password": "string (required, min 8 chars)",
  "name": "string (required)",
  "role": "investor | focal (required)",
  "organization": "string (optional, for investors)",
  "title": "string (optional)",
  "provinceId": "string (required if role=focal)"
}
```

**Validation Rules**:
- Email: Valid email format, unique in database
- Password: Minimum 8 characters, contain uppercase, lowercase, number
- Name: Required, 2-100 characters
- Role: Must be "investor" or "focal"
- ProvinceId: Required if role is "focal", must be valid province ID

**Response (Success - 201)**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "string"
  },
  "token": "string (JWT)"
}
```

**Response (Error - 400)**:
```json
{
  "success": false,
  "error": "Email already exists" | "Invalid province"
}
```

---

### 1.3 POST `/api/v1/auth/logout`
**Purpose**: End user session
**Access**: Authenticated

**Request**: No body

**Response (Success - 200)**:
```json
{
  "success": true
}
```

---

### 1.4 GET `/api/v1/auth/me`
**Purpose**: Get current user details
**Access**: Authenticated

**Response (Success - 200)**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "string",
    "organization": "string",
    "title": "string",
    "provinceId": "string",
    "provinceName": "string"
  }
}
```

---

## 2. USER MANAGEMENT APIs

### 2.1 GET `/api/v1/users`
**Purpose**: List all users (Admin only)
**Access**: Admin

**Query Parameters**:
```
?role=admin|reviewer|focal|investor (optional)
?province=string (optional, for focal users)
?page=number (default: 1)
?pageSize=number (default: 20)
?search=string (optional, search by name/email)
```

**Response (Success - 200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "email": "string",
      "name": "string",
      "role": "string",
      "title": "string",
      "organization": "string",
      "provinceId": "string",
      "provinceName": "string",
      "active": "boolean",
      "createdAt": "ISO8601"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 100,
  "totalPages": 5
}
```

---

### 2.2 PUT `/api/v1/users/:userId`
**Purpose**: Update user details
**Access**: Self or Admin

**Request Body**:
```json
{
  "name": "string (optional)",
  "title": "string (optional)",
  "organization": "string (optional)",
  "active": "boolean (optional, admin only)",
  "role": "string (optional, admin only)"
}
```

**Validation Rules**:
- Name: 2-100 characters
- Title: 0-100 characters
- Organization: 0-100 characters

**Response (Success - 200)**:
```json
{
  "success": true,
  "data": { /* Updated user object */ }
}
```

---

### 2.3 DELETE `/api/v1/users/:userId`
**Purpose**: Deactivate user
**Access**: Admin

**Response (Success - 200)**:
```json
{
  "success": true,
  "message": "User deactivated"
}
```

---

## 3. PROJECT MANAGEMENT APIs

### 3.1 POST `/api/v1/projects`
**Purpose**: Create new project submission
**Access**: Focal Point

**Request Body**:
```json
{
  "title": "string (required, 3-200 chars)",
  "summary": "string (required, 10-1000 chars)",
  "district": "string (optional)",
  "sector": "string (required)",
  "primarySector": "string (required)",
  "secondarySector": "string (optional)",
  "sdgs": ["string (optional, SDG format)"],
  "wefTags": ["Water | Energy | Food (required, at least 1)"],
  "costUsd": "number (required, > 0)",
  "fundingGapUsd": "number (required, >= 0, <= costUsd)",
  "coFinancingUsd": "number (optional, >= 0)",
  "beneficiaries": "number (required, > 0)",
  "jobs": "number (required, >= 0)",
  "readiness": "number (0-100, optional, default: 40)",
  "startDate": "date (ISO8601, optional)",
  "endDate": "date (ISO8601, optional, >= startDate)",
  "implementingAgency": "string (optional, 0-200 chars)",
  "contactName": "string (optional, 2-100 chars)",
  "contactEmail": "string (optional, email format)",
  "contactPhone": "string (optional, phone format)",
  "riskNotes": "string (optional, 0-1000 chars)",
  "attachments": ["file IDs (optional)"]
}
```

**Validation Rules**:
- Title: Required, 3-200 characters
- Summary: Required, 10-1000 characters
- Sector: Required, must match predefined list
- WEF Tags: Required, at least 1 tag selected
- Cost USD: Required, positive number
- Funding Gap: Required, 0 to cost amount
- Co-financing: Optional, non-negative
- Beneficiaries: Required, positive number
- Jobs: Required, non-negative
- Readiness: 0-100 scale
- Dates: If provided, must be valid ISO8601, endDate >= startDate
- Phone: Must match phone format
- Email: Must be valid email format

**Response (Success - 201)**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "status": "Draft",
    "createdAt": "ISO8601",
    "createdBy": "string"
  }
}
```

**Response (Error - 400)**:
```json
{
  "success": false,
  "error": "Validation error",
  "details": {
    "field": ["error message"]
  }
}
```

---

### 3.2 GET `/api/v1/projects`
**Purpose**: List projects (with role-based filtering)
**Access**: Authenticated

**Query Parameters**:
```
?status=Draft|Submitted|Under Review|Approved|Returned (optional)
?sector=string (optional)
?province=string (optional)
?wefTag=Water|Energy|Food (optional)
?readiness=Low|Medium|High (optional)
?search=string (optional, search by title)
?page=number (default: 1)
?pageSize=number (default: 20)
?sort=status|date|readiness (optional)
?order=asc|desc (optional, default: desc)
```

**Access Rules**:
- Focal Point: Only their province's projects + Draft/Submitted/Returned
- Admin/Reviewer: All projects
- Investor: Only approved projects
- Public: No access (must be authenticated)

**Response (Success - 200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "title": "string",
      "summary": "string",
      "provinceName": "string",
      "district": "string",
      "sectorName": "string",
      "status": "string",
      "costUsd": "number",
      "fundingGapUsd": "number",
      "beneficiaries": "number",
      "jobs": "number",
      "readiness": "number",
      "startDate": "ISO8601",
      "endDate": "ISO8601",
      "wefTags": ["string"],
      "createdAt": "ISO8601",
      "modifiedAt": "ISO8601"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 100,
  "totalPages": 5
}
```

---

### 3.3 GET `/api/v1/projects/:projectId`
**Purpose**: Get single project details
**Access**: Creator, Admin, Reviewer, or (Investor if approved)

**Response (Success - 200)**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "title": "string",
    "summary": "string",
    "provinceName": "string",
    "district": "string",
    "sectorName": "string",
    "primarySector": "string",
    "secondarySector": "string",
    "status": "string",
    "costUsd": "number",
    "fundingGapUsd": "number",
    "coFinancingUsd": "number",
    "beneficiaries": "number",
    "jobs": "number",
    "readiness": "number",
    "startDate": "ISO8601",
    "endDate": "ISO8601",
    "implementingAgency": "string",
    "contactName": "string",
    "contactEmail": "string",
    "contactPhone": "string",
    "riskNotes": "string",
    "wefTags": ["string"],
    "sdgs": ["string"],
    "attachments": [
      {
        "id": "string",
        "fileName": "string",
        "mimeType": "string",
        "sizeBytes": "number",
        "createdAt": "ISO8601"
      }
    ],
    "statusHistory": [
      {
        "id": "string",
        "status": "string",
        "note": "string",
        "changedByUserName": "string",
        "createdAt": "ISO8601",
        "attachments": []
      }
    ],
    "progressUpdates": [
      {
        "id": "string",
        "text": "string",
        "authorName": "string",
        "createdAt": "ISO8601",
        "attachments": []
      }
    ],
    "createdAt": "ISO8601",
    "modifiedAt": "ISO8601",
    "createdBy": "string"
  }
}
```

---

### 3.4 PUT `/api/v1/projects/:projectId`
**Purpose**: Update project (Focal Point only, Draft status)
**Access**: Project creator (when status = Draft)

**Request Body**: Same fields as POST `/api/v1/projects`

**Validation Rules**: Same as project creation

**Response (Success - 200)**:
```json
{
  "success": true,
  "data": { /* Updated project */ }
}
```

**Response (Error - 403)**:
```json
{
  "success": false,
  "error": "Can only edit projects in Draft status"
}
```

---

### 3.5 POST `/api/v1/projects/:projectId/submit`
**Purpose**: Submit project for ministry review
**Access**: Project creator (Focal Point)

**Request Body**:
```json
{
  "note": "string (optional, submission note)"
}
```

**Response (Success - 200)**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "status": "Submitted",
    "modifiedAt": "ISO8601"
  }
}
```

---

### 3.6 POST `/api/v1/projects/:projectId/status`
**Purpose**: Change project status (Admin/Reviewer)
**Access**: Admin, Reviewer

**Request Body**:
```json
{
  "status": "Submitted | Under Review | Approved | Returned (required)",
  "note": "string (required for Returned, optional for others)",
  "attachments": ["file IDs (optional)"]
}
```

**Validation Rules**:
- Status: Must be one of allowed values
- Note: Required if status = "Returned", optional otherwise
- Valid transitions: Any status can move to any other

**Response (Success - 200)**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "status": "string",
    "modifiedAt": "ISO8601"
  }
}
```

---

### 3.7 POST `/api/v1/projects/:projectId/progress-update`
**Purpose**: Post progress update (Approved projects only)
**Access**: Project creator

**Request Body**:
```json
{
  "text": "string (required, 10-2000 chars)",
  "attachments": ["file IDs (optional)"]
}
```

**Validation Rules**:
- Text: Required, 10-2000 characters
- Only allowed for projects with status = "Approved"

**Response (Success - 201)**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "createdAt": "ISO8601"
  }
}
```

---

## 4. ADMIN/REVIEW APIs

### 4.1 GET `/api/v1/admin/dashboard/overview`
**Purpose**: Get admin dashboard summary metrics
**Access**: Admin, Reviewer

**Response (Success - 200)**:
```json
{
  "success": true,
  "data": {
    "totalProjects": "number",
    "approvedProjects": "number",
    "submittedProjects": "number",
    "underReviewProjects": "number",
    "returnedProjects": "number",
    "draftProjects": "number",
    "totalCostUsd": "number",
    "fundingGapUsd": "number",
    "totalBeneficiaries": "number",
    "totalJobs": "number",
    "projectsByProvince": [
      {
        "provinceName": "string",
        "count": "number",
        "fundingGapUsd": "number"
      }
    ],
    "projectsBySector": [
      {
        "sectorName": "string",
        "count": "number"
      }
    ],
    "projectsByStatus": [
      {
        "status": "string",
        "count": "number",
        "percentage": "number"
      }
    ],
    "pipelineTrend": [
      {
        "month": "string (format: 'Mon YY')",
        "submitted": "number",
        "approved": "number"
      }
    ]
  }
}
```

---

### 4.2 GET `/api/v1/admin/review-queue`
**Purpose**: Get projects pending review
**Access**: Admin, Reviewer

**Query Parameters**:
```
?status=Submitted|Under Review|Returned (optional)
?province=string (optional)
?sector=string (optional)
?page=number (default: 1)
?pageSize=number (default: 20)
?sort=date|readiness|fundingGap (optional)
```

**Response (Success - 200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "title": "string",
      "provinceName": "string",
      "sectorName": "string",
      "status": "string",
      "costUsd": "number",
      "fundingGapUsd": "number",
      "readiness": "number",
      "submittedDate": "ISO8601",
      "submittedBy": "string"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 100,
  "totalPages": 5
}
```

---

### 4.3 GET `/api/v1/admin/provinces`
**Purpose**: Get all provinces with statistics
**Access**: Admin, Reviewer

**Response (Success - 200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "totalProjects": "number",
      "approvedProjects": "number",
      "focalPointName": "string",
      "focalPointEmail": "string",
      "fundingGapUsd": "number",
      "saturation": "High | Medium | Low"
    }
  ]
}
```

---

### 4.4 GET `/api/v1/admin/reports`
**Purpose**: Generate downloadable reports
**Access**: Admin

**Query Parameters**:
```
?format=csv|json|pdf (default: csv)
?type=all-projects|approved|submitted|by-province|by-sector (default: all-projects)
?dateFrom=ISO8601 (optional)
?dateTo=ISO8601 (optional)
?province=string (optional)
```

**Response (Success - 200)**:
```
File download (content-type based on format)
```

---

## 5. INVESTOR APIs

### 5.1 GET `/api/v1/projects/catalogue`
**Purpose**: List approved projects (investor-facing)
**Access**: Investor, Public

**Query Parameters**:
```
?sector=string (optional)
?province=string (optional)
?wefTag=Water|Energy|Food (optional)
?readiness=Low|Medium|High (optional)
?minFundingGap=number (optional, USD)
?maxFundingGap=number (optional, USD)
?search=string (optional)
?page=number (default: 1)
?pageSize=number (default: 20)
?sort=readiness|fundingGap|date (optional)
```

**Note**: Only returns projects with status = "Approved"

**Response (Success - 200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "title": "string",
      "summary": "string",
      "imageUrl": "string",
      "provinceName": "string",
      "sectorName": "string",
      "costUsd": "number",
      "fundingGapUsd": "number",
      "beneficiaries": "number",
      "jobs": "number",
      "readiness": "number",
      "wefTags": ["string"],
      "contactName": "string",
      "contactEmail": "string",
      "contactPhone": "string"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 500,
  "totalPages": 25
}
```

---

### 5.2 POST `/api/v1/projects/:projectId/save`
**Purpose**: Save project to investor's list
**Access**: Investor

**Request Body**: Empty or `{}`

**Response (Success - 200)**:
```json
{
  "success": true,
  "message": "Project saved"
}
```

---

### 5.3 DELETE `/api/v1/projects/:projectId/save`
**Purpose**: Remove project from saved list
**Access**: Investor

**Response (Success - 200)**:
```json
{
  "success": true,
  "message": "Project removed from saved"
}
```

---

### 5.4 GET `/api/v1/investors/saved-projects`
**Purpose**: Get investor's saved projects
**Access**: Investor

**Query Parameters**:
```
?page=number (default: 1)
?pageSize=number (default: 20)
```

**Response (Success - 200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "project": { /* Full project object */ },
      "savedAt": "ISO8601"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 25,
  "totalPages": 2
}
```

---

### 5.5 POST `/api/v1/investors/interests`
**Purpose**: Express interest in a project
**Access**: Investor

**Request Body**:
```json
{
  "projectId": "string (required)",
  "message": "string (required, 10-1000 chars)",
  "commitmentUsd": "number (optional, > 0)"
}
```

**Validation Rules**:
- ProjectId: Must exist and be approved
- Message: Required, 10-1000 characters
- CommitmentUsd: Optional, must be positive if provided

**Response (Success - 201)**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "projectId": "string",
    "status": "Awaiting response",
    "createdAt": "ISO8601"
  }
}
```

---

### 5.6 GET `/api/v1/investors/interests`
**Purpose**: Get investor's interests
**Access**: Investor

**Query Parameters**:
```
?status=Awaiting response|In discussion|Connected|Declined (optional)
?page=number (default: 1)
?pageSize=number (default: 20)
```

**Response (Success - 200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "projectId": "string",
      "projectTitle": "string",
      "status": "Awaiting response | In discussion | Connected | Declined",
      "message": "string",
      "commitmentUsd": "number",
      "createdAt": "ISO8601",
      "modifiedAt": "ISO8601",
      "timeline": [
        {
          "note": "string",
          "date": "ISO8601",
          "by": "string"
        }
      ]
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 10,
  "totalPages": 1
}
```

---

### 5.7 POST `/api/v1/investors/interests/:interestId/respond`
**Purpose**: Respond to investor interest (Admin/Focal Point)
**Access**: Admin, Reviewer, Project Creator

**Request Body**:
```json
{
  "status": "In discussion | Connected | Declined (required)",
  "note": "string (required, response message)",
  "attachments": ["file IDs (optional)"]
}
```

**Validation Rules**:
- Status: Must be one of the allowed values
- Note: Required, 5-500 characters

**Response (Success - 200)**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "status": "string",
    "modifiedAt": "ISO8601"
  }
}
```

---

## 6. DASHBOARD ANALYTICS APIs

### 6.1 GET `/api/v1/analytics/wef-nexus`
**Purpose**: Water-Energy-Food nexus analysis
**Access**: Admin, Reviewer

**Response (Success - 200)**:
```json
{
  "success": true,
  "data": {
    "byDimension": [
      {
        "name": "Water | Energy | Food",
        "projectCount": "number",
        "totalCostUsd": "number",
        "beneficiaries": "number",
        "jobs": "number"
      }
    ],
    "combinations": [
      {
        "tags": ["Water", "Energy"],
        "projectCount": "number"
      }
    ]
  }
}
```

---

### 6.2 GET `/api/v1/analytics/sector-breakdown`
**Purpose**: Projects by sector analysis
**Access**: Authenticated

**Response (Success - 200)**:
```json
{
  "success": true,
  "data": [
    {
      "sectorName": "string",
      "projectCount": "number",
      "totalCostUsd": "number",
      "fundingGapUsd": "number",
      "beneficiaries": "number",
      "jobs": "number",
      "percentage": "number"
    }
  ]
}
```

---

### 6.3 GET `/api/v1/analytics/geography`
**Purpose**: Geographic distribution analysis
**Access**: Authenticated

**Response (Success - 200)**:
```json
{
  "success": true,
  "data": [
    {
      "provinceName": "string",
      "projectCount": "number",
      "approvedCount": "number",
      "totalCostUsd": "number",
      "fundingGapUsd": "number",
      "saturation": "High | Medium | Low",
      "focalPointName": "string"
    }
  ]
}
```

---

## 7. NOTIFICATION APIs

### 7.1 GET `/api/v1/notifications`
**Purpose**: Get user notifications
**Access**: Authenticated

**Query Parameters**:
```
?unreadOnly=boolean (optional, default: false)
?page=number (default: 1)
?pageSize=number (default: 20)
```

**Response (Success - 200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "type": "project_submitted | status_changed | comment_added | interest_expressed",
      "title": "string",
      "message": "string",
      "relatedProjectId": "string (optional)",
      "relatedUserId": "string (optional)",
      "read": "boolean",
      "createdAt": "ISO8601"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 50,
  "totalPages": 3
}
```

---

### 7.2 POST `/api/v1/notifications/:notificationId/read`
**Purpose**: Mark notification as read
**Access**: Authenticated

**Response (Success - 200)**:
```json
{
  "success": true
}
```

---

### 7.3 POST `/api/v1/notifications/read-all`
**Purpose**: Mark all notifications as read
**Access**: Authenticated

**Response (Success - 200)**:
```json
{
  "success": true
}
```

---

## 8. FILE UPLOAD APIs

### 8.1 POST `/api/v1/files/upload`
**Purpose**: Upload project attachment
**Access**: Authenticated

**Request**: Form Data
```
file: File (required, max 50MB)
projectId: string (required)
```

**Validation Rules**:
- File types: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, PNG, JPG, JPEG, GIF
- Max file size: 50MB
- File name: 1-255 characters

**Response (Success - 201)**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "fileName": "string",
    "mimeType": "string",
    "sizeBytes": "number",
    "url": "string (download URL)",
    "createdAt": "ISO8601"
  }
}
```

---

### 8.2 GET `/api/v1/files/:fileId/download`
**Purpose**: Download file
**Access**: Authenticated

**Response (Success - 200)**:
```
File blob (content-type: file mime type)
```

---

### 8.3 DELETE `/api/v1/files/:fileId`
**Purpose**: Delete uploaded file
**Access**: File uploader or Admin

**Response (Success - 200)**:
```json
{
  "success": true,
  "message": "File deleted"
}
```

---

## 9. REFERENCE DATA APIs

### 9.1 GET `/api/v1/reference/provinces`
**Purpose**: Get all provinces
**Access**: Public

**Response (Success - 200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string"
    }
  ]
}
```

---

### 9.2 GET `/api/v1/reference/sectors`
**Purpose**: Get all sectors
**Access**: Public

**Response (Success - 200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "color": "string (hex code)"
    }
  ]
}
```

---

### 9.3 GET `/api/v1/reference/sdgs`
**Purpose**: Get all SDG options
**Access**: Public

**Response (Success - 200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "code": "string (e.g., 'SDG 1')",
      "title": "string",
      "description": "string"
    }
  ]
}
```

---

## Error Response Format (All Endpoints)

**Standard Error Response**:
```json
{
  "success": false,
  "error": "string (human-readable error message)",
  "code": "string (error code for client handling)",
  "details": "object (optional, additional details)"
}
```

**HTTP Status Codes**:
- 200: Success
- 201: Created
- 400: Bad request (validation error)
- 401: Unauthorized (not authenticated)
- 403: Forbidden (no permission)
- 404: Not found
- 409: Conflict (duplicate, etc.)
- 500: Server error

---

## Authentication

**Method**: Bearer Token (JWT)

**Header**: `Authorization: Bearer <token>`

**Token Expiration**: 24 hours (implement refresh token)

---

## Pagination

**Query Parameters**:
- `page`: Current page (1-based indexing, default: 1)
- `pageSize`: Records per page (default: 20, max: 100)

**Response Format**:
```json
{
  "data": [ /* array of items */ ],
  "page": 1,
  "pageSize": 20,
  "total": 500,
  "totalPages": 25
}
```

---

## Sorting

**Query Parameters**:
- `sort`: Field name to sort by
- `order`: "asc" or "desc" (default: "desc")

**Example**: `?sort=readiness&order=desc`

---

## Rate Limiting

**Recommended Limits**:
- Authenticated users: 100 requests/minute
- Anonymous: 20 requests/minute
- File uploads: 10 files/minute per user

**Response Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1630000000
```

---

## Security Requirements

1. **HTTPS Only**: All endpoints require HTTPS
2. **CORS**: Enable CORS for frontend domain
3. **CSRF Protection**: Implement CSRF tokens for state-changing operations
4. **Input Validation**: Validate all inputs server-side
5. **SQL Injection Prevention**: Use parameterized queries
6. **Data Encryption**: Encrypt sensitive data at rest and in transit
7. **Access Control**: Implement role-based access control (RBAC)
8. **Audit Logging**: Log all state-changing operations

---

## Version

API Version: v1  
Base URL: `/api/v1`  
Frontend URL: `http://localhost:5173` (dev)  

---

## Implementation Notes for Backend Team

1. **Database Schema**: Ensure relationships between projects, users, provinces, sectors, and attachments
2. **Audit Trail**: Track all project status changes in `statusHistory`
3. **Permissions**: Implement strict access control based on user roles
4. **Validation**: Server-side validation is mandatory (don't rely on frontend)
5. **Error Handling**: Return consistent error responses with clear messages
6. **Testing**: Write unit tests for all endpoints
7. **Documentation**: Update OpenAPI/Swagger documentation
8. **Performance**: Implement caching for reference data and analytics
9. **Scalability**: Use database indexing for frequently queried fields

---

**Document Version**: 1.0  
**Last Updated**: September 2026  
**Status**: Ready for Development  
