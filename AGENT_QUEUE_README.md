# Agent Queue-based Execution System

This document describes the queue-based execution system for the Agents feature, which provides scalable, asynchronous automation using Redis and BullMQ.

## 🏗️ Architecture Overview

The queue-based system consists of:

1. **API Layer** - Enqueues jobs instead of executing inline
2. **Redis Queue** - Job broker using BullMQ
3. **Worker Process** - Background worker that processes jobs
4. **Database** - Stores execution results and status

## 🔄 Execution Flow

```
API Request → Enqueue Job → Worker Process → Update Database
     ↓              ↓              ↓              ↓
POST /agents/   Redis Queue   Puppeteer      agent_runs
{id}/run       (BullMQ)      Execution      table
```

## 🚀 Quick Start

### 1. Prerequisites

```bash
# Install Redis (macOS)
brew install redis
brew services start redis

# Or using Docker
docker run -d -p 6379:6379 redis:alpine
```

### 2. Environment Setup

Add to your `.env` file:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Optional

# Worker Configuration
WORKER_CONCURRENCY=2  # Number of concurrent jobs
```

### 3. Start the System

```bash
# Terminal 1: Start Next.js app
npm run dev

# Terminal 2: Start agent worker
npm run worker

# Terminal 3: Start additional workers (optional)
npm run worker
```

### 4. Test the System

```bash
# Run the test script
node test-agent-queue.js
```

## 📊 Queue Configuration

### Redis Connection
- **Host**: `localhost` (configurable via `REDIS_HOST`)
- **Port**: `6379` (configurable via `REDIS_PORT`)
- **Password**: Optional (via `REDIS_PASSWORD`)

### Job Settings
- **Retry Attempts**: 3
- **Backoff Strategy**: Exponential (2s, 4s, 8s)
- **Job Retention**: 10 completed, 5 failed
- **Concurrency**: 2 workers (configurable)

## 🔧 API Changes

### POST /api/agents/{id}/run

**Before (Inline Execution):**
```json
{
  "message": "Agent run started",
  "runId": "clx123...",
  "status": "PENDING"
}
```

**After (Queue-based):**
```json
{
  "message": "Agent run enqueued successfully",
  "runId": "clx123...",
  "status": "enqueued",
  "jobId": "clx123..."
}
```

**Response Codes:**
- `202 Accepted` - Job enqueued successfully
- `500 Internal Server Error` - Failed to enqueue job

## 👷 Worker Process

### Worker Features
- **Concurrent Processing**: Configurable concurrency level
- **Job Validation**: Validates all job payloads
- **Progress Tracking**: Updates job progress (10%, 20%, 30%, etc.)
- **Error Handling**: Comprehensive error logging and retry logic
- **Graceful Shutdown**: Handles SIGINT/SIGTERM signals

### Worker Logs
```
[Worker] Agent worker is ready and waiting for jobs...
[Worker] Processing job clx123 - Run: clx456, Agent: clx789
[Worker] Fetching agent configuration for agent: clx789
[Worker] Agent found: Test Agent with 1 logins
[Worker] Starting agent execution for run: clx456
[Worker] Updating run status: SUCCESS
[Worker] Job clx123 completed successfully - Status: SUCCESS
```

### Worker Commands
```bash
# Start worker
npm run worker

# Start worker with auto-reload (development)
npm run worker:dev

# Start multiple workers
npm run worker &
npm run worker &
```

## 📋 Job Payload Schema

```typescript
interface AgentJobPayload {
  runId: string;    // Unique run identifier
  agentId: string;  // Agent to execute
  ownerId: string;  // User who owns the agent
}
```

### Validation
All job payloads are validated using Zod schemas:
- `runId`: Required, non-empty string
- `agentId`: Required, non-empty string  
- `ownerId`: Required, non-empty string

## 🗄️ Database Updates

### agent_runs Table
The worker updates the `agent_runs` table with:

```sql
UPDATE agent_runs SET
  status = 'SUCCESS' | 'FAILED',
  finished_at = NOW(),
  logs = {
    "actions": [...],
    "summary": {...},
    "workerProcessedAt": "2024-01-01T00:00:00Z",
    "jobId": "clx123..."
  },
  screenshot_path = '/path/to/screenshot.png',
  output_path = '/path/to/output.pdf'
