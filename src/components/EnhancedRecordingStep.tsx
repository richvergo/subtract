"use client"

import React, { useState, useCallback } from 'react'
import { useEnhancedRecording } from '@/lib/hooks/use-enhanced-recording'
import { RecordedAction } from '@/lib/enhanced-recorder-fixed'

interface EnhancedRecordingStepProps {
  onRecordingComplete: (data: {
    videoBlob: Blob
    actions: RecordedAction[]
    session: any
  }) => void
  onNext: () => void
  onPrev: () => void
  isStepValid: boolean
}

export const EnhancedRecordingStep: React.FC<EnhancedRecordingStepProps> = ({
  onRecordingComplete,
  onNext,
  onPrev,
  isStepValid
}) => {
  const {
    isRecording,
    hasRecording,
    session,
    actions,
    error,
    startRecording,
    stopRecording,
    clearRecording,
    getRecordingData
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

  const handleNext = useCallback(() => {
    if (isStepValid) {
      onNext()
    }
  }, [isStepValid, onNext])

  return (
    <div style={{ padding: "24px" }}>
      <h2 style={{
        fontSize: "24px",
        fontWeight: "600",
        color: "#212529",
        margin: "0 0 16px 0"
      }}>
        🎬 Enhanced Workflow Recording
      </h2>
      
      <p style={{
        color: "#6c757d",
        fontSize: "16px",
        margin: "0 0 32px 0",
        lineHeight: "1.5"
      }}>
        Capture both video and granular actions to create a detailed workflow template.
        The AI will analyze every click, type, and interaction to understand your process.
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
            Start Enhanced Recording
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
          <li>Click "Start Enhanced Recording" to begin capturing your screen and actions</li>
          <li>Perform your workflow naturally - every click, type, and interaction will be captured</li>
          <li>Take your time to demonstrate the complete process</li>
          <li>Click "Stop Recording" when finished</li>
          <li>The AI will analyze all captured actions to understand your workflow</li>
        </ul>
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

        <button
          type="button"
          onClick={handleNext}
          disabled={!isStepValid || isProcessing}
          style={{
            background: isStepValid && !isProcessing ? "#28a745" : "#6c757d",
            color: "white",
            border: "none",
            padding: "12px 24px",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "500",
            cursor: isStepValid && !isProcessing ? "pointer" : "not-allowed",
            opacity: isStepValid && !isProcessing ? 1 : 0.6
          }}
        >
          Next: AI Analysis →
        </button>
      </div>
    </div>
  )
}
