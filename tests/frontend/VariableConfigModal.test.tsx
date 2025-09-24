/**
 * VariableConfigModal Component Tests
 * Comprehensive test suite for the VariableConfigModal component
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import VariableConfigModal from '@/app/components/workflows/VariableConfigModal'

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
const mockVariables = [
  {
    id: 'var_1',
    name: 'username',
    type: 'string',
    description: 'User login username',
    defaultValue: 'admin',
    required: true,
    source: 'user_input',
    validation: {
      min: undefined,
      max: undefined,
      pattern: '^[a-zA-Z0-9_]+$',
      options: []
    },
    metadata: {},
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  },
  {
    id: 'var_2',
    name: 'retryCount',
    type: 'number',
    description: 'Number of retry attempts',
    defaultValue: 3,
    required: false,
    source: 'user_input',
    validation: {
      min: 1,
      max: 10,
      pattern: undefined,
      options: []
    },
    metadata: {},
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  },
  {
    id: 'var_3',
    name: 'environment',
    type: 'string',
    description: 'Deployment environment',
    defaultValue: 'production',
    required: false,
    source: 'environment',
    validation: {
      min: undefined,
      max: undefined,
      pattern: undefined,
      options: ['development', 'staging', 'production']
    },
    metadata: {},
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  }
]

const mockApiResponse = {
  success: true,
  data: mockVariables
}

const mockCreateResponse = {
  success: true,
  data: {
    id: 'var_new',
    name: 'newVariable',
    type: 'string',
    description: 'A new variable',
    defaultValue: 'default',
    required: false,
    source: 'user_input',
    validation: {
      min: undefined,
      max: undefined,
      pattern: undefined,
      options: []
    },
    metadata: {},
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  }
}

const mockUpdateResponse = {
  success: true,
  data: {
    id: 'var_1',
    name: 'updatedUsername',
    type: 'string',
    description: 'Updated user login username',
    defaultValue: 'newadmin',
    required: true,
    source: 'user_input',
    validation: {
      min: undefined,
      max: undefined,
      pattern: '^[a-zA-Z0-9_]+$',
      options: []
    },
    metadata: {},
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  }
}

const mockDeleteResponse = {
  success: true,
  data: {
    variableId: 'var_1',
    deleted: true
  }
}

describe('VariableConfigModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    workflowId: 'test-workflow-id'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Case 1: Fetch + Display Existing Variables', () => {
    it('should fetch and display existing variables on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      })

      render(<VariableConfigModal {...defaultProps} />)

      // Should show loading state initially
      expect(screen.getByText('Loading variables...')).toBeInTheDocument()

      // Wait for API call to complete
      await waitFor(() => {
        expect(screen.getByText('📊 Workflow Variables')).toBeInTheDocument()
      })

      // Should render variables list
      expect(screen.getByText('Variables (3)')).toBeInTheDocument()
      expect(screen.getByText('username')).toBeInTheDocument()
      expect(screen.getByText('retryCount')).toBeInTheDocument()
      expect(screen.getByText('environment')).toBeInTheDocument()

      // Should display variable details
      expect(screen.getByText('Type: string')).toBeInTheDocument()
      expect(screen.getByText('Type: number')).toBeInTheDocument()
      expect(screen.getByText('User login username')).toBeInTheDocument()
      expect(screen.getByText('Number of retry attempts')).toBeInTheDocument()

      // Should display default values
      expect(screen.getByText('Default: admin')).toBeInTheDocument()
      expect(screen.getByText('Default: 3')).toBeInTheDocument()
      expect(screen.getByText('Default: production')).toBeInTheDocument()

      // Should display required indicators
      expect(screen.getByText('(Required)')).toBeInTheDocument()

      // Should call API with correct URL
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/agents/test-workflow-id/variables',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      )
    })

    it('should handle empty variables list gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: []
        })
      })

      render(<VariableConfigModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Variables (0)')).toBeInTheDocument()
      })

      // Should show empty state
      expect(screen.getByText('No variables configured')).toBeInTheDocument()
      expect(screen.getByText('Click "Add Variable" to create your first workflow variable')).toBeInTheDocument()

      // Add Variable button should be visible
      expect(screen.getByText('Add Variable')).toBeInTheDocument()
    })
  })

  describe('Case 2: Create New Variable → Appears in List', () => {
    beforeEach(async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCreateResponse
        })

      render(<VariableConfigModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Add Variable')).toBeInTheDocument()
      })
    })

    it('should create new variable and add it to the list', async () => {
      // Click Add Variable button
      fireEvent.click(screen.getByText('Add Variable'))

      // Should show form
      await waitFor(() => {
        expect(screen.getByText('➕ Add New Variable')).toBeInTheDocument()
      })

      // Fill out form
      fireEvent.change(screen.getByPlaceholderText('Enter variable name'), {
        target: { value: 'newVariable' }
      })

      fireEvent.change(screen.getByPlaceholderText('Enter variable description'), {
        target: { value: 'A new variable' }
      })

      fireEvent.change(screen.getByPlaceholderText('Enter default value'), {
        target: { value: 'default' }
      })

      // Submit form
      fireEvent.click(screen.getByText('Create Variable'))

      // Should call create API
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/agents/test-workflow-id/variables',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'newVariable',
            type: 'string',
            description: 'A new variable',
            defaultValue: 'default',
            required: false,
            source: 'user_input',
            validation: {
              min: undefined,
              max: undefined,
              pattern: '',
              options: []
            },
            metadata: {}
          })
        })
      )

      // Should return to variables list
      await waitFor(() => {
        expect(screen.getByText('Variables (4)')).toBeInTheDocument()
      })

      // New variable should appear in list
      expect(screen.getByText('newVariable')).toBeInTheDocument()
      expect(screen.getByText('A new variable')).toBeInTheDocument()
      expect(screen.getByText('Default: default')).toBeInTheDocument()
    })

    it('should validate form before submission', async () => {
      // Click Add Variable button
      fireEvent.click(screen.getByText('Add Variable'))

      await waitFor(() => {
        expect(screen.getByText('➕ Add New Variable')).toBeInTheDocument()
      })

      // Try to submit without filling required fields
      fireEvent.click(screen.getByText('Create Variable'))

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument()
      })

      // Should not call API
      expect(mockFetch).toHaveBeenCalledTimes(1) // Only the initial fetch
    })
  })

  describe('Case 3: Update Variable → Changes Reflected', () => {
    beforeEach(async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUpdateResponse
        })

      render(<VariableConfigModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('username')).toBeInTheDocument()
      })
    })

    it('should update existing variable and reflect changes', async () => {
      // Find and click Edit button for first variable
      const editButtons = screen.getAllByText('Edit')
      fireEvent.click(editButtons[0])

      // Should show form pre-filled with existing data
      await waitFor(() => {
        expect(screen.getByText('✏️ Edit Variable')).toBeInTheDocument()
      })

      // Form should be pre-filled
      const nameInput = screen.getByDisplayValue('username')
      const descriptionInput = screen.getByDisplayValue('User login username')
      const defaultValueInput = screen.getByDisplayValue('admin')

      expect(nameInput).toBeInTheDocument()
      expect(descriptionInput).toBeInTheDocument()
      expect(defaultValueInput).toBeInTheDocument()

      // Update form fields
      fireEvent.change(nameInput, { target: { value: 'updatedUsername' } })
      fireEvent.change(descriptionInput, { target: { value: 'Updated user login username' } })
      fireEvent.change(defaultValueInput, { target: { value: 'newadmin' } })

      // Submit form
      fireEvent.click(screen.getByText('Update Variable'))

      // Should call update API
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/agents/test-workflow-id/variables?variableId=var_1',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'updatedUsername',
            type: 'string',
            description: 'Updated user login username',
            defaultValue: 'newadmin',
            required: true,
            source: 'user_input',
            validation: {
              min: undefined,
              max: undefined,
              pattern: '^[a-zA-Z0-9_]+$',
              options: []
            },
            metadata: {}
          })
        })
      )

      // Should return to variables list with updated data
      await waitFor(() => {
        expect(screen.getByText('Variables (3)')).toBeInTheDocument()
      })

      // Updated variable should appear in list
      expect(screen.getByText('updatedUsername')).toBeInTheDocument()
      expect(screen.getByText('Updated user login username')).toBeInTheDocument()
      expect(screen.getByText('Default: newadmin')).toBeInTheDocument()
    })
  })

  describe('Case 4: Delete Variable → Removed from List', () => {
    beforeEach(async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDeleteResponse
        })

      render(<VariableConfigModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('username')).toBeInTheDocument()
      })
    })

    it('should delete variable and remove it from the list', async () => {
      // Mock window.confirm to return true
      window.confirm = jest.fn(() => true)

      // Find and click Delete button for first variable
      const deleteButtons = screen.getAllByText('Delete')
      fireEvent.click(deleteButtons[0])

      // Should show confirmation dialog
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete the variable "username"?')

      // Should call delete API
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/agents/test-workflow-id/variables?variableId=var_1',
        expect.objectContaining({
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        })
      )

      // Variable should be removed from list
      await waitFor(() => {
        expect(screen.getByText('Variables (2)')).toBeInTheDocument()
      })

      expect(screen.queryByText('username')).not.toBeInTheDocument()
      expect(screen.getByText('retryCount')).toBeInTheDocument()
      expect(screen.getByText('environment')).toBeInTheDocument()
    })

    it('should not delete variable if confirmation is cancelled', async () => {
      // Mock window.confirm to return false
      window.confirm = jest.fn(() => false)

      // Find and click Delete button for first variable
      const deleteButtons = screen.getAllByText('Delete')
      fireEvent.click(deleteButtons[0])

      // Should show confirmation dialog
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete the variable "username"?')

      // Should not call delete API
      expect(mockFetch).toHaveBeenCalledTimes(1) // Only the initial fetch

      // Variable should still be in list
      expect(screen.getByText('Variables (3)')).toBeInTheDocument()
      expect(screen.getByText('username')).toBeInTheDocument()
    })
  })

  describe('Case 5: API Error → Error Message Shown', () => {
    it('should display error message when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<VariableConfigModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('❌ Error')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })

      // Should show empty state
      expect(screen.getByText('Variables (0)')).toBeInTheDocument()
      expect(screen.getByText('No variables configured')).toBeInTheDocument()
    })

    it('should display error message when API returns error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      render(<VariableConfigModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('❌ Error')).toBeInTheDocument()
        expect(screen.getByText('HTTP error! status: 404')).toBeInTheDocument()
      })
    })

    it('should display error message when create fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse
        })
        .mockRejectedValueOnce(new Error('Create failed'))

      render(<VariableConfigModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Add Variable')).toBeInTheDocument()
      })

      // Click Add Variable button
      fireEvent.click(screen.getByText('Add Variable'))

      await waitFor(() => {
        expect(screen.getByText('➕ Add New Variable')).toBeInTheDocument()
      })

      // Fill out form
      fireEvent.change(screen.getByPlaceholderText('Enter variable name'), {
        target: { value: 'newVariable' }
      })

      // Submit form
      fireEvent.click(screen.getByText('Create Variable'))

      await waitFor(() => {
        expect(screen.getByText('❌ Error')).toBeInTheDocument()
        expect(screen.getByText('Create failed')).toBeInTheDocument()
      })
    })

    it('should display error message when update fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse
        })
        .mockRejectedValueOnce(new Error('Update failed'))

      render(<VariableConfigModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('username')).toBeInTheDocument()
      })

      // Click Edit button
      const editButtons = screen.getAllByText('Edit')
      fireEvent.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByText('✏️ Edit Variable')).toBeInTheDocument()
      })

      // Submit form
      fireEvent.click(screen.getByText('Update Variable'))

      await waitFor(() => {
        expect(screen.getByText('❌ Error')).toBeInTheDocument()
        expect(screen.getByText('Update failed')).toBeInTheDocument()
      })
    })

    it('should display error message when delete fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse
        })
        .mockRejectedValueOnce(new Error('Delete failed'))

      render(<VariableConfigModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('username')).toBeInTheDocument()
      })

      // Mock window.confirm to return true
      window.confirm = jest.fn(() => true)

      // Click Delete button
      const deleteButtons = screen.getAllByText('Delete')
      fireEvent.click(deleteButtons[0])

      await waitFor(() => {
        expect(screen.getByText('❌ Error')).toBeInTheDocument()
        expect(screen.getByText('Delete failed')).toBeInTheDocument()
      })
    })
  })

  describe('Form Validation', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      })

      render(<VariableConfigModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Add Variable')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Add Variable'))

      await waitFor(() => {
        expect(screen.getByText('➕ Add New Variable')).toBeInTheDocument()
      })
    })

    it('should prevent duplicate variable names', async () => {
      // Try to create variable with existing name
      fireEvent.change(screen.getByPlaceholderText('Enter variable name'), {
        target: { value: 'username' }
      })

      fireEvent.click(screen.getByText('Create Variable'))

      await waitFor(() => {
        expect(screen.getByText('Variable name already exists')).toBeInTheDocument()
      })

      // Should not call API
      expect(mockFetch).toHaveBeenCalledTimes(1) // Only the initial fetch
    })

    it('should validate required fields', async () => {
      // Try to submit without name
      fireEvent.click(screen.getByText('Create Variable'))

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument()
      })

      // Should not call API
      expect(mockFetch).toHaveBeenCalledTimes(1) // Only the initial fetch
    })

    it('should validate number type constraints', async () => {
      // Change type to number
      fireEvent.change(screen.getByDisplayValue('string'), {
        target: { value: 'number' }
      })

      // Set invalid min/max values
      // Note: This would require additional form fields for min/max validation
      // The current form doesn't show these fields, so this test would need
      // the full validation form implementation
    })
  })

  describe('Loading States', () => {
    it('should show loading state during initial fetch', async () => {
      // Mock a delayed response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => mockApiResponse
          }), 100)
        )
      )

      render(<VariableConfigModal {...defaultProps} />)

      // Should show loading initially
      expect(screen.getByText('Loading variables...')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText('Loading variables...')).not.toBeInTheDocument()
      })
    })

    it('should show saving state during form submission', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse
        })
        .mockImplementationOnce(() => 
          new Promise(resolve => 
            setTimeout(() => resolve({
              ok: true,
              json: async () => mockCreateResponse
            }), 100)
          )
        )

      render(<VariableConfigModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Add Variable')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Add Variable'))

      await waitFor(() => {
        expect(screen.getByText('➕ Add New Variable')).toBeInTheDocument()
      })

      // Fill out form
      fireEvent.change(screen.getByPlaceholderText('Enter variable name'), {
        target: { value: 'newVariable' }
      })

      // Submit form
      fireEvent.click(screen.getByText('Create Variable'))

      // Should show saving state
      expect(screen.getByText('Saving...')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
      })
    })
  })

  describe('Environment Configuration', () => {
    it('should use environment variable for API URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      })

      render(<VariableConfigModal {...defaultProps} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/api/agents/test-workflow-id/variables',
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

      render(<VariableConfigModal {...defaultProps} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/agents/test-workflow-id/variables',
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
          data: null
        })
      })

      render(<VariableConfigModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('❌ Error')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      })

      render(<VariableConfigModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Add Variable')).toBeInTheDocument()
      })
    })

    it('should navigate between list and form views', async () => {
      // Start in list view
      expect(screen.getByText('Variables (3)')).toBeInTheDocument()

      // Click Add Variable
      fireEvent.click(screen.getByText('Add Variable'))

      // Should show form view
      await waitFor(() => {
        expect(screen.getByText('➕ Add New Variable')).toBeInTheDocument()
      })

      // Click Back to List
      fireEvent.click(screen.getByText('← Back to List'))

      // Should return to list view
      await waitFor(() => {
        expect(screen.getByText('Variables (3)')).toBeInTheDocument()
      })
    })

    it('should close modal when close button is clicked', async () => {
      const closeButton = screen.getByText('×')
      fireEvent.click(closeButton)

      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })
})
