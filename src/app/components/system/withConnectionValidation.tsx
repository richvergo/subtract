/**
 * Higher-Order Component for Connection Validation
 * Adds connection validation safeguards to workflow components
 */

"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { z, ZodSchema } from 'zod'
import { useConnectionValidation } from './ConnectionValidator'

// Base error boundary for API errors
interface ApiErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
}

class ApiErrorBoundary extends React.Component<
  ApiErrorBoundaryProps,
  { hasError: boolean; error: Error | null }
> {
  constructor(props: ApiErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('API Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return (
        <FallbackComponent 
          error={this.state.error!} 
          retry={() => this.setState({ hasError: false, error: null })}
        />
      )
    }

    return this.props.children
  }
}

// Default error fallback component
function DefaultErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#f8d7da',
      border: '1px solid #f5c6cb',
      borderRadius: '6px',
      color: '#721c24'
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>⚠️ Component Error</h3>
      <p style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
        An error occurred while loading this component. This might be due to API connectivity issues.
      </p>
      <details style={{ margin: '0 0 12px 0' }}>
        <summary style={{ cursor: 'pointer', fontSize: '12px' }}>Error Details</summary>
        <pre style={{ 
          fontSize: '11px', 
          marginTop: '8px', 
          padding: '8px', 
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          borderRadius: '4px',
          overflow: 'auto'
        }}>
          {error.message}
        </pre>
      </details>
      <button
        onClick={retry}
        style={{
          background: '#dc3545',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          padding: '8px 16px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        Retry
      </button>
    </div>
  )
}

// API validation hook
function useApiValidation<T>(
  endpoint: string,
  schema: ZodSchema<T>,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: any
    enabled?: boolean
    retryAttempts?: number
    retryDelay?: number
  } = {}
) {
  const {
    method = 'GET',
    body,
    enabled = true,
    retryAttempts = 3,
    retryDelay = 1000
  } = options

  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const executeRequest = useCallback(async () => {
    if (!enabled) return

    try {
      setIsLoading(true)
      setError(null)

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''
      const fullUrl = `${baseUrl}${endpoint}`

      const requestOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }

      if (body && (method === 'POST' || method === 'PUT')) {
        requestOptions.body = JSON.stringify(body)
      }

      const response = await fetch(fullUrl, requestOptions)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const responseData = await response.json()

      // Validate response against schema
      const validatedData = schema.parse(responseData)
      setData(validatedData)
      setRetryCount(0)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)

      // Auto-retry on failure
      if (retryCount < retryAttempts) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
          executeRequest()
        }, retryDelay * Math.pow(2, retryCount)) // Exponential backoff
      }
    } finally {
      setIsLoading(false)
    }
  }, [endpoint, schema, method, body, enabled, retryAttempts, retryDelay, retryCount])

  useEffect(() => {
    executeRequest()
  }, [executeRequest])

  const retry = useCallback(() => {
    setRetryCount(0)
    executeRequest()
  }, [executeRequest])

  return {
    data,
    isLoading,
    error,
    retry,
    retryCount
  }
}

// Enhanced error display component
function ApiErrorDisplay({ 
  error, 
  retry, 
  endpoint, 
  retryCount = 0,
  maxRetries = 3 
}: { 
  error: string
  retry: () => void
  endpoint: string
  retryCount?: number
  maxRetries?: number
}) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#f8d7da',
      border: '1px solid #f5c6cb',
      borderRadius: '6px',
      margin: '16px 0'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px'
      }}>
        <span style={{ fontSize: '16px' }}>❌</span>
        <h4 style={{ 
          margin: 0, 
          fontSize: '14px', 
          fontWeight: '600',
          color: '#721c24'
        }}>
          API Connection Error
        </h4>
      </div>

      <p style={{ 
        margin: '0 0 12px 0', 
        fontSize: '13px',
        color: '#721c24'
      }}>
        Failed to connect to <code style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          padding: '2px 4px',
          borderRadius: '3px',
          fontSize: '12px'
        }}>{endpoint}</code>
      </p>

      {retryCount > 0 && (
        <p style={{ 
          margin: '0 0 12px 0', 
          fontSize: '12px',
          color: '#721c24',
          opacity: 0.8
        }}>
          Retry attempt {retryCount} of {maxRetries}
        </p>
      )}

      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '8px'
      }}>
        <button
          onClick={retry}
          disabled={retryCount >= maxRetries}
          style={{
            background: retryCount >= maxRetries ? '#6c757d' : '#dc3545',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            padding: '6px 12px',
            cursor: retryCount >= maxRetries ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            opacity: retryCount >= maxRetries ? 0.6 : 1
          }}
        >
          {retryCount >= maxRetries ? 'Max Retries Reached' : 'Retry'}
        </button>

        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            background: 'transparent',
            color: '#721c24',
            border: '1px solid #721c24',
            borderRadius: '4px',
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500'
          }}
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {showDetails && (
        <details style={{ marginTop: '8px' }}>
          <summary style={{ 
            cursor: 'pointer', 
            fontSize: '12px',
            color: '#721c24',
            fontWeight: '500'
          }}>
            Error Details
          </summary>
          <pre style={{ 
            fontSize: '11px', 
            marginTop: '8px', 
            padding: '8px', 
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            borderRadius: '4px',
            overflow: 'auto',
            color: '#721c24'
          }}>
            {error}
          </pre>
        </details>
      )}
    </div>
  )
}

