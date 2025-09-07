-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monthId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assignee" TEXT,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChecklistItem_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "MonthClose" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Add column to Task table
ALTER TABLE "Task" ADD COLUMN "checklistItemId" TEXT;

-- CreateIndex
CREATE INDEX "ChecklistItem_monthId_idx" ON "ChecklistItem"("monthId");

-- CreateIndex
CREATE INDEX "Task_checklistItemId_idx" ON "Task"("checklistItemId");

-- Update existing status values
UPDATE "Task" SET "status" = 'NOT_STARTED' WHERE "status" = 'OPEN';
