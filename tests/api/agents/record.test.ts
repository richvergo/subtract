// Set up test environment variables before importing modules
process.env.DATABASE_URL = 'file:./test.db';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.DISABLE_DB_AUDIT = '1';

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/agents/record/route';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/db');
jest.mock('fs/promises');
jest.mock('fs');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockDb = db as jest.Mocked<typeof db>;

describe('/api/agents/record', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/agents/record', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    const mockAgent = {
      id: 'agent-123',
      name: 'Test Agent',
      description: 'Test description',
      purposePrompt: 'Test purpose',
      recordingUrl: '/uploads/agents/agent_1234567890.webm',
      ownerId: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      agentLogins: [],
    };

    it('should create agent with valid file upload', async () => {
      // Mock session
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
      } as unknown);

      // Mock database operations
      mockDb.user.findUnique.mockResolvedValue({ id: 'user-123' } as unknown);
      mockDb.$transaction.mockImplementation(async (callback) => {
        return callback({
          agent: {
            create: jest.fn().mockResolvedValue(mockAgent),
          },
        } as unknown);
      });
      mockDb.agent.findUnique.mockResolvedValue(mockAgent as unknown);

      // Mock file system operations
      const mockWriteFile = jest.requireMock('fs/promises').writeFile;
      const mockMkdir = jest.requireMock('fs/promises').mkdir;
      const mockExistsSync = jest.requireMock('fs').existsSync;
      
      mockWriteFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);
      mockExistsSync.mockReturnValue(true);

      // Create FormData with valid file
      const formData = new FormData();
      formData.append('name', 'Test Agent');
      formData.append('purposePrompt', 'Test purpose');
      
      // Create a mock file blob
      const mockFile = new File(['fake video content'], 'test.webm', {
        type: 'video/webm',
      });
      formData.append('file', mockFile);

      const request = new NextRequest('http://localhost:3000/api/agents/record', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.agent).toBeDefined();
      expect(data.agent.name).toBe('Test Agent');
      expect(data.agent.recordingUrl).toBeDefined();
      expect(data.message).toBe('Agent created with recording successfully');
    });

    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const formData = new FormData();
      formData.append('name', 'Test Agent');
      formData.append('purposePrompt', 'Test purpose');
      
      const mockFile = new File(['fake video content'], 'test.webm', {
        type: 'video/webm',
      });
      formData.append('file', mockFile);

      const request = new NextRequest('http://localhost:3000/api/agents/record', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when file is too large', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
      } as unknown);

      mockDb.user.findUnique.mockResolvedValue({ id: 'user-123' } as unknown);

      const formData = new FormData();
      formData.append('name', 'Test Agent');
      formData.append('purposePrompt', 'Test purpose');
      
      // Create a large file (over 100MB)
      const largeContent = 'x'.repeat(101 * 1024 * 1024); // 101MB
      const mockFile = new File([largeContent], 'large.webm', {
        type: 'video/webm',
      });
      formData.append('file', mockFile);

      const request = new NextRequest('http://localhost:3000/api/agents/record', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('File too large');
    });

    it('should return 400 when file type is invalid', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
      } as unknown);

      mockDb.user.findUnique.mockResolvedValue({ id: 'user-123' } as unknown);

      const formData = new FormData();
      formData.append('name', 'Test Agent');
      formData.append('purposePrompt', 'Test purpose');
      
      // Create file with invalid MIME type
      const mockFile = new File(['fake content'], 'test.txt', {
        type: 'text/plain',
      });
      formData.append('file', mockFile);

      const request = new NextRequest('http://localhost:3000/api/agents/record', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid file type');
    });

    it('should return 400 when required fields are missing', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
      } as unknown);

      mockDb.user.findUnique.mockResolvedValue({ id: 'user-123' } as unknown);

      const formData = new FormData();
      // Missing name and purposePrompt
      const mockFile = new File(['fake video content'], 'test.webm', {
        type: 'video/webm',
      });
      formData.append('file', mockFile);

      const request = new NextRequest('http://localhost:3000/api/agents/record', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 when no file is uploaded', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
      } as unknown);

      mockDb.user.findUnique.mockResolvedValue({ id: 'user-123' } as unknown);

      const formData = new FormData();
      formData.append('name', 'Test Agent');
      formData.append('purposePrompt', 'Test purpose');
      // No file appended

      const request = new NextRequest('http://localhost:3000/api/agents/record', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No file uploaded');
    });

    it('should return 404 when user is not found', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
      } as unknown);

      mockDb.user.findUnique.mockResolvedValue(null);

      const formData = new FormData();
      formData.append('name', 'Test Agent');
      formData.append('purposePrompt', 'Test purpose');
      
      const mockFile = new File(['fake video content'], 'test.webm', {
        type: 'video/webm',
      });
      formData.append('file', mockFile);

      const request = new NextRequest('http://localhost:3000/api/agents/record', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });
  });
});
