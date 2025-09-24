/**
 * WorkflowReplay Component Tests
 * Comprehensive test suite for the WorkflowReplay component
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import WorkflowReplay from '@/app/components/workflows/WorkflowReplay'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock environment variables
const originalEnv = process.env
beforeEach(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_API_URL: 'https://api.example.com'
  }
})

afterEach(() => {
  process.env = originalEnv
  mockFetch.mockClear()
})

// Mock data
const mockSteps = [
  {
    id: 'step_1',
    type: 'click',
    selector: 'button.submit-btn',
    value: undefined,
    url: undefined,
    coordinates: { x: 100, y: 200 },
    waitFor: undefined,
    timeout: 5000,
    retryCount: 3,
    dependencies: [],
    metadata: {},
    order: 0
  },
  {
    id: 'step_2',
    type: 'type',
    selector: 'input[name="email"]',
    value: 'test@example.com',
    url: undefined,
    coordinates: undefined,
    waitFor: undefined,
    timeout: 3000,
    retryCount: 2,
    dependencies: ['step_1'],
    metadata: {},
    order: 1
  },
  {
    id: 'step_3',
    type: 'navigate',
    selector: 'body',
    value: undefined,
    url: 'https://example.com/dashboard',
    coordinates: undefined,
    waitFor: undefined,
    timeout: 10000,
    retryCount: 1,
    dependencies: ['step_2'],
    metadata: {},
    order: 2
  }
]

const mockLogs = [
  {
    id: 'log_1',
    timestamp: Date.now(),
    level: 'info' as const,
    message: 'Workflow loaded successfully',
    actionId: null,
    metadata: { stepCount: 3 }
  },
  {
    id: 'log_2',
    timestamp: Date.now(),
    level: 'info' as const,
    message: 'All selectors validated',
    actionId: null,
    metadata: { validationStatus: 'passed' }
  },
  {
    id: 'log_3',
    timestamp: Date.now(),
    level: 'warn' as const,
    message: 'Step 2 has a dependency on step 1',
    actionId: 'step_2',
    metadata: { dependency: 'step_1' }
  }
]

const mockApiResponse = {
  success: true,
  steps: mockSteps,
  validationLogs: mockLogs
}

const mockHighlightResponse = {
  success: true,
  data: {
    stepId: 'step_1',
    selector: 'button.submit-btn',
    type: 'click',
    coordinates: { x: 100, y: 200 },
    highlighted: true,
    timestamp: Date.now()
  }
}

describe('WorkflowReplay Component', () => {
  const defaultProps = {
    workflowId: 'test-workflow-id',
    onRunComplete: jest.fn(),
    onRunError: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Case 1: Fetch + Render Steps', () => {
    it('should fetch and render workflow steps on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      })

      render(<WorkflowReplay {...defaultProps} />)

      // Should show loading state initially
      expect(screen.getByText('Loading workflow steps...')).toBeInTheDocument()

      // Wait for API call to complete
      await waitFor(() => {
        expect(screen.getByText('🎬 Workflow Replay')).toBeInTheDocument()
      })

      // Should render steps
      expect(screen.getByText('📋 Workflow Steps (3)')).toBeInTheDocument()
      expect(screen.getByText('Step 1: click')).toBeInTheDocument()
      expect(screen.getByText('Step 2: type')).toBeInTheDocument()
      expect(screen.getByText('Step 3: navigate')).toBeInTheDocument()

      // Should render step details
      expect(screen.getByText('button.submit-btn')).toBeInTheDocument()
      expect(screen.getByText('input[name="email"]')).toBeInTheDocument()
      expect(screen.getByText('Value: test@example.com')).toBeInTheDocument()

      // Should call API with correct URL
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/agents/test-workflow-id/validate',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      )
    })

    it('should handle empty steps gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          steps: [],
          validationLogs: []
        })
      })

      render(<WorkflowReplay {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('No steps available')).toBeInTheDocument()
      })

      // Replay controls should not be visible
      expect(screen.queryByText('Play All')).not.toBeInTheDocument()
    })
  })

  describe('Case 2: Step Forward → API Call', () => {
    beforeEach(async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockHighlightResponse
        })

      render(<WorkflowReplay {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Step Forward')).toBeInTheDocument()
      })
    })

    it('should call API with correct stepId when stepping forward', async () => {
      const stepForwardButton = screen.getByText('Step Forward')
      
      await act(async () => {
        fireEvent.click(stepForwardButton)
      })

      // Should call highlight API
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/agents/test-workflow-id/validate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stepId: 'step_2' })
        })
      )

      // Should update current step
      await waitFor(() => {
        expect(screen.getByText('Step 2: type')).toHaveStyle({
          backgroundColor: 'rgb(255, 243, 205)' // Current step background
        })
      })
    })

    it('should disable step forward when at last step', async () => {
      // Navigate to last step
      await act(async () => {
        fireEvent.click(screen.getByText('Step Forward'))
      })

      await act(async () => {
        fireEvent.click(screen.getByText('Step Forward'))
      })

      // Should be at last step now
      const stepForwardButton = screen.getByText('Step Forward')
      expect(stepForwardButton).toBeDisabled()
    })
  })

  describe('Case 3: Play All → Sequential API Calls', () => {
    beforeEach(async () => {
      // Mock multiple API calls for play all
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockHighlightResponse, data: { ...mockHighlightResponse.data, stepId: 'step_1' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockHighlightResponse, data: { ...mockHighlightResponse.data, stepId: 'step_2' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockHighlightResponse, data: { ...mockHighlightResponse.data, stepId: 'step_3' } })
        })

      render(<WorkflowReplay {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Play All')).toBeInTheDocument()
      })
    })

    it('should make sequential API calls when playing all', async () => {
      const playAllButton = screen.getByText('Play All')
      
      await act(async () => {
        fireEvent.click(playAllButton)
      })

      // Wait for all API calls to complete
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(4) // 1 initial fetch + 3 highlight calls
      }, { timeout: 5000 })

      // Should have called highlight API for each step
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/validate'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ stepId: 'step_1' })
        })
      )

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/validate'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ stepId: 'step_2' })
        })
      )

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/validate'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ stepId: 'step_3' })
        })
      )
    })
  })

  describe('Case 4: Error → Error UI Rendered', () => {
    it('should render error UI when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<WorkflowReplay {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('❌ Error')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })

      // Should call onRunError callback
      expect(defaultProps.onRunError).toHaveBeenCalledWith('Network error')
    })

    it('should render error UI when API returns error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      render(<WorkflowReplay {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('❌ Error')).toBeInTheDocument()
        expect(screen.getByText('HTTP error! status: 404')).toBeInTheDocument()
      })
    })

    it('should render error UI when highlighting fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse
        })
        .mockRejectedValueOnce(new Error('Highlight failed'))

      render(<WorkflowReplay {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Step Forward')).toBeInTheDocument()
      })

      await act(async () => {
        fireEvent.click(screen.getByText('Step Forward'))
      })

      await waitFor(() => {
        expect(screen.getByText('❌ Error')).toBeInTheDocument()
        expect(screen.getByText('Highlight failed')).toBeInTheDocument()
      })
    })
  })

  describe('Case 5: Logs Displayed in Console Area', () => {
    it('should display validation logs in console area', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      })

      render(<WorkflowReplay {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('📋 Validation Logs')).toBeInTheDocument()
      })

      // Should display log messages
      expect(screen.getByText('Workflow loaded successfully')).toBeInTheDocument()
      expect(screen.getByText('All selectors validated')).toBeInTheDocument()
      expect(screen.getByText('Step 2 has a dependency on step 1')).toBeInTheDocument()

      // Should display log levels with correct colors
      const infoLogs = screen.getAllByText('[INFO]')
      const warnLogs = screen.getAllByText('[WARN]')
      
      expect(infoLogs).toHaveLength(2)
      expect(warnLogs).toHaveLength(1)

      // Should display timestamps
      const timestamps = screen.getAllByText(/\[\d{1,2}:\d{2}:\d{2}\]/)
      expect(timestamps.length).toBeGreaterThan(0)
    })

    it('should handle logs with action IDs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      })

      render(<WorkflowReplay {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('(Action: step_2)')).toBeInTheDocument()
      })
    })
  })

  describe('Reset Functionality', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      })

      render(<WorkflowReplay {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Reset')).toBeInTheDocument()
      })
    })

    it('should reset to step 0 and clear highlights', async () => {
      const resetButton = screen.getByText('Reset')
      
      await act(async () => {
        fireEvent.click(resetButton)
      })

      // Should be back at step 0
      expect(screen.getByText('Step 1: click')).toHaveStyle({
        backgroundColor: 'rgb(255, 243, 205)' // Current step background
      })
    })
  })

  describe('Individual Step Highlighting', () => {
    beforeEach(async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockHighlightResponse
        })

      render(<WorkflowReplay {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Step 1: click')).toBeInTheDocument()
      })
    })

    it('should highlight individual step when clicked', async () => {
      const stepElement = screen.getByText('Step 1: click')
      
      await act(async () => {
        fireEvent.click(stepElement)
      })

      // Should call highlight API
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/validate'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ stepId: 'step_1' })
        })
      )

      // Should show highlighted state
      await waitFor(() => {
        expect(screen.getByText('(Highlighted)')).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading state during API calls', async () => {
      // Mock a delayed response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => mockApiResponse
          }), 100)
        )
      )

      render(<WorkflowReplay {...defaultProps} />)

      // Should show loading initially
      expect(screen.getByText('Loading workflow steps...')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText('Loading workflow steps...')).not.toBeInTheDocument()
      })
    })

    it('should show validating state during highlighting', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse
        })
        .mockImplementationOnce(() => 
          new Promise(resolve => 
            setTimeout(() => resolve({
              ok: true,
              json: async () => mockHighlightResponse
            }), 100)
          )
        )

      render(<WorkflowReplay {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Step Forward')).toBeInTheDocument()
      })

      await act(async () => {
        fireEvent.click(screen.getByText('Step Forward'))
      })

      // Should show validating state
      expect(screen.getByText('Highlighting step...')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText('Highlighting step...')).not.toBeInTheDocument()
      })
    })
  })

  describe('Environment Configuration', () => {
    it('should use environment variable for API URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      })

      render(<WorkflowReplay {...defaultProps} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/api/agents/test-workflow-id/validate',
          expect.any(Object)
        )
      })
    })

    it('should fallback to empty string when no API URL is set', async () => {
      process.env.NEXT_PUBLIC_API_URL = undefined
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      })

      render(<WorkflowReplay {...defaultProps} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/agents/test-workflow-id/validate',
          expect.any(Object)
        )
      })
    })
  })

  describe('Data Validation', () => {
    it('should handle invalid API response gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          // Missing required fields
          steps: null,
          validationLogs: null
        })
      })

      render(<WorkflowReplay {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('❌ Error')).toBeInTheDocument()
      })

      expect(defaultProps.onRunError).toHaveBeenCalled()
    })
  })
})
