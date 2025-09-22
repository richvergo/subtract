"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"

// Note: Agents represent workflows (recorded automation templates)
// Tasks represent executions (running those workflows with specific parameters)
// Users cannot run Agents directly - they must create Tasks to execute workflows
//
// Agent Lifecycle Status:
// - DRAFT: Initial state, needs review and approval
// - ACTIVE: Approved and ready for execution (displayed as "Live")
// - REJECTED: Rejected during review process
// - INACTIVE: Manually deactivated (legacy state)
//
// New Agent Fields (from golden path implementation):
// - recordingUrl: URL to video recording
// - audioUrl: URL to extracted audio (optional)
// - llmSummary: AI-generated workflow summary
// - userContext: User-provided usage context

// Enhanced fetcher with proper error handling according to API_CONTRACT.md
async function fetcher(url: string) {
  const res = await fetch(url, {
    credentials: 'include', // Include session cookies
  })
  if (res.status === 401) throw new Error("Unauthorized - please login")
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
  return res.json()
}

// Interface matching API_CONTRACT.md response structure with new fields
interface Agent {
  id: string
  name: string
  description?: string
  status: 'DRAFT' | 'ACTIVE' | 'REJECTED' | 'INACTIVE'
  processingStatus?: string
  processingProgress?: number
  agentConfig?: Array<{
    action: string
    url?: string
    selector?: string
    value?: string
    timeout?: number
  }>
  purposePrompt?: string
  agentIntents?: Array<{
    stepIndex: number
    intent: string
  }>
  // recordingPath removed - using screen recording approach instead
  recordingUrl?: string
  audioUrl?: string
  llmSummary?: string
  userContext?: string
  ownerId: string
  createdAt: string
  updatedAt: string
  logins?: Array<{
    id: string
    name: string
    loginUrl: string
  }>
  agentRuns?: Array<{
    id: string
    status: string
    startedAt: string
    finishedAt?: string
    result?: unknown
    error?: string
  }>
}

// API response structure according to contract
interface AgentsResponse {
  agents: Agent[]
}

