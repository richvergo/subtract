"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { EventTimeline, ScreenshotGallery, SummaryPanel } from "@/app/components"
import { EventLogEntry } from "@/lib/schemas/agents"

// Agent Review Page - Steps 3-6 of the golden path
// Step 3: Summarize (LLM processes recording)
// Step 4: Context (User provides usage details)
// Step 5: Review (Final approval with video playback)
// Step 6: Live (Agent becomes active)
//
// Backend Integration:
// - GET /api/agents/[id]/review: Loads agent data for review
// - POST /api/agents/[id]/summarize: Runs LLM summarization
// - POST /api/agents/[id]/review: Submits user decision (ACCEPT/REJECT)
//
// UX Features:
// - Auto-advance from summarize to context after LLM processing
// - Video playback with recording controls
// - Side-by-side layout: video + summary/context
// - Clear status indicators and progress tracking
// - Validation: userContext required for ACCEPT decision

interface AgentReviewData {
  id: string
  name: string
  recordingUrl?: string
  audioUrl?: string
  llmSummary?: string
  userContext?: string
  status: 'DRAFT' | 'ACTIVE' | 'REJECTED' | 'INACTIVE'
  processingStatus?: string
  processingProgress?: number
  eventLog?: string // JSON string of EventLogEntry[]
  transcript?: string
  events?: Array<{
    id: string
    step: number
    action: string
    target?: string
    url?: string
    elementType?: string
    elementText?: string
    screenshotUrl?: string
    createdAt: string
  }>
}

const REVIEW_STEPS = [
  { id: 3, title: "Summarize", description: "AI processes recording" },
  { id: 4, title: "Context", description: "Add usage details" },
  { id: 5, title: "Review", description: "Final approval" },
  { id: 6, title: "Live", description: "Agent is active" }
] as const

type ReviewStepId = typeof REVIEW_STEPS[number]['id']

// Helper function to parse event log
const parseEventLog = (eventLogString?: string): EventLogEntry[] => {
  if (!eventLogString) return []
  try {
    return JSON.parse(eventLogString)
  } catch {
    return []
  }
}



