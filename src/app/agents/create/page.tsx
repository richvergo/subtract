"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function CreateAgentPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [purposePrompt, setPurposePrompt] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [hasRecording, setHasRecording] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingBlobRef = useRef<Blob | null>(null)

  const isValid = name.trim() !== "" && purposePrompt.trim() !== "" && hasRecording && !isRecording

  const startRecording = async () => {
    try {
      setError("")
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: true 
      })
      
      streamRef.current = stream
      
      // Set up video preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      
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

  const handleSave = async () => {
    if (!recordingBlobRef.current) {
      setError("No recording available to save")
      return
    }

    setIsSaving(true)
    setError("")

    try {
      // Build FormData object for multipart upload
      const formData = new FormData()
      formData.append("name", name.trim())
      formData.append("purposePrompt", purposePrompt.trim())
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

      // Redirect to the new agent's detail page
      router.push(`/agents/${newAgent.id}`)
      
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
          Record your screen to demonstrate the workflow, then provide metadata for your automation agent.
        </p>
        <div style={{
          backgroundColor: "#d1edff",
          color: "#0c5460",
          padding: "12px 16px",
          borderRadius: "6px",
          border: "1px solid #bee5eb",
          marginTop: "16px",
          fontSize: "14px"
        }}>
          <strong>✅ Recording Ready:</strong> Your screen recording will be uploaded and stored securely. 
          The video file will be available for playback in the agent details page after creation.
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          backgroundColor: "#f8d7da",
          color: "#721c24",
          padding: "12px 16px",
          borderRadius: "6px",
          border: "1px solid #f5c6cb",
          marginBottom: "24px",
          fontSize: "14px"
        }}>
          {error}
        </div>
      )}

      {/* Two-panel layout */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 400px",
        gap: "24px",
        minHeight: "600px"
      }}>
        {/* Left Panel - Video Preview */}
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "8px",
          border: "1px solid #dee2e6",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}>
          <div style={{
            padding: "16px",
            borderBottom: "1px solid #dee2e6",
            backgroundColor: "#f8f9fa"
          }}>
            <h3 style={{
              fontSize: "16px",
              fontWeight: "600",
              margin: 0,
              color: "#495057"
            }}>
              📹 Screen Recording
            </h3>
            <p style={{
              fontSize: "12px",
              color: "#6c757d",
              margin: "4px 0 0 0"
            }}>
              Record your screen to demonstrate the workflow you want to automate
            </p>
          </div>
          
          <div style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#000",
            position: "relative"
          }}>
            {!isRecording && !hasRecording ? (
              <div style={{
                textAlign: "center",
                color: "#fff",
                padding: "40px"
              }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎥</div>
                <p style={{ fontSize: "16px", margin: "0 0 8px 0" }}>
                  Ready to record
                </p>
                <p style={{ fontSize: "14px", color: "#ccc", margin: 0 }}>
                  Click "Start Recording" to begin
                </p>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain"
                }}
              />
            )}
            
            {/* Recording indicator */}
            {isRecording && (
              <div style={{
                position: "absolute",
                top: "16px",
                left: "16px",
                backgroundColor: "#dc3545",
                color: "#fff",
                padding: "8px 12px",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}>
                <div style={{
                  width: "8px",
                  height: "8px",
                  backgroundColor: "#fff",
                  borderRadius: "50%",
                  animation: "pulse 1s infinite"
                }} />
                REC
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Form */}
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "8px",
          border: "1px solid #dee2e6",
          padding: "24px",
          display: "flex",
          flexDirection: "column"
        }}>
          <h3 style={{
            fontSize: "18px",
            fontWeight: "600",
            margin: "0 0 20px 0",
            color: "#495057"
          }}>
            Agent Details
          </h3>

          <form style={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1 }}>
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter a descriptive name for your agent"
                style={{ 
                  width: "100%", 
                  padding: "12px 16px", 
                  border: "1px solid #ced4da", 
                  borderRadius: "6px",
                  fontSize: "14px",
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
            </div>

            <div>
              <label style={{ 
                display: "block", 
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "600",
                color: "#495057"
              }}>
                Purpose Prompt *
              </label>
              <textarea
                value={purposePrompt}
                onChange={(e) => setPurposePrompt(e.target.value)}
                rows={4}
                placeholder="Describe what this agent should accomplish. Be specific about the tasks, websites, and actions it should perform..."
                style={{ 
                  width: "100%", 
                  padding: "12px 16px", 
                  border: "1px solid #ced4da", 
                  borderRadius: "6px",
                  fontSize: "14px",
                  resize: "vertical",
                  minHeight: "100px",
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
            </div>

            {/* Recording Controls */}
            <div style={{
              padding: "16px",
              backgroundColor: "#f8f9fa",
              borderRadius: "6px",
              border: "1px solid #e9ecef"
            }}>
              <h4 style={{
                fontSize: "14px",
                fontWeight: "600",
                margin: "0 0 12px 0",
                color: "#495057"
              }}>
                Recording Controls
              </h4>
              
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    style={{
                      background: "#dc3545",
                      color: "#fff",
                      padding: "10px 16px",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "background-color 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#c82333"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#dc3545"
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
                      padding: "10px 16px",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "background-color 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#5a6268"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#6c757d"
                    }}
                  >
                    <span>⏹</span>
                    Stop Recording
                  </button>
                )}
              </div>
              
              {hasRecording && (
                <div style={{
                  fontSize: "12px",
                  color: "#28a745",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "8px"
                }}>
                  <span>✅</span>
                  Recording completed ({recordingBlobRef.current ? Math.round(recordingBlobRef.current.size / (1024 * 1024) * 10) / 10 : 0}MB)
                </div>
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
                    padding: "6px 12px",
                    border: "1px solid #dee2e6",
                    borderRadius: "4px",
                    fontSize: "12px",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f8f9fa"
                    e.currentTarget.style.borderColor = "#adb5bd"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent"
                    e.currentTarget.style.borderColor = "#dee2e6"
                  }}
                >
                  Record Again
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{
              display: "flex",
              gap: "12px",
              paddingTop: "16px",
              borderTop: "1px solid #f1f3f4",
              marginTop: "auto"
            }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={!isValid || isSaving}
                style={{
                  background: isValid && !isSaving ? "#007bff" : "#6c757d",
                  color: "#fff",
                  padding: "12px 24px",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: isValid && !isSaving ? "pointer" : "not-allowed",
                  transition: "background-color 0.2s ease, transform 0.1s ease",
                  opacity: isValid && !isSaving ? 1 : 0.6,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  flex: 1
                }}
                onMouseEnter={(e) => {
                  if (isValid && !isSaving) {
                    e.currentTarget.style.backgroundColor = "#0056b3"
                    e.currentTarget.style.transform = "translateY(-1px)"
                  }
                }}
                onMouseLeave={(e) => {
                  if (isValid && !isSaving) {
                    e.currentTarget.style.backgroundColor = "#007bff"
                    e.currentTarget.style.transform = "translateY(0)"
                  }
                }}
              >
                <span>💾</span>
                {isSaving ? "Saving..." : "Save Agent"}
              </button>
              
              <Link href="/agents">
                <button
                  type="button"
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
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f8f9fa"
                    e.currentTarget.style.borderColor = "#adb5bd"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent"
                    e.currentTarget.style.borderColor = "#dee2e6"
                  }}
                >
                  Cancel
                </button>
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Tips Section */}
      <div style={{
        backgroundColor: "#f8f9fa",
        padding: "20px",
        borderRadius: "8px",
        border: "1px solid #dee2e6",
        marginTop: "24px"
      }}>
        <h3 style={{ 
          fontSize: "16px", 
          fontWeight: "600", 
          margin: "0 0 12px 0",
          color: "#495057"
        }}>
          💡 Tips for creating effective agents:
        </h3>
        <ul style={{ 
          margin: 0, 
          paddingLeft: "20px",
          color: "#6c757d",
          fontSize: "14px",
          lineHeight: "1.5"
        }}>
          <li style={{ marginBottom: "6px" }}>Record the complete workflow from start to finish</li>
          <li style={{ marginBottom: "6px" }}>Keep recordings under 100MB for optimal upload performance</li>
          <li style={{ marginBottom: "6px" }}>Be specific about the websites and actions in your purpose prompt</li>
          <li style={{ marginBottom: "6px" }}>Include any special requirements or conditions</li>
          <li style={{ marginBottom: "6px" }}>Mention the expected outcome or result</li>
          <li style={{ marginBottom: "6px" }}>Your recording will be securely stored and available for playback</li>
        </ul>
      </div>

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
