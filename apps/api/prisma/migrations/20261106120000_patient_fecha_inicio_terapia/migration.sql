-- Inicio de terapia para cobros y arrastre de adeudos (UTC). Default = alta; backfill desde createdAt.
ALTER TABLE "Patient" ADD COLUMN "fechaInicioTerapia" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Patient" p SET "fechaInicioTerapia" = LEAST(
  p."createdAt",
  COALESCE((SELECT min(make_date(pay."periodYear", pay."periodMonth", 1))::timestamp
            FROM "Payment" pay WHERE pay."patientId" = p.id),
           p."createdAt"));
