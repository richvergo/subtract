# AI Agents Feature - Enhanced Backend Implementation

This document describes the enhanced backend implementation of the AI Agents feature, which provides intelligent workflow automation with LLM-powered intent generation, self-healing selector repair, and rich DOM metadata capture using Puppeteer for ERP, CRM, and other system integrations.

## 🏗️ Architecture Overview

The enhanced Agents system consists of six main components:

1. **Database Schema** - Stores agents with enriched metadata, logins, and execution history
2. **Recording Pipeline** - File upload and processing with DOM metadata extraction
3. **LLM Integration** - Intent generation and selector repair services
4. **API Endpoints** - RESTful APIs for managing agents, recordings, and logins
5. **Execution Service** - Two-stage Puppeteer automation with fallback repair
6. **Security Layer** - Encryption, credential masking, and secure file storage

## 📊 Database Schema

### Tables Created

#### `logins`
Stores encrypted credentials for external systems:
- `id` - Primary key
- `name` - Human-readable name
- `loginUrl` - The URL where the login page is located
- `username` - Encrypted username
- `password` - Encrypted password (optional)
- `oauthToken` - Encrypted OAuth token (optional)
- `ownerId` - User who owns this login
- `createdAt/updatedAt` - Timestamps

#### `agents`
Stores agent configurations with enriched metadata:
- `id` - Primary key
- `name` - Agent name
- `description` - Optional description
- `ownerId` - User who owns this agent
- `agent_config` - JSONB with structured actions and DOM metadata
- `purpose_prompt` - User's natural language description of the agent's purpose
- `agent_intents` - JSONB with LLM-generated intent annotations
- `status` - Agent status (DRAFT, ACTIVE)
- `processing_status` - Background processing state (processing|ready|failed)
- `processing_progress` - Processing progress percentage (0-100)
- `recording_path` - Path to uploaded recording file
- `createdAt/updatedAt` - Timestamps

#### `agent_logins`
Junction table linking agents to logins:
- `agentId` - Foreign key to agents
- `loginId` - Foreign key to logins
- Composite primary key

#### `agent_runs`
Tracks execution history with repair logs:
- `id` - Primary key
- `agentId` - Foreign key to agents
- `startedAt` - Execution start time
- `finishedAt` - Execution end time
- `status` - PENDING, SUCCESS, or FAILED
- `logs` - JSON execution logs including repair attempts
- `outputPath` - Path to output files
- `screenshotPath` - Path to screenshots
- `createdAt` - Record creation time

#### `agent_recordings`
Stores uploaded recording files:
- `id` - Primary key
- `storage_path` - Path where the recording is stored
- `mime_type` - MIME type of the recording
- `size` - File size in bytes
- `created_by` - User who uploaded the recording
- `created_at` - Upload timestamp

## 🔐 Security Features

### Encryption
- All sensitive credentials (username, password, oauthToken) are encrypted using AES-256
- Encryption key stored in environment variable `ENCRYPTION_KEY`
- Automatic encryption/decryption in API endpoints

### Credential Masking
API responses never return raw credentials:
- Usernames: `ric***@example.com`
- Passwords: `••••••••`
- Tokens: `abc12345***`

### RBAC (Role-Based Access Control)
- Users can only access their own agents and logins
- All API endpoints validate ownership
- No cross-user data access

## 🚀 API Endpoints

### Recording & Processing

#### `POST /api/agent-recordings`
Upload a workflow recording file for processing.

**Request:**
- `multipart/form-data` with recording file (mp4/webm, max 200MB)

**Response:**
```json
{
  "recordingId": "clx123...",
  "size": 15728640,
  "mimeType": "video/mp4",
  "source": "upload"
}
```

#### `POST /api/agents/create-from-recording`
Create an agent from an uploaded recording.

**Request:**
```json
{
  "name": "My Workflow Agent",
  "purposePrompt": "Create a new Google Slides presentation and name it for Company X",
  "recordingId": "clx123..."
}
```

**Response:**
```json
{
  "agentId": "clx456...",
  "processingStatus": "processing"
}
```

#### `POST /api/internal/agents/[id]/processing-complete`
Internal endpoint for background jobs to update processing status.

**Request:**
```json
{
  "success": true,
  "errorMessage": null
}
```

### Logins Management

#### `GET /api/logins`
List all logins for the current user (with masked credentials).

