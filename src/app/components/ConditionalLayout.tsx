'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Pages that should NOT have the sidebar
  const noSidebarPages = ['/login', '/register'];
  const shouldShowSidebar = session && !noSidebarPages.includes(pathname);

  // Show loading state while checking authentication
  if (status === 'loading') {
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
            Checking authentication
          </p>
        </div>
      </div>
    );
  }

  if (shouldShowSidebar) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <main style={{ 
          flex: 1, 
          marginLeft: "240px", 
          padding: "24px",
          minHeight: "100vh",
          backgroundColor: "#f9f9f9"
        }}>
          {children}
        </main>
      </div>
    );
  }

  // For login/register pages, render without sidebar
  return <>{children}</>;
}
