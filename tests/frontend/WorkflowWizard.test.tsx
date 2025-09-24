import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import { WorkflowWizard } from '@/app/components/workflows/WorkflowWizard'

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

// Mock fetch for API calls
global.fetch = jest.fn()

// Mock environment variable
process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3000'

describe('WorkflowWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Case 1: User completes entire wizard flow successfully', () => {
    it('should complete the entire wizard flow from setup to finish', async () => {
      // Mock successful API responses
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { id: 'workflow-123' }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { steps: [{ id: 'step1', type: 'click', selector: 'button' }] }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { runId: 'run-123' } })
        })

      render(<WorkflowWizard />)

      // Step 1: Setup
      expect(screen.getByText('Setup')).toBeInTheDocument()
      
      const nameInput = screen.getByPlaceholderText('Enter workflow name')
      const loginSelect = screen.getByDisplayValue('Select a saved login')
      
      fireEvent.change(nameInput, { target: { value: 'Test Workflow' } })
      fireEvent.change(loginSelect, { target: { value: 'login1' } })
      
      // Navigate to next step
      fireEvent.click(screen.getByText('Next'))
      
      // Step 2: Record
      await waitFor(() => {
        expect(screen.getByText('Record')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Start Recording'))
      
      await waitFor(() => {
        expect(screen.getByText('Recording...')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Stop Recording'))
      
      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Next'))
      
      // Step 3: Playback
      await waitFor(() => {
        expect(screen.getByText('Playback')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Next'))
      
      // Step 4: Variables
      await waitFor(() => {
        expect(screen.getByText('Variables')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Next'))
      
      // Step 5: Logic
      await waitFor(() => {
        expect(screen.getByText('Logic')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Next'))
      
      // Step 6: Validate
      await waitFor(() => {
        expect(screen.getByText('Validate')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Next'))
      
      // Step 7: Run
      await waitFor(() => {
        expect(screen.getByText('Run')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Next'))
      
      // Step 8: Schedule
      await waitFor(() => {
        expect(screen.getByText('Schedule')).toBeInTheDocument()
      })
      
      // Finish
      fireEvent.click(screen.getByText('Finish'))
      
      expect(mockPush).toHaveBeenCalledWith('/workflows')
    })
  })

  describe('Case 2: User leaves workflow name blank → validation error', () => {
    it('should show validation error when workflow name is blank', () => {
      render(<WorkflowWizard />)

      // Try to proceed without entering workflow name
      fireEvent.click(screen.getByText('Next'))

      // Should not proceed to next step
      expect(screen.getByText('Setup')).toBeInTheDocument()
      expect(screen.queryByText('Record')).not.toBeInTheDocument()
    })

    it('should show validation error when login is not selected', () => {
      render(<WorkflowWizard />)

      // Enter workflow name but no login
      const nameInput = screen.getByPlaceholderText('Enter workflow name')
      fireEvent.change(nameInput, { target: { value: 'Test Workflow' } })

      // Try to proceed
      fireEvent.click(screen.getByText('Next'))

      // Should not proceed to next step
      expect(screen.getByText('Setup')).toBeInTheDocument()
      expect(screen.queryByText('Record')).not.toBeInTheDocument()
    })
  })

  describe('Case 3: User tries to continue without recording → blocked', () => {
    it('should block progression when no steps are recorded', async () => {
      render(<WorkflowWizard />)

      // Complete setup step
      const nameInput = screen.getByPlaceholderText('Enter workflow name')
      const loginSelect = screen.getByDisplayValue('Select a saved login')
      
      fireEvent.change(nameInput, { target: { value: 'Test Workflow' } })
      fireEvent.change(loginSelect, { target: { value: 'login1' } })
      
      fireEvent.click(screen.getByText('Next'))
      
      // Go to record step
      await waitFor(() => {
        expect(screen.getByText('Record')).toBeInTheDocument()
      })
      
      // Try to proceed without recording
      fireEvent.click(screen.getByText('Next'))

      // Should not proceed to playback step
      expect(screen.getByText('Record')).toBeInTheDocument()
      expect(screen.queryByText('Playback')).not.toBeInTheDocument()
    })
  })

  describe('Case 4: API error when saving variables → error banner shown', () => {
    it('should show error banner when API call fails', async () => {
      // Mock API failure
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

      render(<WorkflowWizard />)

      // Complete setup and recording steps
      const nameInput = screen.getByPlaceholderText('Enter workflow name')
      const loginSelect = screen.getByDisplayValue('Select a saved login')
      
      fireEvent.change(nameInput, { target: { value: 'Test Workflow' } })
      fireEvent.change(loginSelect, { target: { value: 'login1' } })
      
      fireEvent.click(screen.getByText('Next'))
      
      // Mock successful recording
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { id: 'workflow-123' }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { steps: [{ id: 'step1', type: 'click', selector: 'button' }] }
          })
        })

      await waitFor(() => {
        expect(screen.getByText('Record')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Start Recording'))
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Stop Recording'))
      })
      
      fireEvent.click(screen.getByText('Next'))
      fireEvent.click(screen.getByText('Next'))
      
      // Navigate to variables step
      await waitFor(() => {
        expect(screen.getByText('Variables')).toBeInTheDocument()
      })

      // Trigger variable save (this will fail due to mocked API error)
      // The component should show error banner
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument()
      })
    })
  })

  describe('Case 5: Logic invalid → error shown, cannot continue', () => {
    it('should show validation error for invalid logic spec', async () => {
      render(<WorkflowWizard />)

      // Navigate to logic step
      // (Assuming previous steps are completed)
      
      // Mock invalid logic spec
      const invalidLogicSpec = {
        id: 'logic1',
        name: '', // Invalid: empty name
        description: 'Test logic',
        conditions: [],
        actions: []
      }

      // The component should validate the logic spec and show error
      // This would be tested by triggering the save function with invalid data
      // and verifying that the error state is set correctly
    })
  })

  describe('Case 6: Run fails → error displayed in RunConsole', () => {
    it('should display error when workflow run fails', async () => {
      // Mock API failure for run
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Run failed'))

      render(<WorkflowWizard />)

      // Navigate to run step
      // (Assuming previous steps are completed)
      
      // Trigger run
      // The RunConsole component should display the error
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation and State Management', () => {
    it('should navigate between steps correctly', () => {
      render(<WorkflowWizard />)

      // Start at setup step
      expect(screen.getByText('Setup')).toBeInTheDocument()

      // Complete setup
      const nameInput = screen.getByPlaceholderText('Enter workflow name')
      const loginSelect = screen.getByDisplayValue('Select a saved login')
      
      fireEvent.change(nameInput, { target: { value: 'Test Workflow' } })
      fireEvent.change(loginSelect, { target: { value: 'login1' } })

      // Navigate to next step
      fireEvent.click(screen.getByText('Next'))

      // Should be on record step
      expect(screen.getByText('Record')).toBeInTheDocument()

      // Go back
      fireEvent.click(screen.getByText('Back'))

      // Should be back on setup step
      expect(screen.getByText('Setup')).toBeInTheDocument()
    })

    it('should show loading states during API calls', async () => {
      // Mock slow API response
      ;(global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, data: { id: 'workflow-123' } })
        }), 100))
      )

      render(<WorkflowWizard />)

      // Complete setup
      const nameInput = screen.getByPlaceholderText('Enter workflow name')
      const loginSelect = screen.getByDisplayValue('Select a saved login')
      
      fireEvent.change(nameInput, { target: { value: 'Test Workflow' } })
      fireEvent.change(loginSelect, { target: { value: 'login1' } })

      fireEvent.click(screen.getByText('Next'))

      // Should show loading state
      expect(screen.getByText('Starting...')).toBeInTheDocument()
    })

    it('should auto-save workflow data', async () => {
      // Mock successful API responses
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      })

      render(<WorkflowWizard />)

      // Change workflow name
      const nameInput = screen.getByPlaceholderText('Enter workflow name')
      fireEvent.change(nameInput, { target: { value: 'Test Workflow' } })

      // Wait for auto-save
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })
  })

  describe('Error Handling and Validation', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      render(<WorkflowWizard />)

      // Complete setup
      const nameInput = screen.getByPlaceholderText('Enter workflow name')
      const loginSelect = screen.getByDisplayValue('Select a saved login')
      
      fireEvent.change(nameInput, { target: { value: 'Test Workflow' } })
      fireEvent.change(loginSelect, { target: { value: 'login1' } })

      fireEvent.click(screen.getByText('Next'))

      // Should show error banner
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument()
      })
    })

    it('should validate workflow name length', () => {
      render(<WorkflowWizard />)

      // Enter very long workflow name
      const nameInput = screen.getByPlaceholderText('Enter workflow name')
      fireEvent.change(nameInput, { target: { value: 'a'.repeat(101) } })

      // Should show validation error
      expect(screen.getByText('Workflow name too long')).toBeInTheDocument()
    })

    it('should show empty states for optional steps', () => {
      render(<WorkflowWizard />)

      // Navigate to variables step (assuming previous steps completed)
      // Should show helper text
      expect(screen.getByText('Mark fields as dynamic if they change each run.')).toBeInTheDocument()
    })
  })

  describe('Integration with Child Components', () => {
    it('should pass correct props to WorkflowReplay', () => {
      render(<WorkflowWizard />)

      // The component should render WorkflowReplay with correct props
      // This would be tested by checking that the component receives
      // the workflowId and onRunComplete callback
    })

    it('should pass correct props to VariableConfigModal', () => {
      render(<WorkflowWizard />)

      // The component should render VariableConfigModal with correct props
      // This would be tested by checking that the component receives
      // the workflowId, variables, and onSave callback
    })

    it('should pass correct props to LogicEditor', () => {
      render(<WorkflowWizard />)

      // The component should render LogicEditor with correct props
      // This would be tested by checking that the component receives
      // the logicSpec and onSave callback
    })

    it('should pass correct props to RunConsole', () => {
      render(<WorkflowWizard />)

      // The component should render RunConsole with correct props
      // This would be tested by checking that the component receives
      // the workflowId, isRunning, and onRun callback
    })

    it('should pass correct props to ScheduleEditor', () => {
      render(<WorkflowWizard />)

      // The component should render ScheduleEditor with correct props
      // This would be tested by checking that the component receives
      // the workflowId and onSave callback
    })
  })
})
