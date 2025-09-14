/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts', '**/?(*.)+(spec|test).tsx'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.tsx$': 'ts-jest',
  },
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/**/*.test.ts', '!<rootDir>/tests/**/*.tsx', '!<rootDir>/tests/disabled/**'],
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          useESM: false,
          tsconfig: {
            module: 'commonjs',
          },
        }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@/lib/queue$': '<rootDir>/tests/__mocks__/queue.ts',
      },
    },
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/tests/**/*.tsx'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          useESM: false,
          tsconfig: {
            jsx: 'react-jsx',
          },
        }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@/lib/queue$': '<rootDir>/tests/__mocks__/queue.ts',
      },
      transformIgnorePatterns: [
        'node_modules/(?!(clsx)/)',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    },
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/lib/queue$': '<rootDir>/tests/__mocks__/queue.ts',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/app/api/auth/**', // Exclude auth routes from coverage
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts', '<rootDir>/tests/setup.ts'],
  setupFiles: ['<rootDir>/tests/jest-setup.js'],
  testTimeout: 30000, // 30 seconds for integration tests
  maxWorkers: 1, // Run tests sequentially to avoid DB conflicts
  globalSetup: '<rootDir>/tests/global-setup.ts',
  globalTeardown: '<rootDir>/tests/global-teardown.ts',
};
