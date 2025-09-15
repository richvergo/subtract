# API Contract - Frontend–Backend Integration Guide

This document serves as the master reference for frontend-backend integration, defining the contract between the frontend pages and their corresponding backend API endpoints.

## 🔐 Authentication Requirements

**ALL API endpoints require a valid session** except for health checks and public routes.

### Session-Based Authentication
- **Required**: Valid NextAuth.js session with authenticated user
- **Headers**: Session cookie automatically sent by browser
- **Validation**: Backend checks `getServerSession(authOptions)` for all protected routes

### Error Responses
- **401 Unauthorized**: No valid session or user not authenticated
- **404 Not Found**: User not found in database (implies session exists but user missing)

### Test Credentials
After running `npx prisma db seed`, use these credentials:
- **Alice**: `alice@example.com` / `password123`
- **Bob**: `bob@example.com` / `password123`

### Frontend Implementation
```typescript
// All API calls must include credentials
const response = await fetch('/api/agents', {
  credentials: 'include', // Include session cookies
});

if (response.status === 401) {
  // Redirect to login page
  window.location.href = '/login';
}
```

## Table of Contents

- [Dashboard (/)](#dashboard-)
- [Agents List (/agents)](#agents-list-agents)
- [Create Agent (/agents/create)](#create-agent-agentscreate)
- [Agent Detail (/agents/[id])](#agent-detail-agentsid)
- [Logins (/logins)](#logins-logins)
- [Tasks (/tasks)](#tasks-tasks)
- [Authentication](#authentication)
- [Summary Table](#summary-table)

---

## Dashboard (/)

### Frontend Requirements
- Display overview statistics (total agents, active runs, recent activity)
- Show quick actions and recent agent runs
- Provide navigation to main features

### Backend API Endpoints

#### GET /api/health
**Status**: ✅ Implemented and validated

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "database": "connected",
    "api": "running"
  }
}
```

**Error Response** (503):
```json
{
  "status": "unhealthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "error": "Database connection failed"
}
```

---

## Agents List (/agents)

### Frontend Requirements
- Display table/list of user's agents with:
  - Agent name and description
  - Status (DRAFT, ACTIVE, INACTIVE)
  - Last run date/time
  - Quick actions (view, edit, run)
- "Create Agent" button linking to `/agents/create`
- Empty state with call-to-action when no agents exist

### Backend API Endpoints

#### GET /api/agents
**Status**: ✅ Implemented and validated

**Response**:
```json
{
  "agents": [
    {
      "id": "cmfk1qxme00008ouxh2dcj4fz",
      "name": "Website Scraper",
      "description": "Automatically scrapes product data from e-commerce sites",
      "status": "ACTIVE",
      "processingStatus": "COMPLETED",
      "processingProgress": 100,
      "agentConfig": [
        {
          "action": "goto",
          "url": "https://example.com",
          "selector": null,
          "value": null,
          "timeout": 30000
        },
        {
          "action": "click",
          "selector": ".product-button",
          "value": null,
          "timeout": 5000
        }
      ],
      "purposePrompt": "Navigate to e-commerce site and click on product buttons to gather pricing data",
      "agentIntents": [
        {
          "stepIndex": 0,
          "intent": "Navigate to the target website"
        },
        {
          "stepIndex": 1,
          "intent": "Click on product buttons to reveal pricing information"
        }
      ],
      "recordingPath": "/uploads/recordings/recording_cmfk1qxme00008ouxh2dcj4fz_1757875604930.mp4",
      "ownerId": "cmfk1qxme00008ouxh2dcj4fz",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "logins": [
        {
          "id": "login_123",
          "name": "Admin Login",
          "loginUrl": "https://admin.example.com"
        }
      ],
      "agentRuns": [
        {
          "id": "run_456",
          "status": "COMPLETED",
          "startedAt": "2024-01-15T09:15:00.000Z",
          "finishedAt": "2024-01-15T09:16:30.000Z"
        }
      ]
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: User not found
- `500 Internal Server Error`: Database or server error

---

## Create Agent (/agents/create)

### Frontend Requirements
- Form with fields:
  - Agent Name (required text input)
  - Purpose Prompt (required textarea)
  - Optional description
  - Login credentials selection
- Form validation (disable submit until required fields filled)
- Submit button that calls API
- Success/error feedback

### Backend API Endpoints

#### POST /api/agents/record
**Status**: ✅ Implemented and validated

**Request**: Multipart FormData
```javascript
const formData = new FormData();
formData.append("name", "Website Scraper");
formData.append("purposePrompt", "Navigate to e-commerce site and click on product buttons to gather pricing data");
formData.append("file", videoBlob, "recording.webm");

fetch('/api/agents/record', {
  method: 'POST',
  body: formData,
  credentials: 'include'
});
```

**Form Fields**:
- `name` (string, required): Agent name
- `purposePrompt` (string, required): Description of what the agent should accomplish
- `file` (File, required): Video recording blob (WebM or MP4, max 100MB)

**File Validation**:
- Max size: 100MB
- Allowed MIME types: `video/webm`, `video/mp4`
- Files stored in `/uploads/agents/{timestamp}.{extension}`

**Response**:
```json
{
  "agent": {
    "id": "cmfk1qxme00008ouxh2dcj4fz",
    "name": "Website Scraper",
    "description": "Agent created with screen recording (1024KB)",
    "status": "DRAFT",
    "processingStatus": "processing",
    "processingProgress": null,
    "purposePrompt": "Navigate to e-commerce site and click on product buttons to gather pricing data",
    "recordingUrl": "/uploads/agents/agent_1757875604930.webm",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Agent created with recording successfully"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input data, file too large, or invalid file type
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: User or login not found
- `500 Internal Server Error`: File upload failed

#### GET /api/agents/[id]/recording
**Status**: ✅ Implemented and validated

**Purpose**: Retrieve agent recording for playback/download

**Request**: GET request with agent ID in URL path

**Response**: Video file stream with appropriate headers
- `Content-Type`: `video/webm` or `video/mp4`
- `Content-Length`: File size in bytes
- `Content-Disposition`: `inline; filename="{agent_name}_recording.{extension}"`
- `Cache-Control`: `public, max-age=3600`

**Error Responses**:
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: Agent not found, no recording, or file missing
- `500 Internal Server Error`: File read error
- `500 Internal Server Error`: Processing failed

#### POST /api/agents
**Status**: 🚧 Missing / future work

**Note**: This endpoint would be used for direct agent creation without workflow recording.

---

## Agent Detail (/agents/[id])

### Frontend Requirements
- Display agent details:
  - Name, description, purpose prompt
  - Status and processing progress
  - Workflow steps with intent descriptions
  - Associated login credentials
  - Recent runs history
- "Run Agent" button
- "Edit Agent" functionality (future)
- Run detail modal with confirm/reject actions

### Backend API Endpoints

#### GET /api/agents/[id]
**Status**: ✅ Implemented and validated

**Response**:
```json
{
  "agent": {
    "id": "cmfk1qxme00008ouxh2dcj4fz",
    "name": "Website Scraper",
    "description": "Automatically scrapes product data from e-commerce sites",
    "status": "ACTIVE",
    "processingStatus": "COMPLETED",
    "processingProgress": 100,
    "agentConfig": [
      {
        "action": "goto",
        "url": "https://example.com",
        "selector": null,
        "value": null,
        "timeout": 30000
      }
    ],
    "purposePrompt": "Navigate to e-commerce site and click on product buttons to gather pricing data",
    "agentIntents": [
      {
        "stepIndex": 0,
        "intent": "Navigate to the target website"
      }
    ],
    "recordingPath": "/uploads/recordings/recording_cmfk1qxme00008ouxh2dcj4fz_1757875604930.mp4",
    "ownerId": "cmfk1qxme00008ouxh2dcj4fz",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "logins": [
      {
        "id": "login_123",
        "name": "Admin Login",
        "loginUrl": "https://admin.example.com"
      }
    ],
    "agentRuns": [
      {
        "id": "run_456",
        "status": "PENDING",
        "startedAt": "2024-01-15T09:15:00.000Z",
        "finishedAt": null,
        "result": null,
        "error": null
      }
    ]
  }
}
```

#### GET /api/agents/[id]/runs
**Status**: ✅ Implemented and validated

**Response**:
```json
{
  "runs": [
    {
      "id": "run_456",
      "status": "COMPLETED",
      "startedAt": "2024-01-15T09:15:00.000Z",
      "finishedAt": "2024-01-15T09:16:30.000Z",
      "result": {
        "success": true,
        "data": "Successfully scraped 25 products"
      },
      "error": null,
      "logs": "{\"actions\": [\"Navigated to https://example.com\", \"Clicked product button\"]}"
    }
  ]
}
```

#### POST /api/agents/[id]/run
**Status**: ✅ Implemented and validated

**Request**: Empty body

**Response**:
```json
{
  "run": {
    "id": "run_789",
    "status": "STARTED",
    "startedAt": "2024-01-15T10:30:00.000Z",
    "finishedAt": null,
    "result": null,
    "error": null
  },
  "message": "Agent run started successfully"
}
```

#### POST /api/agents/[id]/runs/[runId]/confirm
**Status**: ✅ Implemented and validated

**Request**: Empty body

**Response**:
```json
{
  "message": "Run confirmed successfully"
}
```

#### POST /api/agents/[id]/runs/[runId]/reject
**Status**: ✅ Implemented and validated

**Request**: Empty body

**Response**:
```json
{
  "message": "Run rejected successfully"
}
```

#### PUT /api/agents/[id]
**Status**: 🚧 Missing / future work

**Note**: This endpoint would be used for updating agent details.

---

## Logins (/logins)

### Frontend Requirements
- Display table/list of user's login credentials (with masked passwords)
- "Create Login" button
- Login health status indicators
- Actions: edit, delete, test connection
- Empty state when no logins exist

### Backend API Endpoints

#### GET /api/logins
**Status**: ✅ Implemented and validated

**Response**:
```json
{
  "logins": [
    {
      "id": "login_123",
      "name": "Admin Login",
      "loginUrl": "https://admin.example.com",
      "username": "admin@example.com",
      "password": "***masked***",
      "oauthToken": null,
      "ownerId": "cmfk1qxme00008ouxh2dcj4fz",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### POST /api/logins
**Status**: ✅ Implemented and validated

**Request**:
```json
{
  "name": "Admin Login",
  "loginUrl": "https://admin.example.com",
  "username": "admin@example.com",
  "password": "secretpassword123",
  "oauthToken": null
}
```

**Response**:
```json
{
  "login": {
    "id": "login_123",
    "name": "Admin Login",
    "loginUrl": "https://admin.example.com",
    "username": "admin@example.com",
    "password": "***masked***",
    "oauthToken": null,
    "ownerId": "cmfk1qxme00008ouxh2dcj4fz",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Login created successfully"
}
```

#### GET /api/logins/[id]
**Status**: ✅ Implemented and validated

**Response**:
```json
{
  "login": {
    "id": "login_123",
    "name": "Admin Login",
    "loginUrl": "https://admin.example.com",
    "username": "admin@example.com",
    "password": "***masked***",
    "oauthToken": null,
    "ownerId": "cmfk1qxme00008ouxh2dcj4fz",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### PUT /api/logins/[id]
**Status**: ✅ Implemented and validated

#### DELETE /api/logins/[id]
**Status**: ✅ Implemented and validated

#### GET /api/logins/[id]/health
**Status**: ✅ Implemented and validated

**Response**:
```json
{
  "status": "healthy",
  "lastChecked": "2024-01-15T10:30:00.000Z",
  "responseTime": 245,
  "error": null
}
```

#### POST /api/logins/[id]/reconnect/start
**Status**: ✅ Implemented and validated

**Request**:
```json
{
  "newPassword": "newpassword123"
}
```

#### POST /api/logins/[id]/reconnect/complete
**Status**: ✅ Implemented and validated

**Request**:
```json
{
  "sessionId": "session_456",
  "newPassword": "newpassword123"
}
```

---

## Tasks (/tasks)

### Frontend Requirements
- Display task queue and execution status
- Task history and logs
- Task management (pause, resume, cancel)
- Future: Task scheduling and automation

### Backend API Endpoints

#### GET /api/tasks
**Status**: 🚧 Missing / future work

**Note**: This endpoint would list user's tasks and their execution status.

#### POST /api/tasks
**Status**: 🚧 Missing / future work

**Note**: This endpoint would create new tasks.

---

## Authentication

### Frontend Requirements
- Login/logout functionality in sidebar
- User profile display
- Session management
- Redirect to login page when unauthenticated

### Backend API Endpoints

#### POST /api/auth/[...nextauth]
**Status**: ✅ Implemented and validated

**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "user": {
    "id": "cmfk1qxme00008ouxh2dcj4fz",
    "email": "user@example.com",
    "name": "John Doe",
    "memberships": [
      {
        "id": "membership_123",
        "role": "ADMIN",
        "entity": {
          "id": "entity_456",
          "name": "My Organization"
        }
      }
    ],
    "activeEntityId": "entity_456"
  },
  "accessToken": "jwt_token_here"
}
```

#### GET /api/auth/session
**Status**: ✅ Implemented and validated

**Response**:
```json
{
  "user": {
    "id": "cmfk1qxme00008ouxh2dcj4fz",
    "email": "user@example.com",
    "name": "John Doe",
    "memberships": [
      {
        "id": "membership_123",
        "role": "ADMIN",
        "entity": {
          "id": "entity_456",
          "name": "My Organization"
        }
      }
    ],
    "activeEntityId": "entity_456"
  }
}
```

#### POST /api/auth/switch-entity
**Status**: ✅ Implemented and validated

**Request**:
```json
{
  "entityId": "entity_789"
}
```

#### POST /api/register
**Status**: ✅ Implemented and validated

**Request**:
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "New User"
}
```

---

## Summary Table

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/api/health` | GET | ✅ | System health check |
| `/api/agents` | GET | ✅ | List user's agents |
| `/api/agents` | POST | 🚧 | Create agent (direct) |
| `/api/agents/record` | POST | ✅ | Record workflow and create agent with file upload |
| `/api/agents/[id]` | GET | ✅ | Get agent details |
| `/api/agents/[id]/recording` | GET | ✅ | Get agent recording for playback |
| `/api/agents/[id]` | PUT | 🚧 | Update agent |
| `/api/agents/[id]` | DELETE | 🚧 | Delete agent |
| `/api/agents/[id]/runs` | GET | ✅ | Get agent runs |
| `/api/agents/[id]/run` | POST | ✅ | Run agent |
| `/api/agents/[id]/runs/[runId]/confirm` | POST | ✅ | Confirm run |
| `/api/agents/[id]/runs/[runId]/reject` | POST | ✅ | Reject run |
| `/api/agents/[id]/activate` | POST | ✅ | Activate agent |
| `/api/agents/[id]/annotate` | POST | ✅ | Annotate agent steps |
| `/api/agents/[id]/repair` | POST | ✅ | Repair agent workflow |
| `/api/logins` | GET | ✅ | List user's logins |
| `/api/logins` | POST | ✅ | Create login |
| `/api/logins/[id]` | GET | ✅ | Get login details |
| `/api/logins/[id]` | PUT | ✅ | Update login |
| `/api/logins/[id]` | DELETE | ✅ | Delete login |
| `/api/logins/[id]/health` | GET | ✅ | Check login health |
| `/api/logins/[id]/reconnect/start` | POST | ✅ | Start login reconnection |
| `/api/logins/[id]/reconnect/complete` | POST | ✅ | Complete login reconnection |
| `/api/tasks` | GET | 🚧 | List tasks (future) |
| `/api/tasks` | POST | 🚧 | Create task (future) |
| `/api/auth/[...nextauth]` | POST | ✅ | Authentication |
| `/api/auth/session` | GET | ✅ | Get session |
| `/api/auth/switch-entity` | POST | ✅ | Switch active entity |
| `/api/register` | POST | ✅ | User registration |
| `/api/users` | GET | ✅ | List users (admin) |
| `/api/users` | POST | ✅ | Create user (admin) |
| `/api/entities` | GET | ✅ | List user's entities |
| `/api/entities` | POST | ✅ | Create entity (admin) |
| `/api/login-templates` | GET | ✅ | Get login templates |

### Legend
- ✅ **Implemented and validated**: Endpoint exists, tested, and ready for frontend integration
- ⚠️ **Needs validation**: Endpoint exists but response shape needs verification
- 🚧 **Missing / future work**: Endpoint not yet implemented or planned for future development

### Integration Notes

1. **Authentication**: All API endpoints require authentication via NextAuth session
2. **Error Handling**: Standard HTTP status codes with JSON error responses
3. **Data Validation**: Request/response validation using Zod schemas
4. **Rate Limiting**: Consider implementing rate limiting for production
5. **Caching**: SWR recommended for client-side data fetching and caching
6. **Real-time Updates**: Consider WebSocket integration for real-time agent run updates

### Frontend Implementation Guidelines

1. **Data Fetching**: Use SWR for all API calls with proper error handling
2. **Form Validation**: Implement client-side validation before API calls
3. **Loading States**: Show loading indicators for all async operations
4. **Error Boundaries**: Implement error boundaries for graceful error handling
5. **Optimistic Updates**: Use SWR mutate for optimistic UI updates
6. **Type Safety**: Define TypeScript interfaces matching API response shapes

This contract should be updated whenever new endpoints are added or existing ones are modified. All changes should be documented with proper request/response examples and status updates.
