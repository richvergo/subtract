import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST as recordAgent } from '@/app/api/agents/record/route';
import { GET as getRecording } from '@/app/api/agents/[id]/recording/route';
import { db } from '@/lib/db';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
  default: jest.fn().mockReturnValue({
    GET: jest.fn(),
    POST: jest.fn()
  }),
}));

// Mock the auth module
jest.mock('@/lib/auth', () => ({
  getUserEmailForQuery: jest.fn(() => 'test@example.com'),
}));

// Mock NextAuth route
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}));

describe('Agent Recording API', () => {
  const testUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  };

  const testAgent = {
    id: 'test-agent-id',
    name: 'Test Agent',
    purposePrompt: 'Test purpose',
    ownerId: testUser.id,
  };

  beforeEach(async () => {
    // Mock authentication
    const { getServerSession } = require('next-auth');
    getServerSession.mockResolvedValue({
      user: { email: testUser.email },
    });

    // Create test user
    await db.user.upsert({
      where: { email: testUser.email },
      update: {},
      create: {
        id: testUser.id,
        email: testUser.email,
        passwordHash: 'test-hash',
      },
    });

    // Clean up any existing test files
    const uploadsDir = join(process.cwd(), 'uploads', 'agents');
    if (existsSync(uploadsDir)) {
      const files = await import('fs/promises').then(fs => fs.readdir(uploadsDir));
      for (const file of files) {
        if (file.startsWith('agent_')) {
          await unlink(join(uploadsDir, file));
        }
      }
    }
  });

  afterEach(async () => {
    // Clean up test data
    await db.agent.deleteMany({
      where: { ownerId: testUser.id },
    });
    await db.user.deleteMany({
      where: { email: testUser.email },
    });
  });

  describe('POST /api/agents/record', () => {
    it('should create agent with recording when valid FormData is provided', async () => {
      // Create a test video file
      const testVideoContent = Buffer.from('fake video content');
      const testFile = new File([testVideoContent], 'test.webm', {
        type: 'video/webm',
      });

      // Create FormData
      const formData = new FormData();
      formData.append('name', testAgent.name);
      formData.append('purposePrompt', testAgent.purposePrompt);
      formData.append('file', testFile);

      // Create request
      const request = new NextRequest('http://localhost:3000/api/agents/record', {
        method: 'POST',
        body: formData,
      });

      // Call the endpoint
      const response = await recordAgent(request);
      const responseData = await response.json();

      // Assertions
      expect(response.status).toBe(201);
      expect(responseData.agent).toBeDefined();
      expect(responseData.agent.name).toBe(testAgent.name);
      expect(responseData.agent.purposePrompt).toBe(testAgent.purposePrompt);
      expect(responseData.agent.recordingUrl).toBeDefined();
      expect(responseData.agent.recordingUrl).toMatch(/^\/uploads\/agents\/agent_\d+\.webm$/);

      // Verify file was saved
      const filePath = join(process.cwd(), responseData.agent.recordingUrl);
      expect(existsSync(filePath)).toBe(true);

      // Verify database record
      const dbAgent = await db.agent.findUnique({
        where: { id: responseData.agent.id },
      });
      expect(dbAgent).toBeDefined();
      expect(dbAgent?.recordingUrl).toBe(responseData.agent.recordingUrl);
    });

    it('should reject file that is too large', async () => {
      // Create a large test file (simulate > 100MB)
      const largeContent = Buffer.alloc(101 * 1024 * 1024); // 101MB
      const testFile = new File([largeContent], 'large.webm', {
        type: 'video/webm',
      });

      const formData = new FormData();
      formData.append('name', testAgent.name);
      formData.append('purposePrompt', testAgent.purposePrompt);
      formData.append('file', testFile);

      const request = new NextRequest('http://localhost:3000/api/agents/record', {
        method: 'POST',
        body: formData,
      });

      const response = await recordAgent(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toContain('File too large');
    });

    it('should reject invalid file type', async () => {
      const testFile = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });

      const formData = new FormData();
      formData.append('name', testAgent.name);
      formData.append('purposePrompt', testAgent.purposePrompt);
      formData.append('file', testFile);

      const request = new NextRequest('http://localhost:3000/api/agents/record', {
        method: 'POST',
        body: formData,
      });

      const response = await recordAgent(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toContain('Invalid file type');
    });

    it('should reject request without file', async () => {
      const formData = new FormData();
      formData.append('name', testAgent.name);
      formData.append('purposePrompt', testAgent.purposePrompt);
      // No file appended

      const request = new NextRequest('http://localhost:3000/api/agents/record', {
        method: 'POST',
        body: formData,
      });

      const response = await recordAgent(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toContain('No file uploaded');
    });
  });

  describe('GET /api/agents/[id]/recording', () => {
    it('should return recording file when agent has recording', async () => {
      // Create agent with recording
      const agent = await db.agent.create({
        data: {
          name: testAgent.name,
          purposePrompt: testAgent.purposePrompt,
          recordingUrl: '/uploads/agents/test_recording.webm',
          ownerId: testUser.id,
        },
      });

      // Create test file
      const uploadsDir = join(process.cwd(), 'uploads', 'agents');
      await mkdir(uploadsDir, { recursive: true });
      const testContent = Buffer.from('fake video content');
      await writeFile(join(uploadsDir, 'test_recording.webm'), testContent);

      // Create request
      const request = new NextRequest(`http://localhost:3000/api/agents/${agent.id}/recording`);
      const params = { id: agent.id };

      // Call the endpoint
      const response = await getRecording(request, { params: Promise.resolve(params) });

      // Assertions
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('video/webm');
      expect(response.headers.get('Content-Length')).toBe(testContent.length.toString());

      // Clean up test file
      await unlink(join(uploadsDir, 'test_recording.webm'));
    });

    it('should return 404 when agent has no recording', async () => {
      // Create agent without recording
      const agent = await db.agent.create({
        data: {
          name: testAgent.name,
          purposePrompt: testAgent.purposePrompt,
          ownerId: testUser.id,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/agents/${agent.id}/recording`);
      const params = { id: agent.id };

      const response = await getRecording(request, { params: Promise.resolve(params) });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error).toContain('No recording found');
    });

    it('should return 404 when recording file does not exist', async () => {
      // Create agent with recording URL but file doesn't exist
      const agent = await db.agent.create({
        data: {
          name: testAgent.name,
          purposePrompt: testAgent.purposePrompt,
          recordingUrl: '/uploads/agents/nonexistent.webm',
          ownerId: testUser.id,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/agents/${agent.id}/recording`);
      const params = { id: agent.id };

      const response = await getRecording(request, { params: Promise.resolve(params) });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error).toContain('Recording file not found');
    });
  });
});
