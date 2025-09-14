/*
  Warnings:

  - You are about to drop the `Checklist` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChecklistItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChecklistMember` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LegacyChecklistItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MonthClose` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `agentConfig` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the column `schedule` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Agent` table. All the data in the column will be lost.
  - The primary key for the `AgentLogin` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `AgentRun` table. All the data in the column will be lost.
  - You are about to drop the column `logs` on the `AgentRun` table. All the data in the column will be lost.
  - You are about to drop the column `outputPath` on the `AgentRun` table. All the data in the column will be lost.
  - You are about to drop the column `screenshotPath` on the `AgentRun` table. All the data in the column will be lost.
  - You are about to drop the column `userConfirmed` on the `AgentRun` table. All the data in the column will be lost.
  - You are about to drop the column `userFeedback` on the `AgentRun` table. All the data in the column will be lost.
  - Added the required column `config` to the `Agent` table without a default value. This is not possible if the table is not empty.
  - The required column `id` was added to the `AgentLogin` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropIndex
DROP INDEX "ChecklistMember_checklistId_userId_key";

-- DropIndex
DROP INDEX "MonthClose_entityId_label_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Checklist";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ChecklistItem";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ChecklistMember";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "LegacyChecklistItem";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "MonthClose";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "config" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Agent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Agent" ("createdAt", "description", "id", "name", "ownerId", "updatedAt") SELECT "createdAt", "description", "id", "name", "ownerId", "updatedAt" FROM "Agent";
DROP TABLE "Agent";
ALTER TABLE "new_Agent" RENAME TO "Agent";
CREATE TABLE "new_AgentLogin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "loginId" TEXT NOT NULL,
    CONSTRAINT "AgentLogin_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentLogin_loginId_fkey" FOREIGN KEY ("loginId") REFERENCES "Login" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AgentLogin" ("agentId", "loginId") SELECT "agentId", "loginId" FROM "AgentLogin";
DROP TABLE "AgentLogin";
ALTER TABLE "new_AgentLogin" RENAME TO "AgentLogin";
CREATE UNIQUE INDEX "AgentLogin_agentId_loginId_key" ON "AgentLogin"("agentId", "loginId");
CREATE TABLE "new_AgentRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "result" TEXT,
    "error" TEXT,
    "requiresConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "confirmationData" TEXT,
    "confirmedAt" DATETIME,
    "confirmedBy" TEXT,
    CONSTRAINT "AgentRun_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AgentRun" ("agentId", "finishedAt", "id", "startedAt", "status") SELECT "agentId", "finishedAt", "id", "startedAt", "status" FROM "AgentRun";
DROP TABLE "AgentRun";
ALTER TABLE "new_AgentRun" RENAME TO "AgentRun";
CREATE INDEX "AgentRun_agentId_startedAt_idx" ON "AgentRun"("agentId", "startedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
