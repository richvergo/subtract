/**
 * Connection Health Check Utility
 * Validates API endpoints and their response schemas to ensure frontend-backend compatibility
 */

import { z, ZodSchema } from 'zod'

// Common response schemas
const BaseApiResponseSchema = z.object({
  success: z.boolean().optional(),
  error: z.string().optional(),
  message: z.string().optional()
})

// Agent Response Schema
const AgentResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  purposePrompt: z.string(),
  status: z.enum(['DRAFT', 'ACTIVE', 'REJECTED', 'INACTIVE']),
  processingStatus: z.string(),
  processingProgress: z.number().nullable(),
  agentConfig: z.any().nullable(),
  agentIntents: z.any().nullable(),
  recordingUrl: z.string().nullable(),
  ownerId: z.string(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
  logins: z.array(z.object({
    id: z.string(),
    name: z.string(),
    loginUrl: z.string()
  })),
  latestRuns: z.array(z.any()).optional()
})

// Workflow Validation Response Schema
const WorkflowValidationResponseSchema = z.object({
  success: z.boolean(),
  steps: z.array(z.object({
    id: z.string(),
    action: z.object({
      action: z.string(),
      selector: z.string().optional(),
      value: z.string().optional(),
      url: z.string().optional(),
      metadata: z.any().optional()
    }),
    metadata: z.any().optional(),
    order: z.number()
  })),
  validationLogs: z.array(z.object({
    id: z.string(),
    timestamp: z.number(),
    level: z.enum(['info', 'warn', 'error']),
    message: z.string(),
    actionId: z.string().nullable(),
    metadata: z.any().optional()
  }))
})

// Variables Response Schema
const VariablesResponseSchema = z.object({
  success: z.boolean(),
  variables: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().optional(),
    defaultValue: z.any().optional(),
    required: z.boolean(),
    workflowId: z.string(),
    createdAt: z.string().or(z.date()),
    updatedAt: z.string().or(z.date())
  }))
})

// Logic Generation Response Schema
const LogicGenerationResponseSchema = z.object({
  success: z.boolean(),
  logicSpec: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    version: z.string(),
    actions: z.array(z.any()),
    variables: z.array(z.any()),
    rules: z.array(z.any()).optional(),
    loops: z.array(z.any()).optional(),
    settings: z.object({
      timeout: z.number(),
      retryAttempts: z.number(),
      screenshotOnError: z.boolean(),
      debugMode: z.boolean(),
      parallelExecution: z.boolean()
    }),
    metadata: z.any().optional()
  }),
  metadata: z.any().optional()
})

// Run Response Schema
const RunResponseSchema = z.object({
  success: z.boolean(),
  runId: z.string(),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  startedAt: z.string().or(z.date()),
  workflowId: z.string(),
  variables: z.any().optional(),
  logs: z.any().optional(),
  metadata: z.any().optional()
})

// Schedule Response Schema
const ScheduleResponseSchema = z.object({
  success: z.boolean(),
  data: z.union([
    z.array(z.object({
      id: z.string(),
      workflowId: z.string(),
      name: z.string().optional(),
      cronExpression: z.string(),
      timezone: z.string(),
      isActive: z.boolean(),
      runConfig: z.any().optional(),
      variables: z.any().optional(),
      metadata: z.any().optional(),
      createdAt: z.string().or(z.date()),
      updatedAt: z.string().or(z.date()),
      nextRunAt: z.string().or(z.date()).optional(),
      lastRunAt: z.string().or(z.date()).optional()
    })),
    z.object({
      id: z.string(),
      workflowId: z.string(),
      name: z.string().optional(),
      cronExpression: z.string(),
      timezone: z.string(),
      isActive: z.boolean(),
      runConfig: z.any().optional(),
      variables: z.any().optional(),
      metadata: z.any().optional(),
      createdAt: z.string().or(z.date()),
      updatedAt: z.string().or(z.date()),
      nextRunAt: z.string().or(z.date()).optional(),
      lastRunAt: z.string().or(z.date()).optional()
    })
  ])
})

