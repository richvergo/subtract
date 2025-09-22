# Development Guidelines & Guard Rails

This document establishes coding standards and guard rails to prevent common errors and maintain code quality.

## 🎉 **MAJOR MILESTONE ACHIEVED: Login Agents Working End-to-End!**

**We've successfully built and tested the complete login agent workflow!** All login agent functionality is now working:
- ✅ Screen recording integration
- ✅ AI analysis and automation script creation
- ✅ Real browser automation testing
- ✅ Credential editing and management
- ✅ Comprehensive status tracking

This represents a major breakthrough in the platform's capabilities!

## 🚨 Critical Guard Rails

### 0. 🔒 LOGINS FEATURE PROTECTION (HIGHEST PRIORITY)

**🚨 LOGINS FEATURE IS PRODUCTION-READY AND MUST BE PROTECTED**

The logins feature has been tested and verified working with Vergo and Google Slides. It MUST NOT be broken by future changes.

#### Critical Protection Rules:
1. **State Variables**: These MUST exist in `src/app/logins/page.tsx`:
   ```typescript
   const [hasRecording, setHasRecording] = useState(false);
   const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
   const [recordingError, setRecordingError] = useState<string | null>(null);
   const [isRecording, setIsRecording] = useState(false);
   const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'analyzing' | 'complete' | 'error'>('idle');
   ```

2. **API Endpoints**: These MUST maintain their structure:
   - `POST /api/logins` - Create login
   - `GET /api/logins` - List logins
   - `PUT /api/logins/[id]` - Update login
   - `DELETE /api/logins/[id]` - Delete login
   - `POST /api/logins/[id]/check` - Check login status
   - `POST /api/logins/[id]/test-interactive` - Test login

3. **Pre-Change Checklist**:
   - [ ] Run `npm run test:api`
   - [ ] Test manual login creation at `/logins`
   - [ ] Verify no console errors
   - [ ] Check that all state variables exist

4. **AI Assistant Instructions**: Always include this context:
   ```
   CRITICAL: The logins feature is production-ready. State variables 
   (hasRecording, recordingBlob, recordingError, isRecording, analysisStatus) 
   MUST exist in src/app/logins/page.tsx. Run tests before making changes.
   ```

📚 **Full Documentation**: See `LOGINS_FEATURE_DOCUMENTATION.md` and `LOGINS_PROTECTION_GUIDELINES.md`

### 1. Backend Lock Policy

**🚫 BACKEND IS FROZEN** - The backend is locked for stability during frontend development.

#### Protected Files
- `src/app/api/**/route.ts` - All API routes
- `src/lib/db.ts` - Database layer
- `src/lib/queue.ts` - Queue system
- `prisma/schema.prisma` - Database schema

#### Rules
- **Backend changes** must be done in a branch prefixed with `backend/`
- **Frontend work** must be done in a branch prefixed with `frontend/`
- **AI prompts** must explicitly state "do not modify backend files"
- **CI will fail** if backend files are changed in non-backend branches

#### Branch Naming
```bash
# ✅ Backend work
git checkout -b backend/fix-agent-execution
git checkout -b backend/add-login-validation

# ✅ Frontend work  
git checkout -b frontend/improve-agent-ui
git checkout -b frontend/add-dashboard-charts

# ❌ Generic branches (not recommended)
git checkout -b feature/something
```

### 1. Database Schema Consistency
**NEVER** use snake_case in Prisma schema or database operations. Always use camelCase.

```typescript
// ✅ CORRECT - Use camelCase
agentConfig: JSON.stringify(config)
purposePrompt: "Agent purpose"
agentIntents: JSON.stringify(intents)

// ❌ WRONG - Never use snake_case
agent_config: JSON.stringify(config)
purpose_prompt: "Agent purpose"
agent_intents: JSON.stringify(intents)
```

### 2. Enriched Event Logs & Screenshot Storage

#### Event Log Security
**ALWAYS** exclude sensitive data from event logs, especially passwords.

