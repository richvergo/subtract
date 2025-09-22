/*
  Warnings:

  - You are about to drop the `AgentRecording` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `recordingPath` on the `Agent` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Login" ADD COLUMN "analysisResult" TEXT;
ALTER TABLE "Login" ADD COLUMN "analysisStatus" TEXT DEFAULT 'pending';
ALTER TABLE "Login" ADD COLUMN "recordingUrl" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AgentRecording";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "agentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parameters" TEXT,
    "schedule" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "result" TEXT,
    "error" TEXT,
    "logs" TEXT,
    CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExecutionMetrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "duration" INTEGER NOT NULL,
    "totalSteps" INTEGER NOT NULL,
    "successfulSteps" INTEGER NOT NULL,
    "failedSteps" INTEGER NOT NULL,
    "retryAttempts" INTEGER NOT NULL,
    "errors" TEXT,
    "screenshots" TEXT,
    "repairs" TEXT,
    "successRate" REAL NOT NULL,
    "performanceScore" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "purposePrompt" TEXT NOT NULL,
    "agentConfig" TEXT,
    "agentIntents" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "processingStatus" TEXT NOT NULL DEFAULT 'processing',
    "processingProgress" INTEGER,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "recordingUrl" TEXT,
    "audioUrl" TEXT,
    "llmSummary" TEXT,
    "userContext" TEXT,
    "eventLog" TEXT,
    "transcript" TEXT,
    CONSTRAINT "Agent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Agent" ("agentConfig", "agentIntents", "audioUrl", "createdAt", "description", "eventLog", "id", "llmSummary", "name", "ownerId", "processingProgress", "processingStatus", "purposePrompt", "recordingUrl", "status", "transcript", "updatedAt", "userContext") SELECT "agentConfig", "agentIntents", "audioUrl", "createdAt", "description", "eventLog", "id", "llmSummary", "name", "ownerId", "processingProgress", "processingStatus", "purposePrompt", "recordingUrl", "status", "transcript", "updatedAt", "userContext" FROM "Agent";
DROP TABLE "Agent";
ALTER TABLE "new_Agent" RENAME TO "Agent";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Task_userId_createdAt_idx" ON "Task"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Task_agentId_status_idx" ON "Task"("agentId", "status");
