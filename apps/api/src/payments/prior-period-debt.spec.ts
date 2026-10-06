import { PaymentStatus } from "@prisma/client";
import { IncomeService } from "./income.service";
import { PaymentsService } from "./payments.service";
import { PrismaService } from "../prisma.service";
import { IncomeService as IncomeServiceType } from "./income.service";

describe("priorPeriodDebtByPatient", () => {
  it("aplica corte desde agosto 2026 en el where de Prisma", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { payment: { findMany } } as unknown as PrismaService;
    const income = new IncomeService(prisma);

    await (income as unknown as { priorPeriodDebtByPatient: Function }).priorPeriodDebtByPatient(
      2026,
      10,
      ["p1"],
    );

    expect(findMany).toHaveBeenCalledWith({
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
      select: { patientId: true, amountDue: true, amountPaid: true },
    });
  });

  it("marzo 4130 + septiembre 2000 → deuda arrastrada 2000 en octubre", async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        patientId: "p1",
        amountDue: 2000,
        amountPaid: 0,
      },
    ]);
    const prisma = { payment: { findMany } } as unknown as PrismaService;
    const income = new IncomeService(prisma);

    const { debtCarriedOver } = await (
      income as unknown as { priorPeriodDebtByPatient: Function }
    ).priorPeriodDebtByPatient(2026, 10, ["p1"]);

    expect(debtCarriedOver.get("p1")).toBe(2000);
  });

  it("deuda solo antes de agosto → deuda arrastrada 0", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { payment: { findMany } } as unknown as PrismaService;
    const income = new IncomeService(prisma);

    const { debtCarriedOver } = await (
      income as unknown as { priorPeriodDebtByPatient: Function }
    ).priorPeriodDebtByPatient(2026, 10, ["p2"]);

    expect(debtCarriedOver.get("p2") ?? 0).toBe(0);
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

    const view = await payments.getPatientView({
      sub: "admin",
      roles: ["ADMIN"],
      email: "admin@test.com",
    }, "p1");

    expect(view.totals.outstanding).toBe(2000);
  });
});
