-- AlterTable
ALTER TABLE "Patient" ADD COLUMN "therapyStartDate" DATE;

-- Backfill: la fecha más temprana entre primer pago real, primer ingreso y alta (ignora NULL).
UPDATE "Patient" p
SET "therapyStartDate" = (
  SELECT MIN(d)
  FROM (
    VALUES
      (
        (
          SELECT make_date(pay."periodYear", pay."periodMonth", 1)
          FROM "Payment" pay
          WHERE pay."patientId" = p.id AND pay."amountPaid" > 0
          ORDER BY pay."periodYear" ASC, pay."periodMonth" ASC
          LIMIT 1
        )
      ),
      (
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
        )
      ),
      (date_trunc('month', p."createdAt" AT TIME ZONE 'UTC')::date)
  ) AS v(d)
  WHERE d IS NOT NULL
);
