/*
  Warnings:

  - You are about to drop the column `monthId` on the `ChecklistItem` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `ChecklistItem` table. All the data in the column will be lost.
  - You are about to drop the column `owner` on the `ChecklistItem` table. All the data in the column will be lost.
  - You are about to drop the column `checklistItemId` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Task` table. All the data in the column will be lost.
  - Added the required column `checklistId` to the `ChecklistItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ChecklistItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `itemId` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Task` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Create new tables
CREATE TABLE "Checklist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "entityId" TEXT,
    "createdBy" TEXT NOT NULL,
    "deadline" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Checklist_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Checklist_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "ChecklistMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checklistId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChecklistMember_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChecklistMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Step 2: Create legacy tables to preserve existing data
CREATE TABLE "LegacyChecklistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monthId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "owner" TEXT,
    "assignee" TEXT,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    CONSTRAINT "LegacyChecklistItem_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "MonthClose" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "LegacyTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checklistItemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assignee" TEXT,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    CONSTRAINT "LegacyTask_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "LegacyChecklistItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Step 3: Migrate existing data to legacy tables
INSERT INTO "LegacyChecklistItem" SELECT * FROM "ChecklistItem";
INSERT INTO "LegacyTask" SELECT * FROM "Task";

-- Step 4: Drop old tables and recreate with new structure
DROP TABLE "ChecklistItem";
DROP TABLE "Task";

-- Step 5: Create new tables with proper structure
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checklistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignee" TEXT,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChecklistItem_assignee_fkey" FOREIGN KEY ("assignee") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignee" TEXT,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ChecklistItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_assignee_fkey" FOREIGN KEY ("assignee") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Step 6: Create indexes
CREATE UNIQUE INDEX "ChecklistMember_checklistId_userId_key" ON "ChecklistMember"("checklistId", "userId");