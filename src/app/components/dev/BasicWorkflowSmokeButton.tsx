/**
 * Basic Workflow Smoke Button Component
 * Development-only component for manual smoke test execution
 * Provides a UI button to run the same workflow smoke test via API calls
 */

"use client"

import React, { useState } from 'react'
import { z } from 'zod'

// Smoke test configuration
const SMOKE_TEST_CONFIG = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3
}

// Response schemas
const WorkflowResponseSchema = z.object({
  workflow: z.object({
    id: z.string(),
    name: z.string(),
    status: z.string()
  })
})

const RunResponseSchema = z.object({
  success: z.boolean(),
  runId: z.string(),
  status: z.string()
})

const RunStatusResponseSchema = z.object({
  success: z.boolean(),
  run: z.object({
    id: z.string(),
    status: z.string(),
    steps: z.array(z.object({
      id: z.string(),
      status: z.string()
    }))
  })
})

// Test workflow data
const TEST_WORKFLOW = {
  name: 'Dev Smoke Test Workflow',
  description: 'Manual smoke test workflow for development validation',
  actions: [
    {
      id: 'action_1',
      type: 'navigate',
      url: `${SMOKE_TEST_CONFIG.API_BASE_URL}/test-fixture.html`,
      metadata: { description: 'Navigate to test fixture' }
    },
    {
      id: 'action_2',
      type: 'click',
      selector: '#nav-button',
      metadata: { description: 'Click navigation button' }
    },
    {
      id: 'action_3',
      type: 'type',
      selector: '#test-input',
      value: 'Dev smoke test',
      metadata: { description: 'Fill input field' }
    },
    {
      id: 'action_4',
      type: 'click',
      selector: '#form-submit',
      metadata: { description: 'Submit form' }
    }
  ],
  variables: [
    {
      name: 'devTestVar',
      type: 'string',
      description: 'Development test variable',
      defaultValue: 'dev-test-value',
      required: true
    }
  ],
  settings: {
    timeout: 10000,
    retryAttempts: 2,
    screenshotOnError: true,
    debugMode: true
  }
}

interface SmokeTestResult {
  step: string
  success: boolean
  duration: number
  error?: string
}

interface BasicWorkflowSmokeButtonProps {
  className?: string
  showDetails?: boolean
}

