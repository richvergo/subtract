/**
 * Jest mock for NextAuth getServerSession
 * This mock always returns a fake test user session
 */

// Create a mock function that doesn't depend on Next.js request context
const mockGetServerSession = jest.fn();

// Set default implementation
mockGetServerSession.mockResolvedValue({
  user: {
    email: 'test@example.com',
    id: 'test-user-id',
    name: 'Test User'
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
});

// Export the mock function directly
export const getServerSession = mockGetServerSession;

// Export other NextAuth functions as needed
export const getToken = jest.fn().mockResolvedValue(null);
export const getCsrfToken = jest.fn().mockResolvedValue('mock-csrf-token');

// Make the mock function available for test customization
export { mockGetServerSession };

// Mock the default NextAuth function
const mockNextAuth = jest.fn().mockReturnValue({
  GET: jest.fn(),
  POST: jest.fn()
});

// Default export for the module
export default mockNextAuth;
