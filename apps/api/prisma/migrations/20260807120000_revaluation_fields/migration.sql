ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "lastRevaluationDate" TIMESTAMP(3);
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "revaluationAlertSnoozedUntil" TIMESTAMP(3);
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "revaluationSkipReason" TEXT;
