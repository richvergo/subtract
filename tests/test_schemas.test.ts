/**
 * Unit tests for schema validation
 * Tests agent configuration validation and RBAC enforcement
 */

import {
  createLoginSchema,
  updateLoginSchema,
  createAgentSchema,
  updateAgentSchema,
  agentActionSchema,
  agentConfigSchema,
  type CreateLoginInput,
  type CreateAgentInput,
  type AgentAction,
  type AgentConfig,
} from '../src/lib/schemas/agents';
// Removed SystemType import as it's no longer used

describe('Schema Validation', () => {
  describe('Login Schemas', () => {
    describe('createLoginSchema', () => {
      it('should validate valid login data', () => {
        const validLogin: CreateLoginInput = {
          name: 'Test ERP Login',
          loginUrl: 'https://erp.example.com/login',
          username: 'test@example.com',
          password: 'secret123',
        };

        expect(() => createLoginSchema.parse(validLogin)).not.toThrow();
      });

      it('should validate login with oauth token', () => {
        const validLogin: CreateLoginInput = {
          name: 'Test CRM Login',
          loginUrl: 'https://crm.example.com/login',
          username: 'test@example.com',
          oauthToken: 'oauth-token-123',
        };

        expect(() => createLoginSchema.parse(validLogin)).not.toThrow();
      });

      it('should reject missing required fields', () => {
        const invalidLogin = {
          loginUrl: 'https://erp.example.com/login',
          username: 'test@example.com',
        };

        expect(() => createLoginSchema.parse(invalidLogin)).toThrow();
      });

      it('should reject invalid login URL', () => {
        const invalidLogin = {
          name: 'Test Login',
          loginUrl: 'invalid-url',
          username: 'test@example.com',
          password: 'secret123',
        };

        expect(() => createLoginSchema.parse(invalidLogin)).toThrow();
      });

      it('should reject empty username', () => {
        const invalidLogin = {
          name: 'Test Login',
          loginUrl: 'https://erp.example.com/login',
          username: '',
          password: 'secret123',
        };

        expect(() => createLoginSchema.parse(invalidLogin)).toThrow();
      });

      it('should reject when neither password nor oauth token provided', () => {
        const invalidLogin = {
          name: 'Test Login',
          loginUrl: 'https://erp.example.com/login',
          username: 'test@example.com',
        };

        expect(() => createLoginSchema.parse(invalidLogin)).toThrow();
      });

      it('should accept valid login URLs', () => {
        const validUrls = [
          'https://erp.example.com/login',
          'https://crm.salesforce.com/login',
          'https://hr.bamboohr.com/login',
          'https://accounts.intuit.com/app/sign-in?app=quickbooks'
        ];
        
        validUrls.forEach(loginUrl => {
          const login = {
            name: 'Test Login',
            loginUrl,
            username: 'test@example.com',
            password: 'secret123',
          };

          expect(() => createLoginSchema.parse(login)).not.toThrow();
        });
      });
    });

    describe('updateLoginSchema', () => {
      it('should validate partial update data', () => {
        const updateData = {
          name: 'Updated Login Name',
        };

        expect(() => updateLoginSchema.parse(updateData)).not.toThrow();
      });

      it('should validate empty update object', () => {
        expect(() => updateLoginSchema.parse({})).not.toThrow();
      });

      it('should reject invalid login URL in update', () => {
        const invalidUpdate = {
          loginUrl: 'invalid-url',
        };

        expect(() => updateLoginSchema.parse(invalidUpdate)).toThrow();
      });
    });
  });

  describe('Agent Action Schema', () => {
    describe('agentActionSchema', () => {
      it('should validate goto action', () => {
        const action: AgentAction = {
          action: 'goto',
          url: 'https://example.com',
        };

        expect(() => agentActionSchema.parse(action)).not.toThrow();
      });

      it('should validate type action', () => {
        const action: AgentAction = {
          action: 'type',
          selector: '#username',
          value: 'test@example.com',
          metadata: {
            selector: '#username',
            tag: 'input',
            timestamp: Date.now(),
          },
        };

        expect(() => agentActionSchema.parse(action)).not.toThrow();
      });

      it('should validate click action', () => {
        const action: AgentAction = {
          action: 'click',
          selector: '#submit-button',
          metadata: {
            selector: '#submit-button',
            tag: 'button',
            timestamp: Date.now(),
          },
        };

        expect(() => agentActionSchema.parse(action)).not.toThrow();
      });

      it('should validate waitForSelector action', () => {
        const action: AgentAction = {
          action: 'waitForSelector',
          selector: '#dashboard',
          timeout: 10000,
          metadata: {
            selector: '#dashboard',
            tag: 'div',
            timestamp: Date.now(),
          },
        };

        expect(() => agentActionSchema.parse(action)).not.toThrow();
      });

      it('should validate download action', () => {
        const action: AgentAction = {
          action: 'download',
          selector: '#download-link',
          metadata: {
            selector: '#download-link',
            tag: 'a',
            timestamp: Date.now(),
          },
        };

        expect(() => agentActionSchema.parse(action)).not.toThrow();
      });

      it('should reject unsupported actions', () => {
        const invalidAction = {
          action: 'unsupported',
          selector: '#element',
        };

        expect(() => agentActionSchema.parse(invalidAction)).toThrow();
      });

      it('should reject goto action without url', () => {
        const invalidAction = {
          action: 'goto',
        };

        expect(() => agentActionSchema.parse(invalidAction)).toThrow();
      });

      it('should reject type action without selector and value', () => {
        const invalidAction = {
          action: 'type',
        };

        expect(() => agentActionSchema.parse(invalidAction)).toThrow();
      });

      it('should reject click action without selector', () => {
        const invalidAction = {
          action: 'click',
        };

        expect(() => agentActionSchema.parse(invalidAction)).toThrow();
      });

      it('should reject invalid timeout values', () => {
        const invalidAction = {
          action: 'waitForSelector',
          selector: '#element',
          timeout: -1000,
        };

        expect(() => agentActionSchema.parse(invalidAction)).toThrow();
      });

      it('should accept valid timeout values', () => {
        const validAction = {
          action: 'waitForSelector',
          selector: '#element',
          timeout: 5000,
          metadata: {
            selector: '#element',
            tag: 'div',
            timestamp: Date.now(),
          },
        };

        expect(() => agentActionSchema.parse(validAction)).not.toThrow();
      });
    });

    describe('agentConfigSchema', () => {
      it('should validate empty config array', () => {
        const config: AgentConfig = [];
        expect(() => agentConfigSchema.parse(config)).not.toThrow();
      });

      it('should validate single action config', () => {
        const config: AgentConfig = [
          { action: 'goto', url: 'https://example.com' }
        ];
        expect(() => agentConfigSchema.parse(config)).not.toThrow();
      });

      it('should validate complex multi-step config', () => {
        const config: AgentConfig = [
          { action: 'goto', url: 'https://example.com/login' },
          { action: 'type', selector: '#username', value: '{{login.username}}', metadata: { selector: '#username', tag: 'input', timestamp: Date.now() } },
          { action: 'type', selector: '#password', value: '{{login.password}}', metadata: { selector: '#password', tag: 'input', timestamp: Date.now() } },
          { action: 'click', selector: '#login-button', metadata: { selector: '#login-button', tag: 'button', timestamp: Date.now() } },
          { action: 'waitForSelector', selector: '#dashboard', timeout: 10000, metadata: { selector: '#dashboard', tag: 'div', timestamp: Date.now() } },
          { action: 'download', selector: '#download-report', metadata: { selector: '#download-report', tag: 'a', timestamp: Date.now() } },
        ];
        expect(() => agentConfigSchema.parse(config)).not.toThrow();
      });

      it('should reject config with invalid actions', () => {
        const invalidConfig = [
          { action: 'goto', url: 'https://example.com' },
          { action: 'invalid', selector: '#element' },
        ];

        expect(() => agentConfigSchema.parse(invalidConfig)).toThrow();
      });

      it('should reject non-array config', () => {
        const invalidConfig = { action: 'goto', url: 'https://example.com' };
        expect(() => agentConfigSchema.parse(invalidConfig)).toThrow();
      });
    });
  });

  describe('Agent Schemas', () => {
    describe('createAgentSchema', () => {
      it('should validate valid agent data', () => {
        const validAgent: CreateAgentInput = {
          name: 'Test Agent',
          description: 'A test agent',
          schedule: '0 9 * * 1-5',
          loginIds: ['login-id-1', 'login-id-2'],
          purposePrompt: 'Test agent purpose',
          agentConfig: [
            { action: 'goto', url: 'https://example.com' },
            { action: 'waitForSelector', selector: 'body', metadata: { selector: 'body', tag: 'body', timestamp: Date.now() } },
          ],
        };

        expect(() => createAgentSchema.parse(validAgent)).not.toThrow();
      });

      it('should validate agent without optional fields', () => {
        const minimalAgent: CreateAgentInput = {
          name: 'Minimal Agent',
          loginIds: ['login-id-1'],
          purposePrompt: 'Minimal agent purpose',
          agentConfig: [
            { action: 'goto', url: 'https://example.com' },
          ],
        };

        expect(() => createAgentSchema.parse(minimalAgent)).not.toThrow();
      });

      it('should reject agent without name', () => {
        const invalidAgent = {
          loginIds: ['login-id-1'],
          agentConfig: [{ action: 'goto', url: 'https://example.com' }],
        };

        expect(() => createAgentSchema.parse(invalidAgent)).toThrow();
      });

      it('should reject agent without loginIds', () => {
        const invalidAgent = {
          name: 'Test Agent',
          agentConfig: [{ action: 'goto', url: 'https://example.com' }],
        };

        expect(() => createAgentSchema.parse(invalidAgent)).toThrow();
      });

      it('should reject agent with empty loginIds array', () => {
        const invalidAgent = {
          name: 'Test Agent',
          loginIds: [],
          agentConfig: [{ action: 'goto', url: 'https://example.com' }],
        };

        expect(() => createAgentSchema.parse(invalidAgent)).toThrow();
      });

      it('should reject agent without agentConfig', () => {
        const invalidAgent = {
          name: 'Test Agent',
          loginIds: ['login-id-1'],
        };

        expect(() => createAgentSchema.parse(invalidAgent)).toThrow();
      });

      it('should reject agent with invalid agentConfig', () => {
        const invalidAgent = {
          name: 'Test Agent',
          loginIds: ['login-id-1'],
          agentConfig: [{ action: 'invalid', selector: '#element' }],
        };

        expect(() => createAgentSchema.parse(invalidAgent)).toThrow();
      });

      it('should reject empty name', () => {
        const invalidAgent = {
          name: '',
          loginIds: ['login-id-1'],
          agentConfig: [{ action: 'goto', url: 'https://example.com' }],
        };

        expect(() => createAgentSchema.parse(invalidAgent)).toThrow();
      });

      it('should reject name that is too long', () => {
        const longName = 'a'.repeat(256);
        const invalidAgent = {
          name: longName,
          loginIds: ['login-id-1'],
          agentConfig: [{ action: 'goto', url: 'https://example.com' }],
        };

        expect(() => createAgentSchema.parse(invalidAgent)).toThrow();
      });
    });

    describe('updateAgentSchema', () => {
      it('should validate partial update data', () => {
        const updateData = {
          name: 'Updated Agent Name',
        };

        expect(() => updateAgentSchema.parse(updateData)).not.toThrow();
      });

      it('should validate update with new config', () => {
        const updateData = {
          agentConfig: [
            { action: 'goto', url: 'https://updated.com' },
            { action: 'waitForSelector', selector: '#new-element', metadata: { selector: '#new-element', tag: 'div', timestamp: Date.now() } },
          ],
        };

        expect(() => updateAgentSchema.parse(updateData)).not.toThrow();
      });

      it('should validate empty update object', () => {
        expect(() => updateAgentSchema.parse({})).not.toThrow();
      });

      it('should reject invalid agentConfig in update', () => {
        const invalidUpdate = {
          agentConfig: [{ action: 'invalid', selector: '#element' }],
        };

        expect(() => updateAgentSchema.parse(invalidUpdate)).toThrow();
      });
    });
  });

  describe('Variable Substitution', () => {
    it('should accept config with login variables', () => {
      const configWithVariables: AgentConfig = [
        { action: 'type', selector: '#username', value: '{{login.username}}', metadata: { selector: '#username', tag: 'input', timestamp: Date.now() } },
        { action: 'type', selector: '#password', value: '{{login.password}}', metadata: { selector: '#password', tag: 'input', timestamp: Date.now() } },
      ];

      expect(() => agentConfigSchema.parse(configWithVariables)).not.toThrow();
    });

    it('should accept mixed literal and variable values', () => {
      const mixedConfig: AgentConfig = [
        { action: 'goto', url: 'https://example.com' },
        { action: 'type', selector: '#username', value: '{{login.username}}', metadata: { selector: '#username', tag: 'input', timestamp: Date.now() } },
        { action: 'type', selector: '#company', value: 'MyCompany', metadata: { selector: '#company', tag: 'input', timestamp: Date.now() } },
      ];

      expect(() => agentConfigSchema.parse(mixedConfig)).not.toThrow();
    });
  });
});
