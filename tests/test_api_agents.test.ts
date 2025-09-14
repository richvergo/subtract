/**
 * API integration tests for agents
 * Tests CRUD operations and run enqueuing
 */

// Mock the database to use test database
jest.mock('../src/lib/db', () => ({
  db: require('./setup').testDb,
}));

// Mock the queue module
jest.mock('../src/lib/queue', () => ({
  enqueueAgentRun: jest.fn().mockResolvedValue({
    id: 'job-123',
    data: { runId: 'run-123', agentId: 'agent-123', ownerId: 'user-123' },
  }),
}));

import { NextRequest } from 'next/server';
import { testDb, createTestUser, createTestLogin } from './setup';
import { SystemType, RunStatus } from '@prisma/client';

// Import the route handlers
import { GET as getAgents, POST as createAgent } from '../src/app/api/agents/route';
import { GET as getAgent, PUT as updateAgent, DELETE as deleteAgent } from '../src/app/api/agents/[id]/route';
import { POST as runAgent } from '../src/app/api/agents/[id]/run/route';
import { GET as getAgentRuns } from '../src/app/api/agents/[id]/runs/route';

describe('API Integration Tests - Agents', () => {
  let testUser: any;
  let testLogin: any;
  let mockSession: any;

  beforeEach(async () => {
    testUser = await createTestUser('test@example.com');
    testLogin = await createTestLogin(testUser.id, 'Test Login');
    
    // Update the centralized mock to return the correct user ID for this test
    const { mockGetServerSession } = require('next-auth');
    mockGetServerSession.mockResolvedValue({
      user: {
        email: 'test@example.com',
        id: testUser.id,
        name: 'Test User'
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  });

  describe('POST /api/agents', () => {
    it('should create an agent with valid configuration', async () => {
      const agentData = {
        name: 'Test Agent',
        description: 'A test agent for automation',
        loginIds: [testLogin.id],
        agentConfig: [
          { action: 'goto', url: 'https://example.com' },
          { action: 'waitForSelector', selector: 'body' },
          { action: 'click', selector: '#submit' },
        ],
        purposePrompt: 'Test agent purpose',
      };

      const req = new NextRequest('http://localhost:3000/api/agents', {
        method: 'POST',
        body: JSON.stringify(agentData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await createAgent(req);
      const responseData = await response.json();

      // Debug: log the response to understand what's happening
      console.log('Response status:', response.status);
      console.log('Response data:', responseData);

      expect(response.status).toBe(201);
      expect(responseData.agent).toBeDefined();
      expect(responseData.agent.name).toBe(agentData.name);
      expect(responseData.agent.description).toBe(agentData.description);
      expect(responseData.agent.schedule).toBe(agentData.schedule);
      expect(responseData.agent.agentConfig).toEqual(agentData.agentConfig);
      expect(responseData.agent.ownerId).toBe(testUser.id);
      expect(responseData.agent.logins).toHaveLength(1);
      expect(responseData.agent.logins[0].id).toBe(testLogin.id);

      // Verify agent was created in database
      const dbAgent = await testDb.agent.findUnique({
        where: { id: responseData.agent.id },
        include: {
          agentLogins: {
            include: {
              login: true,
            },
          },
        },
      });

      expect(dbAgent).toBeDefined();
      expect(dbAgent!.name).toBe(agentData.name);
      expect(dbAgent!.agentLogins).toHaveLength(1);
      expect(dbAgent!.agentLogins[0].loginId).toBe(testLogin.id);
    });

    it('should create agent without optional fields', async () => {
      const agentData = {
        name: 'Minimal Agent',
        loginIds: [testLogin.id],
        agentConfig: [
          { action: 'goto', url: 'https://example.com' },
        ],
        purposePrompt: 'Minimal agent purpose',
      };

      const req = new NextRequest('http://localhost:3000/api/agents', {
        method: 'POST',
        body: JSON.stringify(agentData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await createAgent(req);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.agent.name).toBe(agentData.name);
      expect(responseData.agent.description).toBeNull();
      expect(responseData.agent.schedule).toBeNull();
    });

    it('should reject agent with invalid configuration', async () => {
      const agentData = {
        name: 'Invalid Agent',
        loginIds: [testLogin.id],
        agentConfig: [
          { action: 'invalid', selector: '#element' },
        ],
        purposePrompt: 'Invalid agent purpose',
      };

      const req = new NextRequest('http://localhost:3000/api/agents', {
        method: 'POST',
        body: JSON.stringify(agentData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await createAgent(req);
      expect(response.status).toBe(400);
    });

    it('should reject agent with non-existent login IDs', async () => {
      const agentData = {
        name: 'Agent with Invalid Login',
        loginIds: ['non-existent-login-id'],
        agentConfig: [
          { action: 'goto', url: 'https://example.com' },
        ],
        purposePrompt: 'Agent with invalid login purpose',
      };

      const req = new NextRequest('http://localhost:3000/api/agents', {
        method: 'POST',
        body: JSON.stringify(agentData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await createAgent(req);
      expect(response.status).toBe(400);
    });

    it('should reject agent with empty login IDs', async () => {
      const agentData = {
        name: 'Agent with No Logins',
        loginIds: [],
        agentConfig: [
          { action: 'goto', url: 'https://example.com' },
        ],
        purposePrompt: 'Agent with no logins purpose',
      };

      const req = new NextRequest('http://localhost:3000/api/agents', {
        method: 'POST',
        body: JSON.stringify(agentData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await createAgent(req);
      expect(response.status).toBe(400);
    });

    it('should reject unauthenticated requests', async () => {
      const { mockGetServerSession } = require('next-auth');
      mockGetServerSession.mockResolvedValue(null);

      const agentData = {
        name: 'Test Agent',
        loginIds: [testLogin.id],
        agentConfig: [{ action: 'goto', url: 'https://example.com' }],
        purposePrompt: 'Test agent purpose',
      };

      const req = new NextRequest('http://localhost:3000/api/agents', {
        method: 'POST',
        body: JSON.stringify(agentData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await createAgent(req);
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/agents', () => {
    it('should return user agents with latest runs', async () => {
      // Create test agent
      const agent = await testDb.agent.create({
        data: {
          name: 'Test Agent',
          description: 'Test agent description',
          agentConfig: JSON.stringify([{ action: 'goto', url: 'https://example.com' }]),
          purposePrompt: 'Test agent purpose',
          ownerId: testUser.id,
        },
      });

      // Create agent-login association
      await testDb.agentLogin.create({
        data: {
          agentId: agent.id,
          loginId: testLogin.id,
        },
      });

      // Create agent runs
      await testDb.agentRun.create({
        data: {
          agentId: agent.id,
          status: RunStatus.COMPLETED,
          startedAt: new Date('2024-01-01T10:00:00Z'),
          finishedAt: new Date('2024-01-01T10:05:00Z'),
        },
      });

      await testDb.agentRun.create({
        data: {
          agentId: agent.id,
          status: RunStatus.FAILED,
          startedAt: new Date('2024-01-01T11:00:00Z'),
          finishedAt: new Date('2024-01-01T11:02:00Z'),
        },
      });

      const response = await getAgents();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.agents).toHaveLength(1);
      
      const returnedAgent = responseData.agents[0];
      expect(returnedAgent.id).toBe(agent.id);
      expect(returnedAgent.name).toBe('Test Agent');
      expect(returnedAgent.logins).toHaveLength(1);
      expect(returnedAgent.logins[0].id).toBe(testLogin.id);
      expect(returnedAgent.latestRuns).toHaveLength(2);
      expect(returnedAgent.latestRuns[0].status).toBe(RunStatus.FAILED); // Most recent first
    });

    it('should only return user own agents', async () => {
      // Create another user and their agent
      const otherUser = await createTestUser('other@example.com');
      await testDb.agent.create({
        data: {
          name: 'Other User Agent',
          agentConfig: JSON.stringify([{ action: 'goto', url: 'https://example.com' }]),
          purposePrompt: 'Other user agent purpose',
          ownerId: otherUser.id,
        },
      });

      // Create agent for test user
      await testDb.agent.create({
        data: {
          name: 'My Agent',
          agentConfig: JSON.stringify([{ action: 'goto', url: 'https://example.com' }]),
          purposePrompt: 'My agent purpose',
          ownerId: testUser.id,
        },
      });

      const response = await getAgents();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.agents).toHaveLength(1);
      expect(responseData.agents[0].name).toBe('My Agent');
    });

    it('should return empty array for user with no agents', async () => {
      const response = await getAgents();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.agents).toHaveLength(0);
    });
  });

  describe('GET /api/agents/[id]', () => {
    let testAgent: any;

    beforeEach(async () => {
      testAgent = await testDb.agent.create({
        data: {
          name: 'Test Agent',
          description: 'Test agent description',
          agentConfig: JSON.stringify([{ action: 'goto', url: 'https://example.com' }]),
          purposePrompt: 'Test agent purpose',
          ownerId: testUser.id,
        },
      });

      await testDb.agentLogin.create({
        data: {
          agentId: testAgent.id,
          loginId: testLogin.id,
        },
      });
    });

    it('should return agent details with run history', async () => {
      // Create agent runs
      await testDb.agentRun.create({
        data: {
          agentId: testAgent.id,
          status: RunStatus.COMPLETED,
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/agents/${testAgent.id}`);
      const response = await getAgent(req, { params: { id: testAgent.id } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.agent.id).toBe(testAgent.id);
      expect(responseData.agent.name).toBe('Test Agent');
      expect(responseData.agent.logins).toHaveLength(1);
      expect(responseData.agent.latestRuns).toHaveLength(1);
    });

    it('should return 404 for non-existent agent', async () => {
      const req = new NextRequest('http://localhost:3000/api/agents/non-existent-id');
      const response = await getAgent(req, { params: { id: 'non-existent-id' } });
      
      expect(response.status).toBe(404);
    });

    it('should return 404 for agent owned by another user', async () => {
      const otherUser = await createTestUser('other@example.com');
      const otherAgent = await testDb.agent.create({
        data: {
          name: 'Other Agent',
          agentConfig: JSON.stringify([{ action: 'goto', url: 'https://example.com' }]),
          purposePrompt: 'Other agent purpose',
          ownerId: otherUser.id,
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/agents/${otherAgent.id}`);
      const response = await getAgent(req, { params: { id: otherAgent.id } });
      
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/agents/[id]/run', () => {
    let testAgent: any;

    beforeEach(async () => {
      testAgent = await testDb.agent.create({
        data: {
          name: 'Test Agent',
          agentConfig: JSON.stringify([{ action: 'goto', url: 'https://example.com' }]),
          purposePrompt: 'Test agent purpose',
          ownerId: testUser.id,
        },
      });
    });

    it('should enqueue agent run and return job ID', async () => {
      const req = new NextRequest(`http://localhost:3000/api/agents/${testAgent.id}/run`, {
        method: 'POST',
      });

      const response = await runAgent(req, { params: { id: testAgent.id } });
      const responseData = await response.json();

      expect(response.status).toBe(202);
      expect(responseData.message).toBe('Agent run enqueued successfully');
      expect(responseData.runId).toBeDefined();
      expect(responseData.status).toBe('enqueued');
      expect(responseData.jobId).toBe('job-123');

      // Verify agent run was created in database
      const dbRun = await testDb.agentRun.findFirst({
        where: { agentId: testAgent.id },
      });

      expect(dbRun).toBeDefined();
      expect(dbRun!.status).toBe(RunStatus.PENDING);
    });

    it('should return 404 for non-existent agent', async () => {
      const req = new NextRequest('http://localhost:3000/api/agents/non-existent-id/run', {
        method: 'POST',
      });

      const response = await runAgent(req, { params: { id: 'non-existent-id' } });
      expect(response.status).toBe(404);
    });

    it('should return 404 for agent owned by another user', async () => {
      const otherUser = await createTestUser('other@example.com');
      const otherAgent = await testDb.agent.create({
        data: {
          name: 'Other Agent',
          agentConfig: JSON.stringify([{ action: 'goto', url: 'https://example.com' }]),
          purposePrompt: 'Other agent purpose',
          ownerId: otherUser.id,
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/agents/${otherAgent.id}/run`, {
        method: 'POST',
      });

      const response = await runAgent(req, { params: { id: otherAgent.id } });
      expect(response.status).toBe(404);
    });

    it('should handle queue enqueue failure', async () => {
      // Mock queue failure
      const { enqueueAgentRun } = require('../src/lib/queue');
      enqueueAgentRun.mockRejectedValueOnce(new Error('Queue error'));

      const req = new NextRequest(`http://localhost:3000/api/agents/${testAgent.id}/run`, {
        method: 'POST',
      });

      const response = await runAgent(req, { params: { id: testAgent.id } });
      expect(response.status).toBe(500);

      // Verify agent run was marked as failed
      const dbRun = await testDb.agentRun.findFirst({
        where: { agentId: testAgent.id },
      });

      expect(dbRun).toBeDefined();
      expect(dbRun!.status).toBe(RunStatus.FAILED);
    });
  });

  describe('GET /api/agents/[id]/runs', () => {
    let testAgent: any;

    beforeEach(async () => {
      testAgent = await testDb.agent.create({
        data: {
          name: 'Test Agent',
          agentConfig: JSON.stringify([{ action: 'goto', url: 'https://example.com' }]),
          purposePrompt: 'Test agent purpose',
          ownerId: testUser.id,
        },
      });
    });

    it('should return agent run history with pagination', async () => {
      // Create multiple agent runs
      for (let i = 0; i < 5; i++) {
        await testDb.agentRun.create({
          data: {
            agentId: testAgent.id,
            status: i % 2 === 0 ? RunStatus.COMPLETED : RunStatus.FAILED,
            startedAt: new Date(`2024-01-0${i + 1}T10:00:00Z`),
          },
        });
      }

      const req = new NextRequest(`http://localhost:3000/api/agents/${testAgent.id}/runs`);
      const response = await getAgentRuns(req, { params: { id: testAgent.id } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.runs).toHaveLength(5);
      expect(responseData.pagination).toBeDefined();
      expect(responseData.pagination.total).toBe(5);
      expect(responseData.pagination.page).toBe(1);
      expect(responseData.pagination.limit).toBe(20);

      // Verify runs are ordered by startedAt desc
      expect(responseData.runs[0].startedAt).toBe('2024-01-05T10:00:00.000Z');
      expect(responseData.runs[4].startedAt).toBe('2024-01-01T10:00:00.000Z');
    });

    it('should support pagination parameters', async () => {
      // Create 10 agent runs
      for (let i = 0; i < 10; i++) {
        await testDb.agentRun.create({
          data: {
            agentId: testAgent.id,
            status: RunStatus.COMPLETED,
            startedAt: new Date(`2024-01-0${i + 1}T10:00:00Z`),
          },
        });
      }

      const req = new NextRequest(`http://localhost:3000/api/agents/${testAgent.id}/runs?page=2&limit=3`);
      const response = await getAgentRuns(req, { params: { id: testAgent.id } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.runs).toHaveLength(3);
      expect(responseData.pagination.page).toBe(2);
      expect(responseData.pagination.limit).toBe(3);
      expect(responseData.pagination.total).toBe(10);
    });

    it('should return 404 for non-existent agent', async () => {
      const req = new NextRequest('http://localhost:3000/api/agents/non-existent-id/runs');
      const response = await getAgentRuns(req, { params: { id: 'non-existent-id' } });
      
      expect(response.status).toBe(404);
    });

    it('should return 404 for agent owned by another user', async () => {
      const otherUser = await createTestUser('other@example.com');
      const otherAgent = await testDb.agent.create({
        data: {
          name: 'Other Agent',
          agentConfig: JSON.stringify([{ action: 'goto', url: 'https://example.com' }]),
          purposePrompt: 'Other agent purpose',
          ownerId: otherUser.id,
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/agents/${otherAgent.id}/runs`);
      const response = await getAgentRuns(req, { params: { id: otherAgent.id } });
      
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/agents/[id]', () => {
    let testAgent: any;

    beforeEach(async () => {
      testAgent = await testDb.agent.create({
        data: {
          name: 'Test Agent',
          description: 'Original description',
          agentConfig: JSON.stringify([{ action: 'goto', url: 'https://example.com' }]),
          purposePrompt: 'Test agent purpose',
          ownerId: testUser.id,
        },
      });

      await testDb.agentLogin.create({
        data: {
          agentId: testAgent.id,
          loginId: testLogin.id,
        },
      });
    });

    it('should update agent configuration', async () => {
      const updateData = {
        name: 'Updated Agent Name',
        description: 'Updated description',
        agentConfig: [
          { action: 'goto', url: 'https://updated.com' },
          { action: 'waitForSelector', selector: '#new-element' },
        ],
        purposePrompt: 'Updated agent purpose',
      };

      const req = new NextRequest(`http://localhost:3000/api/agents/${testAgent.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await updateAgent(req, { params: { id: testAgent.id } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.agent.name).toBe('Updated Agent Name');
      expect(responseData.agent.description).toBe('Updated description');
      expect(responseData.agent.agentConfig).toEqual(updateData.agentConfig);

      // Verify database was updated
      const dbAgent = await testDb.agent.findUnique({
        where: { id: testAgent.id },
      });

      expect(dbAgent!.name).toBe('Updated Agent Name');
      expect(dbAgent!.agentConfig).toEqual(updateData.agentConfig);
    });

    it('should update login associations', async () => {
      const newLogin = await createTestLogin(testUser.id, 'New Login');
      
      const updateData = {
        loginIds: [newLogin.id],
      };

      const req = new NextRequest(`http://localhost:3000/api/agents/${testAgent.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await updateAgent(req, { params: { id: testAgent.id } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.agent.logins).toHaveLength(1);
      expect(responseData.agent.logins[0].id).toBe(newLogin.id);

      // Verify database associations were updated
      const dbAssociations = await testDb.agentLogin.findMany({
        where: { agentId: testAgent.id },
      });

      expect(dbAssociations).toHaveLength(1);
      expect(dbAssociations[0].loginId).toBe(newLogin.id);
    });

    it('should return 404 for non-existent agent', async () => {
      const updateData = { name: 'Updated Name' };
      const req = new NextRequest('http://localhost:3000/api/agents/non-existent-id', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await updateAgent(req, { params: { id: 'non-existent-id' } });
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/agents/[id]', () => {
    let testAgent: any;

    beforeEach(async () => {
      testAgent = await testDb.agent.create({
        data: {
          name: 'Test Agent',
          agentConfig: JSON.stringify([{ action: 'goto', url: 'https://example.com' }]),
          purposePrompt: 'Test agent purpose',
          ownerId: testUser.id,
        },
      });
    });

    it('should delete agent successfully', async () => {
      const req = new NextRequest(`http://localhost:3000/api/agents/${testAgent.id}`, {
        method: 'DELETE',
      });

      const response = await deleteAgent(req, { params: { id: testAgent.id } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.message).toBe('Agent deleted successfully');

      // Verify agent was deleted from database
      const dbAgent = await testDb.agent.findUnique({
        where: { id: testAgent.id },
      });
      expect(dbAgent).toBeNull();
    });

    it('should cascade delete agent runs', async () => {
      // Create agent run
      await testDb.agentRun.create({
        data: {
          agentId: testAgent.id,
          status: RunStatus.COMPLETED,
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/agents/${testAgent.id}`, {
        method: 'DELETE',
      });

      const response = await deleteAgent(req, { params: { id: testAgent.id } });
      expect(response.status).toBe(200);

      // Verify agent runs were also deleted
      const dbRuns = await testDb.agentRun.findMany({
        where: { agentId: testAgent.id },
      });
      expect(dbRuns).toHaveLength(0);
    });

    it('should return 404 for non-existent agent', async () => {
      const req = new NextRequest('http://localhost:3000/api/agents/non-existent-id', {
        method: 'DELETE',
      });

      const response = await deleteAgent(req, { params: { id: 'non-existent-id' } });
      expect(response.status).toBe(404);
    });
  });
});
