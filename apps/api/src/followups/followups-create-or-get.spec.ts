import { FollowUpsService } from "./followups.service";
import { FollowUpAccessService } from "./followup-access.service";
import { PrismaService } from "../prisma.service";

const PROGRAM_ID = "prog-1";
const EXISTING_FU_ID = "fu-existing";
const AREA_ID = "area-grid";
const PATIENT_ID = "patient-1";

function buildFullFollowUp(trackingMode: "MONTHLY_GRID" | "TEXT_ONLY") {
  return {
    id: EXISTING_FU_ID,
    patientId: PATIENT_ID,
    therapistId: "therapist-1",
    status: "DRAFT",
    periodYear: 2026,
    periodMonth: 3,
    generalGoal: null,
    generalNotes: null,
    homeWork: null,
    parentComments: null,
    observationsAuthor: null,
    visibleToParent: trackingMode === "TEXT_ONLY" ? false : true,
    visibleToTherapist: true,
    visibleToSchool: false,
    area: {
      id: AREA_ID,
      key: trackingMode === "TEXT_ONLY" ? "COMUNICACION_INTERNA" : "MOTOR",
      name: "Área",
      category: null,
      trackingMode,
    },
    patient: { id: PATIENT_ID, firstName: "A", lastName: "B" },
    therapist: { id: "therapist-1", fullName: "T", email: "t@test.com", status: "ACTIVE" },
    objectives: [],
    sessions: [],
    attachments: [],
    metrics: [],
  };
}

function buildCreateOrGetService(opts: {
  trackingMode: "MONTHLY_GRID" | "TEXT_ONLY";
  existingProgramFollowUp?: boolean;
  existingTextOnly?: boolean;
}) {
  let createCalled = false;

  const prisma = {
    area: {
      findUnique: async () => ({
        id: AREA_ID,
        key: opts.trackingMode === "TEXT_ONLY" ? "COMUNICACION_INTERNA" : "MOTOR",
        trackingMode: opts.trackingMode,
      }),
    },
    followUp: {
      findMany: async ({ where }: { where: { programId?: string; areaId?: string } }) => {
        if (opts.existingProgramFollowUp && where.programId === PROGRAM_ID && where.areaId === AREA_ID) {
          return [{ id: EXISTING_FU_ID, createdAt: new Date("2026-03-01"), objectives: [] }];
        }
        return [];
      },
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        if (
          opts.existingTextOnly &&
          where.patientId === PATIENT_ID &&
          where.areaId === AREA_ID &&
          where.periodYear === 2026 &&
          where.periodMonth === 3
        ) {
          return { id: EXISTING_FU_ID };
        }
        return null;
      },
      create: async () => {
        createCalled = true;
        return { id: "fu-new" };
      },
      findUnique: async () => buildFullFollowUp(opts.trackingMode),
    },
    followUpObjective: { createMany: async () => ({ count: 0 }) },
    followUpMark: { count: async () => 0 },
    followUpProgram: {
      upsert: async () => ({ id: PROGRAM_ID }),
    },
    patientTherapist: {
      upsert: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn(),
    },
    internalNoteRead: { upsert: jest.fn().mockResolvedValue({}) },
  } as unknown as PrismaService;

  const access = {
    assertCanEditPatientFollowUps: jest.fn(),
    assertRoleCanUseArea: jest.fn(),
    assertCanViewFollowUp: jest.fn(),
    isAdmin: jest.fn().mockReturnValue(false),
  } as unknown as FollowUpAccessService;

  const service = new FollowUpsService(prisma, access);
  return { service, wasCreated: () => createCalled };
}

describe("FollowUpsService.createOrGet deduplication", () => {
  it("devuelve el FollowUp existente en la programación (MONTHLY_GRID)", async () => {
    const { service, wasCreated } = buildCreateOrGetService({
      trackingMode: "MONTHLY_GRID",
      existingProgramFollowUp: true,
    });

    const result = await service.createOrGet(
      { sub: "therapist-1", roles: ["THERAPIST"] } as never,
      {
        patientId: PATIENT_ID,
        areaId: AREA_ID,
        periodYear: 2026,
        periodMonth: 3,
        therapistId: "therapist-1",
      },
    );

    expect(result.id).toBe(EXISTING_FU_ID);
    expect(wasCreated()).toBe(false);
  });

  it("devuelve el FollowUp TEXT_ONLY existente del mismo mes", async () => {
    const { service, wasCreated } = buildCreateOrGetService({
      trackingMode: "TEXT_ONLY",
      existingTextOnly: true,
    });

    const result = await service.createOrGet(
      { sub: "therapist-1", roles: ["THERAPIST"] } as never,
      {
        patientId: PATIENT_ID,
        areaId: AREA_ID,
        periodYear: 2026,
        periodMonth: 3,
        therapistId: "therapist-1",
      },
    );

    expect(result.id).toBe(EXISTING_FU_ID);
    expect(wasCreated()).toBe(false);
  });
});
