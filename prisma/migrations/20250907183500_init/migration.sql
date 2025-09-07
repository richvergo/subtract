-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MonthClose" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MonthClose_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monthId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assignee" TEXT,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChecklistItem_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "MonthClose" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monthId" TEXT NOT NULL,
    "checklistItemId" TEXT,
    "title" TEXT NOT NULL,
    "assignee" TEXT,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "MonthClose" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "ChecklistItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MonthClose_userId_label_key" ON "MonthClose"("userId", "label");

-- CreateIndex
CREATE INDEX "ChecklistItem_monthId_idx" ON "ChecklistItem"("monthId");

-- CreateIndex
CREATE INDEX "Task_monthId_idx" ON "Task"("monthId");

-- CreateIndex
CREATE INDEX "Task_checklistItemId_idx" ON "Task"("checklistItemId");
