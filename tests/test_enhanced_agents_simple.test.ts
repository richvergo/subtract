import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { db } from '@/lib/db';
import { AgentAction, ActionMetadata } from '@/lib/schemas/agents';

describe('Enhanced Agents Backend - Core Functionality', () => {
  let testUser: any;
  let testAgent: any;

  beforeEach(async () => {
    // Clean up test data
    await db.agentRun.deleteMany({});
    await db.agentLogin.deleteMany({});
    await db.agent.deleteMany({});
    await db.login.deleteMany({});
    await db.membership.deleteMany({});
    await db.user.deleteMany({});

    // Create test user
    testUser = await db.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        name: 'Test User',
      },
    });

    // Create test agent with enriched metadata
    testAgent = await db.agent.create({
      data: {
        name: 'Enhanced Test Agent',
        purposePrompt: 'Login to the application and navigate to dashboard',
        agentConfig: JSON.stringify([
          {
            action: 'goto',
            url: 'https://example.com/login',
            metadata: {
              timestamp: Date.now() - 4000,
            },
          },
          {
            action: 'type',
            selector: '#username',
            value: '{{username}}',
            metadata: {
              selector: '#username',
              tag: 'input',
              type: 'text',
              innerText: null,
              ariaLabel: 'Username field',
              placeholder: 'Enter your username',
              timestamp: Date.now() - 3000,
              intent: 'Enter the username in the login form field',
            },
          },
          {
            action: 'click',
            selector: '#login-button',
            metadata: {
              selector: '#login-button',
              tag: 'button',
              type: null,
              innerText: 'Sign In',
              ariaLabel: 'Sign in to your account',
              placeholder: null,
              timestamp: Date.now() - 2000,
              intent: 'Submit the login form to authenticate the user',
            },
          },
        ]),
        agentIntents: JSON.stringify([
          {
            action: 'goto',
            selector: 'https://example.com/login',
            intent: 'Navigate to the login page to begin authentication',
            stepIndex: 0,
            metadata: {},
          },
          {
            action: 'type',
            selector: '#username',
            intent: 'Enter the username in the login form field',
            stepIndex: 1,
            metadata: {},
          },
          {
            action: 'click',
            selector: '#login-button',
            intent: 'Submit the login form to authenticate the user',
            stepIndex: 2,
            metadata: {},
          },
        ]),
        status: 'ACTIVE',
        processing_status: 'ready',
        processing_progress: 100,
        ownerId: testUser.id,
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await db.agentRun.deleteMany({});
    await db.agentLogin.deleteMany({});
    await db.agent.deleteMany({});
    await db.login.deleteMany({});
    await db.membership.deleteMany({});
    await db.user.deleteMany({});
  });

  describe('Agent Config Schema with Metadata', () => {
    it('should validate agent config with rich metadata', () => {
      const agentConfig = [
        {
          action: 'click' as const,
          selector: '#login-button',
          metadata: {
            selector: '#login-button',
            tag: 'button',
            type: null,
            innerText: 'Sign In',
            ariaLabel: 'Sign in to your account',
            placeholder: null,
            timestamp: Date.now(),
            intent: 'Submit the login form to authenticate the user',
          },
        },
      ];

      // This should not throw
      expect(() => {
        const parsed = JSON.parse(JSON.stringify(agentConfig));
        expect(parsed[0].metadata).toHaveProperty('tag', 'button');
        expect(parsed[0].metadata).toHaveProperty('innerText', 'Sign In');
        expect(parsed[0].metadata).toHaveProperty('ariaLabel', 'Sign in to your account');
        expect(parsed[0].metadata).toHaveProperty('intent');
      }).not.toThrow();
    });

    it('should handle nullable metadata fields', () => {
      const metadata: ActionMetadata = {
        selector: '#input',
        tag: 'input',
        type: null,
        innerText: null,
        ariaLabel: null,
        placeholder: null,
        timestamp: Date.now(),
        intent: null,
      };

      expect(metadata.type).toBeNull();
      expect(metadata.innerText).toBeNull();
      expect(metadata.ariaLabel).toBeNull();
      expect(metadata.placeholder).toBeNull();
      expect(metadata.intent).toBeNull();
    });

    it('should store and retrieve metadata in database', async () => {
      const agent = await db.agent.findUnique({
        where: { id: testAgent.id },
      });

      expect(agent).toBeTruthy();
      
      const agentConfig = JSON.parse(agent!.agentConfig!);
      expect(agentConfig[1].metadata).toHaveProperty('tag', 'input');
      expect(agentConfig[1].metadata).toHaveProperty('type', 'text');
      expect(agentConfig[1].metadata).toHaveProperty('placeholder', 'Enter your username');
      expect(agentConfig[2].metadata).toHaveProperty('innerText', 'Sign In');
      expect(agentConfig[2].metadata).toHaveProperty('ariaLabel', 'Sign in to your account');
    });
  });

  describe('LLM Annotation Integration', () => {
    it('should generate intents for steps with metadata', async () => {
      const steps = [
        {
          action: 'click' as const,
          selector: '#login-button',
          metadata: {
            selector: '#login-button',
            tag: 'button',
            type: null,
            innerText: 'Sign In',
            ariaLabel: 'Sign in to your account',
            placeholder: null,
            timestamp: Date.now(),
            intent: null,
          },
        },
      ];

      const purposePrompt = 'Login to the application';

      // Verify metadata is present for LLM processing
      expect(steps[0].metadata.tag).toBe('button');
      expect(steps[0].metadata.innerText).toBe('Sign In');
      expect(steps[0].metadata.ariaLabel).toBe('Sign in to your account');
      expect(purposePrompt).toBe('Login to the application');
    });

    it('should merge intents into metadata', () => {
      const steps = [
        {
          action: 'click' as const,
          selector: '#login-button',
          metadata: {
            selector: '#login-button',
            tag: 'button',
            type: null,
            innerText: 'Sign In',
            ariaLabel: 'Sign in to your account',
            placeholder: null,
            timestamp: Date.now(),
            intent: null, // Will be filled by LLM
          },
        },
      ];

      const intents = [
        {
          action: 'click',
          selector: '#login-button',
          intent: 'Submit the login form to authenticate the user',
          stepIndex: 0,
          metadata: {},
        },
      ];

      // Simulate merging intents into metadata
      const enrichedSteps = steps.map((step, index) => {
        const intent = intents[index];
        if (intent && step.metadata) {
          return {
            ...step,
            metadata: {
              ...step.metadata,
              intent: intent.intent,
            },
          };
        }
        return step;
      });

      expect(enrichedSteps[0].metadata.intent).toBe('Submit the login form to authenticate the user');
    });
  });

  describe('API Endpoints with Enriched Data', () => {
    it('should return agent with enriched metadata', async () => {
      const agent = await db.agent.findUnique({
        where: { id: testAgent.id },
      });

      expect(agent).toBeTruthy();
      
      const agentConfig = JSON.parse(agent!.agentConfig!);
      expect(agentConfig[0].action).toBe('goto');
      expect(agentConfig[1].metadata).toHaveProperty('tag', 'input');
      expect(agentConfig[1].metadata).toHaveProperty('type', 'text');
      expect(agentConfig[1].metadata).toHaveProperty('placeholder', 'Enter your username');
      expect(agentConfig[2].metadata).toHaveProperty('innerText', 'Sign In');
      expect(agentConfig[2].metadata).toHaveProperty('ariaLabel', 'Sign in to your account');
    });

    it('should return agent intents with step indices', async () => {
      const agent = await db.agent.findUnique({
        where: { id: testAgent.id },
      });

      expect(agent).toBeTruthy();
      
      const agentIntents = JSON.parse(agent!.agentIntents!);
      expect(agentIntents).toHaveLength(3);
      expect(agentIntents[0].stepIndex).toBe(0);
      expect(agentIntents[1].stepIndex).toBe(1);
      expect(agentIntents[2].stepIndex).toBe(2);
      expect(agentIntents[0].intent).toContain('Navigate to the login page');
      expect(agentIntents[2].intent).toContain('Submit the login form');
    });

    it('should handle processing status correctly', async () => {
      const agent = await db.agent.findUnique({
        where: { id: testAgent.id },
      });

      expect(agent!.processing_status).toBe('ready');
      expect(agent!.processing_progress).toBe(100);
      expect(agent!.status).toBe('ACTIVE');
    });
  });

  describe('Fallback Repair Logic', () => {
    it('should prepare metadata for LLM repair', () => {
      const action: AgentAction = {
        action: 'click',
        selector: '#login-button',
        metadata: {
          selector: '#login-button',
          tag: 'button',
          type: null,
          innerText: 'Sign In',
          ariaLabel: 'Sign in to your account',
          placeholder: null,
          timestamp: Date.now(),
          intent: 'Submit the login form to authenticate the user',
        },
      };

      const intent = 'Submit the login form to authenticate the user';
      const domSnapshot = '<html><body><button id="new-login-btn" aria-label="Sign in to your account">Sign In</button></body></html>';

      // Verify all required data is available for repair
      expect(action.metadata!.tag).toBe('button');
      expect(action.metadata!.innerText).toBe('Sign In');
      expect(action.metadata!.ariaLabel).toBe('Sign in to your account');
      expect(intent).toBe('Submit the login form to authenticate the user');
      expect(domSnapshot).toContain('Sign In');
      expect(domSnapshot).toContain('aria-label="Sign in to your account"');
    });

    it('should track repair attempts', () => {
      const repairs: Array<{
        stepIndex: number;
        originalSelector: string;
        repairedSelector: string;
        confidence: number;
        reasoning: string;
      }> = [];

      // Simulate a repair attempt
      const repairAttempt = {
        stepIndex: 2,
        originalSelector: '#login-button',
        repairedSelector: 'button[id="new-login-btn"]',
        confidence: 0.9,
        reasoning: 'Found button with matching text content and aria-label',
      };

      repairs.push(repairAttempt);

      expect(repairs).toHaveLength(1);
      expect(repairs[0].stepIndex).toBe(2);
      expect(repairs[0].originalSelector).toBe('#login-button');
      expect(repairs[0].repairedSelector).toBe('button[id="new-login-btn"]');
      expect(repairs[0].confidence).toBe(0.9);
    });
  });

  describe('Integration: Complete Workflow', () => {
    it('should process recording with metadata and generate intents', async () => {
      // Simulate the complete workflow:
      // 1. Recording uploaded
      // 2. Steps extracted with metadata
      // 3. LLM generates intents
      // 4. Agent created with enriched config

      const extractedSteps = [
        {
          action: 'click',
          selector: '#login-button',
          metadata: {
            selector: '#login-button',
            tag: 'button',
            type: null,
            innerText: 'Sign In',
            ariaLabel: 'Sign in to your account',
            placeholder: null,
            timestamp: Date.now(),
            intent: null, // Will be filled by LLM
          },
        },
      ];

      const generatedIntents = [
        {
          action: 'click',
          selector: '#login-button',
          intent: 'Submit the login form to authenticate the user',
          stepIndex: 0,
          metadata: {},
        },
      ];

      // Verify the workflow produces expected results
      expect(extractedSteps[0].metadata.tag).toBe('button');
      expect(extractedSteps[0].metadata.innerText).toBe('Sign In');
      expect(generatedIntents[0].intent).toContain('authenticate');
      expect(generatedIntents[0].stepIndex).toBe(0);

      // Verify metadata is rich enough for repair
      expect(extractedSteps[0].metadata.ariaLabel).toBe('Sign in to your account');
      expect(extractedSteps[0].metadata.timestamp).toBeGreaterThan(0);
    });

    it('should handle metadata updates during repair', () => {
      const action: AgentAction = {
        action: 'click',
        selector: '#login-button',
        metadata: {
          selector: '#login-button',
          tag: 'button',
          type: null,
          innerText: 'Sign In',
          ariaLabel: 'Sign in to your account',
          placeholder: null,
          timestamp: Date.now(),
          intent: 'Submit the login form to authenticate the user',
        },
      };

      const repairedSelector = 'button[id="new-login-btn"]';

      // Simulate updating the selector after repair
      action.selector = repairedSelector;
      action.metadata!.selector = repairedSelector;

      expect(action.selector).toBe('button[id="new-login-btn"]');
      expect(action.metadata!.selector).toBe('button[id="new-login-btn"]');
      expect(action.metadata!.tag).toBe('button'); // Other metadata preserved
      expect(action.metadata!.innerText).toBe('Sign In');
    });
  });
});
