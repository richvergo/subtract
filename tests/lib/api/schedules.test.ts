/**
 * Schedule API Functions Tests
 * Test suite for schedule API integration functions
 */

import { 
  fetchSchedules, 
  createSchedule, 
  updateSchedule, 
  deleteSchedule,
  validateCronExpression,
  calculateNextRunTime
} from '@/lib/api/schedules'

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

describe('Schedule API Functions', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('fetchSchedules', () => {
    test('should fetch schedules successfully', async () => {
      const mockSchedules = [
        {
          id: 'schedule_1',
          workflowId: 'workflow_1',
          name: 'Daily Backup',
          cronExpression: '0 2 * * *',
          timezone: 'UTC',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSchedules })
      } as Response)

      const result = await fetchSchedules('workflow_1')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/agents/workflow_1/schedule',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        })
      )
      expect(result).toEqual(mockSchedules)
    })

    test('should throw error when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to fetch schedules' })
      } as Response)

      await expect(fetchSchedules('workflow_1')).rejects.toThrow('Failed to fetch schedules')
    })

    test('should throw error when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      } as Response)

      await expect(fetchSchedules('workflow_1')).rejects.toThrow('Internal server error')
    })
  })

  describe('createSchedule', () => {
    test('should create schedule successfully', async () => {
      const scheduleData = {
        workflowId: 'workflow_1',
        name: 'Daily Backup',
        cronExpression: '0 2 * * *',
        timezone: 'UTC',
        isActive: true,
        runConfig: {},
        variables: {},
        metadata: {}
      }

      const mockCreatedSchedule = {
        id: 'schedule_1',
        ...scheduleData,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockCreatedSchedule })
      } as Response)

      const result = await createSchedule('workflow_1', scheduleData)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/agents/workflow_1/schedule',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(scheduleData)
        })
      )
      expect(result).toEqual(mockCreatedSchedule)
    })

    test('should throw error when creation fails', async () => {
      const scheduleData = {
        workflowId: 'workflow_1',
        name: 'Daily Backup',
        cronExpression: '0 2 * * *',
        timezone: 'UTC',
        isActive: true,
        runConfig: {},
        variables: {},
        metadata: {}
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to create schedule' })
      } as Response)

      await expect(createSchedule('workflow_1', scheduleData)).rejects.toThrow('Failed to create schedule')
    })
  })

  describe('updateSchedule', () => {
    test('should update schedule successfully', async () => {
      const updateData = {
        name: 'Updated Backup',
        cronExpression: '0 3 * * *',
        isActive: false
      }

      const mockUpdatedSchedule = {
        id: 'schedule_1',
        workflowId: 'workflow_1',
        ...updateData,
        timezone: 'UTC',
        runConfig: {},
        variables: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockUpdatedSchedule })
      } as Response)

      const result = await updateSchedule('workflow_1', 'schedule_1', updateData)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/agents/workflow_1/schedule?scheduleId=schedule_1',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updateData)
        })
      )
      expect(result).toEqual(mockUpdatedSchedule)
    })

    test('should throw error when update fails', async () => {
      const updateData = { name: 'Updated Backup' }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to update schedule' })
      } as Response)

      await expect(updateSchedule('workflow_1', 'schedule_1', updateData)).rejects.toThrow('Failed to update schedule')
    })
  })

  describe('deleteSchedule', () => {
    test('should delete schedule successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { scheduleId: 'schedule_1', deleted: true } })
      } as Response)

      const result = await deleteSchedule('workflow_1', 'schedule_1')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/agents/workflow_1/schedule?scheduleId=schedule_1',
        expect.objectContaining({
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        })
      )
      expect(result).toEqual({ scheduleId: 'schedule_1', deleted: true })
    })

    test('should throw error when deletion fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to delete schedule' })
      } as Response)

      await expect(deleteSchedule('workflow_1', 'schedule_1')).rejects.toThrow('Failed to delete schedule')
    })
  })

  describe('validateCronExpression', () => {
    test('should validate correct cron expressions', () => {
      const validCrons = [
        '0 2 * * *',      // Every day at 2 AM
        '*/5 * * * *',    // Every 5 minutes
        '0 9 * * 1-5',    // Every weekday at 9 AM
        '0 0 1 * *',      // Every month on the 1st at midnight
        '30 14 * * 0'     // Every Sunday at 2:30 PM
      ]

      validCrons.forEach(cron => {
        const result = validateCronExpression(cron)
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
      })
    })

    test('should reject invalid cron expressions', () => {
      const invalidCrons = [
        { cron: '0 2 * *', error: 'Cron expression must have exactly 5 parts' },
        { cron: '0 2 * * * *', error: 'Cron expression must have exactly 5 parts' },
        { cron: '60 2 * * *', error: 'Minute field must be between 0-59' },
        { cron: '0 25 * * *', error: 'Hour field must be between 0-23' },
        { cron: '0 2 32 * *', error: 'Day field must be between 1-31' },
        { cron: '0 2 * 13 *', error: 'Month field must be between 1-12' },
        { cron: '0 2 * * 8', error: 'Weekday field must be between 0-7' }
      ]

      invalidCrons.forEach(({ cron, error }) => {
        const result = validateCronExpression(cron)
        expect(result.isValid).toBe(false)
        expect(result.error).toBe(error)
      })
    })

    test('should validate wildcard expressions', () => {
      const wildcardCrons = [
        '* * * * *',      // Every minute
        '0 * * * *',      // Every hour
        '0 0 * * *',      // Every day at midnight
        '0 0 1 * *',      // Every month on the 1st
        '0 0 * * 0'       // Every Sunday at midnight
      ]

      wildcardCrons.forEach(cron => {
        const result = validateCronExpression(cron)
        expect(result.isValid).toBe(true)
      })
    })

    test('should validate range expressions', () => {
      const rangeCrons = [
        '0 9-17 * * 1-5', // Every hour from 9 AM to 5 PM on weekdays
        '0 0 1-7 * *',    // First week of every month
        '0 0 * 1-6 *'     // First 6 months of the year
      ]

      rangeCrons.forEach(cron => {
        const result = validateCronExpression(cron)
        expect(result.isValid).toBe(true)
      })
    })

    test('should validate step expressions', () => {
      const stepCrons = [
        '*/5 * * * *',    // Every 5 minutes
        '0 */2 * * *',    // Every 2 hours
        '0 0 */7 * *',    // Every 7 days
        '0 9-17/2 * * 1-5' // Every 2 hours from 9 AM to 5 PM on weekdays
      ]

      stepCrons.forEach(cron => {
        const result = validateCronExpression(cron)
        expect(result.isValid).toBe(true)
      })
    })

    test('should validate list expressions', () => {
      const listCrons = [
        '0 9,17 * * 1-5', // 9 AM and 5 PM on weekdays
        '0 0 1,15 * *',   // 1st and 15th of every month
        '0 0 * 1,7,12 *'  // January, July, and December
      ]

      listCrons.forEach(cron => {
        const result = validateCronExpression(cron)
        expect(result.isValid).toBe(true)
      })
    })

    test('should reject invalid ranges', () => {
      const invalidRanges = [
        '0 2-1 * * *',    // Invalid hour range (start > end)
        '0 0 5-3 * *',    // Invalid day range
        '0 0 * 12-1 *'    // Invalid month range
      ]

      invalidRanges.forEach(cron => {
        const result = validateCronExpression(cron)
        expect(result.isValid).toBe(false)
      })
    })

    test('should reject invalid step values', () => {
      const invalidSteps = [
        '0 0 */0 * *',    // Step value of 0
        '0 0 */-1 * *',   // Negative step value
        '0 0 */abc * *'   // Non-numeric step value
      ]

      invalidSteps.forEach(cron => {
        const result = validateCronExpression(cron)
        expect(result.isValid).toBe(false)
      })
    })
  })

  describe('calculateNextRunTime', () => {
    test('should return a date for valid cron expressions', () => {
      const validCrons = [
        '0 2 * * *',
        '*/5 * * * *',
        '0 9 * * 1-5'
      ]

      validCrons.forEach(cron => {
        const result = calculateNextRunTime(cron)
        expect(result).toBeInstanceOf(Date)
        expect(result!.getTime()).toBeGreaterThan(Date.now())
      })
    })

    test('should return null for invalid cron expressions', () => {
      const invalidCrons = [
        'invalid',
        '0 2 * *',
        '60 2 * * *'
      ]

      invalidCrons.forEach(cron => {
        const result = calculateNextRunTime(cron)
        expect(result).toBeNull()
      })
    })

    test('should handle timezone parameter', () => {
      const cron = '0 2 * * *'
      const result = calculateNextRunTime(cron, 'America/New_York')
      
      expect(result).toBeInstanceOf(Date)
    })

    test('should handle errors gracefully', () => {
      // Mock console.error to avoid noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // This should not throw an error
      const result = calculateNextRunTime('invalid cron')
      
      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('API Error Handling', () => {
    test('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(fetchSchedules('workflow_1')).rejects.toThrow('Network error')
    })

    test('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        }
      } as Response)

      await expect(fetchSchedules('workflow_1')).rejects.toThrow('Invalid JSON')
    })

    test('should handle empty responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      } as Response)

      const result = await fetchSchedules('workflow_1')
      expect(result).toEqual([])
    })
  })

  describe('API Configuration', () => {
    test('should use correct API base URL', () => {
      // Mock environment variable
      const originalEnv = process.env.NEXT_PUBLIC_API_URL
      process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      } as Response)

      fetchSchedules('workflow_1')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/agents/workflow_1/schedule',
        expect.any(Object)
      )

      // Restore environment variable
      process.env.NEXT_PUBLIC_API_URL = originalEnv
    })

    test('should use default URL when env var is not set', () => {
      const originalEnv = process.env.NEXT_PUBLIC_API_URL
      delete process.env.NEXT_PUBLIC_API_URL

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      } as Response)

      fetchSchedules('workflow_1')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/agents/workflow_1/schedule',
        expect.any(Object)
      )

      // Restore environment variable
      process.env.NEXT_PUBLIC_API_URL = originalEnv
    })
  })
})
