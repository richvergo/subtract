/**
 * ConnectionValidator Component Tests
 * Comprehensive test suite for API connection validation
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ConnectionValidator from '@/app/components/system/ConnectionValidator'
import { 
  checkAllCriticalEndpoints, 
  getConnectionHealthSummary,
  retryFailedConnections,
  validateApiContract
} from '@/lib/api/connectionCheck'

// Mock the connection check functions
jest.mock('@/lib/api/connectionCheck', () => ({
  checkAllCriticalEndpoints: jest.fn(),
  getConnectionHealthSummary: jest.fn(),
  retryFailedConnections: jest.fn(),
  validateApiContract: jest.fn()
}))

const mockCheckAllCriticalEndpoints = checkAllCriticalEndpoints as jest.MockedFunction<typeof checkAllCriticalEndpoints>
const mockGetConnectionHealthSummary = getConnectionHealthSummary as jest.MockedFunction<typeof getConnectionHealthSummary>
const mockRetryFailedConnections = retryFailedConnections as jest.MockedFunction<typeof retryFailedConnections>
const mockValidateApiContract = validateApiContract as jest.MockedFunction<typeof validateApiContract>

// Mock fetch globally
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('ConnectionValidator Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock successful connection check by default
    mockCheckAllCriticalEndpoints.mockResolvedValue([
      {
        ok: true,
        message: 'Agent Validation: Schema validation passed',
        endpoint: '/api/agents/test-id/validate'
      },
      {
        ok: true,
        message: 'Agent Variables: Schema validation passed',
        endpoint: '/api/agents/test-id/variables'
      },
      {
        ok: true,
        message: 'Logic Generation: Schema validation passed',
        endpoint: '/api/agents/test-id/generate-logic'
      },
      {
        ok: true,
        message: 'Agent Run: Schema validation passed',
        endpoint: '/api/agents/test-id/run'
      },
      {
        ok: true,
        message: 'Schedule Management: Schema validation passed',
        endpoint: '/api/agents/test-id/schedule'
      }
    ])

    mockGetConnectionHealthSummary.mockReturnValue({
      allHealthy: true,
      healthyCount: 5,
      totalCount: 5,
      failedEndpoints: [],
      summaryMessage: '✅ All systems operational'
    })
  })

  describe('Successful Connection States', () => {
    test('should display success message when all endpoints are healthy', async () => {
      render(<ConnectionValidator agentId="test-id" />)

      await waitFor(() => {
        expect(screen.getByText('✅ All systems operational')).toBeInTheDocument()
      })

      expect(mockCheckAllCriticalEndpoints).toHaveBeenCalledWith('test-id')
    })

    test('should not render when all systems are healthy and showDetails is false', async () => {
      const { container } = render(<ConnectionValidator agentId="test-id" showDetails={false} />)

      await waitFor(() => {
        expect(mockCheckAllCriticalEndpoints).toHaveBeenCalled()
      })

      // Should not render anything when all systems are healthy
      expect(container.firstChild).toBeNull()
    })

    test('should render when showDetails is true even if all systems are healthy', async () => {
      render(<ConnectionValidator agentId="test-id" showDetails={true} />)

      await waitFor(() => {
        expect(screen.getByText('✅ All systems operational')).toBeInTheDocument()
      })

      expect(screen.getByText('Details')).toBeInTheDocument()
    })
  })

  describe('Failed Connection States', () => {
    test('should display error message when endpoints fail', async () => {
      const failedResults = [
        {
          ok: false,
          message: 'Agent Validation: Schema validation failed',
          endpoint: '/api/agents/test-id/validate',
          schemaErrors: ['steps: Required']
        },
        {
          ok: true,
          message: 'Agent Variables: Schema validation passed',
          endpoint: '/api/agents/test-id/variables'
        }
      ]

      mockCheckAllCriticalEndpoints.mockResolvedValue(failedResults)
      mockGetConnectionHealthSummary.mockReturnValue({
        allHealthy: false,
        healthyCount: 1,
        totalCount: 2,
        failedEndpoints: [failedResults[0]],
        summaryMessage: '❌ API error at /api/agents/test-id/validate'
      })

      render(<ConnectionValidator agentId="test-id" />)

      await waitFor(() => {
        expect(screen.getByText('❌ API error at /api/agents/test-id/validate')).toBeInTheDocument()
      })

      expect(screen.getByText('(1 of 2 endpoints failed)')).toBeInTheDocument()
    })

    test('should display network error message', async () => {
      const networkErrorResult = {
        ok: false,
        message: 'Agent Validation: Network error',
        endpoint: '/api/agents/test-id/validate',
        networkError: 'Failed to fetch'
      }

      mockCheckAllCriticalEndpoints.mockResolvedValue([networkErrorResult])
      mockGetConnectionHealthSummary.mockReturnValue({
        allHealthy: false,
        healthyCount: 0,
        totalCount: 1,
        failedEndpoints: [networkErrorResult],
        summaryMessage: '❌ API error at /api/agents/test-id/validate'
      })

      render(<ConnectionValidator agentId="test-id" showDetails={true} />)

      await waitFor(() => {
        expect(screen.getByText('❌ API error at /api/agents/test-id/validate')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Details'))

      await waitFor(() => {
        expect(screen.getByText('Network: Failed to fetch')).toBeInTheDocument()
      })
    })

    test('should display schema validation errors', async () => {
      const schemaErrorResult = {
        ok: false,
        message: 'Agent Variables: Schema validation failed',
        endpoint: '/api/agents/test-id/variables',
        schemaErrors: ['data.variables: Expected array, received string']
      }

      mockCheckAllCriticalEndpoints.mockResolvedValue([schemaErrorResult])
      mockGetConnectionHealthSummary.mockReturnValue({
        allHealthy: false,
        healthyCount: 0,
        totalCount: 1,
        failedEndpoints: [schemaErrorResult],
        summaryMessage: '❌ API error at /api/agents/test-id/variables'
      })

      render(<ConnectionValidator agentId="test-id" showDetails={true} />)

      await waitFor(() => {
        expect(screen.getByText('❌ API error at /api/agents/test-id/variables')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Details'))

      await waitFor(() => {
        expect(screen.getByText('data.variables: Expected array, received string')).toBeInTheDocument()
      })
    })
  })

  describe('Retry Functionality', () => {
    test('should retry failed connections when retry button is clicked', async () => {
      const failedResult = {
        ok: false,
        message: 'Agent Run: Network error',
        endpoint: '/api/agents/test-id/run',
        networkError: 'Connection timeout'
      }

      const retryResult = {
        ok: true,
        message: 'Agent Run: Schema validation passed',
        endpoint: '/api/agents/test-id/run'
      }

      mockCheckAllCriticalEndpoints
        .mockResolvedValueOnce([failedResult])
        .mockResolvedValueOnce([retryResult])

      mockGetConnectionHealthSummary
        .mockReturnValueOnce({
          allHealthy: false,
          healthyCount: 0,
          totalCount: 1,
          failedEndpoints: [failedResult],
          summaryMessage: '❌ API error at /api/agents/test-id/run'
        })
        .mockReturnValueOnce({
          allHealthy: true,
          healthyCount: 1,
          totalCount: 1,
          failedEndpoints: [],
          summaryMessage: '✅ All systems operational'
        })

      mockRetryFailedConnections.mockResolvedValue([retryResult])

      render(<ConnectionValidator agentId="test-id" />)

      await waitFor(() => {
        expect(screen.getByText('❌ API error at /api/agents/test-id/run')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Retry Failed'))

      await waitFor(() => {
        expect(mockRetryFailedConnections).toHaveBeenCalledWith([failedResult], 3)
      })
    })

    test('should auto-retry failed connections when autoRetry is enabled', async () => {
      const failedResult = {
        ok: false,
        message: 'Schedule Management: Network error',
        endpoint: '/api/agents/test-id/schedule',
        networkError: 'Connection timeout'
      }

      const retryResult = {
        ok: true,
        message: 'Schedule Management: Schema validation passed',
        endpoint: '/api/agents/test-id/schedule'
      }

      mockCheckAllCriticalEndpoints.mockResolvedValue([failedResult])
      mockRetryFailedConnections.mockResolvedValue([retryResult])

      mockGetConnectionHealthSummary
        .mockReturnValueOnce({
          allHealthy: false,
          healthyCount: 0,
          totalCount: 1,
          failedEndpoints: [failedResult],
          summaryMessage: '❌ API error at /api/agents/test-id/schedule'
        })
        .mockReturnValue({
          allHealthy: true,
          healthyCount: 1,
          totalCount: 1,
          failedEndpoints: [],
          summaryMessage: '✅ All systems operational'
        })

      render(<ConnectionValidator agentId="test-id" autoRetry={true} />)

      await waitFor(() => {
        expect(mockRetryFailedConnections).toHaveBeenCalledWith([failedResult], 3)
      })
    })

    test('should not auto-retry when autoRetry is disabled', async () => {
      const failedResult = {
        ok: false,
        message: 'Logic Generation: Schema validation failed',
        endpoint: '/api/agents/test-id/generate-logic',
        schemaErrors: ['logicSpec: Required']
      }

      mockCheckAllCriticalEndpoints.mockResolvedValue([failedResult])
      mockGetConnectionHealthSummary.mockReturnValue({
        allHealthy: false,
        healthyCount: 0,
        totalCount: 1,
        failedEndpoints: [failedResult],
        summaryMessage: '❌ API error at /api/agents/test-id/generate-logic'
      })

      render(<ConnectionValidator agentId="test-id" autoRetry={false} />)

      await waitFor(() => {
        expect(screen.getByText('❌ API error at /api/agents/test-id/generate-logic')).toBeInTheDocument()
      })

      expect(mockRetryFailedConnections).not.toHaveBeenCalled()
    })
  })

  describe('Refresh Functionality', () => {
    test('should refresh connection status when refresh button is clicked', async () => {
      render(<ConnectionValidator agentId="test-id" showDetails={true} />)

      await waitFor(() => {
        expect(mockCheckAllCriticalEndpoints).toHaveBeenCalledWith('test-id')
      })

      // Clear previous calls
      mockCheckAllCriticalEndpoints.mockClear()

      fireEvent.click(screen.getByText('Refresh'))

      await waitFor(() => {
        expect(mockCheckAllCriticalEndpoints).toHaveBeenCalledWith('test-id')
      })
    })
  })

  describe('Details Toggle', () => {
    test('should show detailed results when Details button is clicked', async () => {
      const detailedResults = [
        {
          ok: true,
          message: 'Agent Validation: Schema validation passed',
          endpoint: '/api/agents/test-id/validate'
        },
        {
          ok: false,
          message: 'Agent Variables: Schema validation failed',
          endpoint: '/api/agents/test-id/variables',
          schemaErrors: ['data.variables: Expected array, received string']
        }
      ]

      mockCheckAllCriticalEndpoints.mockResolvedValue(detailedResults)
      mockGetConnectionHealthSummary.mockReturnValue({
        allHealthy: false,
        healthyCount: 1,
        totalCount: 2,
        failedEndpoints: [detailedResults[1]],
        summaryMessage: '❌ API error at /api/agents/test-id/variables'
      })

      render(<ConnectionValidator agentId="test-id" showDetails={true} />)

      await waitFor(() => {
        expect(screen.getByText('Details')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Details'))

      await waitFor(() => {
        expect(screen.getByText('API Connection Details:')).toBeInTheDocument()
        expect(screen.getByText('/api/agents/test-id/validate')).toBeInTheDocument()
        expect(screen.getByText('/api/agents/test-id/variables')).toBeInTheDocument()
      })
    })

    test('should hide detailed results when Hide Details button is clicked', async () => {
      render(<ConnectionValidator agentId="test-id" showDetails={true} />)

      await waitFor(() => {
        expect(screen.getByText('Details')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Details'))

      await waitFor(() => {
        expect(screen.getByText('Hide Details')).toBeInTheDocument()
        expect(screen.getByText('API Connection Details:')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Hide Details'))

      await waitFor(() => {
        expect(screen.queryByText('API Connection Details:')).not.toBeInTheDocument()
        expect(screen.getByText('Details')).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    test('should show loading spinner during connection check', async () => {
      // Mock delayed response
      mockCheckAllCriticalEndpoints.mockImplementation(() => new Promise(resolve => 
        setTimeout(() => resolve([]), 100)
      ))

      render(<ConnectionValidator agentId="test-id" />)

      expect(screen.getByText('Checking API connections...')).toBeInTheDocument()
    })

    test('should show retry status during retry operations', async () => {
      const failedResult = {
        ok: false,
        message: 'Agent Run: Network error',
        endpoint: '/api/agents/test-id/run',
        networkError: 'Connection timeout'
      }

      mockCheckAllCriticalEndpoints.mockResolvedValue([failedResult])
      mockGetConnectionHealthSummary.mockReturnValue({
        allHealthy: false,
        healthyCount: 0,
        totalCount: 1,
        failedEndpoints: [failedResult],
        summaryMessage: '❌ API error at /api/agents/test-id/run'
      })

      // Mock delayed retry
      mockRetryFailedConnections.mockImplementation(() => new Promise(resolve => 
        setTimeout(() => resolve([failedResult]), 100)
      ))

      render(<ConnectionValidator agentId="test-id" showDetails={true} />)

      await waitFor(() => {
        expect(screen.getByText('Retry Failed')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Retry Failed'))

      await waitFor(() => {
        expect(screen.getByText('🔄 Retrying failed connections...')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    test('should handle connection check failures gracefully', async () => {
      mockCheckAllCriticalEndpoints.mockRejectedValue(new Error('Connection check failed'))

      render(<ConnectionValidator agentId="test-id" />)

      await waitFor(() => {
        expect(screen.getByText(/Failed to perform connection check/)).toBeInTheDocument()
      })
    })

    test('should handle retry failures gracefully', async () => {
      const failedResult = {
        ok: false,
        message: 'Agent Run: Network error',
        endpoint: '/api/agents/test-id/run',
        networkError: 'Connection timeout'
      }

      mockCheckAllCriticalEndpoints.mockResolvedValue([failedResult])
      mockGetConnectionHealthSummary.mockReturnValue({
        allHealthy: false,
        healthyCount: 0,
        totalCount: 1,
        failedEndpoints: [failedResult],
        summaryMessage: '❌ API error at /api/agents/test-id/run'
      })

      mockRetryFailedConnections.mockRejectedValue(new Error('Retry failed'))

      render(<ConnectionValidator agentId="test-id" />)

      await waitFor(() => {
        expect(screen.getByText('Retry Failed')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Retry Failed'))

      await waitFor(() => {
        expect(screen.getByText('🔄 Retrying failed connections...')).toBeInTheDocument()
      })
    })
  })

  describe('Multiple Endpoint Failures', () => {
    test('should display summary for multiple failed endpoints', async () => {
      const multipleFailures = [
        {
          ok: false,
          message: 'Agent Validation: Schema validation failed',
          endpoint: '/api/agents/test-id/validate',
          schemaErrors: ['steps: Required']
        },
        {
          ok: false,
          message: 'Agent Variables: Network error',
          endpoint: '/api/agents/test-id/variables',
          networkError: 'Connection timeout'
        },
        {
          ok: false,
          message: 'Logic Generation: HTTP 500 error',
          endpoint: '/api/agents/test-id/generate-logic',
          statusCode: 500
        }
      ]

      mockCheckAllCriticalEndpoints.mockResolvedValue(multipleFailures)
      mockGetConnectionHealthSummary.mockReturnValue({
        allHealthy: false,
        healthyCount: 0,
        totalCount: 3,
        failedEndpoints: multipleFailures,
        summaryMessage: '❌ 3 API endpoints have issues'
      })

      render(<ConnectionValidator agentId="test-id" />)

      await waitFor(() => {
        expect(screen.getByText('❌ 3 API endpoints have issues')).toBeInTheDocument()
        expect(screen.getByText('(3 of 3 endpoints failed)')).toBeInTheDocument()
      })
    })
  })

  describe('Status Code Display', () => {
    test('should display HTTP status codes in detailed view', async () => {
      const statusCodeResult = {
        ok: false,
        message: 'Agent Run: HTTP 500 error',
        endpoint: '/api/agents/test-id/run',
        statusCode: 500
      }

      mockCheckAllCriticalEndpoints.mockResolvedValue([statusCodeResult])
      mockGetConnectionHealthSummary.mockReturnValue({
        allHealthy: false,
        healthyCount: 0,
        totalCount: 1,
        failedEndpoints: [statusCodeResult],
        summaryMessage: '❌ API error at /api/agents/test-id/run'
      })

      render(<ConnectionValidator agentId="test-id" showDetails={true} />)

      await waitFor(() => {
        expect(screen.getByText('Details')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Details'))

      await waitFor(() => {
        expect(screen.getByText('500')).toBeInTheDocument()
      })
    })
  })
})
