"use client"

import Link from "next/link"

export default function HomePage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ 
          fontSize: "36px", 
          fontWeight: "700", 
          marginBottom: "16px",
          color: "#333"
        }}>
          Welcome to vergo
        </h1>
        <p style={{ 
          fontSize: "20px", 
          color: "#666", 
          marginBottom: "32px" 
        }}>
          Your automation platform for managing agents and login credentials.
        </p>
        <div style={{ marginBottom: "32px" }}>
          <Link href="/register">
            <button className="button" style={{ 
              padding: "16px 32px", 
              fontSize: "16px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px"
            }}>
              Get Started - Sign Up / Login
            </button>
          </Link>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
        gap: "16px", 
        maxWidth: "1200px", 
        margin: "0 auto 32px auto" 
      }}>
        <div className="card">
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{
              width: "32px",
              height: "32px",
              backgroundColor: "#007bff",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              marginRight: "16px"
            }}>
              🤖
            </div>
            <div>
              <p style={{ 
                fontSize: "14px", 
                fontWeight: "500", 
                color: "#666",
                margin: "0 0 4px 0" 
              }}>
                Total Agents
              </p>
              <p style={{ 
                fontSize: "24px", 
                fontWeight: "700", 
                margin: 0,
                color: "#333"
              }}>
                -
              </p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{
              width: "32px",
              height: "32px",
              backgroundColor: "#28a745",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              marginRight: "16px"
            }}>
              ⚡
            </div>
            <div>
              <p style={{ 
                fontSize: "14px", 
                fontWeight: "500", 
                color: "#666",
                margin: "0 0 4px 0" 
              }}>
                Live Agents
              </p>
              <p style={{ 
                fontSize: "24px", 
                fontWeight: "700", 
                margin: 0,
                color: "#333"
              }}>
                -
              </p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{
              width: "32px",
              height: "32px",
              backgroundColor: "#6f42c1",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              marginRight: "16px"
            }}>
              🔑
            </div>
            <div>
              <p style={{ 
                fontSize: "14px", 
                fontWeight: "500", 
                color: "#666",
                margin: "0 0 4px 0" 
              }}>
                Logins
              </p>
              <p style={{ 
                fontSize: "24px", 
                fontWeight: "700", 
                margin: 0,
                color: "#333"
              }}>
                -
              </p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{
              width: "32px",
              height: "32px",
              backgroundColor: "#fd7e14",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              marginRight: "16px"
            }}>
              👥
            </div>
            <div>
              <p style={{ 
                fontSize: "14px", 
                fontWeight: "500", 
                color: "#666",
                margin: "0 0 4px 0" 
              }}>
                Team Members
              </p>
              <p style={{ 
                fontSize: "24px", 
                fontWeight: "700", 
                margin: 0,
                color: "#333"
              }}>
                -
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", 
        gap: "24px", 
        maxWidth: "800px", 
        margin: "0 auto" 
      }}>
        <div className="card" style={{
          transition: "box-shadow 0.2s ease",
          cursor: "pointer"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
        }}>
          <div style={{ 
            paddingBottom: "16px", 
            borderBottom: "1px solid #eee", 
            marginBottom: "16px" 
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "32px",
                height: "32px",
                backgroundColor: "#007bff",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px"
              }}>
                🤖
              </div>
              <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0 }}>Agents</h2>
            </div>
          </div>
          <div>
            <p style={{ 
              color: "#666", 
              marginBottom: "16px",
              lineHeight: "1.5"
            }}>
              Create and manage your automation agents to handle repetitive tasks.
            </p>
            <Link href="/agents">
              <button className="button" style={{ 
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}>
                Manage Agents
                <span>→</span>
              </button>
            </Link>
          </div>
        </div>

        <div className="card" style={{
          transition: "box-shadow 0.2s ease",
          cursor: "pointer"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
        }}>
          <div style={{ 
            paddingBottom: "16px", 
            borderBottom: "1px solid #eee", 
            marginBottom: "16px" 
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "32px",
                height: "32px",
                backgroundColor: "#28a745",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px"
              }}>
                🔑
              </div>
              <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0 }}>Logins</h2>
            </div>
          </div>
          <div>
            <p style={{ 
              color: "#666", 
              marginBottom: "16px",
              lineHeight: "1.5"
            }}>
              Securely store and manage login credentials for your automation agents.
            </p>
            <Link href="/logins">
              <button className="button" style={{ 
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}>
                Manage Logins
                <span>→</span>
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}