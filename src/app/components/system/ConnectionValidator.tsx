/**
 * ConnectionValidator Component
 * Validates API connections and displays health status on app startup
 */

"use client"

import React, { useState, useEffect } from 'react'
import { 
  checkAllCriticalEndpoints, 
  getConnectionHealthSummary, 
  retryFailedConnections,
  ConnectionCheckResult 
} from '@/lib/api/connectionCheck'

interface ConnectionValidatorProps {
  agentId?: string
  showDetails?: boolean
  autoRetry?: boolean
  maxRetries?: number
}

export default function ConnectionValidator({ 
  agentId = 'test-agent-id',
  showDetails = false,
  autoRetry = true,
  maxRetries = 3
}: ConnectionValidatorProps) {
  const [isChecking, setIsChecking] = useState(true)
  const [results, setResults] = useState<ConnectionCheckResult[]>([])
  const [retryResults, setRetryResults] = useState<ConnectionCheckResult[]>([])
  const [isRetrying, setIsRetrying] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    performConnectionCheck()
  }, [agentId])

  const performConnectionCheck = async () => {
    try {
      setIsChecking(true)
      const connectionResults = await checkAllCriticalEndpoints(agentId)
      setResults(connectionResults)

      // Auto-retry failed connections if enabled
      if (autoRetry) {
        const failedResults = connectionResults.filter(r => !r.ok)
        if (failedResults.length > 0) {
          await performRetry(failedResults)
        }
      }
    } catch (error) {
      console.error('Connection check failed:', error)
      setResults([{
        ok: false,
        message: 'Failed to perform connection check',
        endpoint: 'all',
        networkError: error instanceof Error ? error.message : 'Unknown error'
      }])
    } finally {
      setIsChecking(false)
    }
  }

  const performRetry = async (failedResults: ConnectionCheckResult[]) => {
    try {
      setIsRetrying(true)
      const retryResults = await retryFailedConnections(failedResults, maxRetries)
      setRetryResults(retryResults)
    } catch (error) {
      console.error('Retry failed:', error)
    } finally {
      setIsRetrying(false)
    }
  }

  const handleManualRetry = async () => {
    const failedResults = results.filter(r => !r.ok)
    if (failedResults.length > 0) {
      await performRetry(failedResults)
    }
  }

  const handleRefresh = async () => {
    await performConnectionCheck()
  }

  const healthSummary = getConnectionHealthSummary(results)
  const finalResults = retryResults.length > 0 ? retryResults : results
  const finalSummary = getConnectionHealthSummary(finalResults)

  // Don't render if all systems are healthy and details are not requested
  if (finalSummary.allHealthy && !showDetails && !isChecking) {
    return null
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      backgroundColor: finalSummary.allHealthy ? '#d4edda' : '#f8d7da',
      borderBottom: `2px solid ${finalSummary.allHealthy ? '#c3e6cb' : '#f5c6cb'}`,
      padding: '12px 20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Status Message */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flex: 1
        }}>
          {isChecking && (
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid #6c757d',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          )}
          
          <span style={{
            fontSize: '14px',
            fontWeight: '500',
            color: finalSummary.allHealthy ? '#155724' : '#721c24'
          }}>
            {isChecking ? 'Checking API connections...' : finalSummary.summaryMessage}
          </span>

          {finalSummary.failedEndpoints.length > 0 && (
            <span style={{
              fontSize: '12px',
              color: '#721c24',
              opacity: 0.8
            }}>
              ({finalSummary.failedEndpoints.length} of {finalSummary.totalCount} endpoints failed)
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {finalSummary.failedEndpoints.length > 0 && !isRetrying && (
            <button
              onClick={handleManualRetry}
              disabled={isRetrying}
              style={{
                background: '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                cursor: isRetrying ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                opacity: isRetrying ? 0.6 : 1
              }}
            >
              Retry Failed
            </button>
          )}

          <button
            onClick={handleRefresh}
            disabled={isChecking}
            style={{
              background: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              cursor: isChecking ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              opacity: isChecking ? 0.6 : 1
            }}
          >
            Refresh
          </button>

          {showDetails && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                background: 'transparent',
                color: finalSummary.allHealthy ? '#155724' : '#721c24',
                border: '1px solid currentColor',
                borderRadius: '4px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              {expanded ? 'Hide Details' : 'Show Details'}
            </button>
          )}

          {!showDetails && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                background: 'transparent',
                color: finalSummary.allHealthy ? '#155724' : '#721c24',
                border: '1px solid currentColor',
                borderRadius: '4px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              Details
            </button>
          )}
        </div>
      </div>

      {/* Detailed Results */}
      {expanded && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '6px',
          border: '1px solid rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#495057'
          }}>
            API Connection Details:
          </div>
          
          <div style={{ display: 'grid', gap: '6px' }}>
            {finalResults.map((result, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  backgroundColor: result.ok ? '#d4edda' : '#f8d7da',
                  borderRadius: '4px',
                  border: `1px solid ${result.ok ? '#c3e6cb' : '#f5c6cb'}`
                }}
              >
                <span style={{ fontSize: '12px' }}>
                  {result.ok ? '✅' : '❌'}
                </span>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '500',
                    color: result.ok ? '#155724' : '#721c24',
                    wordBreak: 'break-all'
                  }}>
                    {result.endpoint}
                  </div>
                  
                  <div style={{
                    fontSize: '11px',
                    color: result.ok ? '#155724' : '#721c24',
                    opacity: 0.8
                  }}>
                    {result.message}
                  </div>

                  {result.schemaErrors && result.schemaErrors.length > 0 && (
                    <div style={{ marginTop: '4px' }}>
                      {result.schemaErrors.map((error, errorIndex) => (
                        <div
                          key={errorIndex}
                          style={{
                            fontSize: '10px',
                            color: '#721c24',
                            fontFamily: 'monospace',
                            backgroundColor: 'rgba(255, 255, 255, 0.7)',
                            padding: '2px 4px',
                            borderRadius: '2px',
                            marginTop: '2px'
                          }}
                        >
                          {error}
                        </div>
                      ))}
                    </div>
                  )}

                  {result.networkError && (
                    <div style={{
                      fontSize: '10px',
                      color: '#721c24',
                      fontFamily: 'monospace',
                      backgroundColor: 'rgba(255, 255, 255, 0.7)',
                      padding: '2px 4px',
                      borderRadius: '2px',
                      marginTop: '2px'
                    }}>
                      Network: {result.networkError}
                    </div>
                  )}
                </div>

                {result.statusCode && (
                  <div style={{
                    fontSize: '10px',
                    color: result.statusCode >= 400 ? '#721c24' : '#155724',
                    fontWeight: '500',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    padding: '2px 6px',
                    borderRadius: '3px'
                  }}>
                    {result.statusCode}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Retry Status */}
          {isRetrying && (
            <div style={{
              marginTop: '8px',
              padding: '8px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#856404'
            }}>
              🔄 Retrying failed connections...
            </div>
          )}

          {retryResults.length > 0 && (
            <div style={{
              marginTop: '8px',
              padding: '8px',
              backgroundColor: '#d1ecf1',
              border: '1px solid #bee5eb',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#0c5460'
            }}>
              🔄 Retry completed. {retryResults.filter(r => r.ok).length} of {retryResults.length} endpoints recovered.
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// Hook for using connection validation in components
export function useConnectionValidation(agentId?: string) {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkConnection = async () => {
    try {
      setIsChecking(true)
      setError(null)
      
      const results = await checkAllCriticalEndpoints(agentId || 'test-agent-id')
      const summary = getConnectionHealthSummary(results)
      
      setIsHealthy(summary.allHealthy)
      
      if (!summary.allHealthy) {
        setError(`API issues detected: ${summary.failedEndpoints.length} endpoints failed`)
      }
    } catch (err) {
      setIsHealthy(false)
      setError(err instanceof Error ? err.message : 'Connection check failed')
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    checkConnection()
  }, [agentId])

  return {
    isHealthy,
    isChecking,
    error,
    checkConnection
  }
}
