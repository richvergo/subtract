/**
 * Tests for route accessibility and basic functionality
 * Verifies that all Agents routes are accessible and render without crashes
 */

import { render } from '@testing-library/react';
import { SWRConfig } from 'swr';

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

// Mock fetch for testing
global.fetch = jest.fn();

describe('Route Accessibility Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Agents Routes', () => {
    it('should render /agents route without crashing', () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ agents: [] }),
      });

      // Import and render the Agents page
      const AgentsPage = require('../src/app/agents/page').default;
      
      expect(() => {
        render(
          <SWRConfig value={{ provider: () => new Map() }}>
            <AgentsPage />
          </SWRConfig>
        );
      }).not.toThrow();
    });

    it('should render /logins route without crashing', () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ logins: [] }),
      });

      // Import and render the Logins page
      const LoginsPage = require('../src/app/logins/page').default;
      
      expect(() => {
        render(
          <SWRConfig value={{ provider: () => new Map() }}>
            <LoginsPage />
          </SWRConfig>
        );
      }).not.toThrow();
    });

    it('should render /agents/[id] route without crashing', () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ agent: { id: '1', name: 'Test Agent' } }),
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ runs: [] }),
      });

      // Import and render the Agent Detail page
      const AgentDetailPage = require('../src/app/agents/[id]/page').default;
      
      expect(() => {
        render(
          <SWRConfig value={{ provider: () => new Map() }}>
            <AgentDetailPage />
          </SWRConfig>
        );
      }).not.toThrow();
    });
  });

  describe('Data Handling', () => {
    it('should handle empty API responses gracefully', () => {
      const testCases = [
        { route: 'agents', response: { agents: [] } },
        { route: 'logins', response: { logins: [] } },
        { route: 'agent-detail', response: { agent: null, runs: [] } },
      ];

      testCases.forEach(({ route, response }) => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce(response),
        });

        let Component;
        switch (route) {
          case 'agents':
            Component = require('../src/app/agents/page').default;
            break;
          case 'logins':
            Component = require('../src/app/logins/page').default;
            break;
          case 'agent-detail':
            Component = require('../src/app/agents/[id]/page').default;
            break;
        }

        expect(() => {
          render(
            <SWRConfig value={{ provider: () => new Map() }}>
              <Component />
            </SWRConfig>
          );
        }).not.toThrow();
      });
    });

    it('should handle API errors gracefully', () => {
      const testCases = [
        { route: 'agents', component: require('../src/app/agents/page').default },
        { route: 'logins', component: require('../src/app/logins/page').default },
        { route: 'agent-detail', component: require('../src/app/agents/[id]/page').default },
      ];

      testCases.forEach(({ route, component: Component }) => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

        expect(() => {
          render(
            <SWRConfig value={{ provider: () => new Map() }}>
              <Component />
            </SWRConfig>
          );
        }).not.toThrow();
      });
    });
  });

  describe('Import Structure', () => {
    it('should verify correct import structure', () => {
      // Test that all required modules can be imported
      expect(() => {
        require('../src/app/agents/page');
        require('../src/app/logins/page');
        require('../src/app/agents/[id]/page');
        // AgentsSidebar component doesn't exist - removed from test
        require('../src/lib/agentsApi');
      }).not.toThrow();
    });

    it('should verify agentsApi exports', () => {
      const agentsApi = require('../src/lib/agentsApi');
      
      // Check that all required exports exist
      expect(agentsApi.useAgents).toBeDefined();
      expect(agentsApi.useLogins).toBeDefined();
      expect(agentsApi.useAgentRuns).toBeDefined();
      expect(agentsApi.agentsApi).toBeDefined();
      expect(agentsApi.loginsApi).toBeDefined();
      expect(agentsApi.agentRunsApi).toBeDefined();
      expect(agentsApi.fetchArray).toBeDefined();
    });
  });
});