```typescript
// ✅ CORRECT - Password values are automatically excluded
const eventLog = [
  {
    step: 1,
    action: "type",
    target: "input[name='username']",
    value: "user@example.com", // ✅ Safe to include
    timestamp: Date.now()
  },
  {
    step: 2,
    action: "type", 
    target: "input[name='password']",
    value: "[REDACTED]", // ✅ Automatically redacted
    timestamp: Date.now()
  }
];

// ❌ WRONG - Never include password values
const eventLog = [
  {
    step: 2,
    action: "type",
    target: "input[name='password']", 
    value: "secretpassword123", // ❌ Security risk
    timestamp: Date.now()
  }
];
```

#### Screenshot Storage Rules
**ALWAYS** follow these rules for screenshot storage:

```typescript
// ✅ CORRECT - Use proper validation and storage
import { storeScreenshot, validateScreenshot } from '@/lib/screenshot-storage';

// Validate before storing
const validation = validateScreenshot(base64Data, mimeType);
if (!validation.valid) {
  throw new Error(validation.error);
}

// Store with proper naming
const stored = await storeScreenshot(agentId, step, {
  base64: base64Data,
  mimeType: 'image/png'
});

// ❌ WRONG - Never store without validation
const buffer = Buffer.from(base64Data, 'base64');
await writeFile(`/uploads/${filename}`, buffer); // ❌ No validation
```

#### File Storage Security
**ALWAYS** sanitize filenames and enforce size limits:

```typescript
// ✅ CORRECT - Sanitized filename with size limit
const MAX_SIZE = 200 * 1024; // 200KB
const ALLOWED_TYPES = ['image/png', 'image/jpeg'];

// Sanitize filename
const sanitizedFilename = filename
  .replace(/[^a-zA-Z0-9._-]/g, '_')
  .replace(/\.{2,}/g, '.')
  .substring(0, 255);

// ❌ WRONG - No validation or sanitization
const filename = userInput; // ❌ Path traversal risk
const filePath = `/uploads/${filename}`; // ❌ Unsafe
```

#### Event Model Usage
**ALWAYS** use the Event model for scalable event storage:

```typescript
// ✅ CORRECT - Store in Event table for large datasets
await db.event.createMany({
  data: events.map(event => ({
    agentId: agent.id,
    step: event.step,
    action: event.action,
    target: event.target,
    value: event.value,
    url: event.url,
    elementType: event.elementType,
    elementText: event.elementText,
    screenshotUrl: event.screenshotUrl,
  }))
});

// ✅ ALSO CORRECT - Keep eventLog for simple JSON storage
await db.agent.update({
  where: { id: agentId },
  data: {
    eventLog: JSON.stringify(processedEventLog)
  }
});

// ❌ WRONG - Don't store large event logs in JSON field
await db.agent.update({
  where: { id: agentId },
  data: {
    eventLog: JSON.stringify(largeEventArray) // ❌ Can cause performance issues
  }
});
```

**Checklist before commit:**
- [ ] All database fields use camelCase
- [ ] All test files match schema field names
- [ ] Run `npx prisma generate` after schema changes
- [ ] Run `npx tsc --noEmit` to check for type errors

### 2. TypeScript Type Safety
**NEVER** use `any` type. Always use proper types.

```typescript
// ✅ CORRECT - Use proper types
function processData(data: unknown): ProcessedData
function handleError(error: Error): void
interface AgentConfig { steps: ActionStep[] }

// ❌ WRONG - Never use any
function processData(data: any): any
function handleError(error: any): void
```

**Checklist before commit:**
- [ ] No `any` types in new code
- [ ] Replace existing `any` with `unknown` or proper interfaces
- [ ] All function parameters have explicit types
- [ ] All return types are explicit

### 3. React JSX Entity Escaping
**ALWAYS** escape special characters in JSX.

```typescript
// ✅ CORRECT - Escaped entities
<p>Don&apos;t forget to click &quot;Submit&quot;</p>
<p>This &amp; that are important</p>

// ❌ WRONG - Unescaped entities
<p>Don't forget to click "Submit"</p>
<p>This & that are important</p>
```

