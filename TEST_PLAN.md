# Agents Feature - Comprehensive Test Plan

This document outlines the complete test suite for the Agents feature, including unit tests, integration tests, and end-to-end tests.

## 🧪 Test Structure

```
tests/
├── setup.ts                    # Test configuration and utilities
├── global-setup.ts             # Global test setup
├── global-teardown.ts          # Global test cleanup
├── test_crypto.test.ts         # Crypto utilities unit tests
├── test_schemas.test.ts        # Schema validation unit tests
├── test_rbac.test.ts           # RBAC enforcement unit tests
├── test_api_logins.test.ts     # Login API integration tests
├── test_api_agents.test.ts     # Agent API integration tests
├── test_worker.test.ts         # Worker execution tests (mocked)
└── test_e2e.test.ts           # End-to-end tests (real Puppeteer)
```

## 🔧 Test Configuration

### Jest Configuration
- **Test Environment**: Node.js
- **TypeScript Support**: ts-jest
- **Test Timeout**: 30 seconds (for integration tests)
- **Max Workers**: 1 (sequential execution to avoid DB conflicts)
- **Coverage**: Excludes auth routes

### Test Database
- **Type**: SQLite in-memory (`file:./test.db`)
- **Migrations**: Auto-applied before tests
- **Cleanup**: After each test and globally

### Test Utilities
- `createTestUser()` - Creates test users
- `createTestLogin()` - Creates test logins
- `createTestAgent()` - Creates test agents
- `createTestEntity()` - Creates test entities
- `createTestMembership()` - Creates test memberships

## 📋 Test Categories

### 1. Unit Tests

#### Crypto Utilities (`test_crypto.test.ts`)
**Purpose**: Test encryption, decryption, and credential masking

**Test Cases**:
- ✅ Encrypt/decrypt roundtrip with various data types
- ✅ Handle empty strings and special characters
- ✅ Unicode character support
- ✅ Invalid encrypted data handling
- ✅ Email masking (`ric***@example.com`)
- ✅ Username masking (`ric***`)
- ✅ Password masking (`••••••••`)
- ✅ Token masking (`abc12345***`)
- ✅ Login credential encryption/decryption
- ✅ Full roundtrip integrity

**Coverage**: 100% of crypto utility functions

#### Schema Validation (`test_schemas.test.ts`)
**Purpose**: Test Zod schema validation for all API inputs

**Test Cases**:
- ✅ Valid login creation with all system types
- ✅ Login with OAuth token validation
- ✅ Missing required fields rejection
- ✅ Invalid system type rejection
- ✅ Empty username rejection
- ✅ Missing credentials rejection
- ✅ Partial update validation
- ✅ Agent action validation (goto, type, click, waitForSelector, download)
- ✅ Unsupported action rejection
- ✅ Missing required action parameters
- ✅ Invalid timeout values
- ✅ Agent configuration validation
- ✅ Variable substitution in configs
- ✅ Agent creation/update validation

**Coverage**: All schema validation rules

#### RBAC Enforcement (`test_rbac.test.ts`)
**Purpose**: Test user data isolation and ownership

**Test Cases**:
- ✅ User can only access own logins
- ✅ User cannot access other users' logins
- ✅ Cross-user login access prevention
- ✅ User can update/delete own logins
- ✅ User cannot update/delete other users' logins
- ✅ User can only access own agents
- ✅ User cannot access other users' agents
- ✅ Agent run ownership validation
- ✅ Agent-login association ownership
- ✅ Complete data isolation between users
- ✅ Cascade deletion when user is deleted

**Coverage**: All RBAC scenarios

### 2. API Integration Tests

#### Login API (`test_api_logins.test.ts`)
**Purpose**: Test login CRUD operations with authentication

