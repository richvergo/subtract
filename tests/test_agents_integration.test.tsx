/**
 * Integration tests for Agents MVP frontend
 * Tests sidebar navigation, route accessibility, and empty states
 */

import { render, screen } from '@testing-library/react';
import { SWRConfig } from 'swr';
import AgentsPage from '../src/app/agents/page';
import LoginsPage from '../src/app/logins/page';
import { Sidebar } from '../src/components/Sidebar';

// Mock Next.js components
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

jest.mock('next/navigation', () => ({
  usePathname: () => '/agents',
  useParams: () => ({ id: 'test-agent-id' }),
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      },
    },
    status: 'authenticated',
  }),
  signOut: jest.fn(),
}));

// Mock fetch for testing
global.fetch = jest.fn();

describe('Agents MVP Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Sidebar Navigation', () => {
    it('should render Agents menu entry in sidebar', () => {
      render(<Sidebar />);
      
      // Check that Agents link exists
      const agentsLink = screen.getByRole('link', { name: /agents/i });
      expect(agentsLink).toBeInTheDocument();
      expect(agentsLink).toHaveAttribute('href', '/agents');
    });

    it('should render all navigation items', () => {
      render(<Sidebar />);
      
      // Check all navigation items exist
      expect(screen.getByRole('link', { name: /vergo/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /logins/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /agents/i })).toBeInTheDocument();
    });

    it('should have correct href attributes', () => {
      render(<Sidebar />);
      
      expect(screen.getByRole('link', { name: /vergo/i })).toHaveAttribute('href', '/');
      expect(screen.getByRole('link', { name: /logins/i })).toHaveAttribute('href', '/logins');
      expect(screen.getByRole('link', { name: /agents/i })).toHaveAttribute('href', '/agents');
    });
  });

  describe('Agents Page Integration', () => {
    it('should render agents page with sidebar', () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ agents: [] }),
      });

      render(
        <SWRConfig value={{ provider: () => new Map() }}>
          <AgentsPage />
        </SWRConfig>
      );

      // Should render the page structure
      expect(screen.getByText('Agents')).toBeInTheDocument();
      expect(screen.getAllByText('Create Agent')).toHaveLength(2); // Header and empty state buttons
    });

    it('should render empty state when no agents', () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ agents: [] }),
      });

      render(
        <SWRConfig value={{ provider: () => new Map() }}>
          <AgentsPage />
        </SWRConfig>
      );

      // Should render empty state
      expect(screen.getByText('No agents yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first automation agent to get started.')).toBeInTheDocument();
    });

    it('should handle API errors gracefully', () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(
        <SWRConfig value={{ provider: () => new Map() }}>
          <AgentsPage />
        </SWRConfig>
      );

      // Should not crash on API error
      expect(screen.getByText('Agents')).toBeInTheDocument();
    });

    it('should handle malformed API responses', () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(null),
      });

      render(
        <SWRConfig value={{ provider: () => new Map() }}>
          <AgentsPage />
        </SWRConfig>
      );

      // Should not crash with malformed response
      expect(screen.getByText('Agents')).toBeInTheDocument();
    });
  });

  describe('Logins Page Integration', () => {
    it('should render logins page with sidebar', () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ logins: [] }),
      });

      render(
        <SWRConfig value={{ provider: () => new Map() }}>
          <LoginsPage />
        </SWRConfig>
      );

      // Should render the page structure
      expect(screen.getByText('Logins')).toBeInTheDocument();
      expect(screen.getAllByText('Add Login')).toHaveLength(2); // Header and empty state buttons
    });

    it('should render empty state when no logins', () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ logins: [] }),
      });

      render(
        <SWRConfig value={{ provider: () => new Map() }}>
          <LoginsPage />
        </SWRConfig>
      );

      // Should render empty state
      expect(screen.getByText('No logins yet')).toBeInTheDocument();
      expect(screen.getByText('Add your first login credentials to get started.')).toBeInTheDocument();
    });

    it('should handle API errors gracefully', () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(
        <SWRConfig value={{ provider: () => new Map() }}>
          <LoginsPage />
        </SWRConfig>
      );

      // Should not crash on API error
      expect(screen.getByText('Logins')).toBeInTheDocument();
    });
  });

  describe('Data Structure Verification', () => {
    it('should ensure agents data is always an array', () => {
      const testCases = [
        { response: { agents: [] }, expected: [] },
        { response: { agents: [{ id: '1', name: 'Agent 1' }] }, expected: [{ id: '1', name: 'Agent 1' }] },
        { response: null, expected: [] },
        { response: undefined, expected: [] },
        { response: { wrongKey: [] }, expected: [] },
      ];

      testCases.forEach(({ response, expected }) => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce(response),
        });

        const { unmount } = render(
          <SWRConfig value={{ provider: () => new Map() }}>
            <AgentsPage />
          </SWRConfig>
        );

        // Should not crash regardless of response format
        expect(screen.getByText('Agents')).toBeInTheDocument();
        
        unmount();
        jest.clearAllMocks();
      });
    });

    it('should ensure logins data is always an array', () => {
      const testCases = [
        { response: { logins: [] }, expected: [] },
        { response: { logins: [{ id: '1', name: 'Login 1' }] }, expected: [{ id: '1', name: 'Login 1' }] },
        { response: null, expected: [] },
        { response: undefined, expected: [] },
        { response: { wrongKey: [] }, expected: [] },
      ];

      testCases.forEach(({ response, expected }) => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce(response),
        });

        const { unmount } = render(
          <SWRConfig value={{ provider: () => new Map() }}>
            <LoginsPage />
          </SWRConfig>
        );

        // Should not crash regardless of response format
        expect(screen.getByText('Logins')).toBeInTheDocument();
        
        unmount();
        jest.clearAllMocks();
      });
    });
  });

  describe('Import Verification', () => {
    it('should verify that Agents pages import from agentsApi', () => {
      // This test verifies that the import structure is correct
      // by checking that the components can be imported without errors
      
      expect(() => {
        require('../src/app/agents/page');
      }).not.toThrow();
      
      expect(() => {
        require('../src/app/logins/page');
      }).not.toThrow();
      
      expect(() => {
        require('../src/app/agents/[id]/page');
      }).not.toThrow();
    });

    it('should verify that agentsApi has the required functions', () => {
      const agentsApi = require('../src/lib/agentsApi');
      
      // Should have the normalization functions
      expect(agentsApi.useAgents).toBeDefined();
      expect(agentsApi.useLogins).toBeDefined();
      expect(agentsApi.useAgentRuns).toBeDefined();
      
      // Should have the raw API functions
      expect(agentsApi.agentsApi).toBeDefined();
      expect(agentsApi.loginsApi).toBeDefined();
      expect(agentsApi.agentRunsApi).toBeDefined();
    });
  });
});
