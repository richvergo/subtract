"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"

// Note: Tasks represent executions of Agent workflows
// Agents define the automation template, Tasks execute them with specific parameters
// This is where users actually run their recorded workflows

// Enhanced fetcher with proper error handling
async function fetcher(url: string) {
  const res = await fetch(url, {
    credentials: 'include', // Include session cookies
  })
  if (res.status === 401) throw new Error("Unauthorized - please login")
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
  return res.json()
}

// Interface for Agent (used in dropdown)
interface Agent {
  id: string
  name: string
  purposePrompt?: string
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE'
}

// Interface for Task (mock data for now)
interface Task {
  id: string
  name: string
  agentId: string
  agentName: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  createdAt: string
  startedAt?: string
  finishedAt?: string
}

// Mock tasks data (will be replaced with real API calls later)
const mockTasks: Task[] = [
  {
    id: "task-1",
    name: "Daily Data Entry",
    agentId: "agent-1",
    agentName: "Data Entry Bot",
    status: "COMPLETED",
    createdAt: "2025-09-15T10:00:00Z",
    startedAt: "2025-09-15T10:05:00Z",
    finishedAt: "2025-09-15T10:15:00Z"
  },
  {
    id: "task-2", 
    name: "Weekly Report Generation",
    agentId: "agent-2",
    agentName: "Report Generator",
    status: "RUNNING",
    createdAt: "2025-09-15T11:00:00Z",
    startedAt: "2025-09-15T11:05:00Z"
  },
  {
    id: "task-3",
    name: "Customer Onboarding",
    agentId: "agent-3", 
    agentName: "Onboarding Assistant",
    status: "PENDING",
    createdAt: "2025-09-15T12:00:00Z"
  }
]

