import { PaymentStatus } from "@prisma/client";
import { IncomeService } from "./income.service";
import { PaymentsService } from "./payments.service";
import { PrismaService } from "../prisma.service";

const therapyStartNov2026 = new Date(Date.UTC(2026, 10, 1));

describe("therapy start date billing", () => {
  it("ensureMonthRows no crea fila en agosto si inicia en noviembre", async () => {
    const createMany = jest.fn();
    const prisma = {
      patient: {
        findMany: async () => [
          {
            id: "p1",
            sessionsPerWeek: 2,
            discountPercent: 0,
            agreedMonthlyAmount: null,
            status: "ACTIVE",
            dischargedAt: null,
            therapyStartDate: therapyStartNov2026,
          },
        ],
      },
      payment: {
        findMany: async () => [],
        createMany,
      },
    } as unknown as PrismaService;

    await new IncomeService(prisma).ensureMonthRows(2026, 8);

    expect(createMany).not.toHaveBeenCalled();
  });

  it("priorPeriodDebtByPatient ignora deuda anterior al inicio", async () => {
    const findManyPayment = jest.fn().mockResolvedValue([
      {
        patientId: "p1",
        periodYear: 2026,
        periodMonth: 8,
        amountDue: 4000,
        amountPaid: 0,
      },
    ]);
    const prisma = {
      patient: {
        findMany: async () => [{ id: "p1", therapyStartDate: therapyStartNov2026 }],
      },
      payment: { findMany: findManyPayment },
    } as unknown as PrismaService;
    const income = new IncomeService(prisma);

    const { debtCarriedOver } = await (
      income as unknown as { priorPeriodDebtByPatient: Function }
    ).priorPeriodDebtByPatient(2026, 11, ["p1"]);

    expect(debtCarriedOver.get("p1") ?? 0).toBe(0);
  });

  it("exportRows conserva pago con amountPaid antes del inicio", async () => {
    const prisma = {
      payment: {
        findMany: async () => [
          {
            patientId: "p1",
            periodYear: 2026,
            periodMonth: 8,
            amountDue: 4000,
            amountPaid: 3500,
            status: PaymentStatus.PARCIAL,
            paidAt: new Date(),
            method: "TRANSFERENCIA",
            reference: null,
            notes: null,
            patient: {
              firstName: "Ana",
              lastName: "Test",
              center: "SAN_AGUSTIN",
              status: "ACTIVE",
              dischargedAt: null,
              monthlyBillingStatus: "NORMAL",
              therapyStartDate: therapyStartNov2026,
            },
          },
        ],
      },
      incomeEntry: { findMany: async () => [] },
    } as unknown as PrismaService;

    const income = { ensureMonthRows: jest.fn() } as unknown as import("./income.service").IncomeService;
    const rows = await new PaymentsService(prisma, income).exportRows({
      year: 2026,
      month: 8,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].monto_pagado).toBe(3500);
  });
});
