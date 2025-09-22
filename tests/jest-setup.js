/**
 * Jest setup file to fix Node.js environment issues
 */

// Mock Node.js path module for Prisma
import path from 'path';
global.path = path;

// Ensure proper Node.js environment
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
