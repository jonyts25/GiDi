import { FollowUpsService } from "./followups.service";
import { FollowUpAccessService } from "./followup-access.service";
import { PrismaService } from "../prisma.service";

const PATIENT_ID = "patient-1";
const AREA_INTERNAL = "area-internal";
const USER_ID = "author-1";

describe("FollowUpsService createOrGet internal note metadata", () => {
  it("setea lastNoteAt y lastNoteBy al crear COMUNICACION_INTERNA con texto", async () => {
    let createData: Record<string, unknown> | undefined;
    const prisma = {
      area: {
        findUnique: async () => ({
          id: AREA_INTERNAL,
          key: "COMUNICACION_INTERNA",
          trackingMode: "TEXT_ONLY",
        }),
      },
      followUp: {
        findFirst: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createData = data;
          return { id: "fu-new" };
        },
        findUnique: async () => ({
          id: "fu-new",
          area: { key: "COMUNICACION_INTERNA" },
        }),
      },
      followUpObjective: { createMany: async () => ({ count: 0 }) },
      patientTherapist: { upsert: jest.fn() },
      internalNoteRead: { upsert: jest.fn().mockResolvedValue({}) },
    } as unknown as PrismaService;

    const access = {
      assertCanEditPatientFollowUps: jest.fn(),
      assertRoleCanUseArea: jest.fn(),
      assertCanViewFollowUp: jest.fn(),
      isAdmin: jest.fn().mockReturnValue(true),
    } as unknown as FollowUpAccessService;

    const service = new FollowUpsService(prisma, access);

    await service.createOrGet(
      { sub: USER_ID, roles: ["ADMIN"] } as never,
      {
        patientId: PATIENT_ID,
        areaId: AREA_INTERNAL,
        periodYear: 2026,
        periodMonth: 10,
        generalNotes: "  Nota inicial  ",
        therapistId: "other-therapist",
      },
    );

    expect(createData?.lastNoteAt).toEqual(expect.any(Date));
    expect(createData?.lastNoteById).toBe(USER_ID);
  });
});
