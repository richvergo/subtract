/**
 * API helper functions for Agents frontend
 */

// Types
export interface Login {
  id: string;
  name: string;
  loginUrl: string;
  username: string; // masked
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  status: 'DRAFT' | 'ACTIVE';
  agentConfig: any[];
  createdAt: string;
  updatedAt: string;
  latestRuns?: AgentRun[];
}

export interface AgentRun {
  id: string;
  agentId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  startedAt: string;
  finishedAt: string | null;
  logs: any;
  outputPath: string | null;
  screenshotPath: string | null;
  userConfirmed: boolean | null;
  userFeedback: string | null;
  createdAt: string;
}

export interface CreateLoginData {
  name: string;
  loginUrl: string;
  username: string;
  password?: string;
  oauthToken?: string;
}

export interface CreateAgentData {
  name: string;
  description?: string;
  agentConfig: any[];
}


export interface ConfirmRunData {
  activateAgent?: boolean;
}

export interface RejectRunData {
  feedback: string;
}

// API Base URL
const API_BASE = '/api';

// Helper function to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}


// Logins API
export const loginsApi = {
  // Get all logins
  async getAll(): Promise<Login[]> {
    const response = await fetch(`${API_BASE}/logins`);
    return handleResponse<Login[]>(response);
  },

  // Create login
  async create(data: CreateLoginData): Promise<Login> {
    const response = await fetch(`${API_BASE}/logins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Login>(response);
  },

  // Delete login
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/logins/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
  },
};

// Agents API
export const agentsApi = {
  // Get all agents
  async getAll(): Promise<Agent[]> {
    const response = await fetch(`${API_BASE}/agents`);
    return handleResponse<Agent[]>(response);
  },

  // Get agent by ID
  async getById(id: string): Promise<Agent> {
    const response = await fetch(`${API_BASE}/agents/${id}`);
    return handleResponse<Agent>(response);
  },

  // Create agent
  async create(data: CreateAgentData): Promise<Agent> {
    const response = await fetch(`${API_BASE}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Agent>(response);
  },


  // Run agent
  async run(id: string): Promise<{ runId: string; jobId: string }> {
    const response = await fetch(`${API_BASE}/agents/${id}/run`, {
      method: 'POST',
    });
    return handleResponse<{ runId: string; jobId: string }>(response);
  },

  // Get agent runs
  async getRuns(id: string): Promise<AgentRun[]> {
    const response = await fetch(`${API_BASE}/agents/${id}/runs`);
    return handleResponse<AgentRun[]>(response);
  },
};

// Agent Runs API
export const agentRunsApi = {
  // Confirm run
  async confirm(id: string, data: ConfirmRunData = {}): Promise<void> {
    const response = await fetch(`${API_BASE}/agent-runs/${id}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
  },

  // Reject run
  async reject(id: string, data: RejectRunData): Promise<void> {
    const response = await fetch(`${API_BASE}/agent-runs/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
  },
};
