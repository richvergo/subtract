/**
 * LogicEditor Component Tests
 * Comprehensive test coverage for natural language compilation and LogicSpec handling
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import LogicEditor from '@/app/components/workflows/LogicEditor'
import { LogicSpec } from '@/lib/agents/logic/schemas'

// Mock fetch
global.fetch = jest.fn()

// Mock the schemas
jest.mock('@/lib/agents/logic/schemas', () => ({
  LogicSpec: {},
  validateLogicSpec: jest.fn()
}))

const mockValidateLogicSpec = require('@/lib/agents/logic/schemas').validateLogicSpec

describe('LogicEditor Component', () => {
  const mockOnSave = jest.fn()
  const mockOnValidate = jest.fn()
  const mockWorkflowId = 'workflow-123'

  const mockLogicSpec: LogicSpec = {
    id: 'spec-123',
    name: 'Test Logic',
    version: '1.0.0',
    actions: [],
    variables: [],
    settings: {
      timeout: 30000,
      retryAttempts: 3,
      screenshotOnError: true,
      debugMode: false,
      parallelExecution: false
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
    mockValidateLogicSpec.mockClear()
  })

  describe('Component Rendering', () => {
    it('renders with required props', () => {
      render(
        <LogicEditor
          workflowId={mockWorkflowId}
          logicSpec={mockLogicSpec}
          onSave={mockOnSave}
        />
      )

      expect(screen.getByText('🔧 Logic Editor')).toBeInTheDocument()
      expect(screen.getByText('📝 Natural Language')).toBeInTheDocument()
      expect(screen.getByText('🔍 Preview')).toBeInTheDocument()
    })

    it('renders with null logicSpec', () => {
      render(
        <LogicEditor
          workflowId={mockWorkflowId}
          logicSpec={null}
          onSave={mockOnSave}
        />
      )

      expect(screen.getByText('🔧 Logic Editor')).toBeInTheDocument()
    })
  })

  describe('Natural Language Tab', () => {
    it('displays natural language input', () => {
      render(
        <LogicEditor
          workflowId={mockWorkflowId}
          logicSpec={mockLogicSpec}
          onSave={mockOnSave}
        />
      )

      const textarea = screen.getByPlaceholderText(/Loop over all jobs in last month/)
      expect(textarea).toBeInTheDocument()
      expect(textarea).toHaveAttribute('placeholder', expect.stringContaining('Loop over all jobs in last month'))
    })

    it('shows example hints', () => {
      render(
        <LogicEditor
          workflowId={mockWorkflowId}
          logicSpec={mockLogicSpec}
          onSave={mockOnSave}
        />
      )

      expect(screen.getByText('💡 Example Rules:')).toBeInTheDocument()
      expect(screen.getByText('Loop over all jobs in last month')).toBeInTheDocument()
      expect(screen.getByText('Skip processing if the result is empty')).toBeInTheDocument()
    })

    it('updates textarea value on input', () => {
      render(
        <LogicEditor
          workflowId={mockWorkflowId}
          logicSpec={mockLogicSpec}
          onSave={mockOnSave}
        />
      )

      const textarea = screen.getByPlaceholderText(/Loop over all jobs in last month/)
      fireEvent.change(textarea, { target: { value: 'Test rules' } })
      
      expect(textarea).toHaveValue('Test rules')
    })
  })

  describe('Compilation Flow', () => {
    it('shows error when trying to compile empty rules', async () => {
      render(
        <LogicEditor
          workflowId={mockWorkflowId}
          logicSpec={mockLogicSpec}
          onSave={mockOnSave}
        />
      )

      const compileButton = screen.getByText('Compile')
      fireEvent.click(compileButton)

      await waitFor(() => {
        expect(screen.getByText('Please enter natural language rules')).toBeInTheDocument()
      })
    })

    it('calls API with correct payload on successful compilation', async () => {
      const mockResponse = {
        success: true,
        data: {
          spec: mockLogicSpec,
          metadata: { compilationTime: 1000 }
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      mockValidateLogicSpec.mockReturnValue(mockLogicSpec)

      render(
        <LogicEditor
          workflowId={mockWorkflowId}
          logicSpec={mockLogicSpec}
          onSave={mockOnSave}
        />
      )

      const textarea = screen.getByPlaceholderText(/Loop over all jobs in last month/)
      fireEvent.change(textarea, { target: { value: 'Test rules' } })

      const compileButton = screen.getByText('Compile')
      fireEvent.click(compileButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/agents/${mockWorkflowId}/generate-logic`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              nlRules: 'Test rules',
              variables: []
            })
          }
        )
      })
    })

    it('handles successful compilation', async () => {
      const mockResponse = {
        success: true,
        data: {
          spec: mockLogicSpec,
          metadata: { compilationTime: 1000 }
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      mockValidateLogicSpec.mockReturnValue(mockLogicSpec)

      render(
        <LogicEditor
          workflowId={mockWorkflowId}
          logicSpec={mockLogicSpec}
          onSave={mockOnSave}
        />
      )

      const textarea = screen.getByPlaceholderText(/Loop over all jobs in last month/)
      fireEvent.change(textarea, { target: { value: 'Test rules' } })

      const compileButton = screen.getByText('Compile')
      fireEvent.click(compileButton)

      await waitFor(() => {
        expect(screen.getByText('✅ Compilation Successful')).toBeInTheDocument()
      })

      // Switch to preview tab
      const previewTab = screen.getByText('🔍 Preview')
      fireEvent.click(previewTab)

      await waitFor(() => {
        expect(screen.getByText('🔍 Compiled LogicSpec Preview')).toBeInTheDocument()
        expect(screen.getAllByText('Save Logic')).toHaveLength(2) // Header + Preview tab
      })
    })

    it('handles compilation errors', async () => {
      const mockErrorResponse = {
        error: 'Compilation failed',
        details: ['Invalid syntax', 'Missing variable']
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => mockErrorResponse
      })

      render(
        <LogicEditor
          workflowId={mockWorkflowId}
          logicSpec={mockLogicSpec}
          onSave={mockOnSave}
        />
      )

      const textarea = screen.getByPlaceholderText(/Loop over all jobs in last month/)
      fireEvent.change(textarea, { target: { value: 'Invalid rules' } })

      const compileButton = screen.getByText('Compile')
      fireEvent.click(compileButton)

      await waitFor(() => {
        expect(screen.getByText('❌ Compilation Error')).toBeInTheDocument()
        expect(screen.getByText('Invalid syntax, Missing variable')).toBeInTheDocument()
      })
    })

    it('handles network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(
        <LogicEditor
          workflowId={mockWorkflowId}
          logicSpec={mockLogicSpec}
          onSave={mockOnSave}
        />
      )

      const textarea = screen.getByPlaceholderText(/Loop over all jobs in last month/)
      fireEvent.change(textarea, { target: { value: 'Test rules' } })

      const compileButton = screen.getByText('Compile')
      fireEvent.click(compileButton)

      await waitFor(() => {
        expect(screen.getByText('❌ Compilation Error')).toBeInTheDocument()
        expect(screen.getByText('Failed to compile natural language rules')).toBeInTheDocument()
      })
    })

    it('validates response with Zod before setting compiled spec', async () => {
      const mockResponse = {
        success: true,
        data: {
          spec: { invalid: 'spec' },
          metadata: { compilationTime: 1000 }
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      mockValidateLogicSpec.mockImplementation(() => {
        throw new Error('Invalid LogicSpec')
      })

      render(
        <LogicEditor
          workflowId={mockWorkflowId}
          logicSpec={mockLogicSpec}
          onSave={mockOnSave}
        />
      )

      const textarea = screen.getByPlaceholderText(/Loop over all jobs in last month/)
      fireEvent.change(textarea, { target: { value: 'Test rules' } })

      const compileButton = screen.getByText('Compile')
      fireEvent.click(compileButton)

      await waitFor(() => {
        expect(screen.getByText('❌ Compilation Error')).toBeInTheDocument()
        expect(screen.getByText('Invalid LogicSpec received from server')).toBeInTheDocument()
      })
    })
  })

  describe('Preview Tab', () => {
    it('shows empty state when no compiled spec', () => {
      render(
        <LogicEditor
          workflowId={mockWorkflowId}
          logicSpec={mockLogicSpec}
          onSave={mockOnSave}
        />
      )

      const previewTab = screen.getByText('🔍 Preview')
      fireEvent.click(previewTab)

      expect(screen.getByText('📋')).toBeInTheDocument()
      expect(screen.getByText('Compile natural language rules to see the structured LogicSpec preview')).toBeInTheDocument()
    })

    it('displays compiled spec JSON with syntax highlighting', async () => {
      const mockResponse = {
        success: true,
        data: {
          spec: mockLogicSpec,
          metadata: { compilationTime: 1000 }
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      mockValidateLogicSpec.mockReturnValue(mockLogicSpec)

      render(
        <LogicEditor
          workflowId={mockWorkflowId}
          logicSpec={mockLogicSpec}
          onSave={mockOnSave}
        />
      )

      // Compile first
      const textarea = screen.getByPlaceholderText(/Loop over all jobs in last month/)
      fireEvent.change(textarea, { target: { value: 'Test rules' } })

      const compileButton = screen.getByText('Compile')
      fireEvent.click(compileButton)

      await waitFor(() => {
        expect(screen.getByText('✅ Compilation Successful')).toBeInTheDocument()
      })

      // Switch to preview
      const previewTab = screen.getByText('🔍 Preview')
      fireEvent.click(previewTab)

      await waitFor(() => {
        expect(screen.getByText('🔍 Compiled LogicSpec Preview')).toBeInTheDocument()
        expect(screen.getAllByText('Save Logic')).toHaveLength(2) // Header + Preview tab
      })

      // Check JSON is displayed
      const jsonContent = screen.getByText(/"id": "spec-123"/)
      expect(jsonContent).toBeInTheDocument()
    })
  })

  describe('Save Functionality', () => {
    it('saves compiled logic when save button is clicked', async () => {
      const mockResponse = {
        success: true,
        data: {
          spec: mockLogicSpec,
          metadata: { compilationTime: 1000 }
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      mockValidateLogicSpec.mockReturnValue(mockLogicSpec)

      render(
        <LogicEditor
          workflowId={mockWorkflowId}
          logicSpec={mockLogicSpec}
          onSave={mockOnSave}
        />
      )

      // Compile first
      const textarea = screen.getByPlaceholderText(/Loop over all jobs in last month/)
      fireEvent.change(textarea, { target: { value: 'Test rules' } })

      const compileButton = screen.getByText('Compile')
      fireEvent.click(compileButton)

      await waitFor(() => {
        expect(screen.getByText('✅ Compilation Successful')).toBeInTheDocument()
      })

      // Switch to preview and save
      const previewTab = screen.getByText('🔍 Preview')
      fireEvent.click(previewTab)

      await waitFor(() => {
        const saveButtons = screen.getAllByText('Save Logic')
        const previewSaveButton = saveButtons[1] // Second button is in preview tab
        fireEvent.click(previewSaveButton)
      })

      expect(mockOnSave).toHaveBeenCalledWith(mockLogicSpec)
    })

    it('shows error when trying to save without compiled spec', async () => {
      render(
        <LogicEditor
          workflowId={mockWorkflowId}
          logicSpec={mockLogicSpec}
          onSave={mockOnSave}
        />
      )

      const previewTab = screen.getByText('🔍 Preview')
      fireEvent.click(previewTab)

      // Try to save without compiling first
      const saveButton = screen.getByText('Save Logic')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('❌ Compilation Error')).toBeInTheDocument()
        expect(screen.getByText('No compiled logic to save')).toBeInTheDocument()
      })
    })
  })

  describe('Error State Management', () => {
    it('resets error state when retrying compilation', async () => {
      // First attempt fails
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(
        <LogicEditor
          workflowId={mockWorkflowId}
          logicSpec={mockLogicSpec}
          onSave={mockOnSave}
        />
      )

      const textarea = screen.getByPlaceholderText(/Loop over all jobs in last month/)
      fireEvent.change(textarea, { target: { value: 'Test rules' } })

      const compileButton = screen.getByText('Compile')
      fireEvent.click(compileButton)

      await waitFor(() => {
        expect(screen.getByText('❌ Compilation Error')).toBeInTheDocument()
      })

      // Second attempt succeeds
      const mockResponse = {
        success: true,
        data: {
          spec: mockLogicSpec,
          metadata: { compilationTime: 1000 }
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      mockValidateLogicSpec.mockReturnValue(mockLogicSpec)

      fireEvent.click(compileButton)

      await waitFor(() => {
        expect(screen.getByText('✅ Compilation Successful')).toBeInTheDocument()
      })
    })
  })

  describe('Status Management', () => {
    it('shows compiling state during API call', async () => {
      // Mock a slow response
      ;(global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, data: { spec: mockLogicSpec } })
        }), 100))
      )

      mockValidateLogicSpec.mockReturnValue(mockLogicSpec)

      render(
        <LogicEditor
          workflowId={mockWorkflowId}
          logicSpec={mockLogicSpec}
          onSave={mockOnSave}
        />
      )

      const textarea = screen.getByPlaceholderText(/Loop over all jobs in last month/)
      fireEvent.change(textarea, { target: { value: 'Test rules' } })

      const compileButton = screen.getByText('Compile')
      fireEvent.click(compileButton)

      // Should show compiling state
      expect(screen.getByText('Compiling...')).toBeInTheDocument()
      expect(compileButton).toBeDisabled()

      await waitFor(() => {
        expect(screen.getByText('✅ Compilation Successful')).toBeInTheDocument()
      })
    })
  })

  describe('Tab Navigation', () => {
    it('switches between natural language and preview tabs', () => {
      render(
        <LogicEditor
          workflowId={mockWorkflowId}
          logicSpec={mockLogicSpec}
          onSave={mockOnSave}
        />
      )

      // Start on natural language tab
      expect(screen.getByText('📝 Natural Language Rules')).toBeInTheDocument()

      // Switch to preview tab
      const previewTab = screen.getByText('🔍 Preview')
      fireEvent.click(previewTab)

      expect(screen.getByText('🔍 Compiled LogicSpec Preview')).toBeInTheDocument()

      // Switch back to natural language tab
      const naturalTab = screen.getByText('📝 Natural Language')
      fireEvent.click(naturalTab)

      expect(screen.getByText('📝 Natural Language Rules')).toBeInTheDocument()
    })
  })
})
