/**
 * AgentRunner Logic Tests
 * Comprehensive test suite for LogicSpec consumption in AgentRunner
 */

import { AgentRunner, RunConfig } from '@/lib/agents/exec/AgentRunner'
import { LogicSpec, Rule, Loop } from '@/lib/agents/logic/schemas'
import { Browser, Page } from 'puppeteer'

// Mock puppeteer
jest.mock('puppeteer', () => ({
  Browser: jest.fn(),
  Page: jest.fn()
}))

// Mock prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    workflow: {
      findUnique: jest.fn(),
      findFirst: jest.fn()
    },
    workflowRun: {
      create: jest.fn(),
      update: jest.fn()
    },
    workflowRunStep: {
      create: jest.fn()
    }
  }
}))

describe('AgentRunner Logic Consumption', () => {
  let agentRunner: AgentRunner
  let mockBrowser: jest.Mocked<Browser>
  let mockPage: jest.Mocked<Page>

  beforeEach(() => {
    agentRunner = new AgentRunner()
    
    mockBrowser = {
      version: jest.fn().mockResolvedValue('Chrome/91.0.4472.124'),
      close: jest.fn()
    } as any
    
    mockPage = {
      click: jest.fn(),
      type: jest.fn(),
      select: jest.fn(),
      goto: jest.fn(),
      hover: jest.fn(),
      screenshot: jest.fn(),
      evaluate: jest.fn().mockResolvedValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
      waitForTimeout: jest.fn(),
      waitForLoadState: jest.fn()
    } as any

    agentRunner.initialize(mockBrowser, mockPage)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Rule Evaluation', () => {
    it('should skip step when skip rule condition is true', async () => {
      const logicSpec: LogicSpec = {
        id: 'test_spec',
        name: 'Test Logic',
        version: '1.0.0',
        actions: [],
        variables: [],
        rules: [
          {
            id: 'skip_rule',
            name: 'Skip Empty Results',
            condition: {
              variable: 'result',
              operator: 'eq',
              value: ''
            },
            action: {
              type: 'skip'
            },
            priority: 1,
            enabled: true
          }
        ],
        settings: {
          timeout: 30000,
          retryAttempts: 3,
          screenshotOnError: true,
          debugMode: false,
          parallelExecution: false
        }
      }

      const runConfig: RunConfig = {
        requiresLogin: false,
        variables: { result: '' },
        logicSpec
      }

      // Mock workflow data
      const { prisma } = require('@/lib/db')
      prisma.workflow.findUnique.mockResolvedValue({
        id: 'test_workflow',
        name: 'Test Workflow',
        logicSpec,
        actions: [
          {
            id: 'action_1',
            action: {
              id: 'action_1',
              type: 'click',
              selector: 'button',
              value: 'test'
            },
            order: 1
          }
        ]
      })

      prisma.workflowRun.create.mockResolvedValue({
        id: 'test_run',
        workflowId: 'test_workflow'
      })

      const result = await agentRunner.run('test_workflow', runConfig)

      expect(result.status).toBe('success')
      expect(result.steps).toHaveLength(1)
      expect(result.steps[0].status).toBe('skipped')
      expect(result.summary.skippedCount).toBe(1)
    })

    it('should retry step when retry rule condition is true', async () => {
      const logicSpec: LogicSpec = {
        id: 'test_spec',
        name: 'Test Logic',
        version: '1.0.0',
        actions: [],
        variables: [],
        rules: [
          {
            id: 'retry_rule',
            name: 'Retry on Failure',
            condition: {
              variable: 'retryCount',
              operator: 'lt',
              value: 3
            },
            action: {
              type: 'retry'
            },
            priority: 1,
            enabled: true
          }
        ],
        settings: {
          timeout: 30000,
          retryAttempts: 3,
          screenshotOnError: true,
          debugMode: false,
          parallelExecution: false
        }
      }

      const runConfig: RunConfig = {
        requiresLogin: false,
        variables: { retryCount: 1 },
        logicSpec
      }

      // Mock workflow data
      const { prisma } = require('@/lib/db')
      prisma.workflow.findUnique.mockResolvedValue({
        id: 'test_workflow',
        name: 'Test Workflow',
        logicSpec,
        actions: [
          {
            id: 'action_1',
            action: {
              id: 'action_1',
              type: 'click',
              selector: 'button',
              value: 'test'
            },
            order: 1
          }
        ]
      })

      prisma.workflowRun.create.mockResolvedValue({
        id: 'test_run',
        workflowId: 'test_workflow'
      })

      const result = await agentRunner.run('test_workflow', runConfig)

      expect(result.status).toBe('success')
      expect(result.steps).toHaveLength(1)
      expect(result.steps[0].metadata.ruleResults).toBeDefined()
    })

    it('should wait when wait rule condition is true', async () => {
      const logicSpec: LogicSpec = {
        id: 'test_spec',
        name: 'Test Logic',
        version: '1.0.0',
        actions: [],
        variables: [],
        rules: [
          {
            id: 'wait_rule',
            name: 'Wait Before Action',
            condition: {
              variable: 'waitRequired',
              operator: 'eq',
              value: true
            },
            action: {
              type: 'wait',
              value: 1000
            },
            priority: 1,
            enabled: true
          }
        ],
        settings: {
          timeout: 30000,
          retryAttempts: 3,
          screenshotOnError: true,
          debugMode: false,
          parallelExecution: false
        }
      }

      const runConfig: RunConfig = {
        requiresLogin: false,
        variables: { waitRequired: true },
        logicSpec
      }

      // Mock workflow data
      const { prisma } = require('@/lib/db')
      prisma.workflow.findUnique.mockResolvedValue({
        id: 'test_workflow',
        name: 'Test Workflow',
        logicSpec,
        actions: [
          {
            id: 'action_1',
            action: {
              id: 'action_1',
              type: 'click',
              selector: 'button',
              value: 'test'
            },
            order: 1
          }
        ]
      })

      prisma.workflowRun.create.mockResolvedValue({
        id: 'test_run',
        workflowId: 'test_workflow'
      })

      const result = await agentRunner.run('test_workflow', runConfig)

      expect(result.status).toBe('success')
      expect(result.steps).toHaveLength(1)
      expect(result.steps[0].metadata.ruleResults).toBeDefined()
    })
  })

  describe('Loop Execution', () => {
    it('should execute loop with multiple iterations', async () => {
      const logicSpec: LogicSpec = {
        id: 'test_spec',
        name: 'Test Logic',
        version: '1.0.0',
        actions: [],
        variables: [],
        loops: [
          {
            id: 'job_loop',
            name: 'Process Jobs',
            variable: 'jobIds',
            iterator: 'currentJob',
            actions: ['action_1'],
            maxIterations: 10
          }
        ],
        settings: {
          timeout: 30000,
          retryAttempts: 3,
          screenshotOnError: true,
          debugMode: false,
          parallelExecution: false
        }
      }

      const runConfig: RunConfig = {
        requiresLogin: false,
        variables: { 
          jobIds: ['job1', 'job2', 'job3'],
          currentJob: null
        },
        logicSpec
      }

      // Mock workflow data
      const { prisma } = require('@/lib/db')
      prisma.workflow.findUnique.mockResolvedValue({
        id: 'test_workflow',
        name: 'Test Workflow',
        logicSpec,
        actions: [
          {
            id: 'action_1',
            action: {
              id: 'action_1',
              type: 'click',
              selector: 'button',
              value: 'test'
            },
            order: 1
          }
        ]
      })

      prisma.workflowRun.create.mockResolvedValue({
        id: 'test_run',
        workflowId: 'test_workflow'
      })

      prisma.workflowRunStep.create.mockResolvedValue({})

      const result = await agentRunner.run('test_workflow', runConfig)

      expect(result.status).toBe('success')
      expect(result.steps).toHaveLength(3) // 3 iterations
      expect(result.summary.successCount).toBe(3)
    })

    it('should handle loop break condition', async () => {
      const logicSpec: LogicSpec = {
        id: 'test_spec',
        name: 'Test Logic',
        version: '1.0.0',
        actions: [],
        variables: [],
        loops: [
          {
            id: 'conditional_loop',
            name: 'Conditional Loop',
            variable: 'items',
            iterator: 'currentItem',
            actions: ['action_1'],
            breakCondition: {
              variable: 'shouldBreak',
              operator: 'eq',
              value: true
            }
          }
        ],
        settings: {
          timeout: 30000,
          retryAttempts: 3,
          screenshotOnError: true,
          debugMode: false,
          parallelExecution: false
        }
      }

      const runConfig: RunConfig = {
        requiresLogin: false,
        variables: { 
          items: ['item1', 'item2', 'item3'],
          currentItem: null,
          shouldBreak: false
        },
        logicSpec
      }

      // Mock workflow data
      const { prisma } = require('@/lib/db')
      prisma.workflow.findUnique.mockResolvedValue({
        id: 'test_workflow',
        name: 'Test Workflow',
        logicSpec,
        actions: [
          {
            id: 'action_1',
            action: {
              id: 'action_1',
              type: 'click',
              selector: 'button',
              value: 'test'
            },
            order: 1
          }
        ]
      })

      prisma.workflowRun.create.mockResolvedValue({
        id: 'test_run',
        workflowId: 'test_workflow'
      })

      prisma.workflowRunStep.create.mockResolvedValue({})

      const result = await agentRunner.run('test_workflow', runConfig)

      expect(result.status).toBe('success')
      expect(result.steps).toHaveLength(3) // All iterations should complete
    })
  })

  describe('Condition Evaluation', () => {
    it('should evaluate eq operator correctly', () => {
      const agentRunner = new AgentRunner()
      const condition = { variable: 'test', operator: 'eq', value: 'value' }
      const variables = { test: 'value' }
      
      const result = (agentRunner as any).evaluateCondition(condition, variables)
      expect(result).toBe(true)
    })

    it('should evaluate neq operator correctly', () => {
      const agentRunner = new AgentRunner()
      const condition = { variable: 'test', operator: 'neq', value: 'other' }
      const variables = { test: 'value' }
      
      const result = (agentRunner as any).evaluateCondition(condition, variables)
      expect(result).toBe(true)
    })

    it('should evaluate gt operator correctly', () => {
      const agentRunner = new AgentRunner()
      const condition = { variable: 'count', operator: 'gt', value: 5 }
      const variables = { count: 10 }
      
      const result = (agentRunner as any).evaluateCondition(condition, variables)
      expect(result).toBe(true)
    })

    it('should evaluate contains operator correctly', () => {
      const agentRunner = new AgentRunner()
      const condition = { variable: 'text', operator: 'contains', value: 'test' }
      const variables = { text: 'this is a test' }
      
      const result = (agentRunner as any).evaluateCondition(condition, variables)
      expect(result).toBe(true)
    })

    it('should handle undefined variables gracefully', () => {
      const agentRunner = new AgentRunner()
      const condition = { variable: 'undefined', operator: 'eq', value: 'value' }
      const variables = { other: 'value' }
      
      const result = (agentRunner as any).evaluateCondition(condition, variables)
      expect(result).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid rule operator gracefully', () => {
      const agentRunner = new AgentRunner()
      const condition = { variable: 'test', operator: 'invalid', value: 'value' }
      const variables = { test: 'value' }
      
      const result = (agentRunner as any).evaluateCondition(condition, variables)
      expect(result).toBe(false)
    })

    it('should handle invalid LogicSpec gracefully', async () => {
      const runConfig: RunConfig = {
        requiresLogin: false,
        variables: {},
        logicSpec: {
          id: 'invalid_spec',
          name: 'Invalid Spec',
          version: '1.0.0',
          actions: [],
          variables: [],
          rules: [
            {
              id: 'invalid_rule',
              name: 'Invalid Rule',
              condition: {
                variable: 'nonexistent',
                operator: 'eq',
                value: 'value'
              },
              action: {
                type: 'skip'
              },
              priority: 1,
              enabled: true
            }
          ],
          settings: {
            timeout: 30000,
            retryAttempts: 3,
            screenshotOnError: true,
            debugMode: false,
            parallelExecution: false
          }
        }
      }

      // Mock workflow data
      const { prisma } = require('@/lib/db')
      prisma.workflow.findUnique.mockResolvedValue({
        id: 'test_workflow',
        name: 'Test Workflow',
        logicSpec: runConfig.logicSpec,
        actions: []
      })

      prisma.workflowRun.create.mockResolvedValue({
        id: 'test_run',
        workflowId: 'test_workflow'
      })

      const result = await agentRunner.run('test_workflow', runConfig)

      expect(result.status).toBe('success')
      expect(result.steps).toHaveLength(0)
    })
  })

  describe('End-to-End Integration', () => {
    it('should execute complete workflow with rules and loops', async () => {
      const logicSpec: LogicSpec = {
        id: 'integration_spec',
        name: 'Integration Test',
        version: '1.0.0',
        actions: [],
        variables: [],
        rules: [
          {
            id: 'skip_empty_rule',
            name: 'Skip Empty Results',
            condition: {
              variable: 'result',
              operator: 'eq',
              value: ''
            },
            action: {
              type: 'skip_empty'
            },
            priority: 1,
            enabled: true
          }
        ],
        loops: [
          {
            id: 'process_items',
            name: 'Process Items',
            variable: 'items',
            iterator: 'currentItem',
            actions: ['action_1']
          }
        ],
        settings: {
          timeout: 30000,
          retryAttempts: 3,
          screenshotOnError: true,
          debugMode: false,
          parallelExecution: false
        }
      }

      const runConfig: RunConfig = {
        requiresLogin: false,
        variables: { 
          items: ['item1', 'item2'],
          result: 'not_empty'
        },
        logicSpec
      }

      // Mock workflow data
      const { prisma } = require('@/lib/db')
      prisma.workflow.findUnique.mockResolvedValue({
        id: 'test_workflow',
        name: 'Test Workflow',
        logicSpec,
        actions: [
          {
            id: 'action_1',
            action: {
              id: 'action_1',
              type: 'click',
              selector: 'button',
              value: 'test'
            },
            order: 1
          }
        ]
      })

      prisma.workflowRun.create.mockResolvedValue({
        id: 'test_run',
        workflowId: 'test_workflow'
      })

      prisma.workflowRunStep.create.mockResolvedValue({})

      const result = await agentRunner.run('test_workflow', runConfig)

      expect(result.status).toBe('success')
      expect(result.steps).toHaveLength(2) // 2 loop iterations
      expect(result.summary.successCount).toBe(2)
      expect(result.metadata.evaluatedRules).toBeDefined()
      expect(result.metadata.loopContexts).toBeDefined()
    })
  })

  describe('Backward Compatibility', () => {
    it('should execute workflow without LogicSpec', async () => {
      const runConfig: RunConfig = {
        requiresLogin: false,
        variables: {}
      }

      // Mock workflow data without LogicSpec
      const { prisma } = require('@/lib/db')
      prisma.workflow.findUnique.mockResolvedValue({
        id: 'test_workflow',
        name: 'Test Workflow',
        logicSpec: null,
        actions: [
          {
            id: 'action_1',
            action: {
              id: 'action_1',
              type: 'click',
              selector: 'button',
              value: 'test'
            },
            order: 1
          }
        ]
      })

      prisma.workflowRun.create.mockResolvedValue({
        id: 'test_run',
        workflowId: 'test_workflow'
      })

      const result = await agentRunner.run('test_workflow', runConfig)

      expect(result.status).toBe('success')
      expect(result.steps).toHaveLength(1)
      expect(result.summary.successCount).toBe(1)
    })
  })
})
