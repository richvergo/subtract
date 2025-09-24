"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import useSWR from "swr"

// Enhanced fetcher with proper error handling
async function fetcher(url: string) {
  const res = await fetch(url, {
    credentials: 'include',
  })
  if (res.status === 401) throw new Error("Unauthorized - please login")
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
  return res.json()
}

interface ActionAnalysis {
  action: string
  intent: string
  stepIndex: number
  selector?: string
  metadata: {
    confidence: number
    reasoning: string
  }
}

interface Agent {
  id: string
  name: string
  description?: string
  agentConfig?: any[]
  agentIntents?: ActionAnalysis[]
  transcript?: string
  recordingUrl?: string
}

interface CSVUploadData {
  [parameterName: string]: {
    file: File | null
    data: string[][]
    headers: string[]
    selectedColumn: string
  }
}

export default function ConfigureAgentPage() {
  const params = useParams()
  const router = useRouter()
  const agentId = params.id as string

  // Fetch agent data
  const { data, error, mutate } = useSWR(`/api/agents/${agentId}`, fetcher)
  
  const agent: Agent = data?.agent || data
  const isLoading = !data && !error

  // State for CSV uploads
  const [csvUploads, setCsvUploads] = useState<CSVUploadData>({})
  const [isProcessing, setIsProcessing] = useState(false)

  // Parse agent intents from transcript if available
  const actionAnalyses: ActionAnalysis[] = React.useMemo(() => {
    if (agent?.agentIntents && Array.isArray(agent.agentIntents)) {
      return agent.agentIntents
    }
    
    // Try to parse from transcript
    if (agent?.transcript) {
      try {
        const transcriptData = JSON.parse(agent.transcript)
        return transcriptData.parameterizableActions || []
      } catch (error) {
        console.error('Failed to parse transcript:', error)
      }
    }
    
    return []
  }, [agent])

  // Initialize CSV upload data for parameterizable actions
  useEffect(() => {
    // For now, no parameterizable actions since we're using the simplified structure
    setCsvUploads({})
  }, [actionAnalyses])

  const handleCSVUpload = (parameterName: string, file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const csvText = e.target?.result as string
      const lines = csvText.split('\n').filter(line => line.trim())
      const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, '')) || []
      const data = lines.slice(1).map(line => 
        line.split(',').map(cell => cell.trim().replace(/"/g, ''))
      )

      setCsvUploads(prev => ({
        ...prev,
        [parameterName]: {
          file,
          data,
          headers,
          selectedColumn: headers[0] || ''
        }
      }))
    }
    reader.readAsText(file)
  }

  const handleColumnSelect = (parameterName: string, column: string) => {
    setCsvUploads(prev => ({
      ...prev,
      [parameterName]: {
        ...prev[parameterName],
        selectedColumn: column
      }
    }))
  }

  const getParameterData = (parameterName: string) => {
    const upload = csvUploads[parameterName]
    if (upload && upload.selectedColumn && upload.headers.length > 0) {
      const columnIndex = upload.headers.indexOf(upload.selectedColumn)
      return upload.data.map(row => row[columnIndex]).filter(value => value.trim())
    }
    return []
  }

  const handleSaveConfiguration = async () => {
    setIsProcessing(true)
    try {
      // Prepare configuration data
      const configuration = actionAnalyses.map(analysis => ({
        parameterName: analysis.parameterName,
        parameterType: analysis.parameterType,
        data: analysis.parameterType === 'list' ? getParameterData(analysis.parameterName || '') : null,
        actionId: analysis.action.id
      }))

      // Save configuration (you can implement this API endpoint)
      console.log('Saving configuration:', configuration)
      
      // For now, just show success message
      alert('Configuration saved successfully!')
      
    } catch (error) {
      console.error('Failed to save configuration:', error)
      alert('Failed to save configuration. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div style={{
        minHeight: "100vh",
        backgroundColor: "#f8f9fa",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{
          textAlign: "center",
          color: "#6c757d"
        }}>
          <div style={{ fontSize: "24px", marginBottom: "16px" }}>⏳</div>
          <div>Loading agent configuration...</div>
        </div>
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div style={{
        minHeight: "100vh",
        backgroundColor: "#f8f9fa",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{
          textAlign: "center",
          color: "#dc3545"
        }}>
          <div style={{ fontSize: "24px", marginBottom: "16px" }}>❌</div>
          <div>Failed to load agent configuration</div>
          <button
            onClick={() => router.push('/agents')}
            style={{
              marginTop: "16px",
              background: "#007bff",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Back to Agents
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#f8f9fa",
      padding: "24px"
    }}>
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto"
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "32px"
        }}>
          <div>
            <h1 style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "#212529",
              margin: "0 0 8px 0"
            }}>
              🔧 Configure Agent
            </h1>
            <p style={{
              fontSize: "16px",
              color: "#6c757d",
              margin: "0"
            }}>
              {agent.name}
            </p>
          </div>
          <button
            onClick={() => router.push('/agents')}
            style={{
              background: "transparent",
              color: "#6c757d",
              border: "1px solid #dee2e6",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            ← Back to Agents
          </button>
        </div>

        {/* Agent Info */}
        <div style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
          <h2 style={{
            fontSize: "20px",
            fontWeight: "600",
            margin: "0 0 16px 0",
            color: "#495057"
          }}>
            📋 Agent Overview
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <strong>Total Actions:</strong> {actionAnalyses.length}
            </div>
            <div>
              <strong>Parameterizable Actions:</strong> 0
            </div>
            {agent.description && (
              <div style={{ gridColumn: "1 / -1" }}>
                <strong>Description:</strong> {agent.description}
              </div>
            )}
          </div>
        </div>

        {/* Actions Analysis */}
        <div style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
          <h2 style={{
            fontSize: "20px",
            fontWeight: "600",
            margin: "0 0 24px 0",
            color: "#495057"
          }}>
            🎯 Analyzed Actions
          </h2>

          {actionAnalyses.length === 0 ? (
            <div style={{
              textAlign: "center",
              color: "#6c757d",
              padding: "40px"
            }}>
              <div style={{ fontSize: "24px", marginBottom: "16px" }}>📝</div>
              <div>No action analysis available. This agent may not have been created with enhanced recording.</div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "14px"
              }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #dee2e6" }}>
                    <th style={{ textAlign: "left", padding: "12px", fontWeight: "600" }}>Action</th>
                    <th style={{ textAlign: "left", padding: "12px", fontWeight: "600" }}>Type</th>
                    <th style={{ textAlign: "left", padding: "12px", fontWeight: "600" }}>Description</th>
                    <th style={{ textAlign: "center", padding: "12px", fontWeight: "600" }}>Parameterizable</th>
                    <th style={{ textAlign: "left", padding: "12px", fontWeight: "600" }}>Data Source</th>
                  </tr>
                </thead>
                <tbody>
                  {actionAnalyses.map((analysis, index) => (
                    <tr key={`${analysis.action}-${index}`} style={{
                      borderBottom: "1px solid #e9ecef",
                      backgroundColor: index % 2 === 0 ? "#ffffff" : "#f8f9fa"
                    }}>
                      <td style={{ padding: "12px" }}>
                        <div>
                          <strong>{(analysis.action || 'unknown').toUpperCase()}</strong>
                          {analysis.selector && (
                            <div style={{ fontSize: "12px", color: "#6c757d" }}>
                              Selector: {analysis.selector}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "500",
                          backgroundColor: "#e9ecef",
                          color: "#495057"
                        }}>
                          {analysis.intent}
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        {analysis.metadata?.reasoning || analysis.intent}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        <span style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "500",
                          backgroundColor: "#f8d7da",
                          color: "#721c24"
                        }}>
                          ❌ No
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{ color: "#6c757d", fontSize: "12px" }}>
                          Not applicable
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Actions are displayed for review only - no configuration needed for MVP */}
      </div>
    </div>
  )
}
