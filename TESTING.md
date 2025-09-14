# Testing Guide

This guide provides comprehensive testing strategies and best practices for the vergo automation platform.

## 🧪 Test Structure & Strategy

### Test Types

#### 1. **Unit Tests** → Business Logic
- **Purpose**: Test individual functions and business logic in isolation
- **Location**: `tests/test_*.test.ts` files
- **Scope**: Pure functions, utilities, data transformations
- **Example**: `test_crypto.test.ts`, `test_schemas.test.ts`

#### 2. **Integration Tests** → API Routes with Mocks
- **Purpose**: Test API endpoints with mocked external dependencies
- **Location**: `tests/test_api_*.test.ts` files
- **Scope**: API routes, database operations, authentication
- **Example**: `test_api_agents.test.ts`, `test_api_logins.test.ts`

#### 3. **E2E Tests** → Full Workflow (Optional)
- **Purpose**: Test complete user workflows end-to-end
- **Location**: `tests/test_e2e.test.ts`
- **Scope**: Full agent creation and execution workflows
- **Note**: Currently using Jest, can be upgraded to Playwright later

## 🚀 Running Tests

### Basic Commands
```bash
# Run all tests
npm run test

# Run specific test types
npm run test:unit      # Unit tests only
npm run test:api       # API tests only
npm run test:e2e       # End-to-end tests

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# Type checking
npm run type-check
```

### Test Database Setup
```bash
# Tests use separate test database
# Automatically handled by test setup files
# Database is reset between test runs
```

## 📋 Example: Minimal Agent Record Test

Reference: `test_minimal_agents_record.test.ts`

```typescript
describe('Minimal Agent Record', () => {
  it('should create agent with minimal required fields', async () => {
    // Test agent creation with only required fields
    const agent = await db.agent.create({
      data: {
        name: 'Test Agent',
        purposePrompt: 'Test purpose',
        agentConfig: JSON.stringify([]),
        agentIntents: JSON.stringify([]),
        ownerId: testUser.id
      }
    });
    
    expect(agent).toBeDefined();
    expect(agent.name).toBe('Test Agent');
  });
});
```

## 🎭 Mocking External Services

### 1. **LLM Service Mocking**
```typescript
// Mock OpenAI API responses
jest.mock('@/lib/llm-service');

const mockLLMService = {
  annotateWorkflow: jest.fn(),
  repairSelector: jest.fn(),
  generateIntents: jest.fn()
};

// Example mock response
mockLLMService.annotateWorkflow.mockResolvedValue([
  { action: 'click', selector: 'button', intent: 'Login' }
]);
```

### 2. **Puppeteer Mocking**
```typescript
// Mock browser and page objects
const mockPage = {
  goto: jest.fn(),
  click: jest.fn(),
  type: jest.fn(),
  waitForSelector: jest.fn(),
  content: jest.fn().mockResolvedValue('<html>...</html>')
};

const mockBrowser = {
  newPage: jest.fn().mockResolvedValue(mockPage),
  close: jest.fn()
};

jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue(mockBrowser)
}));
```

### 3. **Redis/BullMQ Mocking**
```typescript
// Use ioredis-mock for Redis operations
import Redis from 'ioredis-mock';

const mockRedis = new Redis();
jest.mock('ioredis', () => Redis);

// Mock queue operations
jest.mock('@/lib/queue', () => ({
  enqueueAgentProcessing: jest.fn(),
  enqueueAgentRun: jest.fn()
}));
```

### 4. **Database Mocking**
```typescript
// Mock Prisma client
jest.mock('@/lib/db', () => ({
  agent: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn()
  },
  user: {
    findUnique: jest.fn()
  }
}));
```

## 🔧 Test Setup & Teardown

### Global Setup (`tests/global-setup.ts`)
```typescript
// Setup test database
// Initialize test data
// Configure test environment
```

### Test Setup (`tests/setup.ts`)
```typescript
// Before each test
beforeEach(async () => {
  // Clean database
  // Reset mocks
  // Setup test data
});
```

### Global Teardown (`tests/global-teardown.ts`)
```typescript
// Cleanup test database
// Close connections
// Clean up test files
```

## 📊 Test Data Management

### Creating Test Data
```typescript
// Helper function for test users
const createTestUser = async () => {
  return await db.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User'
    }
  });
};

// Helper function for test agents
const createTestAgent = async (userId: string) => {
  return await db.agent.create({
    data: {
      name: 'Test Agent',
      purposePrompt: 'Test purpose',
      agentConfig: JSON.stringify([]),
      agentIntents: JSON.stringify([]),
      ownerId: userId
    }
  });
};
```

### Test Data Cleanup
```typescript
// Clean up after each test
afterEach(async () => {
  await db.agent.deleteMany();
  await db.user.deleteMany();
  await db.login.deleteMany();
});
```

## 🚨 Testing Best Practices

### 1. **Test Isolation**
- Each test should be independent
- Clean up data between tests
- Reset mocks between tests

### 2. **Descriptive Test Names**
```typescript
// ✅ Good
it('should create agent with valid configuration')

// ❌ Bad
it('should work')
```

### 3. **Arrange-Act-Assert Pattern**
```typescript
it('should process agent run successfully', async () => {
  // Arrange
  const agent = await createTestAgent();
  const mockSteps = [{ action: 'goto', url: 'https://example.com' }];
  
  // Act
  const result = await processAgentRun(agent.id, mockSteps);
  
  // Assert
  expect(result.status).toBe(RunStatus.COMPLETED);
  expect(result.logs).toBeDefined();
});
```

### 4. **Mock External Dependencies**
- Never make real API calls in tests
- Mock all external services (LLM, Puppeteer, Redis)
- Use deterministic mock responses

### 5. **Test Error Cases**
```typescript
it('should handle LLM API failure gracefully', async () => {
  // Arrange
  mockLLMService.annotateWorkflow.mockRejectedValue(new Error('API Error'));
  
  // Act & Assert
  await expect(processWorkflow(steps)).rejects.toThrow('API Error');
});
```

## 🔍 Debugging Tests

### Running Single Tests
```bash
# Run specific test file
npm test test_minimal_agents_record.test.ts

# Run specific test case
npm test -- --testNamePattern="should create agent"
```

### Debug Mode
```bash
# Run with debug output
npm test -- --verbose

# Run with coverage
npm run test:coverage
```

### Common Issues & Solutions

#### 1. **Database Connection Issues**
```bash
# Ensure test database is set up
npm run test:setup
```

#### 2. **Mock Not Working**
```typescript
// Ensure mock is defined before import
jest.mock('@/lib/llm-service');
import { llmService } from '@/lib/llm-service';
```

#### 3. **Async Test Issues**
```typescript
// Always use async/await or return promises
it('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

## 📈 Test Coverage Goals

- **Unit Tests**: 80%+ coverage for business logic
- **Integration Tests**: 70%+ coverage for API routes
- **E2E Tests**: Critical user workflows covered

## 🚀 Continuous Integration

Tests run automatically on:
- Pull request creation
- Push to main branch
- Pre-commit hooks (via `npm run pre-commit`)

### CI Pipeline
1. **Lint Check** (`npm run lint`)
2. **Type Check** (`npm run type-check`)
3. **Unit Tests** (`npm run test:unit`)
4. **Integration Tests** (`npm run test:api`)
5. **Build Check** (`npm run build`)

---

**Remember**: Good tests are your safety net. They catch bugs before they reach production and give you confidence to refactor and improve code.
