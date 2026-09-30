-- CreateEnum
CREATE TYPE "IncomeConcept" AS ENUM ('MENSUALIDAD', 'EVALUACION', 'REVALORACION', 'SESION_INDIVIDUAL', 'VISITA_ESCUELA', 'PROTEINA', 'OTRO');

-- CreateEnum
CREATE TYPE "IncomeMethod" AS ENUM ('EFECTIVO', 'BANORTE_TRANSFERENCIA', 'BANORTE_TERMINAL', 'STP', 'MERCADO_PAGO_TRANSFERENCIA', 'MERCADO_PAGO_TERMINAL', 'OTRO');

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN "billingNotes" TEXT;

-- CreateTable
CREATE TABLE "IncomeEntry" (
    "id" UUID NOT NULL,
    "center" "GidiCenter" NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "concept" "IncomeConcept" NOT NULL,
    "patientId" UUID,
    "payerName" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "periodYear" INTEGER,
    "periodMonth" INTEGER,
    "method" "IncomeMethod" NOT NULL,
    "invoiced" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IncomeEntry_center_receivedAt_idx" ON "IncomeEntry"("center", "receivedAt");

-- CreateIndex
CREATE INDEX "IncomeEntry_patientId_periodYear_periodMonth_idx" ON "IncomeEntry"("patientId", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "IncomeEntry_concept_idx" ON "IncomeEntry"("concept");

-- AddForeignKey
ALTER TABLE "IncomeEntry" ADD CONSTRAINT "IncomeEntry_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeEntry" ADD CONSTRAINT "IncomeEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: pagos previos con monto pagado → IncomeEntry MENSUALIDAD
INSERT INTO "IncomeEntry" (
  "id",
  "center",
  "receivedAt",
  "concept",
  "patientId",
  "amount",
  "periodYear",
  "periodMonth",
  "method",
  "notes",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  pat."center",
  COALESCE(p."paidAt", p."updatedAt"),
  'MENSUALIDAD'::"IncomeConcept",
  p."patientId",
  p."amountPaid"::DECIMAL(10, 2),
  p."periodYear",
  p."periodMonth",
  CASE
    WHEN p."method" ILIKE '%efectivo%' THEN 'EFECTIVO'::"IncomeMethod"
    WHEN p."method" ILIKE '%stp%' THEN 'STP'::"IncomeMethod"
    WHEN p."method" ILIKE '%banorte%' AND p."method" ILIKE '%terminal%' THEN 'BANORTE_TERMINAL'::"IncomeMethod"
    WHEN p."method" ILIKE '%banorte%' AND p."method" ILIKE '%transfer%' THEN 'BANORTE_TRANSFERENCIA'::"IncomeMethod"
    WHEN p."method" ILIKE '%mercado%pago%' AND p."method" ILIKE '%terminal%' THEN 'MERCADO_PAGO_TERMINAL'::"IncomeMethod"
    WHEN p."method" ILIKE '%mercado%pago%' AND p."method" ILIKE '%transfer%' THEN 'MERCADO_PAGO_TRANSFERENCIA'::"IncomeMethod"
    WHEN p."method" ILIKE '%mercado%pago%' THEN 'MERCADO_PAGO_TRANSFERENCIA'::"IncomeMethod"
    WHEN p."method" ILIKE '%banorte%' THEN 'BANORTE_TRANSFERENCIA'::"IncomeMethod"
    WHEN p."method" ILIKE '%terminal%' THEN 'BANORTE_TERMINAL'::"IncomeMethod"
    WHEN p."method" ILIKE '%transfer%' THEN 'BANORTE_TRANSFERENCIA'::"IncomeMethod"
    ELSE 'OTRO'::"IncomeMethod"
  END,
  'Migrado de captura previa',
  NOW(),
  NOW()
FROM "Payment" p
JOIN "Patient" pat ON pat."id" = p."patientId"
WHERE p."amountPaid" > 0;
