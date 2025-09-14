-- Database initialization script for Agents MVP
-- This script runs when the PostgreSQL container starts

-- Create the agents database if it doesn't exist
-- (This is handled by POSTGRES_DB environment variable)

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'UTC';

-- Create any additional indexes or configurations
-- (Prisma will handle table creation via migrations)

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'Agents MVP database initialized successfully';
END $$;
