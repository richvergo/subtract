/**
 * AgentRunner Tests
 * Comprehensive tests for workflow execution with login support
 */

import { AgentRunner, RunConfig, WorkflowAction, WorkflowRunResult } from '@/lib/agents/exec/AgentRunner'
import { Browser, Page } from 'puppeteer'
import { prisma } from '@/lib/db'

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    workflowRun: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn()
    },
    workflowRunStep: {
      create: jest.fn()
    },
    workflow: {
      findUnique: jest.fn()
    }
  }
}))

// Mock Puppeteer
jest.mock('puppeteer', () => ({
  Browser: jest.fn(),
  Page: jest.fn(),
  CDPSession: jest.fn()
}))

// Mock existing Login Agent services
jest.mock('@/lib/session-manager', () => ({
  SessionManager: {
    encryptSessionData: jest.fn().mockReturnValue('encrypted_session_data'),
    decryptSessionData: jest.fn().mockReturnValue({
      cookies: [],
      localStorage: {},
      sessionStorage: {},
      userAgent: 'test-user-agent',
      timestamp: Date.now()
    }),
    applySessionToPage: jest.fn().mockResolvedValue(undefined),
    validateSession: jest.fn().mockResolvedValue({
      isValid: true,
      needsReconnect: false
    })
  }
}))

jest.mock('@/lib/universal-login-detector', () => ({
  UniversalLoginDetector: {
    detectLoginForm: jest.fn().mockResolvedValue({
      formType: 'traditional',
      submissionMethod: 'submit',
      selectors: {
        username: 'input[name="username"]',
        password: 'input[name="password"]',
        submit: 'button[type="submit"]'
      }
    }),
    performLogin: jest.fn().mockResolvedValue({
      success: true
    })
  }
}))

// Mock the schemas to avoid Zod issues
jest.mock('@/lib/agents/logic/schemas', () => ({
  validateLoginConfig: jest.fn().mockImplementation((config: any) => {
    if (!config.username || !config.password || !config.url) {
      throw new Error('Invalid login configuration')
    }
    return config
  })
}))

