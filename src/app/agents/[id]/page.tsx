'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { agentsApi, agentRunsApi, useAgentRuns, type Agent, type AgentRun } from '@/lib/agentsApi';

// Run Detail Modal
function RunDetailModal({ 
  isOpen, 
  onClose, 
  run, 
  onConfirm, 
  onReject 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  run: AgentRun | null;
  onConfirm: () => void;
  onReject: () => void;
}) {
  if (!isOpen || !run) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS': return '✅';
      case 'FAILED': return '❌';
      case 'PENDING': return '⏳';
      default: return '❓';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      marginLeft: '240px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>{getStatusIcon(run.status)}</span>
            Run Details
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 8px 0', color: '#333' }}>
              Status
            </h3>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '500',
              backgroundColor: run.status === 'SUCCESS' ? '#d4edda' : 
                             run.status === 'FAILED' ? '#f8d7da' : '#fff3cd',
              color: run.status === 'SUCCESS' ? '#155724' : 
                     run.status === 'FAILED' ? '#721c24' : '#856404'
            }}>
              <span>{getStatusIcon(run.status)}</span>
              {run.status}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 8px 0', color: '#333' }}>
              Started At
            </h3>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              {formatDate(run.startedAt)}
            </p>
          </div>

          {run.finishedAt && (
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 8px 0', color: '#333' }}>
                Finished At
              </h3>
              <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                {formatDate(run.finishedAt)}
              </p>
            </div>
          )}

          {run.result && (
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 8px 0', color: '#333' }}>
                Result
              </h3>
              <pre style={{
                fontSize: '12px',
                backgroundColor: '#f8f9fa',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #e9ecef',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                margin: 0
              }}>
                {JSON.stringify(run.result, null, 2)}
              </pre>
            </div>
          )}

          {run.error && (
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 8px 0', color: '#333' }}>
                Error
              </h3>
              <div style={{
                fontSize: '12px',
                backgroundColor: '#f8d7da',
                color: '#721c24',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #f5c6cb',
                margin: 0
              }}>
                {run.error}
              </div>
            </div>
          )}

          {run.status === 'PENDING' && (
            <div style={{
              display: 'flex',
              gap: '8px',
              padding: '16px',
              backgroundColor: '#fff3cd',
              borderRadius: '6px',
              border: '1px solid #ffeaa7'
            }}>
              <button
                onClick={onConfirm}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#218838';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#28a745';
                }}
              >
                ✅ Confirm
              </button>
              <button
                onClick={onReject}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#c82333';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc3545';
                }}
              >
                ❌ Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;
  
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const { data: agent, error, mutate } = useSWR(
    agentId ? `/api/agents/${agentId}` : null,
    () => agentsApi.getAgent(agentId)
  );

  const { runs, mutate: mutateRuns } = useAgentRuns(agentId);

  const handleRunAgent = async () => {
    if (!agent) return;
    
    setIsRunning(true);
    try {
      await agentRunsApi.runAgent(agent.id);
      await mutateRuns(); // Refresh runs
    } catch (error) {
      console.error('Error running agent:', error);
      alert('Failed to run agent');
    } finally {
      setIsRunning(false);
    }
  };

  const handleConfirmRun = async () => {
    if (!selectedRun) return;
    
    try {
      await agentRunsApi.confirmRun(selectedRun.id);
      await mutateRuns();
      setIsModalOpen(false);
      setSelectedRun(null);
    } catch (error) {
      console.error('Error confirming run:', error);
      alert('Failed to confirm run');
    }
  };

  const handleRejectRun = async () => {
    if (!selectedRun) return;
    
    try {
      await agentRunsApi.rejectRun(selectedRun.id);
      await mutateRuns();
      setIsModalOpen(false);
      setSelectedRun(null);
    } catch (error) {
      console.error('Error rejecting run:', error);
      alert('Failed to reject run');
    }
  };

  const handleRunClick = (run: AgentRun) => {
    setSelectedRun(run);
    setIsModalOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS': return '✅';
      case 'FAILED': return '❌';
      case 'PENDING': return '⏳';
      default: return '❓';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (error) {
    return (
      <div style={{ padding: "24px" }}>
        <div className="card">
          <h2 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 16px 0" }}>Error</h2>
          <p style={{ color: "#dc3545", margin: 0 }}>
            Failed to load agent: {error.message}
          </p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div style={{ padding: "24px" }}>
        <div className="card">
          <p style={{ textAlign: "center", color: "#666" }}>Loading agent...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px" }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: "16px",
        marginBottom: "24px"
      }}>
        <button
          onClick={() => router.back()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 12px",
            backgroundColor: "transparent",
            border: "1px solid #ddd",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            color: "#333"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f5f5f5";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <span>←</span>
          Back
        </button>
        
        <div style={{ flex: 1 }}>
          <h1 style={{ 
            fontSize: "32px", 
            fontWeight: "700", 
            margin: "0 0 8px 0",
            color: "#333"
          }}>
            🤖 {agent.name}
          </h1>
          {agent.purposePrompt && (
            <div style={{
              padding: "12px 16px",
              backgroundColor: "#e3f2fd",
              borderRadius: "8px",
              margin: "8px 0",
              border: "1px solid #bbdefb"
            }}>
              <p style={{ 
                fontSize: "16px",
                fontWeight: "500",
                color: "#1976d2",
                margin: "0 0 4px 0"
              }}>
                🎯 Purpose
              </p>
              <p style={{ 
                color: "#333",
                margin: 0,
                fontSize: "14px"
              }}>
                {agent.purposePrompt}
              </p>
            </div>
          )}
          {agent.description && (
            <p style={{ 
              color: "#666",
              margin: 0,
              fontSize: "14px"
            }}>
              {agent.description}
            </p>
          )}
        </div>
        
        <button
          onClick={handleRunAgent}
          disabled={isRunning}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 20px",
            backgroundColor: isRunning ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: isRunning ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: "500"
          }}
        >
          <span>{isRunning ? '⏳' : '▶️'}</span>
          {isRunning ? 'Running...' : 'Run Agent'}
        </button>
      </div>

      {/* Agent Details */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div style={{ paddingBottom: "16px", borderBottom: "1px solid #eee", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0 }}>Agent Details</h2>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: "500", margin: "0 0 8px 0", color: "#333" }}>
              Status
            </h3>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 8px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "500",
              backgroundColor: agent.status === 'ACTIVE' ? '#d4edda' : 
                             agent.status === 'INACTIVE' ? '#f8d7da' : '#fff3cd',
              color: agent.status === 'ACTIVE' ? '#155724' : 
                     agent.status === 'INACTIVE' ? '#721c24' : '#856404'
            }}>
              <span>{agent.status === 'ACTIVE' ? '✅' : agent.status === 'INACTIVE' ? '⏸️' : '📝'}</span>
              {agent.status}
            </div>
          </div>
          
          {agent.schedule && (
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: "500", margin: "0 0 8px 0", color: "#333" }}>
                Schedule
              </h3>
              <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
                {agent.schedule}
              </p>
            </div>
          )}
          
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: "500", margin: "0 0 8px 0", color: "#333" }}>
              Created
            </h3>
            <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
              {formatDate(agent.createdAt)}
            </p>
          </div>
          
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: "500", margin: "0 0 8px 0", color: "#333" }}>
              Last Updated
            </h3>
            <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
              {formatDate(agent.updatedAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div style={{ paddingBottom: "16px", borderBottom: "1px solid #eee", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0 }}>Workflow Steps</h2>
          <p style={{ fontSize: "14px", color: "#666", margin: "4px 0 0 0" }}>
            {agent.agentConfig?.length || 0} steps • {agent.agentIntents?.length || 0} with intent descriptions
            {agent.purposePrompt && (
              <span style={{ marginLeft: "16px", color: "#1976d2", fontWeight: "500" }}>
                🎯 {agent.purposePrompt}
              </span>
            )}
          </p>
        </div>
        
        {agent.agentConfig && agent.agentConfig.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {agent.agentConfig.map((step, index) => {
              const intent = agent.agentIntents?.find(i => i.stepIndex === index);
              
              return (
                <div key={index} style={{
                  padding: "16px",
                  border: "1px solid #e9ecef",
                  borderRadius: "8px",
                  backgroundColor: "#f8f9fa"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "32px",
                      height: "32px",
                      backgroundColor: "#007bff",
                      color: "white",
                      borderRadius: "50%",
                      fontSize: "14px",
                      fontWeight: "600"
                    }}>
                      {index + 1}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{
                          padding: "2px 8px",
                          backgroundColor: "#e3f2fd",
                          color: "#1976d2",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "500"
                        }}>
                          {step.action.toUpperCase()}
                        </span>
                        
                        {step.selector && (
                          <code style={{
                            padding: "2px 6px",
                            backgroundColor: "#f5f5f5",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontFamily: "monospace"
                          }}>
                            {step.selector}
                          </code>
                        )}
                      </div>
                      
                      {intent && (
                        <p style={{
                          fontSize: "14px",
                          color: "#333",
                          margin: "0",
                          fontStyle: "italic"
                        }}>
                          💡 {intent.intent}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Step Details */}
                  <div style={{ marginLeft: "44px" }}>
                    {step.action === 'goto' && step.url && (
                      <p style={{ fontSize: "13px", color: "#666", margin: "0" }}>
                        Navigate to: <a href={step.url} target="_blank" rel="noopener noreferrer" style={{ color: "#007bff" }}>
                          {step.url}
                        </a>
                      </p>
                    )}
                    
                    {step.action === 'type' && step.value && (
                      <p style={{ fontSize: "13px", color: "#666", margin: "0" }}>
                        Type: <code style={{ backgroundColor: "#f5f5f5", padding: "1px 4px", borderRadius: "3px" }}>
                          {step.value}
                        </code>
                      </p>
                    )}
                    
                    {step.action === 'waitForSelector' && step.timeout && (
                      <p style={{ fontSize: "13px", color: "#666", margin: "0" }}>
                        Timeout: {step.timeout}ms
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
            <h3 style={{ fontSize: "18px", fontWeight: "500", marginBottom: "8px" }}>No workflow steps</h3>
            <p style={{ color: "#666", marginBottom: "16px" }}>
              This agent doesn&apos;t have any workflow steps configured yet.
            </p>
          </div>
        )}
      </div>

      {/* Recent Runs */}
      <div className="card">
        <div style={{ paddingBottom: "16px", borderBottom: "1px solid #eee", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0 }}>Recent Runs</h2>
        </div>
        
        {!runs || runs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏃</div>
            <h3 style={{ fontSize: "18px", fontWeight: "500", marginBottom: "8px" }}>No runs yet</h3>
            <p style={{ color: "#666", marginBottom: "16px" }}>
              Run this agent to see execution history.
            </p>
            <button 
              className="button"
              onClick={handleRunAgent}
              disabled={isRunning}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                margin: "0 auto"
              }}
            >
              <span>{isRunning ? '⏳' : '▶️'}</span>
              {isRunning ? 'Running...' : 'Run Agent'}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {runs.map((run) => (
              <div 
                key={run.id} 
                onClick={() => handleRunClick(run)}
                style={{
                  padding: "16px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  backgroundColor: "white",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f8f9fa";
                  e.currentTarget.style.borderColor = "#007bff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#ddd";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "20px" }}>{getStatusIcon(run.status)}</span>
                    <div>
                      <h3 style={{ fontSize: "16px", fontWeight: "500", margin: "0 0 4px 0" }}>
                        Run #{run.id.slice(-8)}
                      </h3>
                      <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
                        Started: {formatDate(run.startedAt)}
                      </p>
                    </div>
                  </div>
                  
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "500",
                    backgroundColor: run.status === 'SUCCESS' ? '#d4edda' : 
                                   run.status === 'FAILED' ? '#f8d7da' : '#fff3cd',
                    color: run.status === 'SUCCESS' ? '#155724' : 
                           run.status === 'FAILED' ? '#721c24' : '#856404'
                  }}>
                    <span>{getStatusIcon(run.status)}</span>
                    {run.status}
                  </div>
                </div>
                
                {run.finishedAt && (
                  <div style={{ marginTop: "8px", fontSize: "12px", color: "#666" }}>
                    Finished: {formatDate(run.finishedAt)}
                  </div>
                )}
                
                {run.error && (
                  <div style={{ 
                    marginTop: "8px", 
                    padding: "8px", 
                    backgroundColor: "#f8d7da", 
                    borderRadius: "4px", 
                    fontSize: "12px", 
                    color: "#721c24" 
                  }}>
                    Error: {run.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Run Detail Modal */}
      <RunDetailModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRun(null);
        }}
        run={selectedRun}
        onConfirm={handleConfirmRun}
        onReject={handleRejectRun}
      />
    </div>
  );
}