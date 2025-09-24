# Developer Guide

This guide provides comprehensive instructions for extending and developing the vergo automation platform's enterprise-grade Puppeteer stack.

## 🎯 **Overview**

The vergo platform is built on a modular, enterprise-grade architecture with clean separation of concerns. This guide covers how to extend the system by adding new action types, extending the LoginAgentAdapter, adding new rules/loop types, and implementing comprehensive testing strategies.

## 🏗️ **System Architecture**

### **Core Modules**
- **Capture**: `src/lib/agents/capture/` - Workflow recording and action capture
- **Replay**: `src/lib/agents/replay/` - Action execution and replay
- **Logic**: `src/lib/agents/logic/` - Rule compilation and logic processing
- **Execution**: `src/lib/agents/exec/` - Workflow execution engine
- **Login**: `src/lib/agents/login/` - Authentication and session management
- **Scheduler**: `src/lib/agents/scheduler/` - Workflow scheduling and orchestration

### **Key Interfaces**
```typescript
// Core execution interface
interface AgentRunner {
  execute(config: RunConfig): Promise<ExecutionResult>
}

// Login adapter interface
interface LoginAgentAdapter {
  authenticate(config: LoginConfig): Promise<LoginResult>
  validateSession(): Promise<boolean>
}

// Logic compiler interface
interface LogicCompiler {
  compile(rules: string[], variables: VariableDef[]): Promise<CompileResult>
}
```

## 🎨 **Frontend Architecture**

### **Enterprise UI Components**

The frontend is built with clean, enterprise-grade components that integrate with the Puppeteer-first workflow stack:

#### **WorkflowReplay Component**
```typescript
// src/app/components/workflows/WorkflowReplay.tsx
interface WorkflowReplayProps {
  workflowId: string
  onRunComplete?: (result: any) => void
  onRunError?: (error: string) => void
}
```
- **Purpose**: Enterprise-grade workflow replay interface
- **Features**: Real-time execution monitoring, variable injection, error handling
- **Integration**: Direct connection to AgentRunner and LoginAgentAdapter

#### **LogicEditor Component**
```typescript
// src/app/components/workflows/LogicEditor.tsx
interface LogicEditorProps {
  workflowId: string
  onLogicUpdate?: (logicSpec: LogicSpec) => void
}
```
- **Purpose**: Natural language rule editing and compilation
- **Features**: Syntax highlighting, validation, real-time compilation
- **Integration**: LogicCompiler service integration

#### **RunConsole Component**
```typescript
// src/app/components/workflows/RunConsole.tsx
interface RunConsoleProps {
  workflowId: string
  variables?: Record<string, any>
  onRunStart?: () => void
  onRunComplete?: (result: any) => void
}
```
- **Purpose**: Workflow execution console with real-time monitoring
- **Features**: Live logs, step-by-step execution, error tracking
- **Integration**: AgentRunner execution monitoring

#### **VariableConfigModal Component**
```typescript
// src/app/components/workflows/VariableConfigModal.tsx
interface VariableConfigModalProps {
  workflowId: string
  variables: VariableDef[]
  onVariablesChange?: (variables: Record<string, any>) => void
}
```
- **Purpose**: Dynamic variable configuration for workflow execution
- **Features**: Type validation, default values, required field handling
- **Integration**: WorkflowVariable schema validation

#### **ScheduleEditor Component**
```typescript
// src/app/components/workflows/ScheduleEditor.tsx
interface ScheduleEditorProps {
  workflowId: string
  onScheduleChange?: (schedule: ScheduleConfig) => void
}
```
- **Purpose**: Advanced workflow scheduling and orchestration
- **Features**: Cron expressions, event triggers, retry policies
- **Integration**: Enterprise scheduler service

### **Quickstart: New Workflow Components**

