-- Postgres truncó el identificador a 63 chars (periodMont). Es una CONSTRAINT, no un índice suelto.
ALTER TABLE "FollowUp" DROP CONSTRAINT IF EXISTS "FollowUp_patientId_therapistId_areaId_periodYear_periodMont_key";
-- Nombre completo por si la BD no truncó el identificador
ALTER TABLE "FollowUp" DROP CONSTRAINT IF EXISTS "FollowUp_patientId_therapistId_areaId_periodYear_periodMonth_key";
