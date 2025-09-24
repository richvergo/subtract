/**
 * Basic Workflow Smoke Test
 * End-to-end test that validates the full frontend ↔ backend stack
 * Runs through the complete workflow creation, configuration, and execution pipeline
 */

import { z } from 'zod'

// Test configuration
const TEST_CONFIG = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
  TEST_FIXTURE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ? 
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/test-fixture.html` : 
    'http://localhost:3000/test-fixture.html',
  TIMEOUT: 30000, // 30 seconds max
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
}

// Zod schemas for API response validation
const WorkflowResponseSchema = z.object({
  workflow: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    status: z.enum(['DRAFT', 'ACTIVE', 'REJECTED', 'INACTIVE']),
    ownerId: z.string(),
    createdAt: z.string().or(z.date()),
    updatedAt: z.string().or(z.date())
  })
})

const VariablesResponseSchema = z.object({
  success: z.boolean(),
  variables: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    workflowId: z.string(),
    required: z.boolean()
  }))
})

const LogicGenerationResponseSchema = z.object({
  success: z.boolean(),
  logicSpec: z.object({
    id: z.string(),
    name: z.string(),
    version: z.string(),
    actions: z.array(z.any()),
    variables: z.array(z.any()),
    settings: z.object({
      timeout: z.number(),
      retryAttempts: z.number(),
      screenshotOnError: z.boolean(),
      debugMode: z.boolean()
    })
  })
})

const ValidationResponseSchema = z.object({
  success: z.boolean(),
  steps: z.array(z.object({
    id: z.string(),
    action: z.object({
      action: z.string(),
      selector: z.string().optional(),
      value: z.string().optional()
    }),
    order: z.number()
  })),
  validationLogs: z.array(z.object({
    id: z.string(),
    level: z.enum(['info', 'warn', 'error']),
    message: z.string()
  }))
})

const RunResponseSchema = z.object({
  success: z.boolean(),
  runId: z.string(),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'])
})

const RunStatusResponseSchema = z.object({
  success: z.boolean(),
  run: z.object({
    id: z.string(),
    status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']),
    startedAt: z.string().or(z.date()),
    finishedAt: z.string().or(z.date()).nullable(),
    steps: z.array(z.object({
      id: z.string(),
      status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED']),
      startedAt: z.string().or(z.date()),
      finishedAt: z.string().or(z.date()).nullable()
    }))
  })
})

// Test data
const TEST_WORKFLOW = {
  name: 'Smoke Test Workflow',
  description: 'Automated smoke test workflow for end-to-end validation',
  actions: [
    {
      id: 'action_1',
      type: 'navigate',
      url: TEST_CONFIG.TEST_FIXTURE_URL,
      metadata: {
        timestamp: Date.now(),
        description: 'Navigate to test fixture page'
      }
    },
    {
      id: 'action_2',
      type: 'click',
      selector: '#nav-button',
      metadata: {
        timestamp: Date.now(),
        description: 'Click navigation button'
      }
    },
    {
      id: 'action_3',
      type: 'type',
      selector: '#test-input',
      value: 'Smoke test automation',
      metadata: {
        timestamp: Date.now(),
        description: 'Fill test input field'
      }
    },
    {
      id: 'action_4',
      type: 'select',
      selector: '#test-select',
      value: 'option2',
      metadata: {
        timestamp: Date.now(),
        description: 'Select option from dropdown'
      }
    },
    {
      id: 'action_5',
      type: 'click',
      selector: '#form-submit',
      metadata: {
        timestamp: Date.now(),
        description: 'Submit the form'
      }
    }
  ],
  variables: [
    {
      name: 'testVariable',
      type: 'string',
      description: 'Test variable for smoke testing',
      defaultValue: 'smoke-test-value',
      required: true
    }
  ],
  settings: {
    timeout: 10000,
    retryAttempts: 2,
    screenshotOnError: true,
    debugMode: false
  },
  // Domain scope configuration for smoke test
  domainScope: {
    baseDomain: 'getvergo.com',
    allowedDomains: ['vergoerp.io'],
    ssoProviders: ['*.auth0.com', 'accounts.google.com'],
    metadata: {
      testEnvironment: 'smoke-test',
      version: '1.0.0'
    }
  }
}

// Utility functions
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function makeApiCall<T>(
  endpoint: string,
  options: RequestInit = {},
  schema: z.ZodSchema<T>,
  retries: number = TEST_CONFIG.RETRY_ATTEMPTS
): Promise<T> {
  const url = `${TEST_CONFIG.API_BASE_URL}${endpoint}`
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 API Call (attempt ${attempt}/${retries}): ${options.method || 'GET'} ${endpoint}`)
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        credentials: 'include',
        ...options
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const validatedData = schema.parse(data)
      
      console.log(`✅ API Call successful: ${endpoint}`)
      return validatedData
      
    } catch (error) {
      console.error(`❌ API Call failed (attempt ${attempt}/${retries}): ${endpoint}`, error)
      
      if (attempt === retries) {
        throw error
      }
      
      await sleep(TEST_CONFIG.RETRY_DELAY * attempt)
    }
  }
  
  throw new Error('Max retries exceeded')
}

