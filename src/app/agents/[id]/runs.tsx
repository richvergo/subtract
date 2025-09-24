/**
 * Agent Runs Page
 * View and manage workflow execution runs
 */

"use client"

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import RunConsole from '@/app/components/workflows/RunConsole'

export default function AgentRunsPage() {
  const params = useParams()
  const agentId = params.id as string
  
  const [runs, setRuns] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRun, setSelectedRun] = useState<any>(null)
  const [showRunConsole, setShowRunConsole] = useState(false)
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed' | 'running'>('all')

  // Load runs
  useEffect(() => {
    const loadRuns = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/agents/${agentId}/runs`)
        
        if (!response.ok) {
          throw new Error('Failed to load runs')
        }
        
        const data = await response.json()
        if (data.success) {
          setRuns(data.data)
        } else {
          throw new Error(data.error || 'Failed to load runs')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    if (agentId) {
      loadRuns()
    }
  }, [agentId])

  // Filter runs
  const filteredRuns = runs.filter(run => {
    if (filter === 'all') return true
    if (filter === 'completed') return run.status === 'completed'
    if (filter === 'failed') return run.status === 'failed'
    if (filter === 'running') return run.status === 'running'
    return true
  })

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#6c757d'
      case 'running':
        return '#007bff'
      case 'completed':
        return '#28a745'
      case 'failed':
        return '#dc3545'
      case 'skipped':
        return '#ffc107'
      case 'retrying':
        return '#17a2b8'
      default:
        return '#6c757d'
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳'
      case 'running':
        return '🔄'
      case 'completed':
        return '✅'
      case 'failed':
        return '❌'
      case 'skipped':
        return '⏭️'
      case 'retrying':
        return '🔄'
      default:
        return '❓'
    }
  }

  // Format duration
  const formatDuration = (startedAt: string, finishedAt?: string) => {
    const start = new Date(startedAt)
    const end = finishedAt ? new Date(finishedAt) : new Date()
    const duration = end.getTime() - start.getTime()
    
    if (duration < 1000) {
      return `${duration}ms`
    } else if (duration < 60000) {
      return `${Math.round(duration / 1000)}s`
    } else {
      return `${Math.round(duration / 60000)}m ${Math.round((duration % 60000) / 1000)}s`
    }
  }

  // Handle run selection
  const handleRunSelect = (run: any) => {
    setSelectedRun(run)
    setShowRunConsole(true)
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
        Loading runs...
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
          Workflow Runs
        </h1>
        
        <p style={{
          fontSize: '16px',
          color: '#666',
          margin: '8px 0 0 0'
        }}>
          View and manage execution runs for this workflow
        </p>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        alignItems: 'center'
      }}>
        <span style={{
          fontSize: '14px',
          fontWeight: '500',
          color: '#495057'
        }}>
          Filter:
        </span>
        
        {[
          { id: 'all', label: 'All', count: runs.length },
          { id: 'completed', label: 'Completed', count: runs.filter(r => r.status === 'completed').length },
          { id: 'failed', label: 'Failed', count: runs.filter(r => r.status === 'failed').length },
          { id: 'running', label: 'Running', count: runs.filter(r => r.status === 'running').length }
        ].map(filterOption => (
          <button
            key={filterOption.id}
            onClick={() => setFilter(filterOption.id as any)}
            style={{
              background: filter === filterOption.id ? '#007bff' : 'transparent',
              color: filter === filterOption.id ? '#fff' : '#6c757d',
              border: `1px solid ${filter === filterOption.id ? '#007bff' : '#ced4da'}`,
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
          >
            {filterOption.label} ({filterOption.count})
          </button>
        ))}
      </div>

      {/* Runs List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredRuns.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            fontSize: '16px',
            color: '#6c757d',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            No runs found
          </div>
        ) : (
          filteredRuns.map((run, index) => (
            <div
              key={index}
              style={{
                padding: '20px',
                backgroundColor: '#fff',
                borderRadius: '8px',
                border: '1px solid #dee2e6',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}
              onClick={() => handleRunSelect(run)}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    margin: '0 0 4px 0',
                    color: '#333'
                  }}>
                    Run {run.id}
                  </h3>
                  
                  <p style={{
                    fontSize: '14px',
                    color: '#6c757d',
                    margin: 0
                  }}>
                    Started {new Date(run.startedAt).toLocaleString()}
                  </p>
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 16px',
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

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '16px',
                marginBottom: '12px'
              }}>
                <div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6c757d',
                    marginBottom: '4px'
                  }}>
                    Duration
                  </div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#333'
                  }}>
                    {formatDuration(run.startedAt, run.finishedAt)}
                  </div>
                </div>
                
                <div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6c757d',
                    marginBottom: '4px'
                  }}>
                    Started
                  </div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#333'
                  }}>
                    {new Date(run.startedAt).toLocaleTimeString()}
                  </div>
                </div>
                
                {run.finishedAt && (
                  <div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6c757d',
                      marginBottom: '4px'
                    }}>
                      Finished
                    </div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#333'
                    }}>
                      {new Date(run.finishedAt).toLocaleTimeString()}
                    </div>
                  </div>
                )}
                
                {run.result && (
                  <div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6c757d',
                      marginBottom: '4px'
                    }}>
                      Actions Executed
                    </div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#333'
                    }}>
                      {run.result.actionsExecuted || 0}
                    </div>
                  </div>
                )}
              </div>

              {run.error && (
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f8d7da',
                  borderRadius: '6px',
                  border: '1px solid #f5c6cb',
                  color: '#721c24',
                  fontSize: '14px',
                  marginTop: '12px'
                }}>
                  <strong>Error:</strong> {run.error}
                </div>
              )}

              {run.result && run.result.errors && run.result.errors.length > 0 && (
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f8d7da',
                  borderRadius: '6px',
                  border: '1px solid #f5c6cb',
                  color: '#721c24',
                  fontSize: '14px',
                  marginTop: '12px'
                }}>
                  <strong>Execution Errors:</strong>
                  <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
                    {run.result.errors.map((error: string, errorIndex: number) => (
                      <li key={errorIndex}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid #e9ecef'
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRunSelect(run)
                  }}
                  style={{
                    background: '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  View Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Run Console Modal */}
      {showRunConsole && selectedRun && (
        <RunConsole
          runId={selectedRun.id}
          onClose={() => {
            setShowRunConsole(false)
            setSelectedRun(null)
          }}
        />
      )}
    </div>
  )
}
