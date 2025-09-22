"use client"

import { useState, useRef, useEffect, useCallback, memo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import useSWR from 'swr'

// New 4-Step Agent Creation Wizard
// 1. Choose Login: Select which login to use for this agent
// 2. Record Workflow: Capture the workflow to automate
// 3. LLM Summary: AI summarizes what it understood
// 4. Test Workflow: Agent replicates the process to prove it works

// Step definitions for the new wizard
const STEPS = [
  { id: 1, title: "Choose Login", description: "Select login credentials" },
  { id: 2, title: "Record Workflow", description: "Capture your process" },
  { id: 3, title: "LLM Summary", description: "AI understands your workflow" },
  { id: 4, title: "Test Workflow", description: "Verify automation works" }
] as const

type StepId = typeof STEPS[number]['id']

// Fetcher for logins
const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Step 1: Choose Login - Memoized to prevent re-mounting
interface Step1LoginProps {
  selectedLoginId: string
  onLoginSelect: (loginId: string) => void
  isStep1Valid: () => boolean
  onNextStep: () => void
}

const Step1Login = memo(({ selectedLoginId, onLoginSelect, isStep1Valid, onNextStep }: Step1LoginProps) => {
  const { data: logins, error, isLoading } = useSWR('/api/logins', fetcher)

  if (isLoading) return <div>Loading logins...</div>
  if (error) return <div>Error loading logins</div>

  return (
    <div style={{
      backgroundColor: "#fff",
      borderRadius: "8px",
      border: "1px solid #dee2e6",
      padding: "32px",
      maxWidth: "600px",
      margin: "0 auto"
    }}>
      <h2 style={{
        fontSize: "24px",
        fontWeight: "600",
        margin: "0 0 8px 0",
        color: "#333"
      }}>
        Step 1: Choose Login
      </h2>
      <p style={{
        color: "#666",
        fontSize: "16px",
        margin: "0 0 32px 0"
      }}>
        Select which login credentials this agent should use to access the system.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {logins?.logins?.map((login: { id: string; name: string; loginUrl: string }) => (
          <div
            key={login.id}
            onClick={() => onLoginSelect(login.id)}
            style={{
              padding: "16px",
              border: selectedLoginId === login.id ? "2px solid #007bff" : "1px solid #dee2e6",
              borderRadius: "8px",
              cursor: "pointer",
              backgroundColor: selectedLoginId === login.id ? "#f8f9ff" : "#fff",
              transition: "all 0.2s ease"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h4 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "600" }}>
                  {login.name}
                </h4>
                <p style={{ margin: "0", fontSize: "14px", color: "#666" }}>
                  {login.loginUrl}
                </p>
              </div>
              <div style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                border: selectedLoginId === login.id ? "2px solid #007bff" : "2px solid #dee2e6",
                backgroundColor: selectedLoginId === login.id ? "#007bff" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: "12px"
              }}>
                {selectedLoginId === login.id && "✓"}
              </div>
            </div>
          </div>
        ))}
        
        {(!logins?.logins || logins.logins.length === 0) && (
          <div style={{
            padding: "24px",
            textAlign: "center",
            color: "#666",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
            border: "1px solid #e9ecef"
          }}>
            <p style={{ margin: "0 0 16px 0" }}>No logins available</p>
            <Link 
              href="/logins" 
              style={{ 
                color: "#007bff", 
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "500"
              }}
            >
              Create a login first →
            </Link>
          </div>
        )}
      </div>

      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        paddingTop: "24px",
        borderTop: "1px solid #f1f3f4"
      }}>
        <Link 
          href="/agents" 
          style={{ 
            color: "#6c757d", 
            textDecoration: "none",
            fontSize: "14px",
            transition: "color 0.2s ease"
          }}
        >
          ← Back to Agents
        </Link>
        <button 
          onClick={onNextStep}
          disabled={!isStep1Valid()}
          style={{ 
            background: isStep1Valid() ? "#007bff" : "#6c757d",
            color: "#fff",
            padding: "12px 24px",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: isStep1Valid() ? "pointer" : "not-allowed",
            transition: "background-color 0.2s ease",
            opacity: isStep1Valid() ? 1 : 0.6
          }}
        >
          Next → Record
        </button>
      </div>
    </div>
  )
})

