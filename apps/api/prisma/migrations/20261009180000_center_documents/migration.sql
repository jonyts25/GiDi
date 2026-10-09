-- Documentos del centro (reglamentos, aviso de privacidad, etc.)
CREATE TABLE "CenterDocument" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "audience" "RoleKey"[] NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CenterDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CenterDocument_isActive_idx" ON "CenterDocument"("isActive");
CREATE INDEX "CenterDocument_sortOrder_idx" ON "CenterDocument"("sortOrder");

ALTER TABLE "CenterDocument" ADD CONSTRAINT "CenterDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
