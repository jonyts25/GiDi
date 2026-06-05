-- Sesiones dentro del seguimiento mensual; elimina Session global

-- Objetivo: observaciones consolidadas del mes por fila
ALTER TABLE "FollowUpObjective" ADD COLUMN IF NOT EXISTS "monthlyNotes" TEXT;

-- Renombrar entrada diaria → sesión de seguimiento
ALTER TABLE "FollowUpEntry" RENAME TO "FollowUpSession";

ALTER TABLE "FollowUpSession" RENAME COLUMN "date" TO "sessionDate";

ALTER TABLE "FollowUpSession" ADD COLUMN IF NOT EXISTS "therapistId" UUID;

UPDATE "FollowUpSession" fs
SET "therapistId" = fu."therapistId"
FROM "FollowUp" fu
WHERE fu."id" = fs."followUpId" AND fs."therapistId" IS NULL;

ALTER TABLE "FollowUpSession" ALTER COLUMN "therapistId" SET NOT NULL;

ALTER TABLE "FollowUpSession" DROP COLUMN IF EXISTS "entryStatus";
ALTER TABLE "FollowUpSession" DROP COLUMN IF EXISTS "generalNote";

DROP TYPE IF EXISTS "FollowUpEntryStatus";

-- Índices y restricciones de sesión
DROP INDEX IF EXISTS "FollowUpEntry_followUpId_date_key";
DROP INDEX IF EXISTS "FollowUpEntry_date_idx";

CREATE UNIQUE INDEX "FollowUpSession_followUpId_sessionDate_key"
  ON "FollowUpSession"("followUpId", "sessionDate");

CREATE INDEX "FollowUpSession_sessionDate_idx" ON "FollowUpSession"("sessionDate");
CREATE INDEX "FollowUpSession_therapistId_idx" ON "FollowUpSession"("therapistId");

ALTER TABLE "FollowUpSession"
  ADD CONSTRAINT "FollowUpSession_therapistId_fkey"
  FOREIGN KEY ("therapistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Marcas vinculadas a sesión
ALTER TABLE "FollowUpMark" RENAME COLUMN "entryId" TO "followUpSessionId";

DROP INDEX IF EXISTS "FollowUpMark_entryId_idx";
DROP INDEX IF EXISTS "FollowUpMark_entryId_objectiveId_key";

CREATE INDEX "FollowUpMark_followUpSessionId_idx" ON "FollowUpMark"("followUpSessionId");
CREATE UNIQUE INDEX "FollowUpMark_followUpSessionId_objectiveId_key"
  ON "FollowUpMark"("followUpSessionId", "objectiveId");

ALTER TABLE "FollowUpMark" DROP CONSTRAINT IF EXISTS "FollowUpMark_entryId_fkey";
ALTER TABLE "FollowUpMark"
  ADD CONSTRAINT "FollowUpMark_followUpSessionId_fkey"
  FOREIGN KEY ("followUpSessionId") REFERENCES "FollowUpSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Eliminar módulo Session global (datos legacy se pierden; seguimiento mensual es la fuente de verdad)
DROP TABLE IF EXISTS "Session" CASCADE;
DROP TYPE IF EXISTS "SessionStatus";
DROP TYPE IF EXISTS "SessionAttendanceCode";
