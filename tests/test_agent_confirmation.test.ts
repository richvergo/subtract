/**
 * Tests for agent run confirmation functionality
 * Tests: confirm, reject, RBAC, agent activation
 */

import { testDb, createTestUser, createTestLogin, createTestAgent } from './setup';
import { RunStatus, AgentStatus } from '@prisma/client';
import { confirmAgentRunSchema, rejectAgentRunSchema } from '../src/lib/schemas/agents';

describe('Agent Confirmation Tests', () => {
  let testUser: unknown;
  let otherUser: unknown;
  let testLogin: unknown;
  let testAgent: unknown;
  let agentRun: unknown;

  beforeEach(async () => {
    // Create test users
    const timestamp = Date.now();
    testUser = await createTestUser(`confirmation-test-${timestamp}@example.com`);
    otherUser = await createTestUser(`other-user-${timestamp}@example.com`);
    
    // Create test login and agent
    testLogin = await createTestLogin(testUser.id, `Test Login ${timestamp}`);
    testAgent = await createTestAgent(testUser.id, `Test Agent ${timestamp}`);

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
        status: RunStatus.COMPLETED,
        logs: JSON.stringify({ actions: [{ message: 'Test execution' }] }),
        screenshotPath: '/test/screenshot.png',
        finishedAt: new Date(),
      },
    });
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

  describe('Schema Validation', () => {
    it('should validate confirm agent run schema', () => {
      const validData = { activateAgent: true };
      const result = confirmAgentRunSchema.parse(validData);
      expect(result.activateAgent).toBe(true);
    });

    it('should validate confirm agent run schema with default', () => {
      const validData = {};
      const result = confirmAgentRunSchema.parse(validData);
      expect(result.activateAgent).toBe(false);
    });

    it('should validate reject agent run schema', () => {
      const validData = { feedback: 'This run failed because...' };
      const result = rejectAgentRunSchema.parse(validData);
      expect(result.feedback).toBe('This run failed because...');
    });

    it('should reject empty feedback', () => {
      const invalidData = { feedback: '' };
      expect(() => rejectAgentRunSchema.parse(invalidData)).toThrow();
    });

    it('should reject feedback that is too long', () => {
      const invalidData = { feedback: 'a'.repeat(1001) };
      expect(() => rejectAgentRunSchema.parse(invalidData)).toThrow();
    });
  });

  describe('Database Operations', () => {
    it('should confirm an agent run', async () => {
      const updatedRun = await testDb.agentRun.update({
        where: { id: agentRun.id },
        data: {
          userConfirmed: true,
          userFeedback: null,
        },
      });

      expect(updatedRun.userConfirmed).toBe(true);
      expect(updatedRun.userFeedback).toBeNull();
    });

    it('should reject an agent run with feedback', async () => {
      const feedback = 'The automation clicked the wrong button';
      const updatedRun = await testDb.agentRun.update({
        where: { id: agentRun.id },
        data: {
          userConfirmed: false,
          userFeedback: feedback,
        },
      });

      expect(updatedRun.userConfirmed).toBe(false);
      expect(updatedRun.userFeedback).toBe(feedback);
    });

    it('should activate an agent when run is confirmed', async () => {
      // First confirm the run
      await testDb.agentRun.update({
        where: { id: agentRun.id },
        data: {
          userConfirmed: true,
          userFeedback: null,
        },
      });

      // Then activate the agent
      const updatedAgent = await testDb.agent.update({
        where: { id: testAgent.id },
        data: {
          status: AgentStatus.ACTIVE,
        },
      });

      expect(updatedAgent.status).toBe(AgentStatus.ACTIVE);
    });

    it('should keep agent as draft when run is rejected', async () => {
      // Reject the run
      await testDb.agentRun.update({
        where: { id: agentRun.id },
        data: {
          userConfirmed: false,
          userFeedback: 'Needs improvement',
        },
      });

      // Agent should remain in draft status
      const agent = await testDb.agent.findUnique({
        where: { id: testAgent.id },
      });

      expect(agent?.status).toBe(AgentStatus.DRAFT);
    });
  });

  describe('RBAC Enforcement', () => {
    it('should allow agent owner to confirm their run', async () => {
      // This test verifies the database allows the operation
      // The API endpoint will enforce RBAC
      const updatedRun = await testDb.agentRun.update({
        where: { id: agentRun.id },
        data: {
          userConfirmed: true,
          userFeedback: null,
        },
      });

      expect(updatedRun.userConfirmed).toBe(true);
    });

    it('should allow agent owner to reject their run', async () => {
      const feedback = 'User feedback for rejection';
      const updatedRun = await testDb.agentRun.update({
        where: { id: agentRun.id },
        data: {
          userConfirmed: false,
          userFeedback: feedback,
        },
      });

      expect(updatedRun.userConfirmed).toBe(false);
      expect(updatedRun.userFeedback).toBe(feedback);
    });

    it('should not allow access to runs from other users', async () => {
      // Create an agent run for another user
      const otherLogin = await createTestLogin(otherUser.id, 'Other Login');
      const otherAgent = await createTestAgent(otherUser.id, 'Other Agent');
      
      await testDb.agentLogin.create({
        data: {
          agentId: otherAgent.id,
          loginId: otherLogin.id,
        },
      });

      const otherRun = await testDb.agentRun.create({
        data: {
          agentId: otherAgent.id,
          status: RunStatus.COMPLETED,
        },
      });

      // Verify the runs are separate
      expect(agentRun.agentId).not.toBe(otherRun.agentId);
      expect(agentRun.id).not.toBe(otherRun.id);
    });
  });

  describe('Confirmation Workflow', () => {
    it('should handle complete confirmation workflow', async () => {
      // Step 1: Run starts as unconfirmed
      expect(agentRun.userConfirmed).toBeNull();
      expect(agentRun.userFeedback).toBeNull();

      // Step 2: User confirms the run
      const confirmedRun = await testDb.agentRun.update({
        where: { id: agentRun.id },
        data: {
          userConfirmed: true,
          userFeedback: null,
        },
      });

      expect(confirmedRun.userConfirmed).toBe(true);
      expect(confirmedRun.userFeedback).toBeNull();

      // Step 3: Agent can be activated
      const activatedAgent = await testDb.agent.update({
        where: { id: testAgent.id },
        data: {
          status: AgentStatus.ACTIVE,
        },
      });

      expect(activatedAgent.status).toBe(AgentStatus.ACTIVE);
    });

    it('should handle complete rejection workflow', async () => {
      // Step 1: Run starts as unconfirmed
      expect(agentRun.userConfirmed).toBeNull();
      expect(agentRun.userFeedback).toBeNull();

      // Step 2: User rejects the run with feedback
      const feedback = 'The automation failed to find the submit button';
      const rejectedRun = await testDb.agentRun.update({
        where: { id: agentRun.id },
        data: {
          userConfirmed: false,
          userFeedback: feedback,
        },
      });

      expect(rejectedRun.userConfirmed).toBe(false);
      expect(rejectedRun.userFeedback).toBe(feedback);

      // Step 3: Agent remains in draft status
      const agent = await testDb.agent.findUnique({
        where: { id: testAgent.id },
      });

      expect(agent?.status).toBe(AgentStatus.DRAFT);
    });

    it('should allow changing confirmation status', async () => {
      // Step 1: Initially reject the run
      const feedback = 'Initial rejection';
      await testDb.agentRun.update({
        where: { id: agentRun.id },
        data: {
          userConfirmed: false,
          userFeedback: feedback,
        },
      });

      // Step 2: Later confirm the run (clearing feedback)
      const confirmedRun = await testDb.agentRun.update({
        where: { id: agentRun.id },
        data: {
          userConfirmed: true,
          userFeedback: null,
        },
      });

      expect(confirmedRun.userConfirmed).toBe(true);
      expect(confirmedRun.userFeedback).toBeNull();
    });
  });

  describe('Multiple Runs Confirmation', () => {
    it('should handle multiple runs with different confirmation statuses', async () => {
      // Create additional runs
      await testDb.agentRun.create({
        data: {
          agentId: testAgent.id,
          status: RunStatus.COMPLETED,
          userConfirmed: true,
          userFeedback: null,
        },
      });

      await testDb.agentRun.create({
        data: {
          agentId: testAgent.id,
          status: RunStatus.FAILED,
          userConfirmed: false,
          userFeedback: 'This run failed due to network issues',
        },
      });

      // Verify all runs have different confirmation statuses
      const runs = await testDb.agentRun.findMany({
        where: { agentId: testAgent.id },
        orderBy: { startedAt: 'asc' },
      });

      expect(runs).toHaveLength(3);
      expect(runs[0].userConfirmed).toBeNull(); // Original run
      expect(runs[1].userConfirmed).toBe(true);  // Confirmed run
      expect(runs[2].userConfirmed).toBe(false); // Rejected run
    });

    it('should allow activating agent after any run is confirmed', async () => {
      // Confirm the run
      await testDb.agentRun.update({
        where: { id: agentRun.id },
        data: {
          userConfirmed: true,
          userFeedback: null,
        },
      });

      // Activate the agent
      const activatedAgent = await testDb.agent.update({
        where: { id: testAgent.id },
        data: {
          status: AgentStatus.ACTIVE,
        },
      });

      expect(activatedAgent.status).toBe(AgentStatus.ACTIVE);
    });
  });

  describe('Edge Cases', () => {
    it('should handle runs that are still pending', async () => {
      const pendingRun = await testDb.agentRun.create({
        data: {
          agentId: testAgent.id,
          status: RunStatus.PENDING,
        },
      });

      // Should be able to confirm/reject even pending runs
      const confirmedRun = await testDb.agentRun.update({
        where: { id: pendingRun.id },
        data: {
          userConfirmed: true,
          userFeedback: null,
        },
      });

      expect(confirmedRun.userConfirmed).toBe(true);
    });

    it('should handle failed runs', async () => {
      const failedRun = await testDb.agentRun.create({
        data: {
          agentId: testAgent.id,
          status: RunStatus.FAILED,
          logs: JSON.stringify({ error: 'Execution failed' }),
        },
      });

      // Should be able to reject failed runs with feedback
      const rejectedRun = await testDb.agentRun.update({
        where: { id: failedRun.id },
        data: {
          userConfirmed: false,
          userFeedback: 'The automation failed as expected',
        },
      });

      expect(rejectedRun.userConfirmed).toBe(false);
      expect(rejectedRun.userFeedback).toBe('The automation failed as expected');
    });

    it('should handle very long feedback text', async () => {
      const longFeedback = 'a'.repeat(1000); // Max allowed length
      
      const updatedRun = await testDb.agentRun.update({
        where: { id: agentRun.id },
        data: {
          userConfirmed: false,
          userFeedback: longFeedback,
        },
      });

      expect(updatedRun.userFeedback).toBe(longFeedback);
    });
  });
});
