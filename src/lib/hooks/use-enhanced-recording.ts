/**
 * Enhanced Recording Hook
 * Integrates video recording with granular action capture
 */

import { useState, useRef, useCallback } from 'react'
import { enhancedRecorderFixed, RecordingSession, RecordedAction } from '../enhanced-recorder-fixed'

export interface EnhancedRecordingState {
  isRecording: boolean
  hasRecording: boolean
  session: RecordingSession | null
  actions: RecordedAction[]
  error: string | null
}

export interface EnhancedRecordingControls {
  startRecording: () => Promise<void>
  stopRecording: () => Promise<Blob | null>
  clearRecording: () => void
  getRecordingData: () => { videoBlob: Blob | null; session: RecordingSession | null }
}

export function useEnhancedRecording(): EnhancedRecordingState & EnhancedRecordingControls {
  // Video recording state
  const [isRecording, setIsRecording] = useState(false)
  const [hasRecording, setHasRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Action recording state
  const [session, setSession] = useState<RecordingSession | null>(null)
  const [actions, setActions] = useState<RecordedAction[]>([])
  
  // Refs for video recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingBlobRef = useRef<Blob | null>(null)

  /**
   * Start both video and action recording
   */
  const startRecording = useCallback(async () => {
    try {
      setError(null)
      
      // Start action recording first
      const actionSession = enhancedRecorderFixed.startRecording()
      setSession(actionSession)
      setActions([])
      
      // Get screen capture stream - encourage tab selection for v1
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 15 }
        },
        audio: false
        // Note: Removed mediaSource constraint to allow tab selection
        // Users will see tab options in the browser's share dialog
      })

      streamRef.current = stream
      
      // Set up MediaRecorder for video
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
        
        // Check file size (100MB limit)
        const maxSize = 100 * 1024 * 1024
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
      
      // Start video recording
      mediaRecorder.start(1000) // Record in 1-second chunks
      setIsRecording(true)
      
      console.log('🎬 Enhanced recording started - both video and actions')
      
    } catch (err) {
      console.error('Error starting enhanced recording:', err)
      
      // Clean up action recording if video recording failed
      enhancedRecorderFixed.stopRecording()
      setSession(null)
      setActions([])
      
      // Provide specific error messages
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError("Recording was cancelled or permission denied. In the browser dialog, please select 'Chrome Tab' and choose the tab you want to record.")
        } else if (err.name === 'NotFoundError') {
          setError("No source available for recording. Please ensure you have Chrome tabs open and try again.")
        } else {
          setError(`Failed to start recording: ${err.message}`)
        }
      } else {
        setError("Failed to start recording. Please ensure you grant screen sharing permissions and select a Chrome tab in the browser dialog.")
      }
    }
  }, [])

  /**
   * Stop both video and action recording
   */
  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (!isRecording) {
      return null
    }

    try {
      // Stop video recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      
      // Stop action recording and get final session
      const finalSession = enhancedRecorderFixed.stopRecording()
      if (finalSession) {
        setSession(finalSession)
        setActions(finalSession.actions)
        console.log('🛑 Enhanced recording stopped:', {
          videoSize: recordingBlobRef.current ? Math.round(recordingBlobRef.current.size / (1024 * 1024)) : 0,
          actionCount: finalSession.actions.length,
          duration: finalSession.metadata.recordingDuration
        })
      }
      
      setIsRecording(false)
      return recordingBlobRef.current
      
    } catch (err) {
      console.error('Error stopping recording:', err)
      setError("Failed to stop recording properly.")
      return null
    }
  }, [isRecording])

  /**
   * Clear all recording data
   */
  const clearRecording = useCallback(() => {
    setHasRecording(false)
    setSession(null)
    setActions([])
    recordingBlobRef.current = null
    chunksRef.current = []
    setError(null)
    console.log('🧹 Enhanced recording cleared')
  }, [])

  /**
   * Get combined recording data
   */
  const getRecordingData = useCallback(() => {
    return {
      videoBlob: recordingBlobRef.current,
      session: session
    }
  }, [session])

  return {
    // State
    isRecording,
    hasRecording,
    session,
    actions,
    error,
    
    // Controls
    startRecording,
    stopRecording,
    clearRecording,
    getRecordingData
  }
}
