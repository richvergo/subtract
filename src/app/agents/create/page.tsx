"use client"

import { useState } from "react"
import Link from "next/link"

export default function CreateAgentPage() {
  const [name, setName] = useState("")
  const [purposePrompt, setPurposePrompt] = useState("")

  const isValid = name.trim() !== "" && purposePrompt.trim() !== ""

  const handleSave = () => {
    console.log("Creating agent with data:", { name, purposePrompt })
    // TODO: Implement actual API call when backend integration is ready
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
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
          margin: 0,
          color: "#333"
        }}>
          Create Agent
        </h1>
        <p style={{ 
          color: "#666", 
          fontSize: "16px",
          margin: "8px 0 0 0"
        }}>
          Create a new automation agent by providing a name and purpose description.
        </p>
      </div>

      <div style={{
        backgroundColor: "#fff",
        borderRadius: "8px",
        border: "1px solid #dee2e6",
        padding: "32px"
      }}>
        <form style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            <label style={{ 
              display: "block", 
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#495057"
            }}>
              Agent Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a descriptive name for your agent"
              style={{ 
                width: "100%", 
                padding: "12px 16px", 
                border: "1px solid #ced4da", 
                borderRadius: "6px",
                fontSize: "14px",
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
            <p style={{
              fontSize: "12px",
              color: "#6c757d",
              margin: "4px 0 0 0"
            }}>
              Choose a clear, descriptive name that explains what this agent does.
            </p>
          </div>

          <div>
            <label style={{ 
              display: "block", 
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#495057"
            }}>
              Purpose Prompt *
            </label>
            <textarea
              value={purposePrompt}
              onChange={(e) => setPurposePrompt(e.target.value)}
              rows={6}
              placeholder="Describe what this agent should accomplish. Be specific about the tasks, websites, and actions it should perform..."
              style={{ 
                width: "100%", 
                padding: "12px 16px", 
                border: "1px solid #ced4da", 
                borderRadius: "6px",
                fontSize: "14px",
                resize: "vertical",
                minHeight: "120px",
                fontFamily: "inherit",
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
            <p style={{
              fontSize: "12px",
              color: "#6c757d",
              margin: "4px 0 0 0"
            }}>
              Provide a detailed description of what this agent should do. The more specific you are, the better the agent will perform.
            </p>
          </div>

          <div style={{
            display: "flex",
            gap: "12px",
            paddingTop: "8px",
            borderTop: "1px solid #f1f3f4"
          }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isValid}
              style={{
                background: isValid ? "#007bff" : "#6c757d",
                color: "#fff",
                padding: "12px 24px",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: isValid ? "pointer" : "not-allowed",
                transition: "background-color 0.2s ease, transform 0.1s ease",
                opacity: isValid ? 1 : 0.6
              }}
              onMouseEnter={(e) => {
                if (isValid) {
                  e.currentTarget.style.backgroundColor = "#0056b3"
                  e.currentTarget.style.transform = "translateY(-1px)"
                }
              }}
              onMouseLeave={(e) => {
                if (isValid) {
                  e.currentTarget.style.backgroundColor = "#007bff"
                  e.currentTarget.style.transform = "translateY(0)"
                }
              }}
            >
              Create Agent
            </button>
            
            <Link href="/agents">
              <button
                type="button"
                style={{
                  background: "transparent",
                  color: "#6c757d",
                  padding: "12px 24px",
                  border: "1px solid #dee2e6",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f8f9fa"
                  e.currentTarget.style.borderColor = "#adb5bd"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent"
                  e.currentTarget.style.borderColor = "#dee2e6"
                }}
              >
                Cancel
              </button>
            </Link>
          </div>
        </form>
      </div>

      <div style={{
        backgroundColor: "#f8f9fa",
        padding: "20px",
        borderRadius: "8px",
        border: "1px solid #dee2e6",
        marginTop: "24px"
      }}>
        <h3 style={{ 
          fontSize: "16px", 
          fontWeight: "600", 
          margin: "0 0 12px 0",
          color: "#495057"
        }}>
          💡 Tips for creating effective agents:
        </h3>
        <ul style={{ 
          margin: 0, 
          paddingLeft: "20px",
          color: "#6c757d",
          fontSize: "14px",
          lineHeight: "1.5"
        }}>
          <li style={{ marginBottom: "6px" }}>Be specific about the websites and actions the agent should perform</li>
          <li style={{ marginBottom: "6px" }}>Include any special requirements or conditions</li>
          <li style={{ marginBottom: "6px" }}>Mention the expected outcome or result</li>
          <li style={{ marginBottom: "6px" }}>Consider edge cases or error handling needs</li>
        </ul>
      </div>
    </div>
  )
}
