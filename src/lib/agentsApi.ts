/**
 * Agents-specific API utilities with normalization
 * This file contains the normalization layer specifically for Agents, Logins, and Runs
 */

import useSWR from "swr";

// Types (re-exported from main api.ts for convenience)
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
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  agentConfig: unknown[];
  purposePrompt: string | null;
  agentIntents?: Array<{
    action: string;
    selector?: string;
    intent: string;
    stepIndex: number;
    metadata?: unknown;
  }>;
  createdAt: string;
  updatedAt: string;
  latestRuns?: AgentRun[];
}

export interface AgentRun {
  id: string;
  agentId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REQUIRES_CONFIRMATION' | 'CONFIRMED' | 'REJECTED';
  startedAt: string;
  finishedAt: string | null;
  logs: unknown;
  screenshot: string | null;
  prompt: string | null;
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
  agentConfig: unknown[];
}


export interface ConfirmRunData {
  activateAgent?: boolean;
}

export interface RejectRunData {
  feedback: string;
}

// API Base URL
const API_BASE = '/api';

// Centralized array fetcher that normalizes API responses for Agents feature
export async function fetchArray(url: string, key: string): Promise<unknown[]> {
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return [];
    
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && Array.isArray(data[key])) {
      return data[key];
    }
    return [];
  } catch (error) {
    // Handle network errors, JSON parsing errors, and any other errors
    console.warn(`Failed to fetch array from ${url}:`, error);
    return [];
  }
}

// SWR Hooks for normalized data fetching (Agents feature only)
export function useAgents() {
  return useSWR("/api/agents", (url) => fetchArray(url, "agents"));
}

export function useLogins() {
  return useSWR("/api/logins", (url) => fetchArray(url, "logins"));
}

export function useAgentRuns(agentId: string | null) {
  return useSWR(
    agentId ? `/api/agents/${agentId}/runs` : null,
    (url) => fetchArray(url, "runs")
  );
}

// Raw API functions for Agents feature (these return raw responses, not normalized)
// These are used for mutations and operations that need the full response

// Helper function to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

// Logins API (raw responses)
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

// Agents API (raw responses)
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
  async run(id: string, prompt?: string): Promise<{ runId: string; jobId: string }> {
    const response = await fetch(`${API_BASE}/agents/${id}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    return handleResponse<{ runId: string; jobId: string }>(response);
  },

  // Get agent runs
  async getRuns(id: string): Promise<AgentRun[]> {
    const response = await fetch(`${API_BASE}/agents/${id}/runs`);
    return handleResponse<AgentRun[]>(response);
  },
};

// Agent Runs API (raw responses)
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
