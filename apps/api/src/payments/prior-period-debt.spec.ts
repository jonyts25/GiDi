import { PaymentStatus } from "@prisma/client";
import { IncomeService } from "./income.service";
import { PaymentsService } from "./payments.service";
import { PrismaService } from "../prisma.service";
import { IncomeService as IncomeServiceType } from "./income.service";

function prismaWithTherapyDates(
  patientRows: { id: string; fechaInicioTerapia: Date }[],
): { patient: { findMany: jest.Mock }; payment: { findMany: jest.Mock } } {
  return {
    patient: {
      findMany: jest.fn().mockImplementation((args: { where?: { id?: { in?: string[] } } }) => {
        const ids = args.where?.id?.in ?? [];
        return Promise.resolve(patientRows.filter((p) => ids.includes(p.id)));
      }),
    },
    payment: { findMany: jest.fn() },
  };
}

describe("priorPeriodDebtByPatient (IncomeService)", () => {
  it("aplica corte desde agosto 2026 en el where de Prisma", async () => {
    const patientRows = [{ id: "p1", fechaInicioTerapia: new Date("2020-01-01") }];
    const prisma = prismaWithTherapyDates(patientRows) as unknown as PrismaService;
    prisma.payment.findMany = jest.fn().mockResolvedValue([]);
    const income = new IncomeService(prisma);

    await (income as unknown as { priorPeriodDebtByPatient: Function }).priorPeriodDebtByPatient(
      2026,
      10,
      ["p1"],
    );

    expect(prisma.payment.findMany).toHaveBeenCalledWith({
      where: {
        patientId: { in: ["p1"] },
        status: { not: PaymentStatus.PAUSA_VACACIONES },
        AND: [
          {
            OR: [
              { periodYear: { lt: 2026 } },
              { periodYear: 2026, periodMonth: { lt: 10 } },
            ],
          },
          {
            OR: [
              { periodYear: { gt: 2026 } },
              { periodYear: 2026, periodMonth: { gte: 8 } },
            ],
          },
        ],
      },
      select: {
        patientId: true,
        periodYear: true,
        periodMonth: true,
        amountDue: true,
        amountPaid: true,
      },
    });
  });

  it("marzo 4130 + septiembre 2000 → deuda arrastrada 2000 en octubre", async () => {
    const patientRows = [{ id: "p1", fechaInicioTerapia: new Date("2020-01-01") }];
    const prisma = prismaWithTherapyDates(patientRows) as unknown as PrismaService;
    prisma.payment.findMany = jest
      .fn()
      .mockResolvedValue([
        {
          patientId: "p1",
          periodYear: 2026,
          periodMonth: 9,
          amountDue: 2000,
          amountPaid: 0,
        },
      ]);
    const income = new IncomeService(prisma);

    const { debtCarriedOver } = await (
      income as unknown as { priorPeriodDebtByPatient: Function }
    ).priorPeriodDebtByPatient(2026, 10, ["p1"]);

    expect(debtCarriedOver.get("p1")).toBe(2000);
  });

  it("deuda solo antes de agosto → deuda arrastrada 0", async () => {
    const patientRows = [{ id: "p2", fechaInicioTerapia: new Date("2020-01-01") }];
    const prisma = prismaWithTherapyDates(patientRows) as unknown as PrismaService;
    prisma.payment.findMany = jest.fn().mockResolvedValue([]);
    const income = new IncomeService(prisma);

    const { debtCarriedOver } = await (
      income as unknown as { priorPeriodDebtByPatient: Function }
    ).priorPeriodDebtByPatient(2026, 10, ["p2"]);

    expect(debtCarriedOver.get("p2") ?? 0).toBe(0);
  });
});

describe("priorPeriodDebtByPatient (PaymentsService)", () => {
  it("paciente nuevo en noviembre: no arrastra adeudo de octubre ni anterior", async () => {
    const therapyStart = new Date("2026-11-15T12:00:00.000Z");
    const patientRows = [{ id: "p-new", fechaInicioTerapia: therapyStart }];
    const prisma = prismaWithTherapyDates(patientRows) as unknown as PrismaService;
    prisma.payment.findMany = jest.fn().mockResolvedValue([
      {
        patientId: "p-new",
        periodYear: 2026,
        periodMonth: 10,
        amountDue: 4130,
        amountPaid: 0,
        status: PaymentStatus.DEUDA,
      },
    ]);
    const income = {} as IncomeService;
    const svc = new PaymentsService(prisma, income);

    const { debtCarriedOver } = await (
      svc as unknown as { priorPeriodDebtByPatient: Function }
    ).priorPeriodDebtByPatient(2026, 11, ["p-new"]);

    expect(debtCarriedOver.get("p-new") ?? 0).toBe(0);
  });
});

describe("PaymentsService.getPatientView outstanding", () => {
  it("excluye saldos de meses anteriores a agosto 2026", async () => {
    const prisma = {
      patient: {
        findUnique: async () => ({
          id: "p1",
          firstName: "Ana",
          lastName: "Test",
          center: "SAN_AGUSTIN",
          sessionsPerWeek: 2,
          discountPercent: 0,
          agreedMonthlyAmount: null,
          monthlyBillingStatus: "NORMAL",
          fechaInicioTerapia: new Date("2020-01-01T00:00:00.000Z"),
        }),
      },
      payment: {
        findMany: async () => [
          {
            id: "m1",
            periodYear: 2026,
            periodMonth: 3,
            amountDue: 4130,
            amountPaid: 0,
            status: PaymentStatus.DEUDA,
            paidAt: null,
            method: null,
            reference: null,
            notes: null,
            receiptName: null,
            receiptUploadedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "m2",
            periodYear: 2026,
            periodMonth: 9,
            amountDue: 2000,
            amountPaid: 0,
            status: PaymentStatus.DEUDA,
            paidAt: null,
            method: null,
            reference: null,
            notes: null,
            receiptName: null,
            receiptUploadedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      },
      incomeEntry: {
        findMany: async () => [],
      },
      parentPatient: {
        findFirst: async () => null,
      },
    } as unknown as PrismaService;

    const income = { ensureMonthRows: async () => undefined } as unknown as IncomeServiceType;
    const payments = new PaymentsService(prisma, income);

    const view = await payments.getPatientView(
      {
        sub: "admin",
        roles: ["ADMIN"],
        email: "admin@test.com",
      },
      "p1",
    );

    expect(view.totals.outstanding).toBe(2000);
  });
});
