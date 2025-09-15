'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';

// Enhanced fetcher with proper error handling according to API_CONTRACT.md
async function fetcher(url: string) {
  const res = await fetch(url, {
    credentials: 'include', // Include session cookies
  })
  if (res.status === 401) throw new Error("Unauthorized - please login")
  if (res.status === 404) throw new Error("Agent not found")
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
interface AgentResponse {
  agent: Agent
}

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.id as string;
  
  const { data, error, isLoading, mutate } = useSWR<AgentResponse>(
    agentId ? `/api/agents/${agentId}` : null, 
    fetcher
  );

  const agent = data?.agent;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return "#28a745"
      case 'DRAFT': return "#ffc107"
      case 'INACTIVE': return "#6c757d"
      default: return "#6c757d"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  }

  if (isLoading) {
    return (
      <div>
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
        </div>
        
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "8px",
          border: "1px solid #dee2e6",
          padding: "48px",
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
            Loading agent...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    const isNotFound = error.message === "Agent not found";
    
    return (
      <div>
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
        </div>
        
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
            color: isNotFound ? "#6c757d" : "#dc3545"
          }}>
            {isNotFound ? "🔍" : "⚠️"}
          </div>
          <h3 style={{ 
            fontSize: "18px", 
            fontWeight: "600", 
            margin: "0 0 8px 0",
            color: isNotFound ? "#6c757d" : "#dc3545"
          }}>
            {isNotFound ? "Agent not found" : "Error loading agent"}
          </h3>
          <p style={{ 
            color: "#6c757d", 
            margin: "0 0 24px 0",
            fontSize: "14px"
          }}>
            {error.message}
          </p>
          {!isNotFound && (
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
          )}
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div>
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
        </div>
        
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
            ❌
          </div>
          <h3 style={{ 
            fontSize: "18px", 
            fontWeight: "600", 
            margin: "0 0 8px 0",
            color: "#dc3545"
          }}>
            Agent not found
          </h3>
          <p style={{ 
            color: "#6c757d", 
            margin: "0 0 24px 0",
            fontSize: "14px"
          }}>
            The requested agent could not be found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
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
          margin: "0 0 8px 0",
          color: "#333"
        }}>
          🤖 {agent.name}
        </h1>
        
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "16px",
          marginBottom: "16px"
        }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            backgroundColor: getStatusColor(agent.status) + "20",
            color: getStatusColor(agent.status),
            border: `1px solid ${getStatusColor(agent.status)}40`
          }}>
            <span>
              {agent.status === 'ACTIVE' ? '✅' : 
               agent.status === 'DRAFT' ? '📝' : '⏸️'}
            </span>
            {agent.status}
          </span>
          
          <span style={{
            fontSize: "14px",
            color: "#6c757d"
          }}>
            Created {formatDate(agent.createdAt)}
          </span>
        </div>
      </div>

      {/* Purpose Prompt */}
      {agent.purposePrompt && (
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "8px",
          border: "1px solid #dee2e6",
          padding: "24px",
          marginBottom: "24px"
        }}>
          <h2 style={{ 
            fontSize: "18px", 
            fontWeight: "600", 
            margin: "0 0 12px 0",
            color: "#333"
          }}>
            🎯 Purpose
          </h2>
          <p style={{ 
            fontSize: "16px",
            color: "#495057",
            margin: 0,
            lineHeight: "1.6"
          }}>
            {agent.purposePrompt}
          </p>
        </div>
      )}

      {/* Agent Details */}
      <div style={{
        backgroundColor: "#fff",
        borderRadius: "8px",
        border: "1px solid #dee2e6",
        padding: "24px",
        marginBottom: "24px"
      }}>
        <h2 style={{ 
          fontSize: "18px", 
          fontWeight: "600", 
          margin: "0 0 16px 0",
          color: "#333"
        }}>
          Agent Details
        </h2>
        
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
          gap: "20px" 
        }}>
          <div>
            <h3 style={{ 
              fontSize: "14px", 
              fontWeight: "500", 
              margin: "0 0 8px 0", 
              color: "#495057" 
            }}>
              ID
            </h3>
            <p style={{ 
              fontSize: "14px", 
              color: "#6c757d", 
              margin: 0,
              fontFamily: "monospace",
              wordBreak: "break-all"
            }}>
              {agent.id}
            </p>
          </div>
          
          <div>
            <h3 style={{ 
              fontSize: "14px", 
              fontWeight: "500", 
              margin: "0 0 8px 0", 
              color: "#495057" 
            }}>
              Status
            </h3>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: "500",
              backgroundColor: getStatusColor(agent.status) + "20",
              color: getStatusColor(agent.status),
              border: `1px solid ${getStatusColor(agent.status)}40`
            }}>
              <span>
                {agent.status === 'ACTIVE' ? '✅' : 
                 agent.status === 'DRAFT' ? '📝' : '⏸️'}
              </span>
              {agent.status}
            </span>
          </div>
          
          {agent.processingStatus && (
            <div>
              <h3 style={{ 
                fontSize: "14px", 
                fontWeight: "500", 
                margin: "0 0 8px 0", 
                color: "#495057" 
              }}>
                Processing Status
              </h3>
              <p style={{ 
                fontSize: "14px", 
                color: "#6c757d", 
                margin: 0 
              }}>
                {agent.processingStatus}
                {agent.processingProgress !== undefined && (
                  <span style={{ marginLeft: "8px" }}>
                    ({agent.processingProgress}%)
                  </span>
                )}
              </p>
            </div>
          )}
          
          <div>
            <h3 style={{ 
              fontSize: "14px", 
              fontWeight: "500", 
              margin: "0 0 8px 0", 
              color: "#495057" 
            }}>
              Created
            </h3>
            <p style={{ 
              fontSize: "14px", 
              color: "#6c757d", 
              margin: 0 
            }}>
              {formatDate(agent.createdAt)}
            </p>
          </div>
          
          <div>
            <h3 style={{ 
              fontSize: "14px", 
              fontWeight: "500", 
              margin: "0 0 8px 0", 
              color: "#495057" 
            }}>
              Last Updated
            </h3>
            <p style={{ 
              fontSize: "14px", 
              color: "#6c757d", 
              margin: 0 
            }}>
              {formatDate(agent.updatedAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Workflow Configuration */}
      {(agent.agentConfig || agent.agentIntents) && (
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "8px",
          border: "1px solid #dee2e6",
          padding: "24px"
        }}>
          <h2 style={{ 
            fontSize: "18px", 
            fontWeight: "600", 
            margin: "0 0 16px 0",
            color: "#333"
          }}>
            Workflow Configuration
          </h2>
          
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
            gap: "16px",
            marginBottom: "20px"
          }}>
            <div style={{
              padding: "16px",
              backgroundColor: "#f8f9fa",
              borderRadius: "6px",
              border: "1px solid #e9ecef"
            }}>
              <h3 style={{ 
                fontSize: "14px", 
                fontWeight: "500", 
                margin: "0 0 8px 0", 
                color: "#495057" 
              }}>
                Workflow Steps
              </h3>
              <p style={{ 
                fontSize: "24px", 
                fontWeight: "600", 
                margin: 0,
                color: "#007bff"
              }}>
                {agent.agentConfig?.length || 0}
              </p>
            </div>
            
            <div style={{
              padding: "16px",
              backgroundColor: "#f8f9fa",
              borderRadius: "6px",
              border: "1px solid #e9ecef"
            }}>
              <h3 style={{ 
                fontSize: "14px", 
                fontWeight: "500", 
                margin: "0 0 8px 0", 
                color: "#495057" 
              }}>
                Intent Descriptions
              </h3>
              <p style={{ 
                fontSize: "24px", 
                fontWeight: "600", 
                margin: 0,
                color: "#28a745"
              }}>
                {agent.agentIntents?.length || 0}
              </p>
            </div>
            
            {agent.logins && (
              <div style={{
                padding: "16px",
                backgroundColor: "#f8f9fa",
                borderRadius: "6px",
                border: "1px solid #e9ecef"
              }}>
                <h3 style={{ 
                  fontSize: "14px", 
                  fontWeight: "500", 
                  margin: "0 0 8px 0", 
                  color: "#495057" 
                }}>
                  Associated Logins
                </h3>
                <p style={{ 
                  fontSize: "24px", 
                  fontWeight: "600", 
                  margin: 0,
                  color: "#ffc107"
                }}>
                  {agent.logins.length}
                </p>
              </div>
            )}
          </div>
          
          {agent.agentRuns && agent.agentRuns.length > 0 && (
            <div>
              <h3 style={{ 
                fontSize: "16px", 
                fontWeight: "500", 
                margin: "0 0 12px 0",
                color: "#495057"
              }}>
                Recent Runs
              </h3>
              <p style={{ 
                fontSize: "14px", 
                color: "#6c757d", 
                margin: 0 
              }}>
                {agent.agentRuns.length} run{agent.agentRuns.length !== 1 ? 's' : ''} recorded
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}