// API Endpoint Configuration
export interface ApiEndpointConfig {
  name: string
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  schema: ZodSchema
  testData?: any
  requiresAuth?: boolean
}

// Critical API endpoints to validate
export const CRITICAL_ENDPOINTS: ApiEndpointConfig[] = [
  {
    name: 'Agent Validation (WorkflowReplay)',
    path: '/api/agents/[id]/validate',
    method: 'GET',
    schema: WorkflowValidationResponseSchema,
    requiresAuth: true
  },
  {
    name: 'Agent Variables (VariableConfigModal)',
    path: '/api/agents/[id]/variables',
    method: 'GET',
    schema: VariablesResponseSchema,
    requiresAuth: true
  },
  {
    name: 'Logic Generation (LogicEditor)',
    path: '/api/agents/[id]/generate-logic',
    method: 'POST',
    schema: LogicGenerationResponseSchema,
    testData: {
      purposePrompt: 'Test workflow for connection validation',
      variables: []
    },
    requiresAuth: true
  },
  {
    name: 'Agent Run (RunConsole)',
    path: '/api/agents/[id]/run',
    method: 'POST',
    schema: RunResponseSchema,
    testData: {
      variables: {},
      settings: {
        timeout: 30000,
        retryAttempts: 3,
        screenshotOnError: true,
        debugMode: false
      }
    },
    requiresAuth: true
  },
  {
    name: 'Schedule Management (ScheduleEditor)',
    path: '/api/agents/[id]/schedule',
    method: 'GET',
    schema: ScheduleResponseSchema,
    requiresAuth: true
  }
]

// Connection check result
export interface ConnectionCheckResult {
  ok: boolean
  message: string
  endpoint: string
  statusCode?: number
  schemaErrors?: string[]
  networkError?: string
}

/**
 * Check API connection and validate response against schema
 */
export async function checkApiConnection(
  endpoint: string,
  schema: ZodSchema,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  testData?: any
): Promise<ConnectionCheckResult> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''
  const fullUrl = `${baseUrl}${endpoint}`

  try {
    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    }

    // Add body for POST/PUT requests
    if ((method === 'POST' || method === 'PUT') && testData) {
      requestOptions.body = JSON.stringify(testData)
    }

    // Make the API call
    const response = await fetch(fullUrl, requestOptions)
    
    // Check if response is ok
    if (!response.ok) {
      return {
        ok: false,
        message: `HTTP ${response.status}: ${response.statusText}`,
        endpoint,
        statusCode: response.status
      }
    }

    // Parse response
    let responseData: any
    try {
      responseData = await response.json()
    } catch (parseError) {
      return {
        ok: false,
        message: 'Invalid JSON response',
        endpoint,
        statusCode: response.status
      }
    }

    // Validate against schema
    try {
      schema.parse(responseData)
      return {
        ok: true,
        message: 'Schema validation passed',
        endpoint
      }
    } catch (schemaError) {
      if (schemaError instanceof z.ZodError) {
        const schemaErrors = schemaError.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        )
        return {
          ok: false,
          message: 'Schema validation failed',
          endpoint,
          schemaErrors
        }
      }
      return {
        ok: false,
        message: 'Schema validation error',
        endpoint
      }
    }

  } catch (networkError) {
    return {
      ok: false,
      message: 'Network error',
      endpoint,
      networkError: networkError instanceof Error ? networkError.message : 'Unknown network error'
    }
  }
}

/**
 * Check all critical endpoints
 */
