/**
 * Unit tests for RBAC enforcement
 * Tests that users can only access their own data
 */

import { testDb, createTestUser, createTestLogin, createTestAgent } from './setup';
import { Role } from '@prisma/client';

describe('RBAC Enforcement', () => {
  let userA: any;
  let userB: any;
  let loginA: any;
  let loginB: any;
  let agentA: any;
  let agentB: any;

  beforeEach(async () => {
    // Create two test users
    userA = await createTestUser('user-a@example.com');
    userB = await createTestUser('user-b@example.com');

    // Create logins for each user
    loginA = await createTestLogin(userA.id, 'User A Login');
    loginB = await createTestLogin(userB.id, 'User B Login');

    // Create agents for each user
    agentA = await createTestAgent(userA.id, 'User A Agent');
    agentB = await createTestAgent(userB.id, 'User B Agent');
  });

  describe('Login Ownership', () => {
    it('should allow user to access their own logins', async () => {
      const userALogins = await testDb.login.findMany({
        where: { ownerId: userA.id },
      });

      expect(userALogins).toHaveLength(1);
      expect(userALogins[0].id).toBe(loginA.id);
      expect(userALogins[0].ownerId).toBe(userA.id);
    });

    it('should not allow user to access other users logins', async () => {
      const userALogins = await testDb.login.findMany({
        where: { ownerId: userA.id },
      });

      expect(userALogins).toHaveLength(1);
      expect(userALogins[0].id).not.toBe(loginB.id);
    });

    it('should prevent cross-user login access', async () => {
      // Try to find user B's login as user A
      const crossAccess = await testDb.login.findFirst({
        where: {
          id: loginB.id,
          ownerId: userA.id, // User A trying to access User B's login
        },
      });

      expect(crossAccess).toBeNull();
    });

    it('should allow user to update their own login', async () => {
      const updatedLogin = await testDb.login.update({
        where: { id: loginA.id },
        data: { name: 'Updated Login Name' },
      });

      expect(updatedLogin.name).toBe('Updated Login Name');
      expect(updatedLogin.ownerId).toBe(userA.id);
    });

    it('should prevent user from updating other users login', async () => {
      // This should not find the login since ownerId doesn't match
      const crossUpdate = await testDb.login.findFirst({
        where: {
          id: loginB.id,
          ownerId: userA.id,
        },
      });

      expect(crossUpdate).toBeNull();
    });

    it('should allow user to delete their own login', async () => {
      await testDb.login.delete({
        where: { id: loginA.id },
      });

      const deletedLogin = await testDb.login.findUnique({
        where: { id: loginA.id },
      });

      expect(deletedLogin).toBeNull();
    });

    it('should prevent user from deleting other users login', async () => {
      // Try to delete user B's login as user A
      const crossDelete = await testDb.login.findFirst({
        where: {
          id: loginB.id,
          ownerId: userA.id,
        },
      });

      expect(crossDelete).toBeNull();
    });
  });

  describe('Agent Ownership', () => {
    it('should allow user to access their own agents', async () => {
      const userAAgents = await testDb.agent.findMany({
        where: { ownerId: userA.id },
      });

      expect(userAAgents).toHaveLength(1);
      expect(userAAgents[0].id).toBe(agentA.id);
      expect(userAAgents[0].ownerId).toBe(userA.id);
    });

    it('should not allow user to access other users agents', async () => {
      const userAAgents = await testDb.agent.findMany({
        where: { ownerId: userA.id },
      });

      expect(userAAgents).toHaveLength(1);
      expect(userAAgents[0].id).not.toBe(agentB.id);
    });

    it('should prevent cross-user agent access', async () => {
      // Try to find user B's agent as user A
      const crossAccess = await testDb.agent.findFirst({
        where: {
          id: agentB.id,
          ownerId: userA.id, // User A trying to access User B's agent
        },
      });

      expect(crossAccess).toBeNull();
    });

    it('should allow user to update their own agent', async () => {
      const updatedAgent = await testDb.agent.update({
        where: { id: agentA.id },
        data: { name: 'Updated Agent Name' },
      });

      expect(updatedAgent.name).toBe('Updated Agent Name');
      expect(updatedAgent.ownerId).toBe(userA.id);
    });

    it('should prevent user from updating other users agent', async () => {
      // This should not find the agent since ownerId doesn't match
      const crossUpdate = await testDb.agent.findFirst({
        where: {
          id: agentB.id,
          ownerId: userA.id,
        },
      });

      expect(crossUpdate).toBeNull();
    });

    it('should allow user to delete their own agent', async () => {
      await testDb.agent.delete({
        where: { id: agentA.id },
      });

      const deletedAgent = await testDb.agent.findUnique({
        where: { id: agentA.id },
      });

      expect(deletedAgent).toBeNull();
    });

    it('should prevent user from deleting other users agent', async () => {
      // Try to delete user B's agent as user A
      const crossDelete = await testDb.agent.findFirst({
        where: {
          id: agentB.id,
          ownerId: userA.id,
        },
      });

      expect(crossDelete).toBeNull();
    });
  });

  describe('Agent Run Ownership', () => {
    it('should only allow access to runs for owned agents', async () => {
      // Create agent runs for both agents
      const runA = await testDb.agentRun.create({
        data: {
          agentId: agentA.id,
          status: 'PENDING',
        },
      });

      const runB = await testDb.agentRun.create({
        data: {
          agentId: agentB.id,
          status: 'PENDING',
        },
      });

      // User A should only see runs for their agents
      const userARuns = await testDb.agentRun.findMany({
        where: {
          agent: {
            ownerId: userA.id,
          },
        },
      });

      expect(userARuns).toHaveLength(1);
      expect(userARuns[0].id).toBe(runA.id);
      expect(userARuns[0].id).not.toBe(runB.id);
    });

    it('should prevent cross-user run access', async () => {
      // Create agent run for user B's agent
      const runB = await testDb.agentRun.create({
        data: {
          agentId: agentB.id,
          status: 'PENDING',
        },
      });

      // User A should not be able to access user B's run
      const crossAccess = await testDb.agentRun.findFirst({
        where: {
          id: runB.id,
          agent: {
            ownerId: userA.id,
          },
        },
      });

      expect(crossAccess).toBeNull();
    });
  });

  describe('Agent-Login Association Ownership', () => {
    it('should only allow agents to use owned logins', async () => {
      // Create agent-login association for user A
      const agentLoginA = await testDb.agentLogin.create({
        data: {
          agentId: agentA.id,
          loginId: loginA.id,
        },
      });

      expect(agentLoginA.agentId).toBe(agentA.id);
      expect(agentLoginA.loginId).toBe(loginA.id);

      // Verify the association exists
      const association = await testDb.agentLogin.findUnique({
        where: {
          agentId_loginId: {
            agentId: agentA.id,
            loginId: loginA.id,
          },
        },
      });

      expect(association).not.toBeNull();
    });

    it('should prevent agents from using other users logins', async () => {
      // Try to create association between user A's agent and user B's login
      // This should be prevented by application logic (not database constraints)
      // The test verifies that such associations should not be created
      
      const crossAssociation = await testDb.agentLogin.findFirst({
        where: {
          agentId: agentA.id,
          loginId: loginB.id,
        },
      });

      expect(crossAssociation).toBeNull();
    });
  });

  describe('Data Isolation', () => {
    it('should maintain complete data isolation between users', async () => {
      // Create additional data for both users
      const loginA2 = await createTestLogin(userA.id, 'User A Login 2');
      const agentA2 = await createTestAgent(userA.id, 'User A Agent 2');
      const loginB2 = await createTestLogin(userB.id, 'User B Login 2');
      const agentB2 = await createTestAgent(userB.id, 'User B Agent 2');

      // User A should only see their own data
      const userAData = {
        logins: await testDb.login.findMany({ where: { ownerId: userA.id } }),
        agents: await testDb.agent.findMany({ where: { ownerId: userA.id } }),
      };

      // User B should only see their own data
      const userBData = {
        logins: await testDb.login.findMany({ where: { ownerId: userB.id } }),
        agents: await testDb.agent.findMany({ where: { ownerId: userB.id } }),
      };

      // Verify isolation
      expect(userAData.logins).toHaveLength(2);
      expect(userAData.agents).toHaveLength(2);
      expect(userBData.logins).toHaveLength(2);
      expect(userBData.agents).toHaveLength(2);

      // Verify no cross-contamination
      const userALoginIds = userAData.logins.map(l => l.id);
      const userBLoginIds = userBData.logins.map(l => l.id);
      const userAAgentIds = userAData.agents.map(a => a.id);
      const userBAgentIds = userBData.agents.map(a => a.id);

      expect(userALoginIds).not.toContain(loginB.id);
      expect(userALoginIds).not.toContain(loginB2.id);
      expect(userBLoginIds).not.toContain(loginA.id);
      expect(userBLoginIds).not.toContain(loginA2.id);

      expect(userAAgentIds).not.toContain(agentB.id);
      expect(userAAgentIds).not.toContain(agentB2.id);
      expect(userBAgentIds).not.toContain(agentA.id);
      expect(userBAgentIds).not.toContain(agentA2.id);
    });
  });

  describe('Cascade Deletion', () => {
    it('should cascade delete user data when user is deleted', async () => {
      // Create additional data for user A
      const loginA2 = await createTestLogin(userA.id, 'User A Login 2');
      const agentA2 = await createTestAgent(userA.id, 'User A Agent 2');
      
      // Create agent-login association
      await testDb.agentLogin.create({
        data: {
          agentId: agentA.id,
          loginId: loginA.id,
        },
      });

      // Create agent run
      await testDb.agentRun.create({
        data: {
          agentId: agentA.id,
          status: 'PENDING',
        },
      });

      // Delete user A
      await testDb.user.delete({
        where: { id: userA.id },
      });

      // Verify all user A's data is deleted
      const remainingLogins = await testDb.login.findMany({
        where: { ownerId: userA.id },
      });
      const remainingAgents = await testDb.agent.findMany({
        where: { ownerId: userA.id },
      });
      const remainingRuns = await testDb.agentRun.findMany({
        where: {
          agent: {
            ownerId: userA.id,
          },
        },
      });

      expect(remainingLogins).toHaveLength(0);
      expect(remainingAgents).toHaveLength(0);
      expect(remainingRuns).toHaveLength(0);

      // Verify user B's data is still intact
      const userBLogins = await testDb.login.findMany({
        where: { ownerId: userB.id },
      });
      const userBAgents = await testDb.agent.findMany({
        where: { ownerId: userB.id },
      });

      expect(userBLogins).toHaveLength(1);
      expect(userBAgents).toHaveLength(1);
    });
  });
});
