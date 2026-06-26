-- Corrige desajuste de enum: la BD tenía 'REVALORACION' pero el schema/código usa 'REVALUACION'.
-- Guardado para ser idempotente: solo renombra si el valor viejo existe y el nuevo aún no.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'PatientDocumentCategory' AND e.enumlabel = 'REVALORACION'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'PatientDocumentCategory' AND e.enumlabel = 'REVALUACION'
  ) THEN
    ALTER TYPE "PatientDocumentCategory" RENAME VALUE 'REVALORACION' TO 'REVALUACION';
  END IF;
END $$;
