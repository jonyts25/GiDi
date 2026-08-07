-- Estado de mensualidad a nivel paciente (p. ej. no integrado a terapia).
CREATE TYPE "MonthlyBillingStatus" AS ENUM ('NORMAL', 'NO_INTEGRADO');

ALTER TABLE "Patient" ADD COLUMN "monthlyBillingStatus" "MonthlyBillingStatus" NOT NULL DEFAULT 'NORMAL';
