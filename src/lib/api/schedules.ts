/**
 * API integration functions for workflow schedules
 * Handles communication with /api/agents/[id]/schedule endpoints
 */

import { CreateWorkflowScheduleInput, UpdateWorkflowScheduleInput, WorkflowSchedule } from '@/lib/schemas/agents'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

/**
 * Fetch all schedules for a workflow
 */
export async function fetchSchedules(workflowId: string): Promise<WorkflowSchedule[]> {
  const response = await fetch(`${API_BASE_URL}/api/agents/${workflowId}/schedule`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to fetch schedules')
  }

  const data = await response.json()
  return data.data || []
}

/**
 * Create a new schedule
 */
export async function createSchedule(
  workflowId: string, 
  scheduleData: CreateWorkflowScheduleInput
): Promise<WorkflowSchedule> {
  const response = await fetch(`${API_BASE_URL}/api/agents/${workflowId}/schedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(scheduleData),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to create schedule')
  }

  const data = await response.json()
  return data.data
}

/**
 * Update an existing schedule
 */
export async function updateSchedule(
  workflowId: string,
  scheduleId: string,
  scheduleData: UpdateWorkflowScheduleInput
): Promise<WorkflowSchedule> {
  const response = await fetch(`${API_BASE_URL}/api/agents/${workflowId}/schedule?scheduleId=${scheduleId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(scheduleData),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to update schedule')
  }

  const data = await response.json()
  return data.data
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(
  workflowId: string,
  scheduleId: string
): Promise<{ scheduleId: string; deleted: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/agents/${workflowId}/schedule?scheduleId=${scheduleId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to delete schedule')
  }

  const data = await response.json()
  return data.data
}

/**
 * Validate cron expression client-side
 */
export function validateCronExpression(cronExpression: string): { isValid: boolean; error?: string } {
  // Basic cron validation - 5 parts separated by spaces
  const parts = cronExpression.trim().split(/\s+/)
  
  if (parts.length !== 5) {
    return {
      isValid: false,
      error: 'Cron expression must have exactly 5 parts (minute hour day month weekday)'
    }
  }

  // Validate each part
  const [minute, hour, day, month, weekday] = parts
  
  // Minute: 0-59
  if (!isValidCronField(minute, 0, 59)) {
    return {
      isValid: false,
      error: 'Minute field must be between 0-59'
    }
  }
  
  // Hour: 0-23
  if (!isValidCronField(hour, 0, 23)) {
    return {
      isValid: false,
      error: 'Hour field must be between 0-23'
    }
  }
  
  // Day: 1-31
  if (!isValidCronField(day, 1, 31)) {
    return {
      isValid: false,
      error: 'Day field must be between 1-31'
    }
  }
  
  // Month: 1-12
  if (!isValidCronField(month, 1, 12)) {
    return {
      isValid: false,
      error: 'Month field must be between 1-12'
    }
  }
  
  // Weekday: 0-7 (0 and 7 both represent Sunday)
  if (!isValidCronField(weekday, 0, 7)) {
    return {
      isValid: false,
      error: 'Weekday field must be between 0-7 (0 and 7 represent Sunday)'
    }
  }

  return { isValid: true }
}

/**
 * Helper function to validate individual cron fields
 */
function isValidCronField(field: string, min: number, max: number): boolean {
  // Allow wildcard
  if (field === '*') return true
  
  // Allow ranges (e.g., 1-5)
  if (field.includes('-')) {
    const [start, end] = field.split('-').map(Number)
    return !isNaN(start) && !isNaN(end) && start >= min && end <= max && start <= end
  }
  
  // Allow lists (e.g., 1,3,5)
  if (field.includes(',')) {
    return field.split(',').every(val => {
      const num = Number(val)
      return !isNaN(num) && num >= min && num <= max
    })
  }
  
  // Allow step values (e.g., */5, 1-10/2)
  if (field.includes('/')) {
    const [base, step] = field.split('/')
    const stepNum = Number(step)
    if (isNaN(stepNum) || stepNum <= 0) return false
    
    // Validate the base part
    if (base === '*') return true
    if (base.includes('-')) {
      const [start, end] = base.split('-').map(Number)
      return !isNaN(start) && !isNaN(end) && start >= min && end <= max && start <= end
    }
    
    const baseNum = Number(base)
    return !isNaN(baseNum) && baseNum >= min && baseNum <= max
  }
  
  // Single number
  const num = Number(field)
  return !isNaN(num) && num >= min && num <= max
}

/**
 * Calculate next run time for a cron expression
 */
export function calculateNextRunTime(cronExpression: string, timezone: string = 'UTC'): Date | null {
  try {
    // This is a simplified implementation
    // In production, you'd want to use a proper cron library like 'node-cron' or 'cron-parser'
    
    const validation = validateCronExpression(cronExpression)
    if (!validation.isValid) {
      return null
    }
    
    // For now, return a placeholder date
    // In a real implementation, you'd parse the cron expression and calculate the actual next run time
    const now = new Date()
    const nextRun = new Date(now.getTime() + 60000) // Add 1 minute as placeholder
    
    return nextRun
  } catch (error) {
    console.error('Error calculating next run time:', error)
    return null
  }
}
