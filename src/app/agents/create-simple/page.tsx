"use client"

import { useState, useRef, useCallback, memo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import useSWR from 'swr'
import { useEnhancedRecording } from '@/lib/hooks/use-enhanced-recording'
import { RecordedAction } from '@/lib/enhanced-recorder-fixed'

// Simplified 4-Step Agent Creation Wizard
// 1. Name Agent: Give your agent a name and description
// 2. Record Workflow: Capture the workflow to automate
// 3. Save Agent: Create the agent with enhanced analysis
// 4. Configure (separate page): Set up parameters and data sources

const STEPS = [
  { id: 1, title: "Name Agent", description: "Give your agent a name and description" },
  { id: 2, title: "Record Workflow", description: "Capture your process with enhanced recording" },
  { id: 3, title: "Save Agent", description: "Create agent with AI analysis" }
] as const

// Step 1: Agent Name & Description
interface Step1NameProps {
  agentName: string
  agentDescription: string
  onNameChange: (name: string) => void
  onDescriptionChange: (description: string) => void
  isStep1Valid: boolean
  onNextStep: () => void
}

const Step1Name = memo(({ agentName, agentDescription, onNameChange, onDescriptionChange, isStep1Valid, onNextStep }: Step1NameProps) => {
  return (
    <div style={{ padding: "24px" }}>
      <h2 style={{
        fontSize: "24px",
        fontWeight: "600",
        color: "#212529",
        margin: "0 0 16px 0"
      }}>
        🤖 Name Your Agent
      </h2>
      
      <p style={{
        color: "#6c757d",
        fontSize: "16px",
        margin: "0 0 32px 0"
      }}>
        Give your automation agent a descriptive name and explain what it will do.
      </p>

      <div style={{ margin: "0 0 24px 0" }}>
        <label style={{
          display: "block",
          fontSize: "14px",
          fontWeight: "500",
          color: "#495057",
          margin: "0 0 8px 0"
        }}>
          Agent Name *
        </label>
        <input
          type="text"
          value={agentName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g., Invoice Download Automation"
          style={{
            width: "100%",
            padding: "12px 16px",
            border: "1px solid #ced4da",
            borderRadius: "8px",
            fontSize: "16px",
            backgroundColor: "#ffffff"
          }}
        />
      </div>

      <div style={{ margin: "0 0 32px 0" }}>
        <label style={{
          display: "block",
          fontSize: "14px",
          fontWeight: "500",
          color: "#495057",
          margin: "0 0 8px 0"
        }}>
          Description (Optional)
        </label>
        <textarea
          value={agentDescription}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Describe what this agent will automate, e.g., 'Downloads invoices from accounting system by filtering jobs and date ranges'"
          rows={4}
          style={{
            width: "100%",
            padding: "12px 16px",
            border: "1px solid #ced4da",
            borderRadius: "8px",
            fontSize: "16px",
            backgroundColor: "#ffffff",
            resize: "vertical"
          }}
        />
      </div>

      <div style={{
        display: "flex",
        justifyContent: "flex-end",
        padding: "24px 0 0 0",
        borderTop: "1px solid #dee2e6"
      }}>
        <button
          type="button"
          onClick={onNextStep}
          disabled={!isStep1Valid}
          style={{
            background: isStep1Valid ? "#28a745" : "#6c757d",
            color: "white",
            border: "none",
            padding: "12px 24px",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "500",
            cursor: isStep1Valid ? "pointer" : "not-allowed",
            opacity: isStep1Valid ? 1 : 0.6
          }}
        >
          Next: Record Workflow →
        </button>
      </div>
    </div>
  )
})
Step1Name.displayName = 'Step1Name'

// Step 2: Enhanced Recording
interface Step2RecordingProps {
  onRecordingComplete: (data: {
    videoBlob: Blob
    actions: RecordedAction[]
    session: any
  }) => void
  onPrev: () => void
  isStep2Valid: boolean
}

const Step2Recording = memo(({ onRecordingComplete, onPrev, isStep2Valid }: Step2RecordingProps) => {
  const {
    isRecording,
    hasRecording,
    session,
    actions,
    error,
    startRecording,
    stopRecording,
    clearRecording
  } = useEnhancedRecording()

  const [isProcessing, setIsProcessing] = useState(false)

  const handleStartRecording = useCallback(async () => {
    try {
      await startRecording()
    } catch (err) {
      console.error('Failed to start recording:', err)
    }
  }, [startRecording])

  const handleStopRecording = useCallback(async () => {
    try {
      setIsProcessing(true)
      const videoBlob = await stopRecording()
      
      if (videoBlob && session) {
        onRecordingComplete({
          videoBlob,
          actions,
          session
        })
      }
    } catch (err) {
      console.error('Failed to stop recording:', err)
    } finally {
      setIsProcessing(false)
    }
  }, [stopRecording, session, actions, onRecordingComplete])

  const handleClearRecording = useCallback(() => {
    clearRecording()
  }, [clearRecording])

  return (
    <div style={{ padding: "24px" }}>
      <h2 style={{
        fontSize: "24px",
        fontWeight: "600",
        color: "#212529",
        margin: "0 0 16px 0"
      }}>
        🎬 Record Your Workflow
      </h2>
      
      <p style={{
        color: "#6c757d",
        fontSize: "16px",
        margin: "0 0 32px 0",
        lineHeight: "1.5"
      }}>
        Capture your screen and all interactions to create a detailed workflow template.
        When you click "Start Recording", you'll be prompted to choose what to share - select a Chrome tab for best results. Our AI will analyze every click, type, and action to understand your process.
      </p>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: "16px",
          backgroundColor: "#f8d7da",
          color: "#721c24",
          border: "1px solid #f5c6cb",
          borderRadius: "8px",
          margin: "0 0 24px 0"
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Recording Status */}
      <div style={{
        padding: "24px",
        backgroundColor: "#f8f9fa",
        border: "2px dashed #dee2e6",
        borderRadius: "12px",
        margin: "0 0 24px 0",
        textAlign: "center"
      }}>
        <div style={{
          fontSize: "18px",
          fontWeight: "500",
          margin: "0 0 8px 0",
          color: "#495057"
        }}>
          {isRecording ? (
            <>
              <span style={{ color: "#dc3545" }}>🔴</span>
              Recording in progress... ({actions.length} actions captured)
            </>
          ) : hasRecording ? (
            <>
              <span style={{ color: "#28a745" }}>✅</span>
              Recording complete ({actions.length} actions captured)
            </>
          ) : (
            <>
              <span>⏸️</span>
              Ready to record
            </>
          )}
        </div>
        
        {/* Action Preview */}
        {actions.length > 0 && (
          <div style={{
            margin: "16px 0 0 0",
            padding: "16px",
            backgroundColor: "#ffffff",
            border: "1px solid #dee2e6",
            borderRadius: "8px",
            textAlign: "left"
          }}>
            <h4 style={{
              fontSize: "14px",
              fontWeight: "600",
              margin: "0 0 12px 0",
              color: "#495057"
            }}>
              Captured Actions ({actions.length}):
            </h4>
            <div style={{
              maxHeight: "200px",
              overflowY: "auto",
              fontSize: "12px"
            }}>
              {actions.slice(-10).map((action, index) => (
                <div key={action.id} style={{
                  padding: "8px",
                  backgroundColor: index % 2 === 0 ? "#f8f9fa" : "#ffffff",
                  borderBottom: "1px solid #e9ecef",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div>
                    <strong>{action.type}</strong>
                    {action.element?.tagName && (
                      <span style={{ color: "#6c757d", marginLeft: "8px" }}>
                        {action.element.tagName}
                        {action.element.text && `: "${action.element.text.substring(0, 30)}..."`}
                      </span>
                    )}
                    {action.value && (
                      <span style={{ color: "#007bff", marginLeft: "8px" }}>
                        "{action.value.substring(0, 20)}..."
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: "10px",
                    color: "#6c757d",
                    backgroundColor: "#e9ecef",
                    padding: "2px 6px",
                    borderRadius: "4px"
                  }}>
                    {Math.round(action.timestamp / 1000)}s
                  </span>
                </div>
              ))}
              {actions.length > 10 && (
                <div style={{
                  padding: "8px",
                  textAlign: "center",
                  color: "#6c757d",
                  fontSize: "12px"
                }}>
                  ... and {actions.length - 10} more actions
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recording Controls */}
      <div style={{
        display: "flex",
        gap: "12px",
        justifyContent: "center",
        margin: "0 0 32px 0"
      }}>
        {!isRecording && !hasRecording && (
          <button
            type="button"
            onClick={handleStartRecording}
            style={{
              background: "#dc3545",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <span>🔴</span>
            Start Recording
          </button>
        )}

        {isRecording && (
          <button
            type="button"
            onClick={handleStopRecording}
            disabled={isProcessing}
            style={{
              background: "#6c757d",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "500",
              cursor: isProcessing ? "not-allowed" : "pointer",
              opacity: isProcessing ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <span>{isProcessing ? "⏳" : "⏹️"}</span>
            {isProcessing ? "Processing..." : "Stop Recording"}
          </button>
        )}

        {hasRecording && (
          <>
            <button
              type="button"
              onClick={handleClearRecording}
              style={{
                background: "transparent",
                color: "#6c757d",
                border: "1px solid #dee2e6",
                padding: "12px 24px",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "500",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <span>🗑️</span>
              Clear Recording
            </button>

            <button
              type="button"
              onClick={handleStartRecording}
              style={{
                background: "#007bff",
                color: "white",
                border: "none",
                padding: "12px 24px",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "500",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <span>🔄</span>
              Record Again
            </button>
          </>
        )}
      </div>

      {/* Instructions */}
      <div style={{
        padding: "20px",
        backgroundColor: "#e7f3ff",
        border: "1px solid #b3d7ff",
        borderRadius: "8px",
        margin: "0 0 24px 0"
      }}>
        <h4 style={{
          fontSize: "14px",
          fontWeight: "600",
          margin: "0 0 8px 0",
          color: "#004085"
        }}>
          📋 Recording Instructions:
        </h4>
        <ul style={{
          margin: "0",
          paddingLeft: "20px",
          fontSize: "14px",
          color: "#004085",
          lineHeight: "1.5"
        }}>
          <li>Click "Start Recording" - you'll see a browser dialog to choose what to share</li>
          <li>Select "Chrome Tab" and choose the tab where your workflow will be performed</li>
          <li>Perform your workflow naturally - every click, type, and interaction will be captured</li>
          <li>Take your time to demonstrate the complete process</li>
          <li>Click "Stop Recording" when finished</li>
          <li>Our AI will analyze all captured actions to understand your workflow</li>
        </ul>
        
        <div style={{
          marginTop: "12px",
          padding: "12px",
          backgroundColor: "#fff3cd",
          border: "1px solid #ffeaa7",
          borderRadius: "6px",
          fontSize: "13px",
          color: "#856404"
        }}>
          <strong>💡 Tip:</strong> In the browser dialog, select "Chrome Tab" and choose the specific tab where you'll perform your workflow. This ensures all interactions are captured accurately.
        </div>
        
        <div style={{
          marginTop: "8px",
          padding: "12px",
          backgroundColor: "#e7f3ff",
          border: "1px solid #b3d7ff",
          borderRadius: "6px",
          fontSize: "13px",
          color: "#004085"
        }}>
          <strong>📋 Browser Dialog Options:</strong>
          <br />• <strong>Chrome Tab:</strong> Recommended - records one specific tab
          <br />• <strong>Window:</strong> Records an entire application window
          <br />• <strong>Entire Screen:</strong> Records your full desktop
        </div>
      </div>

      {/* Navigation */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "24px 0 0 0",
        borderTop: "1px solid #dee2e6"
      }}>
        <button
          type="button"
          onClick={onPrev}
          style={{
            background: "transparent",
            color: "#6c757d",
            border: "1px solid #dee2e6",
            padding: "12px 24px",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "500",
            cursor: "pointer"
          }}
        >
          ← Previous
        </button>

        <div style={{ color: "#6c757d", fontSize: "14px" }}>
          {hasRecording ? "✅ Recording complete - proceed to save" : "⏸️ Record your workflow to continue"}
        </div>
      </div>
    </div>
  )
})
Step2Recording.displayName = 'Step2Recording'

// Step 3: Save Agent
interface Step3SaveProps {
  agentName: string
  agentDescription: string
  recordingData: {
    videoBlob: Blob
    actions: RecordedAction[]
    session: any
  } | null
  onPrev: () => void
  onSave: () => void
  isSaving: boolean
  saveResult: any
}

const Step3Save = memo(({ agentName, agentDescription, recordingData, onPrev, onSave, isSaving, saveResult }: Step3SaveProps) => {
  return (
    <div style={{ padding: "24px" }}>
      <h2 style={{
        fontSize: "24px",
        fontWeight: "600",
        color: "#212529",
        margin: "0 0 16px 0"
      }}>
        💾 Save Your Agent
      </h2>
      
      <p style={{
        color: "#6c757d",
        fontSize: "16px",
        margin: "0 0 32px 0"
      }}>
        Review your agent details and save to create your automation with AI analysis.
      </p>

      {/* Agent Summary */}
      <div style={{
        padding: "24px",
        backgroundColor: "#f8f9fa",
        border: "1px solid #dee2e6",
        borderRadius: "12px",
        margin: "0 0 24px 0"
      }}>
        <h3 style={{
          fontSize: "18px",
          fontWeight: "600",
          margin: "0 0 16px 0",
          color: "#495057"
        }}>
          Agent Summary
        </h3>
        
        <div style={{ margin: "0 0 12px 0" }}>
          <strong>Name:</strong> {agentName}
        </div>
        
        {agentDescription && (
          <div style={{ margin: "0 0 12px 0" }}>
            <strong>Description:</strong> {agentDescription}
          </div>
        )}
        
        {recordingData && (
          <>
            <div style={{ margin: "0 0 12px 0" }}>
              <strong>Recording:</strong> {Math.round(recordingData.videoBlob.size / (1024 * 1024) * 10) / 10}MB video
            </div>
            <div style={{ margin: "0 0 12px 0" }}>
              <strong>Actions Captured:</strong> {recordingData.actions.length} interactions
            </div>
            <div style={{ margin: "0 0 12px 0" }}>
              <strong>Duration:</strong> {Math.round(recordingData.session.metadata.recordingDuration / 1000)}s
            </div>
          </>
        )}
      </div>

      {/* Save Result */}
      {saveResult && (
        <div style={{
          padding: "16px",
          backgroundColor: saveResult.success ? "#d4edda" : "#f8d7da",
          color: saveResult.success ? "#155724" : "#721c24",
          border: `1px solid ${saveResult.success ? "#c3e6cb" : "#f5c6cb"}`,
          borderRadius: "8px",
          margin: "0 0 24px 0"
        }}>
          {saveResult.success ? (
            <>
              <strong>✅ Agent Created Successfully!</strong>
              <p style={{ margin: "8px 0 0 0" }}>
                Your agent "{agentName}" has been created with enhanced AI analysis.
                {saveResult.analysis && (
                  <>
                    <br />
                    <strong>Analysis Results:</strong>
                    <br />• {saveResult.analysis.parameterizableActions} parameterizable actions detected
                    <br />• {saveResult.analysis.patterns} workflow patterns identified
                  </>
                )}
              </p>
            </>
          ) : (
            <>
              <strong>❌ Failed to Create Agent</strong>
              <p style={{ margin: "8px 0 0 0" }}>
                {saveResult.error || "An unknown error occurred. Please try again."}
              </p>
            </>
          )}
        </div>
      )}

      {/* Navigation */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "24px 0 0 0",
        borderTop: "1px solid #dee2e6"
      }}>
        <button
          type="button"
          onClick={onPrev}
          disabled={isSaving}
          style={{
            background: "transparent",
            color: "#6c757d",
            border: "1px solid #dee2e6",
            padding: "12px 24px",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "500",
            cursor: isSaving ? "not-allowed" : "pointer",
            opacity: isSaving ? 0.6 : 1
          }}
        >
          ← Previous
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || !recordingData}
          style={{
            background: isSaving || !recordingData ? "#6c757d" : "#28a745",
            color: "white",
            border: "none",
            padding: "12px 24px",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "500",
            cursor: isSaving || !recordingData ? "not-allowed" : "pointer",
            opacity: isSaving || !recordingData ? 0.6 : 1,
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <span>{isSaving ? "⏳" : "💾"}</span>
          {isSaving ? "Creating Agent..." : "Save Agent"}
        </button>
      </div>
    </div>
  )
})
Step3Save.displayName = 'Step3Save'

// Main Component
export default function CreateSimpleAgentPage() {
  const router = useRouter()
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1)
  
  // Agent data
  const [agentName, setAgentName] = useState("")
  const [agentDescription, setAgentDescription] = useState("")
  const [recordingData, setRecordingData] = useState<{
    videoBlob: Blob
    actions: RecordedAction[]
    session: any
  } | null>(null)
  
  // Save state
  const [isSaving, setIsSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<any>(null)

  // Validation for each step
  const isStep1Valid = () => agentName.trim() !== ""
  const isStep2Valid = () => recordingData !== null
  const isStep3Valid = () => recordingData !== null

  // Navigation
  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Handle recording completion
  const handleRecordingComplete = useCallback((data: {
    videoBlob: Blob
    actions: RecordedAction[]
    session: any
  }) => {
    setRecordingData(data)
    console.log('🎬 Recording completed:', {
      videoSize: Math.round(data.videoBlob.size / (1024 * 1024)),
      actionCount: data.actions.length,
      duration: Math.round(data.session.metadata.recordingDuration / 1000)
    })
  }, [])

  // Handle save
  const handleSave = useCallback(async () => {
    if (!recordingData) return

    setIsSaving(true)
    setSaveResult(null)

    try {
      const formData = new FormData()
      formData.append("name", agentName)
      formData.append("purposePrompt", agentDescription)
      formData.append("file", recordingData.videoBlob, "recording.webm")
      formData.append("actions", JSON.stringify({
        actions: recordingData.actions,
        session: recordingData.session
      }))

      const response = await fetch('/api/agents/record-enhanced', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      })

      const result = await response.json()

      if (response.ok) {
        setSaveResult({
          success: true,
          analysis: result.analysis
        })
        
        // Redirect to agents page after a short delay
        setTimeout(() => {
          router.push('/agents')
        }, 3000)
      } else {
        setSaveResult({
          success: false,
          error: result.error
        })
      }
    } catch (error) {
      console.error('Failed to save agent:', error)
      setSaveResult({
        success: false,
        error: 'Network error. Please try again.'
      })
    } finally {
      setIsSaving(false)
    }
  }, [agentName, agentDescription, recordingData, router])

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#f8f9fa",
      padding: "24px"
    }}>
      <div style={{
        maxWidth: "800px",
        margin: "0 auto",
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
      }}>
        {/* Header */}
        <div style={{
          padding: "24px 24px 0 24px",
          borderBottom: "1px solid #dee2e6"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            margin: "0 0 24px 0"
          }}>
            <h1 style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "#212529",
              margin: "0"
            }}>
              Create Agent
            </h1>
            <Link
              href="/agents"
              style={{
                color: "#6c757d",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "500"
              }}
            >
              ← Back to Agents
            </Link>
          </div>

          {/* Progress */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            margin: "0 0 24px 0"
          }}>
            {STEPS.map((step, index) => (
              <div key={step.id} style={{
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: currentStep >= step.id ? "#28a745" : "#e9ecef",
                  color: currentStep >= step.id ? "#ffffff" : "#6c757d",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: "600"
                }}>
                  {currentStep > step.id ? "✓" : step.id}
                </div>
                <div>
                  <div style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: currentStep >= step.id ? "#495057" : "#6c757d"
                  }}>
                    {step.title}
                  </div>
                  <div style={{
                    fontSize: "12px",
                    color: "#6c757d"
                  }}>
                    {step.description}
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <div style={{
                    width: "40px",
                    height: "2px",
                    backgroundColor: currentStep > step.id ? "#28a745" : "#e9ecef",
                    margin: "0 8px"
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div>
          {currentStep === 1 && (
            <Step1Name
              agentName={agentName}
              agentDescription={agentDescription}
              onNameChange={setAgentName}
              onDescriptionChange={setAgentDescription}
              isStep1Valid={isStep1Valid()}
              onNextStep={nextStep}
            />
          )}

          {currentStep === 2 && (
            <Step2Recording
              onRecordingComplete={handleRecordingComplete}
              onPrev={prevStep}
              isStep2Valid={isStep2Valid()}
            />
          )}

          {currentStep === 3 && (
            <Step3Save
              agentName={agentName}
              agentDescription={agentDescription}
              recordingData={recordingData}
              onPrev={prevStep}
              onSave={handleSave}
              isSaving={isSaving}
              saveResult={saveResult}
            />
          )}
        </div>
      </div>
    </div>
  )
}