// Loading component with retry information
function ApiLoadingDisplay({ 
  endpoint, 
  retryCount = 0 
}: { 
  endpoint: string
  retryCount?: number 
}) {
  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#d1ecf1',
      border: '1px solid #bee5eb',
      borderRadius: '6px',
      margin: '16px 0',
      textAlign: 'center'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: '8px'
      }}>
        <div style={{
          width: '16px',
          height: '16px',
          border: '2px solid #0c5460',
          borderTop: '2px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <span style={{ 
          fontSize: '14px', 
          fontWeight: '500',
          color: '#0c5460'
        }}>
          Connecting to API...
        </span>
      </div>

      <p style={{ 
        margin: 0, 
        fontSize: '12px',
        color: '#0c5460',
        opacity: 0.8
      }}>
        Loading data from <code style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          padding: '2px 4px',
          borderRadius: '3px'
        }}>{endpoint}</code>
      </p>

      {retryCount > 0 && (
        <p style={{ 
          margin: '4px 0 0 0', 
          fontSize: '11px',
          color: '#0c5460',
          opacity: 0.7
        }}>
          Retry attempt {retryCount}
        </p>
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

// HOC for adding connection validation to components
export function withConnectionValidation<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    endpoint: string
    schema: ZodSchema
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    testData?: any
    fallbackComponent?: React.ComponentType<{ error: string; retry: () => void }>
    showLoadingState?: boolean
    enableRetry?: boolean
  }
) {
  const WrappedComponent = (props: P) => {
    const {
      endpoint,
      schema,
      method = 'GET',
      testData,
      fallbackComponent: FallbackComponent = ApiErrorDisplay,
      showLoadingState = true,
      enableRetry = true
    } = options

    const {
      data,
      isLoading,
      error,
      retry,
      retryCount
    } = useApiValidation(endpoint, schema, {
      method,
      body: testData,
      enabled: true,
      retryAttempts: enableRetry ? 3 : 0
    })

    // Show loading state
    if (isLoading && showLoadingState) {
      return <ApiLoadingDisplay endpoint={endpoint} retryCount={retryCount} />
    }

    // Show error state
    if (error) {
      return (
        <FallbackComponent 
          error={error} 
          retry={retry}
          endpoint={endpoint}
          retryCount={retryCount}
          maxRetries={3}
        />
      )
    }

    // Show component with validated data
    return <Component {...props} apiData={data} />
  }

  WrappedComponent.displayName = `withConnectionValidation(${Component.displayName || Component.name})`

  return WrappedComponent
}

// Hook for manual API calls with validation
export function useValidatedApiCall<T>(
  endpoint: string,
  schema: ZodSchema<T>
) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const callApi = useCallback(async (
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T | null> => {
    try {
      setIsLoading(true)
      setError(null)

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''
      const fullUrl = `${baseUrl}${endpoint}`

      const requestOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }

      if (body && (method === 'POST' || method === 'PUT')) {
        requestOptions.body = JSON.stringify(body)
      }

      const response = await fetch(fullUrl, requestOptions)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const responseData = await response.json()
      const validatedData = schema.parse(responseData)
      
      return validatedData

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [endpoint, schema])

  return {
    callApi,
    isLoading,
    error,
    clearError: () => setError(null)
  }
}

export { ApiErrorBoundary, useApiValidation, ApiErrorDisplay, ApiLoadingDisplay }