#### **1. Creating a Custom Workflow Component**
```typescript
// src/app/components/workflows/CustomWorkflowComponent.tsx
import React from 'react'
import { WorkflowReplay } from './WorkflowReplay'
import { LogicEditor } from './LogicEditor'

export default function CustomWorkflowComponent({ workflowId }: { workflowId: string }) {
  const [activeTab, setActiveTab] = useState<'replay' | 'logic'>('replay')

  return (
    <div>
      <div className="tab-navigation">
        <button onClick={() => setActiveTab('replay')}>Replay</button>
        <button onClick={() => setActiveTab('logic')}>Logic</button>
      </div>
      
      {activeTab === 'replay' && (
        <WorkflowReplay 
          workflowId={workflowId}
          onRunComplete={(result) => console.log('Run completed:', result)}
        />
      )}
      
      {activeTab === 'logic' && (
        <LogicEditor 
          workflowId={workflowId}
          onLogicUpdate={(logicSpec) => console.log('Logic updated:', logicSpec)}
        />
      )}
    </div>
  )
}
```

#### **2. Integrating with Login System**
```typescript
// src/app/components/workflows/LoginAwareWorkflow.tsx
import { LoginConfigForm } from './LoginConfigForm'

export default function LoginAwareWorkflow({ workflowId }: { workflowId: string }) {
  const [loginConfig, setLoginConfig] = useState<LoginConfig | null>(null)

  return (
    <div>
      <LoginConfigForm 
        onConfigChange={setLoginConfig}
        required={true}
      />
      
      {loginConfig && (
        <WorkflowReplay 
          workflowId={workflowId}
          loginConfig={loginConfig}
        />
      )}
    </div>
  )
}
```

## 🔧 **Extending the System**

### **1. Adding New Action Types**

#### **Step 1: Define Action Schema**
Create a new action type in `src/lib/agents/logic/schemas.ts`:

```typescript
// Add to ActionType enum
export enum ActionType {
  // Existing actions...
  CUSTOM_ACTION = 'custom_action'
}

// Define action schema
export const CustomActionSchema = z.object({
  type: z.literal(ActionType.CUSTOM_ACTION),
  customParam: z.string(),
  options: z.record(z.string(), z.any()).optional()
})

// Add to Action union type
export const ActionSchema = z.discriminatedUnion('type', [
  // Existing actions...
  CustomActionSchema
])
```

#### **Step 2: Implement Action Handler**
Create handler in `src/lib/agents/exec/actions/`:

```typescript
// src/lib/agents/exec/actions/CustomActionHandler.ts
import { Action, ActionResult } from '../types'
import { Page } from 'puppeteer'

export class CustomActionHandler {
  async execute(
    page: Page,
    action: Action,
    context: ExecutionContext
  ): Promise<ActionResult> {
    try {
      // Implement custom action logic
      const result = await this.performCustomAction(page, action)
      
      return {
        success: true,
        result: result,
        logs: [`Custom action executed: ${action.customParam}`]
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        logs: [`Custom action failed: ${error.message}`]
      }
    }
  }

  private async performCustomAction(page: Page, action: Action) {
    // Custom implementation
    // Example: Custom API call, file operation, etc.
  }
}
```

#### **Step 3: Register Handler**
Update `src/lib/agents/exec/AgentRunner.ts`:

```typescript
import { CustomActionHandler } from './actions/CustomActionHandler'

export class AgentRunner {
  private actionHandlers = new Map<string, any>()

  constructor() {
    // Register existing handlers...
    this.actionHandlers.set(ActionType.CUSTOM_ACTION, new CustomActionHandler())
  }

  // Handler will be automatically used during execution
}
```

#### **Step 4: Add Tests**
Create test file `tests/agents/exec/CustomActionHandler.test.ts`:

