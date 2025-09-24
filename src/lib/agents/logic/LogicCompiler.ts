/**
 * LogicCompiler
 * Translates natural language rules into structured, validated JSON specs
 */

import { z } from 'zod'
import { LogicSpec, VariableDef, validateLogicSpec } from './schemas'
// import { llmService } from '@/lib/llm-service' // Unused

export interface CompilationResult {
  success: boolean
  spec?: LogicSpec
  errors: string[]
  warnings: string[]
  metadata: {
    compilationTime: number
    rulesCount: number
    loopsCount: number
    variablesCount: number
  }
}

export interface CompilationError {
  code: string
  message: string
  cause?: string
}

export class LogicCompiler {
  constructor() {}

  /**
   * Compile natural language rules into structured LogicSpec
   */
  async compile(nlRules: string, variables: VariableDef[]): Promise<CompilationResult> {
    const startTime = Date.now()
    const result: CompilationResult = {
      success: false,
      errors: [],
      warnings: [],
      metadata: {
        compilationTime: 0,
        rulesCount: 0,
        loopsCount: 0,
        variablesCount: variables.length
      }
    }

    try {
      console.log('🔧 Compiling natural language rules...')
      
      // Validate input
      if (!nlRules || nlRules.trim().length === 0) {
        result.errors.push('Natural language rules cannot be empty')
        return result
      }

      if (!variables || variables.length === 0) {
        result.warnings.push('No variables provided - rules may not function correctly')
      }

      // Generate structured JSON using LLM
      const structuredJson = await this.generateStructuredJson(nlRules, variables)
      
      // Validate the generated spec
      const validationResult = this.validateSpec(structuredJson)
      
      if (!validationResult.success) {
        result.errors.push(...validationResult.errors)
        return result
      }

      result.spec = validationResult.spec
      result.success = true
      result.metadata.compilationTime = Date.now() - startTime
      result.metadata.rulesCount = validationResult.spec.rules?.length || 0
      result.metadata.loopsCount = validationResult.spec.loops?.length || 0
      
      console.log('✅ Natural language compilation completed successfully')
      
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown compilation error')
      result.metadata.compilationTime = Date.now() - startTime
      
      console.error('❌ Natural language compilation failed:', error)
    }

    return result
  }

