/**
 * API integration tests for logins
 * Tests CRUD operations with proper authentication and masking
 */

import { NextRequest } from 'next/server';
import { testDb, createTestUser } from './setup';
// Removed SystemType import as it's no longer used

// Auth mocking is handled globally in jest.setup.ts

// Mock the database to use test database
jest.mock('../src/lib/db', () => ({
  db: require('./setup').testDb,
}));

// Import the route handlers
import { GET as getLogins, POST as createLogin } from '../src/app/api/logins/route';
import { GET as getLogin, PUT as updateLogin, DELETE as deleteLogin } from '../src/app/api/logins/[id]/route';

describe('API Integration Tests - Logins', () => {
  let testUser: any;
  let mockSession: any;

  beforeEach(async () => {
    testUser = await createTestUser('test@example.com');
    
    // Update the mock to return the correct user ID for this test
    const { mockGetServerSession } = require('next-auth');
    mockGetServerSession.mockResolvedValue({
      user: {
        email: 'test@example.com',
        id: testUser.id,
        name: 'Test User'
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  });

  describe('POST /api/logins', () => {
    it('should create a login with encrypted credentials', async () => {
      const loginData = {
        name: 'Test ERP Login',
        loginUrl: 'https://example.com/login',
        username: 'test@example.com',
        password: 'secret123',
      };

      const req = new NextRequest('http://localhost:3000/api/logins', {
        method: 'POST',
        body: JSON.stringify(loginData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await createLogin(req);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.login).toBeDefined();
      expect(responseData.login.name).toBe(loginData.name);
      expect(responseData.login.loginUrl).toBe(loginData.loginUrl);
      expect(responseData.login.username).not.toBe(loginData.username); // Should be masked
      expect(responseData.login.password).toBe('••••••••'); // Should be masked
      expect(responseData.login.ownerId).toBe(testUser.id);

      // Verify login was created in database with encrypted credentials
      const dbLogin = await testDb.login.findUnique({
        where: { id: responseData.login.id },
      });

      expect(dbLogin).toBeDefined();
      expect(dbLogin!.name).toBe(loginData.name);
      expect(dbLogin!.username).not.toBe(loginData.username); // Should be encrypted
      expect(dbLogin!.password).not.toBe(loginData.password); // Should be encrypted
    });

    it('should create a login with OAuth token', async () => {
      const loginData = {
        name: 'Test CRM Login',
        loginUrl: 'https://crm.example.com/login',
        username: 'test@example.com',
        oauthToken: 'oauth-token-123',
      };

      const req = new NextRequest('http://localhost:3000/api/logins', {
        method: 'POST',
        body: JSON.stringify(loginData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await createLogin(req);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.login.oauthToken).toBe('abc12345***'); // Should be masked
    });

    it('should reject login without credentials', async () => {
      const loginData = {
        name: 'Test Login',
        loginUrl: 'https://erp.example.com/login',
        username: 'test@example.com',
      };

      const req = new NextRequest('http://localhost:3000/api/logins', {
        method: 'POST',
        body: JSON.stringify(loginData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await createLogin(req);
      expect(response.status).toBe(400);
    });

    it('should reject unauthenticated requests', async () => {
      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValue(null);

      const loginData = {
        name: 'Test Login',
        loginUrl: 'https://erp.example.com/login',
        username: 'test@example.com',
        password: 'secret123',
      };

      const req = new NextRequest('http://localhost:3000/api/logins', {
        method: 'POST',
        body: JSON.stringify(loginData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await createLogin(req);
      expect(response.status).toBe(401);
    });

    it('should validate login URL', async () => {
      const loginData = {
        name: 'Test Login',
        loginUrl: 'invalid-url',
        username: 'test@example.com',
        password: 'secret123',
      };

      const req = new NextRequest('http://localhost:3000/api/logins', {
        method: 'POST',
        body: JSON.stringify(loginData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await createLogin(req);
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/logins', () => {
    it('should return user logins with masked credentials', async () => {
      // Create test logins
      const login1 = await testDb.login.create({
        data: {
          name: 'Login 1',
          loginUrl: 'https://erp.example.com/login',
          username: 'encrypted-username-1',
          password: 'encrypted-password-1',
          ownerId: testUser.id,
        },
      });

      const login2 = await testDb.login.create({
        data: {
          name: 'Login 2',
          loginUrl: 'https://crm.example.com/login',
          username: 'encrypted-username-2',
          oauthToken: 'encrypted-token-2',
          ownerId: testUser.id,
        },
      });

      const req = new NextRequest('http://localhost:3000/api/logins');
      const response = await getLogins();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.logins).toHaveLength(2);
      
      // Check that credentials are masked
      responseData.logins.forEach((login: any) => {
        expect(login.username).toMatch(/\*\*\*/); // Should contain asterisks
        if (login.password) {
          expect(login.password).toBe('••••••••');
        }
        if (login.oauthToken) {
          expect(login.oauthToken).toMatch(/\*\*\*/);
        }
      });
    });

    it('should only return user own logins', async () => {
      // Create another user and their login
      const otherUser = await createTestUser('other@example.com');
      await testDb.login.create({
        data: {
          name: 'Other User Login',
          loginUrl: 'https://erp.example.com/login',
          username: 'encrypted-username',
          password: 'encrypted-password',
          ownerId: otherUser.id,
        },
      });

      // Create login for test user
      await testDb.login.create({
        data: {
          name: 'My Login',
          loginUrl: 'https://erp.example.com/login',
          username: 'encrypted-username',
          password: 'encrypted-password',
          ownerId: testUser.id,
        },
      });

      const response = await getLogins();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.logins).toHaveLength(1);
      expect(responseData.logins[0].name).toBe('My Login');
    });

    it('should return empty array for user with no logins', async () => {
      const response = await getLogins();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.logins).toHaveLength(0);
    });
  });

  describe('GET /api/logins/[id]', () => {
    let testLogin: any;

    beforeEach(async () => {
      testLogin = await testDb.login.create({
        data: {
          name: 'Test Login',
          loginUrl: 'https://erp.example.com/login',
          username: 'encrypted-username',
          password: 'encrypted-password',
          ownerId: testUser.id,
        },
      });
    });

    it('should return specific login with masked credentials', async () => {
      const req = new NextRequest(`http://localhost:3000/api/logins/${testLogin.id}`);
      const response = await getLogin(req, { params: { id: testLogin.id } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.login.id).toBe(testLogin.id);
      expect(responseData.login.name).toBe('Test Login');
      expect(responseData.login.username).toMatch(/\*\*\*/); // Should be masked
      expect(responseData.login.password).toBe('••••••••'); // Should be masked
    });

    it('should return 404 for non-existent login', async () => {
      const req = new NextRequest('http://localhost:3000/api/logins/non-existent-id');
      const response = await getLogin(req, { params: { id: 'non-existent-id' } });
      
      expect(response.status).toBe(404);
    });

    it('should return 404 for login owned by another user', async () => {
      const otherUser = await createTestUser('other@example.com');
      const otherLogin = await testDb.login.create({
        data: {
          name: 'Other Login',
          loginUrl: 'https://erp.example.com/login',
          username: 'encrypted-username',
          password: 'encrypted-password',
          ownerId: otherUser.id,
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/logins/${otherLogin.id}`);
      const response = await getLogin(req, { params: { id: otherLogin.id } });
      
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/logins/[id]', () => {
    let testLogin: any;

    beforeEach(async () => {
      testLogin = await testDb.login.create({
        data: {
          name: 'Test Login',
          loginUrl: 'https://erp.example.com/login',
          username: 'encrypted-username',
          password: 'encrypted-password',
          ownerId: testUser.id,
        },
      });
    });

    it('should update login with encrypted credentials', async () => {
      const updateData = {
        name: 'Updated Login Name',
        username: 'new@example.com',
        password: 'newpassword123',
      };

      const req = new NextRequest(`http://localhost:3000/api/logins/${testLogin.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await updateLogin(req, { params: { id: testLogin.id } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.login.name).toBe('Updated Login Name');
      expect(responseData.login.username).toMatch(/\*\*\*/); // Should be masked
      expect(responseData.login.password).toBe('••••••••'); // Should be masked

      // Verify database was updated with encrypted credentials
      const dbLogin = await testDb.login.findUnique({
        where: { id: testLogin.id },
      });

      expect(dbLogin!.name).toBe('Updated Login Name');
      expect(dbLogin!.username).not.toBe('new@example.com'); // Should be encrypted
      expect(dbLogin!.password).not.toBe('newpassword123'); // Should be encrypted
    });

    it('should update only provided fields', async () => {
      const updateData = {
        name: 'Updated Name Only',
      };

      const req = new NextRequest(`http://localhost:3000/api/logins/${testLogin.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await updateLogin(req, { params: { id: testLogin.id } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.login.name).toBe('Updated Name Only');
      // Other fields should remain unchanged
    });

    it('should return 404 for non-existent login', async () => {
      const updateData = { name: 'Updated Name' };
      const req = new NextRequest('http://localhost:3000/api/logins/non-existent-id', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await updateLogin(req, { params: { id: 'non-existent-id' } });
      expect(response.status).toBe(404);
    });

    it('should return 404 for login owned by another user', async () => {
      const otherUser = await createTestUser('other@example.com');
      const otherLogin = await testDb.login.create({
        data: {
          name: 'Other Login',
          loginUrl: 'https://erp.example.com/login',
          username: 'encrypted-username',
          password: 'encrypted-password',
          ownerId: otherUser.id,
        },
      });

      const updateData = { name: 'Hacked Name' };
      const req = new NextRequest(`http://localhost:3000/api/logins/${otherLogin.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await updateLogin(req, { params: { id: otherLogin.id } });
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/logins/[id]', () => {
    let testLogin: any;

    beforeEach(async () => {
      testLogin = await testDb.login.create({
        data: {
          name: 'Test Login',
          loginUrl: 'https://erp.example.com/login',
          username: 'encrypted-username',
          password: 'encrypted-password',
          ownerId: testUser.id,
        },
      });
    });

    it('should delete login successfully', async () => {
      const req = new NextRequest(`http://localhost:3000/api/logins/${testLogin.id}`, {
        method: 'DELETE',
      });

      const response = await deleteLogin(req, { params: { id: testLogin.id } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.message).toBe('Login deleted successfully');

      // Verify login was deleted from database
      const dbLogin = await testDb.login.findUnique({
        where: { id: testLogin.id },
      });
      expect(dbLogin).toBeNull();
    });

    it('should return 404 for non-existent login', async () => {
      const req = new NextRequest('http://localhost:3000/api/logins/non-existent-id', {
        method: 'DELETE',
      });

      const response = await deleteLogin(req, { params: { id: 'non-existent-id' } });
      expect(response.status).toBe(404);
    });

    it('should return 404 for login owned by another user', async () => {
      const otherUser = await createTestUser('other@example.com');
      const otherLogin = await testDb.login.create({
        data: {
          name: 'Other Login',
          loginUrl: 'https://erp.example.com/login',
          username: 'encrypted-username',
          password: 'encrypted-password',
          ownerId: otherUser.id,
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/logins/${otherLogin.id}`, {
        method: 'DELETE',
      });

      const response = await deleteLogin(req, { params: { id: otherLogin.id } });
      expect(response.status).toBe(404);
    });

    it('should prevent deletion of login used by agents', async () => {
      // Create an agent that uses this login
      const agent = await testDb.agent.create({
        data: {
          name: 'Test Agent',
          description: 'Test agent',
                agentConfig: JSON.stringify([{ action: 'goto', url: 'https://example.com' }]),
          purposePrompt: 'Test agent purpose',
          ownerId: testUser.id,
        },
      });

      await testDb.agentLogin.create({
        data: {
          agentId: agent.id,
          loginId: testLogin.id,
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/logins/${testLogin.id}`, {
        method: 'DELETE',
      });

      const response = await deleteLogin(req, { params: { id: testLogin.id } });
      expect(response.status).toBe(400);

      // Verify login still exists
      const dbLogin = await testDb.login.findUnique({
        where: { id: testLogin.id },
      });
      expect(dbLogin).not.toBeNull();
    });
  });
});