```typescript
import { CustomActionHandler } from '@/lib/agents/exec/actions/CustomActionHandler'
import { ActionType } from '@/lib/agents/logic/schemas'

describe('CustomActionHandler', () => {
  let handler: CustomActionHandler
  let mockPage: any

  beforeEach(() => {
    handler = new CustomActionHandler()
    mockPage = createMockPage()
  })

  it('should execute custom action successfully', async () => {
    const action = {
      type: ActionType.CUSTOM_ACTION,
      customParam: 'test-value'
    }

    const result = await handler.execute(mockPage, action, mockContext)

    expect(result.success).toBe(true)
    expect(result.logs).toContain('Custom action executed: test-value')
  })

  it('should handle custom action failures', async () => {
    // Test error scenarios
  })
})
```

### **2. Extending LoginAgentAdapter**

#### **Step 1: Add New Login Flow**
Extend `src/lib/agents/login/LoginAgentAdapter.ts`:

```typescript
export class LoginAgentAdapter {
  // Existing methods...

  async handleCustomLogin(config: LoginConfig): Promise<LoginResult> {
    try {
      // Detect custom login form
      const loginForm = await this.detectCustomLoginForm()
      
      if (loginForm) {
        return await this.performCustomLogin(config, loginForm)
      }
      
      // Fallback to universal detection
      return await this.handleUniversalLogin(config)
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  private async detectCustomLoginForm(): Promise<any> {
    // Custom login form detection logic
    // Example: Look for specific elements, URLs, etc.
  }

  private async performCustomLogin(
    config: LoginConfig, 
    form: any
  ): Promise<LoginResult> {
    // Custom login implementation
    // Example: Handle special authentication flows
  }
}
```

#### **Step 2: Add Configuration**
Extend login configuration in `src/lib/agents/logic/schemas.ts`:

```typescript
export const LoginConfigSchema = z.object({
  username: z.string(),
  password: z.string(),
  url: z.string().url(),
  tenant: z.string().optional(),
  customFlow: z.enum(['standard', 'oauth', 'saml', 'custom']).optional(),
  customOptions: z.record(z.string(), z.any()).optional(),
  options: z.record(z.string(), z.any()).optional()
})
```

#### **Step 3: Add Tests**
Create test file `tests/agents/login/CustomLoginFlow.test.ts`:

```typescript
import { LoginAgentAdapter } from '@/lib/agents/login/LoginAgentAdapter'

describe('Custom Login Flow', () => {
  let adapter: LoginAgentAdapter
  let mockBrowser: any
  let mockPage: any

  beforeEach(() => {
    adapter = new LoginAgentAdapter()
    mockBrowser = createMockBrowser()
    mockPage = createMockPage()
  })

  it('should handle custom login flow', async () => {
    const config = {
      username: 'test@example.com',
      password: 'password123',
      url: 'https://custom-app.com',
      customFlow: 'custom'
    }

    const result = await adapter.handleCustomLogin(config)

    expect(result.success).toBe(true)
    expect(result.sessionData).toBeDefined()
  })
})
```

### **3. Adding New Rules/Loop Types**

#### **Step 1: Define Rule Schema**
Extend `src/lib/agents/logic/schemas.ts`:

```typescript
// Add new rule type
export enum RuleType {
  // Existing rules...
  CUSTOM_RULE = 'custom_rule'
}

export const CustomRuleSchema = z.object({
  type: z.literal(RuleType.CUSTOM_RULE),
  condition: z.string(),
  action: z.string(),
  customLogic: z.record(z.string(), z.any()).optional()
})

// Add to Rule union type
export const RuleSchema = z.discriminatedUnion('type', [
  // Existing rules...
  CustomRuleSchema
])

// Add new loop type
export enum LoopType {
  // Existing loops...
  CUSTOM_LOOP = 'custom_loop'
}

export const CustomLoopSchema = z.object({
  type: z.literal(LoopType.CUSTOM_LOOP),
  iterator: z.string(),
  condition: z.string(),
  customOptions: z.record(z.string(), z.any()).optional()
})
```

#### **Step 2: Implement Rule Handler**
Create handler in `src/lib/agents/logic/rules/`:

