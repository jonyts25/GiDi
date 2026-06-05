-- CreateEnum
CREATE TYPE "GuardianRelationship" AS ENUM ('MOTHER', 'FATHER', 'TUTOR', 'OTHER');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('DRAFT', 'COMPLETED', 'NO_SHOW', 'CANCELED', 'RESCHEDULED');

-- AlterEnum
ALTER TYPE "RoleKey" ADD VALUE 'SECRETARY';

-- AlterTable
ALTER TABLE "ParentPatient" ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "relationship" "GuardianRelationship" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "capturedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedById" TEXT,
ADD COLUMN     "durationMinutes" INTEGER,
ADD COLUMN     "isMakeUp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "noShowReason" TEXT,
ADD COLUMN     "rescheduledTo" TIMESTAMP(3),
ADD COLUMN     "status" "SessionStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "validatedAt" TIMESTAMP(3),
ADD COLUMN     "validatedById" TEXT;

-- CreateTable
CREATE TABLE "SchoolPatient" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "SchoolPatient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchoolPatient_patientId_idx" ON "SchoolPatient"("patientId");

-- CreateIndex
CREATE INDEX "SchoolPatient_schoolId_idx" ON "SchoolPatient"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolPatient_schoolId_patientId_key" ON "SchoolPatient"("schoolId", "patientId");

-- CreateIndex
CREATE INDEX "Session_status_idx" ON "Session"("status");

-- CreateIndex
CREATE INDEX "Session_confirmedById_idx" ON "Session"("confirmedById");

-- CreateIndex
CREATE INDEX "Session_validatedById_idx" ON "Session"("validatedById");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolPatient" ADD CONSTRAINT "SchoolPatient_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolPatient" ADD CONSTRAINT "SchoolPatient_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
