#!/bin/bash

# Agent System Startup Script
# This script starts the complete agent system with queue-based execution

echo "🚀 Starting Agent System with Queue-based Execution..."
echo ""

# Check if Redis is running
echo "📡 Checking Redis connection..."
if ! redis-cli ping > /dev/null 2>&1; then
    echo "❌ Redis is not running!"
    echo "   Please start Redis first:"
    echo "   - macOS: brew services start redis"
    echo "   - Docker: docker run -d -p 6379:6379 redis:alpine"
    echo "   - Linux: sudo systemctl start redis"
    exit 1
fi
echo "✅ Redis is running"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env file. Please update with your settings."
    else
        echo "❌ .env.example not found. Please create .env file manually."
        exit 1
    fi
fi

# Install dependencies if needed
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the system
echo ""
echo "🎯 Starting Agent System components..."
echo ""

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down Agent System..."
    jobs -p | xargs -r kill
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start Next.js app in background
echo "1️⃣  Starting Next.js app (API server)..."
npm run dev &
NEXT_PID=$!

# Wait a moment for Next.js to start
sleep 5

# Start agent worker in background
echo "2️⃣  Starting agent worker..."
npm run worker &
WORKER_PID=$!

# Wait a moment for worker to start
sleep 3

echo ""
echo "✅ Agent System is running!"
echo ""
echo "📊 System Status:"
echo "   - Next.js API: http://localhost:3000"
echo "   - Redis Queue: localhost:6379"
echo "   - Agent Worker: Running (PID: $WORKER_PID)"
echo ""
echo "🧪 Test the system:"
echo "   node test-agent-queue.js"
echo ""
echo "📝 Logs:"
echo "   - API logs: Check Next.js console"
echo "   - Worker logs: Check worker console"
echo ""
echo "🛑 Press Ctrl+C to stop all services"

# Wait for background processes
wait $NEXT_PID $WORKER_PID
