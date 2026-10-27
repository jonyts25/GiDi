import { AdminPatientsService } from "../admin/admin-patients.service";
import { FollowUpsService } from "./followups.service";
import { FollowUpAccessService } from "./followup-access.service";
import { PrismaService } from "../prisma.service";
import { FollowUpsService as FollowUpsServiceDep } from "./followups.service";

const PATIENT_ID = "patient-1";
const THERAPIST_1 = "therapist-1";
const THERAPIST_2 = "therapist-2";
const AREA_ID = "area-grid";

function buildFollowUpsForGrid() {
  const deleteMany = jest.fn();
  const upsert = jest.fn().mockResolvedValue({});

  const prisma = {
    area: {
      findUnique: async () => ({
        id: AREA_ID,
        key: "MOTOR",
        trackingMode: "MONTHLY_GRID",
      }),
    },
    followUp: {
      findMany: async () => [],
      findFirst: async () => null,
      create: async () => ({ id: "fu-new" }),
      findUnique: async () => ({
        id: "fu-new",
        area: { key: "MOTOR" },
      }),
    },
    followUpObjective: { createMany: async () => ({ count: 0 }) },
    followUpProgram: { upsert: async () => ({ id: "prog-2" }) },
    patientTherapist: { upsert, deleteMany },
  } as unknown as PrismaService;

  const access = {
    assertCanEditPatientFollowUps: jest.fn(),
    assertRoleCanUseArea: jest.fn(),
    assertCanViewFollowUp: jest.fn(),
    isAdmin: jest.fn().mockReturnValue(false),
  } as unknown as FollowUpAccessService;

  const service = new FollowUpsService(prisma, access);
  return { service, upsert, deleteMany };
}

describe("Multi-therapist assignment", () => {
  it("assignTherapist hace upsert sin borrar otras asignaciones", async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const deleteMany = jest.fn();
    const prisma = {
      patient: { findUnique: async () => ({ id: PATIENT_ID }) },
      user: { findUnique: async () => ({ id: THERAPIST_2 }) },
      patientTherapist: { upsert, deleteMany },
    } as unknown as PrismaService;

    const followUps = {} as FollowUpsServiceDep;
    const service = new AdminPatientsService(prisma, followUps);

    await service.assignTherapist(PATIENT_ID, THERAPIST_2);

    expect(deleteMany).not.toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledWith({
      where: { patientId_therapistId: { patientId: PATIENT_ID, therapistId: THERAPIST_2 } },
      update: {},
      create: { patientId: PATIENT_ID, therapistId: THERAPIST_2 },
    });
  });

  it("createOrGet MONTHLY_GRID solo upserta al terapeuta activo", async () => {
    const { service, upsert, deleteMany } = buildFollowUpsForGrid();

    await service.createOrGet(
      { sub: THERAPIST_2, roles: ["THERAPIST"] } as never,
      {
        patientId: PATIENT_ID,
        areaId: AREA_ID,
        periodYear: 2026,
        periodMonth: 4,
        therapistId: THERAPIST_2,
      },
    );

    expect(deleteMany).not.toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { patientId: PATIENT_ID, therapistId: THERAPIST_2 },
      }),
    );
  });
});