export default function AgentReviewPage() {
  const params = useParams()
  const agentId = params.id as string

  // State management
  const [currentStep, setCurrentStep] = useState<ReviewStepId>(3)
  const [agentData, setAgentData] = useState<AgentReviewData | null>(null)
  const [userContext, setUserContext] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")
  const [currentSummary, setCurrentSummary] = useState<string>("")

  // Use ref to maintain input value and prevent re-render issues
  const userContextRef = useRef<HTMLTextAreaElement>(null)
  
  // Memoize the onChange handler to prevent re-renders
  const handleUserContextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setUserContext(value)
  }, [])

  const loadAgentData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError("")

      const response = await fetch(`/api/agents/${agentId}/review`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to load agent data: ${response.status}`)
      }

      const data = await response.json()
      setAgentData(data.agent)
      setUserContext(data.agent.userContext || "")
      setCurrentSummary(data.agent.llmSummary || "")

      // If agent is already ACTIVE or REJECTED, go to final step
      if (data.agent.status === 'ACTIVE' || data.agent.status === 'REJECTED') {
        setCurrentStep(6)
      }
    } catch (err) {
      console.error('Error loading agent data:', err)
      setError(err instanceof Error ? err.message : "Failed to load agent data")
    } finally {
      setIsLoading(false)
    }
  }, [agentId])

  const runSummarization = useCallback(async () => {
    try {
      setIsProcessing(true)
      setError("")

      // Parse event log from agent data
      const eventLogEntries = parseEventLog(agentData?.eventLog)
      const transcript = agentData?.transcript || ""

      const response = await fetch(`/api/agents/${agentId}/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          eventLog: eventLogEntries,
          transcript: transcript
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to run summarization: ${response.status}`)
      }

      const data = await response.json()
      
      // Update agent data with new summary
      setAgentData(prev => prev ? { ...prev, llmSummary: data.agent.llmSummary } : null)
      setCurrentSummary(data.agent.llmSummary)
      
    } catch (err) {
      console.error('Error running summarization:', err)
      setError(err instanceof Error ? err.message : "Failed to run summarization")
    } finally {
      setIsProcessing(false)
    }
  }, [agentId, agentData])

  // Load agent data on mount
  useEffect(() => {
    if (agentId) {
      loadAgentData()
    }
  }, [agentId, loadAgentData])

  // Auto-call summarization if no summary exists
  useEffect(() => {
    if (agentData && !agentData.llmSummary && !isProcessing && currentStep === 3) {
      runSummarization()
    }
  }, [agentData, isProcessing, currentStep, runSummarization])

  // FIXED: Removed auto-advance to context step after summarization
  // This was causing the issue - users couldn't review the summary
  // Now users must manually click "Continue" to proceed
  // useEffect(() => {
  //   if (agentData?.llmSummary && currentStep === 3) {
  //     const timer = setTimeout(() => {
  //       setCurrentStep(4)
  //     }, 2000)
  //     return () => clearTimeout(timer)
  //   }
  // }, [agentData?.llmSummary, currentStep])

  const handleReviewDecision = async (decision: 'ACCEPT' | 'REJECT') => {
    try {
      setIsProcessing(true)
      setError("")

      if (decision === 'ACCEPT' && !userContext.trim()) {
        setError("User context is required when accepting the agent")
        return
      }

      const response = await fetch(`/api/agents/${agentId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userContext: userContext.trim(),
          decision
        }),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to submit review: ${response.status}`)
      }

      const data = await response.json()
      
      // Update agent data
      setAgentData(prev => prev ? { 
        ...prev, 
        status: data.agent.status,
        userContext: data.agent.userContext 
      } : null)
      
      // Move to final step
      setCurrentStep(6)
      
    } catch (err) {
      console.error('Error submitting review:', err)
      setError(err instanceof Error ? err.message : "Failed to submit review")
    } finally {
      setIsProcessing(false)
    }
  }

  const nextStep = () => {
    if (currentStep < 6) {
      setCurrentStep((currentStep + 1) as ReviewStepId)
    }
  }

  const prevStep = () => {
    if (currentStep > 3) {
      setCurrentStep((currentStep - 1) as ReviewStepId)
    }
  }

  // Progress indicator for review steps
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
        {REVIEW_STEPS.map((step, index) => (
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
            {index < REVIEW_STEPS.length - 1 && (
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

  // Step 3: Summarize
  const Step3Summarize = () => (
    <div style={{
      backgroundColor: "#fff",
      borderRadius: "8px",
      border: "1px solid #dee2e6",
      padding: "32px",
      maxWidth: "600px",
      margin: "0 auto",
      textAlign: "center"
    }}>
      <h2 style={{
        fontSize: "24px",
        fontWeight: "600",
        margin: "0 0 8px 0",
        color: "#333"
      }}>
        Step 3: AI Summarization
      </h2>
      <p style={{
        color: "#666",
        fontSize: "16px",
        margin: "0 0 32px 0"
      }}>
        Our AI is analyzing your recording to understand the workflow and generate a summary.
      </p>

      {!agentData?.llmSummary ? (
        <div>
          <div style={{
            fontSize: "48px",
            marginBottom: "24px",
            color: "#007bff"
          }}>
            🤖
          </div>
          <p style={{
            color: "#6c757d",
            fontSize: "16px",
            margin: "0 0 24px 0"
          }}>
            {isProcessing ? "AI is analyzing your recording..." : "Starting AI analysis..."}
          </p>
          
          {isProcessing && (
            <div style={{
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              padding: "20px",
              border: "1px solid #e9ecef",
              textAlign: "center"
            }}>
              <div style={{
                width: "40px",
                height: "40px",
                border: "4px solid #f3f3f3",
                borderTop: "4px solid #007bff",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 16px auto"
              }} />
              <p style={{
                color: "#495057",
                fontSize: "14px",
                margin: 0
              }}>
                Processing workflow and generating summary...
              </p>
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: "left" }}>
          <div style={{
            backgroundColor: "#d1edff",
            color: "#0c5460",
            padding: "16px",
            borderRadius: "8px",
            border: "1px solid #bee5eb",
            marginBottom: "24px"
          }}>
            <h4 style={{
              fontSize: "16px",
              fontWeight: "600",
              margin: "0 0 12px 0",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              ✅ AI Summary Generated
            </h4>
            <p style={{
              fontSize: "14px",
              lineHeight: "1.6",
              margin: 0
            }}>
              {agentData.llmSummary}
            </p>
          </div>
          
          <div style={{
            display: "flex",
            justifyContent: "center",
            paddingTop: "24px",
            borderTop: "1px solid #f1f3f4"
          }}>
            <button
              onClick={nextStep}
              style={{
                background: "#007bff",
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
              Continue to Context →
            </button>
          </div>
        </div>
      )}
    </div>
  )

  // Step 4: Context
  const Step4Context = () => (
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
        Step 4: Usage Context
      </h2>
      <p style={{
        color: "#666",
        fontSize: "16px",
        margin: "0 0 32px 0"
      }}>
        Provide context about how this agent will be used. This information helps with scheduling and execution.
      </p>

      <div style={{ marginBottom: "24px" }}>
        <label style={{ 
          display: "block", 
          marginBottom: "8px",
          fontSize: "14px",
          fontWeight: "600",
          color: "#495057"
        }}>
          What context will you provide each time this workflow runs? *
        </label>
        <textarea
          key="user-context-textarea"
          ref={userContextRef}
          defaultValue={userContext}
          onChange={handleUserContextChange}
          rows={4}
          placeholder="e.g., 'I will provide a list of company names to research', 'Run daily at 9 AM with the latest product data', 'Process invoices from the upload folder'"
          style={{ 
            width: "100%", 
            padding: "12px 16px", 
            border: "1px solid #ced4da", 
            borderRadius: "6px",
            fontSize: "14px",
            resize: "vertical",
            minHeight: "120px",
            fontFamily: "inherit",
            transition: "border-color 0.2s ease, box-shadow 0.2s ease"
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#007bff"
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 123, 255, 0.1)"
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#ced4da"
            e.currentTarget.style.boxShadow = "none"
          }}
        />
        <p style={{
          fontSize: "12px",
          color: "#6c757d",
          margin: "8px 0 0 0",
          lineHeight: "1.4"
        }}>
          Be specific about what data or instructions you&apos;ll provide when running this agent.
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
          onClick={nextStep}
          disabled={!userContext.trim()}
          style={{
            background: userContext.trim() ? "#007bff" : "#6c757d",
            color: "#fff",
            padding: "12px 24px",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: userContext.trim() ? "pointer" : "not-allowed",
            transition: "background-color 0.2s ease",
            opacity: userContext.trim() ? 1 : 0.6
          }}
        >
          Continue to Review →
        </button>
      </div>
    </div>
  )

  // Step 5: Review
  const Step5Review = () => {
    const eventLogEntries = parseEventLog(agentData?.eventLog)
    const hasEventLog = eventLogEntries.length > 0
    const hasSummary = currentSummary && currentSummary.trim()

    return (
      <div style={{
        backgroundColor: "#fff",
        borderRadius: "8px",
        border: "1px solid #dee2e6",
        padding: "32px",
        maxWidth: "1400px",
        margin: "0 auto"
      }}>
        <h2 style={{
          fontSize: "24px",
          fontWeight: "600",
          margin: "0 0 8px 0",
          color: "#333"
        }}>
          Step 5: Final Review
        </h2>
        <p style={{
          color: "#666",
          fontSize: "16px",
          margin: "0 0 32px 0"
        }}>
          Review your agent before making it live. Watch the recording and examine the AI analysis.
        </p>

        {/* Info banner if event log is empty */}
        {hasSummary && !hasEventLog && (
          <div style={{
            backgroundColor: "#d1ecf1",
            color: "#0c5460",
            padding: "12px 16px",
            borderRadius: "6px",
            border: "1px solid #bee5eb",
            marginBottom: "24px",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <span>ℹ️</span>
            <span>
              Video recording captured successfully. Detailed action tracking will be available in future versions.
            </span>
          </div>
        )}

        {/* Error banner if critical data missing */}
        {!hasSummary && (
          <div style={{
            backgroundColor: "#fff3cd",
            color: "#856404",
            padding: "12px 16px",
            borderRadius: "6px",
            border: "1px solid #ffeaa7",
            marginBottom: "24px",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <span>⚠️</span>
            <span>
              AI analysis incomplete - summary is missing
            </span>
          </div>
        )}

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "32px",
          marginBottom: "32px"
        }}>
          {/* Left: Recording Playback */}
          <div>
            <h3 style={{
              fontSize: "18px",
              fontWeight: "600",
              margin: "0 0 16px 0",
              color: "#495057"
            }}>
              📹 Recording Playback
            </h3>
            {agentData?.recordingUrl ? (
              <div style={{
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
                border: "1px solid #e9ecef",
                padding: "16px",
                textAlign: "center"
              }}>
                <video
                  controls
                  style={{
                    width: "100%",
                    maxWidth: "500px",
                    borderRadius: "6px"
                  }}
                >
                  <source src={agentData.recordingUrl} type="video/webm" />
                  Your browser does not support the video tag.
                </video>
                {agentData.audioUrl && (
                  <div style={{ marginTop: "12px" }}>
                    <audio controls style={{ width: "100%", maxWidth: "500px" }}>
                      <source src={agentData.audioUrl} type="audio/mpeg" />
                      Your browser does not support the audio tag.
                    </audio>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
                border: "1px solid #e9ecef",
                padding: "32px",
                textAlign: "center",
                color: "#6c757d"
              }}>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>📹</div>
                No recording available
              </div>
            )}
          </div>

          {/* Right: Enhanced Agent Summary Panel */}
          <div>
            <SummaryPanel
              agentId={agentId}
              llmSummary={currentSummary}
              eventLog={eventLogEntries}
              transcript={agentData?.transcript}
              onSummaryUpdate={setCurrentSummary}
            />
          </div>
        </div>

        {/* New components for enriched event display */}
        {hasEventLog && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "32px",
            marginBottom: "32px"
          }}>
            {/* Event Timeline */}
            <EventTimeline events={eventLogEntries} />
            
            {/* Screenshot Gallery */}
            <ScreenshotGallery events={eventLogEntries} />
          </div>
        )}

        {/* Usage Context */}
        <div style={{
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          border: "1px solid #e9ecef",
          padding: "20px",
          marginBottom: "32px"
        }}>
          <h4 style={{
            fontSize: "14px",
            fontWeight: "600",
            margin: "0 0 12px 0",
            color: "#495057",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}>
            📝 Usage Context
          </h4>
          <p style={{
            fontSize: "14px",
            lineHeight: "1.6",
            margin: 0,
            color: "#495057"
          }}>
            {userContext || "No context provided"}
          </p>
        </div>

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "24px",
          borderTop: "1px solid #f1f3f4"
        }}>
          <div style={{ display: "flex", gap: "12px" }}>
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
              onClick={() => handleReviewDecision('REJECT')}
              disabled={isProcessing}
              style={{
                background: "transparent",
                color: "#dc3545",
                padding: "12px 24px",
                border: "1px solid #dc3545",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: isProcessing ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                opacity: isProcessing ? 0.6 : 1
              }}
            >
              Reject & Re-record
            </button>
          </div>
          
          <button
            onClick={() => handleReviewDecision('ACCEPT')}
            disabled={isProcessing || !userContext.trim()}
            style={{
              background: isProcessing || !userContext.trim() ? "#6c757d" : "#28a745",
              color: "#fff",
              padding: "12px 24px",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: isProcessing || !userContext.trim() ? "not-allowed" : "pointer",
              transition: "background-color 0.2s ease",
              opacity: isProcessing || !userContext.trim() ? 0.6 : 1
            }}
          >
            {isProcessing ? "Processing..." : "Accept & Set Live"}
          </button>
        </div>
      </div>
    )
  }

  // Step 6: Live
  const Step6Live = () => (
    <div style={{
      backgroundColor: "#fff",
      borderRadius: "8px",
      border: "1px solid #dee2e6",
      padding: "32px",
      maxWidth: "600px",
      margin: "0 auto",
      textAlign: "center"
    }}>
      <h2 style={{
        fontSize: "24px",
        fontWeight: "600",
        margin: "0 0 8px 0",
        color: "#333"
      }}>
        Step 6: Agent is Live!
      </h2>
      
      {agentData?.status === 'ACTIVE' ? (
        <div>
          <div style={{
            fontSize: "48px",
            marginBottom: "24px",
            color: "#28a745"
          }}>
            ✅
          </div>
          <p style={{
            color: "#28a745",
            fontSize: "18px",
            fontWeight: "600",
            margin: "0 0 16px 0"
          }}>
            Your agent &quot;{agentData.name}&quot; is now active and ready to use!
          </p>
          <p style={{
            color: "#6c757d",
            fontSize: "16px",
            margin: "0 0 32px 0"
          }}>
            You can now create tasks to execute this agent or view it in your agents list.
          </p>
          
          <div style={{
            display: "flex",
            gap: "16px",
            justifyContent: "center"
          }}>
            <Link href="/agents">
              <button style={{
                background: "#007bff",
                color: "#fff",
                padding: "12px 24px",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "background-color 0.2s ease"
              }}>
                View All Agents
              </button>
            </Link>
            
            <Link href={`/agents/${agentId}`}>
              <button style={{
                background: "transparent",
                color: "#007bff",
                padding: "12px 24px",
                border: "1px solid #007bff",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}>
                View Agent Details
              </button>
            </Link>
          </div>
        </div>
      ) : agentData?.status === 'REJECTED' ? (
        <div>
          <div style={{
            fontSize: "48px",
            marginBottom: "24px",
            color: "#dc3545"
          }}>
            ❌
          </div>
          <p style={{
            color: "#dc3545",
            fontSize: "18px",
            fontWeight: "600",
            margin: "0 0 16px 0"
          }}>
            Agent has been rejected
          </p>
          <p style={{
            color: "#6c757d",
            fontSize: "16px",
            margin: "0 0 32px 0"
          }}>
            You can create a new agent or modify this one.
          </p>
          
          <div style={{
            display: "flex",
            gap: "16px",
            justifyContent: "center"
          }}>
            <Link href="/agents/create">
              <button style={{
                background: "#007bff",
                color: "#fff",
                padding: "12px 24px",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "background-color 0.2s ease"
              }}>
                Create New Agent
              </button>
            </Link>
            
            <Link href="/agents">
              <button style={{
                background: "transparent",
                color: "#6c757d",
                padding: "12px 24px",
                border: "1px solid #dee2e6",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}>
                Back to Agents
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <div style={{
            fontSize: "48px",
            marginBottom: "24px",
            color: "#6c757d"
          }}>
            ⏳
          </div>
          <p style={{
            color: "#6c757d",
            fontSize: "16px",
            margin: "0 0 32px 0"
          }}>
            Processing your agent...
          </p>
        </div>
      )}
    </div>
  )

  // Error Message Component with retry functionality
  const ErrorMessage = () => error ? (
    <div style={{
      backgroundColor: "#f8d7da",
      color: "#721c24",
      padding: "12px 16px",
      borderRadius: "6px",
      border: "1px solid #f5c6cb",
      marginBottom: "24px",
      fontSize: "14px",
      maxWidth: "1400px",
      margin: "0 auto 24px auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }}>
      <span>{error}</span>
      <button
        onClick={loadAgentData}
        style={{
          background: "#dc3545",
          color: "#fff",
          border: "none",
          padding: "6px 12px",
          borderRadius: "4px",
          fontSize: "12px",
          fontWeight: "500",
          cursor: "pointer",
          marginLeft: "12px"
        }}
      >
        🔄 Retry
      </button>
    </div>
  ) : null

  if (isLoading) {
    return (
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 20px" }}>
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "8px",
          border: "1px solid #dee2e6",
          padding: "48px",
          textAlign: "center"
        }}>
          <div style={{ 
            fontSize: "24px", 
            marginBottom: "16px",
            color: "#6c757d"
          }}>
            ⏳
          </div>
          <p style={{ color: "#666", fontSize: "16px", margin: 0 }}>
            Loading agent data...
          </p>
        </div>
      </div>
    )
  }

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
          Agent Review
        </h1>
        <p style={{ 
          color: "#666", 
          fontSize: "16px",
          margin: "8px 0 0 0"
        }}>
          {agentData?.name || "Loading..."}
        </p>
      </div>

      {/* Progress Indicator */}
      <ProgressIndicator />

      {/* Error Message */}
      <ErrorMessage />

      {/* Step Content */}
      {currentStep === 3 && <Step3Summarize />}
      {currentStep === 4 && <Step4Context />}
      {currentStep === 5 && <Step5Review />}
      {currentStep === 6 && <Step6Live />}

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
