-- Configuración de cobro por paciente.
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "sessionsPerWeek" INTEGER;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "discountPercent" INTEGER DEFAULT 0;

-- Estados de pago.
DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('PENDIENTE', 'PAGADO', 'PARCIAL', 'DEUDA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Mensualidades.
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patientId" UUID NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "amountDue" INTEGER NOT NULL,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDIENTE',
    "paidAt" TIMESTAMP(3),
    "method" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "receiptUrl" TEXT,
    "receiptName" TEXT,
    "receiptUploadedAt" TIMESTAMP(3),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_patientId_periodYear_periodMonth_key" ON "Payment"("patientId", "periodYear", "periodMonth");
CREATE INDEX IF NOT EXISTS "Payment_patientId_idx" ON "Payment"("patientId");
CREATE INDEX IF NOT EXISTS "Payment_periodYear_periodMonth_idx" ON "Payment"("periodYear", "periodMonth");
CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment"("status");

DO $$ BEGIN
  ALTER TABLE "Payment" ADD CONSTRAINT "Payment_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Payment" ADD CONSTRAINT "Payment_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