export default function TasksPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState("")
  const [taskName, setTaskName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState("")
  
  // Fetch agents for the dropdown
  const { data: agentsData, error: agentsError } = useSWR<{ agents: Agent[] }>("/api/agents", fetcher)
  const agents = agentsData?.agents || []
  
  // For now, use mock tasks data
  const tasks = mockTasks

  const handleCreateTask = async () => {
    if (!selectedAgentId || !taskName.trim()) {
      setError("Please select an agent and enter a task name")
      return
    }

    setIsCreating(true)
    setError("")

    try {
      // TODO: Replace with real API call when backend support is added
      // const response = await fetch('/api/tasks', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   credentials: 'include',
      //   body: JSON.stringify({
      //     name: taskName.trim(),
      //     agentId: selectedAgentId
      //   })
      // })

      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Reset form and close modal
      setTaskName("")
      setSelectedAgentId("")
      setShowCreateModal(false)
      
    } catch (err) {
      console.error('Error creating task:', err)
      setError(err instanceof Error ? err.message : "Failed to create task")
    } finally {
      setIsCreating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return "#28a745"
      case 'RUNNING': return "#17a2b8" 
      case 'PENDING': return "#ffc107"
      case 'FAILED': return "#dc3545"
      default: return "#6c757d"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return "✅"
      case 'RUNNING': return "🔄"
      case 'PENDING': return "⏳"
      case 'FAILED': return "❌"
      default: return "❓"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: "24px"
      }}>
        <div>
          <h1 style={{ 
            fontSize: "32px", 
            fontWeight: "700", 
            margin: "0 0 8px 0",
            color: "#333"
          }}>
            📋 Tasks
          </h1>
          <p style={{ 
            color: "#666", 
            fontSize: "16px",
            margin: 0
          }}>
            Execute workflows by creating tasks that run your agents.
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
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
          }}
        >
          <span>➕</span>
          Create Task
        </button>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "48px 24px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          border: "1px solid #dee2e6"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
          <h3 style={{ 
            fontSize: "18px", 
            fontWeight: "600", 
            margin: "0 0 8px 0",
            color: "#495057"
          }}>
            No tasks yet
          </h3>
          <p style={{ 
            color: "#6c757d", 
            margin: "0 0 24px 0",
            fontSize: "14px"
          }}>
            Create your first task to execute a workflow.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
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
            Create Your First Task
          </button>
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
                  Task Name
                </th>
                <th style={{ 
                  textAlign: "left", 
                  padding: "16px", 
                  fontWeight: "600",
                  color: "#495057",
                  borderBottom: "1px solid #dee2e6"
                }}>
                  Agent Used
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
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, index) => (
                <tr key={task.id} style={{
                  borderBottom: index < tasks.length - 1 ? "1px solid #f1f3f4" : "none"
                }}>
                  <td style={{ 
                    padding: "16px",
                    fontWeight: "500",
                    color: "#212529"
                  }}>
                    {task.name}
                  </td>
                  <td style={{ 
                    padding: "16px",
                    color: "#6c757d"
                  }}>
                    {task.agentName}
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "500",
                      backgroundColor: getStatusColor(task.status) + "20",
                      color: getStatusColor(task.status),
                      border: `1px solid ${getStatusColor(task.status)}40`
                    }}>
                      <span>{getStatusIcon(task.status)}</span>
                      {task.status}
                    </span>
                  </td>
                  <td style={{ 
                    padding: "16px",
                    color: "#6c757d"
                  }}>
                    {formatDate(task.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
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
            border: "1px solid #dee2e6",
            padding: "24px",
            maxWidth: "500px",
            width: "90%",
            maxHeight: "80vh",
            overflow: "auto"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px"
            }}>
              <h3 style={{
                fontSize: "18px",
                fontWeight: "600",
                margin: 0,
                color: "#333"
              }}>
                ➕ Create New Task
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setError("")
                  setTaskName("")
                  setSelectedAgentId("")
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#6c757d",
                  padding: "0",
                  width: "30px",
                  height: "30px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                ×
              </button>
            </div>
            
            {error && (
              <div style={{
                backgroundColor: "#f8d7da",
                color: "#721c24",
                padding: "12px 16px",
                borderRadius: "6px",
                border: "1px solid #f5c6cb",
                marginBottom: "16px",
                fontSize: "14px"
              }}>
                {error}
              </div>
            )}
            
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#495057",
                marginBottom: "8px"
              }}>
                Task Name *
              </label>
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Enter a descriptive name for this task"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid #ced4da",
                  borderRadius: "6px",
                  fontSize: "14px",
                  boxSizing: "border-box",
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
            
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#495057",
                marginBottom: "8px"
              }}>
                Select Agent *
              </label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid #ced4da",
                  borderRadius: "6px",
                  fontSize: "14px",
                  backgroundColor: "#fff",
                  boxSizing: "border-box",
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
              >
                <option value="">Choose an agent...</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} - {agent.purposePrompt?.substring(0, 50)}...
                  </option>
                ))}
              </select>
              {agentsError && (
                <p style={{
                  fontSize: "12px",
                  color: "#dc3545",
                  margin: "4px 0 0 0"
                }}>
                  Error loading agents: {agentsError.message}
                </p>
              )}
            </div>
            
            <div style={{
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end"
            }}>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setError("")
                  setTaskName("")
                  setSelectedAgentId("")
                }}
                style={{
                  background: "#6c757d",
                  color: "#fff",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "background-color 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#5a6268";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#6c757d";
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                disabled={isCreating || !taskName.trim() || !selectedAgentId}
                style={{
                  background: isCreating || !taskName.trim() || !selectedAgentId ? "#6c757d" : "#007bff",
                  color: "#fff",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: isCreating || !taskName.trim() || !selectedAgentId ? "not-allowed" : "pointer",
                  transition: "background-color 0.2s ease",
                  opacity: isCreating || !taskName.trim() || !selectedAgentId ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isCreating && taskName.trim() && selectedAgentId) {
                    e.currentTarget.style.backgroundColor = "#0056b3";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCreating && taskName.trim() && selectedAgentId) {
                    e.currentTarget.style.backgroundColor = "#007bff";
                  }
                }}
              >
                {isCreating ? "Creating..." : "Run Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}