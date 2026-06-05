-- Objetivos (banco + paciente), campos clínicos en Session, enum de asistencia en sesión.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "SessionAttendanceCode" AS ENUM ('A', 'V', 'E', 'F', 'R', 'X');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN "progressScale" INTEGER;
ALTER TABLE "Session" ADD COLUMN "attendanceCode" "SessionAttendanceCode";

ALTER TABLE "Session" ADD CONSTRAINT "Session_progressScale_check" CHECK (
  "progressScale" IS NULL OR ("progressScale" >= 0 AND "progressScale" <= 4)
);

-- CreateTable
CREATE TABLE "ObjectiveBank" (
    "id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "areaId" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObjectiveBank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientObjective" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "objectiveBankId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientObjective_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ObjectiveBank" ADD CONSTRAINT "ObjectiveBank_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ObjectiveBank" ADD CONSTRAINT "ObjectiveBank_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PatientObjective" ADD CONSTRAINT "PatientObjective_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientObjective" ADD CONSTRAINT "PatientObjective_objectiveBankId_fkey" FOREIGN KEY ("objectiveBankId") REFERENCES "ObjectiveBank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "PatientObjective_patientId_objectiveBankId_key" ON "PatientObjective"("patientId", "objectiveBankId");

CREATE INDEX "ObjectiveBank_areaId_idx" ON "ObjectiveBank"("areaId");

CREATE INDEX "ObjectiveBank_creatorId_idx" ON "ObjectiveBank"("creatorId");

CREATE INDEX "ObjectiveBank_isPublic_idx" ON "ObjectiveBank"("isPublic");

CREATE INDEX "PatientObjective_patientId_idx" ON "PatientObjective"("patientId");

CREATE INDEX "PatientObjective_objectiveBankId_idx" ON "PatientObjective"("objectiveBankId");
