# Agent Confirmation and Feedback Feature

## Overview

This feature adds user confirmation and feedback capabilities to the Agents system, enabling users to review agent runs and provide feedback. Confirmed agents can be activated, while rejected runs provide feedback for improvements.

## Database Changes

### AgentRun Table
- `userConfirmed` (BOOLEAN, nullable): NULL = not reviewed, true = confirmed, false = rejected
- `userFeedback` (TEXT, nullable): User feedback text for rejected runs

### Agent Table
- `status` (TEXT, default 'DRAFT'): Agent status (DRAFT, ACTIVE)

### New Enum
- `AgentStatus`: DRAFT, ACTIVE

## API Endpoints

### POST /api/agent-runs/{id}/confirm
Confirms an agent run and optionally activates the agent.

**Request Body:**
```json
{
  "activateAgent": boolean // optional, default false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Agent run confirmed successfully",
  "data": {
    "run": { /* updated run object */ },
    "agent": { /* updated agent object if activated */ }
  }
}
```

### POST /api/agent-runs/{id}/reject
Rejects an agent run and stores user feedback.

**Request Body:**
```json
{
  "feedback": "string" // required, 1-1000 characters
}
```

**Response:**
```json
{
  "success": true,
  "message": "Agent run rejected successfully",
  "data": {
    "run": { /* updated run object */ }
  }
}
```

### GET /api/agents/{id}/runs
Updated to include confirmation data in the response.

**Response includes:**
- `userConfirmed`: boolean | null
- `userFeedback`: string | null

## Schema Validation

### confirmAgentRunSchema
- `activateAgent`: boolean (optional, default false)

### rejectAgentRunSchema
- `feedback`: string (required, 1-1000 characters)

## RBAC Enforcement

- Only the agent owner can confirm/reject runs
- Unauthenticated requests return 401
- Requests for other users' runs return 403

## Test Coverage

### Unit Tests (`test_agent_confirmation.test.ts`)
- Schema validation
- Database operations
- RBAC enforcement
- Confirmation workflow
- Multiple runs handling
- Edge cases

### API Tests (`test_api_confirmation.test.ts`)
- Confirm endpoint (success, activation, auth, RBAC, validation)
- Reject endpoint (success, auth, RBAC, validation)
- Integration with runs endpoint

## Usage Examples

### Confirm a Run
```bash
curl -X POST /api/agent-runs/run123/confirm \
  -H "Content-Type: application/json" \
  -d '{"activateAgent": true}'
```

### Reject a Run with Feedback
```bash
curl -X POST /api/agent-runs/run123/reject \
  -H "Content-Type: application/json" \
  -d '{"feedback": "The automation clicked the wrong button"}'
```

### Check Run Status
```bash
curl /api/agents/agent123/runs
```

## Frontend Integration (Future)

The API is ready for simple UI implementation:

### Confirm Button
```javascript
const confirmRun = async (runId, activateAgent = false) => {
  const response = await fetch(`/api/agent-runs/${runId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activateAgent })
  });
  return response.json();
};
```

### Reject Button with Feedback
```javascript
const rejectRun = async (runId, feedback) => {
  const response = await fetch(`/api/agent-runs/${runId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedback })
  });
  return response.json();
};
```

## Migration

Run the database migration to add the new fields:

```bash
npx prisma migrate deploy
```

## Test Commands

```bash
# Run confirmation tests
npm run test:confirmation

# Run all tests
npm run test:all
```

## Benefits

1. **Quality Control**: Users can review agent runs before going live
2. **Feedback Loop**: Rejected runs provide actionable feedback for improvements
3. **Agent Lifecycle**: Clear progression from DRAFT to ACTIVE status
4. **Audit Trail**: Complete history of user confirmations and feedback
5. **RBAC Security**: Only authorized users can confirm/reject runs

This feature completes Step 5 of the MVP flow, enabling users to review and approve agent automation before deployment.
