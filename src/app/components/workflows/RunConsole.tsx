/**
 * RunConsole Component
 * Console interface for workflow execution monitoring with real-time log streaming
 */

"use client"

import React, { useState, useEffect, useRef } from 'react'
import { RunLog, validateRunLog } from '@/lib/agents/logic/schemas'
import { env } from '@/lib/env'

interface RunConsoleProps {
  workflowId: string
  onClose?: () => void
}

type Status = "idle" | "running" | "success" | "failed"

export default function RunConsole({ workflowId, onClose }: RunConsoleProps) {
  const [status, setStatus] = useState<Status>("idle")
  const [logs, setLogs] = useState<RunLog[]>([])
  const [runId, setRunId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current && typeof logsEndRef.current.scrollIntoView === 'function') {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  // Cleanup SSE connection on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current && typeof eventSourceRef.current.close === 'function') {
        eventSourceRef.current.close()
      }
    }
  }, [])

  // Start workflow execution
  const handleRunWorkflow = async () => {
    setStatus("running")
    setError(null)
    setLogs([])
    setRunId(null)

    try {
      const apiBaseUrl = env.NEXT_PUBLIC_API_BASE_URL || ''
      const response = await fetch(`${apiBaseUrl}/api/agents/${workflowId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variables: {},
          settings: {}
        })
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to start workflow')
        setStatus("failed")
        return
      }

      if (result.runId) {
        setRunId(result.runId)
        startLogStreaming(result.runId)
      } else {
        setError('No run ID received from server')
        setStatus("failed")
      }
    } catch (error) {
      setError('Failed to start workflow execution')
      setStatus("failed")
    }
  }

  // Start SSE log streaming
  const startLogStreaming = (runId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const apiBaseUrl = env.NEXT_PUBLIC_API_BASE_URL || ''
    const eventSource = new EventSource(`${apiBaseUrl}/api/agents/${workflowId}/run?stream=true&runId=${runId}`)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const logData = JSON.parse(event.data)
        
        // Validate log event with Zod
        const validatedLog = validateRunLog(logData)
        setLogs(prev => [...prev, validatedLog])

        // Update status based on log
        if (logData.status === 'success') {
          setStatus("success")
        } else if (logData.status === 'failed') {
          setStatus("failed")
          setError(logData.message || 'Workflow execution failed')
        }
      } catch (error) {
        console.error('Invalid log event received:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      setError('Connection lost - unable to receive live updates')
      eventSource.close()
    }

    eventSource.addEventListener('run-complete', (event) => {
      const data = JSON.parse(event.data)
      if (data.status === 'success') {
        setStatus("success")
      } else {
        setStatus("failed")
        setError(data.error || 'Workflow execution failed')
      }
      eventSource.close()
    })
  }

  // Stop workflow execution
  const handleStopRun = () => {
    if (eventSourceRef.current && typeof eventSourceRef.current.close === 'function') {
      eventSourceRef.current.close()
    }
    setStatus("idle")
    setRunId(null)
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
        return '#6c757d'
    }
  }

  // Get log level icon
  const getLogLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return '❌'
      case 'warn':
        return '⚠️'
      case 'info':
        return 'ℹ️'
      case 'debug':
        return '🐛'
      default:
        return '📝'
    }
  }

  // Get status color
  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'idle':
        return '#6c757d'
      case 'running':
        return '#007bff'
      case 'success':
        return '#28a745'
      case 'failed':
        return '#dc3545'
      default:
        return '#6c757d'
    }
  }

  // Get status icon
  const getStatusIcon = (status: Status) => {
    switch (status) {
      case 'idle':
        return '⏸️'
      case 'running':
        return '⏳'
      case 'success':
        return '✅'
      case 'failed':
        return '❌'
      default:
        return '❓'
    }
  }

  // Clear logs
  const clearLogs = () => {
    setLogs([])
  }

  // Toggle auto-scroll
  const toggleAutoScroll = () => {
    setAutoScroll(!autoScroll)
  }

  return (
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
        width: '90%',
        height: '90%',
        maxWidth: '1200px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid #dee2e6',
          backgroundColor: '#f8f9fa'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              margin: 0,
              color: '#333'
            }}>
              🖥️ Run Console
            </h3>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 12px',
              backgroundColor: '#fff',
              borderRadius: '20px',
              border: `2px solid ${getStatusColor(status)}`
            }}>
              <span style={{ fontSize: '16px' }}>
                {getStatusIcon(status)}
              </span>
              <span style={{
                fontSize: '14px',
                fontWeight: '500',
                color: getStatusColor(status)
              }}>
                {status.toUpperCase()}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {status === 'idle' && (
              <button
                onClick={handleRunWorkflow}
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
                🚀 Run Workflow
              </button>
            )}
            
            {status === 'running' && (
              <button
                onClick={handleStopRun}
                style={{
                  background: '#dc3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                ⏹️ Stop Run
              </button>
            )}
            
            <button
              onClick={toggleAutoScroll}
              style={{
                background: autoScroll ? '#007bff' : '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              {autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
            </button>
            
            <button
              onClick={clearLogs}
              style={{
                background: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              Clear
            </button>
            
            {onClose && (
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d',
                  padding: '4px'
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            padding: '16px 24px',
            backgroundColor: '#f8d7da',
            borderBottom: '1px solid #f5c6cb',
            color: '#721c24'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>❌</span>
              <span style={{ fontWeight: '500' }}>Error:</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Success/Fail Summary */}
        {status === 'success' && (
          <div style={{
            padding: '16px 24px',
            backgroundColor: '#d4edda',
            borderBottom: '1px solid #c3e6cb',
            color: '#155724'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>✅</span>
              <span style={{ fontWeight: '500' }}>Workflow completed successfully!</span>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div style={{
            padding: '16px 24px',
            backgroundColor: '#f8d7da',
            borderBottom: '1px solid #f5c6cb',
            color: '#721c24'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>❌</span>
              <span style={{ fontWeight: '500' }}>Workflow execution failed</span>
            </div>
          </div>
        )}

        {/* Logs Container */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 24px',
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            fontSize: '13px',
            lineHeight: '1.5'
          }}>
            {logs.length === 0 ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#6c757d',
                fontSize: '16px',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ fontSize: '48px' }}>📋</div>
                <div>No runs yet. Click Run Workflow to start.</div>
              </div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '4px 0',
                    borderBottom: '1px solid #333'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    minWidth: '120px',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: '12px' }}>
                      {getLogLevelIcon(log.level)}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      color: '#6c757d',
                      fontWeight: '500'
                    }}>
                      [{log.level.toUpperCase()}]
                    </span>
                  </div>
                  
                  <div style={{
                    fontSize: '11px',
                    color: '#6c757d',
                    minWidth: '80px',
                    flexShrink: 0
                  }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                  
                  <div style={{
                    flex: 1,
                    color: getLogLevelColor(log.level),
                    wordBreak: 'break-word'
                  }}>
                    {log.message}
                  </div>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid #dee2e6',
          backgroundColor: '#f8f9fa',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            fontSize: '12px',
            color: '#6c757d'
          }}>
            Run ID: {runId}
          </div>
          
          <div style={{
            fontSize: '12px',
            color: '#6c757d'
          }}>
            {logs.length} log entries
          </div>
        </div>
      </div>
    </div>
  )
}
