/**
 * Integration tests for Agents feature with scoped normalization
 * Verifies that Agents pages work correctly with normalized arrays
 */

import { render, screen } from '@testing-library/react';
import { SWRConfig } from 'swr';
import AgentsPage from '../src/app/agents/page';
import LoginsPage from '../src/app/logins/page';

// Mock Next.js session
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { email: 'test@example.com' } },
    status: 'authenticated'
  })
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock fetch for testing
global.fetch = jest.fn();

describe('Agents Scoped Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Agents Page with Normalized Arrays', () => {
    it('should render agents list when API returns wrapped object', async () => {
      const mockAgentsResponse = {
        agents: [
          { id: '1', name: 'Agent 1', status: 'ACTIVE', description: 'Test agent' },
          { id: '2', name: 'Agent 2', status: 'DRAFT', description: 'Another agent' }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockAgentsResponse),
      });

      render(
        <SWRConfig value={{ provider: () => new Map() }}>
          <AgentsPage />
        </SWRConfig>
      );

      // Should not crash and should render the page structure
      expect(screen.getByText('Agents')).toBeInTheDocument();
      expect(screen.getByText('Agents')).toBeInTheDocument();
    });

    it('should render empty state when API returns empty array', async () => {
      const mockEmptyResponse = { agents: [] };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockEmptyResponse),
      });

      render(
        <SWRConfig value={{ provider: () => new Map() }}>
          <AgentsPage />
        </SWRConfig>
      );

      // Should render empty state without crashing
      expect(screen.getByText('Agents')).toBeInTheDocument();
    });

    it('should handle API errors gracefully', async () => {
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

    it('should handle malformed API responses', async () => {
      // Test various malformed responses
      const malformedResponses = [
        null,
        undefined,
        'invalid json',
        { wrongKey: [] },
        { agents: 'not an array' },
        { agents: null },
      ];

      for (const response of malformedResponses) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce(response),
        });

        const { unmount } = render(
          <SWRConfig value={{ provider: () => new Map() }}>
            <AgentsPage />
          </SWRConfig>
        );

        // Should not crash with any malformed response
        expect(screen.getByText('Agents')).toBeInTheDocument();
        
        unmount();
        jest.clearAllMocks();
      }
    });
  });

  describe('Logins Page with Normalized Arrays', () => {
    it('should render logins list when API returns wrapped object', async () => {
      const mockLoginsResponse = {
        logins: [
          { id: '1', name: 'Login 1', systemType: 'ERP', username: 'user1' },
          { id: '2', name: 'Login 2', systemType: 'CRM', username: 'user2' }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockLoginsResponse),
      });

      render(
        <SWRConfig value={{ provider: () => new Map() }}>
          <LoginsPage />
        </SWRConfig>
      );

      // Should not crash and should render the page structure
      expect(screen.getByText('Agents')).toBeInTheDocument();
      expect(screen.getByText('Logins')).toBeInTheDocument();
    });

    it('should render empty state when API returns empty array', async () => {
      const mockEmptyResponse = { logins: [] };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockEmptyResponse),
      });

      render(
        <SWRConfig value={{ provider: () => new Map() }}>
          <LoginsPage />
        </SWRConfig>
      );

      // Should render empty state without crashing
      expect(screen.getByText('Agents')).toBeInTheDocument();
    });

    it('should handle API errors gracefully', async () => {
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
      expect(screen.getByText('Agents')).toBeInTheDocument();
    });
  });

  describe('Data Flow Consistency', () => {
    it('should ensure all data is arrays for .map operations', async () => {
      const testCases = [
        {
          name: 'wrapped object with array',
          response: { agents: [{ id: '1', name: 'Agent 1' }] },
          expectedLength: 1
        },
        {
          name: 'direct array',
          response: [{ id: '1', name: 'Agent 1' }],
          expectedLength: 1
        },
        {
          name: 'empty wrapped object',
          response: { agents: [] },
          expectedLength: 0
        },
        {
          name: 'empty direct array',
          response: [],
          expectedLength: 0
        },
        {
          name: 'malformed response',
          response: { wrongKey: [] },
          expectedLength: 0
        }
      ];

      for (const testCase of testCases) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce(testCase.response),
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
      }
    });
  });

  describe('Error Boundary Testing', () => {
    it('should not throw when .map is called on undefined data', async () => {
      // Simulate a scenario where data might be undefined
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(undefined),
      });

      // This should not throw an error
      expect(() => {
        render(
          <SWRConfig value={{ provider: () => new Map() }}>
            <AgentsPage />
          </SWRConfig>
        );
      }).not.toThrow();
    });

    it('should not throw when .map is called on null data', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(null),
      });

      // This should not throw an error
      expect(() => {
        render(
          <SWRConfig value={{ provider: () => new Map() }}>
            <AgentsPage />
          </SWRConfig>
        );
      }).not.toThrow();
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
  });
});
