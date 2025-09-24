/**
 * ScheduleEditor Component
 * Editor for scheduling workflow executions with full API integration
 */

"use client"

import React, { useState, useEffect } from 'react'
import { z } from 'zod'
import { WorkflowSchedule, CreateWorkflowScheduleInput, UpdateWorkflowScheduleInput, WorkflowScheduleSchema } from '@/lib/schemas/agents'
import { fetchSchedules, createSchedule, updateSchedule, deleteSchedule, validateCronExpression, calculateNextRunTime } from '@/lib/api/schedules'
import { useValidatedApiCall, ApiErrorDisplay, ApiLoadingDisplay } from '../system/withConnectionValidation'

interface ScheduleEditorProps {
  workflowId: string
}

export default function ScheduleEditor({ workflowId }: ScheduleEditorProps) {
  // State management
  const [schedules, setSchedules] = useState<WorkflowSchedule[]>([])
  const [editingSchedule, setEditingSchedule] = useState<WorkflowSchedule | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  // Connection validation
  const { callApi, isLoading: isApiLoading, error: apiError } = useValidatedApiCall(
    `/api/agents/${workflowId}/schedule`,
    z.object({
      success: z.boolean(),
      data: z.array(WorkflowScheduleSchema)
    })
  )

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    cronExpression: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    isActive: true,
    runConfig: {},
    variables: {},
    metadata: {}
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Fetch schedules on component mount
  useEffect(() => {
    loadSchedules()
  }, [workflowId])

  const loadSchedules = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const fetchedSchedules = await fetchSchedules(workflowId)
      setSchedules(fetchedSchedules)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedules')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddSchedule = () => {
    setEditingSchedule(null)
    setFormData({
      name: '',
      cronExpression: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      isActive: true,
      runConfig: {},
      variables: {},
      metadata: {}
    })
    setFormErrors({})
    setShowModal(true)
  }

  const handleEditSchedule = (schedule: WorkflowSchedule) => {
    setEditingSchedule(schedule)
    setFormData({
      name: schedule.name || '',
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      isActive: schedule.isActive,
      runConfig: schedule.runConfig || {},
      variables: schedule.variables || {},
      metadata: schedule.metadata || {}
    })
    setFormErrors({})
    setShowModal(true)
  }

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      await deleteSchedule(workflowId, scheduleId)
      
      // Optimistic update
      setSchedules(prev => prev.filter(s => s.id !== scheduleId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete schedule')
    } finally {
      setIsSaving(false)
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.cronExpression.trim()) {
      errors.cronExpression = 'Cron expression is required'
    } else {
      const validation = validateCronExpression(formData.cronExpression)
      if (!validation.isValid) {
        errors.cronExpression = validation.error || 'Invalid cron expression'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      if (editingSchedule) {
        // Update existing schedule
        const updatedSchedule = await updateSchedule(workflowId, editingSchedule.id, formData)
        
        // Optimistic update
        setSchedules(prev => 
          prev.map(s => s.id === editingSchedule.id ? updatedSchedule : s)
        )
      } else {
        // Create new schedule
        const newSchedule = await createSchedule(workflowId, {
          ...formData,
          workflowId
        })
        
        // Optimistic update
        setSchedules(prev => [...prev, newSchedule])
      }

      setShowModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save schedule')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setShowModal(false)
    setEditingSchedule(null)
    setFormErrors({})
  }

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const formatNextRunTime = (schedule: WorkflowSchedule) => {
    const nextRun = calculateNextRunTime(schedule.cronExpression, schedule.timezone)
    return nextRun ? nextRun.toLocaleString() : 'Unable to calculate'
  }

  // Common cron expressions for quick selection
  const commonCronExpressions = [
    { label: 'Every minute', value: '* * * * *' },
    { label: 'Every 5 minutes', value: '*/5 * * * *' },
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every day at midnight', value: '0 0 * * *' },
    { label: 'Every weekday at 9 AM', value: '0 9 * * 1-5' },
    { label: 'Every Sunday at 2 AM', value: '0 2 * * 0' },
    { label: 'Every month on the 1st at 3 AM', value: '0 3 1 * *' }
  ]

  // Show API error if connection validation fails
  if (apiError) {
    return (
      <ApiErrorDisplay 
        error={apiError} 
        retry={() => window.location.reload()} 
        endpoint={`/api/agents/${workflowId}/schedule`}
      />
    )
  }

  // Show loading state
  if (isLoading || isApiLoading) {
    return (
      <ApiLoadingDisplay endpoint={`/api/agents/${workflowId}/schedule`} />
    )
  }

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '8px',
      border: '1px solid #dee2e6',
      padding: '24px',
      marginBottom: '24px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h3 style={{
          fontSize: '20px',
          fontWeight: '600',
          margin: 0,
          color: '#333'
        }}>
          📅 Schedule Management
        </h3>
        
        <button
          onClick={handleAddSchedule}
          style={{
            background: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 20px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          + Add Schedule
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '12px 16px',
          borderRadius: '6px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}

      {/* Schedules List */}
      {schedules.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#6c757d'
        }}>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>No schedules configured</div>
          <div style={{ fontSize: '14px' }}>Click "Add Schedule" to create your first schedule</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px'
          }}>
            <thead>
              <tr style={{
                backgroundColor: '#f8f9fa',
                borderBottom: '2px solid #dee2e6'
              }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Cron Expression</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Next Run</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule) => (
                <tr key={schedule.id} style={{
                  borderBottom: '1px solid #dee2e6'
                }}>
                  <td style={{ padding: '12px' }}>
                    {schedule.name || 'Unnamed Schedule'}
                  </td>
                  <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                    {schedule.cronExpression}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {formatNextRunTime(schedule)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: schedule.isActive ? '#d4edda' : '#f8d7da',
                      color: schedule.isActive ? '#155724' : '#721c24'
                    }}>
                      {schedule.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleEditSchedule(schedule)}
                        style={{
                          background: '#6c757d',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        disabled={isSaving}
                        style={{
                          background: isSaving ? '#6c757d' : '#dc3545',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          cursor: isSaving ? 'not-allowed' : 'pointer',
                          fontSize: '12px',
                          opacity: isSaving ? 0.6 : 1
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Add/Edit Schedule */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '20px',
              color: '#333'
            }}>
              {editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}
            </h3>

            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              {/* Schedule Name */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '6px',
                  color: '#495057'
                }}>
                  Schedule Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="e.g., Daily Backup, Weekly Report"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${formErrors.name ? '#dc3545' : '#ced4da'}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Cron Expression */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '6px',
                  color: '#495057'
                }}>
                  Cron Expression *
                </label>
                <input
                  type="text"
                  value={formData.cronExpression}
                  onChange={(e) => handleFormChange('cronExpression', e.target.value)}
                  placeholder="0 9 * * 1-5"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${formErrors.cronExpression ? '#dc3545' : '#ced4da'}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box'
                  }}
                />
                {formErrors.cronExpression && (
                  <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                    {formErrors.cronExpression}
                  </div>
                )}
              </div>

              {/* Common Cron Expressions */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: '#495057'
                }}>
                  Quick Select:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                  {commonCronExpressions.map((expr, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleFormChange('cronExpression', expr.value)}
                      style={{
                        background: 'none',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        textAlign: 'left',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#e9ecef'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <div style={{ fontWeight: '500', color: '#333' }}>
                        {expr.label}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6c757d', fontFamily: 'monospace' }}>
                        {expr.value}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Timezone */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '6px',
                  color: '#495057'
                }}>
                  Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => handleFormChange('timezone', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Paris (CET)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                  <option value="Asia/Shanghai">Shanghai (CST)</option>
                  <option value="Australia/Sydney">Sydney (AEST)</option>
                </select>
              </div>

              {/* Active Status */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => handleFormChange('isActive', e.target.checked)}
                    style={{ margin: 0 }}
                  />
                  <span style={{ fontSize: '14px', color: '#495057' }}>
                    Active (schedule will run)
                  </span>
                </label>
              </div>

              {/* Form Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid #dee2e6'
              }}>
                <button
                  type="button"
                  onClick={handleCancel}
                  style={{
                    background: '#6c757d',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    background: isSaving ? '#6c757d' : '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 20px',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: isSaving ? 0.6 : 1
                  }}
                >
                  {isSaving ? 'Saving...' : (editingSchedule ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}