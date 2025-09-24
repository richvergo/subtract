/**
 * RunConsole Component Tests
 * Comprehensive test coverage for workflow execution and real-time log streaming
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import RunConsole from '@/app/components/workflows/RunConsole'
import { RunLog } from '@/lib/agents/logic/schemas'

// Mock fetch
global.fetch = jest.fn()

// Mock EventSource
global.EventSource = jest.fn()

// Mock the schemas
jest.mock('@/lib/agents/logic/schemas', () => ({
  RunLog: {},
  validateRunLog: jest.fn()
}))

const mockValidateRunLog = require('@/lib/agents/logic/schemas').validateRunLog

describe('RunConsole Component', () => {
  const mockOnClose = jest.fn()
  const mockWorkflowId = 'workflow-123'

  const mockRunLog: RunLog = {
    id: 'log-123',
    timestamp: Date.now(),
    level: 'info',
    message: 'Test log message',
    actionId: 'action-123',
    metadata: {}
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
    ;(global.EventSource as jest.Mock).mockClear()
    mockValidateRunLog.mockClear()
  })

  describe('Component Rendering', () => {
    it('renders with required props', () => {
      render(
        <RunConsole
          workflowId={mockWorkflowId}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText('🖥️ Run Console')).toBeInTheDocument()
      expect(screen.getByText('IDLE')).toBeInTheDocument()
      expect(screen.getByText('🚀 Run Workflow')).toBeInTheDocument()
    })

    it('renders without onClose prop', () => {
      render(
        <RunConsole
          workflowId={mockWorkflowId}
        />
      )

      expect(screen.getByText('🖥️ Run Console')).toBeInTheDocument()
      expect(screen.queryByText('×')).not.toBeInTheDocument()
    })
  })

  describe('Workflow Execution', () => {
    it('calls API with correct payload when Run Workflow is clicked', async () => {
      const mockResponse = {
        runId: 'run-123',
        status: 'enqueued'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      render(
        <RunConsole
          workflowId={mockWorkflowId}
        />
      )

      const runButton = screen.getByText('🚀 Run Workflow')
      fireEvent.click(runButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/agents/${mockWorkflowId}/run`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              variables: {},
              settings: {}
            })
          }
        )
      })
    })

    it('handles successful workflow start', async () => {
      const mockResponse = {
        runId: 'run-123',
        status: 'enqueued'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      // Mock EventSource
      const mockEventSource = {
        close: jest.fn(),
        onmessage: null,
        onerror: null,
        addEventListener: jest.fn()
      }
      ;(global.EventSource as jest.Mock).mockImplementation(() => mockEventSource)

      render(
        <RunConsole
          workflowId={mockWorkflowId}
        />
      )

      const runButton = screen.getByText('🚀 Run Workflow')
      fireEvent.click(runButton)

      await waitFor(() => {
        expect(screen.getByText('RUNNING')).toBeInTheDocument()
        expect(screen.getByText('⏹️ Stop Run')).toBeInTheDocument()
      })
    })

    it('handles workflow start failure', async () => {
      const mockErrorResponse = {
        error: 'Failed to start workflow'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => mockErrorResponse
      })

      render(
        <RunConsole
          workflowId={mockWorkflowId}
        />
      )

      const runButton = screen.getByText('🚀 Run Workflow')
      fireEvent.click(runButton)

      await waitFor(() => {
        expect(screen.getByText('FAILED')).toBeInTheDocument()
        expect(screen.getByText('Failed to start workflow')).toBeInTheDocument()
      })
    })

    it('handles network errors during workflow start', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(
        <RunConsole
          workflowId={mockWorkflowId}
        />
      )

      const runButton = screen.getByText('🚀 Run Workflow')
      fireEvent.click(runButton)

      await waitFor(() => {
        expect(screen.getByText('FAILED')).toBeInTheDocument()
        expect(screen.getByText('Failed to start workflow execution')).toBeInTheDocument()
      })
    })
  })

  describe('Log Streaming', () => {
    it('sets up SSE connection for log streaming', async () => {
      const mockResponse = {
        runId: 'run-123',
        status: 'enqueued'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const mockEventSource = {
        close: jest.fn(),
        onmessage: null,
        onerror: null,
        addEventListener: jest.fn()
      }
      ;(global.EventSource as jest.Mock).mockImplementation(() => mockEventSource)

      render(
        <RunConsole
          workflowId={mockWorkflowId}
        />
      )

      const runButton = screen.getByText('🚀 Run Workflow')
      fireEvent.click(runButton)

      await waitFor(() => {
        expect(global.EventSource).toHaveBeenCalledWith(
          `/api/agents/${mockWorkflowId}/run?stream=true&runId=run-123`
        )
      })
    })

    it('processes incoming log events', async () => {
      const mockResponse = {
        runId: 'run-123',
        status: 'enqueued'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const mockEventSource = {
        close: jest.fn(),
        onmessage: null,
        onerror: null,
        addEventListener: jest.fn()
      }
      ;(global.EventSource as jest.Mock).mockImplementation(() => mockEventSource)

      mockValidateRunLog.mockReturnValue(mockRunLog)

      render(
        <RunConsole
          workflowId={mockWorkflowId}
        />
      )

      const runButton = screen.getByText('🚀 Run Workflow')
      fireEvent.click(runButton)

      await waitFor(() => {
        expect(global.EventSource).toHaveBeenCalled()
      })

      // Simulate incoming log event
      const eventSource = (global.EventSource as jest.Mock).mock.results[0].value
      const logEvent = new MessageEvent('message', {
        data: JSON.stringify(mockRunLog)
      })
      
      if (eventSource.onmessage) {
        eventSource.onmessage(logEvent)
      }

      await waitFor(() => {
        expect(mockValidateRunLog).toHaveBeenCalledWith(mockRunLog)
      })
    })

    it('handles invalid log events gracefully', async () => {
      const mockResponse = {
        runId: 'run-123',
        status: 'enqueued'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const mockEventSource = {
        close: jest.fn(),
        onmessage: null,
        onerror: null,
        addEventListener: jest.fn()
      }
      ;(global.EventSource as jest.Mock).mockImplementation(() => mockEventSource)

      mockValidateRunLog.mockImplementation(() => {
        throw new Error('Invalid log format')
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      render(
        <RunConsole
          workflowId={mockWorkflowId}
        />
      )

      const runButton = screen.getByText('🚀 Run Workflow')
      fireEvent.click(runButton)

      await waitFor(() => {
        expect(global.EventSource).toHaveBeenCalled()
      })

      // Simulate invalid log event
      const eventSource = (global.EventSource as jest.Mock).mock.results[0].value
      const logEvent = new MessageEvent('message', {
        data: JSON.stringify({ invalid: 'data' })
      })
      
      if (eventSource.onmessage) {
        eventSource.onmessage(logEvent)
      }

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Invalid log event received:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Status Management', () => {
    it('shows running state during execution', async () => {
      const mockResponse = {
        runId: 'run-123',
        status: 'enqueued'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const mockEventSource = {
        close: jest.fn(),
        onmessage: null,
        onerror: null,
        addEventListener: jest.fn()
      }
      ;(global.EventSource as jest.Mock).mockImplementation(() => mockEventSource)

      render(
        <RunConsole
          workflowId={mockWorkflowId}
        />
      )

      const runButton = screen.getByText('🚀 Run Workflow')
      fireEvent.click(runButton)

      await waitFor(() => {
        expect(screen.getByText('RUNNING')).toBeInTheDocument()
        expect(screen.getByText('⏳')).toBeInTheDocument()
        expect(screen.getByText('⏹️ Stop Run')).toBeInTheDocument()
      })
    })

    it('shows success state when workflow completes', async () => {
      const mockResponse = {
        runId: 'run-123',
        status: 'enqueued'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const mockEventSource = {
        close: jest.fn(),
        onmessage: null,
        onerror: null,
        addEventListener: jest.fn()
      }
      ;(global.EventSource as jest.Mock).mockImplementation(() => mockEventSource)

      render(
        <RunConsole
          workflowId={mockWorkflowId}
        />
      )

      const runButton = screen.getByText('🚀 Run Workflow')
      fireEvent.click(runButton)

      await waitFor(() => {
        expect(screen.getByText('RUNNING')).toBeInTheDocument()
      })

      // Simulate success event
      const eventSource = (global.EventSource as jest.Mock).mock.results[0].value
      const successEvent = new MessageEvent('message', {
        data: JSON.stringify({ ...mockRunLog, status: 'success' })
      })
      
      if (eventSource.onmessage) {
        eventSource.onmessage(successEvent)
      }

      await waitFor(() => {
        expect(screen.getByText('SUCCESS')).toBeInTheDocument()
        expect(screen.getByText('✅')).toBeInTheDocument()
        expect(screen.getByText('Workflow completed successfully!')).toBeInTheDocument()
      })
    })

    it('shows failed state when workflow fails', async () => {
      const mockResponse = {
        runId: 'run-123',
        status: 'enqueued'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const mockEventSource = {
        close: jest.fn(),
        onmessage: null,
        onerror: null,
        addEventListener: jest.fn()
      }
      ;(global.EventSource as jest.Mock).mockImplementation(() => mockEventSource)

      render(
        <RunConsole
          workflowId={mockWorkflowId}
        />
      )

      const runButton = screen.getByText('🚀 Run Workflow')
      fireEvent.click(runButton)

      await waitFor(() => {
        expect(screen.getByText('RUNNING')).toBeInTheDocument()
      })

      // Simulate failure event
      const eventSource = (global.EventSource as jest.Mock).mock.results[0].value
      const failureEvent = new MessageEvent('message', {
        data: JSON.stringify({ ...mockRunLog, status: 'failed', message: 'Workflow failed' })
      })
      
      if (eventSource.onmessage) {
        eventSource.onmessage(failureEvent)
      }

      await waitFor(() => {
        expect(screen.getByText('FAILED')).toBeInTheDocument()
        expect(screen.getByText('❌')).toBeInTheDocument()
        expect(screen.getByText('Workflow execution failed')).toBeInTheDocument()
      })
    })
  })

  describe('Stop Run Functionality', () => {
    it('stops workflow execution and closes SSE connection', async () => {
      const mockResponse = {
        runId: 'run-123',
        status: 'enqueued'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const mockEventSource = {
        close: jest.fn(),
        onmessage: null,
        onerror: null,
        addEventListener: jest.fn()
      }
      ;(global.EventSource as jest.Mock).mockImplementation(() => mockEventSource)

      render(
        <RunConsole
          workflowId={mockWorkflowId}
        />
      )

      const runButton = screen.getByText('🚀 Run Workflow')
      fireEvent.click(runButton)

      await waitFor(() => {
        expect(screen.getByText('RUNNING')).toBeInTheDocument()
      })

      const stopButton = screen.getByText('⏹️ Stop Run')
      fireEvent.click(stopButton)

      await waitFor(() => {
        expect(screen.getByText('IDLE')).toBeInTheDocument()
        expect(screen.getByText('🚀 Run Workflow')).toBeInTheDocument()
      })

      expect(mockEventSource.close).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('handles SSE connection errors', async () => {
      const mockResponse = {
        runId: 'run-123',
        status: 'enqueued'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const mockEventSource = {
        close: jest.fn(),
        onmessage: null,
        onerror: null,
        addEventListener: jest.fn()
      }
      ;(global.EventSource as jest.Mock).mockImplementation(() => mockEventSource)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      render(
        <RunConsole
          workflowId={mockWorkflowId}
        />
      )

      const runButton = screen.getByText('🚀 Run Workflow')
      fireEvent.click(runButton)

      await waitFor(() => {
        expect(global.EventSource).toHaveBeenCalled()
      })

      // Simulate SSE error
      const eventSource = (global.EventSource as jest.Mock).mock.results[0].value
      if (eventSource.onerror) {
        eventSource.onerror(new Error('Connection lost'))
      }

      await waitFor(() => {
        expect(screen.getByText('Error: Connection lost - unable to receive live updates')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })
  })

  describe('UI Controls', () => {
    it('toggles auto-scroll functionality', () => {
      render(
        <RunConsole
          workflowId={mockWorkflowId}
        />
      )

      const autoScrollButton = screen.getByText('Auto-scroll ON')
      fireEvent.click(autoScrollButton)

      expect(screen.getByText('Auto-scroll OFF')).toBeInTheDocument()
    })

    it('clears logs when Clear button is clicked', () => {
      render(
        <RunConsole
          workflowId={mockWorkflowId}
        />
      )

      const clearButton = screen.getByText('Clear')
      fireEvent.click(clearButton)

      // Should still show empty state
      expect(screen.getByText('No runs yet. Click Run Workflow to start.')).toBeInTheDocument()
    })

    it('calls onClose when close button is clicked', () => {
      render(
        <RunConsole
          workflowId={mockWorkflowId}
          onClose={mockOnClose}
        />
      )

      const closeButton = screen.getByText('×')
      fireEvent.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Empty State', () => {
    it('shows empty state when no logs are present', () => {
      render(
        <RunConsole
          workflowId={mockWorkflowId}
        />
      )

      expect(screen.getByText('📋')).toBeInTheDocument()
      expect(screen.getByText('No runs yet. Click Run Workflow to start.')).toBeInTheDocument()
    })
  })

  describe('Cleanup', () => {
    it('closes SSE connection on unmount', () => {
      const mockEventSource = {
        close: jest.fn(),
        onmessage: null,
        onerror: null,
        addEventListener: jest.fn()
      }
      ;(global.EventSource as jest.Mock).mockImplementation(() => mockEventSource)

      const { unmount } = render(
        <RunConsole
          workflowId={mockWorkflowId}
        />
      )

      unmount()

      expect(mockEventSource.close).toHaveBeenCalled()
    })
  })
})
