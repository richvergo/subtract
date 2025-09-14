import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST as recordWorkflow } from '@/app/api/agents/record/route';
import { POST as annotateWorkflow } from '@/app/api/agents/[id]/annotate/route';
import { POST as repairSelector } from '@/app/api/agents/[id]/repair/route';
import { db } from '@/lib/db';
import { llmService } from '@/lib/llm-service';
import { AgentExecutor } from '@/lib/agent-executor';

// Mock the LLM service
jest.mock('@/lib/llm-service', () => ({
  llmService: {
    annotateWorkflow: jest.fn(),
    repairSelector: jest.fn(),
  },
}));

// Mock the database
jest.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: jest.fn(),
    },
    login: {
      findMany: jest.fn(),
    },
    agent: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    agentLogin: {
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock NextAuth route
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}));

describe('Workflow Recording Pipeline', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
  };

  const mockLogin = {
    id: 'login-1',
    name: 'Test Login',
    loginUrl: 'https://example.com/login',
    ownerId: 'user-1',
  };

  const mockAgent = {
    id: 'agent-1',
    name: 'Test Agent',
    description: 'Test agent description',
    config: JSON.stringify([
      { action: 'goto', url: 'https://example.com' },
      { action: 'click', selector: '#login-btn' },
      { action: 'type', selector: '#email', value: 'test@example.com' },
    ]),
    intents: null,
    ownerId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRecordedSteps = [
    { action: 'goto', url: 'https://example.com' },
    { action: 'click', selector: '#login-btn' },
    { action: 'type', selector: '#email', value: 'test@example.com' },
  ];

  const mockIntents = [
    {
      action: 'goto',
      intent: 'Navigate to the login page to access the application',
      stepIndex: 0,
    },
    {
      action: 'click',
      selector: '#login-btn',
      intent: 'Click the login button to authenticate into the system',
      stepIndex: 1,
    },
    {
      action: 'type',
      selector: '#email',
      intent: 'Enter email address in the login form',
      stepIndex: 2,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock session
    require('next-auth').getServerSession.mockResolvedValue({
      user: { email: mockUser.email },
    });

    // Mock database calls
    (db.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (db.login.findMany as jest.Mock).mockResolvedValue([mockLogin]);
    (db.agent.create as jest.Mock).mockResolvedValue(mockAgent);
    (db.agent.findFirst as jest.Mock).mockResolvedValue(mockAgent);
    (db.agent.findUnique as jest.Mock).mockResolvedValue(mockAgent);
    (db.agent.update as jest.Mock).mockResolvedValue({
      ...mockAgent,
      intents: JSON.stringify(mockIntents),
    });
    (db.agentLogin.createMany as jest.Mock).mockResolvedValue({});
    (db.$transaction as jest.Mock).mockImplementation((callback) => callback({
      agent: { create: db.agent.create },
      agentLogin: { createMany: db.agentLogin.createMany },
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/agents/record', () => {
    it('should record workflow with LLM annotations', async () => {
      // Mock LLM annotation
      (llmService.annotateWorkflow as jest.Mock).mockResolvedValue(mockIntents);

      const requestBody = {
        name: 'Test Agent',
        description: 'Test agent description',
        userPrompt: 'Login to the application',
        recordedSteps: mockRecordedSteps,
        loginIds: ['login-1'],
      };

      const request = new NextRequest('http://localhost:3000/api/agents/record', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await recordWorkflow(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.agent).toBeDefined();
      expect(data.agent.agentIntents).toEqual(mockIntents);
      expect(llmService.annotateWorkflow).toHaveBeenCalledWith(
        mockRecordedSteps,
        'Login to the application',
        'Test agent description'
      );
    });

    it('should handle LLM annotation failure gracefully', async () => {
      // Mock LLM failure
      (llmService.annotateWorkflow as jest.Mock).mockRejectedValue(new Error('LLM API error'));

      const requestBody = {
        name: 'Test Agent',
        description: 'Test agent description',
        userPrompt: 'Login to the application',
        recordedSteps: mockRecordedSteps,
        loginIds: ['login-1'],
      };

      const request = new NextRequest('http://localhost:3000/api/agents/record', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await recordWorkflow(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.agent.agentIntents).toEqual([]);
    });
  });

  describe('POST /api/agents/[id]/annotate', () => {
    it('should annotate existing agent workflow', async () => {
      // Mock LLM annotation
      (llmService.annotateWorkflow as jest.Mock).mockResolvedValue(mockIntents);

      const requestBody = {
        userPrompt: 'Login to the application',
        recordedSteps: mockRecordedSteps,
      };

      const request = new NextRequest('http://localhost:3000/api/agents/agent-1/annotate', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await annotateWorkflow(request, { params: { id: 'agent-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.agentIntents).toEqual(mockIntents);
      expect(db.agent.update).toHaveBeenCalledWith({
        where: { id: 'agent-1' },
        data: { intents: JSON.stringify(mockIntents) },
      });
    });
  });

  describe('POST /api/agents/[id]/repair', () => {
    it('should repair failed selector using LLM', async () => {
      // Mock LLM repair
      const mockRepairResult = {
        selector: 'button[data-testid="login-button"]',
        confidence: 0.9,
        reasoning: 'Found a button with data-testid that appears to be the login button',
      };
      (llmService.repairSelector as jest.Mock).mockResolvedValue(mockRepairResult);

      // Mock agent with intents
      const agentWithIntents = {
        ...mockAgent,
        intents: JSON.stringify(mockIntents),
      };
      (db.agent.findFirst as jest.Mock).mockResolvedValue(agentWithIntents);

      const requestBody = {
        stepIndex: 1,
        failedSelector: '#login-btn',
        domSnapshot: '<html><body><button data-testid="login-button">Login</button></body></html>',
        intent: 'Click the login button to authenticate into the system',
      };

      const request = new NextRequest('http://localhost:3000/api/agents/agent-1/repair', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await repairSelector(request, { params: { id: 'agent-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.repairedSelector).toBe(mockRepairResult.selector);
      expect(data.confidence).toBe(mockRepairResult.confidence);
      expect(data.reasoning).toBe(mockRepairResult.reasoning);
    });

    it('should handle missing intent gracefully', async () => {
      // Mock agent without intents
      (db.agent.findFirst as jest.Mock).mockResolvedValue(mockAgent);

      const requestBody = {
        stepIndex: 1,
        failedSelector: '#login-btn',
        domSnapshot: '<html><body><button data-testid="login-button">Login</button></body></html>',
        intent: 'Click the login button to authenticate into the system',
      };

      const request = new NextRequest('http://localhost:3000/api/agents/agent-1/repair', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await repairSelector(request, { params: { id: 'agent-1' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('No intent found for this step');
    });
  });

  describe('AgentExecutor with Repair Mechanism', () => {
    it('should attempt repair when selector fails', async () => {
      // Mock Puppeteer
      const mockPage = {
        goto: jest.fn(),
        waitForSelector: jest.fn()
          .mockResolvedValueOnce(null) // First call fails
          .mockResolvedValueOnce({ click: jest.fn() }), // Second call succeeds
        click: jest.fn(),
        content: jest.fn().mockResolvedValue('<html><body><button data-testid="login-button">Login</button></body></html>'),
      };

      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn(),
      };

      jest.doMock('puppeteer', () => ({
        launch: jest.fn().mockResolvedValue(mockBrowser),
      }));

      // Mock LLM repair
      const mockRepairResult = {
        selector: 'button[data-testid="login-button"]',
        confidence: 0.9,
        reasoning: 'Found alternative selector',
      };
      (llmService.repairSelector as jest.Mock).mockResolvedValue(mockRepairResult);

      const context = {
        agentId: 'agent-1',
        runId: 'run-1',
        agentConfig: [
          { action: 'goto', url: 'https://example.com' },
          { action: 'click', selector: '#login-btn' }, // This will fail
        ],
        agentIntents: [
          { action: 'goto', intent: 'Navigate to the page', stepIndex: 0 },
          { action: 'click', selector: '#login-btn', intent: 'Click the login button', stepIndex: 1 },
        ],
        logins: [],
      };

      const executor = new AgentExecutor(context);
      
      // Mock the browser launch and page creation
      (executor as any).browser = mockBrowser;
      (executor as any).page = mockPage;

      // Mock the click method to simulate failure
      const originalHandleClick = (executor as any).handleClick;
      (executor as any).handleClick = jest.fn()
        .mockRejectedValueOnce(new Error('Selector not found'))
        .mockResolvedValueOnce(undefined);

      // Execute the workflow
      const result = await executor.execute();

      expect(result.status).toBe('FAILED'); // Should fail because we're not actually running Puppeteer
      expect(llmService.repairSelector).toHaveBeenCalledWith(
        '#login-btn',
        'Click the login button',
        expect.any(String),
        'click'
      );
    });
  });

  describe('Schema Validation', () => {
    it('should validate recordWorkflowSchema correctly', async () => {
      const validData = {
        name: 'Test Agent',
        description: 'Test description',
        userPrompt: 'Login to the application',
        recordedSteps: mockRecordedSteps,
        loginIds: ['login-1'],
      };

      const request = new NextRequest('http://localhost:3000/api/agents/record', {
        method: 'POST',
        body: JSON.stringify(validData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await recordWorkflow(request);
      expect(response.status).toBe(201);
    });

    it('should reject invalid recordWorkflowSchema', async () => {
      const invalidData = {
        name: '', // Empty name should fail
        userPrompt: 'Login to the application',
        recordedSteps: mockRecordedSteps,
        loginIds: ['login-1'],
      };

      const request = new NextRequest('http://localhost:3000/api/agents/record', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await recordWorkflow(request);
      expect(response.status).toBe(400);
    });
  });
});
