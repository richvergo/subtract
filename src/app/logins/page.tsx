'use client';

import React, { useState } from 'react';
import useSWR from 'swr';

// Enhanced fetcher with proper error handling
async function fetcher(url: string) {
  const res = await fetch(url, {
    credentials: 'include', // Include session cookies
  })
  if (res.status === 401) throw new Error("Unauthorized - please login")
  if (res.status === 404) throw new Error("Not found")
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
  return res.json()
}

// Login interface matching API response structure
interface Login {
  id: string
  name: string
  loginUrl: string
  username: string
  password?: string
  oauthToken?: string
  status: 'UNKNOWN' | 'ACTIVE' | 'NEEDS_RECONNECT' | 'DISCONNECTED' | 'BROKEN' | 'EXPIRED' | 'SUSPENDED'
  lastCheckedAt?: string
  lastSuccessAt?: string
  lastFailureAt?: string
  failureCount: number
  errorMessage?: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

// API response structure
interface LoginsResponse {
  logins: Login[]
}

export default function LoginsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    loginUrl: '',
    username: '',
    password: ''
  });

  const { data, error, isLoading, mutate } = useSWR<LoginsResponse>(
    '/api/logins',
    fetcher
  );

  const logins = data?.logins || [];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'ACTIVE': { color: "#28a745", icon: "✅", text: "Active" },
      'NEEDS_RECONNECT': { color: "#ffc107", icon: "⚠️", text: "Needs Reconnect" },
      'DISCONNECTED': { color: "#6c757d", icon: "🔌", text: "Disconnected" },
      'BROKEN': { color: "#dc3545", icon: "❌", text: "Broken" },
      'EXPIRED': { color: "#fd7e14", icon: "⏰", text: "Expired" },
      'SUSPENDED': { color: "#6f42c1", icon: "🚫", text: "Suspended" },
      'UNKNOWN': { color: "#6c757d", icon: "❓", text: "Unknown" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['UNKNOWN'];

    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 8px",
        borderRadius: "4px",
        fontSize: "12px",
        fontWeight: "500",
        backgroundColor: config.color + "20",
        color: config.color,
        border: `1px solid ${config.color}40`
      }}>
        <span>{config.icon}</span>
        {config.text}
      </span>
    );
  };

  const handleCreateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name.trim() || !formData.loginUrl.trim() || !formData.username.trim() || !formData.password.trim()) {
      setModalError('All fields are required');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      const response = await fetch('/api/logins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name.trim(),
          loginUrl: formData.loginUrl.trim(),
          username: formData.username.trim(),
          password: formData.password,
          testOnCreate: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create login: ${response.status}`);
      }

      // Close modal, reset form, and refresh data
      setIsModalOpen(false);
      setFormData({ name: '', loginUrl: '', username: '', password: '' });
      mutate();
      
    } catch (error) {
      console.error('Error creating login:', error);
      setModalError(error instanceof Error ? error.message : 'Failed to create login');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLogin = async (loginId: string, loginName: string) => {
    if (!confirm(`Are you sure you want to delete the login "${loginName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/logins/${loginId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete login: ${response.status}`);
      }

      // Refresh data
      mutate();
      
    } catch (error) {
      console.error('Error deleting login:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete login');
    }
  };

  const openModal = () => {
    setIsModalOpen(true);
    setModalError(null);
    setFormData({ name: '', loginUrl: '', username: '', password: '' });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalError(null);
    setFormData({ name: '', loginUrl: '', username: '', password: '' });
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "24px"
      }}>
        <h1 style={{ 
          fontSize: "32px", 
          fontWeight: "700", 
          margin: 0,
          color: "#333"
        }}>
          🔑 Logins
        </h1>
        
        <button
          onClick={openModal}
          style={{
            background: "#007bff",
            color: "#fff",
            padding: "12px 20px",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            transition: "background-color 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#0056b3";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#007bff";
          }}
        >
          <span>➕</span>
          Add Login
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          backgroundColor: "#f8d7da",
          color: "#721c24",
          padding: "12px 16px",
          borderRadius: "6px",
          border: "1px solid #f5c6cb",
          marginBottom: "24px",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <span>⚠️</span>
          <span>{error.message}</span>
          <button
            onClick={() => mutate()}
            style={{
              background: "#dc3545",
              color: "#fff",
              border: "none",
              padding: "6px 12px",
              borderRadius: "4px",
              fontSize: "12px",
              cursor: "pointer",
              marginLeft: "auto"
            }}
          >
            🔄 Retry
          </button>
        </div>
      )}

      {/* Logins Table */}
      <div style={{
        backgroundColor: "#fff",
        borderRadius: "8px",
        border: "1px solid #dee2e6",
        padding: "24px",
        marginBottom: "24px"
      }}>
        {isLoading ? (
          <div style={{
            padding: "40px",
            textAlign: "center"
          }}>
            <div style={{ 
              fontSize: "24px", 
              marginBottom: "16px",
              color: "#6c757d"
            }}>
              ⏳
            </div>
            <p style={{ color: "#666", fontSize: "16px", margin: 0 }}>
              Loading logins...
            </p>
          </div>
        ) : logins.length === 0 ? (
          <div style={{
            padding: "40px",
            textAlign: "center",
            backgroundColor: "#f8f9fa",
            borderRadius: "6px",
            border: "1px solid #e9ecef"
          }}>
            <div style={{
              fontSize: "48px",
              marginBottom: "16px",
              color: "#6c757d"
            }}>
              🔑
            </div>
            <p style={{
              fontSize: "16px",
              color: "#6c757d",
              margin: "0 0 8px 0",
              fontWeight: "500"
            }}>
              No logins configured yet
            </p>
            <p style={{
              fontSize: "14px",
              color: "#6c757d",
              margin: 0
            }}>
              Add your first login to get started with automation.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px"
            }}>
              <thead>
                <tr style={{
                  borderBottom: "2px solid #dee2e6"
                }}>
                  <th style={{
                    textAlign: "left",
                    padding: "12px 8px",
                    fontWeight: "600",
                    color: "#495057",
                    fontSize: "14px"
                  }}>
                    Name
                  </th>
                  <th style={{
                    textAlign: "left",
                    padding: "12px 8px",
                    fontWeight: "600",
                    color: "#495057",
                    fontSize: "14px"
                  }}>
                    Login URL
                  </th>
                  <th style={{
                    textAlign: "left",
                    padding: "12px 8px",
                    fontWeight: "600",
                    color: "#495057",
                    fontSize: "14px"
                  }}>
                    Status
                  </th>
                  <th style={{
                    textAlign: "left",
                    padding: "12px 8px",
                    fontWeight: "600",
                    color: "#495057",
                    fontSize: "14px"
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {logins.map((login, index) => (
                  <tr 
                    key={login.id}
                    style={{
                      borderBottom: "1px solid #f1f3f4",
                      backgroundColor: index % 2 === 0 ? "#fff" : "#f8f9fa"
                    }}
                  >
                    <td style={{
                      padding: "12px 8px",
                      color: "#495057",
                      fontWeight: "500"
                    }}>
                      {login.name}
                    </td>
                    <td style={{
                      padding: "12px 8px",
                      color: "#495057"
                    }}>
                      <a
                        href={login.loginUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "#007bff",
                          textDecoration: "none",
                          fontSize: "13px"
                        }}
                      >
                        {login.loginUrl}
                      </a>
                    </td>
                    <td style={{
                      padding: "12px 8px"
                    }}>
                      {getStatusBadge(login.status)}
                    </td>
                    <td style={{
                      padding: "12px 8px"
                    }}>
                      <button
                        onClick={() => handleDeleteLogin(login.id, login.name)}
                        style={{
                          background: "#dc3545",
                          color: "#fff",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "500",
                          cursor: "pointer",
                          transition: "background-color 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#c82333";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#dc3545";
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Login Modal */}
      {isModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "#fff",
            borderRadius: "8px",
            border: "1px solid #dee2e6",
            padding: "24px",
            maxWidth: "500px",
            width: "90%",
            maxHeight: "80vh",
            overflow: "auto"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px"
            }}>
              <h3 style={{
                fontSize: "18px",
                fontWeight: "600",
                margin: 0,
                color: "#333"
              }}>
                ➕ Add New Login
              </h3>
              <button
                onClick={closeModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#6c757d",
                  padding: "0",
                  width: "30px",
                  height: "30px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreateLogin}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#495057",
                  marginBottom: "8px"
                }}>
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Gmail, Salesforce, etc."
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ced4da",
                    borderRadius: "6px",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#495057",
                  marginBottom: "8px"
                }}>
                  Login URL *
                </label>
                <input
                  type="url"
                  value={formData.loginUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, loginUrl: e.target.value }))}
                  placeholder="https://example.com/login"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ced4da",
                    borderRadius: "6px",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#495057",
                  marginBottom: "8px"
                }}>
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="your-username@example.com"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ced4da",
                    borderRadius: "6px",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#495057",
                  marginBottom: "8px"
                }}>
                  Password *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter your password"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ced4da",
                    borderRadius: "6px",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                  required
                />
              </div>

              {modalError && (
                <div style={{
                  backgroundColor: "#f8d7da",
                  color: "#721c24",
                  padding: "12px 16px",
                  borderRadius: "6px",
                  border: "1px solid #f5c6cb",
                  marginBottom: "16px",
                  fontSize: "14px"
                }}>
                  ⚠️ {modalError}
                </div>
              )}

              <div style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end"
              }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    background: "#6c757d",
                    color: "#fff",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "background-color 0.2s ease"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: isSubmitting ? "#6c757d" : "#007bff",
                    color: "#fff",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    transition: "background-color 0.2s ease",
                    opacity: isSubmitting ? 0.6 : 1
                  }}
                >
                  {isSubmitting ? "Creating..." : "Create Login"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
