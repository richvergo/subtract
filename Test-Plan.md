# Test Plan - AI Agents Platform

## Unit Tests (Jest)

- **Agent Configuration Schemas**  
  - Validate agent config with rich DOM metadata
  - Handle nullable metadata fields correctly
  - Store and retrieve metadata in database

- **LLM Service Integration**  
  - Generate intent annotations for workflow steps
  - Repair selectors using LLM when automation fails
  - Handle LLM API errors gracefully

- **Agent Executor**  
  - Execute agents with primary selectors successfully
  - Fallback to LLM repair when selectors fail
  - Log repair attempts with confidence scores
  - Update metadata with repaired selectors

- **Recording Processing**  
  - Extract workflow steps from uploaded recordings
  - Generate enriched metadata for each action
  - Process recordings in background jobs

- **Authentication & Authorization**  
  - Validate user sessions and permissions
  - Secure credential encryption/decryption
  - Owner-only access to agents and logins  

---

## Integration Tests

- **User Registration & Authentication**  
  - Creates new user with hashed password
  - Rejects duplicate email
  - Valid credentials → session created
  - Invalid credentials → 401

- **Agent Recording Pipeline**  
  - `POST /api/agent-recordings` → upload recording file
  - `POST /api/agents/create-from-recording` → create agent from recording
  - Background processing updates agent status
  - `POST /api/internal/agents/[id]/processing-complete` → internal status update

- **Agent Management APIs**  
  - `GET /api/agents` → list agents with enriched metadata
  - `POST /api/agents` → create agent with purpose prompt
  - `GET /api/agents/[id]` → get agent details with config and intents
  - `PUT /api/agents/[id]` → update agent configuration
  - `DELETE /api/agents/[id]` → delete agent and runs

- **Agent Execution APIs**  
  - `POST /api/agents/[id]/run` → execute agent with fallback repair
  - `GET /api/agents/[id]/runs` → get execution history with repair logs
  - Two-stage execution (primary + fallback repair)
  - LLM selector repair integration

- **Login Management APIs**  
  - `GET /api/logins` → list logins with masked credentials
  - `POST /api/logins` → create login with encrypted storage
  - `GET /api/logins/[id]/check` → test login connection
  - `PUT /api/logins/[id]` → update encrypted credentials
  - `DELETE /api/logins/[id]` → delete login credentials

- **Security & Data Isolation**  
  - Users can only access their own agents and logins
  - All API endpoints validate ownership
  - Credential encryption/decryption works correctly
  - No cross-user data access  

---

## E2E Tests (Playwright)

**AI Agent Creation Golden Path**  
1. Register and login as a user
2. Navigate to agents page → see empty state
3. Upload a workflow recording file
4. Create agent from recording with purpose prompt
5. View processing status and wait for completion
6. Review generated agent configuration and intents
7. Test run the agent and verify execution
8. View execution logs and repair attempts
9. Activate agent for production use

**Agent Execution with Fallback Repair**  
1. Create an agent with intentionally broken selectors
2. Run the agent and observe primary execution failure
3. Verify LLM fallback repair is triggered
4. Check that new selectors are generated and applied
5. Confirm successful execution after repair
6. Review repair logs with confidence scores and reasoning

**Login Management Flow**  
1. Navigate to logins page
2. Add new login credentials with encryption
3. Test login connection and verify status
4. Associate login with an agent
5. Run agent using the login credentials
6. Verify secure credential handling

**Recording Processing Pipeline**  
1. Upload various recording formats (mp4, webm)
2. Verify file size and type validation
3. Check processing status updates in real-time
4. Monitor background job completion
5. Verify metadata extraction and intent generation

**Security & Access Control**  
1. Verify users can only see their own agents and logins
2. Test unauthorized access attempts are blocked
3. Confirm credential masking in UI
4. Verify encrypted storage in database  

---

## Test Fixtures

- **Agent Test Data**  
  - Sample agents with enriched metadata and processing status
  - Various agent configurations with different action types
  - Agents in different states (DRAFT, ACTIVE, processing)
  - Sample recordings for testing upload pipeline

- **Login Test Data**  
  - Sample login credentials with encryption
  - Different system types (ERP, CRM, etc.)
  - Various connection statuses for testing

- **Execution Test Data**  
  - Sample agent runs with repair logs
  - Failed executions for fallback testing
  - Successful executions with metadata

---

## CI Gates

- ✅ Lint must pass  
- ✅ Typecheck must pass  
- ✅ Unit tests must pass (metadata, LLM service, executor)
- ✅ Integration tests must pass (APIs, recording pipeline)
- ✅ Agent creation E2E must pass  
- ✅ Agent execution with fallback repair E2E must pass
- ✅ Security and access control E2E must pass  
- ✅ Build must succeed  
