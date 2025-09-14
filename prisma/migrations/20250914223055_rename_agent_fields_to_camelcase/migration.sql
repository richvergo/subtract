/*
  Warnings:

  - You are about to drop the column `agent_config` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the column `agent_intents` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the column `processing_progress` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the column `processing_status` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the column `purpose_prompt` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the column `recording_path` on the `Agent` table. All the data in the column will be lost.
  - Added the required column `purposePrompt` to the `Agent` table without a default value. This is not possible if the table is not empty.

*/
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
    "recordingPath" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Agent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Agent" ("createdAt", "description", "id", "name", "ownerId", "status", "updatedAt") SELECT "createdAt", "description", "id", "name", "ownerId", "status", "updatedAt" FROM "Agent";
DROP TABLE "Agent";
ALTER TABLE "new_Agent" RENAME TO "Agent";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
