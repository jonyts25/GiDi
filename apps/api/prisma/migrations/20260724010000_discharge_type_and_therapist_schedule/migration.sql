-- Tipo de inactivación: alta (terminó) vs baja (abandono)
DO $$ BEGIN
  CREATE TYPE "DischargeType" AS ENUM ('COMPLETED', 'DROPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "dischargeType" "DischargeType";

-- Horario semanal de terapeutas
CREATE TABLE IF NOT EXISTS "TherapistSchedule" (
  "therapistId" UUID PRIMARY KEY,
  "location" TEXT,
  "notes" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TherapistSchedule_therapistId_fkey" FOREIGN KEY ("therapistId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "TherapistScheduleSlot" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "therapistId" UUID NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT,
  "label" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TherapistScheduleSlot_therapistId_fkey" FOREIGN KEY ("therapistId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TherapistScheduleSlot_therapistId_idx" ON "TherapistScheduleSlot"("therapistId");
