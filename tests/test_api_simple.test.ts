/**
 * Simplified API Integration Tests
 * Tests the core API logic without full Next.js server setup
 */

import { testDb, createTestUser, createTestLogin, createTestAgent } from './setup';
import { encryptLoginCredentials, decryptLoginCredentials, maskLoginCredentials } from '@/lib/encryption';
import { createLoginSchema, createAgentSchema } from '@/lib/schemas/agents';

describe('API Logic Tests', () => {
  let testUser: any;
  let testEntity: any;

  beforeEach(async () => {
    // Create test user and entity with unique identifiers
    const timestamp = Date.now();
    testUser = await createTestUser(`api-test-${timestamp}@example.com`);
    testEntity = await testDb.entity.create({
      data: { name: `Test Entity ${timestamp}` },
    });
    await testDb.membership.create({
      data: {
        userId: testUser.id,
        entityId: testEntity.id,
        role: 'ADMIN',
      },
    });
  });

  describe('Login API Logic', () => {
    it('should create login with encrypted credentials', async () => {
      const loginData = {
        name: 'Test Login',
        loginUrl: 'https://example.com/login',
        username: 'testuser@example.com',
        password: 'testpassword123',
      };

      // Validate input
      const validatedData = createLoginSchema.parse(loginData);

      // Encrypt credentials
      const encryptedCredentials = encryptLoginCredentials({
        username: validatedData.username,
        password: validatedData.password,
      });

      // Create login in database
      const login = await testDb.login.create({
        data: {
          name: validatedData.name,
          loginUrl: validatedData.loginUrl,
          username: encryptedCredentials.username,
          password: encryptedCredentials.password,
          ownerId: testUser.id,
        },
      });

      // Verify login was created
      expect(login.id).toBeDefined();
      expect(login.name).toBe('Test Login');
      expect(login.loginUrl).toBe('https://example.com/login');
      expect(login.username).not.toBe('testuser@example.com'); // Should be encrypted
      expect(login.password).not.toBe('testpassword123'); // Should be encrypted

      // Verify decryption works
      const decrypted = decryptLoginCredentials({
        username: login.username,
        password: login.password,
      });
      expect(decrypted.username).toBe('testuser@example.com');
      expect(decrypted.password).toBe('testpassword123');

      // Verify masking works
      const masked = maskLoginCredentials({
        username: login.username,
        password: login.password,
      });
      expect(masked.username).toMatch(/\*\*\*/);
      expect(masked.password).toBe('••••••••');
    });

    it('should list user logins with masked credentials', async () => {
      // Create test logins
      const login1 = await createTestLogin(testUser.id, 'Login 1');
      const login2 = await createTestLogin(testUser.id, 'Login 2');

      // Fetch logins
      const logins = await testDb.login.findMany({
        where: { ownerId: testUser.id },
      });

      expect(logins).toHaveLength(2);

      // Verify credentials are encrypted in DB
      logins.forEach(login => {
        expect(login.username).not.toMatch(/@/); // Should be encrypted
        expect(login.password).not.toBe('testpassword123'); // Should be encrypted
      });

      // Test masking for API response
      const maskedLogins = logins.map(login => ({
        ...login,
        ...maskLoginCredentials({
          username: login.username,
          password: login.password,
        }),
      }));

      maskedLogins.forEach(login => {
        expect(login.username).toMatch(/\*\*\*/);
        expect(login.password).toBe('••••••••');
      });
    });

    it('should update login with encrypted credentials', async () => {
      const login = await createTestLogin(testUser.id, 'Original Login');

      const updateData = {
        name: 'Updated Login Name',
        username: 'newuser@example.com',
        password: 'newpassword123',
      };

      // Encrypt new credentials
      const encryptedCredentials = encryptLoginCredentials({
        username: updateData.username,
        password: updateData.password,
      });

      // Update login
      const updatedLogin = await testDb.login.update({
        where: { id: login.id },
        data: {
          name: updateData.name,
          username: encryptedCredentials.username,
          password: encryptedCredentials.password,
        },
      });

      expect(updatedLogin.name).toBe('Updated Login Name');
      expect(updatedLogin.username).not.toBe('newuser@example.com'); // Should be encrypted

      // Verify decryption
      const decrypted = decryptLoginCredentials({
        username: updatedLogin.username,
        password: updatedLogin.password,
      });
      expect(decrypted.username).toBe('newuser@example.com');
      expect(decrypted.password).toBe('newpassword123');
    });

    it('should delete login successfully', async () => {
      const login = await createTestLogin(testUser.id, 'To Delete');

      // Delete login
      await testDb.login.delete({
        where: { id: login.id },
      });

      // Verify login was deleted
      const deletedLogin = await testDb.login.findUnique({
        where: { id: login.id },
      });
      expect(deletedLogin).toBeNull();
    });
  });

  describe('Agent API Logic', () => {
    it('should create agent with valid config', async () => {
      const login = await createTestLogin(testUser.id, 'Agent Login');

      const agentData = {
        name: 'Test Agent',
        description: 'Test agent description',
        loginIds: [login.id],
        purposePrompt: 'Test agent purpose',
        agentConfig: [
          { action: 'goto', url: 'https://example.com' },
          { action: 'waitForSelector', selector: 'body', metadata: { selector: 'body', tag: 'body', timestamp: Date.now() } },
          { action: 'type', selector: '#username', value: '{{login.username}}', metadata: { selector: '#username', tag: 'input', timestamp: Date.now() } },
          { action: 'click', selector: '#submit', metadata: { selector: '#submit', tag: 'button', timestamp: Date.now() } },
        ],
      };

      // Validate input
      const validatedData = createAgentSchema.parse(agentData);

      // Create agent
      const agent = await testDb.agent.create({
        data: {
          name: validatedData.name,
          description: validatedData.description,
          agentConfig: JSON.stringify(validatedData.agentConfig),
          purposePrompt: validatedData.purposePrompt,
          ownerId: testUser.id,
        },
      });

      // Create agent-login association
      await testDb.agentLogin.create({
        data: {
          agentId: agent.id,
          loginId: login.id,
        },
      });

      expect(agent.id).toBeDefined();
      expect(agent.name).toBe('Test Agent');
      const agentConfig = JSON.parse(agent.agentConfig || '[]');
      expect(agentConfig).toHaveLength(4);
      expect(agentConfig[0]).toEqual({ action: 'goto', url: 'https://example.com' });
    });

    it('should list user agents', async () => {
      const agent1 = await createTestAgent(testUser.id, 'Agent 1');
      const agent2 = await createTestAgent(testUser.id, 'Agent 2');

      const agents = await testDb.agent.findMany({
        where: { ownerId: testUser.id },
        include: {
          agentLogins: {
            include: {
              login: true,
            },
          },
          agentRuns: {
            orderBy: { startedAt: 'desc' },
            take: 5,
          },
        },
      });

      expect(agents).toHaveLength(2);
      expect(agents[0].name).toBe('Agent 1');
      expect(agents[1].name).toBe('Agent 2');
    });

    it('should update agent config', async () => {
      const agent = await createTestAgent(testUser.id, 'Original Agent');

      const newConfig = [
        { action: 'goto', url: 'https://updated.com' },
        { action: 'click', selector: '#new-button', metadata: { selector: '#new-button', tag: 'button', timestamp: Date.now() } },
      ];

      const updatedAgent = await testDb.agent.update({
        where: { id: agent.id },
        data: {
          agentConfig: JSON.stringify(newConfig),
        },
      });

      const updatedConfig = JSON.parse(updatedAgent.agentConfig || '[]');
      expect(updatedConfig).toHaveLength(2);
      expect(updatedConfig[0]).toEqual({ action: 'goto', url: 'https://updated.com' });
    });

    it('should delete agent successfully', async () => {
      const agent = await createTestAgent(testUser.id, 'To Delete');

      await testDb.agent.delete({
        where: { id: agent.id },
      });

      const deletedAgent = await testDb.agent.findUnique({
        where: { id: agent.id },
      });
      expect(deletedAgent).toBeNull();
    });
  });

  describe('Agent Run Logic', () => {
    it('should create agent run record', async () => {
      const agent = await createTestAgent(testUser.id, 'Test Agent');

      const run = await testDb.agentRun.create({
        data: {
          agentId: agent.id,
          status: 'PENDING',
        },
      });

      expect(run.id).toBeDefined();
      expect(run.agentId).toBe(agent.id);
      expect(run.status).toBe('PENDING');
    });

    it('should update agent run status', async () => {
      const agent = await createTestAgent(testUser.id, 'Test Agent');
      const run = await testDb.agentRun.create({
        data: {
          agentId: agent.id,
          status: 'PENDING',
        },
      });

      const updatedRun = await testDb.agentRun.update({
        where: { id: run.id },
        data: {
          status: 'COMPLETED',
          finishedAt: new Date(),
          result: JSON.stringify({ message: 'Agent execution completed successfully' }),
        },
      });

      expect(updatedRun.status).toBe('COMPLETED');
      expect(updatedRun.finishedAt).toBeDefined();
      expect(updatedRun.result).toBeDefined();
    });
  });
});
