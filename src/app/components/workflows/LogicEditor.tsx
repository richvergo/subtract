/**
 * LogicEditor Component
 * Visual editor for workflow logic with natural language compilation
 */

"use client"

import React, { useState, useEffect } from 'react'
import { LogicSpec, validateLogicSpec } from '@/lib/agents/logic/schemas'
import { env } from '@/lib/env'

interface LogicEditorProps {
  workflowId: string
  logicSpec: LogicSpec | null
  onSave: (logicSpec: LogicSpec) => void
  onValidate?: (logicSpec: LogicSpec) => Promise<{ success: boolean; errors: string[] }>
}

type Status = "idle" | "compiling" | "error" | "success"

export default function LogicEditor({ workflowId, logicSpec, onSave, onValidate }: LogicEditorProps) {
  // Core state
  const [actions, setActions] = useState<any[]>([])
  const [variables, setVariables] = useState<any[]>([])
  const [selectedAction, setSelectedAction] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isValidating, setIsValidating] = useState(false)
  
  // Natural language rules state
  const [nlRules, setNlRules] = useState<string>('')
  const [compiledSpec, setCompiledSpec] = useState<LogicSpec | null>(null)
  const [status, setStatus] = useState<Status>("idle")
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'natural' | 'preview'>('natural')

  // Initialize data from logic spec
  useEffect(() => {
    if (logicSpec) {
      setActions(logicSpec.actions || [])
      setVariables(logicSpec.variables || [])
    }
  }, [logicSpec])

  // Add new action
  const addAction = () => {
    const newAction = {
      id: `action_${Date.now()}`,
      type: 'click',
      selector: '',
      value: '',
      order: actions.length
    }
    setActions(prev => [...prev, newAction])
    setSelectedAction(newAction)
    setIsEditing(true)
  }

  // Update action
  const updateAction = (actionId: string, updates: any) => {
    setActions(prev => prev.map(action => 
      action.id === actionId ? { ...action, ...updates } : action
    ))
  }

  // Delete action
  const deleteAction = (actionId: string) => {
    setActions(prev => prev.filter(action => action.id !== actionId))
    if (selectedAction?.id === actionId) {
      setSelectedAction(null)
      setIsEditing(false)
    }
  }

  // Move action up
  const moveActionUp = (actionId: string) => {
    const index = actions.findIndex(action => action.id === actionId)
    if (index > 0) {
      const newActions = [...actions]
      const temp = newActions[index]
      newActions[index] = newActions[index - 1]
      newActions[index - 1] = temp
      setActions(newActions)
    }
  }

  // Move action down
  const moveActionDown = (actionId: string) => {
    const index = actions.findIndex(action => action.id === actionId)
    if (index < actions.length - 1) {
      const newActions = [...actions]
      const temp = newActions[index]
      newActions[index] = newActions[index + 1]
      newActions[index + 1] = temp
      setActions(newActions)
    }
  }

  // Validate logic
  const handleValidate = async () => {
    setIsValidating(true)
    try {
      const result = await onValidate({
        ...logicSpec,
        actions,
        variables
      })
      setValidationErrors(result.errors)
    } catch (error) {
      setValidationErrors(['Validation failed'])
    } finally {
      setIsValidating(false)
    }
  }


  // Compile natural language rules
  const handleCompile = async () => {
    if (!nlRules.trim()) {
      setError('Please enter natural language rules')
      setStatus("error")
      return
    }

    setStatus("compiling")
    setError(null)

    try {
      const apiBaseUrl = env.NEXT_PUBLIC_API_BASE_URL || ''
      const response = await fetch(`${apiBaseUrl}/api/agents/${workflowId}/generate-logic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nlRules,
          variables
        })
      })

      const result = await response.json()

      if (!response.ok) {
        const errorMessage = result.details ? result.details.join(', ') : result.error || 'Compilation failed'
        setError(errorMessage)
        setStatus("error")
        return
      }

      if (result.success && result.data?.spec) {
        // Validate the response with Zod
        try {
          const validatedSpec = validateLogicSpec(result.data.spec)
          setCompiledSpec(validatedSpec)
          setStatus("success")
          setError(null)
        } catch (validationError) {
          setError('Invalid LogicSpec received from server')
          setStatus("error")
        }
      } else {
        setError('Invalid response from server')
        setStatus("error")
      }
    } catch (error) {
      setError('Failed to compile natural language rules')
      setStatus("error")
    }
  }

  // Save compiled logic
  const handleSave = async () => {
    if (!compiledSpec) {
      setError('No compiled logic to save')
      setStatus("error")
      return
    }

    try {
      onSave(compiledSpec)
      setStatus("success")
      setError(null)
    } catch (error) {
      setError('Failed to save logic')
      setStatus("error")
    }
  }

  // Get action icon
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'click':
        return '🖱️'
      case 'type':
        return '⌨️'
      case 'select':
        return '📋'
      case 'navigate':
        return '🧭'
      case 'scroll':
        return '📜'
      case 'wait':
        return '⏳'
      default:
        return '❓'
    }
  }

  // Get action color
  const getActionColor = (type: string) => {
    switch (type) {
      case 'click':
        return '#007bff'
      case 'type':
        return '#28a745'
      case 'select':
        return '#ffc107'
      case 'navigate':
        return '#17a2b8'
      case 'scroll':
        return '#6f42c1'
      case 'wait':
        return '#6c757d'
      default:
        return '#6c757d'
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
          🔧 Logic Editor
        </h3>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleValidate}
            disabled={isValidating}
            style={{
              background: '#17a2b8',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: isValidating ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: isValidating ? 0.6 : 1
            }}
          >
            {isValidating ? 'Validating...' : 'Validate'}
          </button>
          
          <button
            onClick={handleSave}
            style={{
              background: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Save Logic
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #dee2e6',
        marginBottom: '24px'
      }}>
        <button
          onClick={() => setActiveTab('natural')}
          style={{
            background: 'none',
            border: 'none',
            padding: '12px 24px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            color: activeTab === 'natural' ? '#007bff' : '#6c757d',
            borderBottom: activeTab === 'natural' ? '2px solid #007bff' : '2px solid transparent',
            transition: 'all 0.2s ease'
          }}
        >
          📝 Natural Language
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          style={{
            background: 'none',
            border: 'none',
            padding: '12px 24px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            color: activeTab === 'preview' ? '#007bff' : '#6c757d',
            borderBottom: activeTab === 'preview' ? '2px solid #007bff' : '2px solid transparent',
            transition: 'all 0.2s ease'
          }}
        >
          🔍 Preview
        </button>
      </div>

      {/* Status Display */}
      {status === "error" && error && (
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
            ❌ Compilation Error
          </h4>
          <p style={{ margin: 0, fontSize: '14px' }}>
            {error}
          </p>
        </div>
      )}

      {status === "success" && (
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#d4edda',
          borderRadius: '6px',
          border: '1px solid #c3e6cb',
          color: '#155724'
        }}>
          <h4 style={{
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '8px'
          }}>
            ✅ Compilation Successful
          </h4>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Logic compiled successfully. Review the preview and save when ready.
          </p>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
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
            ❌ Validation Errors
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {validationErrors.map((error, index) => (
              <li key={index} style={{ fontSize: '14px' }}>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'natural' && (
        <div>
          <h4 style={{
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '16px',
            color: '#495057'
          }}>
            📝 Natural Language Rules
          </h4>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '6px',
              color: '#495057'
            }}>
              Enter your rules in natural language:
            </label>
            <textarea
              value={nlRules}
              onChange={(e) => setNlRules(e.target.value)}
              placeholder="Example: Loop over all jobs in last month. Skip processing if the result is empty. Retry failed operations up to 3 times."
              style={{
                width: '100%',
                height: '200px',
                padding: '12px',
                border: '1px solid #ced4da',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'monospace',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <button
              onClick={handleCompile}
              disabled={status === "compiling"}
              style={{
                background: '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 20px',
                cursor: status === "compiling" ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: status === "compiling" ? 0.6 : 1
              }}
            >
              {status === "compiling" ? 'Compiling...' : 'Compile'}
            </button>
          </div>

          {/* Example Hints */}
          <div style={{
            padding: '16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            border: '1px solid #e9ecef'
          }}>
            <h5 style={{
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '8px',
              color: '#495057'
            }}>
              💡 Example Rules:
            </h5>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#6c757d' }}>
              <li>Loop over all jobs in last month</li>
              <li>Skip processing if the result is empty</li>
              <li>Retry failed operations up to 3 times</li>
              <li>Wait 5 seconds before retrying</li>
              <li>For each item in the job list, execute the login action</li>
            </ul>
          </div>
        </div>
      )}

      {/* Preview Tab */}
      {activeTab === 'preview' && (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h4 style={{
              fontSize: '18px',
              fontWeight: '600',
              margin: 0,
              color: '#495057'
            }}>
              🔍 Compiled LogicSpec Preview
            </h4>
            
            {compiledSpec && (
              <button
                onClick={handleSave}
                style={{
                  background: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Save Logic
              </button>
            )}
          </div>
          
          {compiledSpec ? (
            <div style={{
              padding: '16px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #e9ecef',
              maxHeight: '500px',
              overflow: 'auto'
            }}>
              <pre style={{
                margin: 0,
                fontSize: '12px',
                color: '#495057',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
              }}>
                {JSON.stringify(compiledSpec, null, 2)}
              </pre>
            </div>
          ) : (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#6c757d',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <p style={{ margin: 0, fontSize: '14px' }}>
                Compile natural language rules to see the structured LogicSpec preview
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
