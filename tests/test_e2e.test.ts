/**
 * End-to-end smoke test with real Puppeteer
 * Tests complete flow from API to worker execution
 */

import { testDb, createTestUser, createTestLogin, createTestAgent } from './setup';
import { RunStatus } from '@prisma/client';
import { enqueueAgentProcessing } from '../src/lib/queue';
import { executeAgentRun } from '../src/lib/agent-executor';

// Mock NextAuth for API testing
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('../src/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}));

describe('End-to-End Smoke Test', () => {
  let testUser: any;
  let testLogin: any;
  let testAgent: any;
  let mockSession: any;

  beforeEach(async () => {
    testUser = await createTestUser('test@example.com');
    testLogin = await createTestLogin(testUser.id, 'Test Login');
    testAgent = await createTestAgent(testUser.id, 'Test Agent');

    // Create agent-login association
    await testDb.agentLogin.create({
      data: {
        agentId: testAgent.id,
        loginId: testLogin.id,
      },
    });

    // Mock authenticated session
    mockSession = {
      user: {
        email: 'test@example.com',
      },
    };

    const { getServerSession } = require('next-auth');
    getServerSession.mockResolvedValue(mockSession);
  });

  describe('Complete Agent Execution Flow', () => {
    it('should execute agent from API to completion', async () => {
      // Step 1: Create agent run via API (simulated)
      const agentRun = await testDb.agentRun.create({
        data: {
          agentId: testAgent.id,
          status: RunStatus.PENDING,
        },
      });

      // Step 2: Enqueue job (simulated API call)
      const job = await enqueueAgentProcessing({
        runId: agentRun.id,
        agentId: testAgent.id,
        ownerId: testUser.id,
      });

      expect(job.id).toBe(agentRun.id);
      expect(job.data.runId).toBe(agentRun.id);
      expect(job.data.agentId).toBe(testAgent.id);

      // Step 3: Execute agent (simulated worker)
      const result = await executeAgentRun(testAgent.id, agentRun.id);

      expect(result.status).toBe(RunStatus.SUCCESS);
      expect(result.logs).toBeDefined();
      expect(result.logs.actions).toBeDefined();
      expect(result.screenshotPath).toBeDefined();

      // Step 4: Verify database was updated
      const updatedRun = await testDb.agentRun.findUnique({
        where: { id: agentRun.id },
      });

      expect(updatedRun!.status).toBe(RunStatus.SUCCESS);
      expect(updatedRun!.finishedAt).toBeDefined();
      expect(updatedRun!.logs).toBeDefined();
      expect(updatedRun!.screenshotPath).toBeDefined();
    });

    it('should handle real website navigation', async () => {
      // Create agent with real website navigation
      const realAgent = await testDb.agent.create({
        data: {
          name: 'Real Website Agent',
          description: 'Tests real website navigation',
               config: JSON.stringify([
            { action: 'goto', url: 'https://httpbin.org/forms/post' },
            { action: 'waitForSelector', selector: 'form', timeout: 10000 },
            { action: 'type', selector: 'input[name="custname"]', value: 'Test User' },
            { action: 'type', selector: 'input[name="custtel"]', value: '123-456-7890' },
            { action: 'type', selector: 'input[name="custemail"]', value: 'test@example.com' },
            { action: 'click', selector: 'input[type="submit"]' },
            { action: 'waitForSelector', selector: 'body', timeout: 5000 },
               ]),
          ownerId: testUser.id,
        },
      });

      // Create agent run
      const agentRun = await testDb.agentRun.create({
        data: {
          agentId: realAgent.id,
          status: RunStatus.PENDING,
        },
      });

      // Execute agent
      const result = await executeAgentRun(realAgent.id, agentRun.id);

      expect(result.status).toBe(RunStatus.SUCCESS);
      expect(result.logs.actions).toHaveLength(7); // 7 actions + start/complete logs
      expect(result.screenshotPath).toContain('screenshot-final');

      // Verify specific actions were logged
      const actionLogs = result.logs.actions;
      expect(actionLogs.some((log: any) => log.message.includes('Navigating to: https://httpbin.org/forms/post'))).toBe(true);
      expect(actionLogs.some((log: any) => log.message.includes('Waiting for selector: form'))).toBe(true);
      expect(actionLogs.some((log: any) => log.message.includes('Typing into selector: input[name="custname"]'))).toBe(true);
      expect(actionLogs.some((log: any) => log.message.includes('Clicking selector: input[type="submit"]'))).toBe(true);

      // Verify database was updated
      const updatedRun = await testDb.agentRun.findUnique({
        where: { id: agentRun.id },
      });

      expect(updatedRun!.status).toBe(RunStatus.SUCCESS);
      expect(updatedRun!.logs.summary.totalActions).toBe(7);
    });

    it('should handle website with login form', async () => {
      // Create agent that tests login form interaction
      const loginAgent = await testDb.agent.create({
        data: {
          name: 'Login Form Agent',
          description: 'Tests login form interaction',
               config: JSON.stringify([
            { action: 'goto', url: 'https://httpbin.org/forms/post' },
            { action: 'waitForSelector', selector: 'form', timeout: 10000 },
            { action: 'type', selector: 'input[name="custname"]', value: '{{login.username}}' },
            { action: 'type', selector: 'input[name="custtel"]', value: '{{login.password}}' },
            { action: 'click', selector: 'input[type="submit"]' },
            { action: 'waitForSelector', selector: 'body', timeout: 5000 },
               ]),
          ownerId: testUser.id,
        },
      });

      // Create agent-login association
      await testDb.agentLogin.create({
        data: {
          agentId: loginAgent.id,
          loginId: testLogin.id,
        },
      });

      // Create agent run
      const agentRun = await testDb.agentRun.create({
        data: {
          agentId: loginAgent.id,
          status: RunStatus.PENDING,
        },
      });

      // Execute agent
      const result = await executeAgentRun(loginAgent.id, agentRun.id);

      expect(result.status).toBe(RunStatus.SUCCESS);
      expect(result.logs.actions).toBeDefined();

      // Verify variable substitution worked
      const typeLogs = result.logs.actions.filter((log: any) => 
        log.message.includes('Typing into selector')
      );
      expect(typeLogs.length).toBeGreaterThan(0);
    });

    it('should handle failed navigation gracefully', async () => {
      // Create agent with invalid URL
      const failAgent = await testDb.agent.create({
        data: {
          name: 'Failed Navigation Agent',
          description: 'Tests failed navigation handling',
               config: JSON.stringify([
            { action: 'goto', url: 'https://this-domain-does-not-exist-12345.com' },
            { action: 'waitForSelector', selector: 'body', timeout: 5000 },
               ]),
          ownerId: testUser.id,
        },
      });

      // Create agent run
      const agentRun = await testDb.agentRun.create({
        data: {
          agentId: failAgent.id,
          status: RunStatus.PENDING,
        },
      });

      // Execute agent
      const result = await executeAgentRun(failAgent.id, agentRun.id);

      expect(result.status).toBe(RunStatus.FAILED);
      expect(result.error).toBeDefined();
      expect(result.screenshotPath).toContain('screenshot-error');

      // Verify database was updated with failure
      const updatedRun = await testDb.agentRun.findUnique({
        where: { id: agentRun.id },
      });

      expect(updatedRun!.status).toBe(RunStatus.FAILED);
      expect(updatedRun!.finishedAt).toBeDefined();
      expect(updatedRun!.logs.error).toBeDefined();
    });

    it('should handle timeout scenarios', async () => {
      // Create agent with very short timeout
      const timeoutAgent = await testDb.agent.create({
        data: {
          name: 'Timeout Agent',
          description: 'Tests timeout handling',
               config: JSON.stringify([
            { action: 'goto', url: 'https://httpbin.org/delay/10' }, // 10 second delay
            { action: 'waitForSelector', selector: 'body', timeout: 2000 }, // 2 second timeout
               ]),
          ownerId: testUser.id,
        },
      });

      // Create agent run
      const agentRun = await testDb.agentRun.create({
        data: {
          agentId: timeoutAgent.id,
          status: RunStatus.PENDING,
        },
      });

      // Execute agent
      const result = await executeAgentRun(timeoutAgent.id, agentRun.id);

      // Should fail due to timeout
      expect(result.status).toBe(RunStatus.FAILED);
      expect(result.error).toBeDefined();
    });

    it('should capture screenshots on both success and failure', async () => {
      // Test success screenshot
      const successAgent = await testDb.agent.create({
        data: {
          name: 'Success Screenshot Agent',
               config: JSON.stringify([
            { action: 'goto', url: 'https://httpbin.org/html' },
            { action: 'waitForSelector', selector: 'body' },
               ]),
          ownerId: testUser.id,
        },
      });

      const successRun = await testDb.agentRun.create({
        data: {
          agentId: successAgent.id,
          status: RunStatus.PENDING,
        },
      });

      const successResult = await executeAgentRun(successAgent.id, successRun.id);
      expect(successResult.status).toBe(RunStatus.SUCCESS);
      expect(successResult.screenshotPath).toContain('screenshot-final');

      // Test failure screenshot
      const failAgent = await testDb.agent.create({
        data: {
          name: 'Failure Screenshot Agent',
               config: JSON.stringify([
            { action: 'goto', url: 'https://invalid-domain-12345.com' },
               ]),
          ownerId: testUser.id,
        },
      });

      const failRun = await testDb.agentRun.create({
        data: {
          agentId: failAgent.id,
          status: RunStatus.PENDING,
        },
      });

      const failResult = await executeAgentRun(failAgent.id, failRun.id);
      expect(failResult.status).toBe(RunStatus.FAILED);
      expect(failResult.screenshotPath).toContain('screenshot-error');
    });

    it('should handle multiple concurrent runs', async () => {
      // Create multiple agents
      const agents = [];
      for (let i = 0; i < 3; i++) {
        const agent = await testDb.agent.create({
          data: {
            name: `Concurrent Agent ${i + 1}`,
               config: JSON.stringify([
              { action: 'goto', url: 'https://httpbin.org/html' },
              { action: 'waitForSelector', selector: 'body' },
               ]),
            ownerId: testUser.id,
          },
        });
        agents.push(agent);
      }

      // Create runs for all agents
      const runs = [];
      for (const agent of agents) {
        const run = await testDb.agentRun.create({
          data: {
            agentId: agent.id,
            status: RunStatus.PENDING,
          },
        });
        runs.push(run);
      }

      // Execute all agents concurrently
      const results = await Promise.all(
        runs.map((run, index) => executeAgentRun(agents[index].id, run.id))
      );

      // All should succeed
      results.forEach((result, index) => {
        expect(result.status).toBe(RunStatus.SUCCESS);
        expect(result.logs.summary.totalActions).toBe(2);
      });

      // Verify all runs were updated in database
      const updatedRuns = await testDb.agentRun.findMany({
        where: {
          id: { in: runs.map(r => r.id) },
        },
      });

      expect(updatedRuns).toHaveLength(3);
      updatedRuns.forEach(run => {
        expect(run.status).toBe(RunStatus.SUCCESS);
        expect(run.finishedAt).toBeDefined();
      });
    });

    it('should handle complex multi-step workflow', async () => {
      // Create agent with complex workflow
      const complexAgent = await testDb.agent.create({
        data: {
          name: 'Complex Workflow Agent',
          description: 'Tests complex multi-step workflow',
               config: JSON.stringify([
            { action: 'goto', url: 'https://httpbin.org/forms/post' },
            { action: 'waitForSelector', selector: 'form', timeout: 10000 },
            { action: 'type', selector: 'input[name="custname"]', value: 'John Doe' },
            { action: 'type', selector: 'input[name="custtel"]', value: '555-1234' },
            { action: 'type', selector: 'input[name="custemail"]', value: 'john@example.com' },
            { action: 'type', selector: 'input[name="size"]', value: 'large' },
            { action: 'type', selector: 'textarea[name="comments"]', value: 'This is a test comment' },
            { action: 'click', selector: 'input[type="submit"]' },
            { action: 'waitForSelector', selector: 'body', timeout: 5000 },
               ]),
          ownerId: testUser.id,
        },
      });

      // Create agent run
      const agentRun = await testDb.agentRun.create({
        data: {
          agentId: complexAgent.id,
          status: RunStatus.PENDING,
        },
      });

      // Execute agent
      const result = await executeAgentRun(complexAgent.id, agentRun.id);

      expect(result.status).toBe(RunStatus.SUCCESS);
      expect(result.logs.summary.totalActions).toBe(9);
      expect(result.screenshotPath).toBeDefined();

      // Verify all actions were executed
      const actionLogs = result.logs.actions;
      expect(actionLogs.some((log: any) => log.message.includes('Navigating to: https://httpbin.org/forms/post'))).toBe(true);
      expect(actionLogs.some((log: any) => log.message.includes('Typing into selector: input[name="custname"]'))).toBe(true);
      expect(actionLogs.some((log: any) => log.message.includes('Typing into selector: input[name="custtel"]'))).toBe(true);
      expect(actionLogs.some((log: any) => log.message.includes('Typing into selector: input[name="custemail"]'))).toBe(true);
      expect(actionLogs.some((log: any) => log.message.includes('Typing into selector: input[name="size"]'))).toBe(true);
      expect(actionLogs.some((log: any) => log.message.includes('Typing into selector: textarea[name="comments"]'))).toBe(true);
      expect(actionLogs.some((log: any) => log.message.includes('Clicking selector: input[type="submit"]'))).toBe(true);

      // Verify database was updated
      const updatedRun = await testDb.agentRun.findUnique({
        where: { id: agentRun.id },
      });

      expect(updatedRun!.status).toBe(RunStatus.SUCCESS);
      expect(updatedRun!.logs.summary.totalActions).toBe(9);
      expect(updatedRun!.finishedAt).toBeDefined();
    });
  });

  describe('Queue Integration', () => {
    it('should enqueue and process jobs correctly', async () => {
      // Create agent run
      const agentRun = await testDb.agentRun.create({
        data: {
          agentId: testAgent.id,
          status: RunStatus.PENDING,
        },
      });

      // Enqueue job
      const job = await enqueueAgentProcessing({
        runId: agentRun.id,
        agentId: testAgent.id,
        ownerId: testUser.id,
      });

      expect(job.id).toBe(agentRun.id);
      expect(job.data).toEqual({
        runId: agentRun.id,
        agentId: testAgent.id,
        ownerId: testUser.id,
      });

      // Simulate worker processing
      const result = await executeAgentRun(testAgent.id, agentRun.id);

      expect(result.status).toBe(RunStatus.SUCCESS);

      // Verify final state
      const finalRun = await testDb.agentRun.findUnique({
        where: { id: agentRun.id },
      });

      expect(finalRun!.status).toBe(RunStatus.SUCCESS);
      expect(finalRun!.finishedAt).toBeDefined();
    });
  });
});
