'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  // Redirect directly to workflows page
  useEffect(() => {
    router.push('/workflows');
  }, [router]);

  // Show loading while redirecting
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f9f9f9'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '16px',
          color: '#007bff'
        }}>
          ⏳
        </div>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          margin: '0 0 8px 0',
          color: '#333'
        }}>
          Loading...
        </h2>
        <p style={{
          color: '#666',
          margin: 0,
          fontSize: '14px'
        }}>
          Redirecting to workflows
        </p>
      </div>
    </div>
  );
}