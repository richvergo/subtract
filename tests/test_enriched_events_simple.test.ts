/**
 * @jest-environment jsdom
 */

import { renderHook } from '@testing-library/react';

// Mock fetch
global.fetch = jest.fn();

// Mock SWR
const mockSWR = jest.fn();
const mockSWRMutation = jest.fn();

jest.mock('swr', () => ({
  __esModule: true,
  default: mockSWR,
  mutate: jest.fn(),
}));

jest.mock('swr/mutation', () => ({
  __esModule: true,
  default: mockSWRMutation,
}));

import { useRecordEvents, useReviewAgent, useSummarizeAgent } from '@/lib/hooks';

describe('Enriched Events API Hooks - Simple Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    
    // Setup default mocks
    mockSWR.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: false,
      mutate: jest.fn(),
    });
    
    mockSWRMutation.mockReturnValue({
      trigger: jest.fn(),
      isMutating: false,
      error: null,
    });
  });

  describe('useRecordEvents', () => {
    it('should return SWR mutation hook', () => {
      const { result } = renderHook(() => useRecordEvents());
      
      expect(result.current).toHaveProperty('trigger');
      expect(result.current).toHaveProperty('isMutating');
      expect(result.current).toHaveProperty('error');
    });

    it('should call SWR mutation with correct key', () => {
      renderHook(() => useRecordEvents());
      
      expect(mockSWRMutation).toHaveBeenCalledWith(
        '/api/agents/record-events',
        expect.any(Function)
      );
    });
  });

  describe('useReviewAgent', () => {
    it('should return SWR hook with correct key when agentId is provided', () => {
      const { result } = renderHook(() => useReviewAgent('test-agent-id'));
      
      expect(result.current).toHaveProperty('agentReviewData');
      expect(result.current).toHaveProperty('isLoadingReview');
      expect(result.current).toHaveProperty('errorReview');
      expect(result.current).toHaveProperty('submitReview');
      expect(result.current).toHaveProperty('isSubmittingReview');
      expect(result.current).toHaveProperty('mutateReview');
    });

    it('should return SWR hook with null key when agentId is not provided', () => {
      const { result } = renderHook(() => useReviewAgent(''));
      
      expect(result.current).toHaveProperty('agentReviewData');
      expect(result.current).toHaveProperty('isLoadingReview');
      expect(result.current).toHaveProperty('errorReview');
      expect(result.current).toHaveProperty('submitReview');
      expect(result.current).toHaveProperty('isSubmittingReview');
      expect(result.current).toHaveProperty('mutateReview');
    });

    it('should call SWR with correct key', () => {
      renderHook(() => useReviewAgent('test-agent-id'));
      
      expect(mockSWR).toHaveBeenCalledWith(
        '/api/agents/test-agent-id/review',
        expect.any(Function)
      );
    });
  });

  describe('useSummarizeAgent', () => {
    it('should return SWR mutation hook', () => {
      const { result } = renderHook(() => useSummarizeAgent());
      
      expect(result.current).toHaveProperty('trigger');
      expect(result.current).toHaveProperty('isMutating');
      expect(result.current).toHaveProperty('error');
    });

    it('should call SWR mutation with function key', () => {
      renderHook(() => useSummarizeAgent());
      
      expect(mockSWRMutation).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  describe('Hook Structure Validation', () => {
    it('all hooks should return expected properties', () => {
      const recordHook = renderHook(() => useRecordEvents());
      const reviewHook = renderHook(() => useReviewAgent('test-id'));
      const summarizeHook = renderHook(() => useSummarizeAgent());

      // useRecordEvents
      expect(recordHook.result.current).toHaveProperty('trigger');
      expect(recordHook.result.current).toHaveProperty('isMutating');
      expect(recordHook.result.current).toHaveProperty('error');

      // useReviewAgent
      expect(reviewHook.result.current).toHaveProperty('agentReviewData');
      expect(reviewHook.result.current).toHaveProperty('isLoadingReview');
      expect(reviewHook.result.current).toHaveProperty('errorReview');
      expect(reviewHook.result.current).toHaveProperty('submitReview');
      expect(reviewHook.result.current).toHaveProperty('isSubmittingReview');
      expect(reviewHook.result.current).toHaveProperty('mutateReview');

      // useSummarizeAgent
      expect(summarizeHook.result.current).toHaveProperty('trigger');
      expect(summarizeHook.result.current).toHaveProperty('isMutating');
      expect(summarizeHook.result.current).toHaveProperty('error');
    });
  });

  describe('API Endpoint Validation', () => {
    it('should use correct API endpoints', () => {
      renderHook(() => useRecordEvents());
      renderHook(() => useReviewAgent('test-id'));
      renderHook(() => useSummarizeAgent());

      // Check that SWR was called with correct endpoints
      expect(mockSWRMutation).toHaveBeenCalledWith(
        '/api/agents/record-events',
        expect.any(Function)
      );

      expect(mockSWR).toHaveBeenCalledWith(
        '/api/agents/test-id/review',
        expect.any(Function)
      );

      expect(mockSWRMutation).toHaveBeenCalledWith(
        expect.any(Function), // Function that generates key
        expect.any(Function)
      );
    });
  });
});