export async function checkAllCriticalEndpoints(
  agentId: string = 'test-agent-id'
): Promise<ConnectionCheckResult[]> {
  const results: ConnectionCheckResult[] = []

  for (const endpoint of CRITICAL_ENDPOINTS) {
    // Replace [id] placeholder with actual agent ID
    const actualPath = endpoint.path.replace('[id]', agentId)
    
    try {
      const result = await checkApiConnection(
        actualPath,
        endpoint.schema,
        endpoint.method,
        endpoint.testData
      )
      
      results.push({
        ...result,
        message: `${endpoint.name}: ${result.message}`
      })
    } catch (error) {
      results.push({
        ok: false,
        message: `${endpoint.name}: Failed to check connection`,
        endpoint: actualPath,
        networkError: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return results
}

/**
 * Get connection health summary
 */
export function getConnectionHealthSummary(results: ConnectionCheckResult[]): {
  allHealthy: boolean
  healthyCount: number
  totalCount: number
  failedEndpoints: ConnectionCheckResult[]
  summaryMessage: string
} {
  const healthyResults = results.filter(r => r.ok)
  const failedResults = results.filter(r => !r.ok)
  const allHealthy = failedResults.length === 0

  let summaryMessage: string
  if (allHealthy) {
    summaryMessage = '✅ All systems operational'
  } else if (failedResults.length === 1) {
    summaryMessage = `❌ API error at ${failedResults[0].endpoint}`
  } else {
    summaryMessage = `❌ ${failedResults.length} API endpoints have issues`
  }

  return {
    allHealthy,
    healthyCount: healthyResults.length,
    totalCount: results.length,
    failedEndpoints: failedResults,
    summaryMessage
  }
}

/**
 * Retry failed connections with exponential backoff
 */
export async function retryFailedConnections(
  failedResults: ConnectionCheckResult[],
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<ConnectionCheckResult[]> {
  const retryResults: ConnectionCheckResult[] = []

  for (const failedResult of failedResults) {
    let lastResult = failedResult
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Wait with exponential backoff
      if (attempt > 1) {
        const delay = baseDelay * Math.pow(2, attempt - 2)
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      // Find the original endpoint config
      const endpointConfig = CRITICAL_ENDPOINTS.find(ep => 
        failedResult.endpoint.includes(ep.path.replace('[id]', ''))
      )

      if (!endpointConfig) {
        lastResult = {
          ...failedResult,
          message: `Retry failed: Endpoint config not found`
        }
        break
      }

      // Extract agent ID from the endpoint
      const agentIdMatch = failedResult.endpoint.match(/\/api\/agents\/([^\/]+)/)
      const agentId = agentIdMatch ? agentIdMatch[1] : 'test-agent-id'

      // Retry the connection
      const retryResult = await checkApiConnection(
        failedResult.endpoint,
        endpointConfig.schema,
        endpointConfig.method,
        endpointConfig.testData
      )

      lastResult = {
        ...retryResult,
        message: `${endpointConfig.name}: ${retryResult.message} (attempt ${attempt})`
      }

      if (retryResult.ok) {
        break
      }
    }

    retryResults.push(lastResult)
  }

  return retryResults
}

/**
 * Validate API contract consistency
 * This should be called during CI/CD to ensure schemas don't drift
 */
export async function validateApiContract(): Promise<{
  passed: boolean
  errors: string[]
  warnings: string[]
}> {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    // Check all critical endpoints
    const results = await checkAllCriticalEndpoints()
    
    // Check for any failures
    const failedResults = results.filter(r => !r.ok)
    
    if (failedResults.length > 0) {
      errors.push(`API contract validation failed for ${failedResults.length} endpoints:`)
      failedResults.forEach(result => {
        errors.push(`  - ${result.endpoint}: ${result.message}`)
        if (result.schemaErrors) {
          result.schemaErrors.forEach(error => {
            errors.push(`    - Schema error: ${error}`)
          })
        }
      })
    }

    // Check for warnings (e.g., deprecated endpoints, missing fields)
    results.forEach(result => {
      if (result.ok && result.statusCode && result.statusCode >= 400) {
        warnings.push(`Endpoint ${result.endpoint} returned status ${result.statusCode}`)
      }
    })

  } catch (error) {
    errors.push(`API contract validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings
  }
}
