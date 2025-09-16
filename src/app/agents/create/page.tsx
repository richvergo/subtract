"use client"

import { useState, useRef, useEffect, useCallback, memo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"

// Multi-step Agent Creation Wizard
// Follows the corrected golden path: Name → Record → Summarize → Context → Review → Live
// This replaces the single-page agent creation with a guided wizard flow
//
// Corrected Golden Path UX Flow:
// 1. Name: User defines agent name only (no purpose prompt)
// 2. Record: User records screen workflow with optional audio
// 3. Summarize: AI processes recording (handled in review page)
// 4. Context: User provides usage context (handled in review page)
// 5. Review: User reviews and approves/rejects (handled in review page)
// 6. Live: Agent becomes active (handled in review page)
//
// Integration with Backend:
// - POST /api/agents/record: Creates agent in DRAFT status with recording
// - Redirects to /agents/[id]/review for steps 3-6
// - Review page handles: /summarize, /review endpoints

// Step definitions for the wizard
const STEPS = [
  { id: 1, title: "Name", description: "Define your agent" },
  { id: 2, title: "Record", description: "Capture your workflow" },
  { id: 3, title: "Summarize", description: "AI processes recording" },
  { id: 4, title: "Context", description: "Add usage details" },
  { id: 5, title: "Review", description: "Final approval" },
  { id: 6, title: "Live", description: "Agent is active" }
] as const

type StepId = typeof STEPS[number]['id']

// Step 1: Name Your Agent - Memoized to prevent re-mounting
interface Step1NameProps {
  agentName: string
  onAgentNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  isStep1Valid: () => boolean
  onNextStep: () => void
}

const Step1Name = memo(({ agentName, onAgentNameChange, isStep1Valid, onNextStep }: Step1NameProps) => (
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
      Step 1: Name Your Agent
    </h2>
    <p style={{
      color: "#666",
      fontSize: "16px",
      margin: "0 0 32px 0"
    }}>
      Give your agent a descriptive name. You'll define what it does after recording the workflow.
    </p>

    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <label style={{ 
          display: "block", 
          marginBottom: "8px",
          fontSize: "14px",
          fontWeight: "600",
          color: "#495057"
        }}>
          Agent Name *
        </label>
        <input
          type="text"
          value={agentName}
          onChange={onAgentNameChange}
          placeholder="Enter a descriptive name for your agent"
          required
          autoComplete="off"
          style={{ 
            width: "100%", 
            padding: "12px 16px", 
            border: "1px solid #ced4da", 
            borderRadius: "6px",
            fontSize: "14px",
            transition: "border-color 0.2s ease, box-shadow 0.2s ease"
          }}
        />
        {!isStep1Valid() && (
          <p style={{
            fontSize: "12px",
            color: "#dc3545",
            margin: "4px 0 0 0"
          }}>
            Agent name is required
          </p>
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
  </div>
))

Step1Name.displayName = 'Step1Name'

export default function CreateAgentPage() {
  const router = useRouter()
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState<StepId>(1)
  const [agentId, setAgentId] = useState<string | null>(null)
  
  // Step 1: Agent Name - Controlled input state
  const [agentName, setAgentName] = useState("")
  
  // Memoized event handler to prevent re-renders
  const handleAgentNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Input changed:', e.target.value)
    setAgentName(e.target.value)
  }, [])
  
  
  // Step 2: Recording
  const [isRecording, setIsRecording] = useState(false)
  const [hasRecording, setHasRecording] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Common state
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingBlobRef = useRef<Blob | null>(null)

  // Validation for each step
  const isStep1Valid = () => {
    return agentName.trim() !== ""
  }
  const isStep2Valid = hasRecording && !isRecording

  // Step navigation functions
  const nextStep = () => {
    if (currentStep < 6) {
      setCurrentStep((currentStep + 1) as StepId)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as StepId)
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

    setIsSaving(true)
    setError("")

    try {
      // Build FormData object for multipart upload
      const formData = new FormData()
      formData.append("name", agentName.trim())
      formData.append("file", recordingBlobRef.current, "recording.webm")

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

      // Redirect to review page for steps 3-6
      router.push(`/agents/${newAgent.id}/review`)
      
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
          Click "Start Recording" to capture your screen and demonstrate the workflow you want to automate.
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
        <Step1Name 
          agentName={agentName}
          onAgentNameChange={handleAgentNameChange}
          isStep1Valid={isStep1Valid}
          onNextStep={nextStep}
        />
      )}
      {currentStep === 2 && <Step2Recording />}

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
