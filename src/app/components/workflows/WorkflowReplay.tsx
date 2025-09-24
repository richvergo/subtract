/**
 * WorkflowReplay Component
 * Enterprise-grade workflow replay interface with step-by-step validation
 */

"use client"

import React, { useState, useEffect } from 'react'
import { z } from 'zod'

// API Response schemas
const WorkflowActionSchema = z.object({
  id: z.string(),
  type: z.enum(['click', 'type', 'select', 'navigate', 'scroll', 'wait', 'hover', 'double_click', 'right_click', 'drag_drop', 'key_press', 'screenshot', 'custom']),
  selector: z.string(),
  value: z.string().optional(),
  url: z.string().optional(),
  coordinates: z.object({
    x: z.number(),
    y: z.number()
  }).optional(),
  waitFor: z.string().optional(),
  timeout: z.number().optional(),
  retryCount: z.number().optional(),
  dependencies: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  order: z.number()
})

const RunLogSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  level: z.enum(['debug', 'info', 'warn', 'error']),
  message: z.string(),
  actionId: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional()
})

const ApiResponseSchema = z.object({
  success: z.boolean(),
  steps: z.array(WorkflowActionSchema).optional(),
  validationLogs: z.array(RunLogSchema).optional(),
  data: z.any().optional(),
  error: z.string().optional()
})

type WorkflowAction = z.infer<typeof WorkflowActionSchema>
type RunLog = z.infer<typeof RunLogSchema>

interface WorkflowReplayProps {
  workflowId: string
  onRunComplete?: (result: any) => void
  onRunError?: (error: string) => void
}

type Status = 'idle' | 'loading' | 'validating' | 'error'