Step1Login.displayName = 'Step1Login'

export default function CreateAgentPage() {
  const router = useRouter()
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState<StepId>(1)
  const [agentId, setAgentId] = useState<string | null>(null)
  
  // Step 1: Login Selection
  const [selectedLoginId, setSelectedLoginId] = useState("")
  
  // Step 2: Recording
  const [isRecording, setIsRecording] = useState(false)
  const [hasRecording, setHasRecording] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Step 3: LLM Summary
  const [workflowSummary, setWorkflowSummary] = useState("")
  const [isSummarizing, setIsSummarizing] = useState(false)
  
  // Step 4: Testing
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  
  // Common state
  const [error, setError] = useState("")
  
  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingBlobRef = useRef<Blob | null>(null)

  // Validation for each step
  const isStep1Valid = () => selectedLoginId !== ""
  const isStep2Valid = hasRecording && !isRecording
  const isStep3Valid = () => workflowSummary !== ""
  const isStep4Valid = () => testResult?.success === true

  // Step navigation functions
  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as StepId)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as StepId)
    }
  }

  // Step 1: Login selection handler
  const handleLoginSelect = useCallback((loginId: string) => {
    setSelectedLoginId(loginId)
  }, [])

  // Step 3: Generate LLM summary
  const handleGenerateSummary = async () => {
    if (!agentId) return
    
    setIsSummarizing(true)
    setError("")
    
    try {
      const response = await fetch(`/api/agents/${agentId}/summarize-workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate summary')
      }
      
      const data = await response.json()
      setWorkflowSummary(data.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary')
    } finally {
      setIsSummarizing(false)
    }
  }

  // Step 4: Test workflow
  const handleTestWorkflow = async () => {
    if (!agentId) return
    
    setIsTesting(true)
    setError("")
    
    try {
      const response = await fetch(`/api/agents/${agentId}/test-workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to test workflow')
      }
      
      const data = await response.json()
      setTestResult(data.result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test workflow')
    } finally {
      setIsTesting(false)
    }
  }

  // Step 2: Recording functions
  const startRecording = async () => {
    try {
      setError("")
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: true 
      })
      
      streamRef.current = stream
      
      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      })
      
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        
        // Validate file size (100MB limit)
        const maxSize = 100 * 1024 * 1024 // 100MB
        if (blob.size > maxSize) {
          setError(`Recording too large (${Math.round(blob.size / (1024 * 1024))}MB). Maximum size is 100MB. Please record a shorter video.`)
          setHasRecording(false)
          recordingBlobRef.current = null
        } else {
          recordingBlobRef.current = blob
          setHasRecording(true)
        }
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
        }
      }
      
      mediaRecorder.start()
      setIsRecording(true)
      
    } catch (err) {
      console.error('Error starting recording:', err)
      setError("Failed to start recording. Please ensure you grant screen sharing permissions.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // Step 2: Save recording and create agent
  const handleSaveRecording = async () => {
    if (!recordingBlobRef.current) {
      setError("No recording available to save")
      return
    }

    if (!selectedLoginId) {
      setError("Please select a login first")
      return
    }

    setIsSaving(true)
    setError("")

    try {
      // Build FormData object for multipart upload
      const formData = new FormData()
      formData.append("name", `Agent ${Date.now()}`) // Auto-generate name
      formData.append("file", recordingBlobRef.current, "recording.webm")
      formData.append("loginId", selectedLoginId) // Include selected login

      // Send to the record endpoint with FormData
      const response = await fetch('/api/agents/record', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      // Parse response to get the new agent
      const data = await response.json()
      const newAgent = data.agent

      if (!newAgent || !newAgent.id) {
        throw new Error("Invalid response: agent ID not found")
      }

      // Set agent ID and move to next step
      setAgentId(newAgent.id)
      nextStep()
      
    } catch (err) {
      console.error('Error saving agent:', err)
      setError(err instanceof Error ? err.message : "Failed to save agent")
    } finally {
      setIsSaving(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Progress indicator component
  const ProgressIndicator = () => (
    <div style={{
      display: "flex",
      justifyContent: "center",
      marginBottom: "32px",
      padding: "20px",
      backgroundColor: "#f8f9fa",
      borderRadius: "8px",
      border: "1px solid #dee2e6"
    }}>
      <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
        {STEPS.map((step, index) => (
          <div key={step.id} style={{ display: "flex", alignItems: "center" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: currentStep >= step.id ? "#007bff" : "#e9ecef",
              color: currentStep >= step.id ? "#fff" : "#6c757d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: "600",
              border: `2px solid ${currentStep >= step.id ? "#007bff" : "#e9ecef"}`,
              transition: "all 0.3s ease"
            }}>
              {currentStep > step.id ? "✓" : step.id}
            </div>
            <div style={{ marginLeft: "8px", textAlign: "left" }}>
              <div style={{
                fontSize: "14px",
                fontWeight: currentStep === step.id ? "600" : "500",
                color: currentStep >= step.id ? "#007bff" : "#6c757d"
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
                width: "20px",
                height: "2px",
                backgroundColor: currentStep > step.id ? "#007bff" : "#e9ecef",
                margin: "0 8px",
                transition: "background-color 0.3s ease"
              }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )


  // Step 3: LLM Summary
  const Step3Summary = () => (
    <div style={{
      backgroundColor: "#fff",
      borderRadius: "8px",
      border: "1px solid #dee2e6",
      padding: "32px",
      maxWidth: "600px",
      margin: "0 auto"
    }}>
      <h2 style={{
        fontSize: "24px",
        fontWeight: "600",
        margin: "0 0 8px 0",
        color: "#333"
      }}>
        Step 3: LLM Summary
      </h2>
      <p style={{
        color: "#666",
        fontSize: "16px",
        margin: "0 0 32px 0"
      }}>
        AI analyzes your recording and summarizes what it understood about your workflow.
      </p>

      {!workflowSummary ? (
        <div style={{
          padding: "24px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          border: "1px solid #e9ecef",
          textAlign: "center"
        }}>
          <button
            onClick={handleGenerateSummary}
            disabled={isSummarizing}
            style={{
              background: isSummarizing ? "#6c757d" : "#007bff",
              color: "#fff",
              padding: "12px 24px",
              border: "none",
              borderRadius: "6px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: isSummarizing ? "not-allowed" : "pointer",
              transition: "background-color 0.2s ease",
              opacity: isSummarizing ? 0.6 : 1
            }}
          >
            {isSummarizing ? "Analyzing..." : "Generate Summary"}
          </button>
        </div>
      ) : (
        <div style={{
          padding: "20px",
          backgroundColor: "#f8f9ff",
          borderRadius: "8px",
          border: "1px solid #007bff",
          marginBottom: "24px"
        }}>
          <h4 style={{
            fontSize: "16px",
            fontWeight: "600",
            margin: "0 0 12px 0",
            color: "#007bff"
          }}>
            🤖 AI Summary
          </h4>
          <div style={{
            fontSize: "14px",
            lineHeight: "1.6",
            color: "#333",
            whiteSpace: "pre-wrap"
          }}>
            {workflowSummary}
          </div>
        </div>
      )}

      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        paddingTop: "24px",
        borderTop: "1px solid #f1f3f4"
      }}>
        <button
          onClick={prevStep}
          style={{
            background: "transparent",
            color: "#6c757d",
            padding: "12px 24px",
            border: "1px solid #dee2e6",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
        >
          ← Previous
        </button>
        
        <button
          onClick={nextStep}
          disabled={!isStep3Valid()}
          style={{
            background: isStep3Valid() ? "#007bff" : "#6c757d",
            color: "#fff",
            padding: "12px 24px",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: isStep3Valid() ? "pointer" : "not-allowed",
            transition: "background-color 0.2s ease",
            opacity: isStep3Valid() ? 1 : 0.6
          }}
        >
          Next → Test
        </button>
      </div>
    </div>
  )

  // Step 4: Test Workflow
  const Step4Test = () => (
    <div style={{
      backgroundColor: "#fff",
      borderRadius: "8px",
      border: "1px solid #dee2e6",
      padding: "32px",
      maxWidth: "600px",
      margin: "0 auto"
    }}>
      <h2 style={{
        fontSize: "24px",
        fontWeight: "600",
        margin: "0 0 8px 0",
        color: "#333"
      }}>
        Step 4: Test Workflow
      </h2>
      <p style={{
        color: "#666",
        fontSize: "16px",
        margin: "0 0 32px 0"
      }}>
        Test that the agent can successfully replicate your recorded workflow.
      </p>

      {!testResult ? (
        <div style={{
          padding: "24px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          border: "1px solid #e9ecef",
          textAlign: "center"
        }}>
          <button
            onClick={handleTestWorkflow}
            disabled={isTesting}
            style={{
              background: isTesting ? "#6c757d" : "#28a745",
              color: "#fff",
              padding: "12px 24px",
              border: "none",
              borderRadius: "6px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: isTesting ? "not-allowed" : "pointer",
              transition: "background-color 0.2s ease",
              opacity: isTesting ? 0.6 : 1
            }}
          >
            {isTesting ? "Testing..." : "Test Workflow"}
          </button>
        </div>
      ) : (
        <div style={{
          padding: "20px",
          backgroundColor: testResult.success ? "#d4edda" : "#f8d7da",
          borderRadius: "8px",
          border: `1px solid ${testResult.success ? "#c3e6cb" : "#f5c6cb"}`,
          marginBottom: "24px"
        }}>
          <h4 style={{
            fontSize: "16px",
            fontWeight: "600",
            margin: "0 0 12px 0",
            color: testResult.success ? "#155724" : "#721c24"
          }}>
            {testResult.success ? "✅ Test Passed" : "❌ Test Failed"}
          </h4>
          <div style={{
            fontSize: "14px",
            lineHeight: "1.6",
            color: testResult.success ? "#155724" : "#721c24"
          }}>
            {testResult.success 
              ? "The agent successfully replicated your workflow!"
              : testResult.error || "The test failed. Please check the workflow."
            }
          </div>
        </div>
      )}

      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        paddingTop: "24px",
        borderTop: "1px solid #f1f3f4"
      }}>
        <button
          onClick={prevStep}
          style={{
            background: "transparent",
            color: "#6c757d",
            padding: "12px 24px",
            border: "1px solid #dee2e6",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
        >
          ← Previous
        </button>
        
        {isStep4Valid() && (
          <button
            onClick={() => router.push('/agents')}
            style={{
              background: "#28a745",
              color: "#fff",
              padding: "12px 24px",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "background-color 0.2s ease"
            }}
          >
            Complete → Agents
          </button>
        )}
      </div>
    </div>
  )

  // Step 2: Recording
  const Step2Recording = () => (
    <div style={{
      backgroundColor: "#fff",
      borderRadius: "8px",
      border: "1px solid #dee2e6",
      padding: "32px",
      maxWidth: "600px",
      margin: "0 auto"
    }}>
      <h2 style={{
        fontSize: "24px",
        fontWeight: "600",
        margin: "0 0 8px 0",
        color: "#333"
      }}>
        Step 2: Record Your Workflow
      </h2>
      <p style={{
        color: "#666",
        fontSize: "16px",
        margin: "0 0 32px 0"
      }}>
        Capture your screen to demonstrate the workflow you want to automate.
      </p>

      <div style={{
        padding: "24px",
        backgroundColor: "#f8f9fa",
        borderRadius: "8px",
        border: "1px solid #e9ecef",
        marginBottom: "24px"
      }}>
        <h4 style={{
          fontSize: "16px",
          fontWeight: "600",
          margin: "0 0 16px 0",
          color: "#495057",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          📹 Screen Recording
        </h4>
        
        {/* Status Label */}
        <div style={{
          fontSize: "14px",
          marginBottom: "16px",
          padding: "8px 12px",
          borderRadius: "6px",
          backgroundColor: isRecording ? "#fff3cd" : hasRecording ? "#d4edda" : "#e2e3e5",
          color: isRecording ? "#856404" : hasRecording ? "#155724" : "#6c757d",
          border: `1px solid ${isRecording ? "#ffeaa7" : hasRecording ? "#c3e6cb" : "#d6d8db"}`,
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          {isRecording ? (
            <>
              <div style={{
                width: "8px",
                height: "8px",
                backgroundColor: "#dc3545",
                borderRadius: "50%",
                animation: "pulse 1s infinite"
              }} />
              Recording in progress...
            </>
          ) : hasRecording ? (
            <>
              <span>✅</span>
              Recording complete ({recordingBlobRef.current ? Math.round(recordingBlobRef.current.size / (1024 * 1024) * 10) / 10 : 0}MB)
            </>
          ) : (
            <>
              <span>⏸️</span>
              Not recording
            </>
          )}
        </div>
        
        {/* Recording Buttons */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px" }}>
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              style={{
                background: "#dc3545",
                color: "#fff",
                padding: "12px 20px",
                border: "none",
                borderRadius: "6px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "background-color 0.2s ease, transform 0.1s ease",
                boxShadow: "0 2px 4px rgba(220, 53, 69, 0.2)"
              }}
            >
              <span>⏺</span>
              Start Recording
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              style={{
                background: "#6c757d",
                color: "#fff",
                padding: "12px 20px",
                border: "none",
                borderRadius: "6px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "background-color 0.2s ease, transform 0.1s ease"
              }}
            >
              <span>⏹</span>
              Stop Recording
            </button>
          )}
          
          {hasRecording && (
            <button
              type="button"
              onClick={() => {
                setHasRecording(false)
                recordingBlobRef.current = null
                chunksRef.current = []
              }}
              style={{
                background: "transparent",
                color: "#6c757d",
                padding: "12px 16px",
                border: "1px solid #dee2e6",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              Record Again
            </button>
          )}
        </div>
        
        <p style={{
          fontSize: "12px",
          color: "#6c757d",
          margin: 0,
          lineHeight: "1.4"
        }}>
          Click &quot;Start Recording&quot; to capture your screen and demonstrate the workflow you want to automate.
        </p>
      </div>

      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: "24px",
        borderTop: "1px solid #f1f3f4"
      }}>
        <button
          onClick={prevStep}
          style={{
            background: "transparent",
            color: "#6c757d",
            padding: "12px 24px",
            border: "1px solid #dee2e6",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
        >
          ← Previous
        </button>
        
        <button
          onClick={handleSaveRecording}
          disabled={!isStep2Valid || isSaving}
          style={{
            background: isStep2Valid && !isSaving ? "#007bff" : "#6c757d",
            color: "#fff",
            padding: "12px 24px",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: isStep2Valid && !isSaving ? "pointer" : "not-allowed",
            transition: "background-color 0.2s ease",
            opacity: isStep2Valid && !isSaving ? 1 : 0.6
          }}
        >
          {isSaving ? "Saving..." : "Save & Continue →"}
        </button>
      </div>
    </div>
  )

  // Error Message Component
  const ErrorMessage = () => error ? (
    <div style={{
      backgroundColor: "#f8d7da",
      color: "#721c24",
      padding: "12px 16px",
      borderRadius: "6px",
      border: "1px solid #f5c6cb",
      marginBottom: "24px",
      fontSize: "14px",
      maxWidth: "600px",
      margin: "0 auto 24px auto"
    }}>
      {error}
    </div>
  ) : null


  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 20px" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <Link href="/agents" style={{ 
          color: "#007bff", 
          textDecoration: "none",
          fontSize: "14px",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "16px"
        }}>
          <span>←</span>
          Back to Agents
        </Link>
        <h1 style={{ 
          fontSize: "32px", 
          fontWeight: "700", 
          margin: 0,
          color: "#333"
        }}>
          Create Agent
        </h1>
        <p style={{ 
          color: "#666", 
          fontSize: "16px",
          margin: "8px 0 0 0"
        }}>
          Follow the guided wizard to create your automation agent step by step.
        </p>
      </div>

      {/* Progress Indicator */}
      <ProgressIndicator />

      {/* Error Message */}
      <ErrorMessage />

      {/* Step Content */}
      {currentStep === 1 && (
        <Step1Login 
          selectedLoginId={selectedLoginId}
          onLoginSelect={handleLoginSelect}
          isStep1Valid={isStep1Valid}
          onNextStep={nextStep}
        />
      )}
      {currentStep === 2 && <Step2Recording />}
      {currentStep === 3 && <Step3Summary />}
      {currentStep === 4 && <Step4Test />}

      {/* CSS for pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
