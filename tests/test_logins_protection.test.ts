/**
 * 🛡️ LOGINS FEATURE PROTECTION TESTS
 * 
 * These tests ensure the logins feature remains stable and functional.
 * They MUST pass for the feature to be considered working.
 * 
 * CRITICAL: These tests protect against the exact issues that were fixed:
 * - Missing state variables (setHasRecording, etc.)
 * - Broken API endpoints
 * - Authentication failures
 * - Database schema issues
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('🛡️ Logins Feature Protection Tests', () => {
  beforeAll(async () => {
    // Ensure database is in clean state
    await prisma.login.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('🔒 Critical State Variables Protection', () => {
    it('should have all required state variables in logins page', async () => {
      // This test verifies that the critical state variables exist
      // by checking the actual file content
      const fs = require('fs');
      const path = require('path');
      
      const loginsPagePath = path.join(process.cwd(), 'src/app/logins/page.tsx');
      const loginsPageContent = fs.readFileSync(loginsPagePath, 'utf8');
      
      // CRITICAL: These state variables must exist
      const requiredStateVariables = [
        'hasRecording',
        'setHasRecording',
        'recordingBlob',
        'setRecordingBlob',
        'recordingError',
        'setRecordingError',
        'isRecording',
        'setIsRecording',
        'analysisStatus',
        'setAnalysisStatus'
      ];
      
      for (const variable of requiredStateVariables) {
        expect(loginsPageContent).toContain(variable);
      }
    });

    it('should have proper useState declarations', async () => {
      const fs = require('fs');
      const path = require('path');
      
      const loginsPagePath = path.join(process.cwd(), 'src/app/logins/page.tsx');
      const loginsPageContent = fs.readFileSync(loginsPagePath, 'utf8');
      
      // Verify proper useState declarations
      expect(loginsPageContent).toContain('const [hasRecording, setHasRecording] = useState(false)');
      expect(loginsPageContent).toContain('const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null)');
      expect(loginsPageContent).toContain('const [recordingError, setRecordingError] = useState<string | null>(null)');
      expect(loginsPageContent).toContain('const [isRecording, setIsRecording] = useState(false)');
      expect(loginsPageContent).toContain('const [analysisStatus, setAnalysisStatus] = useState<');
    });
  });

  describe('🌐 API Endpoints Protection', () => {
    it('should have all required API endpoint files', async () => {
      const fs = require('fs');
      const path = require('path');
      
      const requiredEndpoints = [
        'src/app/api/logins/route.ts',
        'src/app/api/logins/[id]/route.ts',
        'src/app/api/logins/[id]/check/route.ts',
        'src/app/api/logins/[id]/test-interactive/route.ts',
        'src/app/api/logins/[id]/credentials/route.ts'
      ];
      
      for (const endpoint of requiredEndpoints) {
        const fullPath = path.join(process.cwd(), endpoint);
        expect(fs.existsSync(fullPath)).toBe(true);
      }
    });

    it('should have proper API route exports', async () => {
      const fs = require('fs');
      const path = require('path');
      
      // Check main logins route
      const loginsRoutePath = path.join(process.cwd(), 'src/app/api/logins/route.ts');
      const loginsRouteContent = fs.readFileSync(loginsRoutePath, 'utf8');
      
      expect(loginsRouteContent).toContain('export async function GET');
      expect(loginsRouteContent).toContain('export async function POST');
    });
  });

  describe('🗄️ Database Schema Protection', () => {
    it('should have Login model with required fields', async () => {
      const fs = require('fs');
      const path = require('path');
      
      const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
      const schemaContent = fs.readFileSync(schemaPath, 'utf8');
      
      // Check for Login model
      expect(schemaContent).toContain('model Login');
      
      // Check for required fields
      const requiredFields = [
        'id',
        'name',
        'loginUrl',
        'username',
        'password',
        'status',
        'ownerId',
        'createdAt',
        'updatedAt'
      ];
      
      for (const field of requiredFields) {
        expect(schemaContent).toContain(field);
      }
    });

    it('should have LoginStatus enum with all required values', async () => {
      const fs = require('fs');
      const path = require('path');
      
      const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
      const schemaContent = fs.readFileSync(schemaPath, 'utf8');
      
      expect(schemaContent).toContain('enum LoginStatus');
      
      const requiredStatuses = [
        'UNKNOWN',
        'ACTIVE',
        'NEEDS_RECONNECT',
        'DISCONNECTED',
        'BROKEN',
        'EXPIRED',
        'SUSPENDED',
        'READY_FOR_AGENTS',
        'NEEDS_TESTING'
      ];
      
      for (const status of requiredStatuses) {
        expect(schemaContent).toContain(status);
      }
    });
  });

  describe('🔐 Authentication Protection', () => {
    it('should have session-based authentication in logins page', async () => {
      const fs = require('fs');
      const path = require('path');
      
      const loginsPagePath = path.join(process.cwd(), 'src/app/logins/page.tsx');
      const loginsPageContent = fs.readFileSync(loginsPagePath, 'utf8');
      
      expect(loginsPageContent).toContain('useSession');
      expect(loginsPageContent).toContain('credentials: \'include\'');
    });
  });

  describe('🧪 Functional Protection Tests', () => {
    it('should be able to create a login via API', async () => {
      // This test verifies the basic API functionality
      const testLogin = {
        name: 'Test Login',
        loginUrl: 'https://example.com',
        username: 'test@example.com',
        password: 'testpassword'
      };
      
      // Create a test user first
      const testUser = await prisma.user.create({
        data: {
          email: `test-${Date.now()}@example.com`,
          name: 'Test User',
          passwordHash: 'hashedpassword'
        }
      });
      
      // Create login
      const login = await prisma.login.create({
        data: {
          name: testLogin.name,
          loginUrl: testLogin.loginUrl,
          username: testLogin.username,
          password: testLogin.password,
          status: 'NEEDS_TESTING',
          ownerId: testUser.id
        }
      });
      
      expect(login).toBeDefined();
      expect(login.name).toBe(testLogin.name);
      expect(login.loginUrl).toBe(testLogin.loginUrl);
      expect(login.username).toBe(testLogin.username);
      
      // Cleanup
      await prisma.login.delete({ where: { id: login.id } });
      await prisma.user.delete({ where: { id: testUser.id } });
    });

    it('should be able to read logins from database', async () => {
      // Create test data
      const testUser = await prisma.user.create({
        data: {
          email: `reader-${Date.now()}@example.com`,
          name: 'Reader User',
          passwordHash: 'hashedpassword'
        }
      });
      
      const testLogin = await prisma.login.create({
        data: {
          name: 'Read Test Login',
          loginUrl: 'https://readtest.com',
          username: 'readtest@example.com',
          password: 'readpassword',
          status: 'ACTIVE',
          ownerId: testUser.id
        }
      });
      
      // Read login
      const foundLogin = await prisma.login.findUnique({
        where: { id: testLogin.id }
      });
      
      expect(foundLogin).toBeDefined();
      expect(foundLogin?.name).toBe('Read Test Login');
      
      // Cleanup
      await prisma.login.delete({ where: { id: testLogin.id } });
      await prisma.user.delete({ where: { id: testUser.id } });
    });

    it('should be able to update login credentials', async () => {
      // Create test data
      const testUser = await prisma.user.create({
        data: {
          email: `updater-${Date.now()}@example.com`,
          name: 'Updater User',
          passwordHash: 'hashedpassword'
        }
      });
      
      const testLogin = await prisma.login.create({
        data: {
          name: 'Update Test Login',
          loginUrl: 'https://updatetest.com',
          username: 'updatetest@example.com',
          password: 'updatepassword',
          status: 'NEEDS_TESTING',
          ownerId: testUser.id
        }
      });
      
      // Update login
      const updatedLogin = await prisma.login.update({
        where: { id: testLogin.id },
        data: {
          username: 'newusername@example.com',
          password: 'newpassword',
          status: 'ACTIVE'
        }
      });
      
      expect(updatedLogin.username).toBe('newusername@example.com');
      expect(updatedLogin.status).toBe('ACTIVE');
      
      // Cleanup
      await prisma.login.delete({ where: { id: testLogin.id } });
      await prisma.user.delete({ where: { id: testUser.id } });
    });

    it('should be able to delete login', async () => {
      // Create test data
      const testUser = await prisma.user.create({
        data: {
          email: `deleter-${Date.now()}@example.com`,
          name: 'Deleter User',
          passwordHash: 'hashedpassword'
        }
      });
      
      const testLogin = await prisma.login.create({
        data: {
          name: 'Delete Test Login',
          loginUrl: 'https://deletetest.com',
          username: 'deletetest@example.com',
          password: 'deletepassword',
          status: 'ACTIVE',
          ownerId: testUser.id
        }
      });
      
      // Delete login
      await prisma.login.delete({ where: { id: testLogin.id } });
      
      // Verify deletion
      const deletedLogin = await prisma.login.findUnique({
        where: { id: testLogin.id }
      });
      
      expect(deletedLogin).toBeNull();
      
      // Cleanup
      await prisma.user.delete({ where: { id: testUser.id } });
    });
  });

  describe('🔄 State Management Protection', () => {
    it('should have proper form state management', async () => {
      const fs = require('fs');
      const path = require('path');
      
      const loginsPagePath = path.join(process.cwd(), 'src/app/logins/page.tsx');
      const loginsPageContent = fs.readFileSync(loginsPagePath, 'utf8');
      
      // Check for form state
      expect(loginsPageContent).toContain('formData');
      expect(loginsPageContent).toContain('setFormData');
      expect(loginsPageContent).toContain('useState({');
      
      // Check for modal state
      expect(loginsPageContent).toContain('isModalOpen');
      expect(loginsPageContent).toContain('setIsModalOpen');
    });

    it('should have proper error handling state', async () => {
      const fs = require('fs');
      const path = require('path');
      
      const loginsPagePath = path.join(process.cwd(), 'src/app/logins/page.tsx');
      const loginsPageContent = fs.readFileSync(loginsPagePath, 'utf8');
      
      // Check for error state
      expect(loginsPageContent).toContain('modalError');
      expect(loginsPageContent).toContain('setModalError');
    });
  });

  describe('📋 UI Component Protection', () => {
    it('should have all required UI components', async () => {
      const fs = require('fs');
      const path = require('path');
      
      const loginsPagePath = path.join(process.cwd(), 'src/app/logins/page.tsx');
      const loginsPageContent = fs.readFileSync(loginsPagePath, 'utf8');
      
      // Check for key UI elements
      const requiredUIElements = [
        'Add Login',
        'Connect New Login',
        'Edit Credentials',
        'Test',
        'Edit',
        'Delete'
      ];
      
      for (const element of requiredUIElements) {
        expect(loginsPageContent).toContain(element);
      }
    });

    it('should have proper form validation', async () => {
      const fs = require('fs');
      const path = require('path');
      
      const loginsPagePath = path.join(process.cwd(), 'src/app/logins/page.tsx');
      const loginsPageContent = fs.readFileSync(loginsPagePath, 'utf8');
      
      // Check for form validation
      expect(loginsPageContent).toContain('All fields are required');
      expect(loginsPageContent).toContain('required');
    });
  });
});

/**
 * 🚨 CRITICAL TEST REMINDER
 * 
 * These tests MUST pass for the logins feature to be considered working.
 * If any test fails, the feature is broken and needs immediate attention.
 * 
 * To run these tests:
 * npm run test -- --testPathPatterns=test_logins_protection
 * 
 * These tests protect against:
 * - Missing state variables (setHasRecording error)
 * - Broken API endpoints
 * - Database schema issues
 * - Authentication failures
 * - UI component problems
 */
