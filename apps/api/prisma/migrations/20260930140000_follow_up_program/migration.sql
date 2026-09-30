-- CreateTable
CREATE TABLE "FollowUpProgram" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "therapistId" UUID NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpProgram_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "FollowUp" ADD COLUMN "programId" UUID;

-- AlterTable
ALTER TABLE "FollowUpObjective" ADD COLUMN "activities" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FollowUpProgram_patientId_therapistId_periodYear_periodMonth_key" ON "FollowUpProgram"("patientId", "therapistId", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "FollowUpProgram_patientId_idx" ON "FollowUpProgram"("patientId");

-- CreateIndex
CREATE INDEX "FollowUpProgram_therapistId_idx" ON "FollowUpProgram"("therapistId");

-- CreateIndex
CREATE INDEX "FollowUpProgram_periodYear_periodMonth_idx" ON "FollowUpProgram"("periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "FollowUp_programId_idx" ON "FollowUp"("programId");

-- AddForeignKey
ALTER TABLE "FollowUpProgram" ADD CONSTRAINT "FollowUpProgram_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpProgram" ADD CONSTRAINT "FollowUpProgram_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_programId_fkey" FOREIGN KEY ("programId") REFERENCES "FollowUpProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: un FollowUpProgram por grupo (paciente + terapeuta + mes) en áreas MONTHLY_GRID
INSERT INTO "FollowUpProgram" ("id", "patientId", "therapistId", "periodYear", "periodMonth", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  fu."patientId",
  fu."therapistId",
  fu."periodYear",
  fu."periodMonth",
  NOW(),
  NOW()
FROM "FollowUp" fu
JOIN "Area" a ON a."id" = fu."areaId"
WHERE a."trackingMode" = 'MONTHLY_GRID'
GROUP BY fu."patientId", fu."therapistId", fu."periodYear", fu."periodMonth";

UPDATE "FollowUp" fu
SET "programId" = p."id"
FROM "Area" a, "FollowUpProgram" p
WHERE fu."areaId" = a."id"
  AND a."trackingMode" = 'MONTHLY_GRID'
  AND p."patientId" = fu."patientId"
  AND p."therapistId" = fu."therapistId"
  AND p."periodYear" = fu."periodYear"
  AND p."periodMonth" = fu."periodMonth";
