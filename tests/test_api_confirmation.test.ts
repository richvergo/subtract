/**
 * API Integration tests for agent run confirmation endpoints
 * Tests: POST /api/agent-runs/[id]/confirm and /reject
 */

import { testDb, createTestUser, createTestLogin, createTestAgent } from './setup';
import { RunStatus, AgentStatus } from '@prisma/client';

// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock the auth options
jest.mock('../src/lib/auth', () => ({
  authOptions: {},
}));

describe('API Confirmation Tests', () => {
  let testUser: any;
  let otherUser: any;
  let testLogin: any;
  let testAgent: any;
  let agentRun: any;
  let mockSession: any;

  beforeEach(async () => {
    // Create test users
    const timestamp = Date.now();
    testUser = await createTestUser(`api-confirmation-${timestamp}@example.com`);
    otherUser = await createTestUser(`other-api-user-${timestamp}@example.com`);
    
    // Create test login and agent
    testLogin = await createTestLogin(testUser.id, `API Test Login ${timestamp}`);
    testAgent = await createTestAgent(testUser.id, `API Test Agent ${timestamp}`);

    // Create agent-login association
    await testDb.agentLogin.create({
      data: {
        agentId: testAgent.id,
        loginId: testLogin.id,
      },
    });

    // Create a test agent run
    agentRun = await testDb.agentRun.create({
      data: {
        agentId: testAgent.id,
        status: RunStatus.SUCCESS,
        logs: { actions: [{ message: 'Test execution' }] },
        screenshotPath: '/test/screenshot.png',
        finishedAt: new Date(),
      },
    });

    // Mock session
    mockSession = {
      user: {
        id: testUser.id,
        email: testUser.email,
      },
    };
  });

  afterEach(async () => {
    // Clean up test data
    await testDb.agentRun.deleteMany();
    await testDb.agentLogin.deleteMany();
    await testDb.agent.deleteMany();
    await testDb.login.deleteMany();
    await testDb.membership.deleteMany();
    await testDb.user.deleteMany();
    await testDb.entity.deleteMany();
  });

  describe('POST /api/agent-runs/[id]/confirm', () => {
    it('should confirm an agent run successfully', async () => {
      // Mock authentication
      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValue(mockSession);

      // Import the route handler
      const { POST } = await import('../src/app/api/agent-runs/[id]/confirm/route');

      // Create mock request
      const request = new Request('http://localhost:3000/api/agent-runs/test/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activateAgent: false }),
      });

      // Call the endpoint
      const response = await POST(request, { params: { id: agentRun.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Agent run confirmed successfully');
      expect(data.data.run.userConfirmed).toBe(true);
      expect(data.data.run.userFeedback).toBeNull();

      // Verify database was updated
      const updatedRun = await testDb.agentRun.findUnique({
        where: { id: agentRun.id },
      });
      expect(updatedRun?.userConfirmed).toBe(true);
      expect(updatedRun?.userFeedback).toBeNull();
    });

    it('should confirm an agent run and activate the agent', async () => {
      // Mock authentication
      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValue(mockSession);

      // Import the route handler
      const { POST } = await import('../src/app/api/agent-runs/[id]/confirm/route');

      // Create mock request
      const request = new Request('http://localhost:3000/api/agent-runs/test/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activateAgent: true }),
      });

      // Call the endpoint
      const response = await POST(request, { params: { id: agentRun.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.run.userConfirmed).toBe(true);
      expect(data.data.agent.status).toBe(AgentStatus.ACTIVE);

      // Verify database was updated
      const updatedRun = await testDb.agentRun.findUnique({
        where: { id: agentRun.id },
      });
      const updatedAgent = await testDb.agent.findUnique({
        where: { id: testAgent.id },
      });

      expect(updatedRun?.userConfirmed).toBe(true);
      expect(updatedAgent?.status).toBe(AgentStatus.ACTIVE);
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Mock no authentication
      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValue(null);

      // Import the route handler
      const { POST } = await import('../src/app/api/agent-runs/[id]/confirm/route');

      // Create mock request
      const request = new Request('http://localhost:3000/api/agent-runs/test/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activateAgent: false }),
      });

      // Call the endpoint
      const response = await POST(request, { params: { id: agentRun.id } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 for runs owned by other users', async () => {
      // Mock authentication for other user
      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValue({
        user: {
          id: otherUser.id,
          email: otherUser.email,
        },
      });

      // Import the route handler
      const { POST } = await import('../src/app/api/agent-runs/[id]/confirm/route');

      // Create mock request
      const request = new Request('http://localhost:3000/api/agent-runs/test/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activateAgent: false }),
      });

      // Call the endpoint
      const response = await POST(request, { params: { id: agentRun.id } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return 404 for non-existent runs', async () => {
      // Mock authentication
      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValue(mockSession);

      // Import the route handler
      const { POST } = await import('../src/app/api/agent-runs/[id]/confirm/route');

      // Create mock request
      const request = new Request('http://localhost:3000/api/agent-runs/test/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activateAgent: false }),
      });

      // Call the endpoint with non-existent ID
      const response = await POST(request, { params: { id: 'non-existent-id' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Agent run not found');
    });

    it('should return 400 for invalid request data', async () => {
      // Mock authentication
      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValue(mockSession);

      // Import the route handler
      const { POST } = await import('../src/app/api/agent-runs/[id]/confirm/route');

      // Create mock request with invalid data
      const request = new Request('http://localhost:3000/api/agent-runs/test/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activateAgent: 'invalid' }),
      });

      // Call the endpoint
      const response = await POST(request, { params: { id: agentRun.id } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });
  });

  describe('POST /api/agent-runs/[id]/reject', () => {
    it('should reject an agent run with feedback', async () => {
      // Mock authentication
      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValue(mockSession);

      // Import the route handler
      const { POST } = await import('../src/app/api/agent-runs/[id]/reject/route');

      // Create mock request
      const feedback = 'The automation clicked the wrong button';
      const request = new Request('http://localhost:3000/api/agent-runs/test/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      });

      // Call the endpoint
      const response = await POST(request, { params: { id: agentRun.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Agent run rejected successfully');
      expect(data.data.run.userConfirmed).toBe(false);
      expect(data.data.run.userFeedback).toBe(feedback);

      // Verify database was updated
      const updatedRun = await testDb.agentRun.findUnique({
        where: { id: agentRun.id },
      });
      expect(updatedRun?.userConfirmed).toBe(false);
      expect(updatedRun?.userFeedback).toBe(feedback);
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Mock no authentication
      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValue(null);

      // Import the route handler
      const { POST } = await import('../src/app/api/agent-runs/[id]/reject/route');

      // Create mock request
      const request = new Request('http://localhost:3000/api/agent-runs/test/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: 'Test feedback' }),
      });

      // Call the endpoint
      const response = await POST(request, { params: { id: agentRun.id } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 for runs owned by other users', async () => {
      // Mock authentication for other user
      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValue({
        user: {
          id: otherUser.id,
          email: otherUser.email,
        },
      });

      // Import the route handler
      const { POST } = await import('../src/app/api/agent-runs/[id]/reject/route');

      // Create mock request
      const request = new Request('http://localhost:3000/api/agent-runs/test/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: 'Test feedback' }),
      });

      // Call the endpoint
      const response = await POST(request, { params: { id: agentRun.id } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return 404 for non-existent runs', async () => {
      // Mock authentication
      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValue(mockSession);

      // Import the route handler
      const { POST } = await import('../src/app/api/agent-runs/[id]/reject/route');

      // Create mock request
      const request = new Request('http://localhost:3000/api/agent-runs/test/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: 'Test feedback' }),
      });

      // Call the endpoint with non-existent ID
      const response = await POST(request, { params: { id: 'non-existent-id' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Agent run not found');
    });

    it('should return 400 for invalid request data', async () => {
      // Mock authentication
      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValue(mockSession);

      // Import the route handler
      const { POST } = await import('../src/app/api/agent-runs/[id]/reject/route');

      // Create mock request with invalid data (empty feedback)
      const request = new Request('http://localhost:3000/api/agent-runs/test/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: '' }),
      });

      // Call the endpoint
      const response = await POST(request, { params: { id: agentRun.id } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('should return 400 for missing feedback', async () => {
      // Mock authentication
      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValue(mockSession);

      // Import the route handler
      const { POST } = await import('../src/app/api/agent-runs/[id]/reject/route');

      // Create mock request without feedback
      const request = new Request('http://localhost:3000/api/agent-runs/test/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      // Call the endpoint
      const response = await POST(request, { params: { id: agentRun.id } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });
  });

  describe('Integration with Agent Runs Endpoint', () => {
    it('should include confirmation data in runs list', async () => {
      // Confirm a run
      await testDb.agentRun.update({
        where: { id: agentRun.id },
        data: {
          userConfirmed: true,
          userFeedback: null,
        },
      });

      // Create another run that was rejected
      const rejectedRun = await testDb.agentRun.create({
        data: {
          agentId: testAgent.id,
          status: RunStatus.SUCCESS,
          userConfirmed: false,
          userFeedback: 'This run had issues',
        },
      });

      // Fetch runs (simulating the GET /api/agents/[id]/runs endpoint)
      const runs = await testDb.agentRun.findMany({
        where: { agentId: testAgent.id },
        orderBy: { startedAt: 'desc' },
      });

      expect(runs).toHaveLength(2);
      expect(runs[0].userConfirmed).toBe(false); // Rejected run (newer)
      expect(runs[0].userFeedback).toBe('This run had issues');
      expect(runs[1].userConfirmed).toBe(true);  // Confirmed run (older)
      expect(runs[1].userFeedback).toBeNull();
    });
  });
});
