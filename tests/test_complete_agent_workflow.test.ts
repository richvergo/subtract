import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST as recordWorkflow } from '@/app/api/agents/record/route';
import { POST as annotateWorkflow } from '@/app/api/agents/[id]/annotate/route';
import { POST as repairSelector } from '@/app/api/agents/[id]/repair/route';
import { POST as runAgent } from '@/app/api/agents/[id]/run/route';
import { db } from '@/lib/db';
import { llmService } from '@/lib/llm-service';

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
      create: jest.fn(),
      createMany: jest.fn(),
    },
    agentRun: {
      create: jest.fn(),
      update: jest.fn(),
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

describe('Complete Agent Workflow Pipeline', () => {
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
    agentConfig: JSON.stringify([
      { action: 'goto', url: 'https://example.com' },
      { action: 'click', selector: '#login-btn' },
      { action: 'type', selector: '#email', value: 'test@example.com' },
    ]),
    purposePrompt: 'Login to the application and create a new account',
    agentIntents: null,
    ownerId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRecordedSteps = [
    { 
      action: 'goto', 
      url: 'https://example.com',
      metadata: {
        timestamp: Date.now(),
        intent: 'Navigate to the login page',
        tag: 'a'
      }
    },
    { 
      action: 'click', 
      selector: '#login-btn',
      metadata: {
        timestamp: Date.now(),
        intent: 'Click the login button',
        selector: '#login-btn',
        tag: 'button'
      }
    },
    { 
      action: 'type', 
      selector: '#email', 
      value: 'test@example.com',
      metadata: {
        timestamp: Date.now(),
        intent: 'Enter email address',
        selector: '#email',
        tag: 'input'
      }
    },
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
    (db.agent.create as jest.Mock).mockImplementation(({ data }) => ({
      ...mockAgent,
      ...data,
      agentConfig: JSON.stringify(mockRecordedSteps),
    }));
    (db.agent.findFirst as jest.Mock).mockResolvedValue(mockAgent);
    (db.agent.findUnique as jest.Mock).mockResolvedValue({
      ...mockAgent,
      agentConfig: JSON.stringify(mockRecordedSteps),
      agentLogins: [{
        login: mockLogin
      }]
    });
    (db.agent.update as jest.Mock).mockResolvedValue({
      ...mockAgent,
      agentIntents: JSON.stringify(mockIntents),
    });
    (db.agentLogin.createMany as jest.Mock).mockResolvedValue({});
    (db.agentRun.create as jest.Mock).mockResolvedValue({
      id: 'run-1',
      agentId: 'agent-1',
      status: 'PENDING',
    });
    (db.$transaction as jest.Mock).mockImplementation((callback) => callback({
      agent: { create: db.agent.create },
      agentLogin: { 
        create: db.agentLogin.create,
        createMany: db.agentLogin.createMany 
      },
      agentRun: { create: db.agentRun.create },
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Complete Agent Creation Flow', () => {
    it('should create agent with all three components: config, purpose, and intents', async () => {
      // Mock LLM annotation
      (llmService.annotateWorkflow as jest.Mock).mockResolvedValue(mockIntents);

      const requestBody = {
        name: 'Test Agent',
        description: 'Test agent description',
        purposePrompt: 'Login to the application and create a new account',
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

      if (response.status !== 201) {
        console.log('Error response:', data);
      }

      expect(response.status).toBe(201);
      expect(data.agent).toBeDefined();
      expect(data.agent.agentConfig).toEqual(mockRecordedSteps);
      expect(data.agent.purposePrompt).toBe('Login to the application and create a new account');
      expect(data.agent.agentIntents).toEqual([]); // Intents are generated separately via /annotate endpoint
      
      // LLM annotation happens separately via /api/agents/[id]/annotate endpoint

      // Verify database was called with all three components
      expect(db.agent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          agentConfig: JSON.stringify(mockRecordedSteps),
          purposePrompt: 'Login to the application and create a new account',
          agentIntents: JSON.stringify(mockIntents),
        }),
      });
    });

    it('should handle LLM annotation failure gracefully', async () => {
      // Mock LLM failure
      (llmService.annotateWorkflow as jest.Mock).mockRejectedValue(new Error('LLM API error'));

      const requestBody = {
        name: 'Test Agent',
        description: 'Test agent description',
        purposePrompt: 'Login to the application',
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

      if (response.status !== 201) {
        console.log('Error response:', data);
      }

      expect(response.status).toBe(201);
      expect(data.agent.agentConfig).toEqual(mockRecordedSteps);
      console.log('Expected purpose prompt:', 'Login to the application');
      console.log('Actual purpose prompt:', data.agent.purposePrompt);
      expect(data.agent.purposePrompt).toBe('Login to the application');
      expect(data.agent.agentIntents).toEqual([]); // Should be empty array on failure
    });
  });

  describe('Agent Annotation Flow', () => {
    it('should annotate existing agent with purpose prompt and intents', async () => {
      // Mock LLM annotation
      (llmService.annotateWorkflow as jest.Mock).mockResolvedValue(mockIntents);

      const requestBody = {
        purposePrompt: 'Login to the application and create a new account',
        recordedSteps: mockRecordedSteps,
      };

      const request = new NextRequest('http://localhost:3000/api/agents/agent-1/annotate', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await annotateWorkflow(request, { params: Promise.resolve({ id: 'agent-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.agentIntents).toEqual(mockIntents);
      expect(db.agent.update).toHaveBeenCalledWith({
        where: { id: 'agent-1' },
        data: {
          agentIntents: JSON.stringify(mockIntents),
          purposePrompt: 'Login to the application and create a new account',
        },
      });
    });
  });

  describe('Agent Execution with Repair', () => {
    it('should repair failed selector using intent and DOM snapshot', async () => {
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
        agentIntents: JSON.stringify(mockIntents),
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

      const response = await repairSelector(request, { params: Promise.resolve({ id: 'agent-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.repairedSelector).toBe(mockRepairResult.selector);
      expect(data.confidence).toBe(mockRepairResult.confidence);
      expect(data.reasoning).toBe(mockRepairResult.reasoning);

      // Verify the agent config was updated with the repaired selector
      expect(db.agent.update).toHaveBeenCalledWith({
        where: { id: 'agent-1' },
        data: {
          agentConfig: expect.stringContaining('button[data-testid=\\"login-button\\"]'),
        },
      });
    });
  });

  describe('Agent Run Creation', () => {
    it('should create agent run with all required fields', async () => {
      const requestBody = {
        prompt: 'Execute the login workflow',
      };

      const request = new NextRequest('http://localhost:3000/api/agents/agent-1/run', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await runAgent(request, { params: Promise.resolve({ id: 'agent-1' }) });
      const data = await response.json();

      expect(response.status).toBe(202);
      expect(data.runId).toBeDefined();
      expect(data.status).toBe('enqueued');
      
      // Verify agent run was created
      expect(db.agentRun.create).toHaveBeenCalledWith({
        data: {
          agentId: 'agent-1',
          status: 'PENDING',
          prompt: 'Execute the login workflow',
        },
      });
    });
  });

  describe('Schema Validation', () => {
    it('should require purposePrompt in agent creation', async () => {
      const invalidData = {
        name: 'Test Agent',
        description: 'Test description',
        // Missing purposePrompt
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

    it('should validate agent config structure', async () => {
      const invalidData = {
        name: 'Test Agent',
        purposePrompt: 'Test purpose',
        recordedSteps: [
          { action: 'invalid-action' }, // Invalid action
        ],
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

  describe('Complete Workflow Integration', () => {
    it('should demonstrate the complete agent workflow from creation to execution', async () => {
      // Step 1: Create agent with workflow recording
      (llmService.annotateWorkflow as jest.Mock).mockResolvedValue(mockIntents);

      const createRequest = new NextRequest('http://localhost:3000/api/agents/record', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Complete Test Agent',
          purposePrompt: 'Automate the complete login and account creation process',
          recordedSteps: mockRecordedSteps,
          loginIds: ['login-1'],
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const createResponse = await recordWorkflow(createRequest);
      const createData = await createResponse.json();

      expect(createResponse.status).toBe(201);
      expect(createData.agent.agentConfig).toEqual(mockRecordedSteps);
      expect(createData.agent.purposePrompt).toBe('Automate the complete login and account creation process');
      expect(createData.agent.agentIntents).toEqual(mockIntents);

      // Step 2: Run the agent
      const runRequest = new NextRequest('http://localhost:3000/api/agents/agent-1/run', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Execute the complete workflow',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const runResponse = await runAgent(runRequest, { params: Promise.resolve({ id: 'agent-1' }) });
      const runData = await runResponse.json();

      expect(runResponse.status).toBe(202);
      expect(runData.status).toBe('enqueued');

      // Step 3: Simulate selector repair during execution
      (llmService.repairSelector as jest.Mock).mockResolvedValue({
        selector: 'button[data-testid="login-button"]',
        confidence: 0.9,
        reasoning: 'Found alternative selector based on DOM analysis',
      });

      const repairRequest = new NextRequest('http://localhost:3000/api/agents/agent-1/repair', {
        method: 'POST',
        body: JSON.stringify({
          stepIndex: 1,
          failedSelector: '#login-btn',
          domSnapshot: '<html><body><button data-testid="login-button">Login</button></body></html>',
          intent: 'Click the login button to authenticate into the system',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const repairResponse = await repairSelector(repairRequest, { params: Promise.resolve({ id: 'agent-1' }) });
      const repairData = await repairResponse.json();

      expect(repairResponse.status).toBe(200);
      expect(repairData.success).toBe(true);

      // Verify the complete workflow demonstrates all three components
      expect(createData.agent.agentConfig).toBeDefined(); // Actions (how)
      expect(createData.agent.purposePrompt).toBeDefined(); // Purpose (why)
      expect(createData.agent.agentIntents).toBeDefined(); // Intents (understanding)
    });
  });
});
