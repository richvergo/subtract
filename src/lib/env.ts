import { z } from 'zod';

// =============================================================================
// BACKEND STABILITY - ENVIRONMENT VARIABLE VALIDATION
// =============================================================================
// This file validates all required environment variables and fails fast if missing
// Prevents runtime errors from missing configuration

const envSchema = z.object({
  // =============================================================================
  // REQUIRED VARIABLES - Backend will fail without these
  // =============================================================================
  
  // Database connection (required for all database operations)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required for database operations'),
  
  // =============================================================================
  // OPTIONAL VARIABLES - Backend will work with defaults
  // =============================================================================
  
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  
  // Redis configuration (optional - will use in-memory fallback)
  REDIS_URL: z.string().url().optional(),
  
  // Encryption key for sensitive data (optional)
  ENCRYPTION_KEY_BASE64: z.string().min(32, 'ENCRYPTION_KEY_BASE64 must be at least 32 characters').optional(),
  
  // API base URL (optional)
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),
  
  // Puppeteer configuration (optional)
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: z.string().optional(),
  PUPPETEER_EXECUTABLE_PATH: z.string().optional(),
  PUPPETEER_ARGS: z.string().optional(),
  PUPPETEER_CACHE_DIR: z.string().optional(),
  
  // Test configuration (optional)
  DISABLE_DB_AUDIT: z.string().optional(),
});

// Validate environment variables and fail fast if required ones are missing
let env: z.infer<typeof envSchema>;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  console.error('❌ Environment validation failed:');
  if (error instanceof z.ZodError) {
    error.issues.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
  }
  console.error('\n🔧 Please check your .env.local file and ensure all required variables are set.');
  console.error('📖 See .env.example for the required format.');
  
  // In development mode, don't exit - just log the error and continue
  if (process.env.NODE_ENV === 'development') {
    console.error('⚠️  Continuing in development mode with missing environment variables...');
    // Set minimal defaults for development
    env = {
      DATABASE_URL: process.env.DATABASE_URL || 'file:./prisma/dev.db',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'dev-secret-key',
      NODE_ENV: 'development' as const,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    } as z.infer<typeof envSchema>;
  } else {
    process.exit(1);
  }
}

// Export validated environment variables
export { env };

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if running in development mode
 */
export const isDevelopment = () => env.NODE_ENV === 'development';

/**
 * Check if running in production mode
 */
export const isProduction = () => env.NODE_ENV === 'production';

/**
 * Check if running in test mode
 */
export const isTest = () => env.NODE_ENV === 'test';

/**
 * Get the NextAuth URL with fallback
 */
export const getNextAuthUrl = () => {
  if (env.NEXTAUTH_URL) {
    return env.NEXTAUTH_URL;
  }
  
  if (isDevelopment()) {
    return 'http://localhost:3000';
  }
  
  throw new Error('NEXTAUTH_URL is required in production');
};

/**
 * Check if Redis is configured
 */
export const hasRedis = () => !!env.REDIS_URL;

/**
 * Check if encryption is configured
 */
export const hasEncryption = () => !!env.ENCRYPTION_KEY_BASE64;