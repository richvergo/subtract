'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  StopIcon
} from '@heroicons/react/24/outline'
import WorkflowReplay from './WorkflowReplay'
import VariableConfigModal from './VariableConfigModal'
import LogicEditor from './LogicEditor'
import RunConsole from './RunConsole'
import ScheduleEditor from './ScheduleEditor'

// Zod schemas for validation
const LoginConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  username: z.string().optional(),
  password: z.string().optional()
})
const VariableSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['text', 'number', 'select', 'date']),
  value: z.any(),
  required: z.boolean()
})
const LogicSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  conditions: z.array(z.string()),
  actions: z.array(z.string())
})

// Wizard step definitions
const WIZARD_STEPS = [
  { id: 'setup', title: 'Setup', description: 'Choose workflow name and login' },
  { id: 'record', title: 'Record', description: 'Capture workflow steps' },
  { id: 'playback', title: 'Playback', description: 'Review recorded steps' },
  { id: 'variables', title: 'Variables', description: 'Mark dynamic fields' },
  { id: 'logic', title: 'Logic', description: 'Add business rules' },
  { id: 'validate', title: 'Validate', description: 'Test with variables' },
  { id: 'run', title: 'Run', description: 'Execute workflow' },
  { id: 'schedule', title: 'Schedule', description: 'Set up automation' }
] as const

type WizardStep = typeof WIZARD_STEPS[number]['id']

// Central wizard state interface
interface WorkflowWizardState {
  workflowId: string | null
  workflowName: string
  loginConfig: z.infer<typeof LoginConfigSchema> | null
  steps: any[]
  variables: z.infer<typeof VariableSchema>[]
  logicSpec: z.infer<typeof LogicSpecSchema> | null
  runs: any[]
  currentStep: WizardStep
  isRecording: boolean
  isRunning: boolean
  errors: Record<string, string | undefined>
  loading: Record<string, boolean>
}

// API response schemas
const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional()
})