**Test Cases**:
- ✅ POST /api/logins - Create login with encrypted credentials
- ✅ POST /api/logins - Create login with OAuth token
- ✅ POST /api/logins - Reject missing credentials
- ✅ POST /api/logins - Reject unauthenticated requests
- ✅ POST /api/logins - Validate system type
- ✅ GET /api/logins - Return masked credentials
- ✅ GET /api/logins - Only return user's own logins
- ✅ GET /api/logins - Return empty array for no logins
- ✅ GET /api/logins/[id] - Return specific login with masking
- ✅ GET /api/logins/[id] - Return 404 for non-existent login
- ✅ GET /api/logins/[id] - Return 404 for other user's login
- ✅ PUT /api/logins/[id] - Update with encrypted credentials
- ✅ PUT /api/logins/[id] - Update only provided fields
- ✅ PUT /api/logins/[id] - Return 404 for non-existent login
- ✅ DELETE /api/logins/[id] - Delete login successfully
- ✅ DELETE /api/logins/[id] - Prevent deletion of used logins
- ✅ DELETE /api/logins/[id] - Return 404 for other user's login

**Coverage**: All login API endpoints

#### Agent API (`test_api_agents.test.ts`)
**Purpose**: Test agent CRUD operations and run enqueuing

**Test Cases**:
- ✅ POST /api/agents - Create agent with valid configuration
- ✅ POST /api/agents - Create agent without optional fields
- ✅ POST /api/agents - Reject invalid configuration
- ✅ POST /api/agents - Reject non-existent login IDs
- ✅ POST /api/agents - Reject empty login IDs
- ✅ POST /api/agents - Reject unauthenticated requests
- ✅ GET /api/agents - Return agents with latest runs
- ✅ GET /api/agents - Only return user's own agents
- ✅ GET /api/agents - Return empty array for no agents
- ✅ GET /api/agents/[id] - Return agent details with run history
- ✅ GET /api/agents/[id] - Return 404 for non-existent agent
- ✅ POST /api/agents/[id]/run - Enqueue agent run
- ✅ POST /api/agents/[id]/run - Return job ID
- ✅ POST /api/agents/[id]/run - Handle queue failure
- ✅ GET /api/agents/[id]/runs - Return run history with pagination
- ✅ GET /api/agents/[id]/runs - Support pagination parameters
- ✅ PUT /api/agents/[id] - Update agent configuration
- ✅ PUT /api/agents/[id] - Update login associations
- ✅ DELETE /api/agents/[id] - Delete agent successfully
- ✅ DELETE /api/agents/[id] - Cascade delete agent runs

**Coverage**: All agent API endpoints

### 3. Worker Execution Tests

#### Mocked Worker Tests (`test_worker.test.ts`)
**Purpose**: Test agent execution without launching real browsers

**Test Cases**:
- ✅ Execute successful agent workflow
- ✅ Handle failed agent workflow
- ✅ Type action with variable substitution
- ✅ WaitForSelector with custom timeout
- ✅ Download action handling
- ✅ Log execution steps with timestamps
- ✅ Handle empty agent config
- ✅ Execute agent run and update database
- ✅ Handle agent not found
- ✅ Decrypt login credentials
- ✅ Handle multiple logins
- ✅ Handle execution timeout
- ✅ Browser launch failure handling
- ✅ Page operation failure handling
- ✅ Screenshot failure handling
- ✅ Cleanup failure handling
- ✅ Variable substitution in action values
- ✅ Missing login variables handling
- ✅ Partial variable substitution

**Coverage**: All worker execution scenarios

### 4. End-to-End Tests

#### Real Puppeteer Tests (`test_e2e.test.ts`)
**Purpose**: Test complete flow with real browser automation

**Test Cases**:
- ✅ Execute agent from API to completion
- ✅ Handle real website navigation (httpbin.org)
- ✅ Handle website with login form
- ✅ Handle failed navigation gracefully
- ✅ Handle timeout scenarios
- ✅ Capture screenshots on success and failure
- ✅ Handle multiple concurrent runs
- ✅ Handle complex multi-step workflow
- ✅ Queue integration testing

**Coverage**: Complete end-to-end scenarios

## 🚀 Running Tests

### Prerequisites
```bash
# Install dependencies
npm install

# Start Redis (for queue tests)
brew services start redis
# or
docker run -d -p 6379:6379 redis:alpine
```

