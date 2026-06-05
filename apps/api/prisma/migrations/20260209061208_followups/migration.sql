-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "FollowUpEntryStatus" AS ENUM ('DONE', 'NO_SHOW', 'CANCELED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "FollowUpMarkCode" AS ENUM ('A', 'V', 'E', 'F', 'R', 'X', 'OK');

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "generalGoal" TEXT,
    "generalNotes" TEXT,
    "homeWork" TEXT,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpObjective" (
    "id" TEXT NOT NULL,
    "followUpId" TEXT NOT NULL,
    "idx" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpEntry" (
    "id" TEXT NOT NULL,
    "followUpId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "entryStatus" "FollowUpEntryStatus" NOT NULL DEFAULT 'DONE',
    "generalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpMark" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "code" "FollowUpMarkCode" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpMark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpAttachment" (
    "id" TEXT NOT NULL,
    "followUpId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpMetric" (
    "id" TEXT NOT NULL,
    "followUpId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "FollowUpMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowUp_patientId_idx" ON "FollowUp"("patientId");

-- CreateIndex
CREATE INDEX "FollowUp_therapistId_idx" ON "FollowUp"("therapistId");

-- CreateIndex
CREATE INDEX "FollowUp_areaId_idx" ON "FollowUp"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "FollowUp_patientId_therapistId_areaId_periodYear_periodMont_key" ON "FollowUp"("patientId", "therapistId", "areaId", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "FollowUpObjective_followUpId_idx" ON "FollowUpObjective"("followUpId");

-- CreateIndex
CREATE UNIQUE INDEX "FollowUpObjective_followUpId_idx_key" ON "FollowUpObjective"("followUpId", "idx");

-- CreateIndex
CREATE INDEX "FollowUpEntry_followUpId_idx" ON "FollowUpEntry"("followUpId");

-- CreateIndex
CREATE INDEX "FollowUpEntry_date_idx" ON "FollowUpEntry"("date");

-- CreateIndex
CREATE UNIQUE INDEX "FollowUpEntry_followUpId_date_key" ON "FollowUpEntry"("followUpId", "date");

-- CreateIndex
CREATE INDEX "FollowUpMark_objectiveId_idx" ON "FollowUpMark"("objectiveId");

-- CreateIndex
CREATE INDEX "FollowUpMark_entryId_idx" ON "FollowUpMark"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "FollowUpMark_entryId_objectiveId_key" ON "FollowUpMark"("entryId", "objectiveId");

-- CreateIndex
CREATE INDEX "FollowUpMetric_followUpId_idx" ON "FollowUpMetric"("followUpId");

-- CreateIndex
CREATE INDEX "FollowUpMetric_name_idx" ON "FollowUpMetric"("name");

-- CreateIndex
CREATE INDEX "FollowUpMetric_measuredAt_idx" ON "FollowUpMetric"("measuredAt");

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpObjective" ADD CONSTRAINT "FollowUpObjective_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "FollowUp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpEntry" ADD CONSTRAINT "FollowUpEntry_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "FollowUp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpMark" ADD CONSTRAINT "FollowUpMark_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "FollowUpEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpMark" ADD CONSTRAINT "FollowUpMark_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "FollowUpObjective"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpAttachment" ADD CONSTRAINT "FollowUpAttachment_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "FollowUp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpMetric" ADD CONSTRAINT "FollowUpMetric_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "FollowUp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
