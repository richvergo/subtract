/**
 * Jest Configuration for Smoke Tests
 * Optimized for end-to-end workflow testing with proper timeouts and setup
 */

const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Test environment
  testEnvironment: 'node',
  
  // Test patterns
  testMatch: [
    '**/tests/e2e/**/*.test.tsx',
    '**/tests/e2e/**/*.test.ts'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/e2e-setup.ts'],
  
  // Module name mapping for absolute imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Test timeout (30 seconds for smoke tests)
  testTimeout: 30000,
  
  // Coverage configuration
  collectCoverage: false, // Disable coverage for smoke tests for speed
  
  // Verbose output
  verbose: true,
  
  // Run tests in band (sequentially) to avoid conflicts
  maxWorkers: 1,
  
  // Global setup and teardown
  globalSetup: '<rootDir>/tests/smoke-global-setup.ts',
  globalTeardown: '<rootDir>/tests/smoke-global-teardown.ts',
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/tests/unit/',
    '<rootDir>/tests/frontend/',
    '<rootDir>/tests/api/',
    '<rootDir>/tests/lib/'
  ],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Global variables
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
