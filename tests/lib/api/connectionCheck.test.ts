/**
 * Connection Check Utility Tests
 * Test suite for API connection validation functions
 */

import { 
  checkApiConnection,
  checkAllCriticalEndpoints,
  getConnectionHealthSummary,
  retryFailedConnections,
  validateApiContract,
  CRITICAL_ENDPOINTS
} from '@/lib/api/connectionCheck'
import { z } from 'zod'

// Mock fetch globally
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error
beforeAll(() => {
  console.error = jest.fn()
})

afterAll(() => {
  console.error = originalConsoleError
})

describe('Connection Check Utility', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('checkApiConnection', () => {
    const testSchema = z.object({
      success: z.boolean(),
      data: z.string()
    })

    test('should return success for valid API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test' })
      } as Response)

      const result = await checkApiConnection('/api/test', testSchema)

      expect(result.ok).toBe(true)
      expect(result.message).toBe('Schema validation passed')
      expect(result.endpoint).toBe('/api/test')
      expect(result.schemaErrors).toBeUndefined()
      expect(result.networkError).toBeUndefined()
    })

    test('should return error for HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response)

      const result = await checkApiConnection('/api/test', testSchema)

      expect(result.ok).toBe(false)
      expect(result.message).toBe('HTTP 500: Internal Server Error')
      expect(result.statusCode).toBe(500)
    })

    test('should return error for invalid JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON')
        }
      } as Response)

      const result = await checkApiConnection('/api/test', testSchema)

      expect(result.ok).toBe(false)
      expect(result.message).toBe('Invalid JSON response')
      expect(result.statusCode).toBe(200)
    })

    test('should return error for schema validation failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, invalidField: 'test' })
      } as Response)

      const result = await checkApiConnection('/api/test', testSchema)

      expect(result.ok).toBe(false)
      expect(result.message).toBe('Schema validation failed')
      expect(result.schemaErrors).toContain('data: Required')
    })

    test('should return error for network failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await checkApiConnection('/api/test', testSchema)

      expect(result.ok).toBe(false)
      expect(result.message).toBe('Network error')
      expect(result.networkError).toBe('Network error')
    })

    test('should handle POST requests with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test' })
      } as Response)

      const result = await checkApiConnection('/api/test', testSchema, 'POST', { test: 'data' })

      expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ test: 'data' })
      }))
    })

    test('should use environment API base URL', async () => {
      const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL
      process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.com'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test' })
      } as Response)

      await checkApiConnection('/api/test', testSchema)

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/test', expect.any(Object))

      process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv
    })
  })

  describe('checkAllCriticalEndpoints', () => {
    test('should check all critical endpoints', async () => {
      const mockResults = CRITICAL_ENDPOINTS.map(endpoint => ({
        ok: true,
        message: `${endpoint.name}: Schema validation passed`,
        endpoint: endpoint.path.replace('[id]', 'test-agent-id')
      }))

      // Mock all endpoints to return success
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] })
      } as Response)

      const results = await checkAllCriticalEndpoints('test-agent-id')

      expect(results).toHaveLength(CRITICAL_ENDPOINTS.length)
      expect(results.every(r => r.ok)).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(CRITICAL_ENDPOINTS.length)
    })

    test('should handle mixed success and failure results', async () => {
      // Mock some endpoints to succeed and others to fail
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, steps: [], validationLogs: [] })
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, logicSpec: {} })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, runId: 'test' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [] })
        } as Response)

      const results = await checkAllCriticalEndpoints('test-agent-id')

      expect(results).toHaveLength(5)
      const successCount = results.filter(r => r.ok).length
      const failureCount = results.filter(r => !r.ok).length
      expect(successCount).toBeGreaterThan(0)
      expect(failureCount).toBeGreaterThan(0)
    })

    test('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const results = await checkAllCriticalEndpoints('test-agent-id')

      expect(results).toHaveLength(CRITICAL_ENDPOINTS.length)
      expect(results.every(r => !r.ok)).toBe(true)
      expect(results.every(r => r.networkError === 'Network error')).toBe(true)
    })
  })

  describe('getConnectionHealthSummary', () => {
    test('should return healthy summary for all successful results', () => {
      const results = [
        { ok: true, message: 'Success 1', endpoint: '/api/test1' },
        { ok: true, message: 'Success 2', endpoint: '/api/test2' },
        { ok: true, message: 'Success 3', endpoint: '/api/test3' }
      ]

      const summary = getConnectionHealthSummary(results)

      expect(summary.allHealthy).toBe(true)
      expect(summary.healthyCount).toBe(3)
      expect(summary.totalCount).toBe(3)
      expect(summary.failedEndpoints).toHaveLength(0)
      expect(summary.summaryMessage).toBe('✅ All systems operational')
    })

    test('should return error summary for single failure', () => {
      const results = [
        { ok: true, message: 'Success 1', endpoint: '/api/test1' },
        { ok: false, message: 'Failed', endpoint: '/api/test2' },
        { ok: true, message: 'Success 3', endpoint: '/api/test3' }
      ]

      const summary = getConnectionHealthSummary(results)

      expect(summary.allHealthy).toBe(false)
      expect(summary.healthyCount).toBe(2)
      expect(summary.totalCount).toBe(3)
      expect(summary.failedEndpoints).toHaveLength(1)
      expect(summary.summaryMessage).toBe('❌ API error at /api/test2')
    })

    test('should return error summary for multiple failures', () => {
      const results = [
        { ok: false, message: 'Failed 1', endpoint: '/api/test1' },
        { ok: false, message: 'Failed 2', endpoint: '/api/test2' },
        { ok: true, message: 'Success 3', endpoint: '/api/test3' }
      ]

      const summary = getConnectionHealthSummary(results)

      expect(summary.allHealthy).toBe(false)
      expect(summary.healthyCount).toBe(1)
      expect(summary.totalCount).toBe(3)
      expect(summary.failedEndpoints).toHaveLength(2)
      expect(summary.summaryMessage).toBe('❌ 2 API endpoints have issues')
    })

    test('should return error summary for all failures', () => {
      const results = [
        { ok: false, message: 'Failed 1', endpoint: '/api/test1' },
        { ok: false, message: 'Failed 2', endpoint: '/api/test2' },
        { ok: false, message: 'Failed 3', endpoint: '/api/test3' }
      ]

      const summary = getConnectionHealthSummary(results)

      expect(summary.allHealthy).toBe(false)
      expect(summary.healthyCount).toBe(0)
      expect(summary.totalCount).toBe(3)
      expect(summary.failedEndpoints).toHaveLength(3)
      expect(summary.summaryMessage).toBe('❌ 3 API endpoints have issues')
    })
  })

  describe('retryFailedConnections', () => {
    test('should retry failed connections with exponential backoff', async () => {
      const failedResults = [
        {
          ok: false,
          message: 'Network error',
          endpoint: '/api/agents/test-id/validate'
        }
      ]

      // Mock successful retry
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, steps: [], validationLogs: [] })
      } as Response)

      const retryResults = await retryFailedConnections(failedResults, 2, 100)

      expect(retryResults).toHaveLength(1)
      expect(retryResults[0].ok).toBe(true)
      expect(mockFetch).toHaveBeenCalled()
    })

    test('should handle retry failures gracefully', async () => {
      const failedResults = [
        {
          ok: false,
          message: 'Network error',
          endpoint: '/api/agents/test-id/validate'
        }
      ]

      // Mock persistent failure
      mockFetch.mockRejectedValue(new Error('Persistent network error'))

      const retryResults = await retryFailedConnections(failedResults, 2, 10)

      expect(retryResults).toHaveLength(1)
      expect(retryResults[0].ok).toBe(false)
      expect(retryResults[0].networkError).toBe('Persistent network error')
    })

    test('should respect max retry attempts', async () => {
      const failedResults = [
        {
          ok: false,
          message: 'Network error',
          endpoint: '/api/agents/test-id/validate'
        }
      ]

      // Mock persistent failure
      mockFetch.mockRejectedValue(new Error('Persistent network error'))

      const startTime = Date.now()
      const retryResults = await retryFailedConnections(failedResults, 3, 50)
      const endTime = Date.now()

      expect(retryResults).toHaveLength(1)
      expect(retryResults[0].ok).toBe(false)
      
      // Should have retried 3 times with exponential backoff
      expect(endTime - startTime).toBeGreaterThan(50 + 100 + 200) // 0ms, 50ms, 100ms delays
    })
  })

  describe('validateApiContract', () => {
    test('should return success when all endpoints pass', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] })
      } as Response)

      const result = await validateApiContract()

      expect(result.passed).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    test('should return errors when endpoints fail', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, steps: [], validationLogs: [] })
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        } as Response)

      const result = await validateApiContract()

      expect(result.passed).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(error => error.includes('API contract validation failed'))).toBe(true)
    })

    test('should handle validation errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await validateApiContract()

      expect(result.passed).toBe(false)
      expect(result.errors).toContain('API contract validation failed: Network error')
    })
  })

  describe('Critical Endpoints Configuration', () => {
    test('should have all required critical endpoints', () => {
      const endpointNames = CRITICAL_ENDPOINTS.map(ep => ep.name)
      
      expect(endpointNames).toContain('Agent Validation (WorkflowReplay)')
      expect(endpointNames).toContain('Agent Variables (VariableConfigModal)')
      expect(endpointNames).toContain('Logic Generation (LogicEditor)')
      expect(endpointNames).toContain('Agent Run (RunConsole)')
      expect(endpointNames).toContain('Schedule Management (ScheduleEditor)')
    })

    test('should have valid endpoint paths', () => {
      CRITICAL_ENDPOINTS.forEach(endpoint => {
        expect(endpoint.path).toMatch(/^\/api\/agents\/\[id\]\//)
        expect(['GET', 'POST', 'PUT', 'DELETE']).toContain(endpoint.method)
        expect(endpoint.schema).toBeDefined()
      })
    })

    test('should have proper test data for POST endpoints', () => {
      const postEndpoints = CRITICAL_ENDPOINTS.filter(ep => ep.method === 'POST')
      
      postEndpoints.forEach(endpoint => {
        expect(endpoint.testData).toBeDefined()
        expect(typeof endpoint.testData).toBe('object')
      })
    })
  })

  describe('Environment Configuration', () => {
    test('should use default URL when env var is not set', async () => {
      const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL
      delete process.env.NEXT_PUBLIC_API_BASE_URL

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: 'test' })
      } as Response)

      await checkApiConnection('/api/test', z.object({ success: z.boolean() }))

      expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.any(Object))

      process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv
    })

    test('should use custom URL when env var is set', async () => {
      const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL
      process.env.NEXT_PUBLIC_API_BASE_URL = 'https://custom-api.com'

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: 'test' })
      } as Response)

      await checkApiConnection('/api/test', z.object({ success: z.boolean() }))

      expect(mockFetch).toHaveBeenCalledWith('https://custom-api.com/api/test', expect.any(Object))

      process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv
    })
  })

  describe('Error Handling Edge Cases', () => {
    test('should handle malformed response data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => 'invalid-json-object'
      } as Response)

      const result = await checkApiConnection('/api/test', z.object({ success: z.boolean() }))

      expect(result.ok).toBe(false)
      expect(result.message).toBe('Schema validation failed')
    })

    test('should handle empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => null
      } as Response)

      const result = await checkApiConnection('/api/test', z.object({ success: z.boolean() }))

      expect(result.ok).toBe(false)
      expect(result.message).toBe('Schema validation failed')
    })

    test('should handle timeout errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'))

      const result = await checkApiConnection('/api/test', z.object({ success: z.boolean() }))

      expect(result.ok).toBe(false)
      expect(result.message).toBe('Network error')
      expect(result.networkError).toBe('Request timeout')
    })
  })
})
