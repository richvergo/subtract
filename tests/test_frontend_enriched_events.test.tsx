/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the hooks
jest.mock('@/lib/hooks', () => ({
  useRecordEvents: () => ({
    trigger: jest.fn(),
    isMutating: false,
    error: null,
  }),
  useReviewAgent: (agentId: string) => ({
    agentReviewData: {
      id: agentId,
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
        {
          id: '2',
          step: 2,
          action: 'click',
          target: '#login-button',
          url: 'https://example.com/login',
          elementType: 'button',
          elementText: 'Login',
          screenshotUrl: 'https://example.com/screenshot2.jpg',
          createdAt: '2024-01-01T00:01:00Z',
        },
      ],
      llmSummary: 'This agent navigates to example.com and clicks the login button.',
      eventLog: JSON.stringify([
        {
          step: 1,
          action: 'navigate',
          target: 'https://example.com',
          url: 'https://example.com',
          elementType: 'a',
          elementText: 'Example Link',
          timestamp: 1704067200000,
        },
        {
          step: 2,
          action: 'click',
          target: '#login-button',
          url: 'https://example.com/login',
          elementType: 'button',
          elementText: 'Login',
          timestamp: 1704067260000,
        },
      ]),
      transcript: 'User navigated to the website and clicked the login button.',
    },
    isLoadingReview: false,
    errorReview: null,
    submitReview: jest.fn(),
    isSubmittingReview: false,
    mutateReview: jest.fn(),
  }),
  useSummarizeAgent: () => ({
    trigger: jest.fn(),
    isMutating: false,
    error: null,
  }),
}));

// Import components after mocking
import { EventTimeline, ScreenshotGallery, SummaryPanel } from '@/app/components';