### 4. Export/Import Consistency
**ALWAYS** ensure functions are properly exported and imported.

```typescript
// ✅ CORRECT - Proper exports
export async function enqueueAgentRun(agentId: string, params: unknown) {
  // implementation
}

// ✅ CORRECT - Proper imports
import { enqueueAgentRun } from '@/lib/queue'
```

## 🔧 Automated Checks

### Pre-commit Hooks
Add these scripts to `package.json`:

```json
{
  "scripts": {
    "pre-commit": "npm run lint && npm run type-check && npm run test:unit",
    "type-check": "tsc --noEmit",
    "lint:fix": "eslint . --fix --ext .ts,.tsx",
    "schema-check": "npx prisma generate && npx tsc --noEmit"
  }
}
```

### ESLint Configuration
Ensure these rules are enabled in `eslint.config.mjs`:

```javascript
{
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "react/no-unescaped-entities": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

## 📋 Code Review Checklist

Before merging any PR, verify:

### Database & Schema
- [ ] All database operations use camelCase field names
- [ ] Test files match current schema
- [ ] Prisma client regenerated after schema changes
- [ ] No TypeScript errors related to database types

### TypeScript & Types
- [ ] No `any` types used
- [ ] All function parameters have explicit types
- [ ] All return types are explicit
- [ ] TypeScript compilation passes (`tsc --noEmit`)

### React & JSX
- [ ] All special characters properly escaped
- [ ] No unescaped quotes or apostrophes
- [ ] Proper TypeScript interfaces for props

### Imports & Exports
- [ ] All functions properly exported
- [ ] All imports resolve correctly
- [ ] No unused imports or variables

### Testing
- [ ] Unit tests pass
- [ ] API tests pass
- [ ] No test database schema mismatches

## 🚀 Development Workflow

### Initial Setup (First Time Only)
1. **Copy environment file**: `cp .env.example .env.local`
2. **Set required environment variables** in `.env.local`:
   ```bash
   DATABASE_URL="file:./prisma/dev.db"
   NEXTAUTH_SECRET="your-secret-key-here"  # Generate with: openssl rand -base64 32
   ```
3. **Setup database**: `npx prisma migrate dev && npx prisma db seed`
4. **Start development server**: `npm run dev`

### Test Login Credentials
After seeding, use these credentials to test the application:
- **Alice**: `alice@example.com` / `password123`
- **Bob**: `bob@example.com` / `password123`

### Before Starting Work
1. Run `npm run schema-check` to ensure schema is up to date
2. Run `npm run type-check` to verify no type errors
3. Run `npm run lint` to check for code quality issues

### During Development
1. Use proper TypeScript types from the start
2. Follow camelCase convention for database fields
3. Escape JSX entities immediately
4. Export functions as you create them

### Before Committing
1. Run `npm run pre-commit` (includes lint, type-check, and tests)
2. Fix any linting errors
3. Ensure all tests pass
4. Verify build succeeds (`npm run build`)

### After Schema Changes
1. Run `npx prisma generate`
2. Update all test files to match new schema
3. Run `npm run type-check`
4. Run `npm run test:unit`

## 🛠️ Common Fixes

### Fixing Schema Mismatches
```bash
# Find all snake_case usage
grep -r "agent_config\|purpose_prompt\|agent_intents" tests/ src/

# Replace with camelCase
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/agent_config/agentConfig/g'
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/purpose_prompt/purposePrompt/g'
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/agent_intents/agentIntents/g'
```

### Fixing TypeScript Errors
```bash
# Check for type errors
npx tsc --noEmit

# Fix linting issues
npm run lint:fix
```

### Fixing Build Issues
```bash
# Clean and rebuild
rm -rf .next
npm run build
```

## 🤖 Agent Lifecycle & Golden Path UX

### Agent Creation Workflow
Agents follow a structured lifecycle from creation to activation:

```
DRAFT → Summarize → Context → Review → ACTIVE/REJECTED
```

### Agent Lifecycle Diagram
```
┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  DRAFT  │───▶│ Summarize   │───▶│   Context   │───▶│   Review    │
│         │    │ (LLM)       │    │ (User)      │    │ (User)      │
└─────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                              │
                                                              ▼
                                                      ┌─────────────┐
                                                      │ ACTIVE or   │
                                                      │ REJECTED    │
                                                      └─────────────┘
