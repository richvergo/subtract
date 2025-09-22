import useSWRMutation from 'swr/mutation';
import { SummarizeWithEventsInput } from '@/lib/schemas/agents';

const API_BASE = '/api';

async function summarizeAgentFetcher(
  url: string,
  { arg }: { arg: SummarizeWithEventsInput }
) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(arg),
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to summarize agent');
  }
  return response.json();
}

export function useSummarizeAgent(agentId: string) {
  return useSWRMutation<unknown, Error, string, SummarizeWithEventsInput>(
    `${API_BASE}/agents/${agentId}/summarize`,
    summarizeAgentFetcher
  );
}