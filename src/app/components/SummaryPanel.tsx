"use client"

import { useState } from 'react';
import { EventLogEntry } from '@/lib/schemas/agents';
import { useSummarizeAgent } from '@/lib/hooks';

interface SummaryPanelProps {
  agentId: string;
  llmSummary?: string;
  eventLog?: EventLogEntry[];
  transcript?: string;
  className?: string;
  onSummaryUpdate?: (newSummary: string) => void;
}

/**
 * SummaryPanel component displays AI-generated summary with toggle for Raw Events vs Summary
 * Includes a button to re-run summarization with custom context
 */
export default function SummaryPanel({ 
  agentId: _agentId, 
  llmSummary, 
  eventLog = [], 
  transcript, 
  className = "",
  onSummaryUpdate 
}: SummaryPanelProps) {
  const [viewMode, setViewMode] = useState<'summary' | 'raw'>('summary');
  const [customContext, setCustomContext] = useState('');
  const [isRerunning, setIsRerunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { trigger: summarizeAgent } = useSummarizeAgent(_agentId);

  const handleRerunSummarization = async () => {
    if (!eventLog.length) {
      setError('No event log available for summarization');
      return;
    }

    try {
      setIsRerunning(true);
      setError(null);

      // Prepare event log with custom context if provided
      const eventLogWithContext = customContext.trim() 
        ? [...eventLog, {
            step: eventLog.length + 1,
            action: 'type' as const,
            target: 'user_context',
            value: customContext,
            timestamp: Date.now(),
            elementType: 'context',
            elementText: 'User-provided context'
          }]
        : eventLog;

      const result = await summarizeAgent({
        eventLog: eventLogWithContext,
        transcript: transcript || ''
      });

      if (onSummaryUpdate) {
        onSummaryUpdate((result as { agent: { llmSummary: string } }).agent.llmSummary);
      }
      
      // Clear custom context after successful rerun
      setCustomContext('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rerun summarization');
    } finally {
      setIsRerunning(false);
    }
  };

  // Helper function to format event log entry for display
  const formatEventLogEntry = (entry: EventLogEntry, index: number): string => {
    let formatted = `${index + 1}. ${entry.action}`;
    
    if (entry.url && entry.url.trim()) {
      formatted += ` on ${entry.url}`;
    }
    
    if (entry.target && entry.target.trim()) {
      formatted += ` targeting "${entry.target}"`;
    }
    
    if (entry.value && entry.value.trim()) {
      formatted += ` with value "${entry.value}"`;
    }
    
    if (entry.elementType) {
      formatted += ` (${entry.elementType})`;
    }
    
    if (entry.elementText && entry.elementText.trim()) {
      formatted += ` - "${entry.elementText}"`;
    }
    
    return formatted;
  };

  // Helper function to extract tool names from URLs
  const extractToolName = (url: string): string => {
    if (url.includes('docs.google.com')) return 'Google Docs';
    if (url.includes('slides.google.com')) return 'Google Slides';
    if (url.includes('sheets.google.com')) return 'Google Sheets';
    if (url.includes('canva.com')) return 'Canva';
    if (url.includes('figma.com')) return 'Figma';
    if (url.includes('notion.so')) return 'Notion';
    if (url.includes('airtable.com')) return 'Airtable';
    if (url.includes('trello.com')) return 'Trello';
    if (url.includes('asana.com')) return 'Asana';
    if (url.includes('slack.com')) return 'Slack';
    if (url.includes('teams.microsoft.com')) return 'Microsoft Teams';
    if (url.includes('zoom.us')) return 'Zoom';
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <div className={className} style={{
      backgroundColor: "#f8f9fa",
      borderRadius: "8px",
      border: "1px solid #e9ecef",
      padding: "20px"
    }}>
      {/* Header with toggle */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "20px"
      }}>
        <h4 style={{
          fontSize: "14px",
          fontWeight: "600",
          margin: 0,
          color: "#495057",
          display: "flex",
          alignItems: "center",
          gap: "6px"
        }}>
          📋 AI Summary
        </h4>
        
        <div style={{
          display: "flex",
          gap: "8px",
          alignItems: "center"
        }}>
          {/* View mode toggle */}
          <div style={{
            display: "flex",
            backgroundColor: "#fff",
            borderRadius: "6px",
            border: "1px solid #e9ecef",
            overflow: "hidden"
          }}>
            <button
              onClick={() => setViewMode('summary')}
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: "500",
                border: "none",
                backgroundColor: viewMode === 'summary' ? "#007bff" : "transparent",
                color: viewMode === 'summary' ? "#fff" : "#6c757d",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              Summary
            </button>
            <button
              onClick={() => setViewMode('raw')}
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: "500",
                border: "none",
                backgroundColor: viewMode === 'raw' ? "#007bff" : "transparent",
                color: viewMode === 'raw' ? "#fff" : "#6c757d",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              Raw Events
            </button>
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'summary' ? (
        <div>
          {llmSummary ? (
            <div style={{
              backgroundColor: "#fff",
              borderRadius: "6px",
              border: "1px solid #e9ecef",
              padding: "16px",
              marginBottom: "16px"
            }}>
              <div style={{
                fontSize: "14px",
                lineHeight: "1.6",
                color: "#495057",
                whiteSpace: "pre-wrap"
              }}>
                {llmSummary}
              </div>
            </div>
          ) : (
            <div style={{
              backgroundColor: "#fff3cd",
              color: "#856404",
              padding: "12px 16px",
              borderRadius: "6px",
              border: "1px solid #ffeaa7",
              marginBottom: "16px",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <span>⚠️</span>
              <span>No AI summary available yet</span>
            </div>
          )}

          {/* Rerun summarization section */}
          <div style={{
            backgroundColor: "#fff",
            borderRadius: "6px",
            border: "1px solid #e9ecef",
            padding: "16px"
          }}>
            <h5 style={{
              fontSize: "13px",
              fontWeight: "600",
              margin: "0 0 12px 0",
              color: "#495057"
            }}>
              🔄 Re-run Summarization
            </h5>
            
            <div style={{ marginBottom: "12px" }}>
              <label style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "500",
                color: "#495057",
                marginBottom: "6px"
              }}>
                Additional Context (optional):
              </label>
              <textarea
                value={customContext}
                onChange={(e) => setCustomContext(e.target.value)}
                placeholder="Provide additional context to help the AI generate a better summary..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ced4da",
                  borderRadius: "4px",
                  fontSize: "12px",
                  resize: "vertical",
                  fontFamily: "inherit"
                }}
              />
            </div>

            {error && (
              <div style={{
                backgroundColor: "#f8d7da",
                color: "#721c24",
                padding: "8px 12px",
                borderRadius: "4px",
                border: "1px solid #f5c6cb",
                marginBottom: "12px",
                fontSize: "12px"
              }}>
                {error}
              </div>
            )}

            <button
              onClick={handleRerunSummarization}
              disabled={isRerunning || !eventLog.length}
              style={{
                background: isRerunning || !eventLog.length ? "#6c757d" : "#007bff",
                color: "#fff",
                padding: "8px 16px",
                border: "none",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: "500",
                cursor: isRerunning || !eventLog.length ? "not-allowed" : "pointer",
                transition: "background-color 0.2s ease",
                opacity: isRerunning || !eventLog.length ? 0.6 : 1
              }}
            >
              {isRerunning ? "🔄 Processing..." : "🔄 Re-run Summarization"}
            </button>
          </div>
        </div>
      ) : (
        <div>
          {eventLog.length > 0 ? (
            <div style={{
              backgroundColor: "#fff",
              borderRadius: "6px",
              border: "1px solid #e9ecef",
              padding: "16px"
            }}>
              <div style={{ margin: 0 }}>
                {eventLog
                  .sort((a, b) => a.step - b.step)
                  .map((entry, index) => (
                    <div key={entry.step} style={{
                      fontSize: "13px",
                      lineHeight: "1.5",
                      margin: "0 0 8px 0",
                      color: "#495057",
                      padding: "8px 12px",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "4px",
                      border: "1px solid #e9ecef"
                    }}>
                      {formatEventLogEntry(entry, index)}
                      {entry.url && (
                        <div style={{
                          fontSize: "11px",
                          color: "#6c757d",
                          marginTop: "4px",
                          fontStyle: "italic"
                        }}>
                          Tool: <strong>{extractToolName(entry.url)}</strong>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div style={{
              backgroundColor: "#fff",
              borderRadius: "6px",
              border: "1px solid #e9ecef",
              padding: "20px",
              textAlign: "center",
              color: "#6c757d"
            }}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>📋</div>
              <p style={{ margin: 0, fontSize: "14px" }}>
                No raw events available
              </p>
            </div>
          )}

          {/* Transcript section */}
          {transcript && (
            <div style={{
              backgroundColor: "#fff",
              borderRadius: "6px",
              border: "1px solid #e9ecef",
              padding: "16px",
              marginTop: "16px"
            }}>
              <h5 style={{
                fontSize: "13px",
                fontWeight: "600",
                margin: "0 0 12px 0",
                color: "#495057",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}>
                🎤 Voice Transcript
              </h5>
              <details>
                <summary style={{
                  fontSize: "12px",
                  color: "#007bff",
                  cursor: "pointer",
                  marginBottom: "12px"
                }}>
                  Click to view transcript
                </summary>
                <div style={{
                  fontSize: "13px",
                  lineHeight: "1.6",
                  color: "#495057",
                  backgroundColor: "#f8f9fa",
                  padding: "12px",
                  borderRadius: "4px",
                  border: "1px solid #e9ecef",
                  whiteSpace: "pre-wrap"
                }}>
                  {transcript}
                </div>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
