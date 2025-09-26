'use client';

import Link from "next/link"
import { usePathname } from "next/navigation"

export function Sidebar() {
  const pathname = usePathname()

  const navigation = [
    {
      name: 'Workflows',
      href: '/workflows',
    },
  ]

  return (
    <aside style={{
      position: "fixed",
      left: 0,
      top: 0,
      width: "240px",
      height: "100vh",
      background: "#222",
      color: "white",
      zIndex: 1000,
      overflowY: "auto"
    }}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Logo Section */}
        <div style={{ padding: "24px", borderBottom: "1px solid #444" }}>
          <Link href="/workflows" style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "12px",
            textDecoration: "none",
            color: "white"
          }}>
            <div style={{
              width: "32px",
              height: "32px",
              background: "black",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px"
            }}>
              🤖
            </div>
            <span style={{ fontSize: "20px", fontWeight: "600" }}>vergo</span>
          </Link>
        </div>

        {/* Navigation Section */}
        <nav style={{ 
          flex: 1, 
          padding: "24px 16px", 
          display: "flex",
          flexDirection: "column",
          gap: "4px"
        }}>
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  textDecoration: "none",
                  color: isActive ? "#222" : "#ccc",
                  backgroundColor: isActive ? "#fff" : "transparent",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "#444"
                    e.currentTarget.style.color = "white"
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "transparent"
                    e.currentTarget.style.color = "#ccc"
                  }
                }}
              >
                <span style={{ fontSize: "16px" }}>
                  {item.name === 'Tasks' ? '📋' : 
                   item.name === 'Workflows' ? '🔄' : 
                   item.name === 'Logins' ? '🔑' : '•'}
                </span>
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

      </div>
    </aside>
  )
}