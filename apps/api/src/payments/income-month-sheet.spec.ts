import { PaymentStatus } from "@prisma/client";
import { IncomeService } from "./income.service";
import { PrismaService } from "../prisma.service";

function dischargedPatient(sept2026: Date) {
  return {
    id: "p-discharged",
    firstName: "Baja",
    lastName: "Test",
    center: "SAN_AGUSTIN" as const,
    status: "DISCHARGED",
    billingNotes: null,
    monthlyBillingStatus: "NORMAL",
    therapyStartDate: new Date(Date.UTC(2020, 0, 1)),
    dischargedAt: sept2026,
  };
}

describe("IncomeService.monthSheet inactive payments", () => {
  function buildPrisma(paymentRow: {
    amountPaid: number;
    patient: ReturnType<typeof dischargedPatient>;
  }) {
    return {
      patient: {
        findMany: async () => [],
      },
      payment: {
        findMany: async () => [
          {
            patientId: paymentRow.patient.id,
            amountDue: 4000,
            amountPaid: paymentRow.amountPaid,
            status: PaymentStatus.PARCIAL,
            patient: paymentRow.patient,
          },
        ],
      },
      incomeEntry: {
        findMany: async (args: { where: { patientId?: { in: string[] } } }) => {
          const ids = args.where.patientId?.in ?? [];
          if (ids.includes("p-discharged-with-entry")) {
            return [{ patientId: "p-discharged-with-entry", receivedAt: new Date(), amount: 100, method: "EFECTIVO" }];
          }
          return [];
        },
      },
    } as unknown as PrismaService;
  }

  async function sheetWith(prisma: PrismaService) {
    const income = new IncomeService(prisma);
    jest.spyOn(income, "ensureMonthRows").mockResolvedValue(undefined);
    jest
      .spyOn(income as unknown as { priorPeriodDebtByPatient: Function }, "priorPeriodDebtByPatient")
      .mockResolvedValue({ debtCarriedOver: new Map() });
    return income.monthSheet(2026, 10);
  }

  it("octubre: baja en septiembre con amountPaid > 0 sigue en la hoja", async () => {
    const patient = dischargedPatient(new Date(Date.UTC(2026, 8, 1)));
    const result = await sheetWith(
      buildPrisma({ amountPaid: 2500, patient }),
    );
    expect(result.rows.some((r) => r.patientId === "p-discharged")).toBe(true);
  });

  it("octubre: baja en septiembre sin pago ni ingreso no aparece", async () => {
    const patient = dischargedPatient(new Date(Date.UTC(2026, 8, 1)));
    const result = await sheetWith(
      buildPrisma({ amountPaid: 0, patient }),
    );
    expect(result.rows.some((r) => r.patientId === "p-discharged")).toBe(false);
  });

  it("octubre: baja en septiembre con IncomeEntry del mes sí aparece", async () => {
    const patient = {
      ...dischargedPatient(new Date(Date.UTC(2026, 8, 1))),
      id: "p-discharged-with-entry",
    };
    const prisma = buildPrisma({ amountPaid: 0, patient });
    const result = await sheetWith(prisma);
    expect(result.rows.some((r) => r.patientId === "p-discharged-with-entry")).toBe(true);
  });
});