```typescript
// src/lib/agents/logic/rules/CustomRuleHandler.ts
import { Rule, RuleResult } from '../types'
import { ExecutionContext } from '../../exec/types'

export class CustomRuleHandler {
  async evaluate(
    rule: Rule,
    context: ExecutionContext
  ): Promise<RuleResult> {
    try {
      // Implement custom rule logic
      const conditionMet = await this.evaluateCustomCondition(rule, context)
      
      if (conditionMet) {
        await this.executeCustomAction(rule, context)
      }

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        evaluated: conditionMet,
        result: conditionMet ? 'action_executed' : 'condition_not_met',
        logs: [`Custom rule evaluated: ${conditionMet}`]
      }
    } catch (error) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        evaluated: false,
        result: 'error',
        error: error.message,
        logs: [`Custom rule error: ${error.message}`]
      }
    }
  }

  private async evaluateCustomCondition(
    rule: Rule, 
    context: ExecutionContext
  ): Promise<boolean> {
    // Custom condition evaluation logic
  }

  private async executeCustomAction(
    rule: Rule, 
    context: ExecutionContext
  ): Promise<void> {
    // Custom action execution logic
  }
}
```

#### **Step 3: Implement Loop Handler**
Create handler in `src/lib/agents/logic/loops/`:

```typescript
// src/lib/agents/logic/loops/CustomLoopHandler.ts
import { Loop, LoopResult } from '../types'
import { ExecutionContext } from '../../exec/types'

export class CustomLoopHandler {
  async execute(
    loop: Loop,
    context: ExecutionContext
  ): Promise<LoopResult> {
    try {
      const iterations = await this.prepareCustomIterations(loop, context)
      const results = []

      for (const iteration of iterations) {
        const result = await this.executeIteration(iteration, context)
        results.push(result)
      }

      return {
        loopId: loop.id,
        loopName: loop.name,
        iterations: results.length,
        results: results,
        logs: [`Custom loop executed: ${results.length} iterations`]
      }
    } catch (error) {
      return {
        loopId: loop.id,
        loopName: loop.name,
        iterations: 0,
        error: error.message,
        logs: [`Custom loop error: ${error.message}`]
      }
    }
  }

  private async prepareCustomIterations(
    loop: Loop, 
    context: ExecutionContext
  ): Promise<any[]> {
    // Custom iteration preparation logic
  }

  private async executeIteration(
    iteration: any, 
    context: ExecutionContext
  ): Promise<any> {
    // Custom iteration execution logic
  }
}
```

#### **Step 4: Register Handlers**
Update `src/lib/agents/logic/LogicCompiler.ts`:

```typescript
import { CustomRuleHandler } from './rules/CustomRuleHandler'
import { CustomLoopHandler } from './loops/CustomLoopHandler'

export class LogicCompiler {
  private ruleHandlers = new Map<string, any>()
  private loopHandlers = new Map<string, any>()

  constructor() {
    // Register existing handlers...
    this.ruleHandlers.set(RuleType.CUSTOM_RULE, new CustomRuleHandler())
    this.loopHandlers.set(LoopType.CUSTOM_LOOP, new CustomLoopHandler())
  }
}
```

### **4. Adding New API Endpoints**

#### **Step 1: Create API Route**
Create new endpoint in `src/app/api/`:

```typescript
// src/app/api/custom/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

const CustomRequestSchema = z.object({
  customParam: z.string(),
  options: z.record(z.string(), z.any()).optional()
})

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate request
    const body = await request.json()
    const validatedData = CustomRequestSchema.parse(body)

    // Implement custom logic
    const result = await performCustomOperation(validatedData)

    return NextResponse.json({
      success: true,
      result: result
    })
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }
}

async function performCustomOperation(data: any) {
  // Custom implementation
}
```

#### **Step 2: Add Tests**
Create test file `tests/api/custom.test.ts`:

