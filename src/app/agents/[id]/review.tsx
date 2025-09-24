/**
 * Agent Review Page
 * Review and configure workflow agents
 */

"use client"

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import WorkflowReplay from '@/app/components/workflows/WorkflowReplay'
import LogicEditor from '@/app/components/workflows/LogicEditor'
import VariableConfigModal from '@/app/components/workflows/VariableConfigModal'
import RunConsole from '@/app/components/workflows/RunConsole'

export default function AgentReviewPage() {
  const params = useParams()
  const agentId = params.id as string
  
  const [workflow, setWorkflow] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'logic' | 'variables' | 'runs'>('overview')
  const [showVariableModal, setShowVariableModal] = useState(false)
  const [showRunConsole, setShowRunConsole] = useState(false)
  const [currentRun, setCurrentRun] = useState<any>(null)
  const [variables, setVariables] = useState<any[]>([])
  const [runs, setRuns] = useState<any[]>([])

  // Load workflow data
  useEffect(() => {
    const loadWorkflow = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/agents/${agentId}`)
        
        if (!response.ok) {
          throw new Error('Failed to load workflow')
        }
        
        const data = await response.json()
        if (data.success) {
          setWorkflow(data.data)
          setVariables(data.data.logicSpec?.variables || [])
        } else {
          throw new Error(data.error || 'Failed to load workflow')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    if (agentId) {
      loadWorkflow()
    }
  }, [agentId])

  // Load runs
  useEffect(() => {
    const loadRuns = async () => {
      try {
        const response = await fetch(`/api/agents/${agentId}/runs`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setRuns(data.data)
          }
        }
      } catch (err) {
        console.error('Failed to load runs:', err)
      }
    }

    if (agentId) {
      loadRuns()
    }
  }, [agentId])

  // Handle workflow save
  const handleWorkflowSave = async (updatedWorkflow: any) => {
    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedWorkflow)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setWorkflow(data.data)
          console.log('✅ Workflow saved successfully')
        }
      }
    } catch (err) {
      console.error('Failed to save workflow:', err)
    }
  }

  // Handle variable save
  const handleVariableSave = async (variable: any) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/variables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(variable)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setVariables(prev => [...prev, data.data])
          setShowVariableModal(false)
          console.log('✅ Variable saved successfully')
        }
      }
    } catch (err) {
      console.error('Failed to save variable:', err)
    }
  }

  // Handle run completion
  const handleRunComplete = (result: any) => {
    setCurrentRun(result)
    setShowRunConsole(true)
  }

  // Handle run error
  const handleRunError = (error: string) => {
    console.error('Run failed:', error)
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return '#6c757d'
      case 'active':
        return '#28a745'
      case 'paused':
        return '#ffc107'
      case 'archived':
        return '#6c757d'
      case 'error':
        return '#dc3545'
      case 'testing':
        return '#17a2b8'
      default:
        return '#6c757d'
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return '📝'
      case 'active':
        return '✅'
      case 'paused':
        return '⏸️'
      case 'archived':
        return '📦'
      case 'error':
        return '❌'
      case 'testing':
        return '🧪'
      default:
        return '❓'
    }
  }

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        fontSize: '18px',
        color: '#6c757d'
      }}>
        Loading workflow...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        fontSize: '18px',
        color: '#dc3545'
      }}>
        Error: {error}
      </div>
    )
  }

  if (!workflow) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        fontSize: '18px',
        color: '#6c757d'
      }}>
        Workflow not found
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          margin: 0,
          color: '#333'
        }}>
          {workflow.name}
        </h1>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginTop: '8px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            backgroundColor: '#fff',
            borderRadius: '20px',
            border: `2px solid ${getStatusColor(workflow.status)}`
          }}>
            <span style={{ fontSize: '16px' }}>
              {getStatusIcon(workflow.status)}
            </span>
            <span style={{
              fontSize: '14px',
              fontWeight: '500',
              color: getStatusColor(workflow.status)
            }}>
              {workflow.status.toUpperCase()}
            </span>
          </div>
          
          <div style={{ fontSize: '14px', color: '#6c757d' }}>
            Created {new Date(workflow.createdAt).toLocaleDateString()}
          </div>
        </div>
        
        {workflow.description && (
          <p style={{
            fontSize: '16px',
            color: '#666',
            margin: '16px 0 0 0',
            lineHeight: '1.5'
          }}>
            {workflow.description}
          </p>
        )}
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '1px solid #dee2e6'
      }}>
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'logic', label: 'Logic', icon: '🔧' },
          { id: 'variables', label: 'Variables', icon: '📝' },
          { id: 'runs', label: 'Runs', icon: '🏃' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              background: activeTab === tab.id ? '#007bff' : 'transparent',
              color: activeTab === tab.id ? '#fff' : '#6c757d',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div>
          <WorkflowReplay
            workflowId={agentId}
            onRunComplete={handleRunComplete}
            onRunError={handleRunError}
          />
        </div>
      )}

      {activeTab === 'logic' && (
        <div>
          <LogicEditor
            workflowId={agentId}
            logicSpec={workflow.logicSpec}
            onSave={handleWorkflowSave}
            onValidate={async (logicSpec) => {
              // TODO: Implement validation endpoint
              return { success: true, errors: [] }
            }}
          />
        </div>
      )}

      {activeTab === 'variables' && (
        <div>
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
              Variables ({variables.length})
            </h3>
            
            <button
              onClick={() => setShowVariableModal(true)}
              style={{
                background: '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '12px 20px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              + Add Variable
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {variables.map((variable, index) => (
              <div
                key={index}
                style={{
                  padding: '16px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px',
                  border: '1px solid #e9ecef'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h4 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      margin: '0 0 4px 0',
                      color: '#333'
                    }}>
                      {variable.name}
                    </h4>
                    <p style={{
                      fontSize: '14px',
                      color: '#6c757d',
                      margin: '0 0 8px 0'
                    }}>
                      {variable.type} • {variable.required ? 'Required' : 'Optional'}
                    </p>
                    {variable.description && (
                      <p style={{
                        fontSize: '14px',
                        color: '#495057',
                        margin: 0
                      }}>
                        {variable.description}
                      </p>
                    )}
                  </div>
                  
                  <div style={{
                    fontSize: '12px',
                    color: '#6c757d'
                  }}>
                    {variable.defaultValue ? `Default: ${variable.defaultValue}` : 'No default'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'runs' && (
        <div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '24px',
            color: '#333'
          }}>
            Execution Runs ({runs.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {runs.map((run, index) => (
              <div
                key={index}
                style={{
                  padding: '16px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px',
                  border: '1px solid #e9ecef',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => {
                  setCurrentRun(run)
                  setShowRunConsole(true)
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h4 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      margin: '0 0 4px 0',
                      color: '#333'
                    }}>
                      Run {run.id}
                    </h4>
                    <p style={{
                      fontSize: '14px',
                      color: '#6c757d',
                      margin: '0 0 8px 0'
                    }}>
                      Started {new Date(run.startedAt).toLocaleString()}
                    </p>
                    {run.finishedAt && (
                      <p style={{
                        fontSize: '14px',
                        color: '#6c757d',
                        margin: 0
                      }}>
                        Duration: {Math.round((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s
                      </p>
                    )}
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '4px 12px',
                    backgroundColor: '#fff',
                    borderRadius: '20px',
                    border: `2px solid ${getStatusColor(run.status)}`
                  }}>
                    <span style={{ fontSize: '16px' }}>
                      {getStatusIcon(run.status)}
                    </span>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: getStatusColor(run.status)
                    }}>
                      {run.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showVariableModal && (
        <VariableConfigModal
          isOpen={showVariableModal}
          onClose={() => setShowVariableModal(false)}
          onSave={handleVariableSave}
          workflowId={agentId}
        />
      )}

      {showRunConsole && currentRun && (
        <RunConsole
          runId={currentRun.id}
          onClose={() => {
            setShowRunConsole(false)
            setCurrentRun(null)
          }}
        />
      )}
    </div>
  )
}
