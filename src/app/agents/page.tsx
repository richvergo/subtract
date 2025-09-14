"use client"

import { useState, useEffect } from "react"
import { useSession } from 'next-auth/react'

interface Agent {
  id: string
  name: string
  description?: string
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE'
  ownerId: string
  schedule?: string
  agentConfig: unknown[]
  purposePrompt?: string
  agentIntents?: Array<{
    action: string
    selector?: string
    intent: string
    stepIndex: number
    metadata?: unknown
  }>
  createdAt: string
  updatedAt: string
  logins?: Array<{
    id: string
    name: string
    loginUrl: string
  }>
  latestRuns?: Array<{
    id: string
    status: string
    startedAt: string
    finishedAt?: string
  }>
}

interface Login {
  id: string
  name: string
  loginUrl: string
}

export default function AgentsPage() {
  const { data: session, status } = useSession()
  const [showAddForm, setShowAddForm] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [logins, setLogins] = useState<Login[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    schedule: "",
    purposePrompt: "",
    agentConfig: [],
    recordingFile: null as File | null,
    recordedSteps: [] as any[]
  })

  // Fetch agents and logins on component mount
  useEffect(() => {
    if (status === 'authenticated') {
      fetchAgents()
      fetchLogins()
    }
  }, [status])

  // Show loading while checking authentication
  if (status === 'loading') {
    return <div style={{ padding: "24px" }}>Loading...</div>
  }

  // Show login prompt if not authenticated
  if (status === 'unauthenticated') {
    return (
      <div style={{ padding: "24px" }}>
        <div className="card">
          <div style={{ paddingBottom: "16px", borderBottom: "1px solid #eee", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0 }}>Authentication Required</h2>
          </div>
          <div>
            <p style={{ marginBottom: "16px" }}>You need to be logged in to manage agents.</p>
            <button 
              className="button"
              onClick={() => window.location.href = '/register'}
            >
              Go to Login/Register
            </button>
          </div>
        </div>
      </div>
    )
  }

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setAgents(data.agents || [])
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLogins = async () => {
    try {
      const response = await fetch('/api/logins', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setLogins(data.logins || [])
      }
    } catch (error) {
      console.error('Error fetching logins:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Use the single-step record endpoint
      const response = await fetch('/api/agents/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          purposePrompt: formData.purposePrompt,
          recordedSteps: formData.recordedSteps,
          loginIds: [] // TODO: Add login selection
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setAgents([data.agent, ...agents])
        setFormData({ 
          name: "", 
          description: "", 
          schedule: "", 
          purposePrompt: "", 
          agentConfig: [],
          recordingFile: null,
          recordedSteps: []
        })
        setShowAddForm(false)
      } else {
        const error = await response.json()
        console.error('Error creating agent:', error)
        alert('Failed to create agent: ' + (error.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error creating agent:', error)
      alert('Failed to create agent')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(prev => ({ ...prev, recordingFile: file }))
      // For MVP, we'll simulate recorded steps
      // In production, this would process the recording file
      setFormData(prev => ({ 
        ...prev, 
        recordedSteps: [
          { action: 'goto', url: 'https://example.com' },
          { action: 'waitForSelector', selector: 'body', metadata: { selector: 'body', tag: 'body', timestamp: Date.now() } },
          { action: 'click', selector: '#submit', metadata: { selector: '#submit', tag: 'button', timestamp: Date.now() } }
        ]
      }))
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'DRAFT': { background: '#fff3cd', color: '#856404', border: '#ffeaa7', icon: '📝' },
      'ACTIVE': { background: '#d4edda', color: '#155724', border: '#c3e6cb', icon: '✅' },
      'INACTIVE': { background: '#f8d7da', color: '#721c24', border: '#f5c6cb', icon: '⏸️' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['DRAFT']
    
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 8px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: "500",
        backgroundColor: config.background,
        color: config.color,
        border: `1px solid ${config.border}`
      }}>
        <span>{config.icon}</span>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </span>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return '✅'
      case 'FAILED':
        return '❌'
      case 'PENDING':
        return '⏳'
      case 'RUNNING':
        return '🔄'
      default:
        return '❓'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div style={{ padding: "24px" }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        marginBottom: "24px"
      }}>
        <div>
          <h1 style={{ 
            fontSize: "32px", 
            fontWeight: "700", 
            margin: "0 0 8px 0",
            color: "#333"
          }}>
            Agents
          </h1>
          <p style={{ 
            color: "#666",
            margin: 0
          }}>
            Manage your automation agents and their configurations.
          </p>
        </div>
        <button 
          className="button"
          onClick={() => setShowAddForm(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <span>➕</span>
          Create Agent
        </button>
      </div>

      {/* Agents List */}
      <div className="card">
        <div style={{ paddingBottom: "16px", borderBottom: "1px solid #eee", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0 }}>Your Agents</h2>
        </div>
        
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ color: "#666" }}>Loading agents...</p>
          </div>
        ) : agents.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🤖</div>
            <h3 style={{ fontSize: "18px", fontWeight: "500", marginBottom: "8px" }}>No agents yet</h3>
            <p style={{ color: "#666", marginBottom: "16px" }}>
              Create your first automation agent to get started.
            </p>
            <button 
              className="button"
              onClick={() => setShowAddForm(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                margin: "0 auto"
              }}
            >
              <span>➕</span>
              Create Agent
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {agents.map((agent) => (
              <div key={agent.id} style={{ 
                padding: "20px", 
                border: "1px solid #ddd", 
                borderRadius: "8px",
                backgroundColor: "white"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <h3 style={{ fontWeight: "500", margin: 0 }}>{agent.name}</h3>
                      {getStatusBadge(agent.status)}
                    </div>
                    
                    {agent.description && (
                      <p style={{ 
                        fontSize: "14px", 
                        color: "#666", 
                        margin: "0 0 8px 0",
                        lineHeight: "1.4"
                      }}>
                        {agent.description}
                      </p>
                    )}
                    
                    {agent.logins && agent.logins.length > 0 && (
                      <p style={{ fontSize: "14px", color: "#666", margin: "0 0 8px 0" }}>
                        Uses {agent.logins.length} login{agent.logins.length !== 1 ? 's' : ''}
                      </p>
                    )}
                    
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button 
                        className="button button-outline"
                        onClick={() => window.location.href = `/agents/${agent.id}`}
                        style={{
                          padding: "6px 12px",
                          fontSize: "12px"
                        }}
                      >
                        👁️ View Details
                      </button>
                      <button 
                        className="button button-danger"
                        style={{
                          padding: "6px 12px",
                          fontSize: "12px"
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Recent Runs */}
                {agent.latestRuns && agent.latestRuns.length > 0 && (
                  <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #eee" }}>
                    <h4 style={{ 
                      fontSize: "14px", 
                      fontWeight: "500", 
                      margin: "0 0 8px 0",
                      color: "#333"
                    }}>
                      Recent Runs
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {agent.latestRuns.slice(0, 3).map((run) => (
                        <div key={run.id} style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "4px 0",
                          fontSize: "12px"
                        }}>
                          <span>{getStatusIcon(run.status)}</span>
                          <span style={{ color: "#666" }}>
                            {formatDate(run.startedAt)}
                          </span>
                          <span style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: "500",
                            backgroundColor: run.status === 'COMPLETED' ? '#d4edda' : 
                                           run.status === 'FAILED' ? '#f8d7da' : '#fff3cd',
                            color: run.status === 'COMPLETED' ? '#155724' : 
                                   run.status === 'FAILED' ? '#721c24' : '#856404'
                          }}>
                            {run.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add New Agent Form */}
      {showAddForm && (
        <div className="card" style={{ marginTop: "24px" }}>
          <div style={{ paddingBottom: "16px", borderBottom: "1px solid #eee", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 8px 0" }}>Create New Agent</h2>
            <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
              Create a new automation agent from recordings and purpose prompts in a single step, with AI-generated intent annotations.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label className="label">Agent Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="My Automation Agent"
                required
                className="input"
              />
            </div>

            <div>
              <label className="label">Purpose Prompt (Required)</label>
              <textarea
                name="purposePrompt"
                value={formData.purposePrompt}
                onChange={handleInputChange}
                placeholder="Describe what you want this agent to accomplish (e.g., 'Login to the application and create a new user account')"
                rows={3}
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                  resize: "vertical"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#007bff"
                  e.target.style.boxShadow = "0 0 0 3px rgba(0, 123, 255, 0.1)"
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#ddd"
                  e.target.style.boxShadow = "none"
                }}
              />
              <p style={{ fontSize: "12px", color: "#666", margin: "4px 0 0 0" }}>
                This helps the AI understand the intent of each step in your workflow.
              </p>
            </div>

            <div>
              <label className="label">Recording File (Optional)</label>
              <input
                type="file"
                accept="video/mp4,video/webm"
                onChange={handleFileChange}
                className="input"
                style={{ padding: "8px" }}
              />
              <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                Upload a screen recording of the workflow you want to automate
              </p>
            </div>

            <div>
              <label className="label">Description (Optional)</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Additional details about this agent..."
                rows={2}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                  resize: "vertical"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#007bff"
                  e.target.style.boxShadow = "0 0 0 3px rgba(0, 123, 255, 0.1)"
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#ddd"
                  e.target.style.boxShadow = "none"
                }}
              />
            </div>

            <div>
              <label className="label">Schedule (Optional)</label>
              <input
                type="text"
                name="schedule"
                value={formData.schedule}
                onChange={handleInputChange}
                placeholder="e.g., 0 9 * * 1-5 (weekdays at 9 AM)"
                className="input"
              />
              <p style={{ fontSize: "12px", color: "#666", margin: "4px 0 0 0" }}>
                Use cron syntax for scheduling. Leave empty for manual runs only.
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button 
                type="button" 
                className="button button-outline"
                onClick={() => {
                  setShowAddForm(false)
                  setFormData({ name: "", description: "", schedule: "", purposePrompt: "", agentConfig: [] })
                }}
                disabled={submitting}
              >
                Cancel
              </button>
              <button type="submit" className="button" disabled={submitting}>
                {submitting ? (
                  <>
                    <span>⏳</span> Creating Agent...
                  </>
                ) : (
                  <>
                    <span>🤖</span> Create Agent
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}