export default function BasicWorkflowSmokeButton({ 
  className = '',
  showDetails = false 
}: BasicWorkflowSmokeButtonProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<SmokeTestResult[]>([])
  const [currentStep, setCurrentStep] = useState<string>('')
  const [workflowId, setWorkflowId] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)

  // Only render in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const runSmokeTest = async () => {
    setIsRunning(true)
    setResults([])
    setCurrentStep('')
    setWorkflowId(null)
    setShowResults(true)

    const testResults: SmokeTestResult[] = []
    let currentWorkflowId: string | null = null

    try {
      // Step 1: Create workflow
      setCurrentStep('Creating workflow...')
      const step1Start = Date.now()
      
      try {
        const workflowResponse = await fetch(`${SMOKE_TEST_CONFIG.API_BASE_URL}/api/agents/record`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(TEST_WORKFLOW)
        })

        if (!workflowResponse.ok) {
          throw new Error(`HTTP ${workflowResponse.status}: ${workflowResponse.statusText}`)
        }

        const workflowData = await workflowResponse.json()
        const validatedWorkflow = WorkflowResponseSchema.parse(workflowData)
        
        currentWorkflowId = validatedWorkflow.workflow.id
        setWorkflowId(currentWorkflowId)
        
        testResults.push({
          step: 'Create Workflow',
          success: true,
          duration: Date.now() - step1Start
        })
      } catch (error) {
        testResults.push({
          step: 'Create Workflow',
          success: false,
          duration: Date.now() - step1Start,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        throw error
      }

      // Step 2: Configure variables
      setCurrentStep('Configuring variables...')
      const step2Start = Date.now()
      
      try {
        const variablesResponse = await fetch(`${SMOKE_TEST_CONFIG.API_BASE_URL}/api/agents/${currentWorkflowId}/variables`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: 'devSmokeVar',
            type: 'string',
            description: 'Development smoke test variable',
            defaultValue: 'dev-test',
            required: true
          })
        })

        if (!variablesResponse.ok) {
          throw new Error(`HTTP ${variablesResponse.status}: ${variablesResponse.statusText}`)
        }

        testResults.push({
          step: 'Configure Variables',
          success: true,
          duration: Date.now() - step2Start
        })
      } catch (error) {
        testResults.push({
          step: 'Configure Variables',
          success: false,
          duration: Date.now() - step2Start,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      // Step 3: Generate logic
      setCurrentStep('Generating logic...')
      const step3Start = Date.now()
      
      try {
        const logicResponse = await fetch(`${SMOKE_TEST_CONFIG.API_BASE_URL}/api/agents/${currentWorkflowId}/generate-logic`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            nlRules: 'Navigate to test page and interact with form elements',
            variables: TEST_WORKFLOW.variables
          })
        })

        if (!logicResponse.ok) {
          throw new Error(`HTTP ${logicResponse.status}: ${logicResponse.statusText}`)
        }

        testResults.push({
          step: 'Generate Logic',
          success: true,
          duration: Date.now() - step3Start
        })
      } catch (error) {
        testResults.push({
          step: 'Generate Logic',
          success: false,
          duration: Date.now() - step3Start,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      // Step 4: Validate workflow
      setCurrentStep('Validating workflow...')
      const step4Start = Date.now()
      
      try {
        const validationResponse = await fetch(`${SMOKE_TEST_CONFIG.API_BASE_URL}/api/agents/${currentWorkflowId}/validate`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        })

        if (!validationResponse.ok) {
          throw new Error(`HTTP ${validationResponse.status}: ${validationResponse.statusText}`)
        }

        testResults.push({
          step: 'Validate Workflow',
          success: true,
          duration: Date.now() - step4Start
        })
      } catch (error) {
        testResults.push({
          step: 'Validate Workflow',
          success: false,
          duration: Date.now() - step4Start,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      // Step 5: Run workflow
      setCurrentStep('Running workflow...')
      const step5Start = Date.now()
      
      try {
        const runResponse = await fetch(`${SMOKE_TEST_CONFIG.API_BASE_URL}/api/agents/${currentWorkflowId}/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            variables: { devTestVar: 'smoke-test-execution' },
            settings: {
              timeout: 15000,
              retryAttempts: 1,
              screenshotOnError: true,
              debugMode: true
            }
          })
        })

        if (!runResponse.ok) {
          throw new Error(`HTTP ${runResponse.status}: ${runResponse.statusText}`)
        }

        const runData = await runResponse.json()
        const validatedRun = RunResponseSchema.parse(runData)
        
        // Wait for completion (simplified - just check once)
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        testResults.push({
          step: 'Run Workflow',
          success: true,
          duration: Date.now() - step5Start
        })
      } catch (error) {
        testResults.push({
          step: 'Run Workflow',
          success: false,
          duration: Date.now() - step5Start,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

    } catch (error) {
      console.error('Smoke test failed:', error)
    } finally {
      setIsRunning(false)
      setCurrentStep('')
      setResults(testResults)
      
      // Cleanup: Delete the test workflow
      if (currentWorkflowId) {
        try {
          await fetch(`${SMOKE_TEST_CONFIG.API_BASE_URL}/api/agents/${currentWorkflowId}`, {
            method: 'DELETE',
            credentials: 'include'
          })
        } catch (error) {
          console.error('Failed to cleanup test workflow:', error)
        }
      }
    }
  }

  const successCount = results.filter(r => r.success).length
  const totalCount = results.length
  const allPassed = successCount === totalCount && totalCount > 0

  return (
    <div className={`smoke-test-container ${className}`} style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1000,
      backgroundColor: '#fff',
      border: '2px solid #007bff',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      maxWidth: '400px',
      minWidth: '300px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#007bff' }}>
          🧪 Dev Smoke Test
        </span>
        {isRunning && (
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid #007bff',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        )}
      </div>

      {currentStep && (
        <div style={{
          fontSize: '12px',
          color: '#6c757d',
          marginBottom: '12px',
          fontStyle: 'italic'
        }}>
          {currentStep}
        </div>
      )}

      <button
        onClick={runSmokeTest}
        disabled={isRunning}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: isRunning ? '#6c757d' : allPassed ? '#28a745' : '#007bff',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: isRunning ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '12px'
        }}
      >
        {isRunning ? 'Running Test...' : allPassed ? '✅ Re-run Smoke Test' : '🚀 Run Smoke Test'}
      </button>

      {showResults && results.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
              Results: {successCount}/{totalCount}
            </span>
            <button
              onClick={() => setShowResults(!showDetails)}
              style={{
                background: 'transparent',
                border: '1px solid #6c757d',
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '11px',
                color: '#6c757d'
              }}
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          {showDetails && (
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {results.map((result, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '4px 0',
                    fontSize: '11px',
                    borderBottom: '1px solid #f0f0f0'
                  }}
                >
                  <span style={{ fontSize: '12px' }}>
                    {result.success ? '✅' : '❌'}
                  </span>
                  <span style={{ flex: 1, fontWeight: '500' }}>
                    {result.step}
                  </span>
                  <span style={{ color: '#6c757d' }}>
                    {result.duration}ms
                  </span>
                </div>
              ))}
            </div>
          )}

          {results.some(r => !r.success) && showDetails && (
            <div style={{
              marginTop: '8px',
              padding: '8px',
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              fontSize: '11px'
            }}>
              <div style={{ fontWeight: 'bold', color: '#721c24', marginBottom: '4px' }}>
                Errors:
              </div>
              {results.filter(r => !r.success).map((result, index) => (
                <div key={index} style={{ color: '#721c24', marginBottom: '2px' }}>
                  <strong>{result.step}:</strong> {result.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{
        fontSize: '10px',
        color: '#6c757d',
        textAlign: 'center',
        marginTop: '8px',
        fontStyle: 'italic'
      }}>
        Development Mode Only
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
