"use client"

import { useState } from 'react';
import Image from 'next/image';
import { EventLogEntry } from '@/lib/schemas/agents';

interface ScreenshotGalleryProps {
  events: EventLogEntry[];
  className?: string;
}

/**
 * ScreenshotGallery component shows thumbnail previews with modal for full-size images
 * Displays screenshots next to related events
 */
export default function ScreenshotGallery({ events, className = "" }: ScreenshotGalleryProps) {
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventLogEntry | null>(null);

  // Filter events that have screenshots
  const eventsWithScreenshots = events.filter(event => 
    event.screenshot || event.screenshotUrl
  );

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

  // Helper function to format timestamp
  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const openModal = (event: EventLogEntry) => {
    const screenshotUrl = event.screenshotUrl || event.screenshot;
    if (screenshotUrl) {
      setSelectedScreenshot(screenshotUrl);
      setSelectedEvent(event);
    }
  };

  const closeModal = () => {
    setSelectedScreenshot(null);
    setSelectedEvent(null);
  };

  if (eventsWithScreenshots.length === 0) {
    return (
      <div className={className} style={{
        backgroundColor: "#f8f9fa",
        borderRadius: "8px",
        border: "1px solid #e9ecef",
        padding: "20px",
        textAlign: "center",
        color: "#6c757d"
      }}>
        <div style={{ fontSize: "24px", marginBottom: "8px" }}>📸</div>
        <p style={{ margin: 0, fontSize: "14px" }}>
          No screenshots available
        </p>
      </div>
    );
  }

  return (
    <>
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
          📸 Screenshots ({eventsWithScreenshots.length} captured)
        </h4>
        
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "16px"
        }}>
          {eventsWithScreenshots.map((event, index) => {
            const screenshotUrl = event.screenshotUrl || event.screenshot;
            if (!screenshotUrl) return null;

            return (
              <div
                key={`${event.step}-${index}`}
                onClick={() => openModal(event)}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "6px",
                  border: "1px solid #e9ecef",
                  padding: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                }}
              >
                {/* Thumbnail */}
                <div style={{
                  width: "100%",
                  height: "120px",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "4px",
                  marginBottom: "8px",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #e9ecef"
                }}>
                  <Image
                    src={screenshotUrl}
                    alt={`Screenshot for step ${event.step}`}
                    width={200}
                    height={150}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "4px"
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div style="color: #6c757d; font-size: 12px; text-align: center;">
                            <div style="font-size: 24px; margin-bottom: 4px;">📷</div>
                            Image unavailable
                          </div>
                        `;
                      }
                    }}
                  />
                </div>
                
                {/* Event info */}
                <div style={{ fontSize: "12px" }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    marginBottom: "4px",
                    fontWeight: "600",
                    color: "#495057"
                  }}>
                    <span>{getActionIcon(event.action)}</span>
                    <span>Step {event.step}</span>
                  </div>
                  
                  <div style={{
                    color: "#6c757d",
                    marginBottom: "2px",
                    textTransform: "capitalize"
                  }}>
                    {event.action}
                  </div>
                  
                  {event.elementText && (
                    <div style={{
                      color: "#495057",
                      fontSize: "11px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}>
                      &quot;{event.elementText}&quot;
                    </div>
                  )}
                  
                  <div style={{
                    color: "#6c757d",
                    fontSize: "10px",
                    marginTop: "4px"
                  }}>
                    {formatTimestamp(event.timestamp)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal for full-size screenshots */}
      {selectedScreenshot && selectedEvent && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px"
          }}
          onClick={closeModal}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "8px",
              maxWidth: "90vw",
              maxHeight: "90vh",
              overflow: "hidden",
              position: "relative"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid #e9ecef",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div>
                <h3 style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  margin: "0 0 4px 0",
                  color: "#495057"
                }}>
                  Step {selectedEvent.step}: {selectedEvent.action.charAt(0).toUpperCase() + selectedEvent.action.slice(1)}
                </h3>
                {selectedEvent.elementText && (
                  <p style={{
                    fontSize: "14px",
                    color: "#6c757d",
                    margin: 0
                  }}>
                    &quot;{selectedEvent.elementText}&quot;
                  </p>
                )}
              </div>
              <button
                onClick={closeModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#6c757d",
                  padding: "4px",
                  borderRadius: "4px",
                  transition: "background-color 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f8f9fa";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                ×
              </button>
            </div>
            
            {/* Image */}
            <div style={{
              padding: "20px",
              textAlign: "center"
            }}>
              <Image
                src={selectedScreenshot}
                width={800}
                height={600}
                alt={`Screenshot for step ${selectedEvent.step}`}
                style={{
                  maxWidth: "100%",
                  maxHeight: "60vh",
                  borderRadius: "4px",
                  boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div style="color: #6c757d; font-size: 16px; padding: 40px;">
                        <div style="font-size: 48px; margin-bottom: 16px;">📷</div>
                        <div>Image could not be loaded</div>
                      </div>
                    `;
                  }
                }}
              />
            </div>
            
            {/* Footer with event details */}
            <div style={{
              padding: "16px 20px",
              borderTop: "1px solid #e9ecef",
              backgroundColor: "#f8f9fa"
            }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "12px",
                fontSize: "12px"
              }}>
                {selectedEvent.target && (
                  <div>
                    <strong>Target:</strong>
                    <div style={{
                      fontFamily: "monospace",
                      backgroundColor: "#fff",
                      padding: "4px 8px",
                      borderRadius: "3px",
                      marginTop: "2px",
                      border: "1px solid #e9ecef"
                    }}>
                      {selectedEvent.target}
                    </div>
                  </div>
                )}
                
                {selectedEvent.url && (
                  <div>
                    <strong>URL:</strong>
                    <div style={{
                      color: "#007bff",
                      marginTop: "2px",
                      wordBreak: "break-all"
                    }}>
                      {selectedEvent.url}
                    </div>
                  </div>
                )}
                
                {selectedEvent.value && (
                  <div>
                    <strong>Value:</strong>
                    <div style={{
                      backgroundColor: "#fff",
                      padding: "4px 8px",
                      borderRadius: "3px",
                      marginTop: "2px",
                      border: "1px solid #e9ecef"
                    }}>
                      {selectedEvent.value}
                    </div>
                  </div>
                )}
                
                <div>
                  <strong>Timestamp:</strong>
                  <div style={{ marginTop: "2px" }}>
                    {formatTimestamp(selectedEvent.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
