// Set up test environment variables before importing modules
process.env.DATABASE_URL = 'file:./test.db';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.DISABLE_DB_AUDIT = '1';

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/agents/[id]/recording/route';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/db');
jest.mock('fs/promises');
jest.mock('fs');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockDb = db as jest.Mocked<typeof db>;

describe('/api/agents/[id]/recording', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/agents/[id]/recording', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    const mockAgent = {
      id: 'agent-123',
      name: 'Test Agent',
      recordingUrl: '/uploads/agents/agent_1234567890.webm',
    };

    it('should stream recording file successfully', async () => {
      // Mock session
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
      } as unknown);

      // Mock database operations
      mockDb.user.findUnique.mockResolvedValue({ id: 'user-123' } as unknown);
      mockDb.agent.findFirst.mockResolvedValue(mockAgent as unknown);

      // Mock file system operations
      const mockReadFile = jest.requireMock('fs/promises').readFile;
      const mockExistsSync = jest.requireMock('fs').existsSync;
      
      const mockFileBuffer = Buffer.from('fake video content');
      mockReadFile.mockResolvedValue(mockFileBuffer);
      mockExistsSync.mockReturnValue(true);

      const request = new NextRequest('http://localhost:3000/api/agents/agent-123/recording');
      const params = { id: 'agent-123' };

      const response = await GET(request, { params: Promise.resolve(params) });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('video/webm');
      expect(response.headers.get('Content-Length')).toBe(mockFileBuffer.length.toString());
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
      expect(response.headers.get('Content-Disposition')).toContain('Test Agent_recording.webm');
    });

    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/agents/agent-123/recording');
      const params = { id: 'agent-123' };

      const response = await GET(request, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when user is not found', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
      } as unknown);

      mockDb.user.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/agents/agent-123/recording');
      const params = { id: 'agent-123' };

      const response = await GET(request, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 404 when agent is not found', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
      } as unknown);

      mockDb.user.findUnique.mockResolvedValue({ id: 'user-123' } as unknown);
      mockDb.agent.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/agents/agent-123/recording');
      const params = { id: 'agent-123' };

      const response = await GET(request, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Agent not found');
    });

    it('should return 404 when agent has no recording', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
      } as unknown);

      mockDb.user.findUnique.mockResolvedValue({ id: 'user-123' } as unknown);
      mockDb.agent.findFirst.mockResolvedValue({
        ...mockAgent,
        recordingUrl: null,
      } as unknown);

      const request = new NextRequest('http://localhost:3000/api/agents/agent-123/recording');
      const params = { id: 'agent-123' };

      const response = await GET(request, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('No recording found for this agent');
    });

    it('should return 404 when recording file does not exist', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
      } as unknown);

      mockDb.user.findUnique.mockResolvedValue({ id: 'user-123' } as unknown);
      mockDb.agent.findFirst.mockResolvedValue(mockAgent as unknown);

      // Mock file system operations
      const mockExistsSync = jest.requireMock('fs').existsSync;
      mockExistsSync.mockReturnValue(false); // File doesn't exist

      const request = new NextRequest('http://localhost:3000/api/agents/agent-123/recording');
      const params = { id: 'agent-123' };

      const response = await GET(request, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Recording file not found');
    });

    it('should handle MP4 files correctly', async () => {
      // Mock session
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
      } as unknown);

      // Mock database operations
      mockDb.user.findUnique.mockResolvedValue({ id: 'user-123' } as unknown);
      mockDb.agent.findFirst.mockResolvedValue({
        ...mockAgent,
        recordingUrl: '/uploads/agents/agent_1234567890.mp4',
      } as unknown);

      // Mock file system operations
      const mockReadFile = jest.requireMock('fs/promises').readFile;
      const mockExistsSync = jest.requireMock('fs').existsSync;
      
      const mockFileBuffer = Buffer.from('fake video content');
      mockReadFile.mockResolvedValue(mockFileBuffer);
      mockExistsSync.mockReturnValue(true);

      const request = new NextRequest('http://localhost:3000/api/agents/agent-123/recording');
      const params = { id: 'agent-123' };

      const response = await GET(request, { params: Promise.resolve(params) });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('video/mp4');
      expect(response.headers.get('Content-Disposition')).toContain('Test Agent_recording.mp4');
    });

    it('should return 500 when file read fails', async () => {
      // Mock session
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
      } as unknown);

      // Mock database operations
      mockDb.user.findUnique.mockResolvedValue({ id: 'user-123' } as unknown);
      mockDb.agent.findFirst.mockResolvedValue(mockAgent as unknown);

      // Mock file system operations
      const mockReadFile = jest.requireMock('fs/promises').readFile;
      const mockExistsSync = jest.requireMock('fs').existsSync;
      
      mockReadFile.mockRejectedValue(new Error('File read error'));
      mockExistsSync.mockReturnValue(true);

      const request = new NextRequest('http://localhost:3000/api/agents/agent-123/recording');
      const params = { id: 'agent-123' };

      const response = await GET(request, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to read recording file');
    });
  });
});