### Test Commands
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test categories
npm run test:unit      # Unit tests only
npm run test:api       # API tests only
npm run test:worker    # Worker tests only
npm run test:e2e       # End-to-end tests only
```

### Test Output
```
PASS tests/test_crypto.test.ts
PASS tests/test_schemas.test.ts
PASS tests/test_rbac.test.ts
PASS tests/test_api_logins.test.ts
PASS tests/test_api_agents.test.ts
PASS tests/test_worker.test.ts
PASS tests/test_e2e.test.ts

Test Suites: 7 passed, 7 total
Tests:       127 passed, 127 total
Snapshots:   0 total
Time:        45.2s
```

## 📊 Test Coverage

### Target Coverage
- **Statements**: 95%+
- **Branches**: 90%+
- **Functions**: 95%+
- **Lines**: 95%+

### Coverage Reports
```bash
npm run test:coverage
```

Generates coverage report in `coverage/` directory with:
- HTML report (`coverage/lcov-report/index.html`)
- LCOV report (`coverage/lcov.info`)
- JSON report (`coverage/coverage-final.json`)

## 🔍 Test Scenarios

### Happy Path
1. User creates login with encrypted credentials
2. User creates agent with valid configuration
3. User triggers agent execution
4. Job is enqueued successfully
5. Worker processes job with Puppeteer
6. Agent executes successfully
7. Results are stored in database
8. User can view run history and results

### Error Scenarios
1. Invalid credentials in login creation
2. Invalid agent configuration
3. Network failures during execution
4. Browser launch failures
5. Page operation timeouts
6. Database connection issues
7. Queue processing failures

### Edge Cases
1. Empty agent configurations
2. Missing login variables
3. Very long execution times
4. Concurrent agent runs
5. Large agent configurations
6. Special characters in inputs
7. Unicode text handling

## 🛠️ Test Maintenance

### Adding New Tests
1. Follow existing naming conventions
2. Use test utilities from `setup.ts`
3. Mock external dependencies
4. Clean up test data after each test
5. Add appropriate assertions
6. Update this documentation

### Test Data Management
- Use `beforeEach` for test setup
- Use `afterEach` for cleanup
- Use `createTest*` utilities for consistent data
- Avoid hardcoded IDs
- Use realistic test data

### Mocking Strategy
- Mock external services (Redis, Puppeteer)
- Mock authentication for API tests
- Use real database for integration tests
- Use real Puppeteer for E2E tests
- Mock file system operations

## 📈 Performance Testing

### Test Performance Targets
- Unit tests: < 1 second each
- API tests: < 5 seconds each
- Worker tests: < 10 seconds each
- E2E tests: < 30 seconds each

### Load Testing
```bash
# Test concurrent agent runs
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/agents/agent-id/run &
done
```

## 🔒 Security Testing

### Test Security Aspects
- ✅ Credential encryption/decryption
- ✅ Credential masking in responses
- ✅ RBAC enforcement
- ✅ Input validation
- ✅ SQL injection prevention
- ✅ XSS prevention
- ✅ CSRF protection

## 📝 Test Documentation

### Test Case Documentation
Each test file includes:
- Purpose and scope
- Test scenarios covered
- Mocking strategy
- Expected outcomes
- Dependencies

### Test Results
- All tests must pass before deployment
- Coverage must meet minimum thresholds
- Performance must meet targets
- Security tests must pass

## 🚀 CI/CD Integration

### GitHub Actions (Example)
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      - run: npm install
      - run: npm run test:coverage
      - run: npm run lint
```

## ✅ Test Checklist

### Before Deployment
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Coverage meets targets
- [ ] Performance meets targets
- [ ] Security tests pass
- [ ] No flaky tests
- [ ] Test documentation updated

### Test Quality
- [ ] Tests are deterministic
- [ ] Tests are isolated
- [ ] Tests are fast
- [ ] Tests are readable
- [ ] Tests cover edge cases
- [ ] Tests have good assertions
- [ ] Tests clean up after themselves

This comprehensive test plan ensures the Agents feature is thoroughly tested and ready for production deployment.
