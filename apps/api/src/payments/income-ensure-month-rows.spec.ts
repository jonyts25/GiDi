import { PaymentStatus } from "@prisma/client";
import { IncomeService } from "./income.service";
import { PrismaService } from "../prisma.service";

function buildService(prisma: PrismaService) {
  return new IncomeService(prisma);
}

describe("IncomeService.ensureMonthRows", () => {
  const activePatient = {
    id: "p1",
    sessionsPerWeek: 2,
    discountPercent: 0,
    agreedMonthlyAmount: null,
    status: "ACTIVE",
    dischargedAt: null,
  };

  it("crea octubre con 4130 cuando septiembre tenía 4130", async () => {
    let created: unknown[] = [];
    const prisma = {
      patient: {
        findMany: async () => [activePatient],
      },
      payment: {
        findMany: async (args: { where: { periodYear?: number; periodMonth?: number } }) => {
          if (args.where.periodYear === 2026 && args.where.periodMonth === 10) {
            return [];
          }
          return [
            {
              patientId: "p1",
              periodYear: 2026,
              periodMonth: 9,
              amountDue: 4130,
              status: PaymentStatus.PAGADO,
            },
          ];
        },
        createMany: async ({ data }: { data: unknown[] }) => {
          created = data;
          return { count: data.length };
        },
      },
    } as unknown as PrismaService;

    await buildService(prisma).ensureMonthRows(2026, 10);

    expect(created).toEqual([
      expect.objectContaining({
        patientId: "p1",
        periodYear: 2026,
        periodMonth: 10,
        amountDue: 4130,
        status: PaymentStatus.PENDIENTE,
      }),
    ]);
  });

  it("crea octubre con 2150 cuando septiembre fue pausa y agosto 2150", async () => {
    let created: unknown[] = [];
    const prisma = {
      patient: {
        findMany: async () => [activePatient],
      },
      payment: {
        findMany: async (args: { where: { periodYear?: number; periodMonth?: number } }) => {
          if (args.where.periodYear === 2026 && args.where.periodMonth === 10) {
            return [];
          }
          return [
            {
              patientId: "p1",
              periodYear: 2026,
              periodMonth: 9,
              amountDue: 0,
              status: PaymentStatus.PAUSA_VACACIONES,
            },
            {
              patientId: "p1",
              periodYear: 2026,
              periodMonth: 8,
              amountDue: 2150,
              status: PaymentStatus.PAGADO,
            },
          ];
        },
        createMany: async ({ data }: { data: unknown[] }) => {
          created = data;
          return { count: data.length };
        },
      },
    } as unknown as PrismaService;

    await buildService(prisma).ensureMonthRows(2026, 10);

    expect(created).toEqual([expect.objectContaining({ amountDue: 2150 })]);
  });

  it("crea octubre con 1500 cuando hay mensualidad acordada aunque septiembre tenía 2150", async () => {
    let created: unknown[] = [];
    const prisma = {
      patient: {
        findMany: async () => [
          { ...activePatient, sessionsPerWeek: 1, discountPercent: 30, agreedMonthlyAmount: 1500 },
        ],
      },
      payment: {
        findMany: async (args: { where: { periodYear?: number; periodMonth?: number } }) => {
          if (args.where.periodYear === 2026 && args.where.periodMonth === 10) {
            return [];
          }
          return [
            {
              patientId: "p1",
              periodYear: 2026,
              periodMonth: 9,
              amountDue: 2150,
              status: PaymentStatus.PAGADO,
            },
          ];
        },
        createMany: async ({ data }: { data: unknown[] }) => {
          created = data;
          return { count: data.length };
        },
      },
    } as unknown as PrismaService;

    await buildService(prisma).ensureMonthRows(2026, 10);

    expect(created).toEqual([expect.objectContaining({ amountDue: 1500 })]);
  });

  it("usa tarifa sugerida sin historial (2 sesiones → 4130)", async () => {
    let created: unknown[] = [];
    const prisma = {
      patient: {
        findMany: async () => [activePatient],
      },
      payment: {
        findMany: async () => [],
        createMany: async ({ data }: { data: unknown[] }) => {
          created = data;
          return { count: data.length };
        },
      },
    } as unknown as PrismaService;

    await buildService(prisma).ensureMonthRows(2026, 10);

    expect(created).toEqual([expect.objectContaining({ amountDue: 4130 })]);
  });

  it("no modifica un Payment de octubre ya existente", async () => {
    const createMany = jest.fn();
    const prisma = {
      patient: {
        findMany: async () => [activePatient],
      },
      payment: {
        findMany: async (args: { where: { periodYear?: number; periodMonth?: number } }) => {
          if (args.where.periodYear === 2026 && args.where.periodMonth === 10) {
            return [{ patientId: "p1" }];
          }
          return [];
        },
        createMany,
      },
    } as unknown as PrismaService;

    await buildService(prisma).ensureMonthRows(2026, 10);

    expect(createMany).not.toHaveBeenCalled();
  });

  it("no genera registro para pacientes NO_INTEGRADO", async () => {
    const createMany = jest.fn();
    const prisma = {
      patient: {
        findMany: async () => [],
      },
      payment: {
        findMany: async () => [],
        createMany,
      },
    } as unknown as PrismaService;

    await buildService(prisma).ensureMonthRows(2026, 10);

    expect(createMany).not.toHaveBeenCalled();
  });

  it("no genera filas para meses futuros", async () => {
    const createMany = jest.fn();
    const prisma = {
      patient: { findMany: jest.fn() },
      payment: { findMany: jest.fn(), createMany },
    } as unknown as PrismaService;

    const futureYear = new Date().getFullYear() + 1;
    await buildService(prisma).ensureMonthRows(futureYear, 12);

    expect(prisma.patient.findMany).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });
});
