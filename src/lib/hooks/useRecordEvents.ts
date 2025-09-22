import useSWRMutation from 'swr/mutation';
import { RecordWorkflowWithEventsInput } from '@/lib/schemas/agents';

const API_BASE = '/api';

async function recordEventsFetcher(
  url: string,
  { arg }: { arg: RecordWorkflowWithEventsInput }
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
    throw new Error(errorData.error || 'Failed to record events');
  }
  return response.json();
}

export function useRecordEvents() {
  return useSWRMutation<unknown, Error, string, RecordWorkflowWithEventsInput>(
    `${API_BASE}/agents/record-events`,
    recordEventsFetcher
  );
}
