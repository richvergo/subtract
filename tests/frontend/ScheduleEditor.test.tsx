/**
 * ScheduleEditor Component Tests
 * Comprehensive test suite for schedule management functionality
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ScheduleEditor from '@/app/components/workflows/ScheduleEditor'
import { fetchSchedules, createSchedule, updateSchedule, deleteSchedule } from '@/lib/api/schedules'

// Mock the API functions
jest.mock('@/lib/api/schedules', () => ({
  fetchSchedules: jest.fn(),
  createSchedule: jest.fn(),
  updateSchedule: jest.fn(),
  deleteSchedule: jest.fn(),
  validateCronExpression: jest.fn(),
  calculateNextRunTime: jest.fn()
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn()
  })
}))

const mockFetchSchedules = fetchSchedules as jest.MockedFunction<typeof fetchSchedules>
const mockCreateSchedule = createSchedule as jest.MockedFunction<typeof createSchedule>
const mockUpdateSchedule = updateSchedule as jest.MockedFunction<typeof updateSchedule>
const mockDeleteSchedule = deleteSchedule as jest.MockedFunction<typeof deleteSchedule>

// Mock schedule data
const mockSchedule: any = {
  id: 'schedule_1',
  workflowId: 'workflow_1',
  name: 'Daily Backup',
  cronExpression: '0 2 * * *',
  timezone: 'UTC',
  isActive: true,
  runConfig: {},
  variables: {},
  metadata: {},
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
}

const mockSchedule2: any = {
  id: 'schedule_2',
  workflowId: 'workflow_1',
  name: 'Weekly Report',
  cronExpression: '0 9 * * 1',
  timezone: 'UTC',
  isActive: false,
  runConfig: {},
  variables: {},
  metadata: {},
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
}

describe('ScheduleEditor Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock successful fetch by default
    mockFetchSchedules.mockResolvedValue([])
  })

  describe('Initial Load and Display', () => {
    test('should display loading state initially', async () => {
      // Mock delayed response
      mockFetchSchedules.mockImplementation(() => new Promise(resolve => 
        setTimeout(() => resolve([]), 100)
      ))

      render(<ScheduleEditor workflowId="workflow_1" />)
      
      expect(screen.getByText('Loading schedules...')).toBeInTheDocument()
    })

    test('should fetch and display existing schedules', async () => {
      mockFetchSchedules.mockResolvedValue([mockSchedule, mockSchedule2])

      render(<ScheduleEditor workflowId="workflow_1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Daily Backup')).toBeInTheDocument()
        expect(screen.getByText('Weekly Report')).toBeInTheDocument()
        expect(screen.getByText('0 2 * * *')).toBeInTheDocument()
        expect(screen.getByText('0 9 * * 1')).toBeInTheDocument()
      })

      expect(mockFetchSchedules).toHaveBeenCalledWith('workflow_1')
    })

    test('should display empty state when no schedules exist', async () => {
      mockFetchSchedules.mockResolvedValue([])

      render(<ScheduleEditor workflowId="workflow_1" />)
      
      await waitFor(() => {
        expect(screen.getByText('No schedules configured')).toBeInTheDocument()
        expect(screen.getByText('Click "Add Schedule" to create your first schedule')).toBeInTheDocument()
      })
    })

    test('should display error state when fetch fails', async () => {
      const errorMessage = 'Failed to fetch schedules'
      mockFetchSchedules.mockRejectedValue(new Error(errorMessage))

      render(<ScheduleEditor workflowId="workflow_1" />)
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })
  })

  describe('Add Schedule Functionality', () => {
    test('should open modal when Add Schedule button is clicked', async () => {
      mockFetchSchedules.mockResolvedValue([])

      render(<ScheduleEditor workflowId="workflow_1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Add Schedule')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Add Schedule'))

      expect(screen.getByText('Add New Schedule')).toBeInTheDocument()
      expect(screen.getByLabelText(/Cron Expression/)).toBeInTheDocument()
    })

    test('should create new schedule successfully', async () => {
      mockFetchSchedules.mockResolvedValue([])
      mockCreateSchedule.mockResolvedValue(mockSchedule)

      render(<ScheduleEditor workflowId="workflow_1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Add Schedule')).toBeInTheDocument()
      })

      // Open modal
      fireEvent.click(screen.getByText('Add Schedule'))

      // Fill form
      fireEvent.change(screen.getByLabelText(/Schedule Name/), {
        target: { value: 'Daily Backup' }
      })
      fireEvent.change(screen.getByLabelText(/Cron Expression/), {
        target: { value: '0 2 * * *' }
      })

      // Submit form
      fireEvent.click(screen.getByText('Create'))

      await waitFor(() => {
        expect(mockCreateSchedule).toHaveBeenCalledWith('workflow_1', {
          name: 'Daily Backup',
          cronExpression: '0 2 * * *',
          timezone: expect.any(String),
          isActive: true,
          runConfig: {},
          variables: {},
          metadata: {},
          workflowId: 'workflow_1'
        })
      })

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByText('Add New Schedule')).not.toBeInTheDocument()
      })
    })

    test('should display error when schedule creation fails', async () => {
      const errorMessage = 'Failed to create schedule'
      mockFetchSchedules.mockResolvedValue([])
      mockCreateSchedule.mockRejectedValue(new Error(errorMessage))

      render(<ScheduleEditor workflowId="workflow_1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Add Schedule')).toBeInTheDocument()
      })

      // Open modal and submit
      fireEvent.click(screen.getByText('Add Schedule'))
      fireEvent.change(screen.getByLabelText(/Cron Expression/), {
        target: { value: '0 2 * * *' }
      })
      fireEvent.click(screen.getByText('Create'))

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })
  })

  describe('Edit Schedule Functionality', () => {
    test('should open modal with existing data when Edit is clicked', async () => {
      mockFetchSchedules.mockResolvedValue([mockSchedule])

      render(<ScheduleEditor workflowId="workflow_1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Daily Backup')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Edit'))

      expect(screen.getByText('Edit Schedule')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Daily Backup')).toBeInTheDocument()
      expect(screen.getByDisplayValue('0 2 * * *')).toBeInTheDocument()
    })

    test('should update schedule successfully', async () => {
      const updatedSchedule = { ...mockSchedule, name: 'Updated Backup' }
      mockFetchSchedules.mockResolvedValue([mockSchedule])
      mockUpdateSchedule.mockResolvedValue(updatedSchedule)

      render(<ScheduleEditor workflowId="workflow_1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Daily Backup')).toBeInTheDocument()
      })

      // Open edit modal
      fireEvent.click(screen.getByText('Edit'))

      // Update name
      fireEvent.change(screen.getByLabelText(/Schedule Name/), {
        target: { value: 'Updated Backup' }
      })

      // Submit
      fireEvent.click(screen.getByText('Update'))

      await waitFor(() => {
        expect(mockUpdateSchedule).toHaveBeenCalledWith('workflow_1', 'schedule_1', {
          name: 'Updated Backup',
          cronExpression: '0 2 * * *',
          timezone: expect.any(String),
          isActive: true,
          runConfig: {},
          variables: {},
          metadata: {}
        })
      })
    })
  })

  describe('Delete Schedule Functionality', () => {
    test('should delete schedule after confirmation', async () => {
      mockFetchSchedules.mockResolvedValue([mockSchedule])
      mockDeleteSchedule.mockResolvedValue({ scheduleId: 'schedule_1', deleted: true })

      // Mock window.confirm
      window.confirm = jest.fn(() => true)

      render(<ScheduleEditor workflowId="workflow_1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Daily Backup')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Delete'))

      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this schedule?')
      expect(mockDeleteSchedule).toHaveBeenCalledWith('workflow_1', 'schedule_1')
    })

    test('should not delete schedule if confirmation is cancelled', async () => {
      mockFetchSchedules.mockResolvedValue([mockSchedule])

      // Mock window.confirm to return false
      window.confirm = jest.fn(() => false)

      render(<ScheduleEditor workflowId="workflow_1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Daily Backup')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Delete'))

      expect(window.confirm).toHaveBeenCalled()
      expect(mockDeleteSchedule).not.toHaveBeenCalled()
    })

    test('should display error when delete fails', async () => {
      const errorMessage = 'Failed to delete schedule'
      mockFetchSchedules.mockResolvedValue([mockSchedule])
      mockDeleteSchedule.mockRejectedValue(new Error(errorMessage))

      window.confirm = jest.fn(() => true)

      render(<ScheduleEditor workflowId="workflow_1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Daily Backup')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Delete'))

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })
  })

  describe('Form Validation', () => {
    test('should validate cron expression and show error', async () => {
      mockFetchSchedules.mockResolvedValue([])

      render(<ScheduleEditor workflowId="workflow_1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Add Schedule')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Add Schedule'))

      // Submit without cron expression
      fireEvent.click(screen.getByText('Create'))

      await waitFor(() => {
        expect(screen.getByText('Cron expression is required')).toBeInTheDocument()
      })
    })

    test('should accept valid cron expression', async () => {
      mockFetchSchedules.mockResolvedValue([])
      mockCreateSchedule.mockResolvedValue(mockSchedule)

      render(<ScheduleEditor workflowId="workflow_1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Add Schedule')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Add Schedule'))

      fireEvent.change(screen.getByLabelText(/Cron Expression/), {
        target: { value: '0 2 * * *' }
      })
      fireEvent.click(screen.getByText('Create'))

      await waitFor(() => {
        expect(mockCreateSchedule).toHaveBeenCalled()
      })
    })

    test('should clear errors when field is corrected', async () => {
      mockFetchSchedules.mockResolvedValue([])

      render(<ScheduleEditor workflowId="workflow_1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Add Schedule')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Add Schedule'))

      // Submit to trigger error
      fireEvent.click(screen.getByText('Create'))

      await waitFor(() => {
        expect(screen.getByText('Cron expression is required')).toBeInTheDocument()
      })

      // Fix the field
      fireEvent.change(screen.getByLabelText(/Cron Expression/), {
        target: { value: '0 2 * * *' }
      })

      await waitFor(() => {
        expect(screen.queryByText('Cron expression is required')).not.toBeInTheDocument()
      })
    })
  })

  describe('Quick Select Functionality', () => {
    test('should populate cron expression when quick select is clicked', async () => {
      mockFetchSchedules.mockResolvedValue([])

      render(<ScheduleEditor workflowId="workflow_1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Add Schedule')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Add Schedule'))

      // Click on "Every day at midnight" option
      fireEvent.click(screen.getByText('Every day at midnight'))

      expect(screen.getByDisplayValue('0 0 * * *')).toBeInTheDocument()
    })
  })

  describe('Modal Functionality', () => {
    test('should close modal when Cancel is clicked', async () => {
      mockFetchSchedules.mockResolvedValue([])

      render(<ScheduleEditor workflowId="workflow_1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Add Schedule')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Add Schedule'))
      expect(screen.getByText('Add New Schedule')).toBeInTheDocument()

      fireEvent.click(screen.getByText('Cancel'))

      await waitFor(() => {
        expect(screen.queryByText('Add New Schedule')).not.toBeInTheDocument()
      })
    })
  })

  describe('Status Display', () => {
    test('should display Active status correctly', async () => {
      mockFetchSchedules.mockResolvedValue([mockSchedule])

      render(<ScheduleEditor workflowId="workflow_1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument()
      })
    })

    test('should display Inactive status correctly', async () => {
      mockFetchSchedules.mockResolvedValue([mockSchedule2])

      render(<ScheduleEditor workflowId="workflow_1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Inactive')).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    test('should show loading spinner during save operations', async () => {
      mockFetchSchedules.mockResolvedValue([])
      mockCreateSchedule.mockImplementation(() => new Promise(resolve => 
        setTimeout(() => resolve(mockSchedule), 100)
      ))

      render(<ScheduleEditor workflowId="workflow_1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Add Schedule')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Add Schedule'))
      fireEvent.change(screen.getByLabelText(/Cron Expression/), {
        target: { value: '0 2 * * *' }
      })
      fireEvent.click(screen.getByText('Create'))

      expect(screen.getByText('Saving...')).toBeInTheDocument()
      expect(screen.getByText('Create')).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error')
      mockFetchSchedules.mockRejectedValue(networkError)

      render(<ScheduleEditor workflowId="workflow_1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    test('should handle API validation errors', async () => {
      mockFetchSchedules.mockResolvedValue([])
      const validationError = new Error('Invalid cron expression')
      mockCreateSchedule.mockRejectedValue(validationError)

      render(<ScheduleEditor workflowId="workflow_1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Add Schedule')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Add Schedule'))
      fireEvent.change(screen.getByLabelText(/Cron Expression/), {
        target: { value: 'invalid cron' }
      })
      fireEvent.click(screen.getByText('Create'))

      await waitFor(() => {
        expect(screen.getByText('Invalid cron expression')).toBeInTheDocument()
      })
    })
  })
})