describe('Frontend Enriched Events Components', () => {
  const mockEvents = [
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
    {
      id: '2',
      step: 2,
      action: 'click',
      target: '#login-button',
      url: 'https://example.com/login',
      elementType: 'button',
      elementText: 'Login',
      screenshotUrl: 'https://example.com/screenshot2.jpg',
      createdAt: '2024-01-01T00:01:00Z',
    },
  ];

  describe('EventTimeline', () => {
    it('renders events in correct order', () => {
      render(<EventTimeline events={mockEvents} />);
      
      expect(screen.getByText(/🛠️ Step-by-Step Actions/)).toBeInTheDocument();
      expect(screen.getByText('Step 1')).toBeInTheDocument();
      expect(screen.getByText('Step 2')).toBeInTheDocument();
    });

    it('displays action icons correctly', () => {
      render(<EventTimeline events={mockEvents} />);
      
      expect(screen.getByText('🌐')).toBeInTheDocument(); // navigate
      expect(screen.getByText('👆')).toBeInTheDocument(); // click
    });

    it('shows event details', () => {
      render(<EventTimeline events={mockEvents} />);
      
      expect(screen.getByText('Navigate')).toBeInTheDocument();
      expect(screen.getByText('Click')).toBeInTheDocument();
      expect(screen.getByText('Example Link')).toBeInTheDocument();
      expect(screen.getByText('Login')).toBeInTheDocument();
    });

    it('handles empty events array', () => {
      render(<EventTimeline events={[]} />);
      
      expect(screen.getByText('📋')).toBeInTheDocument();
      expect(screen.getByText('No events recorded for this agent.')).toBeInTheDocument();
    });

    it('sorts events by step number', () => {
      const unsortedEvents = [
        { ...mockEvents[1], step: 3 },
        { ...mockEvents[0], step: 1 },
        { ...mockEvents[0], step: 2, id: '3' },
      ];
      
      render(<EventTimeline events={unsortedEvents} />);
      
      const stepElements = screen.getAllByText(/Step \d+/);
      expect(stepElements[0]).toHaveTextContent('Step 1');
      expect(stepElements[1]).toHaveTextContent('Step 2');
      expect(stepElements[2]).toHaveTextContent('Step 3');
    });
  });

  describe('ScreenshotGallery', () => {
    it('renders screenshot thumbnails', () => {
      render(<ScreenshotGallery events={mockEvents} />);
      
      expect(screen.getByText(/📸 Screenshots/)).toBeInTheDocument();
      expect(screen.getByAltText('Screenshot for step 1')).toBeInTheDocument();
      expect(screen.getByAltText('Screenshot for step 2')).toBeInTheDocument();
    });

    it('opens modal when thumbnail is clicked', async () => {
      render(<ScreenshotGallery events={mockEvents} />);
      
      const thumbnail = screen.getByAltText('Screenshot for step 1');
      fireEvent.click(thumbnail);
      
      await waitFor(() => {
        expect(screen.getByText('Screenshot for Step 1: navigate')).toBeInTheDocument();
        expect(screen.getByAltText('Step 1 Full Screenshot')).toBeInTheDocument();
      });
    });

    it('closes modal when close button is clicked', async () => {
      render(<ScreenshotGallery events={mockEvents} />);
      
      const thumbnail = screen.getByAltText('Screenshot for step 1');
      fireEvent.click(thumbnail);
      
      await waitFor(() => {
        expect(screen.getByText('Screenshot for Step 1: navigate')).toBeInTheDocument();
      });
      
      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Screenshot for Step 1: navigate')).not.toBeInTheDocument();
      });
    });

    it('handles events without screenshots', () => {
      const eventsWithoutScreenshots = [
        { ...mockEvents[0], screenshotUrl: undefined },
        { ...mockEvents[1], screenshotUrl: null },
      ];
      
      render(<ScreenshotGallery events={eventsWithoutScreenshots} />);
      
      expect(screen.getByText('📸')).toBeInTheDocument();
      expect(screen.getByText('No screenshots available')).toBeInTheDocument();
    });

    it('displays event metadata in modal', async () => {
      render(<ScreenshotGallery events={mockEvents} />);
      
      const thumbnail = screen.getByAltText('Screenshot for step 1');
      fireEvent.click(thumbnail);
      
      await waitFor(() => {
        expect(screen.getByText('Target:')).toBeInTheDocument();
        expect(screen.getByText('https://example.com')).toBeInTheDocument();
        expect(screen.getByText('URL:')).toBeInTheDocument();
        expect(screen.getByText('https://example.com')).toBeInTheDocument();
      });
    });
  });

  describe('SummaryPanel', () => {
    const mockProps = {
      agentId: 'test-agent-id',
      llmSummary: 'This agent navigates to example.com and clicks the login button.',
      eventLog: mockEvents,
      transcript: 'User navigated to the website and clicked the login button.',
      onSummaryUpdate: jest.fn(),
    };

    it('renders AI summary by default', () => {
      render(<SummaryPanel {...mockProps} />);
      
      expect(screen.getByText('📋 AI Summary')).toBeInTheDocument();
      expect(screen.getByText('AI Summary')).toBeInTheDocument();
      expect(screen.getByText('Raw Events')).toBeInTheDocument();
      expect(screen.getByText(mockProps.llmSummary!)).toBeInTheDocument();
    });

    it('toggles between summary and raw events view', () => {
      render(<SummaryPanel {...mockProps} />);
      
      const rawEventsButton = screen.getByText('Raw Events');
      fireEvent.click(rawEventsButton);
      
      expect(screen.getByText('1. navigate on https://example.com')).toBeInTheDocument();
      expect(screen.getByText('2. click targeting "#login-button"')).toBeInTheDocument();
    });

    it('shows re-run summarization button', () => {
      render(<SummaryPanel {...mockProps} />);
      
      expect(screen.getByText('🔄 Re-run Summarization')).toBeInTheDocument();
    });

    it('handles missing summary gracefully', () => {
      render(<SummaryPanel {...mockProps} llmSummary={undefined} />);
      
      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(screen.getByText('No AI summary available yet')).toBeInTheDocument();
    });

    it('displays transcript in raw events view', () => {
      render(<SummaryPanel {...mockProps} />);
      
      const rawEventsButton = screen.getByText('Raw Events');
      fireEvent.click(rawEventsButton);
      
      expect(screen.getByText('🎤 Voice Transcript')).toBeInTheDocument();
      expect(screen.getByText('Click to view transcript')).toBeInTheDocument();
    });

    it('calls onSummaryUpdate when summary is provided', () => {
      render(<SummaryPanel {...mockProps} />);
      
      expect(mockProps.onSummaryUpdate).toHaveBeenCalledWith(mockProps.llmSummary);
    });

    it('handles empty event log', () => {
      render(<SummaryPanel {...mockProps} eventLog={[]} />);
      
      const rawEventsButton = screen.getByText('Raw Events');
      fireEvent.click(rawEventsButton);
      
      expect(screen.getByText('📋')).toBeInTheDocument();
      expect(screen.getByText('No raw events available')).toBeInTheDocument();
    });
  });

  describe('Integration Tests', () => {
    it('components work together with consistent data', () => {
      const { container } = render(
        <div>
          <EventTimeline events={mockEvents} />
          <ScreenshotGallery events={mockEvents} />
          <SummaryPanel
            agentId="test-agent-id"
            llmSummary="Test summary"
            eventLog={mockEvents}
            transcript="Test transcript"
            onSummaryUpdate={jest.fn()}
          />
        </div>
      );
      
      expect(container).toBeInTheDocument();
      expect(screen.getByText(/🛠️ Step-by-Step Actions/)).toBeInTheDocument();
      expect(screen.getByText(/📸 Screenshots/)).toBeInTheDocument();
      expect(screen.getByText('📋 AI Summary')).toBeInTheDocument();
    });

    it('handles tool name extraction correctly', () => {
      const googleDocsEvents = [
        {
          ...mockEvents[0],
          url: 'https://docs.google.com/document/d/123',
        },
      ];
      
      render(<EventTimeline events={googleDocsEvents} />);
      
      expect(screen.getByText('Tool: Google Docs')).toBeInTheDocument();
    });
  });
});
