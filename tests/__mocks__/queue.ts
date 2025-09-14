/**
 * Mock for queue module to avoid Redis dependency in tests
 */

export const agentRunsQueue = {
  add: jest.fn().mockResolvedValue({
    id: 'mock-job-id',
    data: { runId: 'mock-run-id', agentId: 'mock-agent-id', ownerId: 'mock-owner-id' }
  }),
  close: jest.fn().mockResolvedValue(undefined),
  isPaused: jest.fn().mockReturnValue(false),
  pause: jest.fn().mockResolvedValue(undefined),
  resume: jest.fn().mockResolvedValue(undefined),
};

export const enqueueAgentRun = jest.fn().mockResolvedValue({
  id: 'mock-job-id',
  data: { runId: 'mock-run-id', agentId: 'mock-agent-id', ownerId: 'mock-owner-id' }
});

export const validateAgentJobPayload = jest.fn().mockImplementation((payload) => payload);

export type AgentJobPayload = {
  runId: string;
  agentId: string;
  ownerId: string;
};
