'use client';

import React from 'react';
import Link from 'next/link';
import useSWR from 'swr';

// Enhanced fetcher with proper error handling
async function fetcher(url: string) {
  const res = await fetch(url, {
    credentials: 'include', // Include session cookies
  })
  if (res.status === 401) throw new Error("Unauthorized - please login")
  if (res.status === 404) throw new Error("Not found")
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
  return res.json()
}

// Agent interface matching API response structure
interface AgentRun {
  id: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REQUIRES_CONFIRMATION' | 'CONFIRMED' | 'REJECTED'
  startedAt: string
  finishedAt?: string
}

interface Agent {
  id: string
  name: string
  description?: string
  status: string
  processingStatus?: string
  processingProgress?: number
  agentConfig?: any
  purposePrompt?: string
  agentIntents?: any
  recordingPath?: string
  recordingUrl?: string
  ownerId: string
  createdAt: string
  updatedAt: string
  logins: Array<{
    id: string
    name: string
    loginUrl: string
  }>
  latestRuns: AgentRun[]
}

interface Login {
  id: string
  name: string
  loginUrl: string
  username: string
  status: 'UNKNOWN' | 'ACTIVE' | 'NEEDS_RECONNECT' | 'DISCONNECTED' | 'BROKEN' | 'EXPIRED' | 'SUSPENDED'
  lastCheckedAt?: string
  lastSuccessAt?: string
  lastFailureAt?: string
  failureCount: number
  errorMessage?: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

// API response structures
interface AgentsResponse {
  agents: Agent[]
}

interface LoginsResponse {
  logins: Login[]
}

// Recent activity item
interface RecentActivity {
  id: string
  timestamp: string
  agentName: string
  status: string
  agentId: string
}

export default function DashboardPage() {
  const { data: agentsData, error: agentsError, isLoading: agentsLoading, mutate: mutateAgents } = useSWR<AgentsResponse>(
    '/api/agents',
    fetcher
  );

  const { data: loginsData, error: loginsError, isLoading: loginsLoading, mutate: mutateLogins } = useSWR<LoginsResponse>(
    '/api/logins',
    fetcher
  );

  const agents = agentsData?.agents || [];
  const logins = loginsData?.logins || [];

  // Aggregate recent activity from all agents' latest runs
  const recentActivity: RecentActivity[] = agents
    .flatMap(agent => 
      agent.latestRuns.map(run => ({
        id: run.id,
        timestamp: run.startedAt,
        agentName: agent.name,
        status: run.status,
        agentId: agent.id
      }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5); // Get top 5 most recent

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'COMPLETED': { color: "#28a745", icon: "✅", text: "Success" },
      'FAILED': { color: "#dc3545", icon: "❌", text: "Failed" },
      'PENDING': { color: "#ffc107", icon: "⏳", text: "Pending" },
      'RUNNING': { color: "#007bff", icon: "🔄", text: "Running" },
      'CANCELLED': { color: "#6c757d", icon: "⏹️", text: "Cancelled" },
      'REQUIRES_CONFIRMATION': { color: "#fd7e14", icon: "❓", text: "Needs Confirmation" },
      'CONFIRMED': { color: "#28a745", icon: "✅", text: "Confirmed" },
      'REJECTED': { color: "#dc3545", icon: "❌", text: "Rejected" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { color: "#6c757d", icon: "❓", text: status };

    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 8px",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: "500",
        backgroundColor: config.color + "20",
        color: config.color,
        border: `1px solid ${config.color}40`
      }}>
        <span>{config.icon}</span>
        {config.text}
      </span>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const handleRetry = () => {
    mutateAgents();
    mutateLogins();
  };

  const hasError = agentsError || loginsError;
  const isLoading = agentsLoading || loginsLoading;

  return (
    <div>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "32px"
      }}>
        <h1 style={{ 
          fontSize: "32px", 
          fontWeight: "700", 
          margin: 0,
          color: "#333"
        }}>
          📊 Dashboard
        </h1>
        
        <div style={{
          display: "flex",
          gap: "12px"
        }}>
          <Link
            href="/agents/create"
            style={{
              background: "#007bff",
              color: "#fff",
              padding: "12px 20px",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "background-color 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              textDecoration: "none"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#0056b3";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#007bff";
            }}
          >
            <span>🤖</span>
            Create Agent
          </Link>
          
          <Link
            href="/logins"
            style={{
              background: "#28a745",
              color: "#fff",
              padding: "12px 20px",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "background-color 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              textDecoration: "none"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#1e7e34";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#28a745";
            }}
          >
            <span>🔑</span>
            Add Login
          </Link>
        </div>
      </div>

      {/* Error Display */}
      {hasError && (
        <div style={{
          backgroundColor: "#f8d7da",
          color: "#721c24",
          padding: "12px 16px",
          borderRadius: "6px",
          border: "1px solid #f5c6cb",
          marginBottom: "24px",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <span>⚠️</span>
          <span>{agentsError?.message || loginsError?.message}</span>
          <button
            onClick={handleRetry}
            style={{
              background: "#dc3545",
              color: "#fff",
              border: "none",
              padding: "6px 12px",
              borderRadius: "4px",
              fontSize: "12px",
              cursor: "pointer",
              marginLeft: "auto"
            }}
          >
            🔄 Retry
          </button>
        </div>
      )}

      {/* System Stats Section */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "20px",
        marginBottom: "32px"
      }}>
        {/* Agents Card */}
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "8px",
          border: "1px solid #dee2e6",
          padding: "24px",
          textAlign: "center"
        }}>
          {isLoading ? (
            <div>
              <div style={{ 
                fontSize: "24px", 
                marginBottom: "16px",
                color: "#6c757d"
              }}>
                ⏳
              </div>
              <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>
                Loading...
              </p>
            </div>
          ) : (
            <div>
              <div style={{
                fontSize: "48px",
                marginBottom: "12px",
                color: "#007bff"
              }}>
                🤖
              </div>
              <h3 style={{
                fontSize: "32px",
                fontWeight: "700",
                margin: "0 0 8px 0",
                color: "#333"
              }}>
                {agents.length}
              </h3>
              <p style={{
                fontSize: "14px",
                color: "#6c757d",
                margin: 0,
                fontWeight: "500"
              }}>
                Total Agents
              </p>
            </div>
          )}
        </div>

