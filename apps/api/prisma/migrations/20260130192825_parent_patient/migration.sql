-- CreateTable
CREATE TABLE "ParentPatient" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,

    CONSTRAINT "ParentPatient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParentPatient_patientId_idx" ON "ParentPatient"("patientId");

-- CreateIndex
CREATE INDEX "ParentPatient_parentId_idx" ON "ParentPatient"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentPatient_parentId_patientId_key" ON "ParentPatient"("parentId", "patientId");

-- AddForeignKey
ALTER TABLE "ParentPatient" ADD CONSTRAINT "ParentPatient_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentPatient" ADD CONSTRAINT "ParentPatient_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