```typescript
import { POST } from '@/app/api/custom/route'

describe('/api/custom', () => {
  it('should handle custom request successfully', async () => {
    const request = new Request('http://localhost:3000/api/custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customParam: 'test-value'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
```

## 🧪 **Testing Strategy**

### **Unit Testing**

#### **Test Structure**
```
tests/
├── agents/
│   ├── capture/          # Capture system tests
│   ├── exec/             # Execution engine tests
│   ├── login/            # Login adapter tests
│   ├── logic/            # Logic compiler tests
│   └── integration/      # End-to-end integration tests
├── api/                  # API endpoint tests
└── lib/                  # Utility function tests
```

#### **Testing Guidelines**
1. **Mock External Dependencies**: Use mocks for Puppeteer, LLM services, and Redis
2. **Test Edge Cases**: Include error scenarios and boundary conditions
3. **Validate Schemas**: Test Zod schema validation thoroughly
4. **Coverage Requirements**: Maintain 95%+ test coverage for core modules

#### **Mock Setup**
```typescript
// tests/__mocks__/puppeteer.ts
export const mockPage = {
  click: jest.fn(),
  type: jest.fn(),
  waitForSelector: jest.fn(),
  screenshot: jest.fn(),
  evaluate: jest.fn()
}

export const mockBrowser = {
  newPage: jest.fn(() => Promise.resolve(mockPage)),
  close: jest.fn()
}

export default {
  launch: jest.fn(() => Promise.resolve(mockBrowser))
}
```

### **Integration Testing**

#### **End-to-End Workflow Testing**
```typescript
// tests/integration/WorkflowIntegration.test.ts
describe('Complete Workflow Integration', () => {
  it('should execute full workflow: Capture → Compile → Run → History', async () => {
    // 1. Create workflow
    const workflow = await createTestWorkflow()
    
    // 2. Record actions
    const actions = await recordTestActions()
    
    // 3. Compile logic
    const logicSpec = await compileTestLogic()
    
    // 4. Execute workflow
    const run = await executeWorkflow(workflow.id)
    
    // 5. Verify results
    expect(run.status).toBe('completed')
    expect(run.steps).toHaveLength(actions.length)
  })
})
```

#### **HTML Test Fixtures**
Use comprehensive HTML fixtures for realistic testing:

```html
<!-- tests/fixtures/test-page.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Test Application</title>
</head>
<body>
  <form id="login-form">
    <input type="text" name="username" id="username" />
    <input type="password" name="password" id="password" />
    <button type="submit" id="login-btn">Login</button>
  </form>
  
  <div id="dashboard" style="display: none;">
    <h1>Dashboard</h1>
    <button id="add-item">Add Item</button>
    <ul id="item-list"></ul>
  </div>

  <script>
    // Test helper functions
    function highlightElement(selector) {
      document.querySelector(selector)?.style.backgroundColor = 'yellow'
    }
    
    function getPageState() {
      return {
        currentUrl: window.location.href,
        visibleElements: Array.from(document.querySelectorAll(':not([style*="display: none"])')).map(el => el.id)
      }
    }
  </script>
</body>
</html>
```

### **E2E Testing**

#### **Puppeteer E2E Tests**
```typescript
// tests/e2e/WorkflowE2E.test.ts
import puppeteer from 'puppeteer'

describe('Workflow E2E Tests', () => {
  let browser: any
  let page: any

  beforeEach(async () => {
    browser = await puppeteer.launch({ headless: true })
    page = await browser.newPage()
  })

  afterEach(async () => {
    await browser.close()
  })

  it('should execute complete workflow in real browser', async () => {
    await page.goto('http://localhost:3001/test-fixture.html')
    
    // Perform actions
    await page.type('#username', 'testuser')
    await page.type('#password', 'testpass')
    await page.click('#login-btn')
    
    // Verify results
    await page.waitForSelector('#dashboard')
    const dashboardVisible = await page.$eval('#dashboard', el => el.style.display !== 'none')
    expect(dashboardVisible).toBe(true)
  })
})
```

