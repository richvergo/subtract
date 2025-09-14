/**
 * Reference API test for /api/agents/record
 * Tests the single-step agent creation endpoint
 */

// Mock the database to use test database
jest.mock('../src/lib/db', () => {
  const { testDb } = require('./setup');
  return {
    db: testDb,
    prisma: testDb,
  };
});

// Mock the queue module
jest.mock('../src/lib/queue', () => ({
  enqueueAgentRun: jest.fn().mockResolvedValue({
    id: 'job-123',
    data: { runId: 'run-123', agentId: 'agent-123', ownerId: 'user-123' },
  }),
}));

// Mock the LLM service
jest.mock('../src/lib/llm-service', () => ({
  llmService: {
    annotateWorkflow: jest.fn().mockResolvedValue([
      { intent: 'navigate', description: 'Navigate to a webpage' },
      { intent: 'interact', description: 'Interact with page elements' }
    ])
  }
}));

// Mock NextAuth to ensure it's applied before route imports
const mockGetServerSession = jest.fn();
jest.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
  default: jest.fn().mockReturnValue({
    GET: jest.fn(),
    POST: jest.fn()
  }),
  __esModule: true,
}));

// Mock the authOptions import
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {
    providers: [],
    callbacks: {
      session: jest.fn(),
      jwt: jest.fn()
    }
  }
}));

import { POST } from "@/app/api/agents/record/route";
import { NextRequest } from "next/server";
import { testDb, createTestUser, createTestLogin } from "./setup";

describe("POST /api/agents/record", () => {
  let testUser: any;
  let testLogin: any;

  beforeEach(async () => {
    testUser = await createTestUser('test@example.com');
    testLogin = await createTestLogin(testUser.id, 'Test Login');
    
    // Update the mock to return the correct user ID for this test
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

  it("creates a new agent in DRAFT with processing status", async () => {
    const agentData = {
      name: "Test Agent",
      description: "A test agent created by API test",
      purposePrompt: "This agent is created by API test",
      recordedSteps: [
        { action: 'goto', url: 'https://example.com' },
        { action: 'waitForSelector', selector: 'body' },
        { action: 'click', selector: '#submit' },
      ],
      loginIds: [testLogin.id],
    };

    const req = new NextRequest("http://localhost/api/agents/record", {
      method: "POST",
      body: JSON.stringify(agentData),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("purposePrompt", "This agent is created by API test");
    expect(data).toHaveProperty("status", "DRAFT");
    expect(data).toHaveProperty("processingStatus", "processing");
  });

  it("rejects requests without required fields", async () => {
    const agentData = {
      name: "Test Agent",
      // Missing purposePrompt, recordedSteps, and loginIds
    };

    const req = new NextRequest("http://localhost/api/agents/record", {
      method: "POST",
      body: JSON.stringify(agentData),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toHaveProperty("error");
  });

  it("rejects unauthenticated requests", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const agentData = {
      name: "Test Agent",
      purposePrompt: "This agent is created by API test",
      recordedSteps: [
        { action: 'goto', url: 'https://example.com' },
      ],
      loginIds: [testLogin.id],
    };

    const req = new NextRequest("http://localhost/api/agents/record", {
      method: "POST",
      body: JSON.stringify(agentData),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toHaveProperty("error", "Unauthorized");
  });
});
