'use client';

import React, { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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
  status: 'UNKNOWN' | 'ACTIVE' | 'NEEDS_RECONNECT' | 'DISCONNECTED' | 'BROKEN' | 'EXPIRED' | 'SUSPENDED' | 'READY_FOR_AGENTS' | 'NEEDS_TESTING'
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
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; status?: string; errorMessage?: string; responseTime?: number; lastChecked?: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(1); // 1: Credentials, 2: Recording, 3: Save
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'analyzing' | 'completed' | 'failed'>('idle');
  const [createdLoginId, setCreatedLoginId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLogin, setEditingLogin] = useState<{ id: string; name: string; username: string } | null>(null);
  const [editFormData, setEditFormData] = useState({
    username: '',
    password: ''
  });
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(false);
  const submissionInProgress = useRef(false);
  const lastSubmissionTime = useRef(0);
  const requestId = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    loginUrl: '',
    username: '',
    password: ''
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'loading') return; // Still loading
    if (!session) {
      router.push('/login');
    }
  }, [session, status, router]);

  const { data, error, isLoading, mutate } = useSWR<LoginsResponse>(
    session ? '/api/logins' : null,
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
      'READY_FOR_AGENTS': { color: "#17a2b8", icon: "🤖", text: "Ready for Agents" },
      'NEEDS_TESTING': { color: "#fd7e14", icon: "🧪", text: "Needs Testing" },
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
    console.log('🚀 handleCreateLogin called', { 
      submissionInProgress: submissionInProgress.current, 
      isSubmitting, 
      analysisStatus,
      timestamp: Date.now()
    });
    
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent double submission using ref and timestamp for more reliable tracking
    const now = Date.now();
    if (submissionInProgress.current || isSubmitting || analysisStatus === 'analyzing' || (now - lastSubmissionTime.current) < 5000) {
      console.log('❌ Form already submitting or analyzing, ignoring duplicate submission', {
        submissionInProgress: submissionInProgress.current,
        isSubmitting,
        analysisStatus,
        timeSinceLastSubmission: now - lastSubmissionTime.current
      });
      return;
    }
    
    console.log('✅ Proceeding with login creation');
    submissionInProgress.current = true;
    lastSubmissionTime.current = now;
    requestId.current += 1;
    const currentRequestId = requestId.current;
    
    // Validate form
    if (!formData.name.trim() || !formData.loginUrl.trim() || !formData.username.trim() || !formData.password.trim()) {
      setModalError('All fields are required');
      submissionInProgress.current = false;
      return;
    }

    setIsSubmitting(true);
    setAnalysisStatus('analyzing');
    setTestResult(null);
    setModalError(null);

    try {
      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name.trim());
      formDataToSend.append('loginUrl', formData.loginUrl.trim());
      formDataToSend.append('username', formData.username.trim());
      formDataToSend.append('password', formData.password);
      formDataToSend.append('testOnCreate', 'false'); // Don't test immediately
      formDataToSend.append('requestId', currentRequestId.toString());
      
      // Add recording if available
      if (recordingBlob) {
        console.log('Adding recording to FormData:', { size: recordingBlob.size, type: recordingBlob.type });
        formDataToSend.append('recording', recordingBlob, 'login-recording.webm');
      } else {
        console.log('No recording blob available');
      }

      console.log('Sending FormData to /api/logins...');
      const response = await fetch('/api/logins', {
        method: 'POST',
        credentials: 'include',
        body: formDataToSend
      });
      
      console.log('Response received:', { status: response.status, statusText: response.statusText });

      if (!response.ok) {
        let errorMessage = `Failed to create login: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('API Error Response:', errorData);
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        console.error('Full response:', { status: response.status, statusText: response.statusText });
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Check if this is still the latest request
      if (currentRequestId !== requestId.current) {
        console.log('❌ Request is outdated, ignoring response');
        return;
      }
      
      setCreatedLoginId(result.login?.id);
      
      // Start polling for analysis completion
      if (result.login?.id) {
        pollAnalysisStatus(result.login.id);
      }
      
    } catch (error) {
      console.error('Error creating login:', error);
      
      // Check if this is still the latest request
      if (currentRequestId !== requestId.current) {
        console.log('❌ Request is outdated, ignoring error');
        return;
      }
      
      setModalError(error instanceof Error ? error.message : 'Failed to create login');
      setAnalysisStatus('failed');
    } finally {
      // Only reset if this is still the latest request
      if (currentRequestId === requestId.current) {
        setIsSubmitting(false);
        submissionInProgress.current = false;
      }
    }
  };

  const pollAnalysisStatus = async (loginId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // Poll for up to 60 seconds
    
    const poll = async () => {
      attempts++;
      
      try {
        const response = await fetch(`/api/logins/${loginId}/status`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.analysisStatus === 'COMPLETED') {
            setAnalysisStatus('completed');
            setTestResult({ success: true, status: 'NEEDS_TESTING' });
            
            // Close modal and refresh after a short delay
            setTimeout(() => {
              setIsModalOpen(false);
              setFormData({ name: '', loginUrl: '', username: '', password: '' });
              setTestResult(null);
              setHasRecording(false);
              setRecordingBlob(null);
              setAnalysisStatus('idle');
              setCreatedLoginId(null);
              mutate();
            }, 2000);
            
            return;
          } else if (result.analysisStatus === 'FAILED') {
            setAnalysisStatus('failed');
            setTestResult({ success: false, errorMessage: 'Analysis failed' });
            return;
          }
        }
        
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000); // Poll every second
        } else {
          setAnalysisStatus('failed');
          setTestResult({ success: false, errorMessage: 'Analysis timed out' });
        }
      } catch (error) {
        console.error('Error polling analysis status:', error);
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          setAnalysisStatus('failed');
          setTestResult({ success: false, errorMessage: 'Analysis failed' });
        }
      }
    };
    
    // Start polling after a short delay
    setTimeout(poll, 2000);
  };

  const handleTestLogin = async (loginId: string, loginName: string) => {
    try {
      // First check if we have session data
      const checkResponse = await fetch(`/api/logins/${loginId}/check`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!checkResponse.ok) {
        const errorData = await checkResponse.json();
        throw new Error(errorData.error || `Failed to check login: ${checkResponse.status}`);
      }

      const checkResult = await checkResponse.json();
      
      // If we have session data and it's working, show success
      if (!checkResult.needsReconnect && checkResult.status === 'ACTIVE') {
        alert(`✅ ${loginName} is working properly!`);
        mutate();
        return;
      }

      // If we need to test/login, start the automated browser test
      const confirmMessage = `🌐 This will open a browser window to test ${loginName}.\n\nPlease watch as the system automatically logs in using your credentials. The browser will close automatically once login is successful.\n\nContinue?`;
      
      if (!confirm(confirmMessage)) {
        return;
      }

      // Start automated browser test
      const testResponse = await fetch(`/api/logins/${loginId}/test-interactive`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!testResponse.ok) {
        const errorData = await testResponse.json();
        // Don't throw error, handle gracefully and show user-friendly message
        alert(`❌ ${loginName} login test failed: ${errorData.message || errorData.error || 'Login failed'}\n\nPlease check your credentials and try again.`);
        mutate(); // Refresh the login list
        return;
      }

      const testResult = await testResponse.json();
      
      if (testResult.success) {
        alert(`✅ ${loginName} login test successful!\n\nBrowser will close automatically. Status updated to Ready for Agents.`);
        mutate(); // Refresh the login list
      } else {
        alert(`❌ ${loginName} login test failed: ${testResult.message}\n\nPlease check your credentials and try again.`);
      }
      
    } catch (error) {
      console.error('Error testing login:', error);
      alert(error instanceof Error ? error.message : 'Failed to test login');
    }
  };

  const pollLoginStatus = async (loginId: string, loginName: string) => {
    let attempts = 0;
    const maxAttempts = 30; // Poll for up to 30 seconds
    
    const poll = async () => {
      attempts++;
      
      try {
        const response = await fetch(`/api/logins/${loginId}/status`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const result = await response.json();
          mutate(); // Refresh the UI
          
          if (result.status === 'ACTIVE' && result.sessionData) {
            alert(`✅ ${loginName} login successful!\n\nStatus: ${result.status}\nSession captured and ready for automation.`);
            return;
          }
        }
        
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000); // Poll every second
        } else {
          alert(`⏰ ${loginName} test timed out.\n\nIf you successfully logged in, the status should update automatically. Please check the login status.`);
        }
      } catch (error) {
        console.error('Error polling login status:', error);
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        }
      }
    };
    
    // Start polling after a short delay
    setTimeout(poll, 2000);
  };


  const handleEditLogin = async (loginId: string, loginName: string) => {
    setIsLoadingCredentials(true);
    try {
      // Fetch the actual username from the server
      const response = await fetch(`/api/logins/${loginId}/credentials`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch login credentials');
      }

      const credentials = await response.json();

      // Set up the edit modal with the actual username
      setEditingLogin({
        id: loginId,
        name: loginName,
        username: credentials.username || ''
      });
      setEditFormData({
        username: credentials.username || '',
        password: '' // Always empty for security
      });
      setIsEditModalOpen(true);
    } catch (error) {
      console.error('Error fetching credentials:', error);
      alert('Failed to load login credentials. Please try again.');
    } finally {
      setIsLoadingCredentials(false);
    }
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingLogin) return;
    
    // Validate form
    if (!editFormData.username.trim() || !editFormData.password.trim()) {
      alert('Username and password are required');
      return;
    }

    try {
      const response = await fetch(`/api/logins/${editingLogin.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: editFormData.username.trim(),
          password: editFormData.password
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update credentials: ${response.status}`);
      }

      // Close modal and refresh data
      setIsEditModalOpen(false);
      setEditingLogin(null);
      setEditFormData({ username: '', password: '' });
      mutate();
      
      alert(`✅ Credentials updated for ${editingLogin.name}`);
      
    } catch (error) {
      console.error('Error updating credentials:', error);
      alert(error instanceof Error ? error.message : 'Failed to update credentials');
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
    setWizardStep(1);
    setHasRecording(false);
    setRecordingBlob(null);
    setRecordingError(null);
    setIsRecording(false);
    setAnalysisStatus('idle');
    setCreatedLoginId(null);
    setFormData({ name: '', loginUrl: '', username: '', password: '' });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalError(null);
    setWizardStep(1);
    setHasRecording(false);
    setRecordingBlob(null);
    setRecordingError(null);
    setIsRecording(false);
    setAnalysisStatus('idle');
    setCreatedLoginId(null);
    setFormData({ name: '', loginUrl: '', username: '', password: '' });
  };

  const nextStep = () => {
    if (wizardStep < 3) {
      setWizardStep(wizardStep + 1);
    }
  };

  const prevStep = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
    }
  };


  // Screen recording functions (from agent creation)
  const startRecording = async () => {
    try {
      setRecordingError("");
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: true 
      });
      
      streamRef.current = stream;
      
      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        
        // Validate file size (100MB limit)
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (blob.size > maxSize) {
          setRecordingError(`Recording too large (${Math.round(blob.size / (1024 * 1024))}MB). Maximum size is 100MB. Please record a shorter video.`);
          setHasRecording(false);
          setRecordingBlob(null);
        } else {
          setRecordingBlob(blob);
          setHasRecording(true);
        }
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
    } catch (err) {
      console.error('Error starting recording:', err);
      setRecordingError("Failed to start recording. Please ensure you grant screen sharing permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };


  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "50vh",
        fontSize: "18px",
        color: "#6c757d"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "16px" }}>⏳</div>
          <div>Checking authentication...</div>
        </div>
      </div>
    );
  }

  // Show loading if not authenticated (will redirect)
  if (!session) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "50vh",
        fontSize: "18px",
        color: "#6c757d"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "16px" }}>🔐</div>
          <div>Redirecting to login...</div>
        </div>
      </div>
    );
  }

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
                      <div style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        flexWrap: "wrap"
                      }}>
                        <button
                          onClick={() => handleTestLogin(login.id, login.name)}
                          style={{
                            background: "#28a745",
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
                            e.currentTarget.style.backgroundColor = "#218838";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#28a745";
                          }}
                        >
                          🧪 Test
                        </button>
                        
                        <button
                          onClick={() => handleEditLogin(login.id, login.name)}
                          disabled={isLoadingCredentials}
                          style={{
                            background: isLoadingCredentials ? "#6c757d" : "#007bff",
                            color: "#fff",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "500",
                            cursor: isLoadingCredentials ? "not-allowed" : "pointer",
                            transition: "background-color 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            opacity: isLoadingCredentials ? 0.6 : 1
                          }}
                          onMouseEnter={(e) => {
                            if (!isLoadingCredentials) {
                              e.currentTarget.style.backgroundColor = "#0056b3";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isLoadingCredentials) {
                              e.currentTarget.style.backgroundColor = "#007bff";
                            }
                          }}
                        >
                          {isLoadingCredentials ? "⏳" : "✏️"} Edit
                        </button>
                        
                        
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
                      </div>
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
                🔗 Connect New Login
              </h3>
              
              {/* Wizard Progress */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "16px",
                marginBottom: "24px"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  backgroundColor: wizardStep >= 1 ? "#007bff" : "#e9ecef",
                  color: wizardStep >= 1 ? "white" : "#6c757d",
                  fontSize: "12px",
                  fontWeight: "500"
                }}>
                  <span>1</span>
                  <span>Credentials</span>
                </div>
                <div style={{ width: "20px", height: "2px", backgroundColor: wizardStep >= 2 ? "#007bff" : "#e9ecef" }}></div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  backgroundColor: wizardStep >= 2 ? "#007bff" : "#e9ecef",
                  color: wizardStep >= 2 ? "white" : "#6c757d",
                  fontSize: "12px",
                  fontWeight: "500"
                }}>
                  <span>2</span>
                  <span>Recording</span>
                </div>
                <div style={{ width: "20px", height: "2px", backgroundColor: wizardStep >= 3 ? "#007bff" : "#e9ecef" }}></div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  backgroundColor: wizardStep >= 3 ? "#007bff" : "#e9ecef",
                  color: wizardStep >= 3 ? "white" : "#6c757d",
                  fontSize: "12px",
                  fontWeight: "500"
                }}>
                  <span>3</span>
                  <span>Save</span>
                </div>
              </div>
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
            

            {/* Wizard Step Content */}
            {wizardStep === 1 && (
              <div>
                <div style={{
                  backgroundColor: "#e7f3ff",
                  color: "#0066cc",
                  padding: "12px 16px",
                  borderRadius: "6px",
                  marginBottom: "20px",
                  fontSize: "14px",
                  border: "1px solid #b3d9ff"
                }}>
                  💡 <strong>Step 1:</strong> Enter your login credentials below. We&apos;ll use these to test the login process.
                </div>
                
                <form onSubmit={(e) => { e.preventDefault(); nextStep(); }}>
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

              {/* Testing Progress */}
              {isTesting && (
                <div style={{
                  backgroundColor: "#d1ecf1",
                  color: "#0c5460",
                  padding: "12px 16px",
                  borderRadius: "6px",
                  border: "1px solid #bee5eb",
                  marginBottom: "16px",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <div style={{
                    width: "16px",
                    height: "16px",
                    border: "2px solid #0c5460",
                    borderTop: "2px solid transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }}></div>
                  🔍 Testing login credentials...
                </div>
              )}

              {/* Test Results */}
              {testResult && (
                <div style={{
                  backgroundColor: testResult.success ? "#d4edda" : "#f8d7da",
                  color: testResult.success ? "#155724" : "#721c24",
                  padding: "12px 16px",
                  borderRadius: "6px",
                  border: `1px solid ${testResult.success ? "#c3e6cb" : "#f5c6cb"}`,
                  marginBottom: "16px",
                  fontSize: "14px"
                }}>
                  {testResult.success ? (
                    <>
                      ✅ <strong>Login successful!</strong> Your credentials are working and the login has been created.
                    </>
                  ) : (
                    <>
                      ❌ <strong>Login failed:</strong> {testResult.errorMessage || 'Unable to connect with these credentials.'}
                    </>
                  )}
                </div>
              )}

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
                  style={{
                    background: "#007bff",
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
                  Next: Record Login →
                </button>
              </div>
            </form>
              </div>
            )}

            {/* Step 2: Recording */}
            {wizardStep === 2 && (
              <div>
                <div style={{
                  backgroundColor: "#fff3cd",
                  color: "#856404",
                  padding: "12px 16px",
                  borderRadius: "6px",
                  marginBottom: "20px",
                  fontSize: "14px",
                  border: "1px solid #ffeaa7"
                }}>
                  🎥 <strong>Step 2:</strong> Record yourself logging in. This helps us understand the login process and identify the buttons/fields to click.
                </div>
                
                {/* Recording Controls */}
                <div style={{ marginBottom: "20px" }}>
                  {!hasRecording && !isRecording && (
                    <div style={{
                      textAlign: "center",
                      padding: "40px 20px",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "8px",
                      border: "2px dashed #dee2e6"
                    }}>
                      <div style={{ fontSize: "48px", marginBottom: "16px", color: "#6c757d" }}>
                        🎥
                      </div>
                      <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", color: "#495057" }}>
                        Record Your Login Process
                      </h3>
                      <p style={{ margin: "0 0 20px 0", color: "#6c757d", fontSize: "14px" }}>
                        Click the button below to start recording your screen while you log in
                      </p>
                      <button
                        onClick={startRecording}
                        style={{
                          padding: "12px 24px",
                          backgroundColor: "#dc3545",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "16px",
                          fontWeight: "500",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          margin: "0 auto"
                        }}
                      >
                        🔴 Start Recording
                      </button>
                    </div>
                  )}

                  {isRecording && (
                    <div style={{
                      textAlign: "center",
                      padding: "40px 20px",
                      backgroundColor: "#f8d7da",
                      borderRadius: "8px",
                      border: "2px solid #f5c6cb"
                    }}>
                      <div style={{ fontSize: "48px", marginBottom: "16px", color: "#dc3545" }}>
                        🔴
                      </div>
                      <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", color: "#721c24" }}>
                        Recording in Progress...
                      </h3>
                      <p style={{ margin: "0 0 20px 0", color: "#721c24", fontSize: "14px" }}>
                        Go to your login page and perform the login process
                      </p>
                      <button
                        onClick={stopRecording}
                        style={{
                          padding: "12px 24px",
                          backgroundColor: "#6c757d",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "16px",
                          fontWeight: "500",
                          cursor: "pointer"
                        }}
                      >
                        ⏹️ Stop Recording
                      </button>
                    </div>
                  )}

                  {hasRecording && !isRecording && (
                    <div style={{
                      textAlign: "center",
                      padding: "40px 20px",
                      backgroundColor: "#d4edda",
                      borderRadius: "8px",
                      border: "2px solid #c3e6cb"
                    }}>
                      <div style={{ fontSize: "48px", marginBottom: "16px", color: "#155724" }}>
                        ✅
                      </div>
                      <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", color: "#155724" }}>
                        Recording Complete!
                      </h3>
                      <p style={{ margin: "0 0 20px 0", color: "#155724", fontSize: "14px" }}>
                        Your login process has been recorded successfully
                      </p>
                      <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                        <button
                          onClick={startRecording}
                          style={{
                            padding: "8px 16px",
                            backgroundColor: "#007bff",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "14px",
                            cursor: "pointer"
                          }}
                        >
                          🔄 Record Again
                        </button>
                      </div>
                    </div>
                  )}

                  {recordingError && (
                    <div style={{
                      marginTop: "12px",
                      padding: "12px",
                      backgroundColor: "#f8d7da",
                      color: "#721c24",
                      borderRadius: "6px",
                      border: "1px solid #f5c6cb",
                      fontSize: "14px"
                    }}>
                      ❌ {recordingError}
                    </div>
                  )}
                </div>

                <div style={{
                  backgroundColor: "#f8f9fa",
                  padding: "16px",
                  borderRadius: "6px",
                  marginBottom: "20px"
                }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#495057" }}>Recording Tips:</h4>
                  <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#6c757d" }}>
                    <li>Start recording before opening the login page</li>
                    <li>Show the full login process including clicking buttons</li>
                    <li>Make sure all text is clearly visible</li>
                    <li>Keep the recording under 2 minutes if possible</li>
                  </ul>
                </div>

                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginTop: "24px"
                }}>
                  <button
                    type="button"
                    onClick={prevStep}
                    style={{
                      padding: "12px 24px",
                      border: "1px solid #dee2e6",
                      borderRadius: "6px",
                      background: "#fff",
                      color: "#495057",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer"
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={!hasRecording}
                    style={{
                      padding: "12px 24px",
                      border: "none",
                      borderRadius: "6px",
                      background: hasRecording ? "#007bff" : "#6c757d",
                      color: "#fff",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: hasRecording ? "pointer" : "not-allowed"
                    }}
                  >
                    Next: Save Login →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Save */}
            {wizardStep === 3 && (
              <div>
                <div style={{
                  backgroundColor: "#d1ecf1",
                  color: "#0c5460",
                  padding: "12px 16px",
                  borderRadius: "6px",
                  marginBottom: "20px",
                  fontSize: "14px",
                  border: "1px solid #bee5eb"
                }}>
                  💾 <strong>Step 3:</strong> Save your login configuration. We&apos;ll analyze your recording to create a login agent and set the status to "Needs Testing".
                </div>

                {/* Analysis Status */}
                {analysisStatus === 'analyzing' && (
                  <div style={{
                    backgroundColor: "#fff3cd",
                    color: "#856404",
                    padding: "12px 16px",
                    borderRadius: "6px",
                    marginBottom: "20px",
                    fontSize: "14px",
                    border: "1px solid #ffeaa7",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <div style={{
                      width: "16px",
                      height: "16px",
                      border: "2px solid #856404",
                      borderTop: "2px solid transparent",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite"
                    }}></div>
                    🤖 Analyzing your recording and creating login agent...
                  </div>
                )}

                {analysisStatus === 'completed' && (
                  <div style={{
                    backgroundColor: "#d4edda",
                    color: "#155724",
                    padding: "12px 16px",
                    borderRadius: "6px",
                    marginBottom: "20px",
                    fontSize: "14px",
                    border: "1px solid #c3e6cb"
                  }}>
                    ✅ <strong>Login Saved!</strong> Your login has been created with status "Needs Testing". You can now test it from the main page.
                  </div>
                )}

                {analysisStatus === 'failed' && (
                  <div style={{
                    backgroundColor: "#f8d7da",
                    color: "#721c24",
                    padding: "12px 16px",
                    borderRadius: "6px",
                    marginBottom: "20px",
                    fontSize: "14px",
                    border: "1px solid #f5c6cb"
                  }}>
                    ❌ <strong>Analysis Failed:</strong> {testResult?.errorMessage || 'Unable to analyze the recording.'}
                  </div>
                )}

                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginTop: "24px"
                }}>
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={analysisStatus === 'analyzing'}
                    style={{
                      padding: "12px 24px",
                      border: "1px solid #dee2e6",
                      borderRadius: "6px",
                      background: "#fff",
                      color: "#495057",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: analysisStatus === 'analyzing' ? "not-allowed" : "pointer",
                      opacity: analysisStatus === 'analyzing' ? 0.6 : 1
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateLogin}
                    disabled={submissionInProgress.current || isSubmitting || analysisStatus === 'analyzing'}
                    style={{
                      padding: "12px 24px",
                      border: "none",
                      borderRadius: "6px",
                      background: submissionInProgress.current || isSubmitting || analysisStatus === 'analyzing' ? "#6c757d" : "#28a745",
                      color: "#fff",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: submissionInProgress.current || isSubmitting || analysisStatus === 'analyzing' ? "not-allowed" : "pointer",
                      transition: "background-color 0.2s ease",
                      opacity: submissionInProgress.current || isSubmitting || analysisStatus === 'analyzing' ? 0.6 : 1
                    }}
                  >
                    {analysisStatus === 'analyzing' ? "🤖 Analyzing..." : 
                     analysisStatus === 'completed' ? "✅ Saved" :
                     analysisStatus === 'failed' ? "❌ Failed" :
                     "Save Login Configuration"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Login Modal */}
      {isEditModalOpen && editingLogin && (
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
            maxWidth: "400px",
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
                ✏️ Edit Credentials
              </h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingLogin(null);
                  setEditFormData({ username: '', password: '' });
                }}
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

            <div style={{
              backgroundColor: "#e7f3ff",
              color: "#0066cc",
              padding: "12px 16px",
              borderRadius: "6px",
              marginBottom: "20px",
              fontSize: "14px",
              border: "1px solid #b3d9ff"
            }}>
              💡 <strong>Update Credentials:</strong> Enter new username and password for "{editingLogin.name}". The password field is empty for security reasons.
            </div>

            {isLoadingCredentials ? (
              <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "40px 20px",
                color: "#6c757d"
              }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "24px", marginBottom: "12px" }}>⏳</div>
                  <div>Loading credentials...</div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateCredentials}>
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
                    value={editFormData.username}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, username: e.target.value }))}
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
                  value={editFormData.password}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter new password"
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

              <div style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end"
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingLogin(null);
                    setEditFormData({ username: '', password: '' });
                  }}
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
                  style={{
                    background: "#28a745",
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
                  Update Credentials
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
