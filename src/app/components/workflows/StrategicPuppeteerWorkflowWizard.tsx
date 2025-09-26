'use client'

import React, { useState, useEffect } from 'react'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import PuppeteerPlayback from './PuppeteerPlayback'
import './WorkflowWizard.css'

// Enhanced Zod schemas for comprehensive validation
const LoginConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  loginUrl: z.string().url(),
  username: z.string(),
  password: z.string().optional(),
  loginStrategy: z.enum(['form', 'oauth', 'sso', 'api']).optional(),
  waitForSelector: z.string().optional(),
  submitSelector: z.string().optional()
})

const BrowserConfigSchema = z.object({
  headless: z.boolean().default(false), // Pure Puppeteer: visible browser by default
  viewport: z.object({
    width: z.number().min(320).max(3840),
    height: z.number().min(240).max(2160)
  }).optional(),
  userAgent: z.string().optional(),
  deviceScaleFactor: z.number().min(0.1).max(3).optional(),
  isMobile: z.boolean().default(false),
  hasTouch: z.boolean().default(false)
})

const PerformanceConfigSchema = z.object({
  enableNetworkMonitoring: z.boolean().default(true),
  enableConsoleLogging: z.boolean().default(true),
  enablePerformanceMetrics: z.boolean().default(true),
  enableMemoryTracking: z.boolean().default(false),
  screenshotQuality: z.enum(['low', 'medium', 'high']).default('high'),
  screenshotFormat: z.enum(['png', 'jpeg', 'webp']).default('png')
})

const SelectorConfigSchema = z.object({
  strategy: z.enum(['css', 'xpath', 'text', 'hybrid', 'ai']).default('hybrid'),
  priority: z.array(z.string()).default(['id', 'data-testid', 'name', 'role', 'class']),
  fallback: z.boolean().default(true),
  timeout: z.number().min(1000).max(30000).default(10000),
  retryAttempts: z.number().min(0).max(5).default(3)
})

const DomainScopeConfigSchema = z.object({
  allowedDomains: z.array(z.string()),
  blockedDomains: z.array(z.string()).optional(),
  ssoWhitelist: z.array(z.string()).optional(),
  pauseOnNavigation: z.boolean().default(true),
  autoResume: z.boolean().default(false)
})

const VariableSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['text', 'number', 'date', 'boolean', 'email', 'url', 'phone']),
  value: z.string(),
  isDynamic: z.boolean(),
  validation: z.object({
    required: z.boolean(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    pattern: z.string().optional()
  }).optional()
})

const LogicSpecSchema = z.object({
  rules: z.array(z.string()),
  loops: z.array(z.string()),
  conditions: z.array(z.string()),
  errorHandling: z.object({
    retryOnFailure: z.boolean(),
    maxRetries: z.number(),
    fallbackAction: z.string().optional()
  }).optional()
})

// Enhanced wizard state interface
interface EnhancedPuppeteerWorkflowWizardState {
  workflowId: string | null
  workflowName: string
  description: string
  targetUrl: string
  loginConfig: z.infer<typeof LoginConfigSchema> | null
  browserConfig: z.infer<typeof BrowserConfigSchema>
  performanceConfig: z.infer<typeof PerformanceConfigSchema>
  selectorConfig: z.infer<typeof SelectorConfigSchema>
  domainScopeConfig: z.infer<typeof DomainScopeConfigSchema>
  steps: any[]
  variables: z.infer<typeof VariableSchema>[]
  logicSpec: z.infer<typeof LogicSpecSchema> | null
  runStatus: 'idle' | 'running' | 'completed' | 'failed'
  schedules: any[]
  currentStep: number
  isRecording: boolean
  sessionId: string | null
  recordingUrl: string | null
  errors: Record<string, string | undefined>
  loading: boolean
  debugMode: boolean
  performanceMetrics: {
    startTime: number | null
    endTime: number | null
    actionsCaptured: number
    screenshotsTaken: number
    networkRequests: number
    consoleLogs: number
    memoryUsage: number
  }
  autoConfigStatus: {
    type: 'info' | 'success' | 'warning' | 'error'
    message: string
  } | null
  autoConfigSettings: any | null
  autoConfigTimeout: NodeJS.Timeout | null
  isAutoConfiguring: boolean
}

