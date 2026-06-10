-- Centro GiDi + documentos del paciente
CREATE TYPE "GidiCenter" AS ENUM ('SAN_AGUSTIN', 'VALLARTA');
CREATE TYPE "PatientDocumentCategory" AS ENUM ('EVALUACION', 'REVALORACION', 'SEGUIMIENTO_PADRES');

ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "center" "GidiCenter" NOT NULL DEFAULT 'SAN_AGUSTIN';

CREATE TABLE IF NOT EXISTS "PatientDocument" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patientId" UUID NOT NULL,
    "category" "PatientDocumentCategory" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PatientDocument_patientId_idx" ON "PatientDocument"("patientId");
CREATE INDEX IF NOT EXISTS "PatientDocument_category_idx" ON "PatientDocument"("category");

DO $$ BEGIN
  ALTER TABLE "PatientDocument" ADD CONSTRAINT "PatientDocument_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PatientDocument" ADD CONSTRAINT "PatientDocument_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
