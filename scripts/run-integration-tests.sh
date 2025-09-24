#!/bin/bash

# Integration Test Runner
# Runs the comprehensive workflow integration tests

set -e

echo "🚀 Starting Integration Test Suite"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if required services are running
echo "🔍 Checking prerequisites..."

# Check if Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
    echo "⚠️  Redis is not running. Starting Redis..."
    if command -v brew > /dev/null 2>&1; then
        brew services start redis
    else
        echo "❌ Please start Redis manually: redis-server"
        exit 1
    fi
fi

# Check if Node.js is available
if ! command -v node > /dev/null 2>&1; then
    echo "❌ Node.js is not installed"
    exit 1
fi

# Check if npm is available
if ! command -v npm > /dev/null 2>&1; then
    echo "❌ npm is not installed"
    exit 1
fi

echo "✅ Prerequisites check complete"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Clean up any existing test databases
echo "🧹 Cleaning up test databases..."
rm -f test.db e2e-test.db

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

# Set test environment variables
export NODE_ENV=test
export DATABASE_URL="file:./test.db"
export ENCRYPTION_KEY="test-encryption-key-32-chars-long"
export NEXTAUTH_SECRET="test-nextauth-secret"
export NEXTAUTH_URL="http://localhost:3000"
export REDIS_HOST="localhost"
export REDIS_PORT="6379"

# Run the integration tests
echo "🧪 Running integration tests..."
echo ""

# Run specific integration test file
npx jest tests/integration/WorkflowIntegration.test.ts \
    --verbose \
    --detectOpenHandles \
    --forceExit \
    --testTimeout=60000 \
    --setupFilesAfterEnv=./tests/e2e-setup.ts

# Check test results
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Integration tests passed!"
    echo "🎉 All workflow components are working correctly:"
    echo "   • Capture → Persist Actions"
    echo "   • Replay → Highlight Actions" 
    echo "   • LogicCompile → Persist LogicSpec"
    echo "   • Run → Execute Workflow with LogicSpec"
    echo "   • History → Retrieve Run Details"
else
    echo ""
    echo "❌ Integration tests failed!"
    echo "Please check the test output above for details."
    exit 1
fi

# Cleanup
echo ""
echo "🧹 Cleaning up test artifacts..."
rm -f test.db e2e-test.db

echo "✨ Integration test suite complete!"
