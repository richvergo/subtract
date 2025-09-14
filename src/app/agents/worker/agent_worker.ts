#!/usr/bin/env tsx

/**
 * Agent Worker Process
 * 
 * This worker process continuously polls the Redis queue for agent run jobs
 * and executes them using the Puppeteer AgentExecutor.
 * 
 * Usage: tsx src/app/agents/worker/agent_worker.ts
 */

import { Worker, Job } from 'bullmq';
import { redisConnection, AgentJobPayload, validateAgentJobPayload } from '@/lib/queue';
import { db } from '@/lib/db';
import { RunStatus } from '@prisma/client';
import { executeAgentRun } from '@/lib/agent-executor';

// Worker configuration
const workerConfig = {
  connection: redisConnection,
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2'), // Process up to 2 jobs concurrently
  removeOnComplete: 10,
  removeOnFail: 5,
};

// Create the worker
const agentWorker = new Worker<AgentJobPayload>('agent_runs', processAgentJob, workerConfig);

/**
 * Process a single agent job
 */
async function processAgentJob(job: Job<AgentJobPayload>): Promise<void> {
  // Validate job payload
  const validatedData = validateAgentJobPayload(job.data);
  const { runId, agentId, ownerId } = validatedData;
  
  console.log(`[Worker] Processing job ${job.id} - Run: ${runId}, Agent: ${agentId}`);
  
  try {
    // Update job progress
    await job.updateProgress(10);
    
    // Fetch agent configuration and linked logins from database
    console.log(`[Worker] Fetching agent configuration for agent: ${agentId}`);
    const agent = await db.agent.findUnique({
      where: { id: agentId },
      include: {
        agentLogins: {
          include: {
            login: true,
          },
        },
      },
    });

    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Verify ownership
    if (agent.ownerId !== ownerId) {
      throw new Error(`Agent ownership mismatch. Expected: ${ownerId}, Got: ${agent.ownerId}`);
    }

    await job.updateProgress(20);
    console.log(`[Worker] Agent found: ${agent.name} with ${agent.agentLogins.length} logins`);

    // Update run status to indicate processing started
    await db.agentRun.update({
      where: { id: runId },
      data: {
        status: RunStatus.PENDING,
        logs: {
          message: 'Worker started processing',
          agentName: agent.name,
          loginCount: agent.agentLogins.length,
          timestamp: new Date().toISOString(),
        },
      },
    });

    await job.updateProgress(30);

    // Execute the agent workflow
    console.log(`[Worker] Starting agent execution for run: ${runId}`);
    const result = await executeAgentRun(agentId, runId);

    await job.updateProgress(90);

    // Update the run status with results
    console.log(`[Worker] Updating run status: ${result.status}`);
    await db.agentRun.update({
      where: { id: runId },
      data: {
        status: result.status,
        finishedAt: new Date(),
        logs: {
          ...result.logs,
          workerProcessedAt: new Date().toISOString(),
          jobId: job.id,
        },
        outputPath: result.outputPath,
        screenshotPath: result.screenshotPath,
      },
    });

    await job.updateProgress(100);
    console.log(`[Worker] Job ${job.id} completed successfully - Status: ${result.status}`);

  } catch (error) {
    console.error(`[Worker] Job ${job.id} failed:`, error);
    
    // Update the run status to failed
    try {
      await db.agentRun.update({
        where: { id: runId },
        data: {
          status: RunStatus.FAILED,
          finishedAt: new Date(),
          logs: {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            workerFailedAt: new Date().toISOString(),
            jobId: job.id,
          },
        },
      });
    } catch (dbError) {
      console.error(`[Worker] Failed to update database for run ${runId}:`, dbError);
    }
    
    // Re-throw the error so BullMQ can handle retries
    throw error;
  }
}

// Worker event handlers
agentWorker.on('ready', () => {
  console.log('[Worker] Agent worker is ready and waiting for jobs...');
});

agentWorker.on('active', (job) => {
  console.log(`[Worker] Job ${job.id} is now active`);
});

agentWorker.on('completed', (job, result) => {
  console.log(`[Worker] Job ${job.id} completed successfully`);
});

agentWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} failed:`, err.message);
});

agentWorker.on('stalled', (jobId) => {
  console.warn(`[Worker] Job ${jobId} stalled`);
});

agentWorker.on('error', (err) => {
  console.error('[Worker] Worker error:', err);
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('[Worker] Received SIGINT, shutting down gracefully...');
  await agentWorker.close();
  await redisConnection.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[Worker] Received SIGTERM, shutting down gracefully...');
  await agentWorker.close();
  await redisConnection.quit();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[Worker] Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Worker] Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log('[Worker] Agent worker process started');
console.log(`[Worker] Concurrency: ${workerConfig.concurrency}`);
console.log(`[Worker] Redis connection: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`);