WHERE id = 'run_id';
```

### Log Structure
```json
{
  "actions": [
    {
      "timestamp": "2024-01-01T00:00:00Z",
      "message": "Starting agent execution",
      "agentId": "clx789"
    }
  ],
  "summary": {
    "totalActions": 5,
    "completedAt": "2024-01-01T00:05:00Z"
  },
  "workerProcessedAt": "2024-01-01T00:05:00Z",
  "jobId": "clx123"
}
```

## 🔍 Monitoring & Debugging

### Queue Monitoring
```bash
# Check Redis connection
redis-cli ping

# Monitor Redis commands
redis-cli monitor

# Check queue length
redis-cli llen bull:agent_runs:waiting
```

### Worker Monitoring
- **Logs**: All worker activity is logged to console
- **Progress**: Jobs report progress (10%, 20%, 30%, etc.)
- **Errors**: Failed jobs include full error details
- **Screenshots**: Captured for debugging failed executions

### Job Status Tracking
```typescript
// Get job status from queue
const status = await getJobStatus(jobId);
console.log(status.state); // 'waiting' | 'active' | 'completed' | 'failed'
```

## 🚀 Production Considerations

### Scaling
- **Horizontal Scaling**: Run multiple worker processes
- **Load Balancing**: Distribute workers across servers
- **Queue Partitioning**: Separate queues for different agent types

### Monitoring
- **Redis Monitoring**: Use Redis monitoring tools
- **Worker Health**: Implement health checks
- **Job Metrics**: Track success/failure rates
- **Performance**: Monitor execution times

### Security
- **Redis Security**: Use Redis AUTH and TLS
- **Network Security**: Secure Redis connections
- **Job Isolation**: Validate all job payloads
- **Resource Limits**: Set memory and CPU limits

### Error Handling
- **Dead Letter Queue**: Handle permanently failed jobs
- **Alerting**: Notify on repeated failures
- **Retry Logic**: Exponential backoff for retries
- **Circuit Breaker**: Stop processing on repeated errors

## 🧪 Testing

### Unit Tests
```bash
# Test queue functionality
npm test -- --grep "queue"

# Test worker functionality  
npm test -- --grep "worker"
```

### Integration Tests
```bash
# Test end-to-end flow
node test-agent-queue.js

# Test with multiple workers
npm run worker &
npm run worker &
node test-agent-queue.js
```

### Load Testing
```bash
# Test concurrent job processing
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/agents/agent-id/run &
done
```

## 📁 File Structure

```
src/
├── lib/
│   └── queue.ts                    # Redis queue setup and job management
├── app/
│   ├── api/agents/[id]/run/route.ts # Updated to enqueue jobs
│   └── agents/worker/
│       └── agent_worker.ts         # Background worker process
└── test-agent-queue.js             # End-to-end test script
```

## 🔧 Configuration

### Environment Variables
```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password

# Worker
WORKER_CONCURRENCY=2

# Database
DATABASE_URL=file:./prisma/dev.db
```

### Package.json Scripts
```json
{
  "scripts": {
    "worker": "tsx src/app/agents/worker/agent_worker.ts",
    "worker:dev": "tsx watch src/app/agents/worker/agent_worker.ts"
  }
}
```

## ✅ MVP Status

The queue-based execution system is complete with:
- ✅ Redis queue setup with BullMQ
- ✅ API endpoints enqueue jobs instead of inline execution
- ✅ Background worker process with Puppeteer integration
- ✅ Job payload validation and error handling
- ✅ Structured logging and debugging
- ✅ End-to-end testing capabilities
- ✅ Production-ready architecture

Ready for scaling and production deployment!
