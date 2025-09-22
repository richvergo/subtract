"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });

    if (res.ok) {
      setMessage("✅ Account created! You can now log in.");
      setEmail("");
      setPassword("");
      setName("");
    } else {
      const data = await res.json();
      setMessage("❌ Error: " + (data.error || "Something went wrong"));
    }
    setLoading(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setMessage("❌ Error: Invalid email or password");
      } else {
        setMessage("✅ Login successful! Redirecting...");
        // Redirect to tasks
        window.location.href = "/tasks";
      }
    } catch {
      setMessage("❌ Error: Login failed");
    }
    setLoading(false);
  }

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      backgroundColor: "#f9f9f9",
      padding: "16px"
    }}>
      <div style={{
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        width: "100%",
        maxWidth: "400px",
        padding: "32px"
      }}>
        {/* Logo and Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "64px",
            height: "64px",
            background: "black",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px auto"
          }}>
            <Image
              src="/logo.jpg"
              alt="App Logo"
              width={48}
              height={48}
              style={{ borderRadius: "8px" }}
            />
          </div>
          <h1 style={{ 
            fontSize: "24px", 
            fontWeight: "700", 
            margin: "0 0 8px 0",
            color: "#333"
          }}>
            Welcome to vergo
          </h1>
          <p style={{ 
            color: "#666", 
            margin: 0,
            fontSize: "14px"
          }}>
            Sign in to your account or create a new one
          </p>
        </div>

        {/* Simple Test Buttons */}
        <div style={{
          marginBottom: "24px",
          display: "flex",
          gap: "10px"
        }}>
          <button
            onClick={() => {
              alert('Sign Up clicked!');
              setIsLogin(false);
            }}
            style={{
              padding: "10px 20px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Sign Up
          </button>
          <button
            onClick={() => {
              alert('Sign In clicked!');
              setIsLogin(true);
            }}
            style={{
              padding: "10px 20px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Sign In
          </button>
        </div>

        {/* Debug Info */}
        <div style={{
          marginBottom: "16px",
          padding: "8px",
          backgroundColor: "#f8f9fa",
          borderRadius: "4px",
          fontSize: "12px",
          color: "#666"
        }}>
          Debug: isLogin = {isLogin.toString()}
        </div>

        {/* Forms */}
        {!isLogin ? (
          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ 
                display: "block", 
                marginBottom: "6px", 
                fontWeight: "500", 
                fontSize: "14px",
                color: "#333"
              }}>
                Name
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s ease"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#007bff"
                  e.target.style.boxShadow = "0 0 0 3px rgba(0, 123, 255, 0.1)"
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#ddd"
                  e.target.style.boxShadow = "none"
                }}
              />
            </div>
            <div>
              <label style={{ 
                display: "block", 
                marginBottom: "6px", 
                fontWeight: "500", 
                fontSize: "14px",
                color: "#333"
              }}>
                Email
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s ease"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#007bff"
                  e.target.style.boxShadow = "0 0 0 3px rgba(0, 123, 255, 0.1)"
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#ddd"
                  e.target.style.boxShadow = "none"
                }}
              />
            </div>
            <div>
              <label style={{ 
                display: "block", 
                marginBottom: "6px", 
                fontWeight: "500", 
                fontSize: "14px",
                color: "#333"
              }}>
                Password
              </label>
              <input
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s ease"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#007bff"
                  e.target.style.boxShadow = "0 0 0 3px rgba(0, 123, 255, 0.1)"
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#ddd"
                  e.target.style.boxShadow = "none"
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "12px",
                fontSize: "14px",
                fontWeight: "500",
                backgroundColor: loading ? "#ccc" : "#007bff",
                color: "white",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                borderRadius: "6px",
                transition: "background-color 0.2s ease"
              }}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ 
                display: "block", 
                marginBottom: "6px", 
                fontWeight: "500", 
                fontSize: "14px",
                color: "#333"
              }}>
                Email
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s ease"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#007bff"
                  e.target.style.boxShadow = "0 0 0 3px rgba(0, 123, 255, 0.1)"
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#ddd"
                  e.target.style.boxShadow = "none"
                }}
              />
            </div>
            <div>
              <label style={{ 
                display: "block", 
                marginBottom: "6px", 
                fontWeight: "500", 
                fontSize: "14px",
                color: "#333"
              }}>
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s ease"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#007bff"
                  e.target.style.boxShadow = "0 0 0 3px rgba(0, 123, 255, 0.1)"
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#ddd"
                  e.target.style.boxShadow = "none"
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "12px",
                fontSize: "14px",
                fontWeight: "500",
                backgroundColor: loading ? "#ccc" : "#007bff",
                color: "white",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                borderRadius: "6px",
                transition: "background-color 0.2s ease"
              }}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>
        )}

        {/* Message */}
        {message && (
          <div style={{
            marginTop: "20px",
            padding: "12px",
            borderRadius: "6px",
            backgroundColor: message.includes("✅") ? "#d4edda" : "#f8d7da",
            border: `1px solid ${message.includes("✅") ? "#c3e6cb" : "#f5c6cb"}`,
            color: message.includes("✅") ? "#155724" : "#721c24",
            fontSize: "14px",
            fontWeight: "500"
          }}>
            {message}
          </div>
        )}

        {/* Test Credentials */}
        <div style={{
          marginTop: "24px",
          padding: "16px",
          backgroundColor: "#f8f9fa",
          borderRadius: "6px",
          fontSize: "14px"
        }}>
          <h4 style={{ 
            fontWeight: "500", 
            margin: "0 0 8px 0",
            color: "#333"
          }}>
            Test Credentials:
          </h4>
          <div style={{ color: "#666" }}>
            <p style={{ margin: "0 0 4px 0" }}>
              <strong>Email:</strong> alice@example.com
            </p>
            <p style={{ margin: 0 }}>
              <strong>Password:</strong> password123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}