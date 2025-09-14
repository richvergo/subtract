/*
  Warnings:

  - Made the column `purpose_prompt` on table `Agent` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateTable
CREATE TABLE "AgentRecording" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT,
    "size" BIGINT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentRecording_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "agent_config" TEXT,
    "purpose_prompt" TEXT NOT NULL,
    "agent_intents" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "processing_status" TEXT NOT NULL DEFAULT 'processing',
    "processing_progress" INTEGER,
    "recording_path" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Agent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Agent" ("agent_config", "agent_intents", "createdAt", "description", "id", "name", "ownerId", "purpose_prompt", "status", "updatedAt", "processing_status", "processing_progress", "recording_path") SELECT "agent_config", "agent_intents", "createdAt", "description", "id", "name", "ownerId", COALESCE("purpose_prompt", "No purpose specified"), "status", "updatedAt", "ready", 100, NULL FROM "Agent";
DROP TABLE "Agent";
ALTER TABLE "new_Agent" RENAME TO "Agent";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
