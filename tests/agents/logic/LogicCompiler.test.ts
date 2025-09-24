/**
 * LogicCompiler Tests
 * Comprehensive test suite for natural language rule compilation
 */

import { LogicCompiler } from '@/lib/agents/logic/LogicCompiler'
import { VariableDef } from '@/lib/agents/logic/schemas'

describe('LogicCompiler', () => {
  let compiler: LogicCompiler
  let mockVariables: VariableDef[]

  beforeEach(() => {
    compiler = new LogicCompiler()
    mockVariables = [
      {
        name: 'result',
        type: 'string',
        description: 'Processing result',
        required: false,
        metadata: {}
      },
      {
        name: 'jobIds',
        type: 'array',
        description: 'List of job IDs',
        required: true,
        metadata: {}
      },
      {
        name: 'retryCount',
        type: 'number',
        description: 'Number of retry attempts',
        required: false,
        defaultValue: 0,
        metadata: {}
      }
    ]
  })

  describe('compile', () => {
    it('should compile valid natural language rules into LogicSpec', async () => {
      const nlRules = 'Skip processing if the result is empty. Retry failed operations up to 3 times.'
      
      const result = await compiler.compile(nlRules, mockVariables)
      
      expect(result.success).toBe(true)
      expect(result.spec).toBeDefined()
      expect(result.errors).toHaveLength(0)
      expect(result.metadata.rulesCount).toBeGreaterThan(0)
    })

    it('should handle empty natural language rules', async () => {
      const result = await compiler.compile('', mockVariables)
      
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Natural language rules cannot be empty')
    })

    it('should handle undefined natural language rules', async () => {
      const result = await compiler.compile(undefined as any, mockVariables)
      
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Natural language rules cannot be empty')
    })

    it('should generate warnings when no variables provided', async () => {
      const nlRules = 'Skip processing if the result is empty.'
      
      const result = await compiler.compile(nlRules, [])
      
      expect(result.success).toBe(true)
      expect(result.warnings).toContain('No variables provided - rules may not function correctly')
    })

    it('should include compilation metadata', async () => {
      const nlRules = 'Skip processing if the result is empty.'
      
      const result = await compiler.compile(nlRules, mockVariables)
      
      expect(result.metadata).toBeDefined()
      expect(result.metadata.compilationTime).toBeGreaterThan(0)
      expect(result.metadata.variablesCount).toBe(mockVariables.length)
    })
  })

  describe('validateSpec', () => {
    it('should validate a correct LogicSpec', () => {
      const validSpec = {
        id: 'test_spec',
        name: 'Test Logic',
        version: '1.0.0',
        actions: [],
        variables: mockVariables,
        rules: [
          {
            id: 'rule_1',
            name: 'Skip Empty',
            condition: {
              variable: 'result',
              operator: 'eq',
              value: ''
            },
            action: {
              type: 'skip_empty'
            },
            priority: 0,
            enabled: true
          }
        ],
        loops: [],
        settings: {
          timeout: 30000,
          retryAttempts: 3,
          screenshotOnError: true,
          debugMode: false,
          parallelExecution: false
        }
      }

      const result = compiler.validateSpec(validSpec)
      
      expect(result.success).toBe(true)
      expect(result.spec).toBeDefined()
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid LogicSpec with missing required fields', () => {
      const invalidSpec = {
        // Missing required fields
        actions: [],
        variables: []
      }

      const result = compiler.validateSpec(invalidSpec)
      
      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should validate business logic rules', () => {
      const specWithInvalidVariable = {
        id: 'test_spec',
        name: 'Test Logic',
        version: '1.0.0',
        actions: [],
        variables: mockVariables,
        rules: [
          {
            id: 'rule_1',
            name: 'Invalid Rule',
            condition: {
              variable: 'nonexistent_variable',
              operator: 'eq',
              value: ''
            },
            action: {
              type: 'skip_empty'
            },
            priority: 0,
            enabled: true
          }
        ],
        loops: [],
        settings: {
          timeout: 30000,
          retryAttempts: 3,
          screenshotOnError: true,
          debugMode: false,
          parallelExecution: false
        }
      }

      const result = compiler.validateSpec(specWithInvalidVariable)
      
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Rule "Invalid Rule" references undefined variable "nonexistent_variable"')
    })

    it('should validate loop variables are array type', () => {
      const specWithInvalidLoop = {
        id: 'test_spec',
        name: 'Test Logic',
        version: '1.0.0',
        actions: [],
        variables: mockVariables,
        rules: [],
        loops: [
          {
            id: 'loop_1',
            name: 'Invalid Loop',
            variable: 'result', // This is a string, not array
            iterator: 'current_item',
            actions: []
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

      const result = compiler.validateSpec(specWithInvalidLoop)
      
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Loop "Invalid Loop" variable "result" must be of type \'array\', got \'string\'')
    })

    it('should validate loop actions exist', () => {
      const specWithInvalidLoopActions = {
        id: 'test_spec',
        name: 'Test Logic',
        version: '1.0.0',
        actions: [],
        variables: mockVariables,
        rules: [],
        loops: [
          {
            id: 'loop_1',
            name: 'Invalid Loop',
            variable: 'jobIds',
            iterator: 'current_item',
            actions: ['nonexistent_action']
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

      const result = compiler.validateSpec(specWithInvalidLoopActions)
      
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Loop "Invalid Loop" references undefined action "nonexistent_action"')
    })
  })

  describe('getSupportedOperators', () => {
    it('should return all supported operators', () => {
      const operators = compiler.getSupportedOperators()
      
      expect(operators).toContain('eq')
      expect(operators).toContain('neq')
      expect(operators).toContain('gt')
      expect(operators).toContain('lt')
      expect(operators).toContain('gte')
      expect(operators).toContain('lte')
      expect(operators).toContain('in')
      expect(operators).toContain('not_in')
      expect(operators).toContain('contains')
      expect(operators).toContain('not_contains')
    })
  })

  describe('getSupportedActionTypes', () => {
    it('should return all supported action types', () => {
      const actionTypes = compiler.getSupportedActionTypes()
      
      expect(actionTypes).toContain('skip')
      expect(actionTypes).toContain('retry')
      expect(actionTypes).toContain('wait')
      expect(actionTypes).toContain('execute')
      expect(actionTypes).toContain('skip_empty')
    })
  })

  describe('createError', () => {
    it('should create structured error responses', () => {
      const error = compiler.createError('VALIDATION_ERROR', 'Invalid input', 'Missing required field')
      
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.message).toBe('Invalid input')
      expect(error.cause).toBe('Missing required field')
    })
  })

  describe('error handling', () => {
    it('should handle compilation errors gracefully', async () => {
      // Mock a scenario where LLM service fails
      const originalConsoleError = console.error
      console.error = jest.fn()
      
      const result = await compiler.compile('invalid rules', mockVariables)
      
      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      
      console.error = originalConsoleError
    })

    it('should handle validation errors with Zod', () => {
      const invalidSpec = {
        // Completely invalid structure
        invalidField: 'invalid'
      }

      const result = compiler.validateSpec(invalidSpec)
      
      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('integration scenarios', () => {
    it('should handle complex natural language rules', async () => {
      const complexRules = `
        Skip processing if the result is empty.
        Retry failed operations up to 3 times.
        Wait 5 seconds before retrying.
        For each item in the job list, execute the login action.
        Skip empty results and continue to next item.
      `
      
      const result = await compiler.compile(complexRules, mockVariables)
      
      expect(result.success).toBe(true)
      expect(result.spec).toBeDefined()
    })

    it('should handle rules with date math', async () => {
      const dateRules = 'Skip processing if the date is more than 30 days old.'
      
      const result = await compiler.compile(dateRules, mockVariables)
      
      expect(result.success).toBe(true)
      expect(result.spec).toBeDefined()
    })

    it('should handle conditional execution rules', async () => {
      const conditionalRules = 'Execute login action only if user is not already logged in.'
      
      const result = await compiler.compile(conditionalRules, mockVariables)
      
      expect(result.success).toBe(true)
      expect(result.spec).toBeDefined()
    })

    it('should handle retry policy rules', async () => {
      const retryRules = 'Retry failed operations with exponential backoff, maximum 5 attempts.'
      
      const result = await compiler.compile(retryRules, mockVariables)
      
      expect(result.success).toBe(true)
      expect(result.spec).toBeDefined()
    })
  })
})