  /**
   * Validate a LogicSpec with runtime validation using Zod
   */
  validateSpec(spec: unknown): { success: boolean; spec?: LogicSpec; errors: string[] } {
    const errors: string[] = []

    try {
      // Parse and validate with Zod
      const validatedSpec = validateLogicSpec(spec)
      
      // Additional business logic validation
      const businessValidation = this.validateBusinessLogic(validatedSpec)
      if (!businessValidation.success) {
        errors.push(...businessValidation.errors)
      }

      return {
        success: errors.length === 0,
        spec: errors.length === 0 ? validatedSpec : undefined,
        errors
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(e => `${e.path.join('.')}: ${e.message}`))
      } else {
        errors.push(error instanceof Error ? error.message : 'Unknown validation error')
      }
      
      return {
        success: false,
        errors
      }
    }
  }

  /**
   * Generate structured JSON from natural language using LLM
   */
  private async generateStructuredJson(nlRules: string, variables: VariableDef[]): Promise<any> {
    const prompt = this.buildCompilationPrompt(nlRules, variables)
    
    try {
      // Use the existing LLM service to generate structured JSON
      const response = await this.callLLMService(prompt)
      return JSON.parse(response)
    } catch (error) {
      throw new Error(`LLM compilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Build compilation prompt for LLM
   */
  private buildCompilationPrompt(nlRules: string, variables: VariableDef[]): string {
    const variableNames = variables.map(v => v.name).join(', ')
    
    return `You are a logic compiler that translates natural language rules into structured JSON.

INPUT:
Natural Language Rules: "${nlRules}"
Available Variables: [${variableNames}]

TASK:
Convert the natural language rules into a structured LogicSpec JSON with the following format:

{
  "id": "generated_id",
  "name": "Generated Logic",
  "description": "Brief description of the logic",
  "version": "1.0.0",
  "actions": [],
  "variables": [],
  "rules": [
    {
      "id": "rule_1",
      "name": "Rule Name",
      "description": "What this rule does",
      "condition": {
        "variable": "variable_name",
        "operator": "eq|neq|gt|lt|gte|lte|in|not_in|contains|not_contains",
        "value": "comparison_value"
      },
      "action": {
        "type": "skip|retry|wait|execute|skip_empty",
        "value": "action_value_if_needed"
      },
      "priority": 0,
      "enabled": true
    }
  ],
  "loops": [
    {
      "id": "loop_1",
      "name": "Loop Name",
      "description": "What this loop does",
      "variable": "list_variable_name",
      "iterator": "current_item",
      "actions": ["action_id_1", "action_id_2"],
      "maxIterations": 100
    }
  ],
  "settings": {
    "timeout": 30000,
    "retryAttempts": 3,
    "screenshotOnError": true,
    "debugMode": false,
    "parallelExecution": false
  }
}

RULES:
1. Only reference variables that exist in the available variables list
2. Use supported operators: eq, neq, gt, lt, gte, lte, in, not_in, contains, not_contains
3. For loops, the variable must be of type 'array'
4. Generate meaningful rule and loop names
5. Set appropriate priorities (higher numbers = higher priority)
6. Include realistic timeout and retry settings

OUTPUT:
Return only the valid JSON, no additional text or formatting.`
  }

  /**
   * Call LLM service with the compilation prompt
   */
  private async callLLMService(_prompt: string): Promise<string> {
    // For now, we'll use a mock implementation since the existing LLM service
    // is focused on workflow analysis. In a real implementation, this would
    // call the LLM service with the compilation prompt.
    
    // Mock implementation that demonstrates the expected behavior
    return JSON.stringify({
      id: `logic_${Date.now()}`,
      name: "Compiled Logic",
      description: "Logic compiled from natural language rules",
      version: "1.0.0",
      actions: [],
      variables: [],
      rules: [
        {
          id: "rule_1",
          name: "Skip Empty Results",
          description: "Skip processing if result is empty",
          condition: {
            variable: "result",
            operator: "eq",
            value: ""
          },
          action: {
            type: "skip_empty"
          },
          priority: 1,
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
    })
  }

  /**
   * Validate business logic rules
   */
  private validateBusinessLogic(spec: LogicSpec): { success: boolean; errors: string[] } {
    const errors: string[] = []

    // Validate that all variable references in rules exist
    if (spec.rules) {
      for (const rule of spec.rules) {
        const variableExists = spec.variables.some(v => v.name === rule.condition.variable)
        if (!variableExists) {
          errors.push(`Rule "${rule.name}" references undefined variable "${rule.condition.variable}"`)
        }
      }
    }

    // Validate that loops reference list-typed variables
    if (spec.loops) {
      for (const loop of spec.loops) {
        const variable = spec.variables.find(v => v.name === loop.variable)
        if (!variable) {
          errors.push(`Loop "${loop.name}" references undefined variable "${loop.variable}"`)
        } else if (variable.type !== 'array') {
          errors.push(`Loop "${loop.name}" variable "${loop.variable}" must be of type 'array', got '${variable.type}'`)
        }
      }
    }

    // Validate that loop actions exist
    if (spec.loops) {
      for (const loop of spec.loops) {
        for (const actionId of loop.actions) {
          const actionExists = spec.actions.some(a => a.id === actionId)
          if (!actionExists) {
            errors.push(`Loop "${loop.name}" references undefined action "${actionId}"`)
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      errors
    }
  }

  /**
   * Create structured error response
   */
  createError(code: string, message: string, cause?: string): CompilationError {
    return {
      code,
      message,
      cause
    }
  }

  /**
   * Get supported operators
   */
  getSupportedOperators(): string[] {
    return ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'in', 'not_in', 'contains', 'not_contains']
  }

  /**
   * Get supported action types
   */
  getSupportedActionTypes(): string[] {
    return ['skip', 'retry', 'wait', 'execute', 'skip_empty']
  }
}