**Response:**
```json
{
  "logins": [
    {
      "id": "clx123...",
      "name": "ERP Login",
      "systemType": "ERP",
      "username": "ric***@example.com",
      "password": "••••••••",
      "ownerId": "user123",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### `POST /api/logins`
Create a new login with encrypted credentials.

**Request:**
```json
{
  "name": "ERP Login",
  "systemType": "ERP",
  "username": "user@example.com",
  "password": "secretpassword"
}
```

#### `PUT /api/logins/[id]`
Update login credentials (encrypted before saving).

#### `DELETE /api/logins/[id]`
Delete a login (only if not used by any agents).

### Agents Management

#### `GET /api/agents`
List all agents for the current user with enriched metadata and latest runs.

**Response:**
```json
{
  "agents": [
    {
      "id": "clx456...",
      "name": "Daily Report Agent",
      "description": "Generates daily reports",
      "purposePrompt": "Create daily sales reports for management review",
      "agentConfig": [...],
      "agentIntents": [...],
      "status": "ACTIVE",
      "processingStatus": "ready",
      "processingProgress": 100,
      "logins": [
        {
          "id": "clx123...",
          "name": "ERP Login",
          "systemType": "ERP"
        }
      ],
      "latestRuns": [
        {
          "id": "clx789...",
          "status": "SUCCESS",
          "startedAt": "2024-01-01T09:00:00Z",
          "finishedAt": "2024-01-01T09:05:00Z"
        }
      ]
    }
  ]
}
```

#### `POST /api/agents`
Create a new agent with automation configuration and purpose prompt.

**Request:**
```json
{
  "name": "Daily Report Agent",
  "description": "Generates daily reports",
  "purposePrompt": "Create daily sales reports for management review",
  "loginIds": ["clx123..."],
  "agentConfig": [
    { 
      "action": "goto", 
      "url": "https://erp.example.com/login",
      "metadata": {
        "timestamp": 1640995200000
      }
    },
    { 
      "action": "type", 
      "selector": "#username", 
      "value": "{{login.username}}",
      "metadata": {
        "selector": "#username",
        "tag": "input",
        "type": "text",
        "ariaLabel": "Username field",
        "placeholder": "Enter your username",
        "timestamp": 1640995201000,
        "intent": "Enter the username in the login form field"
      }
    },
    { 
      "action": "click", 
      "selector": "#login-button",
      "metadata": {
        "selector": "#login-button",
        "tag": "button",
        "innerText": "Sign In",
        "ariaLabel": "Sign in to your account",
        "timestamp": 1640995202000,
        "intent": "Submit the login form to authenticate the user"
      }
    }
  ]
}
```

#### `GET /api/agents/[id]`
Get detailed agent information with latest runs.

#### `PUT /api/agents/[id]`
Update agent configuration.

#### `DELETE /api/agents/[id]`
Delete an agent and all its runs.

### Agent Execution

#### `POST /api/agents/[id]/run`
Manually trigger an agent execution.

**Response:**
```json
{
  "message": "Agent run enqueued successfully",
  "runId": "clx789...",
  "status": "PENDING"
}
```

#### `GET /api/agents/[id]/runs`
Get execution history for an agent.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

## 🤖 Enhanced Agent Configuration Schema

The `agentConfig` field contains an array of automation steps with rich DOM metadata:

### Supported Actions with Metadata

#### `goto`
Navigate to a URL with timestamp metadata.
```json
{ 
  "action": "goto", 
  "url": "https://example.com/login",
  "metadata": {
    "timestamp": 1640995200000
  }
}
```

#### `type`
Type text into an input field with full DOM context.
```json
{ 
  "action": "type", 
  "selector": "#username", 
  "value": "{{login.username}}",
  "metadata": {
    "selector": "#username",
    "tag": "input",
    "type": "text",
    "innerText": null,
    "ariaLabel": "Username field",
    "placeholder": "Enter your username",
    "timestamp": 1640995201000,
    "intent": "Enter the username in the login form field"
  }
}
```

#### `click`
Click an element with contextual information.
```json
{ 
  "action": "click", 
  "selector": "#login-button",
  "metadata": {
    "selector": "#login-button",
    "tag": "button",
    "type": null,
    "innerText": "Sign In",
    "ariaLabel": "Sign in to your account",
    "placeholder": null,
    "timestamp": 1640995202000,
    "intent": "Submit the login form to authenticate the user"
  }
}
```

#### `waitForSelector`
Wait for an element to appear.
```json
{ 
  "action": "waitForSelector", 
  "selector": "#dashboard", 
  "timeout": 10000,
  "metadata": {
    "timestamp": 1640995203000,
    "intent": "Wait for the dashboard to load after login"
  }
}
```

#### `download`
Trigger a download.
```json
{ 
  "action": "download", 
  "selector": "#download-link",
  "metadata": {
    "selector": "#download-link",
    "tag": "a",
    "innerText": "Download Report",
    "timestamp": 1640995204000,
    "intent": "Download the generated report file"
  }
}
```

### Variable Substitution

Use `{{login.username}}` and `{{login.password}}` to inject credentials from linked logins.

### LLM Intent Annotations

Each step includes an `intent` field with natural language descriptions generated by the LLM, enabling intelligent fallback repair when selectors fail.

## 🔧 Execution Service

### Enhanced AgentExecutor Class

The `AgentExecutor` class handles two-stage automation with fallback repair:

1. **Browser Launch** - Starts Puppeteer with optimized settings
2. **Primary Execution** - Processes each step using stored selectors and metadata
3. **Fallback Repair** - If selectors fail, uses LLM to generate new selectors based on intent
4. **Variable Resolution** - Substitutes login credentials
5. **Screenshot Capture** - Takes screenshots for debugging and repair analysis
6. **Repair Logging** - Records all selector repair attempts with LLM reasoning
7. **Cleanup** - Properly closes browser resources

### Enhanced Execution Flow

1. Fetch agent configuration with enriched metadata and linked logins
2. Decrypt login credentials
3. Launch Puppeteer browser
4. **Primary Stage**: Execute each action using stored selectors
5. **Fallback Stage**: If selector fails:
   - Extract intent and metadata from the failed step
   - Capture current DOM snapshot
   - Send intent + metadata + DOM to LLM for selector repair
   - Retry action with new selector
   - Log repair attempt with confidence score
6. Capture screenshots and logs including repair attempts
7. Update run status in database with repair logs
8. Clean up browser resources

## 🧪 Testing

### Enhanced Test Suite

Run the comprehensive test suite to validate all functionality:

```bash
# Run all tests
npm test

