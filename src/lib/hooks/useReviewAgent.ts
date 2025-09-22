import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { z } from 'zod';

const API_BASE = '/api';

// Define the schema for the GET /api/agents/[id]/review response
const agentReviewResponseSchema = z.object({
  agent: z.object({
    id: z.string(),
    name: z.string(),
    recordingUrl: z.string().optional(),
    audioUrl: z.string().optional(),
    llmSummary: z.string().optional(),
    userContext: z.string().optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'REJECTED', 'INACTIVE']),
    processingStatus: z.string().optional(),
    processingProgress: z.number().optional(),
    eventLog: z.string().optional(), // JSON string of EventLogEntry[]
    transcript: z.string().optional(),
    events: z.array(z.object({
      id: z.string(),
      step: z.number(),
      action: z.string(),
      target: z.string().optional(),
      url: z.string().optional(),
      elementType: z.string().optional(),
      elementText: z.string().optional(),
      screenshotUrl: z.string().optional(),
      createdAt: z.string(),
    })).optional(),
  }),
});

export type AgentReviewData = z.infer<typeof agentReviewResponseSchema>['agent'];

// Define the schema for the POST /api/agents/[id]/review request
const postReviewAgentSchema = z.object({
  userContext: z.string().min(1, 'User context is required when accepting').max(1000, 'User context too long').optional(),
  decision: z.enum(['ACCEPT', 'REJECT']),
}).refine(data => {
  if (data.decision === 'ACCEPT' && (!data.userContext || data.userContext.trim() === '')) {
    return false; // userContext is required for ACCEPT
  }
  return true;
}, {
  message: 'User context is required when accepting the agent',
  path: ['userContext'],
});

export type PostReviewAgentInput = z.infer<typeof postReviewAgentSchema>;

async function fetchAgentReview(url: string): Promise<AgentReviewData> {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch agent review data');
  }
  const data = await response.json();
  const validatedData = agentReviewResponseSchema.parse(data);
  return validatedData.agent;
}

async function postAgentReview(
  url: string,
  { arg }: { arg: PostReviewAgentInput }
) {
  const validatedArg = postReviewAgentSchema.parse(arg);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(validatedArg),
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to submit agent review');
  }
  return response.json();
}

export function useReviewAgent(agentId: string) {
  const { data, error, isLoading, mutate } = useSWR<AgentReviewData, Error>(
    agentId ? `${API_BASE}/agents/${agentId}/review` : null,
    fetchAgentReview
  );

  const { trigger: submitReview, isMutating: isSubmitting } = useSWRMutation<unknown, Error, string, PostReviewAgentInput>(
    agentId ? `${API_BASE}/agents/${agentId}/review` : '',
    postAgentReview
  );

  return {
    agentReviewData: data,
    isLoadingReview: isLoading,
    errorReview: error,
    submitReview,
    isSubmittingReview: isSubmitting,
    mutateReview: mutate,
  };
}