## 🔒 **CI/CD Guardrails**

### **Strict Mode Configuration**

#### **ESLint Configuration**
```javascript
// eslint.config.mjs
export default [
  {
    rules: {
      // Strict TypeScript rules
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      
      // Security rules
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      
      // Performance rules
      'no-console': 'warn',
      'prefer-const': 'error'
    }
  }
]
```

#### **Package.json Scripts**
```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:coverage": "jest --coverage",
    "test:integration": "jest tests/integration/",
    "build": "next build",
    "audit": "npm audit --audit-level moderate"
  }
}
```

### **Dependency Management**

#### **Depcheck Configuration**
```json
// depcheck.json
{
  "ignoreMatches": [
    "eslint",
    "@types/*",
    "jest",
    "puppeteer"
  ],
  "ignoreDirs": [
    "node_modules",
    "dist",
    "build"
  ]
}
```

#### **Audit CI Configuration**
```json
// audit-ci.json
{
  "moderate": true,
  "high": true,
  "critical": true
}
```

### **Coverage Thresholds**
```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/lib/agents/': {
      branches: 95,
      functions: 98,
      lines: 98,
      statements: 98
    }
  }
}
```

## 📋 **Development Checklist**

### **Before Committing**
- [ ] All tests pass (`npm test`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Test coverage meets thresholds
- [ ] No security vulnerabilities (`npm audit`)
- [ ] No unused dependencies (`npx depcheck`)

### **Before Creating PR**
- [ ] Integration tests pass
- [ ] E2E tests pass (if applicable)
- [ ] Documentation updated
- [ ] Breaking changes documented
- [ ] Migration scripts provided (if needed)

### **Code Review Guidelines**
- [ ] Follows Project Guidelines
- [ ] Proper error handling
- [ ] Comprehensive test coverage
- [ ] Clear documentation
- [ ] Performance considerations
- [ ] Security implications reviewed

## 🚀 **Performance Optimization**

### **Database Optimization**
- Use database indexes on frequently queried fields
- Implement connection pooling
- Use transactions for multiple operations
- Optimize queries with proper joins

### **Memory Management**
- Clean up browser instances after use
- Implement proper error handling
- Use streaming for large data processing
- Monitor memory usage in production

### **Caching Strategy**
- Cache frequently accessed data
- Implement Redis caching for session data
- Use Next.js built-in caching for static data
- Cache compiled logic specifications

## 🔍 **Debugging Guide**

### **Common Issues**

#### **Puppeteer Timeouts**
```typescript
// Increase timeout for slow operations
await page.waitForSelector('.slow-element', { timeout: 30000 })

// Add custom wait conditions
await page.waitForFunction(() => {
  return document.querySelector('.dynamic-content')?.textContent?.length > 0
}, { timeout: 10000 })
```

#### **Selector Failures**
```typescript
// Use multiple selector strategies
const selectors = [
  '#unique-id',
  '[data-testid="element"]',
  'button:contains("Submit")',
  '.class-name:nth-child(1)'
]

for (const selector of selectors) {
  try {
    await page.waitForSelector(selector, { timeout: 5000 })
    await page.click(selector)
    break
  } catch (error) {
    console.log(`Selector failed: ${selector}`)
  }
}
```

#### **Login Failures**
```typescript
// Implement retry logic for login
async function loginWithRetry(config: LoginConfig, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await loginAdapter.authenticate(config)
      if (result.success) return result
    } catch (error) {
      console.log(`Login attempt ${attempt} failed:`, error.message)
      if (attempt === maxRetries) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }
}
```

### **Debug Mode**
```typescript
// Enable debug mode for detailed logging
const runner = new AgentRunner({
  debug: true,
  screenshotOnError: true,
  verboseLogging: true
})
```

---

This developer guide provides comprehensive instructions for extending the vergo automation platform. Follow these guidelines to maintain code quality, security, and performance while adding new features and capabilities.
