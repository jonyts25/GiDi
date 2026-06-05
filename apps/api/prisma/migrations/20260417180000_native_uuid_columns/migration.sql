-- GiDi: columnas identificadoras de TEXT a UUID nativo (PostgreSQL / Supabase).
-- Requisito: todos los valores en columnas id / *Id deben ser UUID válidos como texto.
-- No modifica el esquema auth.* de Supabase (GoTrue); solo tablas GiDi en public.
--
-- Ejecución recomendada: desde apps/api con DATABASE_URL apuntando a Supabase:
--   pnpm exec prisma migrate deploy
--
-- Si pegas este SQL a mano en el editor de Supabase y luego usas Prisma, marca la migración
-- como aplicada sin volver a ejecutarla:
--   pnpm exec prisma migrate resolve --applied 20260417180000_native_uuid_columns
--
-- Extensión para gen_random_uuid() (suele existir ya en Supabase).
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1) Quitar FKs que referencian columnas a convertir
-- ---------------------------------------------------------------------------
ALTER TABLE "FollowUpMark" DROP CONSTRAINT IF EXISTS "FollowUpMark_entryId_fkey";
ALTER TABLE "FollowUpMark" DROP CONSTRAINT IF EXISTS "FollowUpMark_objectiveId_fkey";
ALTER TABLE "FollowUpEntry" DROP CONSTRAINT IF EXISTS "FollowUpEntry_followUpId_fkey";
ALTER TABLE "FollowUpObjective" DROP CONSTRAINT IF EXISTS "FollowUpObjective_followUpId_fkey";
ALTER TABLE "FollowUpAttachment" DROP CONSTRAINT IF EXISTS "FollowUpAttachment_followUpId_fkey";
ALTER TABLE "FollowUpMetric" DROP CONSTRAINT IF EXISTS "FollowUpMetric_followUpId_fkey";
ALTER TABLE "FollowUp" DROP CONSTRAINT IF EXISTS "FollowUp_patientId_fkey";
ALTER TABLE "FollowUp" DROP CONSTRAINT IF EXISTS "FollowUp_therapistId_fkey";
ALTER TABLE "FollowUp" DROP CONSTRAINT IF EXISTS "FollowUp_areaId_fkey";
ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_patientId_fkey";
ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_therapistId_fkey";
ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_confirmedById_fkey";
ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_validatedById_fkey";
ALTER TABLE "SchoolPatient" DROP CONSTRAINT IF EXISTS "SchoolPatient_schoolId_fkey";
ALTER TABLE "SchoolPatient" DROP CONSTRAINT IF EXISTS "SchoolPatient_patientId_fkey";
ALTER TABLE "ParentPatient" DROP CONSTRAINT IF EXISTS "ParentPatient_parentId_fkey";
ALTER TABLE "ParentPatient" DROP CONSTRAINT IF EXISTS "ParentPatient_patientId_fkey";
ALTER TABLE "PatientTherapist" DROP CONSTRAINT IF EXISTS "PatientTherapist_patientId_fkey";
ALTER TABLE "PatientTherapist" DROP CONSTRAINT IF EXISTS "PatientTherapist_therapistId_fkey";
ALTER TABLE "UserRole" DROP CONSTRAINT IF EXISTS "UserRole_userId_fkey";
ALTER TABLE "UserRole" DROP CONSTRAINT IF EXISTS "UserRole_roleId_fkey";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'AppointmentRequest'
  ) THEN
    ALTER TABLE "AppointmentRequest" DROP CONSTRAINT IF EXISTS "AppointmentRequest_patientId_fkey";
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Convertir columnas a UUID (misma semántica que Prisma @db.Uuid)
-- ---------------------------------------------------------------------------
ALTER TABLE "User" ALTER COLUMN "id" TYPE uuid USING trim("id"::text)::uuid;
ALTER TABLE "Role" ALTER COLUMN "id" TYPE uuid USING trim("id"::text)::uuid;
ALTER TABLE "UserRole" ALTER COLUMN "userId" TYPE uuid USING trim("userId"::text)::uuid;
ALTER TABLE "UserRole" ALTER COLUMN "roleId" TYPE uuid USING trim("roleId"::text)::uuid;
ALTER TABLE "Patient" ALTER COLUMN "id" TYPE uuid USING trim("id"::text)::uuid;
ALTER TABLE "PatientTherapist" ALTER COLUMN "id" TYPE uuid USING trim("id"::text)::uuid;
ALTER TABLE "PatientTherapist" ALTER COLUMN "patientId" TYPE uuid USING trim("patientId"::text)::uuid;
ALTER TABLE "PatientTherapist" ALTER COLUMN "therapistId" TYPE uuid USING trim("therapistId"::text)::uuid;
ALTER TABLE "ParentPatient" ALTER COLUMN "id" TYPE uuid USING trim("id"::text)::uuid;
ALTER TABLE "ParentPatient" ALTER COLUMN "parentId" TYPE uuid USING trim("parentId"::text)::uuid;
ALTER TABLE "ParentPatient" ALTER COLUMN "patientId" TYPE uuid USING trim("patientId"::text)::uuid;
ALTER TABLE "SchoolPatient" ALTER COLUMN "id" TYPE uuid USING trim("id"::text)::uuid;
ALTER TABLE "SchoolPatient" ALTER COLUMN "schoolId" TYPE uuid USING trim("schoolId"::text)::uuid;
ALTER TABLE "SchoolPatient" ALTER COLUMN "patientId" TYPE uuid USING trim("patientId"::text)::uuid;
ALTER TABLE "Session" ALTER COLUMN "id" TYPE uuid USING trim("id"::text)::uuid;
ALTER TABLE "Session" ALTER COLUMN "patientId" TYPE uuid USING trim("patientId"::text)::uuid;
ALTER TABLE "Session" ALTER COLUMN "therapistId" TYPE uuid USING trim("therapistId"::text)::uuid;
ALTER TABLE "Session" ALTER COLUMN "confirmedById" TYPE uuid USING (
  CASE WHEN "confirmedById" IS NULL THEN NULL ELSE trim("confirmedById"::text)::uuid END
);
ALTER TABLE "Session" ALTER COLUMN "validatedById" TYPE uuid USING (
  CASE WHEN "validatedById" IS NULL THEN NULL ELSE trim("validatedById"::text)::uuid END
);
ALTER TABLE "Area" ALTER COLUMN "id" TYPE uuid USING trim("id"::text)::uuid;
ALTER TABLE "FollowUp" ALTER COLUMN "id" TYPE uuid USING trim("id"::text)::uuid;
ALTER TABLE "FollowUp" ALTER COLUMN "patientId" TYPE uuid USING trim("patientId"::text)::uuid;
ALTER TABLE "FollowUp" ALTER COLUMN "therapistId" TYPE uuid USING trim("therapistId"::text)::uuid;
ALTER TABLE "FollowUp" ALTER COLUMN "areaId" TYPE uuid USING trim("areaId"::text)::uuid;
ALTER TABLE "FollowUpObjective" ALTER COLUMN "id" TYPE uuid USING trim("id"::text)::uuid;
ALTER TABLE "FollowUpObjective" ALTER COLUMN "followUpId" TYPE uuid USING trim("followUpId"::text)::uuid;
ALTER TABLE "FollowUpEntry" ALTER COLUMN "id" TYPE uuid USING trim("id"::text)::uuid;
ALTER TABLE "FollowUpEntry" ALTER COLUMN "followUpId" TYPE uuid USING trim("followUpId"::text)::uuid;
ALTER TABLE "FollowUpMark" ALTER COLUMN "id" TYPE uuid USING trim("id"::text)::uuid;
ALTER TABLE "FollowUpMark" ALTER COLUMN "entryId" TYPE uuid USING trim("entryId"::text)::uuid;
ALTER TABLE "FollowUpMark" ALTER COLUMN "objectiveId" TYPE uuid USING trim("objectiveId"::text)::uuid;
ALTER TABLE "FollowUpAttachment" ALTER COLUMN "id" TYPE uuid USING trim("id"::text)::uuid;
ALTER TABLE "FollowUpAttachment" ALTER COLUMN "followUpId" TYPE uuid USING trim("followUpId"::text)::uuid;
ALTER TABLE "FollowUpMetric" ALTER COLUMN "id" TYPE uuid USING trim("id"::text)::uuid;
ALTER TABLE "FollowUpMetric" ALTER COLUMN "followUpId" TYPE uuid USING trim("followUpId"::text)::uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'AppointmentRequest'
  ) THEN
    ALTER TABLE "AppointmentRequest" ALTER COLUMN "id" TYPE uuid USING trim("id"::text)::uuid;
    ALTER TABLE "AppointmentRequest" ALTER COLUMN "patientId" TYPE uuid USING (
      CASE WHEN "patientId" IS NULL THEN NULL ELSE trim("patientId"::text)::uuid END
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3) Tabla AppointmentRequest (si no existía en migraciones previas del repo)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AppointmentRequest" (
    "id" UUID NOT NULL,
    "parentPhone" TEXT NOT NULL,
    "patientId" UUID,
    "requestedDate" TIMESTAMP(3),
    "status" TEXT DEFAULT 'pending',
    "rawMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppointmentRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AppointmentRequest_patientId_idx" ON "AppointmentRequest"("patientId");

