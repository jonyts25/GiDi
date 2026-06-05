-- CreateEnum
CREATE TYPE "SessionDayCode" AS ENUM ('A', 'V', 'E', 'F', 'R', 'X');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "areaId" TEXT,
ADD COLUMN     "generalGoal" TEXT,
ADD COLUMN     "generalNotes" TEXT,
ADD COLUMN     "homeWork" TEXT,
ADD COLUMN     "periodMonth" INTEGER,
ADD COLUMN     "periodYear" INTEGER;

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionObjective" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "idx" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionObjectiveDay" (
    "id" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "code" "SessionDayCode" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionObjectiveDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionAttachment" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionMetric" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "SessionMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Area_key_key" ON "Area"("key");

-- CreateIndex
CREATE INDEX "SessionObjective_sessionId_idx" ON "SessionObjective"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionObjective_sessionId_idx_key" ON "SessionObjective"("sessionId", "idx");

-- CreateIndex
CREATE INDEX "SessionObjectiveDay_objectiveId_idx" ON "SessionObjectiveDay"("objectiveId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionObjectiveDay_objectiveId_dayOfMonth_key" ON "SessionObjectiveDay"("objectiveId", "dayOfMonth");

-- CreateIndex
CREATE INDEX "SessionMetric_sessionId_idx" ON "SessionMetric"("sessionId");

-- CreateIndex
CREATE INDEX "SessionMetric_name_idx" ON "SessionMetric"("name");

-- CreateIndex
CREATE INDEX "SessionMetric_measuredAt_idx" ON "SessionMetric"("measuredAt");

-- CreateIndex
CREATE INDEX "Session_areaId_idx" ON "Session"("areaId");

-- CreateIndex
CREATE INDEX "Session_periodYear_periodMonth_idx" ON "Session"("periodYear", "periodMonth");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionObjective" ADD CONSTRAINT "SessionObjective_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionObjectiveDay" ADD CONSTRAINT "SessionObjectiveDay_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "SessionObjective"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAttachment" ADD CONSTRAINT "SessionAttachment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionMetric" ADD CONSTRAINT "SessionMetric_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
