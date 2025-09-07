"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

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
        // Redirect to dashboard
        window.location.href = "/";
      }
    } catch (error) {
      setMessage("❌ Error: Login failed");
    }
    setLoading(false);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "#f5f5f5",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "40px",
          borderRadius: "10px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          width: "400px",
          maxWidth: "90vw",
        }}
      >
        <img
          src="/logo.jpg"
          alt="App Logo"
          style={{ width: "120px", marginBottom: "30px", display: "block", margin: "0 auto 30px auto" }}
        />

        {/* Toggle Buttons */}
        <div style={{ display: "flex", marginBottom: "30px" }}>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: !isLogin ? "#007bff" : "#f8f9fa",
              color: !isLogin ? "white" : "#333",
              border: "none",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "bold",
            }}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: isLogin ? "#007bff" : "#f8f9fa",
              color: isLogin ? "white" : "#333",
              border: "none",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "bold",
            }}
          >
            Sign In
          </button>
        </div>

        <form
          onSubmit={isLogin ? handleLogin : handleRegister}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "15px",
          }}
        >
          {!isLogin && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ 
                padding: "12px", 
                fontSize: "16px", 
                border: "1px solid #ddd",
                borderRadius: "5px",
                outline: "none"
              }}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ 
              padding: "12px", 
              fontSize: "16px", 
              border: "1px solid #ddd",
              borderRadius: "5px",
              outline: "none"
            }}
          />
          <input
            type="password"
            placeholder={isLogin ? "Password" : "Password (min 6 characters)"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ 
              padding: "12px", 
              fontSize: "16px", 
              border: "1px solid #ddd",
              borderRadius: "5px",
              outline: "none"
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px",
              fontSize: "16px",
              backgroundColor: loading ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              borderRadius: "5px",
              fontWeight: "bold",
            }}
          >
            {loading ? "Loading..." : (isLogin ? "Sign In" : "Sign Up")}
          </button>
        </form>

        {message && (
          <p style={{ 
            marginTop: "20px", 
            textAlign: "center",
            color: message.includes("✅") ? "#28a745" : "#dc3545",
            fontWeight: "bold"
          }}>
            {message}
          </p>
        )}

        {/* Quick Test Credentials */}
        <div style={{ 
          marginTop: "30px", 
          padding: "15px", 
          backgroundColor: "#f8f9fa", 
          borderRadius: "5px",
          fontSize: "14px"
        }}>
          <p style={{ margin: "0 0 10px 0", fontWeight: "bold" }}>Test Credentials:</p>
          <p style={{ margin: "0 0 5px 0" }}>Email: test@example.com</p>
          <p style={{ margin: "0" }}>Password: secret123</p>
        </div>
      </div>
    </div>
  );
}
