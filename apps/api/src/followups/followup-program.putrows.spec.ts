import { FollowUpProgramService } from "./followup-program.service";
import { FollowUpAccessService } from "./followup-access.service";
import { FollowUpsService } from "./followups.service";
import { PrismaService } from "../prisma.service";
import { AreaTrackingMode } from "@prisma/client";

const PROGRAM_ID = "11111111-1111-1111-1111-111111111111";
const AREA_ID = "22222222-2222-2222-2222-222222222222";

type StoredFu = {
  id: string;
  programId: string;
  areaId: string;
  patientId: string;
  therapistId: string;
  periodYear: number;
  periodMonth: number;
  createdAt: Date;
};

function buildPutRowsService() {
  const followUpsStore: StoredFu[] = [];
  let nextId = 1;
  let transactionChain = Promise.resolve();

  const program = {
    id: PROGRAM_ID,
    patientId: "patient-1",
    therapistId: "therapist-1",
    periodYear: 2026,
    periodMonth: 3,
    followUps: [] as StoredFu[],
  };

  const makeTx = () => ({
    $executeRaw: async () => undefined,
    followUpProgram: {
      findUnique: async () => ({
        ...program,
        followUps: followUpsStore.map((fu) => ({
          ...fu,
          area: { id: fu.areaId, name: "Motor", trackingMode: AreaTrackingMode.MONTHLY_GRID },
        })),
      }),
    },
    area: {
      findUnique: async () => ({
        id: AREA_ID,
        name: "Motor",
        trackingMode: AreaTrackingMode.MONTHLY_GRID,
      }),
    },
    followUp: {
      findMany: async (args: {
        where: { programId?: string; areaId?: string; id?: { in: string[] } };
        select?: { objectives?: unknown };
      }) => {
        let filtered = followUpsStore;
        if (args.where.programId) {
          filtered = filtered.filter((fu) => fu.programId === args.where.programId);
        }
        if (args.where.areaId) {
          filtered = filtered.filter((fu) => fu.areaId === args.where.areaId);
        }
        if (args.where.id?.in) {
          filtered = filtered.filter((fu) => args.where.id!.in.includes(fu.id));
        }
        if (args.select?.objectives) {
          return filtered.map((fu) => ({
            id: fu.id,
            createdAt: fu.createdAt,
            objectives: [] as { id: string }[],
          }));
        }
        return filtered.map((fu) => ({ id: fu.id }));
      },
      create: async ({ data }: { data: Omit<StoredFu, "id" | "createdAt"> }) => {
        const row: StoredFu = { ...data, id: `fu-${nextId++}`, createdAt: new Date() };
        followUpsStore.push(row);
        return row;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const idx = followUpsStore.findIndex((f) => f.id === where.id);
        if (idx >= 0) followUpsStore.splice(idx, 1);
      },
    },
    followUpMark: { count: async () => 0 },
    followUpObjective: { findMany: async () => [] },
    followUpSession: { createMany: async () => ({ count: 0 }) },
  });

  const prisma = {
    $transaction: (fn: (tx: ReturnType<typeof makeTx>) => Promise<void>) => {
      const run = transactionChain.then(() => fn(makeTx()));
      transactionChain = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
    followUpSession: {
      findMany: async () => [],
    },
  } as unknown as PrismaService;

  const access = {
    assertCanEditProgram: jest.fn(),
  } as unknown as FollowUpAccessService;

  const followUps = {
    replaceObjectivesWithMeta: jest.fn().mockResolvedValue(undefined),
  } as unknown as FollowUpsService;

  const service = new FollowUpProgramService(prisma, access, followUps);
  service.get = jest.fn().mockResolvedValue({ areas: [] });

  return { service, followUpsStore, followUps };
}

describe("FollowUpProgramService.putRows", () => {
  it("crea un solo FollowUp por área con dos llamadas concurrentes", async () => {
    const { service, followUpsStore } = buildPutRowsService();
    const rows = [{ areaId: AREA_ID, objectives: [{ text: "Obj 1" }] }];
    const user = { sub: "therapist-1", roles: ["THERAPIST"] };

    await Promise.all([
      service.putRows(user as never, PROGRAM_ID, rows),
      service.putRows(user as never, PROGRAM_ID, rows),
    ]);

    const forArea = followUpsStore.filter((f) => f.areaId === AREA_ID && f.programId === PROGRAM_ID);
    expect(forArea).toHaveLength(1);
  });
});