// Enhanced wizard steps configuration
const ENHANCED_WIZARD_STEPS = [
  {
    id: 'setup',
    title: 'Setup',
    description: 'Configure workflow basics and target URL',
    icon: '⚙️'
  },
  {
    id: 'record',
    title: 'Record',
    description: 'Capture workflow with auto-configured Puppeteer settings',
    icon: '🎥'
  },
  {
    id: 'playback',
    title: 'Playback',
    description: 'Review with screenshots and performance data',
    icon: '▶️'
  },
  {
    id: 'variables',
    title: 'Variables',
    description: 'Mark dynamic fields with validation',
    icon: '📝'
  },
  {
    id: 'logic',
    title: 'Logic',
    description: 'Add business rules and error handling',
    icon: '🧠'
  },
  {
    id: 'validate',
    title: 'Validate',
    description: 'Test with variables and performance',
    icon: '✅'
  },
  {
    id: 'run',
    title: 'Run',
    description: 'Execute with full monitoring',
    icon: '🚀'
  },
  {
    id: 'schedule',
    title: 'Schedule',
    description: 'Set up automation and monitoring',
    icon: '⏰'
  }
]

export default function EnhancedPuppeteerWorkflowWizard() {
  const router = useRouter()
  
  // Enhanced initial state
  const [state, setState] = useState<EnhancedPuppeteerWorkflowWizardState>({
    workflowId: null,
    workflowName: '',
    description: '',
    targetUrl: '',
    loginConfig: null,
    browserConfig: {
      headless: false, // Pure Puppeteer: visible browser
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false
    },
    performanceConfig: {
      enableNetworkMonitoring: true,
      enableConsoleLogging: true,
      enablePerformanceMetrics: true,
      enableMemoryTracking: false,
      screenshotQuality: 'high',
      screenshotFormat: 'png'
    },
    selectorConfig: {
      strategy: 'hybrid',
      priority: ['id', 'data-testid', 'name', 'role', 'class'],
      fallback: true,
      timeout: 10000,
      retryAttempts: 3
    },
    domainScopeConfig: {
      allowedDomains: [],
      blockedDomains: [],
      ssoWhitelist: [],
      pauseOnNavigation: true,
      autoResume: false
    },
    steps: [],
    variables: [],
    logicSpec: null,
    runStatus: 'idle',
    schedules: [],
    currentStep: 0,
    isRecording: false,
    sessionId: null,
    recordingUrl: null,
    errors: {},
    loading: false,
    debugMode: false,
    performanceMetrics: {
      startTime: null,
      endTime: null,
      actionsCaptured: 0,
      screenshotsTaken: 0,
      networkRequests: 0,
      consoleLogs: 0,
      memoryUsage: 0
    },
    autoConfigStatus: null,
    autoConfigSettings: null,
    autoConfigTimeout: null,
    isAutoConfiguring: false
  })

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (state.autoConfigTimeout) {
        clearTimeout(state.autoConfigTimeout)
      }
    }
  }, [state.autoConfigTimeout])

  // Auto-configuration function with debouncing
  const triggerAutoConfiguration = async (url: string) => {
    if (!url || !url.startsWith('http') || state.isAutoConfiguring) return
    
    // Clear any existing timeout
    if (state.autoConfigTimeout) {
      clearTimeout(state.autoConfigTimeout)
    }
    
    // Set a timeout to debounce the auto-configuration
    const timeoutId = setTimeout(async () => {
      setState(prev => ({ 
        ...prev, 
        isAutoConfiguring: true,
        autoConfigStatus: { type: 'info', message: 'Analyzing website...' }
      }))
      
      try {
        const response = await fetch('/api/workflows/auto-configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        })
        
        if (response.ok) {
          const result = await response.json()
          setState(prev => ({ 
            ...prev, 
            isAutoConfiguring: false,
            autoConfigStatus: { type: 'success', message: 'Auto-configuration complete!' },
            autoConfigSettings: result.configuration
          }))
        } else {
          setState(prev => ({ 
            ...prev, 
            isAutoConfiguring: false,
            autoConfigStatus: { type: 'warning', message: 'Auto-configuration failed, using defaults' }
          }))
        }
      } catch (error) {
        console.warn('Auto-configuration failed, using defaults:', error)
        setState(prev => ({ 
          ...prev, 
          isAutoConfiguring: false,
          autoConfigStatus: { type: 'warning', message: 'Using default settings (auto-configuration unavailable)' }
        }))
      }
    }, 1000) // 1 second debounce
    
    setState(prev => ({ 
      ...prev, 
      autoConfigTimeout: timeoutId
    }))
  }

  // Navigation functions
  const goToStep = (step: number) => {
    if (step >= 0 && step < ENHANCED_WIZARD_STEPS.length) {
      console.log(`🔄 Navigating to step ${step}, current state:`, {
        workflowName: state.workflowName,
        targetUrl: state.targetUrl,
        currentStep: state.currentStep
      })
      setState(prev => ({ ...prev, currentStep: step, errors: {} }))
    }
  }

  const nextStep = () => {
    if (state.currentStep < ENHANCED_WIZARD_STEPS.length - 1) {
      goToStep(state.currentStep + 1)
    }
  }

  const prevStep = () => {
    if (state.currentStep > 0) {
      goToStep(state.currentStep - 1)
    }
  }

  // Enhanced step validation
  const canProceed = (): boolean => {
    switch (state.currentStep) {
      case 0: // Setup
        return state.workflowName.trim() !== '' && state.targetUrl.trim() !== ''
      case 1: // Record
        return state.workflowName.trim() !== '' && state.targetUrl.trim() !== ''
      case 2: // Playback
        return state.steps.length > 0 || state.sessionId !== null
      case 3: // Variables
        return true // Variables are optional
      case 4: // Logic
        return true // Logic is optional
      case 5: // Validate
        return true // Validation step
      case 6: // Run
        return true // Run step
      case 7: // Schedule
        return true // Schedule step
      default:
        return false
    }
  }

  // Enhanced Puppeteer recording with all best practices
  const startRecording = async () => {
    console.log('🎥 Starting enhanced Puppeteer recording...')
    
    // Validate required fields
    if (!state.workflowName.trim()) {
      setState(prev => ({ 
        ...prev, 
        errors: { record: 'Please enter a workflow name first' }
      }))
      return
    }

    if (!state.targetUrl.trim()) {
      setState(prev => ({ 
        ...prev, 
        errors: { record: 'Please enter a target URL first' }
      }))
      return
    }
    
    setState(prev => ({ 
      ...prev, 
      isRecording: true, 
      loading: true,
      performanceMetrics: {
        ...prev.performanceMetrics,
        startTime: Date.now()
      }
    }))
    
    try {
      console.log('🎬 Starting enhanced Puppeteer recording with configuration:', {
        url: state.targetUrl,
        browserConfig: state.browserConfig,
        performanceConfig: state.performanceConfig,
        selectorConfig: state.selectorConfig,
        domainScopeConfig: state.domainScopeConfig
      })
      
      // Generate workflow ID if not set
      const workflowId = state.workflowId || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const response = await fetch(`/api/recordings/unified`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflowId: workflowId,
          url: state.targetUrl,
          config: {
            // Screen capture configuration
            allowedDomains: state.domainScopeConfig.allowedDomains,
            ssoWhitelist: state.domainScopeConfig.ssoWhitelist,
            
            // Puppeteer configuration
            puppeteerConfig: {
              // Browser configuration
              headless: state.browserConfig.headless,
              viewport: state.browserConfig.viewport,
              userAgent: state.browserConfig.userAgent,
              deviceScaleFactor: state.browserConfig.deviceScaleFactor,
              isMobile: state.browserConfig.isMobile,
              hasTouch: state.browserConfig.hasTouch,
              
              // Performance configuration
              includeScreenshots: true,
              captureFrequency: 1000,
              includeNetworkRequests: state.performanceConfig.enableNetworkMonitoring,
              includeConsoleLogs: state.performanceConfig.enableConsoleLogging,
              enablePerformanceMetrics: state.performanceConfig.enablePerformanceMetrics,
              enableMemoryTracking: state.performanceConfig.enableMemoryTracking,
              screenshotQuality: state.performanceConfig.screenshotQuality,
              screenshotFormat: state.performanceConfig.screenshotFormat,
              
              // Selector configuration
              selectorStrategy: state.selectorConfig.strategy,
              selectorPriority: state.selectorConfig.priority,
              selectorFallback: state.selectorConfig.fallback,
              timeout: state.selectorConfig.timeout,
              retryAttempts: state.selectorConfig.retryAttempts,
              
              // Domain scope configuration
              domainScope: {
                allowedDomains: state.domainScopeConfig.allowedDomains,
                blockedDomains: state.domainScopeConfig.blockedDomains,
                ssoWhitelist: state.domainScopeConfig.ssoWhitelist,
                pauseOnNavigation: state.domainScopeConfig.pauseOnNavigation,
                autoResume: state.domainScopeConfig.autoResume
              },
              
              // Login configuration
              requiresLogin: !!state.loginConfig,
              loginConfig: state.loginConfig,
              
              // Debug mode
              debugMode: state.debugMode
            }
          }
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start recording')
      }
      
      const { sessionId } = await response.json()
      console.log('✅ Enhanced Puppeteer recording started:', sessionId)
      
      setState(prev => ({ 
        ...prev, 
        workflowId: workflowId,
        sessionId,
        loading: false,
        errors: {} // Clear any previous errors
      }))
      
    } catch (error) {
      console.error('🎥 Failed to start enhanced Puppeteer recording:', error)
      
      setState(prev => ({ 
        ...prev, 
        isRecording: false, 
        loading: false,
        errors: { record: error instanceof Error ? error.message : 'Failed to start recording' }
      }))
    }
  }

  const stopRecording = async () => {
    console.log('⏹️ Stopping enhanced Puppeteer recording...')
    setState(prev => ({ ...prev, loading: true }))
    
    try {
      if (!state.sessionId) {
        throw new Error('No active session to stop')
      }

      const response = await fetch(`/api/recordings/unified`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: state.sessionId })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to stop recording')
      }
      
      console.log('✅ Enhanced Puppeteer recording stopped')
      
      setState(prev => ({ 
        ...prev, 
        isRecording: false,
        loading: false,
        performanceMetrics: {
          ...prev.performanceMetrics,
          endTime: Date.now()
        },
        errors: {} // Clear any previous errors
      }))
      
      // Auto-save the workflow after recording
      await saveWorkflow()
      
    } catch (error) {
      console.error('⏹️ Failed to stop enhanced Puppeteer recording:', error)
      setState(prev => ({ 
        ...prev, 
        isRecording: false, // Set to false even on error
        loading: false,
        errors: { record: error instanceof Error ? error.message : 'Failed to stop recording' }
      }))
    }
  }

  const saveWorkflow = async () => {
    console.log('💾 Save enhanced workflow called with state:', {
      workflowName: state.workflowName,
      sessionId: state.sessionId,
      performanceMetrics: state.performanceMetrics
    })
    
    if (!state.workflowName.trim()) {
      console.log('⚠️ Cannot save workflow: missing workflow name')
      setState(prev => ({ 
        ...prev, 
        errors: { save: 'Please enter a workflow name first' }
      }))
      return
    }
    
    if (!state.sessionId) {
      console.log('⚠️ Cannot save workflow: no recording session')
      setState(prev => ({ 
        ...prev, 
        errors: { save: 'Please record a workflow first' }
      }))
      return
    }

    setState(prev => ({ ...prev, loading: true }))
    
    try {
      console.log('💾 Saving enhanced workflow to database...')
      
      // Create enhanced workflow data for workflow recording endpoint
      const workflowData = {
        workflowId: state.workflowId || `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        workflowName: state.workflowName,
        url: state.recordingUrl || 'https://example.com',
        actions: [], // Empty for now - will be populated from recorded session
        variables: [], // Empty for now
        requiresLogin: false,
        settings: {
          headless: state.browserConfig.headless,
          viewport: {
            width: state.browserConfig.viewport?.width || 1280,
            height: state.browserConfig.viewport?.height || 720
          },
          timeout: 30000
        }
      }
      
      console.log('📤 Sending enhanced workflow data:', workflowData)
      
      // Save to database via workflow recording API
      const response = await fetch('/api/agents/record-workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflowData)
      })
      
      console.log('📡 API response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API error response:', errorText)
        
        if (response.status === 401) {
          throw new Error('Please login to save workflows. Click the login button in the sidebar.')
        } else {
          throw new Error(`Failed to save workflow: ${response.status} ${response.statusText} - ${errorText}`)
        }
      }
      
      const result = await response.json()
      console.log('✅ Enhanced workflow saved successfully:', result)
      
      setState(prev => ({ 
        ...prev, 
        workflowId: result.id,
        loading: false,
        errors: {}
      }))
      
      // Show success message
      alert('✅ Enhanced workflow saved successfully! You can now view it in the workflows list.')
      
    } catch (error) {
      console.error('❌ Failed to save enhanced workflow:', error)
      setState(prev => ({ 
        ...prev, 
        loading: false,
        errors: { save: `Failed to save workflow: ${error instanceof Error ? error.message : 'Unknown error'}` }
      }))
    }
  }

  // Render enhanced step content
  const renderStepContent = () => {
    // const currentStepData = ENHANCED_WIZARD_STEPS[state.currentStep]
    
    switch (state.currentStep) {
      case 0: // Setup
        return (
          <div>
            <div className="form-group">
              <label className="form-label required">
                Workflow Name
              </label>
              <input
                type="text"
                value={state.workflowName}
                onChange={(e) => setState(prev => ({ ...prev, workflowName: e.target.value }))}
                placeholder="Enter a descriptive name for your workflow"
                className="input"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">
                Description
              </label>
              <textarea
                value={state.description}
                onChange={(e) => setState(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description of what this workflow does"
                className="input"
                rows={3}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label required">
                Target URL
              </label>
              <input
                type="url"
                value={state.targetUrl}
                onChange={(e) => {
                  setState(prev => ({ ...prev, targetUrl: e.target.value }))
                  // Only trigger auto-configuration for complete URLs
                  if (e.target.value && e.target.value.startsWith('http') && e.target.value.includes('.')) {
                    triggerAutoConfiguration(e.target.value)
                  }
                }}
                placeholder="https://example.com"
                className="input"
              />
              <div className="form-help">
                Enter the URL where you want to record the workflow
              </div>
            </div>
            
            <div className="form-group">
              <div className="auto-config-info">
                <h4>🤖 Auto-Configuration</h4>
                <p>When you enter a URL, our system will automatically:</p>
                <ul>
                  <li>Analyze the website's framework and complexity</li>
                  <li>Detect optimal browser settings for your system</li>
                  <li>Configure performance monitoring</li>
                  <li>Set up intelligent element selection</li>
                  <li>Optimize capture settings for the site</li>
                </ul>
                <div className="auto-config-status">
                  {state.autoConfigStatus && (
                    <div className={`status-message ${state.autoConfigStatus.type}`}>
                      {state.autoConfigStatus.message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )

      case 1: // Record
        return (
          <div>
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎥</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {state.isRecording ? 'Enhanced Recording in Progress...' : 'Ready for Enhanced Recording'}
                </h3>
                {state.workflowName && (
                  <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                    <strong>Workflow:</strong> {state.workflowName}
                  </div>
                )}
                {state.targetUrl && (
                  <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                    <strong>Target URL:</strong> {state.targetUrl}
                  </div>
                )}
                <p className="text-gray-600">
                  {state.isRecording 
                    ? 'Puppeteer browser window is open for recording. Interact with the browser to record your workflow.'
                    : 'Click Start Recording to open a Puppeteer browser window for recording.'
                  }
                </p>
              </div>
              
              <div className="step-actions">
                {!state.isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={state.loading}
                    className="btn danger"
                  >
                    {state.loading ? '⏳ Opening Browser...' : '🔴 Start Puppeteer Recording'}
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    disabled={state.loading}
                    className="btn secondary"
                  >
                    {state.loading ? '⏳ Closing Browser...' : '⏹️ Stop Recording'}
                  </button>
                )}
              </div>
            </div>
            
            {state.errors.record && (
              <div className="alert error">
                <span className="alert-icon">❌</span>
                <div className="alert-content">
                  <div className="alert-message">
                    {state.errors.record}
                  </div>
                </div>
              </div>
            )}
            
            {state.errors.save && (
              <div className="alert error">
                <span className="alert-icon">❌</span>
                <div className="alert-content">
                  <div className="alert-message">
                    {state.errors.save}
                  </div>
                </div>
              </div>
            )}
          </div>
        )

      case 2: // Playback
        return (
          <div>
            <div className="alert info">
              <span className="alert-icon">🎬</span>
              <div className="alert-content">
                <div className="alert-message">
                  Review your recorded workflow with Puppeteer screenshots, performance metrics, and detailed action timeline.
                </div>
              </div>
            </div>
            
            {state.sessionId ? (
              <PuppeteerPlayback 
                workflowId={state.workflowId || 'temp'}
                sessionId={state.sessionId}
                onStepSelect={(step) => console.log('Selected step:', step)}
              />
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <div className="empty-state-title">No Puppeteer session available</div>
                <div className="empty-state-message">
                  Go back to the Record step to capture your workflow with enhanced Puppeteer features.
                </div>
                <div className="mt-4">
                  <button 
                    onClick={() => {
                      // Create a demo session for testing
                      const demoSessionId = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                      setState(prev => ({ 
                        ...prev, 
                        sessionId: demoSessionId,
                        performanceMetrics: {
                          ...prev.performanceMetrics,
                          actionsCaptured: 3,
                          screenshotsTaken: 3,
                          networkRequests: 5,
                          consoleLogs: 2
                        }
                      }))
                    }}
                    className="btn btn-primary"
                  >
                    Load Demo Session
                  </button>
                </div>
              </div>
            )}
            
            {/* Performance Metrics Display */}
            {state.performanceMetrics.startTime && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Performance Metrics</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Actions Captured:</strong> {state.performanceMetrics.actionsCaptured}
                  </div>
                  <div>
                    <strong>Screenshots Taken:</strong> {state.performanceMetrics.screenshotsTaken}
                  </div>
                  <div>
                    <strong>Network Requests:</strong> {state.performanceMetrics.networkRequests}
                  </div>
                  <div>
                    <strong>Console Logs:</strong> {state.performanceMetrics.consoleLogs}
                  </div>
                </div>
              </div>
            )}
          </div>
        )

      // ... other cases remain similar but enhanced
      default:
        return (
          <div className="empty-state">
            <div className="empty-state-icon">🚧</div>
            <div className="empty-state-title">Step not implemented</div>
            <div className="empty-state-message">
              This step will be available in the next version.
            </div>
          </div>
        )
    }
  }

  return (
    <div className="wizard">
      {/* Header */}
      <div className="wizard-header">
        <h1>Enhanced Puppeteer Workflow Wizard</h1>
        <p>Create enterprise-grade automated workflows with Puppeteer best practices</p>
      </div>

      {/* Progress Steps */}
      <div className="wizard-steps">
        {ENHANCED_WIZARD_STEPS.map((step, index) => (
          <div 
            key={step.id} 
            className={`step ${index === state.currentStep ? 'active' : ''} ${index < state.currentStep ? 'completed' : ''}`}
          >
            <span className="step-number">
              {index < state.currentStep ? '✓' : index + 1}
            </span>
            <span className="step-title">{step.title}</span>
            <span className="step-description">{step.description}</span>
          </div>
        ))}
      </div>

      {/* Error Messages */}
      {Object.entries(state.errors).some(([key, error]) => error && key !== 'save') && (
        <div className="alert error">
          <span className="alert-icon">⚠️</span>
          <div className="alert-content">
            <div className="alert-title">Please fix the following errors:</div>
            <ul>
              {Object.entries(state.errors).map(([key, error]) => 
                error && key !== 'save' ? <li key={key}>{error}</li> : null
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="wizard-content">
        <div className="wizard-card">
          <h2>{ENHANCED_WIZARD_STEPS[state.currentStep].title}</h2>
          <p>{ENHANCED_WIZARD_STEPS[state.currentStep].description}</p>
          
          <div className="step-content">
            {renderStepContent()}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="wizard-footer">
        <button
          onClick={prevStep}
          disabled={state.currentStep === 0}
          className="btn secondary"
        >
          ← Back
        </button>

        <div>
          {state.currentStep === ENHANCED_WIZARD_STEPS.length - 1 ? (
            <button
              onClick={() => router.push('/agents')}
              className="btn success"
            >
              ✓ Finish
            </button>
          ) : (
            <button
              onClick={nextStep}
              disabled={!canProceed() || state.loading}
              className="btn primary"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
