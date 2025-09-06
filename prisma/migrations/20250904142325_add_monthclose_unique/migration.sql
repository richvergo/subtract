/*
  Warnings:

  - A unique constraint covering the columns `[userId,label]` on the table `MonthClose` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "user_label_idx";

-- CreateIndex
CREATE UNIQUE INDEX "MonthClose_userId_label_key" ON "MonthClose"("userId", "label");
