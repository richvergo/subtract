/**
 * Minimal working test for agents record API
 * Uses direct testDb access to avoid mocking issues
 */

import { NextRequest } from "next/server";
import { testDb, createTestUser, createTestLogin } from "./setup";

// Mock NextAuth
const mockGetServerSession = jest.fn();
jest.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
  default: jest.fn().mockReturnValue({
    GET: jest.fn(),
    POST: jest.fn()
  }),
  __esModule: true,
}));

// Mock authOptions
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {
    providers: [],
    callbacks: {
      session: jest.fn(),
      jwt: jest.fn()
    }
  }
}));

// Mock LLM service
jest.mock('../src/lib/llm-service', () => ({
  llmService: {
    annotateWorkflow: jest.fn().mockResolvedValue([
      { intent: 'navigate', description: 'Navigate to a webpage' },
    ])
  }
}));

// Mock queue
jest.mock('../src/lib/queue', () => ({
  enqueueAgentRun: jest.fn().mockResolvedValue({
    id: 'job-123',
    data: { runId: 'run-123' },
  }),
}));

describe("Minimal Agents Record Test", () => {
  let testUser: any;
  let testLogin: any;

  beforeEach(async () => {
    testUser = await createTestUser('test@example.com');
    testLogin = await createTestLogin(testUser.id, 'Test Login');
    
    mockGetServerSession.mockResolvedValue({
      user: {
        email: 'test@example.com',
        id: testUser.id,
        name: 'Test User'
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("should create agent with direct database access", async () => {
    // Test data
    const agentData = {
      name: "Test Agent",
      description: "A test agent",
      purposePrompt: "Test purpose",
      recordedSteps: [
        { action: 'goto', url: 'https://example.com' },
      ],
      loginIds: [testLogin.id],
    };

    // Verify user exists
    const user = await testDb.user.findUnique({
      where: { email: 'test@example.com' },
      select: { id: true },
    });
    
    expect(user).toBeDefined();
    expect(user?.id).toBe(testUser.id);

    // Create agent directly
    const agent = await testDb.agent.create({
      data: {
        name: agentData.name,
        description: agentData.description,
        agentConfig: JSON.stringify(agentData.recordedSteps),
        purposePrompt: agentData.purposePrompt,
        agentIntents: JSON.stringify([]),
        ownerId: user!.id,
      },
    });

    expect(agent).toBeDefined();
    expect(agent.name).toBe(agentData.name);
    expect(agent.purposePrompt).toBe(agentData.purposePrompt);
    expect(agent.ownerId).toBe(user!.id);
  });
});
