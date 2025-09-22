"use client"

import { EventLogEntry } from '@/lib/schemas/agents';

interface EventTimelineProps {
  events: EventLogEntry[];
  className?: string;
}

/**
 * EventTimeline component displays an ordered list of events
 * Shows step, action, target, url, and elementText for each event
 */
export default function EventTimeline({ events, className = "" }: EventTimelineProps) {
  // Sort events by step number to ensure proper order
  const sortedEvents = [...events].sort((a, b) => a.step - b.step);


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

  // Helper function to get action icon
  const getActionIcon = (action: string): string => {
    switch (action) {
      case 'navigate': return '🌐';
      case 'click': return '👆';
      case 'type': return '⌨️';
      case 'wait': return '⏳';
      case 'scroll': return '📜';
      case 'hover': return '🖱️';
      case 'select': return '📋';
      default: return '🔧';
    }
  };

  if (sortedEvents.length === 0) {
    return (
      <div className={className} style={{
        backgroundColor: "#f8f9fa",
        borderRadius: "8px",
        border: "1px solid #e9ecef",
        padding: "20px",
        textAlign: "center",
        color: "#6c757d"
      }}>
        <div style={{ fontSize: "24px", marginBottom: "8px" }}>📋</div>
        <p style={{ margin: 0, fontSize: "14px" }}>
          No events recorded yet
        </p>
      </div>
    );
  }

  return (
    <div className={className} style={{
      backgroundColor: "#f8f9fa",
      borderRadius: "8px",
      border: "1px solid #e9ecef",
      padding: "20px"
    }}>
      <h4 style={{
        fontSize: "14px",
        fontWeight: "600",
        margin: "0 0 16px 0",
        color: "#495057",
        display: "flex",
        alignItems: "center",
        gap: "6px"
      }}>
        🛠️ Step-by-Step Actions ({sortedEvents.length} steps)
      </h4>
      
      <div style={{ margin: 0 }}>
        {sortedEvents.map((entry) => (
          <div key={entry.step} style={{
            fontSize: "14px",
            lineHeight: "1.6",
            margin: "0 0 12px 0",
            color: "#495057",
            padding: "12px 16px",
            backgroundColor: "#fff",
            borderRadius: "6px",
            border: "1px solid #e9ecef",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px"
          }}>
            {/* Step number and action icon */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              minWidth: "60px",
              flexShrink: 0
            }}>
              <span style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "#007bff",
                backgroundColor: "#e3f2fd",
                padding: "2px 6px",
                borderRadius: "4px"
              }}>
                {entry.step}
              </span>
              <span style={{ fontSize: "16px" }}>
                {getActionIcon(entry.action)}
              </span>
            </div>
            
            {/* Event details */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#495057",
                marginBottom: "4px"
              }}>
                {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}
                {entry.elementType && (
                  <span style={{
                    fontSize: "12px",
                    color: "#6c757d",
                    marginLeft: "8px"
                  }}>
                    ({entry.elementType})
                  </span>
                )}
              </div>
              
              {entry.target && (
                <div style={{
                  fontSize: "13px",
                  color: "#6c757d",
                  marginBottom: "2px",
                  fontFamily: "monospace",
                  backgroundColor: "#f8f9fa",
                  padding: "2px 6px",
                  borderRadius: "3px",
                  display: "inline-block"
                }}>
                  {entry.target}
                </div>
              )}
              
              {entry.elementText && (
                <div style={{
                  fontSize: "13px",
                  color: "#495057",
                  marginBottom: "2px",
                  fontStyle: "italic"
                }}>
                  &quot;{entry.elementText}&quot;
                </div>
              )}
              
              {entry.value && (
                <div style={{
                  fontSize: "13px",
                  color: "#28a745",
                  marginBottom: "2px",
                  fontWeight: "500"
                }}>
                  Value: &quot;{entry.value}&quot;
                </div>
              )}
              
              {entry.url && (
                <div style={{
                  fontSize: "12px",
                  color: "#6c757d",
                  marginTop: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}>
                  <span>🌐</span>
                  <span style={{ fontStyle: "italic" }}>
                    Tool: <strong>{extractToolName(entry.url)}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