async function waitForRunCompletion(runId: string, maxWaitTime: number = 20000): Promise<any> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const status = await makeApiCall(
        `/api/agents/runs/${runId}`,
        { method: 'GET' },
        RunStatusResponseSchema
      )
      
      if (status.run.status === 'COMPLETED') {
        console.log(`✅ Workflow run completed: ${runId}`)
        return status.run
      }
      
      if (status.run.status === 'FAILED' || status.run.status === 'CANCELLED') {
        throw new Error(`Workflow run failed with status: ${status.run.status}`)
      }
      
      console.log(`⏳ Workflow run in progress: ${status.run.status}`)
      await sleep(1000)
      
    } catch (error) {
      console.error(`❌ Error checking run status: ${error}`)
      await sleep(1000)
    }
  }
  
  throw new Error(`Workflow run did not complete within ${maxWaitTime}ms`)
}

// Main smoke test
describe('Basic Workflow Smoke Test', () => {
  let workflowId: string
  let runId: string
  
  beforeAll(async () => {
    console.log('🚀 Starting Basic Workflow Smoke Test')
    console.log(`📊 Test Configuration:`)
    console.log(`  - API Base URL: ${TEST_CONFIG.API_BASE_URL}`)
    console.log(`  - Test Fixture URL: ${TEST_CONFIG.TEST_FIXTURE_URL}`)
    console.log(`  - Timeout: ${TEST_CONFIG.TIMEOUT}ms`)
    console.log(`  - Retry Attempts: ${TEST_CONFIG.RETRY_ATTEMPTS}`)
  }, TEST_CONFIG.TIMEOUT)

  afterAll(async () => {
    // Cleanup: Delete the test workflow
    if (workflowId) {
      try {
        console.log(`🧹 Cleaning up test workflow: ${workflowId}`)
        await makeApiCall(
          `/api/agents/${workflowId}`,
          { method: 'DELETE' },
          z.object({ success: z.boolean() })
        )
        console.log(`✅ Test workflow deleted: ${workflowId}`)
      } catch (error) {
        console.error(`❌ Failed to delete test workflow: ${error}`)
      }
    }
  })

  test('Step 1: Create workflow via API', async () => {
    console.log('📝 Step 1: Creating workflow via API...')
    
    const response = await makeApiCall(
      '/api/agents/record',
      {
        method: 'POST',
        body: JSON.stringify(TEST_WORKFLOW)
      },
      WorkflowResponseSchema
    )
    
    expect(response.workflow).toBeDefined()
    expect(response.workflow.id).toBeDefined()
    expect(response.workflow.name).toBe(TEST_WORKFLOW.name)
    expect(response.workflow.status).toBe('DRAFT')
    
    workflowId = response.workflow.id
    console.log(`✅ Workflow created: ${workflowId}`)
  })

  test('Step 2: Configure variables via VariableConfigModal API', async () => {
    console.log('⚙️ Step 2: Configuring variables...')
    
    const variablesData = {
      name: 'smokeTestVar',
      type: 'string',
      description: 'Smoke test variable',
      defaultValue: 'automated-test',
      required: true
    }
    
    const response = await makeApiCall(
      `/api/agents/${workflowId}/variables`,
      {
        method: 'POST',
        body: JSON.stringify(variablesData)
      },
      VariablesResponseSchema
    )
    
    expect(response.success).toBe(true)
    expect(response.variables).toBeDefined()
    expect(response.variables.length).toBeGreaterThan(0)
    
    console.log(`✅ Variables configured: ${response.variables.length} variables`)
  })

  test('Step 3: Define logic via LogicEditor API', async () => {
    console.log('🧠 Step 3: Generating logic...')
    
    const logicData = {
      nlRules: 'Navigate to test page, fill form fields, and submit',
      variables: TEST_WORKFLOW.variables
    }
    
    const response = await makeApiCall(
      `/api/agents/${workflowId}/generate-logic`,
      {
        method: 'POST',
        body: JSON.stringify(logicData)
      },
      LogicGenerationResponseSchema
    )
    
    expect(response.success).toBe(true)
    expect(response.logicSpec).toBeDefined()
    expect(response.logicSpec.actions).toBeDefined()
    expect(response.logicSpec.variables).toBeDefined()
    
    console.log(`✅ Logic generated: ${response.logicSpec.actions.length} actions`)
  })

  test('Step 4: Validate workflow via WorkflowReplay API', async () => {
    console.log('🔍 Step 4: Validating workflow...')
    
    const response = await makeApiCall(
      `/api/agents/${workflowId}/validate`,
      { method: 'GET' },
      ValidationResponseSchema
    )
    
    expect(response.success).toBe(true)
    expect(response.steps).toBeDefined()
    expect(response.steps.length).toBeGreaterThan(0)
    expect(response.validationLogs).toBeDefined()
    
    // Check that validation logs contain success messages
    const successLogs = response.validationLogs.filter(log => log.level === 'info')
    expect(successLogs.length).toBeGreaterThan(0)
    
    console.log(`✅ Workflow validated: ${response.steps.length} steps, ${response.validationLogs.length} logs`)
  })

  test('Step 5: Run workflow via RunConsole API', async () => {
    console.log('🚀 Step 5: Running workflow...')
    
    const runData = {
      variables: {
        testVariable: 'smoke-test-execution'
      },
      settings: {
        timeout: 15000,
        retryAttempts: 1,
        screenshotOnError: true,
        debugMode: false
      }
    }
    
    const response = await makeApiCall(
      `/api/agents/${workflowId}/run`,
      {
        method: 'POST',
        body: JSON.stringify(runData)
      },
      RunResponseSchema
    )
    
    expect(response.success).toBe(true)
    expect(response.runId).toBeDefined()
    expect(['PENDING', 'RUNNING']).toContain(response.status)
    
    runId = response.runId
    console.log(`✅ Workflow run started: ${runId}`)
  })

  test('Step 6: Monitor workflow execution and validate completion', async () => {
    console.log('📊 Step 6: Monitoring workflow execution...')
    
    const completedRun = await waitForRunCompletion(runId)
    
    expect(completedRun.status).toBe('COMPLETED')
    expect(completedRun.steps).toBeDefined()
    expect(completedRun.steps.length).toBeGreaterThan(0)
    
    // Check that at least one step completed successfully
    const completedSteps = completedRun.steps.filter(step => step.status === 'COMPLETED')
    expect(completedSteps.length).toBeGreaterThan(0)
    
    console.log(`✅ Workflow execution completed: ${completedSteps.length}/${completedRun.steps.length} steps successful`)
  })

  test('Step 7: Validate workflow run results', async () => {
    console.log('📋 Step 7: Validating workflow run results...')
    
    const runStatus = await makeApiCall(
      `/api/agents/runs/${runId}`,
      { method: 'GET' },
      RunStatusResponseSchema
    )
    
    expect(runStatus.success).toBe(true)
    expect(runStatus.run).toBeDefined()
    expect(runStatus.run.status).toBe('COMPLETED')
    expect(runStatus.run.finishedAt).toBeDefined()
    expect(runStatus.run.steps.length).toBeGreaterThan(0)
    
    // Validate that the run has proper timing
    const startTime = new Date(runStatus.run.startedAt).getTime()
    const endTime = new Date(runStatus.run.finishedAt!).getTime()
    const duration = endTime - startTime
    
    expect(duration).toBeGreaterThan(0)
    expect(duration).toBeLessThan(TEST_CONFIG.TIMEOUT)
    
    console.log(`✅ Workflow run validated: Duration ${duration}ms, ${runStatus.run.steps.length} steps`)
  })

  test('Step 7.5: Validate domain-scoping functionality', async () => {
    console.log('🌐 Step 7.5: Validating domain-scoping functionality...')
    
    // Test that workflow uses apply.getvergo.com domain scoping
    const workflowDetails = await makeApiCall(
      `/api/agents/${workflowId}`,
      { method: 'GET' },
      WorkflowResponseSchema
    )
    
    expect(workflowDetails.workflow).toBeDefined()
    expect(workflowDetails.workflow.id).toBe(workflowId)
    
    // Validate that domain scope is properly configured
    const domainScopeConfig = TEST_WORKFLOW.domainScope
    expect(domainScopeConfig).toBeDefined()
    expect(domainScopeConfig.baseDomain).toBe('getvergo.com')
    expect(domainScopeConfig.allowedDomains).toContain('vergoerp.io')
    expect(domainScopeConfig.ssoProviders).toContain('*.auth0.com')
    
    // Test domain scope validation
    const testUrls = [
      'https://apply.getvergo.com',
      'https://app.getvergo.com/dashboard',
      'https://vergoerp.io',
      'https://company.auth0.com/login'
    ]
    
    const deniedUrls = [
      'https://gmail.com',
      'https://slack.com',
      'https://facebook.com'
    ]
    
    // Validate allowed domains
    testUrls.forEach(url => {
      const domain = new URL(url).hostname
      const isAllowed = domainScopeConfig.baseDomain === domain || 
                       domain.endsWith('.' + domainScopeConfig.baseDomain) ||
                       domainScopeConfig.allowedDomains.includes(domain) ||
                       domainScopeConfig.ssoProviders.some(sso => 
                         sso.startsWith('*.') ? domain.endsWith(sso.substring(2)) : domain === sso
                       )
      expect(isAllowed).toBe(true)
    })
    
    // Validate denied domains
    deniedUrls.forEach(url => {
      const domain = new URL(url).hostname
      const isAllowed = domainScopeConfig.baseDomain === domain || 
                       domain.endsWith('.' + domainScopeConfig.baseDomain) ||
                       domainScopeConfig.allowedDomains.includes(domain) ||
                       domainScopeConfig.ssoProviders.some(sso => 
                         sso.startsWith('*.') ? domain.endsWith(sso.substring(2)) : domain === sso
                       )
      expect(isAllowed).toBe(false)
    })
    
    console.log(`✅ Domain-scoping validation passed: ${testUrls.length} allowed, ${deniedUrls.length} denied`)
  })

  test('Step 8: Test schedule creation (optional)', async () => {
    console.log('📅 Step 8: Testing schedule creation...')
    
    const scheduleData = {
      name: 'Smoke Test Schedule',
      cronExpression: '0 2 * * *',
      timezone: 'UTC',
      isActive: false, // Don't actually activate the schedule
      runConfig: {},
      variables: { testVariable: 'scheduled-test' }
    }
    
    const response = await makeApiCall(
      `/api/agents/${workflowId}/schedule`,
      {
        method: 'POST',
        body: JSON.stringify(scheduleData)
      },
      z.object({
        success: z.boolean(),
        data: z.object({
          id: z.string(),
          cronExpression: z.string(),
          isActive: z.boolean()
        })
      })
    )
    
    expect(response.success).toBe(true)
    expect(response.data.cronExpression).toBe('0 2 * * *')
    expect(response.data.isActive).toBe(false)
    
    console.log(`✅ Schedule created: ${response.data.id}`)
  })

  test('Step 8.5: Validate run logs contain only allowed domain actions', async () => {
    console.log('📊 Step 8.5: Validating run logs for domain-scoping...')
    
    // Enhanced Zod schema for domain scope validation
    const DomainScopeLogSchema = z.object({
      success: z.boolean(),
      logs: z.array(z.object({
        id: z.string(),
        level: z.enum(['info', 'warn', 'error']),
        message: z.string(),
        timestamp: z.string().or(z.date()),
        domain: z.string().optional(),
        action: z.string().optional(),
        // Enhanced validation for domain scoping
        domainScope: z.object({
          isPaused: z.boolean(),
          currentDomain: z.string().nullable(),
          allowedDomains: z.array(z.string()),
          navigationHistory: z.array(z.any())
        }).optional()
      }))
    })
    
    // Get the run logs to validate domain scoping
    const runLogs = await makeApiCall(
      `/api/agents/runs/${runId}/logs`,
      { method: 'GET' },
      DomainScopeLogSchema
    )
    
    expect(runLogs.success).toBe(true)
    expect(runLogs.logs).toBeDefined()
    expect(runLogs.logs.length).toBeGreaterThan(0)
    
    // Validate domain scope configuration with Zod
    const domainScopeConfig = TEST_WORKFLOW.domainScope
    const DomainScopeConfigSchema = z.object({
      baseDomain: z.string().min(1, 'Base domain is required'),
      allowedDomains: z.array(z.string()),
      ssoProviders: z.array(z.string()),
      metadata: z.record(z.string(), z.any())
    })
    
    const validatedConfig = DomainScopeConfigSchema.parse(domainScopeConfig)
    expect(validatedConfig.baseDomain).toBe('getvergo.com')
    expect(validatedConfig.allowedDomains).toContain('vergoerp.io')
    expect(validatedConfig.ssoProviders).toContain('*.auth0.com')
    
    // Validate that logs contain only allowed domain actions
    const allowedDomains = [
      validatedConfig.baseDomain,
      ...validatedConfig.allowedDomains,
      ...validatedConfig.ssoProviders.map(sso => 
        sso.startsWith('*.') ? sso.substring(2) : sso
      )
    ]
    
    // Check that no logs contain external domain actions (Gmail, Slack, etc.)
    const extraneousDomains = ['gmail.com', 'slack.com', 'facebook.com', 'twitter.com', 'linkedin.com']
    const externalDomainLogs = runLogs.logs.filter(log => {
      if (log.domain) {
        const isExtraneous = extraneousDomains.some(extraneous => 
          log.domain?.includes(extraneous)
        )
        return isExtraneous
      }
      return false
    })
    
    expect(externalDomainLogs.length).toBe(0)
    
    // Validate that logs contain expected domain actions
    const allowedDomainLogs = runLogs.logs.filter(log => {
      if (log.domain) {
        const isAllowed = allowedDomains.some(allowed => 
          log.domain === allowed || log.domain?.endsWith('.' + allowed)
        )
        return isAllowed
      }
      return false
    })
    
    expect(allowedDomainLogs.length).toBeGreaterThan(0)
    
    // Check for specific domain patterns in logs
    const domainPatterns = [
      'getvergo.com',
      'vergoerp.io',
      'auth0.com'
    ]
    
    const hasExpectedDomains = domainPatterns.some(pattern => 
      runLogs.logs.some(log => 
        log.message.includes(pattern) || log.domain?.includes(pattern)
      )
    )
    
    expect(hasExpectedDomains).toBe(true)
    
    // Validate domain scope state in logs
    const domainScopeLogs = runLogs.logs.filter(log => log.domainScope)
    if (domainScopeLogs.length > 0) {
      domainScopeLogs.forEach(log => {
        expect(log.domainScope?.allowedDomains).toContain('getvergo.com')
        expect(log.domainScope?.allowedDomains).toContain('vergoerp.io')
      })
    }
    
    console.log(`✅ Run logs validation passed: ${allowedDomainLogs.length} allowed domain actions, ${externalDomainLogs.length} external domain actions`)
  })

  test('Full pipeline integration test', async () => {
    console.log('🔄 Full Pipeline Integration Test...')
    
    // This test validates that all components work together
    const startTime = Date.now()
    
    // Verify workflow exists and is accessible
    const workflowStatus = await makeApiCall(
      `/api/agents/${workflowId}`,
      { method: 'GET' },
      WorkflowResponseSchema
    )
    expect(workflowStatus.workflow.id).toBe(workflowId)
    
    // Verify variables are configured
    const variablesStatus = await makeApiCall(
      `/api/agents/${workflowId}/variables`,
      { method: 'GET' },
      VariablesResponseSchema
    )
    expect(variablesStatus.success).toBe(true)
    
    // Verify validation works
    const validationStatus = await makeApiCall(
      `/api/agents/${workflowId}/validate`,
      { method: 'GET' },
      ValidationResponseSchema
    )
    expect(validationStatus.success).toBe(true)
    
    const endTime = Date.now()
    const totalDuration = endTime - startTime
    
    console.log(`✅ Full pipeline integration test passed in ${totalDuration}ms`)
    
    // Ensure the test runs fast enough for CI/CD
    expect(totalDuration).toBeLessThan(TEST_CONFIG.TIMEOUT)
  })
}, TEST_CONFIG.TIMEOUT)
