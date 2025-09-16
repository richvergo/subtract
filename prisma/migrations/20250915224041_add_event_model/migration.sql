-- AlterTable
ALTER TABLE "Agent" ADD COLUMN "eventLog" TEXT;
ALTER TABLE "Agent" ADD COLUMN "transcript" TEXT;

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "value" TEXT,
    "url" TEXT,
    "elementType" TEXT,
    "elementText" TEXT,
    "screenshotUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Event_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Event_agentId_step_idx" ON "Event"("agentId", "step");
