-- Usuarios: última actividad para desactivar perfiles tras 1 año sin iniciar sesión.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

UPDATE "User"
SET "lastLoginAt" = COALESCE("lastLoginAt", "updatedAt", "createdAt", CURRENT_TIMESTAMP)
WHERE "lastLoginAt" IS NULL;

-- Pacientes: bajas sin borrar historial.
DO $$ BEGIN
  CREATE TYPE "PatientStatus" AS ENUM ('ACTIVE', 'DISCHARGED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "status" "PatientStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "dischargedAt" TIMESTAMP(3);
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "dischargeReason" TEXT;

CREATE INDEX IF NOT EXISTS "Patient_status_idx" ON "Patient"("status");
