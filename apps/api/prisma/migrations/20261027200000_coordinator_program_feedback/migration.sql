-- AlterEnum
ALTER TYPE "RoleKey" ADD VALUE 'COORDINATOR';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "coordinatorId" UUID;

-- CreateIndex
CREATE INDEX "User_coordinatorId_idx" ON "User"("coordinatorId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ProgramFeedback" (
    "id" UUID NOT NULL,
    "programId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "seenByTherapistAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgramFeedback_programId_idx" ON "ProgramFeedback"("programId");

-- AddForeignKey
ALTER TABLE "ProgramFeedback" ADD CONSTRAINT "ProgramFeedback_programId_fkey" FOREIGN KEY ("programId") REFERENCES "FollowUpProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramFeedback" ADD CONSTRAINT "ProgramFeedback_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
