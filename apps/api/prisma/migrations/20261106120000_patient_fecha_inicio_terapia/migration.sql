-- Inicio de terapia para cobros y arrastre de adeudos (UTC). Default = alta; backfill desde createdAt.
ALTER TABLE "Patient" ADD COLUMN "fechaInicioTerapia" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Patient" SET "fechaInicioTerapia" = "createdAt";