export function WorkflowWizard() {
  const router = useRouter()
  
  // Central wizard state
  const [state, setState] = useState<WorkflowWizardState>({
    workflowId: null,
    workflowName: '',
    loginConfig: null,
    steps: [],
    variables: [],
    logicSpec: null,
    runs: [],
    currentStep: 'setup',
    isRecording: false,
    isRunning: false,
    errors: {},
    loading: {}
  })

  // Get current step index
  const currentStepIndex = WIZARD_STEPS.findIndex(step => step.id === state.currentStep)
  const currentStepData = WIZARD_STEPS[currentStepIndex]

  // API base URL
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''

  // Validation functions
  const validateStep = useCallback((step: WizardStep): boolean => {
    switch (step) {
      case 'setup':
        return !!(state.workflowName && state.loginConfig)
      case 'record':
        return state.steps.length > 0
      case 'playback':
        return state.steps.length > 0
      case 'variables':
        return true // Optional step
      case 'logic':
        return true // Optional step
      case 'validate':
        return state.steps.length > 0
      case 'run':
        return state.steps.length > 0
      case 'schedule':
        return true // Optional step
      default:
        return false
    }
  }, [state])

  // API call wrapper with error handling
  const apiCall = useCallback(async <T,>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<T> => {
    try {
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      })

      const result = await response.json()
      const validatedResult = ApiResponseSchema.parse(result)

      if (!validatedResult.success) {
        throw new Error(validatedResult.error || 'API call failed')
      }

      return validatedResult.data as T
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error)
      throw error
    }
  }, [apiBaseUrl])

  // Save workflow data
  const saveWorkflow = useCallback(async () => {
    if (!state.workflowId) return

    setState(prev => ({ ...prev, loading: { ...prev.loading, save: true } }))

    try {
      await apiCall(`/api/agents/${state.workflowId}`, 'PUT', {
        name: state.workflowName,
        loginConfig: state.loginConfig,
        steps: state.steps,
        variables: state.variables,
        logicSpec: state.logicSpec
      })

      setState(prev => ({ 
        ...prev, 
        loading: { ...prev.loading, save: false },
        errors: { ...prev.errors, save: undefined }
      }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: { ...prev.loading, save: false },
        errors: { ...prev.errors, save: error instanceof Error ? error.message : 'Failed to save workflow' }
      }))
    }
  }, [state.workflowId, state.workflowName, state.loginConfig, state.steps, state.variables, state.logicSpec, apiCall])

  // Start recording
  const startRecording = useCallback(async () => {
    setState(prev => ({ ...prev, loading: { ...prev.loading, record: true } }))

    try {
      const response = await apiCall<{ id: string }>('/api/agents/record', 'POST', {
        name: state.workflowName,
        loginConfig: state.loginConfig
      })

      setState(prev => ({ 
        ...prev, 
        workflowId: response.id,
        isRecording: true,
        loading: { ...prev.loading, record: false },
        errors: { ...prev.errors, record: undefined }
      }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: { ...prev.loading, record: false },
        errors: { ...prev.errors, record: error instanceof Error ? error.message : 'Failed to start recording' }
      }))
    }
  }, [state.workflowName, state.loginConfig, apiCall])

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (!state.workflowId) return

    setState(prev => ({ ...prev, loading: { ...prev.loading, stop: true } }))

    try {
      const response = await apiCall<{ steps: any[] }>(`/api/agents/${state.workflowId}/steps`, 'GET')
      
      setState(prev => ({ 
        ...prev, 
        steps: response.steps,
        isRecording: false,
        loading: { ...prev.loading, stop: false },
        errors: { ...prev.errors, stop: undefined }
      }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: { ...prev.loading, stop: false },
        errors: { ...prev.errors, stop: error instanceof Error ? error.message : 'Failed to stop recording' }
      }))
    }
  }, [state.workflowId, apiCall])

  // Save variables
  const saveVariables = useCallback(async (variables: z.infer<typeof VariableSchema>[]) => {
    if (!state.workflowId) return

    // Validate variables with Zod
    try {
      variables.forEach(variable => VariableSchema.parse(variable))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        errors: { ...prev.errors, variables: 'Invalid variable configuration' }
      }))
      return
    }

    setState(prev => ({ ...prev, loading: { ...prev.loading, variables: true } }))

    try {
      await apiCall(`/api/agents/${state.workflowId}/variables`, 'PUT', { variables })
      
      setState(prev => ({ 
        ...prev, 
        variables,
        loading: { ...prev.loading, variables: false },
        errors: { ...prev.errors, variables: undefined }
      }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: { ...prev.loading, variables: false },
        errors: { ...prev.errors, variables: error instanceof Error ? error.message : 'Failed to save variables' }
      }))
    }
  }, [state.workflowId, apiCall])

  // Save logic spec
  const saveLogicSpec = useCallback(async (logicSpec: z.infer<typeof LogicSpecSchema>) => {
    if (!state.workflowId) return

    // Validate logic spec with Zod
    try {
      LogicSpecSchema.parse(logicSpec)
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        errors: { ...prev.errors, logic: 'Invalid logic specification' }
      }))
      return
    }

    setState(prev => ({ ...prev, loading: { ...prev.loading, logic: true } }))

    try {
      await apiCall(`/api/agents/${state.workflowId}/generate-logic`, 'POST', { logicSpec })
      
      setState(prev => ({ 
        ...prev, 
        logicSpec,
        loading: { ...prev.loading, logic: false },
        errors: { ...prev.errors, logic: undefined }
      }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: { ...prev.loading, logic: false },
        errors: { ...prev.errors, logic: error instanceof Error ? error.message : 'Failed to save logic' }
      }))
    }
  }, [state.workflowId, apiCall])

  // Run workflow
  const runWorkflow = useCallback(async () => {
    if (!state.workflowId) return

    setState(prev => ({ ...prev, isRunning: true, loading: { ...prev.loading, run: true } }))

    try {
      const response = await apiCall<{ runId: string }>(`/api/agents/${state.workflowId}/run`, 'POST')
      
      setState(prev => ({ 
        ...prev, 
        isRunning: false,
        loading: { ...prev.loading, run: false },
        errors: { ...prev.errors, run: undefined }
      }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isRunning: false,
        loading: { ...prev.loading, run: false },
        errors: { ...prev.errors, run: error instanceof Error ? error.message : 'Failed to run workflow' }
      }))
    }
  }, [state.workflowId, apiCall])

  // Navigation functions
  const goToStep = useCallback((step: WizardStep) => {
    setState(prev => ({ ...prev, currentStep: step }))
  }, [])

  const goToNextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < WIZARD_STEPS.length) {
      const nextStep = WIZARD_STEPS[nextIndex]
      if (validateStep(nextStep.id)) {
        goToStep(nextStep.id)
      }
    }
  }, [currentStepIndex, validateStep, goToStep])

  const goToPreviousStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      goToStep(WIZARD_STEPS[prevIndex].id)
    }
  }, [currentStepIndex, goToStep])

  // Auto-save on state changes
  useEffect(() => {
    if (state.workflowId && (state.workflowName || state.steps.length > 0)) {
      const timeoutId = setTimeout(() => {
        saveWorkflow()
      }, 1000) // Debounce auto-save

      return () => clearTimeout(timeoutId)
    }
  }, [state.workflowId, state.workflowName, state.steps, saveWorkflow])

  // Render step content
  const renderStepContent = () => {
    switch (state.currentStep) {
      case 'setup':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Workflow Name *
              </label>
              <input
                type="text"
                value={state.workflowName}
                onChange={(e) => setState(prev => ({ ...prev, workflowName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter workflow name"
              />
              {state.errors.workflowName && (
                <p className="text-red-500 text-sm mt-1">{state.errors.workflowName}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Saved Login *
              </label>
              <select
                value={state.loginConfig?.id || ''}
                onChange={(e) => {
                  // In a real app, this would fetch from API
                  const loginConfig = e.target.value ? {
                    id: e.target.value,
                    name: 'Sample Login',
                    url: 'https://example.com',
                    username: 'user@example.com'
                  } : null
                  setState(prev => ({ ...prev, loginConfig }))
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a saved login</option>
                <option value="login1">Sample Login 1</option>
                <option value="login2">Sample Login 2</option>
              </select>
              {state.errors.loginConfig && (
                <p className="text-red-500 text-sm mt-1">{state.errors.loginConfig}</p>
              )}
            </div>
          </div>
        )

      case 'record':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Record Your Workflow
              </h3>
              <p className="text-gray-600 mb-6">
                Click the record button to start capturing your workflow steps.
              </p>
              
              {!state.isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={state.loading.record}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  <PlayIcon className="w-5 h-5 mr-2" />
                  {state.loading.record ? 'Starting...' : 'Start Recording'}
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center space-x-4">
                    <div className="flex items-center text-red-600">
                      <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse mr-2"></div>
                      Recording...
                    </div>
                    <button
                      onClick={stopRecording}
                      disabled={state.loading.stop}
                      className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                    >
                      <StopIcon className="w-5 h-5 mr-2" />
                      {state.loading.stop ? 'Stopping...' : 'Stop Recording'}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Perform your workflow steps in the browser. We'll capture each action.
                  </p>
                </div>
              )}
            </div>
          </div>
        )

      case 'playback':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Review Recorded Steps
              </h3>
              {state.steps.length > 0 ? (
                <WorkflowReplay 
                  workflowId={state.workflowId!}
                  onRunComplete={() => {}}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No steps recorded yet.</p>
                  <button
                    onClick={() => goToStep('record')}
                    className="mt-4 text-blue-600 hover:text-blue-700"
                  >
                    Go back to recording
                  </button>
                </div>
              )}
            </div>
          </div>
        )

      case 'variables':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Configure Variables
              </h3>
              <p className="text-gray-600 mb-4">
                Mark fields as dynamic if they change each run.
              </p>
              <VariableConfigModal
                workflowId={state.workflowId!}
                variables={state.variables}
                onSave={saveVariables}
              />
            </div>
          </div>
        )

      case 'logic':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Add Business Logic
              </h3>
              <p className="text-gray-600 mb-4">
                Use natural language, e.g. "Loop through all clients last month."
              </p>
              <LogicEditor
                logicSpec={state.logicSpec}
                onSave={saveLogicSpec}
              />
            </div>
          </div>
        )

      case 'validate':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Validate Workflow
              </h3>
              <p className="text-gray-600 mb-4">
                Test your workflow with variables and logic applied.
              </p>
              {state.workflowId && (
                <WorkflowReplay 
                  workflowId={state.workflowId}
                  onRunComplete={() => {}}
                />
              )}
            </div>
          </div>
        )

      case 'run':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Execute Workflow
              </h3>
              <RunConsole
                workflowId={state.workflowId!}
                isRunning={state.isRunning}
                onRun={runWorkflow}
              />
            </div>
          </div>
        )

      case 'schedule':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Schedule Automation
              </h3>
              <p className="text-gray-600 mb-4">
                Set up automated execution of your workflow.
              </p>
              <ScheduleEditor
                workflowId={state.workflowId!}
                onSave={() => {}}
              />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {WIZARD_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                index < currentStepIndex ? 'bg-green-500 text-white' :
                index === currentStepIndex ? 'bg-blue-500 text-white' :
                'bg-gray-300 text-gray-600'
              }`}>
                {index < currentStepIndex ? (
                  <CheckCircleIcon className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  index <= currentStepIndex ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {step.title}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
              {index < WIZARD_STEPS.length - 1 && (
                <div className={`w-12 h-0.5 mx-4 ${
                  index < currentStepIndex ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error Banners */}
      {Object.entries(state.errors).map(([key, error]) => (
        error && (
          <div key={key} className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )
      ))}

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{currentStepData?.title}</h2>
          <p className="text-gray-600">{currentStepData?.description}</p>
        </div>

        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={goToPreviousStep}
          disabled={currentStepIndex === 0}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeftIcon className="w-5 h-5 mr-2" />
          Back
        </button>

        <div className="flex space-x-4">
          {state.loading.save && (
            <div className="flex items-center text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
              Saving...
            </div>
          )}
          
          {currentStepIndex < WIZARD_STEPS.length - 1 ? (
            <button
              onClick={goToNextStep}
              disabled={!validateStep(state.currentStep)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRightIcon className="w-5 h-5 ml-2" />
            </button>
          ) : (
            <button
              onClick={() => router.push('/workflows')}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <CheckCircleIcon className="w-5 h-5 mr-2" />
              Finish
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