        {/* Logins Card */}
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "8px",
          border: "1px solid #dee2e6",
          padding: "24px",
          textAlign: "center"
        }}>
          {isLoading ? (
            <div>
              <div style={{ 
                fontSize: "24px", 
                marginBottom: "16px",
                color: "#6c757d"
              }}>
                ⏳
              </div>
              <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>
                Loading...
              </p>
            </div>
          ) : (
            <div>
              <div style={{
                fontSize: "48px",
                marginBottom: "12px",
                color: "#28a745"
              }}>
                🔑
              </div>
              <h3 style={{
                fontSize: "32px",
                fontWeight: "700",
                margin: "0 0 8px 0",
                color: "#333"
              }}>
                {logins.length}
              </h3>
              <p style={{
                fontSize: "14px",
                color: "#6c757d",
                margin: 0,
                fontWeight: "500"
              }}>
                Total Logins
              </p>
            </div>
          )}
        </div>

        {/* Runs Card */}
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "8px",
          border: "1px solid #dee2e6",
          padding: "24px",
          textAlign: "center"
        }}>
          {isLoading ? (
            <div>
              <div style={{ 
                fontSize: "24px", 
                marginBottom: "16px",
                color: "#6c757d"
              }}>
                ⏳
              </div>
              <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>
                Loading...
              </p>
            </div>
          ) : (
            <div>
              <div style={{
                fontSize: "48px",
                marginBottom: "12px",
                color: "#fd7e14"
              }}>
                ⚡
              </div>
              <h3 style={{
                fontSize: "32px",
                fontWeight: "700",
                margin: "0 0 8px 0",
                color: "#333"
              }}>
                {agents.reduce((total, agent) => total + agent.latestRuns.length, 0)}
              </h3>
              <p style={{
                fontSize: "14px",
                color: "#6c757d",
                margin: 0,
                fontWeight: "500"
              }}>
                Recent Runs
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Section */}
      <div style={{
        backgroundColor: "#fff",
        borderRadius: "8px",
        border: "1px solid #dee2e6",
        padding: "24px"
      }}>
        <h2 style={{
          fontSize: "20px",
          fontWeight: "600",
          margin: "0 0 20px 0",
          color: "#333",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          🕒 Recent Activity
        </h2>

        {isLoading ? (
          <div style={{
            padding: "40px",
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
              Loading recent activity...
            </p>
          </div>
        ) : recentActivity.length === 0 ? (
          <div style={{
            padding: "40px",
            textAlign: "center",
            backgroundColor: "#f8f9fa",
            borderRadius: "6px",
            border: "1px solid #e9ecef"
          }}>
            <div style={{
              fontSize: "48px",
              marginBottom: "16px",
              color: "#6c757d"
            }}>
              🕒
            </div>
            <p style={{
              fontSize: "16px",
              color: "#6c757d",
              margin: "0 0 8px 0",
              fontWeight: "500"
            }}>
              No recent runs
            </p>
            <p style={{
              fontSize: "14px",
              color: "#6c757d",
              margin: 0
            }}>
              Run some agents to see activity here.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px"
            }}>
              <thead>
                <tr style={{
                  borderBottom: "2px solid #dee2e6"
                }}>
                  <th style={{
                    textAlign: "left",
                    padding: "12px 8px",
                    fontWeight: "600",
                    color: "#495057",
                    fontSize: "14px"
                  }}>
                    Timestamp
                  </th>
                  <th style={{
                    textAlign: "left",
                    padding: "12px 8px",
                    fontWeight: "600",
                    color: "#495057",
                    fontSize: "14px"
                  }}>
                    Agent
                  </th>
                  <th style={{
                    textAlign: "left",
                    padding: "12px 8px",
                    fontWeight: "600",
                    color: "#495057",
                    fontSize: "14px"
                  }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((activity, index) => (
                  <tr 
                    key={activity.id}
                    style={{
                      borderBottom: "1px solid #f1f3f4",
                      backgroundColor: index % 2 === 0 ? "#fff" : "#f8f9fa"
                    }}
                  >
                    <td style={{
                      padding: "12px 8px",
                      color: "#495057",
                      fontSize: "13px"
                    }}>
                      {formatTimestamp(activity.timestamp)}
                    </td>
                    <td style={{
                      padding: "12px 8px",
                      color: "#495057",
                      fontWeight: "500"
                    }}>
                      <Link
                        href={`/agents/${activity.agentId}`}
                        style={{
                          color: "#007bff",
                          textDecoration: "none",
                          fontSize: "14px"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.textDecoration = "underline";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.textDecoration = "none";
                        }}
                      >
                        {activity.agentName}
                      </Link>
                    </td>
                    <td style={{
                      padding: "12px 8px"
                    }}>
                      {getStatusBadge(activity.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}