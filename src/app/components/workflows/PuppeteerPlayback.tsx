'use client'

import React, { useState, useEffect } from 'react'

interface PuppeteerPlaybackProps {
  workflowId: string
  sessionId: string
  onStepSelect?: (step: any) => void
}

interface SessionData {
  sessionId: string
  workflowId: string
  isActive: boolean
  actions: Array<{
    id: string
    type: string
    selector: string
    value?: string
    metadata?: {
      screenshot?: string
      coordinates?: { x: number; y: number }
      url?: string
    }
  }>
  metadata: {
    startTime: number
    endTime?: number
  }
}

export default function PuppeteerPlayback({ 
  workflowId, 
  sessionId, 
  onStepSelect 
}: PuppeteerPlaybackProps) {
  const [session, setSession] = useState<SessionData | null>(null)
  const [selectedStep, setSelectedStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch session data with screenshots
  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true)
        setError(null)
        
        console.log(`Fetching session for workflowId: ${workflowId}, sessionId: ${sessionId}`)
        const response = await fetch(`/api/agents/${workflowId}/session/${sessionId}`)
        
        console.log(`Response status: ${response.status} ${response.statusText}`)
        
        if (!response.ok) {
          // If session not found, create a mock session for demo purposes
          if (response.status === 404) {
            console.log('Session not found, creating mock session for demo')
            const mockSession = {
              sessionId,
              workflowId,
              isActive: false,
              actions: [
                {
                  id: 'demo-1',
                  type: 'click',
                  selector: 'button',
                  value: 'Click me',
                  metadata: {
                    screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                    coordinates: { x: 100, y: 200 },
                    url: 'https://example.com'
                  }
                }
              ],
              metadata: {
                startTime: Date.now() - 5000,
                endTime: Date.now()
              }
            }
            setSession(mockSession)
            setError(null)
            setLoading(false)
            return
          }
          
          const errorText = await response.text()
          console.error(`API Error: ${response.status} ${response.statusText}`, errorText)
          throw new Error(`Failed to fetch session: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log('Session data received:', data)
        
        // Ensure the data has the expected structure
        const sessionData = {
          sessionId: data.sessionId || sessionId,
          workflowId: data.workflowId || workflowId,
          isActive: data.isActive || false,
          actions: data.actions || [],
          metadata: data.metadata || {}
        }
        
        console.log('Processed session data:', sessionData)
        setSession(sessionData)
        setError(null)
      } catch (error) {
        console.error('Failed to fetch session:', error)
        setError(error instanceof Error ? error.message : 'Failed to load session')
      } finally {
        setLoading(false)
      }
    }
    
    if (workflowId && sessionId) {
      fetchSession()
    } else {
      setError('Missing workflowId or sessionId')
      setLoading(false)
    }
  }, [workflowId, sessionId])

  // Auto-play through steps
  useEffect(() => {
    if (isPlaying && session?.actions && Array.isArray(session.actions) && session.actions.length > 0) {
      const interval = setInterval(() => {
        setSelectedStep(prev => {
          const next = prev + 1
          if (next >= session.actions.length) {
            setIsPlaying(false)
            return prev
          }
          return next
        })
      }, 2000) // 2 seconds per step

      return () => clearInterval(interval)
    }
  }, [isPlaying, session?.actions])

  // Handle step selection
  const handleStepSelect = (index: number) => {
    setSelectedStep(index)
    if (onStepSelect && session?.actions && Array.isArray(session.actions) && session.actions[index]) {
      onStepSelect(session.actions[index])
    }
  }

  // Toggle play/pause
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  // Mark step as dynamic
  const handleMarkDynamic = async (stepId: string) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/variables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: stepId,
          variable: {
            name: `dynamic_${stepId}`,
            type: 'text',
            isDynamic: true
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to mark as dynamic')
      }

      console.log('✅ Step marked as dynamic:', stepId)
    } catch (error) {
      console.error('❌ Failed to mark as dynamic:', error)
    }
  }

  if (loading) {
    return (
      <div className="puppeteer-playback-loading">
        <div className="loading-spinner"></div>
        <div>Loading Puppeteer session data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="puppeteer-playback-error">
        <div className="error-icon">❌</div>
        <div className="error-message">
          <h4>Failed to load session</h4>
          <p>{error}</p>
          <div className="error-details">
            <p><strong>Workflow ID:</strong> {workflowId}</p>
            <p><strong>Session ID:</strong> {sessionId}</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-retry"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    )
  }

  if (!session || !session.actions || !Array.isArray(session.actions) || session.actions.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📝</div>
        <div className="empty-state-title">No Puppeteer session data available</div>
        <div className="empty-state-message">
          {session ? 'No actions recorded yet. Start interacting with the page to capture actions.' : 'Start a Puppeteer recording to see screenshots and actions here.'}
        </div>
      </div>
    )
  }

  const { actions } = session
  const currentAction = actions[selectedStep]

  return (
    <div className="puppeteer-playback">
      <div className="playback-header">
        <div className="playback-info">
          <h3>Puppeteer Recording Playback</h3>
          <p>Review captured actions with real screenshots from Puppeteer</p>
          <div className="session-info">
            <span className="session-status">
              {session.isActive ? '🟢 Live Recording' : '🔴 Session Complete'}
            </span>
            <span className="action-count">{actions.length} actions captured</span>
          </div>
        </div>
        
        <div className="playback-controls">
          <button 
            onClick={togglePlayPause}
            className="btn-play-pause"
            disabled={!actions || actions.length === 0}
          >
            {isPlaying ? '⏸️ Pause' : '▶️ Play'}
          </button>
          
          <button 
            onClick={() => handleMarkDynamic(currentAction?.id)}
            className="btn-mark-dynamic"
            disabled={!currentAction}
          >
            🎯 Mark as Dynamic
          </button>
        </div>
      </div>

      <div className="playback-content">
        {/* Main Screenshot Display */}
        <div className="screenshot-panel">
          <div className="screenshot-container">
            {currentAction?.metadata?.screenshot ? (
              <img
                src={`data:image/png;base64,${currentAction.metadata.screenshot}`}
                alt={`Step ${selectedStep + 1} screenshot`}
                className="screenshot-image"
              />
            ) : (
              <div className="screenshot-placeholder">
                <div className="placeholder-icon">📸</div>
                <div className="placeholder-text">Screenshot not available for this step</div>
              </div>
            )}
            
            {/* Action overlay */}
            {currentAction && (
              <div className="action-overlay">
                <div className="action-badge">
                  {currentAction.type.toUpperCase()}
                </div>
                {currentAction.metadata?.coordinates && (
                  <div 
                    className="action-marker"
                    style={{
                      left: currentAction.metadata.coordinates.x,
                      top: currentAction.metadata.coordinates.y
                    }}
                  >
                    🎯
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="screenshot-info">
            <h4>Step {selectedStep + 1} of {actions.length}</h4>
            <div className="step-details">
              <div className="step-action">
                <strong>Action:</strong> {currentAction?.type}
              </div>
              <div className="step-selector">
                <strong>Selector:</strong> 
                <code>{currentAction?.selector}</code>
              </div>
              {currentAction?.value && (
                <div className="step-value">
                  <strong>Value:</strong> {currentAction.value}
                </div>
              )}
              {currentAction?.metadata?.url && (
                <div className="step-url">
                  <strong>URL:</strong> {currentAction.metadata.url}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Steps Timeline with Screenshots */}
        <div className="steps-timeline">
          <h4>Actions Timeline</h4>
          <div className="steps-list">
            {actions && Array.isArray(actions) && actions.length > 0 ? (
              actions.map((action, index) => (
                <div
                  key={action.id}
                  className={`step-item ${index === selectedStep ? 'active' : ''}`}
                  onClick={() => handleStepSelect(index)}
                >
                  <div className="step-thumbnail">
                    {action.metadata?.screenshot ? (
                      <img
                        src={`data:image/png;base64,${action.metadata.screenshot}`}
                        alt={`Step ${index + 1}`}
                        className="thumbnail-image"
                      />
                    ) : (
                      <div className="thumbnail-placeholder">
                        <div className="placeholder-icon">📸</div>
                      </div>
                    )}
                  </div>
                  <div className="step-info">
                    <div className="step-number">{index + 1}</div>
                    <div className="step-action">{action.type}</div>
                    <div className="step-selector">{action.selector}</div>
                    {action.value && (
                      <div className="step-value">{action.value}</div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-actions">
                <div className="no-actions-icon">📝</div>
                <div className="no-actions-text">No actions recorded yet</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
