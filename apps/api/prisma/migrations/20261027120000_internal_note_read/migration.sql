-- CreateTable
CREATE TABLE "InternalNoteRead" (
    "userId" UUID NOT NULL,
    "followUpId" UUID NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalNoteRead_pkey" PRIMARY KEY ("userId","followUpId")
);

-- CreateIndex
CREATE INDEX "InternalNoteRead_followUpId_idx" ON "InternalNoteRead"("followUpId");

-- AddForeignKey
ALTER TABLE "InternalNoteRead" ADD CONSTRAINT "InternalNoteRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalNoteRead" ADD CONSTRAINT "InternalNoteRead_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "FollowUp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
