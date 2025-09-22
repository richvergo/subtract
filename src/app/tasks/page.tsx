"use client"

import { useState } from "react"
import useSWR from "swr"

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
  parameters?: Record<string, unknown>
}

// Interface for Task Parameters
interface TaskParameters {
  jobName?: string
  customerName?: string
  dateFrom?: string
  dateTo?: string
  userEmail?: string
  customParams?: Record<string, string>
}


export default function TasksPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState("")
  const [taskName, setTaskName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState("")
  
  // Parameter fields
  const [parameters, setParameters] = useState<TaskParameters>({
    jobName: "",
    customerName: "",
    dateFrom: "",
    dateTo: "",
    userEmail: "",
    customParams: {}
  })
  const [showAdvancedParams, setShowAdvancedParams] = useState(false)
  const [executingTasks, setExecutingTasks] = useState<Set<string>>(new Set())
  
  // Fetch agents for the dropdown
  const { data: agentsData, error: agentsError } = useSWR<{ agents: Agent[] }>("/api/agents", fetcher)
  const agents = agentsData?.agents || []
  
  // Fetch real tasks data
  const { data: tasksData } = useSWR<{ tasks: Task[] }>("/api/tasks", fetcher)
  const tasks = tasksData?.tasks || []

  const handleCreateTask = async () => {
    if (!selectedAgentId || !taskName.trim()) {
      setError("Please select an agent and enter a task name")
      return
    }

    setIsCreating(true)
    setError("")

    try {
      // TODO: Replace with real API call when backend support is added
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: taskName.trim(),
          agentId: selectedAgentId,
          parameters: parameters
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.status}`)
      }

      const result = await response.json()
      console.log('Task created successfully:', result)
      
      // Reset form and close modal
      setTaskName("")
      setSelectedAgentId("")
      setParameters({
        jobName: "",
        customerName: "",
        dateFrom: "",
        dateTo: "",
        userEmail: "",
        customParams: {}
      })
      setShowAdvancedParams(false)
      setShowCreateModal(false)
      
    } catch (err) {
      console.error('Error creating task:', err)
      setError(err instanceof Error ? err.message : "Failed to create task")
    } finally {
      setIsCreating(false)
    }
  }

  const handleExecuteTask = async (taskId: string) => {
    setExecutingTasks(prev => new Set(prev).add(taskId))
    setError("")

    try {
      const response = await fetch(`/api/tasks/${taskId}/execute`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to execute task: ${response.status}`)
      }

      const result = await response.json()
      console.log('Task executed successfully:', result)
      
      // Refresh tasks list
      if (tasksData) {
        // Trigger SWR revalidation
        window.location.reload()
      }
      
    } catch (err) {
      console.error('Error executing task:', err)
      setError(err instanceof Error ? err.message : "Failed to execute task")
    } finally {
      setExecutingTasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(taskId)
        return newSet
      })
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
                  <td style={{ 
                    padding: "16px",
                    textAlign: "center"
                  }}>
                    <button
                      onClick={() => handleExecuteTask(task.id)}
                      disabled={task.status === 'RUNNING' || executingTasks.has(task.id)}
                      style={{
                        background: task.status === 'RUNNING' || executingTasks.has(task.id) ? "#6c757d" : "#28a745",
                        color: "#fff",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "500",
                        cursor: task.status === 'RUNNING' || executingTasks.has(task.id) ? "not-allowed" : "pointer",
                        transition: "background-color 0.2s ease",
                        opacity: task.status === 'RUNNING' || executingTasks.has(task.id) ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (task.status !== 'RUNNING' && !executingTasks.has(task.id)) {
                          e.currentTarget.style.backgroundColor = "#218838"
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (task.status !== 'RUNNING' && !executingTasks.has(task.id)) {
                          e.currentTarget.style.backgroundColor = "#28a745"
                        }
                      }}
                    >
                      {executingTasks.has(task.id) ? "🔄 Running..." : task.status === 'RUNNING' ? "🔄 Running" : "▶️ Execute"}
                    </button>
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
                  setParameters({
                    jobName: "",
                    customerName: "",
                    dateFrom: "",
                    dateTo: "",
                    userEmail: "",
                    customParams: {}
                  })
                  setShowAdvancedParams(false)
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
            
            {/* Parameter Fields */}
            <div style={{ 
              marginBottom: "20px",
              padding: "16px",
              backgroundColor: "#f8f9fa",
              borderRadius: "6px",
              border: "1px solid #e9ecef"
            }}>
              <h4 style={{
                fontSize: "16px",
                fontWeight: "600",
                margin: "0 0 16px 0",
                color: "#495057"
              }}>
                📊 Task Parameters
              </h4>
              
              {/* Job/Customer Name */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#495057",
                  marginBottom: "8px"
                }}>
                  Job/Customer Name
                </label>
                <input
                  type="text"
                  value={parameters.jobName || ""}
                  onChange={(e) => setParameters(prev => ({ ...prev, jobName: e.target.value }))}
                  placeholder="e.g., TechCorp Project"
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
              
              {/* Date Range */}
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "1fr 1fr", 
                gap: "12px",
                marginBottom: "16px"
              }}>
                <div>
                  <label style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#495057",
                    marginBottom: "8px"
                  }}>
                    Date From
                  </label>
                  <input
                    type="date"
                    value={parameters.dateFrom || ""}
                    onChange={(e) => setParameters(prev => ({ ...prev, dateFrom: e.target.value }))}
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
                <div>
                  <label style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#495057",
                    marginBottom: "8px"
                  }}>
                    Date To
                  </label>
                  <input
                    type="date"
                    value={parameters.dateTo || ""}
                    onChange={(e) => setParameters(prev => ({ ...prev, dateTo: e.target.value }))}
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
              </div>
              
              {/* User Email */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#495057",
                  marginBottom: "8px"
                }}>
                  User Email (for login)
                </label>
                <input
                  type="email"
                  value={parameters.userEmail || ""}
                  onChange={(e) => setParameters(prev => ({ ...prev, userEmail: e.target.value }))}
                  placeholder="user@company.com"
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
              
              {/* Advanced Parameters Toggle */}
              <button
                type="button"
                onClick={() => setShowAdvancedParams(!showAdvancedParams)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#007bff",
                  fontSize: "14px",
                  cursor: "pointer",
                  padding: "8px 0",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <span>{showAdvancedParams ? "▼" : "▶"}</span>
                {showAdvancedParams ? "Hide Advanced Parameters" : "Show Advanced Parameters"}
              </button>
              
              {/* Advanced Parameters */}
              {showAdvancedParams && (
                <div style={{ 
                  marginTop: "16px",
                  padding: "16px",
                  backgroundColor: "#fff",
                  borderRadius: "6px",
                  border: "1px solid #dee2e6"
                }}>
                  <h5 style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    margin: "0 0 12px 0",
                    color: "#495057"
                  }}>
                    Custom Parameters
                  </h5>
                  <p style={{
                    fontSize: "12px",
                    color: "#6c757d",
                    margin: "0 0 12px 0"
                  }}>
                    Add custom key-value pairs for additional parameters
                  </p>
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "1fr 1fr auto", 
                    gap: "8px",
                    alignItems: "end"
                  }}>
                    <input
                      type="text"
                      placeholder="Parameter name"
                      style={{
                        padding: "8px 12px",
                        border: "1px solid #ced4da",
                        borderRadius: "4px",
                        fontSize: "14px"
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      style={{
                        padding: "8px 12px",
                        border: "1px solid #ced4da",
                        borderRadius: "4px",
                        fontSize: "14px"
                      }}
                    />
                    <button
                      type="button"
                      style={{
                        background: "#007bff",
                        color: "#fff",
                        border: "none",
                        padding: "8px 12px",
                        borderRadius: "4px",
                        fontSize: "14px",
                        cursor: "pointer"
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
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
                  setParameters({
                    jobName: "",
                    customerName: "",
                    dateFrom: "",
                    dateTo: "",
                    userEmail: "",
                    customParams: {}
                  })
                  setShowAdvancedParams(false)
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