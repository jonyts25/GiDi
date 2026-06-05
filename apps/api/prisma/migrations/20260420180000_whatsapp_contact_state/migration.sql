CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "WhatsAppContactState" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "waId" TEXT NOT NULL,
    "welcomeMenuShown" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppContactState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppContactState_waId_key" ON "WhatsAppContactState"("waId");