# Run specific test files
npm test -- tests/test_enhanced_agents_simple.test.ts
npm test -- tests/test_recording_workflow_simple.test.ts

# Run tests in watch mode
npm run test:watch
```

**Note:** Tests cover metadata validation, LLM annotation integration, fallback repair logic, and complete workflow integration.

### Manual Testing

1. **Upload a Recording:**
   ```bash
   curl -X POST http://localhost:3000/api/agent-recordings \
     -F "recording=@path/to/workflow.mp4"
   ```

2. **Create an Agent from Recording:**
   ```bash
   curl -X POST http://localhost:3000/api/agents/create-from-recording \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Agent","purposePrompt":"Automate login workflow","recordingId":"recording-id"}'
   ```

3. **Create a Login:**
   ```bash
   curl -X POST http://localhost:3000/api/logins \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Login","systemType":"ERP","username":"test@example.com","password":"secret"}'
   ```

4. **Run an Agent:**
   ```bash
   curl -X POST http://localhost:3000/api/agents/agent-id/run
   ```

5. **Check Processing Status:**
   ```bash
   curl -X GET http://localhost:3000/api/agents/agent-id
   ```

## 🚀 Production Considerations

### Enhanced Queue System
The current implementation includes background job processing:

1. **Redis Queue** for recording processing and agent execution
2. **Background Workers** for LLM processing and automation
3. **Job Status Tracking** with real-time progress updates
4. **Retry Logic** for failed executions and LLM calls
5. **File Storage** for recordings and outputs

### Security Enhancements
1. **Stronger Encryption Keys** (32+ characters)
2. **Credential Rotation** policies
3. **Audit Logging** for all credential usage
4. **Rate Limiting** on API endpoints

### Enhanced Monitoring
1. **Execution Metrics** (success rate, duration, repair frequency)
2. **LLM Performance** (response time, accuracy, repair success rate)
3. **Error Tracking** with detailed logs and repair attempts
4. **Performance Monitoring** for browser automation and file processing
5. **Resource Usage** tracking for recordings and outputs

### Scalability
1. **Horizontal Scaling** of worker processes
2. **Database Optimization** for large run histories
3. **File Storage** for screenshots and outputs
4. **Load Balancing** for API endpoints

## 📁 File Structure

```
src/
├── app/api/
│   ├── logins/
│   │   ├── route.ts              # GET, POST /api/logins
│   │   └── [id]/route.ts         # GET, PUT, DELETE /api/logins/[id]
│   └── agents/
│       ├── route.ts              # GET, POST /api/agents
│       ├── [id]/
│       │   ├── route.ts          # GET, PUT, DELETE /api/agents/[id]
│       │   ├── run/route.ts      # POST /api/agents/[id]/run
│       │   └── runs/route.ts     # GET /api/agents/[id]/runs
├── lib/
│   ├── encryption.ts             # Credential encryption/decryption
│   ├── agent-executor.ts         # Puppeteer execution engine
│   └── schemas/
│       └── agents.ts             # Zod validation schemas
└── prisma/
    └── schema.prisma             # Database schema (updated)
```

## 🔄 Migration

The database migration has been created and applied:
- Migration: `20250913001906_add_agents_system`
- Adds all required tables and relationships
- Maintains backward compatibility with existing checklist system

## ✅ Enhanced MVP Status

The enhanced backend MVP is complete with:
- ✅ Database schema and migrations with enriched metadata
- ✅ Recording upload and processing pipeline
- ✅ LLM-powered intent generation and selector repair
- ✅ RESTful API endpoints for all operations
- ✅ Credential encryption and masking
- ✅ Two-stage Puppeteer execution with fallback repair
- ✅ RBAC security and file storage
- ✅ Agent configuration validation with metadata
- ✅ Execution logging with repair attempts
- ✅ Background job processing and queue management
- ✅ Comprehensive test coverage

Ready for frontend integration and production deployment with intelligent self-healing automation!
