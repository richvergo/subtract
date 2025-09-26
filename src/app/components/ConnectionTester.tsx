'use client'

import React, { useState, useEffect } from 'react'

interface TestResult {
  status: 'success' | 'error' | 'pending'
  message: string
  details?: any
}

interface ConnectionTestResults {
  status: string
  summary: {
    totalTests: number
    passedTests: number
    failedTests: number
  }
  results: {
    tests: Record<string, TestResult>
  }
}

export default function ConnectionTester() {
  const [results, setResults] = useState<ConnectionTestResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runTests = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/workflows/test-connections')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Test failed')
      }
      
      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100'
      case 'error': return 'text-red-600 bg-red-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'pending': return '⏳'
      default: return '❓'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            🔧 System Connection Tester
          </h2>
          <button
            onClick={runTests}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Testing...' : 'Run Tests'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        {results && (
          <div className="space-y-6">
            {/* Overall Status */}
            <div className={`p-4 rounded-lg ${
              results.status === 'healthy' 
                ? 'bg-green-100 border border-green-400' 
                : 'bg-red-100 border border-red-400'
            }`}>
              <div className="flex items-center">
                <span className="text-2xl mr-3">
                  {results.status === 'healthy' ? '🎉' : '⚠️'}
                </span>
                <div>
                  <h3 className="text-lg font-semibold">
                    Overall Status: {results.status.toUpperCase()}
                  </h3>
                  <p className="text-sm">
                    {results.summary.passedTests} of {results.summary.totalTests} tests passed
                  </p>
                </div>
              </div>
            </div>

            {/* Individual Test Results */}
            <div className="grid gap-4">
              {Object.entries(results.results.tests).map(([testName, testResult]) => (
                <div key={testName} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold capitalize">
                      {testName.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(testResult.status)}`}>
                      {getStatusIcon(testResult.status)} {testResult.status}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    {testResult.message}
                  </p>
                  
                  {testResult.details && (
                    <details className="text-xs text-gray-500">
                      <summary className="cursor-pointer hover:text-gray-700">
                        View Details
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                        {JSON.stringify(testResult.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-4 pt-4 border-t">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Refresh Page
              </button>
              <button
                onClick={() => window.open('/api/puppeteer/health', '_blank')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Check Puppeteer Health
              </button>
              <button
                onClick={() => window.open('/workflows', '_blank')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Go to Workflows
              </button>
            </div>
          </div>
        )}

        {!results && !loading && !error && (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">
              Click "Run Tests" to check all system connections
            </p>
            <div className="text-sm text-gray-500">
              This will test: Database, Authentication, Puppeteer, API endpoints, and Environment variables
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

