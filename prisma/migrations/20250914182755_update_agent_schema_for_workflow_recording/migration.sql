/*
  Warnings:

  - You are about to drop the column `config` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the column `intents` on the `Agent` table. All the data in the column will be lost.
  - Added the required column `agent_config` to the `Agent` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "agent_config" TEXT NOT NULL,
    "purpose_prompt" TEXT,
    "agent_intents" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Agent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Agent" ("createdAt", "description", "id", "name", "ownerId", "status", "updatedAt", "agent_config", "agent_intents") SELECT "createdAt", "description", "id", "name", "ownerId", "status", "updatedAt", "config", "intents" FROM "Agent";
DROP TABLE "Agent";
ALTER TABLE "new_Agent" RENAME TO "Agent";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
