-- AlterTable
ALTER TABLE "FollowUp" ADD COLUMN "lastNoteAt" TIMESTAMP(3),
ADD COLUMN "lastNoteById" UUID;

-- CreateIndex
CREATE INDEX "FollowUp_lastNoteById_idx" ON "FollowUp"("lastNoteById");

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_lastNoteById_fkey" FOREIGN KEY ("lastNoteById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill comunicación interna con nota existente
UPDATE "FollowUp" AS fu
SET
  "lastNoteAt" = fu."updatedAt",
  "lastNoteById" = fu."therapistId"
FROM "Area" AS a
WHERE fu."areaId" = a.id
  AND a.key = 'COMUNICACION_INTERNA'
  AND fu."generalNotes" IS NOT NULL
  AND TRIM(fu."generalNotes") <> '';
