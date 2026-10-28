-- AlterTable
ALTER TABLE "Patient" ADD COLUMN "therapyStartDate" DATE;

-- Backfill: primer mes con pago real, ingreso del paciente, o alta (día 1 del mes).
UPDATE "Patient" p
SET "therapyStartDate" = COALESCE(
  (
    SELECT make_date(pay."periodYear", pay."periodMonth", 1)
    FROM "Payment" pay
    WHERE pay."patientId" = p.id AND pay."amountPaid" > 0
    ORDER BY pay."periodYear" ASC, pay."periodMonth" ASC
    LIMIT 1
  ),
  (
    SELECT make_date(
      COALESCE(ie."periodYear", EXTRACT(YEAR FROM ie."receivedAt" AT TIME ZONE 'UTC')::int),
      COALESCE(ie."periodMonth", EXTRACT(MONTH FROM ie."receivedAt" AT TIME ZONE 'UTC')::int),
      1
    )
    FROM "IncomeEntry" ie
    WHERE ie."patientId" = p.id
    ORDER BY
      COALESCE(ie."periodYear", EXTRACT(YEAR FROM ie."receivedAt" AT TIME ZONE 'UTC')::int) ASC,
      COALESCE(ie."periodMonth", EXTRACT(MONTH FROM ie."receivedAt" AT TIME ZONE 'UTC')::int) ASC
    LIMIT 1
  ),
  date_trunc('month', p."createdAt" AT TIME ZONE 'UTC')::date
);
