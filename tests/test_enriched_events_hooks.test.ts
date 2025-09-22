/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

// Mock fetch
global.fetch = jest.fn();

// Mock SWR
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
  mutate: jest.fn(),
}));

jest.mock('swr/mutation', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import { useRecordEvents, useReviewAgent, useSummarizeAgent } from '@/lib/hooks';

describe('Enriched Events API Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('useRecordEvents', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { success: true };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useRecordEvents());

      const testData = {
        agentId: 'test-agent-id',
        eventLog: [
          {
            step: 1,
            action: 'navigate',
            target: 'https://example.com',
            url: 'https://example.com',
            elementType: 'a',
            elementText: 'Example Link',
            screenshot: 'data:image/jpeg;base64,test',
            timestamp: 1704067200000,
          },
        ],
      };

      await result.current.trigger(testData);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/agents/record-events',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testData),
          credentials: 'include',
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      const mockError = { error: 'Failed to record events' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(mockError),
      });

      const { result } = renderHook(() => useRecordEvents());

      const testData = {
        agentId: 'test-agent-id',
        eventLog: [],
      };

      await expect(result.current.trigger(testData)).rejects.toThrow('Failed to record events');
    });
  });

  describe('useReviewAgent', () => {
    it('should fetch agent review data', async () => {
      const mockAgentData = {
        agent: {
          id: 'test-agent-id',
          name: 'Test Agent',
          status: 'DRAFT',
          events: [
            {
              id: '1',
              step: 1,
              action: 'navigate',
              target: 'https://example.com',
              url: 'https://example.com',
              elementType: 'a',
              elementText: 'Example Link',
              screenshotUrl: 'https://example.com/screenshot1.jpg',
              createdAt: '2024-01-01T00:00:00Z',
            },
          ],
          llmSummary: 'Test summary',
          eventLog: JSON.stringify([]),
          transcript: 'Test transcript',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAgentData),
      });

      const { result } = renderHook(() => useReviewAgent('test-agent-id'));

      await waitFor(() => {
        expect(result.current.agentReviewData).toBeDefined();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/agents/test-agent-id/review',
        expect.objectContaining({
          credentials: 'include',
        })
      );
    });

    it('should submit agent review', async () => {
      const mockResponse = { success: true };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useReviewAgent('test-agent-id'));

      const reviewData = {
        decision: 'ACCEPT' as const,
        userContext: 'This agent looks good for production use.',
      };

      await result.current.submitReview(reviewData);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/agents/test-agent-id/review',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reviewData),
          credentials: 'include',
        })
      );
    });

    it('should validate review data', async () => {
      const { result } = renderHook(() => useReviewAgent('test-agent-id'));

      const invalidReviewData = {
        decision: 'ACCEPT' as const,
        userContext: '', // Empty context should fail validation
      };

      await expect(result.current.submitReview(invalidReviewData)).rejects.toThrow();
    });

    it('should handle API errors', async () => {
      const mockError = { error: 'Failed to fetch agent review data' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(mockError),
      });

      const { result } = renderHook(() => useReviewAgent('test-agent-id'));

      await waitFor(() => {
        expect(result.current.errorReview).toBeDefined();
      });
    });
  });

  describe('useSummarizeAgent', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { 
        agent: { 
          id: 'test-agent-id',
          llmSummary: 'Generated summary of the agent workflow.',
        },
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useSummarizeAgent());

      const testData = {
        eventLog: [
          {
            step: 1,
            action: 'navigate',
            target: 'https://example.com',
            url: 'https://example.com',
            elementType: 'a',
            elementText: 'Example Link',
            timestamp: 1704067200000,
          },
        ],
        transcript: 'User navigated to the website.',
      };

      await result.current.trigger('test-agent-id', { arg: testData });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/agents/test-agent-id/summarize',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testData),
          credentials: 'include',
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      const mockError = { error: 'Failed to summarize agent' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(mockError),
      });

      const { result } = renderHook(() => useSummarizeAgent());

      const testData = {
        eventLog: [],
        transcript: '',
      };

      await expect(result.current.trigger('test-agent-id', { arg: testData })).rejects.toThrow('Failed to summarize agent');
    });

    it('should validate input data', async () => {
      const { result } = renderHook(() => useSummarizeAgent());

      const invalidData = {
        eventLog: 'invalid', // Should be array
        transcript: 123, // Should be string
      };

      await expect(result.current.trigger('test-agent-id', { arg: invalidData as any })).rejects.toThrow();
    });
  });

  describe('Hook Integration', () => {
    it('should work together in a complete workflow', async () => {
      // Mock successful responses for all hooks
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            agent: {
              id: 'test-agent-id',
              name: 'Test Agent',
              status: 'DRAFT',
              events: [],
              llmSummary: null,
              eventLog: JSON.stringify([]),
              transcript: null,
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            agent: {
              id: 'test-agent-id',
              llmSummary: 'Generated summary',
            },
          }),
        });

      const { result: recordResult } = renderHook(() => useRecordEvents());
      const { result: reviewResult } = renderHook(() => useReviewAgent('test-agent-id'));
      const { result: summarizeResult } = renderHook(() => useSummarizeAgent());

      // Test the complete workflow
      const eventData = {
        agentId: 'test-agent-id',
        eventLog: [
          {
            step: 1,
            action: 'navigate',
            target: 'https://example.com',
            url: 'https://example.com',
            elementType: 'a',
            elementText: 'Example Link',
            screenshot: 'data:image/jpeg;base64,test',
            timestamp: 1704067200000,
          },
        ],
      };

      await recordResult.current.trigger(eventData);
      await waitFor(() => expect(reviewResult.current.agentReviewData).toBeDefined());
      
      const summarizeData = {
        eventLog: eventData.eventLog,
        transcript: 'User navigated to the website.',
      };
      
      await summarizeResult.current.trigger('test-agent-id', { arg: summarizeData });

      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useRecordEvents());

      const testData = {
        agentId: 'test-agent-id',
        eventLog: [],
      };

      await expect(result.current.trigger(testData)).rejects.toThrow('Network error');
    });

    it('should handle malformed JSON responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const { result } = renderHook(() => useReviewAgent('test-agent-id'));

      await waitFor(() => {
        expect(result.current.errorReview).toBeDefined();
      });
    });

    it('should handle 500 server errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      });

      const { result } = renderHook(() => useSummarizeAgent());

      const testData = {
        eventLog: [],
        transcript: '',
      };

      await expect(result.current.trigger('test-agent-id', { arg: testData })).rejects.toThrow('Internal server error');
    });
  });
});
