/*
  Warnings:

  - You are about to drop the column `assignedUserId` on the `ChecklistItem` table. All the data in the column will be lost.
  - You are about to drop the column `assignee` on the `ChecklistItem` table. All the data in the column will be lost.
  - You are about to drop the column `owner` on the `ChecklistItem` table. All the data in the column will be lost.
  - You are about to drop the column `assignedUserId` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `assignee` on the `Task` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChecklistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monthId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "ownerId" TEXT,
    "assigneeId" TEXT,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    CONSTRAINT "ChecklistItem_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "MonthClose" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChecklistItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ChecklistItem_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ChecklistItem" ("dueDate", "id", "monthId", "notes", "status", "title") SELECT "dueDate", "id", "monthId", "notes", "status", "title" FROM "ChecklistItem";
DROP TABLE "ChecklistItem";
ALTER TABLE "new_ChecklistItem" RENAME TO "ChecklistItem";
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checklistItemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assigneeId" TEXT,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    CONSTRAINT "Task_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "ChecklistItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("checklistItemId", "dueDate", "id", "notes", "status", "title") SELECT "checklistItemId", "dueDate", "id", "notes", "status", "title" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
