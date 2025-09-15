"use client"

import useSWR from "swr"
import Link from "next/link"

// Enhanced fetcher with proper error handling according to API_CONTRACT.md
async function fetcher(url: string) {
  const res = await fetch(url)
  if (res.status === 401) throw new Error("Unauthorized - please login")
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
  return res.json()
}

// Interface matching API_CONTRACT.md response structure
interface Agent {
  id: string
  name: string
  description?: string
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE'
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
  recordingPath?: string
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
      case 'INACTIVE': return "#6c757d"
      default: return "#6c757d"
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
        <Link href="/agents/create">
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
          <Link href="/agents/create">
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
                      {agent.status}
                    </span>
                  </td>
                  <td style={{ 
                    padding: "16px",
                    color: "#6c757d"
                  }}>
                    {getLastRun(agent)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}