```

### Golden Path UX Flow

#### 1. Give Agent a Name
- User provides agent name and purpose prompt
- System validates input and prepares for recording

#### 2. Record (with optional voice-over)
- User records workflow via `/api/agents/record`
- System captures video recording and stores in `/uploads/agents/`
- Agent created with `status = DRAFT`

#### 3. Enhanced Summarization via LLM
- System calls `/api/agents/[id]/summarize` with structured event data
- **Enhanced Input**: Combines clickstream events, audio transcripts, and video metadata
- **Rich Output**: Generates detailed step-by-step workflow summaries with specific tool names
- **Data Storage**: Stores complete `eventLog` and `transcript` for audit/debugging
- `llmSummary` field populated with enhanced analysis, agent remains in `DRAFT` status

#### 4. Provide mandatory user context
- User provides additional context about agent usage
- Context includes scheduling, requirements, or special instructions
- Required for final review step

#### 5. Review final agent
- System displays:
  - LLM summary of workflow
  - User-provided context
  - Recording playback capability
  - All agent details
- User makes final decision

#### 6. Accept → ACTIVE or Reject → REJECTED
- **Accept**: Agent becomes `ACTIVE` and available for Tasks
- **Reject**: Agent becomes `REJECTED` and archived
- `userContext` stored for future reference

### Agent States

#### **DRAFT**
- Initial state after recording creation
- Ready for LLM summarization
- Cannot be executed

#### **ACTIVE**
- Approved by user during review
- Available for task execution
- Can be scheduled and run

#### **REJECTED**
- Rejected by user during review
- Archived and not available for execution
- Can be reviewed for improvement

#### **INACTIVE**
- Manually deactivated (legacy state)
- Temporarily disabled but can be reactivated

### New Agent Fields

#### `audioUrl` (string, optional)
- **Purpose**: URL or path to audio file extracted from recording
- **Usage**: Stores processed audio for voice-over analysis
- **Example**: `/uploads/agents/agent_1757875604930.mp3`

#### `llmSummary` (string, optional)
- **Purpose**: AI-generated summary of the agent's workflow
- **Usage**: Generated by `/api/agents/[id]/summarize` endpoint
- **Content**: Describes the agent's capabilities and actions based on recording analysis

#### `userContext` (string, optional)
- **Purpose**: User-provided context about how the agent should be used
- **Usage**: Required when accepting agent via `/api/agents/[id]/review`
- **Content**: Scheduling, usage instructions, or additional requirements

#### `eventLog` (JSON string, optional)
- **Purpose**: Structured timeline of user actions during recording
- **Usage**: Enhanced summarization input for detailed workflow analysis
- **Content**: Array of event objects with step, action, target, value, timestamp, url, elementType, elementText

#### `transcript` (string, optional)
- **Purpose**: Voice narration transcript from audio recording
- **Usage**: Enhanced summarization input for context and intent understanding
- **Content**: User's verbal explanation of their workflow (max 10,000 characters)

### API Endpoints for Lifecycle

#### `/api/agents/record` (POST)
- Creates agent with recording
- Sets status to `DRAFT`

#### `/api/agents/[id]/summarize` (POST)
- **Enhanced Processing**: Accepts structured eventLog and transcript data
- **Rich Analysis**: Generates detailed step-by-step summaries with tool recognition
- **Data Storage**: Stores complete eventLog and transcript for audit trail
- Populates `llmSummary`, `eventLog`, and `transcript` fields
- Agent remains in `DRAFT` status

#### `/api/agents/[id]/review` (GET)
- Returns review data for user decision
- Includes recording, summary, and context

#### `/api/agents/[id]/review` (POST)
- Accepts user decision and context
- Sets status to `ACTIVE` or `REJECTED`
- Stores `userContext`

### Enhanced Summarization - EventLog Schema

The enhanced summarization pipeline uses structured event logs to generate richer workflow summaries. Here's the JSON schema for eventLog:

```json
{
  "eventLog": [
    {
      "step": 1,
      "action": "navigate",
      "target": "https://slides.google.com",
      "value": null,
      "timestamp": 1703123456789,
      "url": "https://slides.google.com",
      "elementType": "page",
      "elementText": "Google Slides"
    },
    {
      "step": 2,
      "action": "click",
      "target": "button[data-action='create']",
      "value": null,
      "timestamp": 1703123460000,
      "url": "https://slides.google.com",
      "elementType": "button",
      "elementText": "Blank presentation"
    },
    {
      "step": 3,
      "action": "type",
      "target": "input[name='title']",
      "value": "Q1 Sales Plan",
      "timestamp": 1703123465000,
      "url": "https://docs.google.com/presentation/d/abc123",
      "elementType": "input",
      "elementText": "Untitled presentation"
    }
  ],
  "transcript": "I'm creating a new Google Slides presentation for our Q1 sales plan..."
}
```

**EventLog Fields**:
- `step` (number, required): Sequential step number
- `action` (string, required): Action type (navigate, click, type, scroll, etc.)
- `target` (string, required): Target element selector or URL
- `value` (string, optional): Input value for type actions
- `timestamp` (number, required): Unix timestamp of the action
- `url` (string, optional): Current page URL when action occurred
- `elementType` (string, optional): HTML element type (button, input, etc.)
- `elementText` (string, optional): Visible text content of the element

**Enhanced Summary Output**:
- **Tool Recognition**: Automatically identifies Google Docs, Google Slides, Canva, Figma, etc.
- **Step-by-Step Analysis**: Detailed breakdown of each user action
- **Context Integration**: Combines visual actions with voice narration
- **Outcome Focus**: Describes actual results achieved, not just actions taken
- **Audit Trail**: Complete event log and transcript stored for debugging

### Frontend Implementation Notes

1. **Progress Indicators**: Show current step in lifecycle
2. **Validation**: Ensure prerequisites are met before each step
3. **Error Handling**: Graceful handling of failed summarization or review
4. **User Feedback**: Clear messaging about agent status and next steps
5. **Recording Playback**: Allow users to review their recorded workflow
6. **Context Input**: Rich text input for user context with examples
7. **EventLog Integration**: Collect structured event data during recording for enhanced summarization

## 📁 File Upload & Storage

### Agent Recording Storage
- **Location**: `/uploads/agents/` directory in project root
- **Naming**: `agent_{timestamp}.{extension}` (e.g., `agent_1757875604930.webm`)
- **Permissions**: Ensure directory is writable by the application
- **Cleanup**: Implement periodic cleanup for orphaned files

### File Upload Validation
```typescript
// ✅ CORRECT - Validate file uploads
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_MIME_TYPES = ['video/webm', 'video/mp4'];

if (file.size > MAX_FILE_SIZE) {
  return NextResponse.json({ error: 'File too large' }, { status: 400 });
}

if (!ALLOWED_MIME_TYPES.includes(file.type)) {
  return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
}
```

### Production Considerations
- **Future**: Integrate with S3 or similar cloud storage for production
- **Security**: Validate file contents, not just extensions
- **Performance**: Consider streaming for large files
- **Backup**: Implement file backup and recovery procedures

## 📚 Resources

- [TypeScript Best Practices](https://typescript-eslint.io/rules/)
- [React JSX Entity Escaping](https://reactjs.org/docs/introducing-jsx.html#jsx-prevents-injection-attacks)
- [Prisma Schema Conventions](https://www.prisma.io/docs/concepts/components/prisma-schema)
- [ESLint Rules](https://eslint.org/docs/rules/)

---

**Remember:** These guard rails exist to prevent the exact issues we just fixed. Follow them religiously to maintain code quality and prevent regression.
