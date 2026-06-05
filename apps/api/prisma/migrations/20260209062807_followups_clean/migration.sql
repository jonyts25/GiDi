/*
  Warnings:

  - You are about to drop the column `areaId` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `generalGoal` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `generalNotes` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `homeWork` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `periodMonth` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `periodYear` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the `SessionAttachment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SessionMetric` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SessionObjective` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SessionObjectiveDay` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_areaId_fkey";

-- DropForeignKey
ALTER TABLE "SessionAttachment" DROP CONSTRAINT "SessionAttachment_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "SessionMetric" DROP CONSTRAINT "SessionMetric_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "SessionObjective" DROP CONSTRAINT "SessionObjective_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "SessionObjectiveDay" DROP CONSTRAINT "SessionObjectiveDay_objectiveId_fkey";

-- DropIndex
DROP INDEX "Session_areaId_idx";

-- DropIndex
DROP INDEX "Session_periodYear_periodMonth_idx";

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "areaId",
DROP COLUMN "generalGoal",
DROP COLUMN "generalNotes",
DROP COLUMN "homeWork",
DROP COLUMN "periodMonth",
DROP COLUMN "periodYear";

-- DropTable
DROP TABLE "SessionAttachment";

-- DropTable
DROP TABLE "SessionMetric";

-- DropTable
DROP TABLE "SessionObjective";

-- DropTable
DROP TABLE "SessionObjectiveDay";

-- DropEnum
DROP TYPE "SessionDayCode";

-- CreateIndex
CREATE INDEX "FollowUp_periodYear_periodMonth_idx" ON "FollowUp"("periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "FollowUpAttachment_followUpId_idx" ON "FollowUpAttachment"("followUpId");

-- CreateIndex
CREATE INDEX "PatientTherapist_patientId_idx" ON "PatientTherapist"("patientId");

-- CreateIndex
CREATE INDEX "PatientTherapist_therapistId_idx" ON "PatientTherapist"("therapistId");