export default function WorkflowReplay({ workflowId, onRunComplete, onRunError }: WorkflowReplayProps) {
  // State management
  const [steps, setSteps] = useState<WorkflowAction[]>([])
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [status, setStatus] = useState<Status>('idle')
  const [logs, setLogs] = useState<RunLog[]>([])
  const [error, setError] = useState<string | null>(null)
  const [highlightedStepId, setHighlightedStepId] = useState<string | null>(null)

  // API Configuration
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
  
  // Fetch workflow steps on mount
  useEffect(() => {
    fetchSteps()
  }, [workflowId])

  // Fetch workflow steps from API
  const fetchSteps = async () => {
    try {
      setStatus('loading')
      setError(null)

      console.log('🔍 Fetching workflow steps:', workflowId)

      const response = await fetch(`${API_BASE_URL}/api/agents/${workflowId}/validate`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      // Validate API response with Zod
      const validatedResult = ApiResponseSchema.parse(result)
      
      if (validatedResult.success && validatedResult.steps && validatedResult.validationLogs) {
        setSteps(validatedResult.steps)
        setLogs(validatedResult.validationLogs)
        setStatus('idle')
        console.log('✅ Workflow steps loaded:', validatedResult.steps.length)
      } else {
        throw new Error(validatedResult.error || 'Failed to load workflow steps')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      setStatus('error')
      onRunError?.(errorMessage)
      console.error('❌ Failed to fetch workflow steps:', err)
    }
  }

  // Highlight step in browser
  const highlightStep = async (stepId: string) => {
    try {
      setStatus('validating')

      console.log('🎯 Highlighting step:', stepId)

      const response = await fetch(`${API_BASE_URL}/api/agents/${workflowId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ stepId })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setHighlightedStepId(stepId)
        setStatus('idle')
        console.log('✅ Step highlighted successfully')
      } else {
        throw new Error(result.error || 'Failed to highlight step')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      setStatus('error')
      console.error('❌ Failed to highlight step:', err)
    }
  }

  // Replay Controls
  const playAll = async () => {
    if (steps.length === 0) return
    
    setCurrentStep(0)
    setHighlightedStepId(null)
    
    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i)
      await highlightStep(steps[i].id)
      // Add delay between steps for visual effect
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  const stepForward = async () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1
      setCurrentStep(nextStep)
      await highlightStep(steps[nextStep].id)
    }
  }

  const reset = () => {
    setCurrentStep(0)
    setHighlightedStepId(null)
    setError(null)
  }

  // Get log level color
  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return '#dc3545'
      case 'warn':
        return '#ffc107'
      case 'info':
        return '#007bff'
      case 'debug':
        return '#6c757d'
      default:
        return '#495057'
    }
  }

  // Get action type icon
  const getActionTypeIcon = (type: string) => {
    switch (type) {
      case 'click':
        return '👆'
      case 'type':
        return '⌨️'
      case 'select':
        return '📋'
      case 'navigate':
        return '🌐'
      case 'scroll':
        return '📜'
      case 'wait':
        return '⏱️'
      case 'hover':
        return '🖱️'
      case 'screenshot':
        return '📸'
      default:
        return '⚙️'
    }
  }

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '8px',
      border: '1px solid #dee2e6',
      padding: '24px',
      marginBottom: '24px'
    }}>
      <h3 style={{
        fontSize: '20px',
        fontWeight: '600',
        marginBottom: '16px',
        color: '#333'
      }}>
        🎬 Workflow Replay
      </h3>

      {/* Loading State */}
      {status === 'loading' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          gap: '12px',
          color: '#007bff'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid #007bff',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          Loading workflow steps...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#f8d7da',
          borderRadius: '6px',
          border: '1px solid #f5c6cb',
          color: '#721c24'
        }}>
          <h4 style={{
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '8px'
          }}>
            ❌ Error
          </h4>
          <p style={{ margin: 0, fontSize: '14px' }}>
            {error}
          </p>
        </div>
      )}

      {/* Replay Controls */}
      {status !== 'loading' && steps.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          alignItems: 'center'
        }}>
          <button
            onClick={playAll}
            disabled={status === 'validating'}
            style={{
              background: status === 'validating' ? '#6c757d' : '#28a745',
              color: '#fff',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: status === 'validating' ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.2s ease'
            }}
          >
            <span>▶️</span>
            Play All
          </button>

          <button
            onClick={stepForward}
            disabled={status === 'validating' || currentStep >= steps.length - 1}
            style={{
              background: (status === 'validating' || currentStep >= steps.length - 1) ? '#6c757d' : '#007bff',
              color: '#fff',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: (status === 'validating' || currentStep >= steps.length - 1) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.2s ease'
            }}
          >
            <span>⏭️</span>
            Step Forward
          </button>

          <button
            onClick={reset}
            disabled={status === 'validating'}
            style={{
              background: status === 'validating' ? '#6c757d' : '#6c757d',
              color: '#fff',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: status === 'validating' ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.2s ease'
            }}
          >
            <span>🔄</span>
            Reset
          </button>

          {status === 'validating' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#007bff',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                border: '2px solid #007bff',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Highlighting step...
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      {status !== 'loading' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          minHeight: '400px'
        }}>
          {/* Left Panel: Steps List */}
          <div style={{
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px',
              backgroundColor: '#f8f9fa',
              borderBottom: '1px solid #dee2e6',
              fontWeight: '600'
            }}>
              📋 Workflow Steps ({steps.length})
            </div>
            
            <div style={{
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {steps.length === 0 ? (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#6c757d'
                }}>
                  No steps available
                </div>
              ) : (
                steps.map((step, index) => (
                  <div
                    key={step.id}
                    onClick={() => highlightStep(step.id)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #e9ecef',
                      cursor: 'pointer',
                      backgroundColor: highlightedStepId === step.id ? '#e8f4fd' : 
                                      index === currentStep ? '#fff3cd' : '#fff',
                      transition: 'background-color 0.2s ease'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px'
                    }}>
                      <span style={{ fontSize: '16px' }}>
                        {getActionTypeIcon(step.type)}
                      </span>
                      <span style={{
                        fontWeight: '600',
                        color: index === currentStep ? '#856404' : '#333'
                      }}>
                        Step {index + 1}: {step.type}
                      </span>
                      {highlightedStepId === step.id && (
                        <span style={{
                          fontSize: '12px',
                          color: '#007bff',
                          fontWeight: '500'
                        }}>
                          (Highlighted)
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6c757d',
                      marginLeft: '24px'
                    }}>
                      {step.selector}
                    </div>
                    {step.value && (
                      <div style={{
                        fontSize: '12px',
                        color: '#6c757d',
                        marginLeft: '24px'
                      }}>
                        Value: {step.value}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Panel: Preview Area */}
          <div style={{
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px',
              backgroundColor: '#f8f9fa',
              borderBottom: '1px solid #dee2e6',
              fontWeight: '600'
            }}>
              🖥️ Preview Area
            </div>
            
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#6c757d',
              minHeight: '300px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
                <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                  Step Preview
                </div>
                <div style={{ fontSize: '14px' }}>
                  Click on a step to highlight it in the browser
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Logs Section */}
      {logs.length > 0 && (
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          border: '1px solid #e9ecef'
        }}>
          <h4 style={{
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '12px',
            color: '#495057'
          }}>
            📋 Validation Logs
          </h4>
          
          <div style={{
            maxHeight: '200px',
            overflowY: 'auto',
            fontSize: '12px',
            fontFamily: 'monospace'
          }}>
            {logs.map((log, index) => (
              <div key={log.id || index} style={{
                padding: '4px 0',
                borderBottom: '1px solid #e9ecef',
                color: getLogLevelColor(log.level)
              }}>
                <span style={{ color: '#6c757d' }}>
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>
                <span style={{ 
                  marginLeft: '8px', 
                  fontWeight: '500',
                  color: getLogLevelColor(log.level)
                }}>
                  [{log.level.toUpperCase()}]
                </span>
                <span style={{ marginLeft: '8px' }}>
                  {log.message}
                </span>
                {log.actionId && (
                  <span style={{ 
                    marginLeft: '8px', 
                    fontSize: '11px',
                    color: '#6c757d'
                  }}>
                    (Action: {log.actionId})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSS for spin animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
