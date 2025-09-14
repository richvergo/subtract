/*
  Warnings:

  - You are about to drop the `LegacyTask` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Task` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `systemType` on the `Login` table. All the data in the column will be lost.
  - Added the required column `loginUrl` to the `Login` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AgentRun" ADD COLUMN "userConfirmed" BOOLEAN;
ALTER TABLE "AgentRun" ADD COLUMN "userFeedback" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "LegacyTask";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Task";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "schedule" TEXT,
    "agentConfig" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Agent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Agent" ("agentConfig", "createdAt", "description", "id", "name", "ownerId", "schedule", "updatedAt") SELECT "agentConfig", "createdAt", "description", "id", "name", "ownerId", "schedule", "updatedAt" FROM "Agent";
DROP TABLE "Agent";
ALTER TABLE "new_Agent" RENAME TO "Agent";
CREATE TABLE "new_Login" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "loginUrl" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT,
    "oauthToken" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Login_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Login" ("createdAt", "id", "name", "oauthToken", "ownerId", "password", "updatedAt", "username") SELECT "createdAt", "id", "name", "oauthToken", "ownerId", "password", "updatedAt", "username" FROM "Login";
DROP TABLE "Login";
ALTER TABLE "new_Login" RENAME TO "Login";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