export default function AgentsPage() {
  const { data, error, isLoading, mutate } = useSWR<AgentsResponse>("/api/agents", fetcher)

  // Extract agents array from response, handle both direct array and wrapped response
  const agents = data?.agents || (Array.isArray(data) ? data : [])

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<{ id: string; name: string; description?: string } | null>(null)
  const [editFormData, setEditFormData] = useState({ name: "", description: "" })
  const [isUpdating, setIsUpdating] = useState(false)

  // Delete confirmation state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletingAgent, setDeletingAgent] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Edit agent functions
  const handleEditAgent = (agentId: string, agentName: string) => {
    const agent = agents.find(a => a.id === agentId)
    if (agent) {
      setEditingAgent({
        id: agentId,
        name: agentName,
        description: agent.description || agent.purposePrompt || ""
      })
      setEditFormData({
        name: agentName,
        description: agent.description || agent.purposePrompt || ""
      })
      setIsEditModalOpen(true)
    }
  }

  const handleUpdateAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAgent) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/agents/${editingAgent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editFormData.name,
          description: editFormData.description
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update agent')
      }

      // Refresh the agents list
      mutate()
      setIsEditModalOpen(false)
      setEditingAgent(null)
    } catch (error) {
      console.error('Error updating agent:', error)
      alert('Failed to update agent. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  // Configure agent function
  const handleConfigureAgent = (agentId: string, agentName: string) => {
    // Navigate to the configure page
    window.location.href = `/agents/${agentId}/configure`
  }

  // Delete agent functions
  const handleDeleteAgent = (agentId: string, agentName: string) => {
    setDeletingAgent({ id: agentId, name: agentName })
    setIsDeleteModalOpen(true)
  }

  const confirmDeleteAgent = async () => {
    if (!deletingAgent) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/agents/${deletingAgent.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to delete agent')
      }

      // Refresh the agents list
      mutate()
      setIsDeleteModalOpen(false)
      setDeletingAgent(null)
    } catch (error) {
      console.error('Error deleting agent:', error)
      alert('Failed to delete agent. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) return (
    <div>
      <h1 style={{ 
        fontSize: "32px", 
        fontWeight: "700", 
        marginBottom: "16px",
        color: "#333"
      }}>
        Agents
      </h1>
      <div style={{
        backgroundColor: "#fff",
        borderRadius: "8px",
        border: "1px solid #dee2e6",
        overflow: "hidden"
      }}>
        <div style={{ padding: "48px", textAlign: "center" }}>
          <div style={{ 
            fontSize: "24px", 
            marginBottom: "16px",
            color: "#6c757d"
          }}>
            ⏳
          </div>
          <p style={{ color: "#666", fontSize: "16px", margin: 0 }}>
            Loading agents...
          </p>
        </div>
      </div>
    </div>
  )
  
  if (error) return (
    <div>
      <h1 style={{ 
        fontSize: "32px", 
        fontWeight: "700", 
        marginBottom: "16px",
        color: "#333"
      }}>
        Agents
      </h1>
      <div style={{
        backgroundColor: "#fff",
        borderRadius: "8px",
        border: "1px solid #dee2e6",
        padding: "32px",
        textAlign: "center"
      }}>
        <div style={{ 
          fontSize: "48px", 
          marginBottom: "16px",
          color: "#dc3545"
        }}>
          ⚠️
        </div>
        <h3 style={{ 
          fontSize: "18px", 
          fontWeight: "600", 
          margin: "0 0 8px 0",
          color: "#dc3545"
        }}>
          Error loading agents
        </h3>
        <p style={{ 
          color: "#6c757d", 
          margin: "0 0 24px 0",
          fontSize: "14px"
        }}>
          {error.message}
        </p>
        <button
          onClick={() => mutate()}
          style={{
            background: "#007bff", 
            color: "#fff",
            padding: "12px 24px", 
            border: "none", 
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            transition: "background-color 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#0056b3"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#007bff"
          }}
        >
          🔄 Retry
        </button>
      </div>
    </div>
  )

  const getLastRun = (agent: Agent) => {
    if (!agent.agentRuns || agent.agentRuns.length === 0) {
      return "Never"
    }
    
    const lastRun = agent.agentRuns
      .filter(run => run.finishedAt)
      .sort((a, b) => new Date(b.finishedAt!).getTime() - new Date(a.finishedAt!).getTime())[0]
    
    if (!lastRun) return "Never"
    
    const date = new Date(lastRun.finishedAt!)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return "#28a745"
      case 'DRAFT': return "#ffc107"
      case 'REJECTED': return "#dc3545"
      case 'INACTIVE': return "#6c757d"
      default: return "#6c757d"
    }
  }

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Live'
      case 'DRAFT': return 'Draft'
      case 'REJECTED': return 'Rejected'
      case 'INACTIVE': return 'Inactive'
      default: return status
    }
  }

  const getDescription = (agent: Agent) => {
    // Use purposePrompt as description if no description field
    return agent.description || agent.purposePrompt || "No description"
  }

  return (
    <div>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: "24px"
      }}>
        <h1 style={{ 
          fontSize: "32px", 
          fontWeight: "700", 
          margin: 0,
          color: "#333"
        }}>
          Agents
        </h1>
        <Link href="/agents/create-simple">
          <button style={{
            background: "#007bff", 
            color: "#fff",
            padding: "12px 24px", 
            border: "none", 
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "background-color 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#0056b3"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#007bff"
          }}>
            <span>+</span>
            Create Agent
          </button>
        </Link>
      </div>

      {agents.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "48px 24px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          border: "1px solid #dee2e6"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🤖</div>
          <h3 style={{ 
            fontSize: "18px", 
            fontWeight: "600", 
            margin: "0 0 8px 0",
            color: "#495057"
          }}>
            No agents yet
          </h3>
          <p style={{ 
            color: "#6c757d", 
            margin: "0 0 24px 0",
            fontSize: "14px"
          }}>
            Click Create Agent to add your first one.
          </p>
          <Link href="/agents/create-simple">
            <button style={{
              background: "#007bff", 
              color: "#fff",
              padding: "12px 24px", 
              border: "none", 
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "background-color 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#0056b3"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#007bff"
            }}>
              Create Your First Agent
            </button>
          </Link>
        </div>
      ) : (
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "8px",
          border: "1px solid #dee2e6",
          overflow: "hidden"
        }}>
          <table style={{ 
            width: "100%", 
            borderCollapse: "collapse",
            fontSize: "14px"
          }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa" }}>
                <th style={{ 
                  textAlign: "left", 
                  padding: "16px", 
                  fontWeight: "600",
                  color: "#495057",
                  borderBottom: "1px solid #dee2e6"
                }}>
                  Name
                </th>
                <th style={{ 
                  textAlign: "left", 
                  padding: "16px", 
                  fontWeight: "600",
                  color: "#495057",
                  borderBottom: "1px solid #dee2e6"
                }}>
                  Description
                </th>
                <th style={{ 
                  textAlign: "left", 
                  padding: "16px", 
                  fontWeight: "600",
                  color: "#495057",
                  borderBottom: "1px solid #dee2e6"
                }}>
                  Status
                </th>
                <th style={{ 
                  textAlign: "left", 
                  padding: "16px", 
                  fontWeight: "600",
                  color: "#495057",
                  borderBottom: "1px solid #dee2e6"
                }}>
                  Last Run
                </th>
                <th style={{ 
                  textAlign: "center", 
                  padding: "16px", 
                  fontWeight: "600",
                  color: "#495057",
                  borderBottom: "1px solid #dee2e6"
                }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent: Agent, index: number) => (
                <tr key={agent.id} style={{
                  borderBottom: index < agents.length - 1 ? "1px solid #f1f3f4" : "none"
                }}>
                  <td style={{ 
                    padding: "16px",
                    fontWeight: "500",
                    color: "#212529"
                  }}>
                    <Link href={`/agents/${agent.id}`} style={{
                      color: "#007bff",
                      textDecoration: "none",
                      fontWeight: "500"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = "underline"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = "none"
                    }}>
                      {agent.name}
                    </Link>
                  </td>
                  <td style={{ 
                    padding: "16px",
                    color: "#6c757d",
                    maxWidth: "300px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}>
                    {getDescription(agent)}
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span style={{
                      display: "inline-block",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "500",
                      backgroundColor: getStatusColor(agent.status) + "20",
                      color: getStatusColor(agent.status),
                      border: `1px solid ${getStatusColor(agent.status)}40`
                    }}>
                      {getStatusDisplay(agent.status)}
                    </span>
                  </td>
                  <td style={{ 
                    padding: "16px",
                    color: "#6c757d"
                  }}>
                    {getLastRun(agent)}
                  </td>
                  <td style={{ 
                    padding: "16px",
                    textAlign: "center"
                  }}>
                    <div style={{
                      display: "flex",
                      gap: "8px",
                      justifyContent: "center"
                    }}>
                      <button
                        onClick={() => handleConfigureAgent(agent.id, agent.name)}
                        style={{
                          background: "#007bff",
                          color: "#fff",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "500",
                          cursor: "pointer",
                          transition: "background-color 0.2s ease"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#0056b3"
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#007bff"
                        }}
                      >
                        Configure
                      </button>
                      <button
                        onClick={() => handleEditAgent(agent.id, agent.name)}
                        style={{
                          background: "#6c757d",
                          color: "#fff",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "500",
                          cursor: "pointer",
                          transition: "background-color 0.2s ease"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#5a6268"
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#6c757d"
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAgent(agent.id, agent.name)}
                        style={{
                          background: "#dc3545",
                          color: "#fff",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "500",
                          cursor: "pointer",
                          transition: "background-color 0.2s ease"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#c82333"
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#dc3545"
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Agent Modal */}
      {isEditModalOpen && editingAgent && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "#fff",
            borderRadius: "8px",
            padding: "32px",
            maxWidth: "500px",
            width: "90%",
            maxHeight: "90vh",
            overflow: "auto"
          }}>
            <h2 style={{
              fontSize: "24px",
              fontWeight: "600",
              marginBottom: "8px",
              color: "#333"
            }}>
              ✏️ Edit Agent
            </h2>
            
            <p style={{
              fontSize: "16px",
              color: "#6c757d",
              marginBottom: "24px",
              lineHeight: "1.5"
            }}>
              Update the name and description for "{editingAgent.name}". Core functionality like recording and login cannot be changed here.
            </p>

            <form onSubmit={handleUpdateAgent}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#495057",
                  marginBottom: "8px"
                }}>
                  Agent Name *
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "1px solid #ced4da",
                    borderRadius: "6px",
                    fontSize: "16px",
                    boxSizing: "border-box"
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#495057",
                  marginBottom: "8px"
                }}>
                  Description (Optional)
                </label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "1px solid #ced4da",
                    borderRadius: "6px",
                    fontSize: "16px",
                    boxSizing: "border-box",
                    resize: "vertical",
                    fontFamily: "inherit"
                  }}
                />
              </div>

              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px"
              }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  style={{
                    background: "#6c757d",
                    color: "#fff",
                    border: "none",
                    padding: "12px 24px",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "background-color 0.2s ease"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating || !editFormData.name.trim()}
                  style={{
                    background: isUpdating || !editFormData.name.trim() ? "#6c757d" : "#007bff",
                    color: "#fff",
                    border: "none",
                    padding: "12px 24px",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: isUpdating || !editFormData.name.trim() ? "not-allowed" : "pointer",
                    transition: "background-color 0.2s ease"
                  }}
                >
                  {isUpdating ? "Updating..." : "Update Agent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingAgent && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "#fff",
            borderRadius: "8px",
            padding: "32px",
            maxWidth: "400px",
            width: "90%"
          }}>
            <h2 style={{
              fontSize: "24px",
              fontWeight: "600",
              marginBottom: "8px",
              color: "#dc3545"
            }}>
              ⚠️ Delete Agent
            </h2>
            
            <p style={{
              fontSize: "16px",
              color: "#6c757d",
              marginBottom: "24px",
              lineHeight: "1.5"
            }}>
              Are you sure you want to delete the agent <strong>"{deletingAgent.name}"</strong>? This action cannot be undone and will permanently remove the agent and all its associated data.
            </p>

            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px"
            }}>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                style={{
                  background: "#6c757d",
                  color: "#fff",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "background-color 0.2s ease"
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAgent}
                disabled={isDeleting}
                style={{
                  background: isDeleting ? "#6c757d" : "#dc3545",
                  color: "#fff",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  transition: "background-color 0.2s ease"
                }}
              >
                {isDeleting ? "Deleting..." : "Delete Agent"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}