-- ---------------------------------------------------------------------------
-- 4) Defaults de PK (coinciden con Prisma @default(uuid()))
-- ---------------------------------------------------------------------------
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "Role" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "Patient" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "PatientTherapist" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "ParentPatient" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "SchoolPatient" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "Session" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "Area" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "FollowUp" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "FollowUpObjective" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "FollowUpEntry" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "FollowUpMark" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "FollowUpAttachment" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "FollowUpMetric" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "AppointmentRequest" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- ---------------------------------------------------------------------------
-- 5) Restaurar FKs
-- ---------------------------------------------------------------------------
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientTherapist" ADD CONSTRAINT "PatientTherapist_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientTherapist" ADD CONSTRAINT "PatientTherapist_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentPatient" ADD CONSTRAINT "ParentPatient_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentPatient" ADD CONSTRAINT "ParentPatient_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SchoolPatient" ADD CONSTRAINT "SchoolPatient_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolPatient" ADD CONSTRAINT "SchoolPatient_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FollowUpObjective" ADD CONSTRAINT "FollowUpObjective_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "FollowUp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FollowUpEntry" ADD CONSTRAINT "FollowUpEntry_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "FollowUp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FollowUpMark" ADD CONSTRAINT "FollowUpMark_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "FollowUpEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FollowUpMark" ADD CONSTRAINT "FollowUpMark_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "FollowUpObjective"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FollowUpAttachment" ADD CONSTRAINT "FollowUpAttachment_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "FollowUp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FollowUpMetric" ADD CONSTRAINT "FollowUpMetric_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "FollowUp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentRequest" ADD CONSTRAINT "AppointmentRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
