-- Permitir varios seguimientos del mismo area/mes (sin sobreescribir)
ALTER TABLE "FollowUp" DROP CONSTRAINT IF EXISTS "FollowUp_patientId_therapistId_areaId_periodYear_periodMonth_key";
