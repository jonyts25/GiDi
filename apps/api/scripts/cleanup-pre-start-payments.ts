/**
 * Elimina Payments de periodos anteriores al ingreso a terapia (solo filas vacías).
 * Uso:
 *   npx ts-node -r tsconfig-paths/register scripts/cleanup-pre-start-payments.ts
 *   npx ts-node -r tsconfig-paths/register scripts/cleanup-pre-start-payments.ts --apply
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { isBeforeTherapyStart } from "../src/payments/payment-period";

function parseArgs(argv: string[]) {
  const apply = argv.includes("--apply");
  return { dryRun: !apply };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL");
    process.exit(1);
  }

  const { dryRun } = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  try {
    const patients = await prisma.patient.findMany({
      where: { therapyStartDate: { not: null } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        therapyStartDate: true,
      },
    });

    let listed = 0;
    let deleted = 0;

    for (const patient of patients) {
      const start = patient.therapyStartDate!;

      const candidates = await prisma.payment.findMany({
        where: {
          patientId: patient.id,
          amountPaid: 0,
          OR: [
            { periodYear: { lt: start.getUTCFullYear() } },
            {
              periodYear: start.getUTCFullYear(),
              periodMonth: { lt: start.getUTCMonth() + 1 },
            },
          ],
        },
        select: {
          id: true,
          periodYear: true,
          periodMonth: true,
          amountDue: true,
        },
      });

      for (const pay of candidates) {
        if (!isBeforeTherapyStart(patient, pay.periodYear, pay.periodMonth)) continue;

        const income = await prisma.incomeEntry.findFirst({
          where: {
            patientId: patient.id,
            periodYear: pay.periodYear,
            periodMonth: pay.periodMonth,
          },
          select: { id: true },
        });
        if (income) continue;

        listed += 1;
        const label = `${patient.lastName}, ${patient.firstName}`.trim();
        console.log(
          `${dryRun ? "[dry-run]" : "[delete]"} ${label} | ${pay.periodYear}-${String(pay.periodMonth).padStart(2, "0")} | amountDue=${pay.amountDue}`,
        );

        if (!dryRun) {
          await prisma.payment.delete({ where: { id: pay.id } });
          deleted += 1;
        }
      }
    }

    if (dryRun) {
      console.log(`\nTotal filas candidatas: ${listed}. Ejecute con --apply para borrar.`);
    } else {
      console.log(`\nPayments eliminados: ${deleted}.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
