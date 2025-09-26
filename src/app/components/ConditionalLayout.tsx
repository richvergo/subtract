'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();

  // Pages that should NOT have the sidebar
  const noSidebarPages = ['/test-connections'];
  const shouldShowSidebar = !noSidebarPages.includes(pathname);

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

  // For pages without sidebar
  return <>{children}</>;
}
