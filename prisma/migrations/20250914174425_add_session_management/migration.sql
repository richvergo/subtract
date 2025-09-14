-- AlterTable
ALTER TABLE "Login" ADD COLUMN "sessionData" TEXT;
ALTER TABLE "Login" ADD COLUMN "sessionExpiry" DATETIME;
