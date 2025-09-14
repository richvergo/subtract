/**
 * Tests for scoped Agents API functionality
 * Verifies that agentsApi provides normalized arrays while main api.ts provides raw responses
 */

import { fetchArray } from '../src/lib/agentsApi';

// Mock fetch for testing
global.fetch = jest.fn();

describe('Agents API Scoped Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchArray utility in agentsApi', () => {
    it('should return empty array when response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await fetchArray('/api/test', 'items');
      expect(result).toEqual([]);
    });

    it('should return array when response is already an array', async () => {
      const mockData = [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }];
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockData),
      });

      const result = await fetchArray('/api/test', 'items');
      expect(result).toEqual(mockData);
    });

    it('should extract array from wrapped object response', async () => {
      const mockData = {
        items: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }],
        pagination: { page: 1, total: 2 }
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockData),
      });

      const result = await fetchArray('/api/test', 'items');
      expect(result).toEqual(mockData.items);
    });

    it('should return empty array when object has no matching key', async () => {
      const mockData = {
        otherData: 'some value',
        pagination: { page: 1, total: 0 }
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockData),
      });

      const result = await fetchArray('/api/test', 'items');
      expect(result).toEqual([]);
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchArray('/api/test', 'items');
      expect(result).toEqual([]);
    });

    it('should handle JSON parsing errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockRejectedValueOnce(new Error('Invalid JSON')),
      });

      const result = await fetchArray('/api/test', 'items');
      expect(result).toEqual([]);
    });
  });

  describe('Agents API Response Handling', () => {
    it('should handle agents API response format', async () => {
      const mockAgentsResponse = {
        agents: [
          { id: '1', name: 'Agent 1', status: 'ACTIVE' },
          { id: '2', name: 'Agent 2', status: 'DRAFT' }
        ]
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockAgentsResponse),
      });

      const result = await fetchArray('/api/agents', 'agents');
      expect(result).toEqual(mockAgentsResponse.agents);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle logins API response format', async () => {
      const mockLoginsResponse = {
        logins: [
          { id: '1', name: 'Login 1', systemType: 'ERP' },
          { id: '2', name: 'Login 2', systemType: 'CRM' }
        ]
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockLoginsResponse),
      });

      const result = await fetchArray('/api/logins', 'logins');
      expect(result).toEqual(mockLoginsResponse.logins);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle agent runs API response format', async () => {
      const mockRunsResponse = {
        runs: [
          { id: '1', status: 'SUCCESS', startedAt: '2023-01-01T00:00:00Z' },
          { id: '2', status: 'FAILED', startedAt: '2023-01-02T00:00:00Z' }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1
        }
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockRunsResponse),
      });

      const result = await fetchArray('/api/agents/123/runs', 'runs');
      expect(result).toEqual(mockRunsResponse.runs);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Import Separation Verification', () => {
    it('should verify that agentsApi has normalization functions', () => {
      const agentsApi = require('../src/lib/agentsApi');
      
      // Should have the normalization functions
      expect(agentsApi.fetchArray).toBeDefined();
      expect(agentsApi.useAgents).toBeDefined();
      expect(agentsApi.useLogins).toBeDefined();
      expect(agentsApi.useAgentRuns).toBeDefined();
      
      // Should have the raw API functions
      expect(agentsApi.agentsApi).toBeDefined();
      expect(agentsApi.loginsApi).toBeDefined();
      expect(agentsApi.agentRunsApi).toBeDefined();
    });

    it('should verify that main api.ts does not have normalization', () => {
      const mainApi = require('../src/lib/api');
      
      // Should not have the normalization functions
      expect(mainApi.fetchArray).toBeUndefined();
      expect(mainApi.useAgents).toBeUndefined();
      expect(mainApi.useLogins).toBeUndefined();
      expect(mainApi.useAgentRuns).toBeUndefined();
      
      // Should still have the raw API functions
      expect(mainApi.agentsApi).toBeDefined();
      expect(mainApi.loginsApi).toBeDefined();
      expect(mainApi.agentRunsApi).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    it('should always return an array type', async () => {
      const testCases = [
        { response: [], key: 'items' },
        { response: { items: [] }, key: 'items' },
        { response: { items: [{ id: 1 }] }, key: 'items' },
        { response: null, key: 'items' },
        { response: undefined, key: 'items' },
        { response: { other: 'data' }, key: 'items' },
      ];

      for (const testCase of testCases) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce(testCase.response),
        });

        const result = await fetchArray('/api/test', testCase.key);
        expect(Array.isArray(result)).toBe(true);
        expect(typeof result.map).toBe('function');
      }
    });
  });
});