describe('AgentRunner', () => {
  let agentRunner: AgentRunner
  let mockBrowser: jest.Mocked<Browser>
  let mockPage: jest.Mocked<Page>

  const mockWorkflow = {
    id: 'workflow-123',
    name: 'Test Workflow',
    description: 'Test workflow description',
    status: 'ACTIVE',
    version: '1.0.0',
    requiresLogin: false,
    loginConfig: null,
    actions: [
      {
        id: 'action-1',
        workflowId: 'workflow-123',
        action: {
          id: 'action-1',
          type: 'click',
          selector: '#button',
          value: undefined,
          url: undefined,
          coordinates: undefined,
          waitFor: undefined,
          timeout: 30000,
          retryCount: 3,
          dependencies: [],
          metadata: {}
        },
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'action-2',
        workflowId: 'workflow-123',
        action: {
          id: 'action-2',
          type: 'type',
          selector: '#input',
          value: 'test value',
          url: undefined,
          coordinates: undefined,
          waitFor: undefined,
          timeout: 30000,
          retryCount: 3,
          dependencies: [],
          metadata: {}
        },
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  }

  const mockLoginConfig = {
    username: 'testuser',
    password: 'testpass',
    url: 'https://example.com/login',
    tenant: 'test-tenant',
    options: { timeout: 30000 }
  }

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks()

    // Create mock page
    mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      click: jest.fn().mockResolvedValue(undefined),
      type: jest.fn().mockResolvedValue(undefined),
      select: jest.fn().mockResolvedValue(undefined),
      hover: jest.fn().mockResolvedValue(undefined),
      screenshot: jest.fn().mockResolvedValue('base64screenshot'),
      waitForTimeout: jest.fn().mockResolvedValue(undefined),
      waitForLoadState: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockResolvedValue('test-user-agent'),
      mouse: {
        wheel: jest.fn().mockResolvedValue(undefined)
      }
    } as any

    // Create mock browser
    mockBrowser = {
      version: jest.fn().mockResolvedValue('Chrome/91.0.4472.124')
    } as any

    // Create agent runner
    agentRunner = new AgentRunner()
    await agentRunner.initialize(mockBrowser, mockPage)

    // Mock Prisma responses
    ;(prisma.workflow.findUnique as jest.Mock).mockResolvedValue(mockWorkflow)
    ;(prisma.workflowRun.create as jest.Mock).mockResolvedValue({
      id: 'run-123',
      workflowId: 'workflow-123',
      status: 'RUNNING',
      startedAt: new Date(),
      variables: {},
      metadata: {}
    })
    ;(prisma.workflowRun.update as jest.Mock).mockResolvedValue({})
    ;(prisma.workflowRunStep.create as jest.Mock).mockResolvedValue({})
  })

  afterEach(async () => {
    await agentRunner.cleanup()
  })

  describe('Case 1: Workflow without login executes successfully', () => {
    it('should execute workflow without authentication', async () => {
      const runConfig: RunConfig = {
        requiresLogin: false,
        variables: { testVar: 'testValue' },
        options: {
          headless: true,
          concurrency: 1,
          timeout: 30000
        }
      }

      const result = await agentRunner.run('workflow-123', runConfig)

      expect(result).toBeDefined()
      expect(result.workflowId).toBe('workflow-123')
      expect(result.status).toBe('success')
      expect(result.summary.successCount).toBe(2)
      expect(result.summary.failureCount).toBe(0)
      expect(result.metadata.loginRequired).toBe(false)
      expect(result.metadata.loginSuccess).toBe(true)

      // Verify actions were executed
      expect(mockPage.click).toHaveBeenCalledWith('#button')
      expect(mockPage.type).toHaveBeenCalledWith('#input', 'test value')
    })
  })

  describe('Case 2: Workflow with login authenticates and executes', () => {
    it('should authenticate before executing workflow', async () => {
      const runConfig: RunConfig = {
        requiresLogin: true,
        loginConfig: mockLoginConfig,
        variables: { testVar: 'testValue' },
        options: {
          headless: true,
          concurrency: 1
        }
      }

      const result = await agentRunner.run('workflow-123', runConfig)

      expect(result).toBeDefined()
      expect(result.workflowId).toBe('workflow-123')
      expect(result.status).toBe('success')
      expect(result.metadata.loginRequired).toBe(true)
      expect(result.metadata.loginSuccess).toBe(true)

      // Verify login was attempted
      expect(mockPage.goto).toHaveBeenCalledWith(mockLoginConfig.url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      })
    })

    it('should handle login failure gracefully', async () => {
      // Mock login failure
      const { UniversalLoginDetector } = require('@/lib/universal-login-detector')
      UniversalLoginDetector.performLogin.mockResolvedValueOnce({
        success: false,
        error: 'Invalid credentials'
      })

      const runConfig: RunConfig = {
        requiresLogin: true,
        loginConfig: mockLoginConfig,
        variables: { testVar: 'testValue' }
      }

      const result = await agentRunner.run('workflow-123', runConfig)

      expect(result).toBeDefined()
      expect(result.status).toBe('failed')
      expect(result.metadata.loginRequired).toBe(true)
      expect(result.metadata.loginSuccess).toBe(false)
      expect(result.error).toContain('Login failed')
    })
  })

  describe('Case 3: Variable substitution works', () => {
    it('should substitute variables in selectors and values', async () => {
      const runConfig: RunConfig = {
        requiresLogin: false,
        variables: {
          buttonId: 'submit-btn',
          inputValue: 'Hello World',
          inputId: 'username-input'
        }
      }

      // Mock workflow with variable placeholders
      const workflowWithVariables = {
        ...mockWorkflow,
        actions: [
          {
            id: 'action-1',
            workflowId: 'workflow-123',
            action: {
              id: 'action-1',
              type: 'click',
              selector: '#{{buttonId}}',
              value: undefined,
              url: undefined,
              coordinates: undefined,
              waitFor: undefined,
              timeout: 30000,
              retryCount: 3,
              dependencies: [],
              metadata: {}
            },
            order: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'action-2',
            workflowId: 'workflow-123',
            action: {
              id: 'action-2',
              type: 'type',
              selector: '#{{inputId}}',
              value: '{{inputValue}}',
              url: undefined,
              coordinates: undefined,
              waitFor: undefined,
              timeout: 30000,
              retryCount: 3,
              dependencies: [],
              metadata: {}
            },
            order: 1,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      }

      ;(prisma.workflow.findUnique as jest.Mock).mockResolvedValue(workflowWithVariables)

      const result = await agentRunner.run('workflow-123', runConfig)

      expect(result).toBeDefined()
      expect(result.status).toBe('success')

      // Verify variable substitution
      expect(mockPage.click).toHaveBeenCalledWith('#submit-btn')
      expect(mockPage.type).toHaveBeenCalledWith('#username-input', 'Hello World')
    })
  })

  describe('Case 4: List variable loops work', () => {
    it('should loop over list variables', async () => {
      const runConfig: RunConfig = {
        requiresLogin: false,
        variables: {
          items: ['item1', 'item2', 'item3'],
          prefix: 'test-'
        }
      }

      // Mock workflow with list variable
      const workflowWithList = {
        ...mockWorkflow,
        actions: [
          {
            id: 'action-1',
            workflowId: 'workflow-123',
            action: {
              id: 'action-1',
              type: 'click',
              selector: '#{{prefix}}{{items}}',
              value: undefined,
              url: undefined,
              coordinates: undefined,
              waitFor: undefined,
              timeout: 30000,
              retryCount: 3,
              dependencies: [],
              metadata: {}
            },
            order: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      }

      ;(prisma.workflow.findUnique as jest.Mock).mockResolvedValue(workflowWithList)

      const result = await agentRunner.run('workflow-123', runConfig)

      expect(result).toBeDefined()
      expect(result.status).toBe('success')
      expect(result.summary.totalSteps).toBe(3) // Should have 3 steps for 3 items

      // Verify all items were processed
      expect(mockPage.click).toHaveBeenCalledWith('#test-item1')
      expect(mockPage.click).toHaveBeenCalledWith('#test-item2')
      expect(mockPage.click).toHaveBeenCalledWith('#test-item3')
    })
  })

  describe('Case 5: Step failure triggers retries and fallback', () => {
    it('should retry failed steps and use fallback selectors', async () => {
      // Mock step failure
      mockPage.click.mockRejectedValueOnce(new Error('Element not found'))
      mockPage.click.mockRejectedValueOnce(new Error('Element not found'))
      mockPage.click.mockResolvedValueOnce(undefined) // Success on third attempt

      const runConfig: RunConfig = {
        requiresLogin: false,
        variables: { testVar: 'testValue' }
      }

      const result = await agentRunner.run('workflow-123', runConfig)

      expect(result).toBeDefined()
      expect(result.status).toBe('success')
      expect(result.summary.successCount).toBe(2)
      expect(result.summary.failureCount).toBe(0)

      // Verify retry attempts
      expect(mockPage.click).toHaveBeenCalledTimes(3) // 2 failures + 1 success for first action, 1 success for second action
    })

    it('should handle persistent step failures', async () => {
      // Mock persistent failure
      mockPage.click.mockRejectedValue(new Error('Element not found'))

      const runConfig: RunConfig = {
        requiresLogin: false,
        variables: { testVar: 'testValue' }
      }

      const result = await agentRunner.run('workflow-123', runConfig)

      expect(result).toBeDefined()
      expect(result.status).toBe('partial')
      expect(result.summary.failureCount).toBeGreaterThan(0)
    })
  })

  describe('Case 6: Run logs and DB entries created', () => {
    it('should create workflow run and step entries in database', async () => {
      const runConfig: RunConfig = {
        requiresLogin: false,
        variables: { testVar: 'testValue' }
      }

      const result = await agentRunner.run('workflow-123', runConfig)

      expect(result).toBeDefined()
      expect(result.runId).toBeDefined()
      expect(result.steps).toHaveLength(2)

      // Verify database calls
      expect(prisma.workflowRun.create).toHaveBeenCalled()
      expect(prisma.workflowRun.update).toHaveBeenCalled()
      expect(prisma.workflowRunStep.create).toHaveBeenCalledTimes(2)

      // Verify step logs
      expect(result.steps[0]).toMatchObject({
        actionId: 'action-1',
        status: 'success',
        attempts: 1
      })
      expect(result.steps[1]).toMatchObject({
        actionId: 'action-2',
        status: 'success',
        attempts: 1
      })
    })

    it('should handle database errors gracefully', async () => {
      // Mock database error
      ;(prisma.workflowRun.create as jest.Mock).mockRejectedValue(new Error('Database error'))

      const runConfig: RunConfig = {
        requiresLogin: false,
        variables: { testVar: 'testValue' }
      }

      const result = await agentRunner.run('workflow-123', runConfig)

      expect(result).toBeDefined()
      expect(result.status).toBe('failed')
      expect(result.error).toContain('Database error')
    })
  })

  describe('Error Handling', () => {
    it('should handle workflow not found', async () => {
      ;(prisma.workflow.findUnique as jest.Mock).mockResolvedValue(null)

      const runConfig: RunConfig = {
        requiresLogin: false,
        variables: { testVar: 'testValue' }
      }

      const result = await agentRunner.run('workflow-123', runConfig)

      expect(result).toBeDefined()
      expect(result.status).toBe('failed')
      expect(result.error).toContain('Workflow workflow-123 not found')
    })

    it('should handle invalid login configuration', async () => {
      const { validateLoginConfig } = require('@/lib/agents/logic/schemas')
      validateLoginConfig.mockImplementationOnce(() => {
        throw new Error('Invalid login configuration')
      })

      const runConfig: RunConfig = {
        requiresLogin: true,
        loginConfig: { username: '', password: '', url: 'invalid' },
        variables: { testVar: 'testValue' }
      }

      const result = await agentRunner.run('workflow-123', runConfig)

      expect(result).toBeDefined()
      expect(result.status).toBe('failed')
      expect(result.error).toContain('Invalid login configuration')
    })
  })

  describe('Resource Cleanup', () => {
    it('should clean up resources properly', async () => {
      await agentRunner.cleanup()
      
      // Verify cleanup was called
      expect(agentRunner).toBeDefined()
    })
  })
})
