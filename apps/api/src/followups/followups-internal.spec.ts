import { ForbiddenException } from "@nestjs/common";
import { FollowUpsService } from "./followups.service";
import { FollowUpAccessService } from "./followup-access.service";
import { PrismaService } from "../prisma.service";
import { AuthUser } from "../auth/auth-user";

const INTERNAL_AREA_ID = "area-internal";
const INTERNAL_FU_ID = "fu-internal";
const PATIENT_ID = "patient-1";

function makeAccessMock(overrides: Partial<FollowUpAccessService> = {}) {
  return {
    assertCanViewPatient: jest.fn(),
    assertCanViewFollowUp: jest.fn(),
    assertCanEditPatientFollowUps: jest.fn(),
    assertCanEditFollowUp: jest.fn(),
    assertRoleCanUseArea: jest.fn(),
    isAdmin: jest.fn().mockReturnValue(false),
    isOfficeStaff: jest.fn().mockReturnValue(false),
    ...overrides,
  } as unknown as FollowUpAccessService;
}

function buildService(prisma: PrismaService, access: FollowUpAccessService) {
  return new FollowUpsService(prisma, access);
}

describe("FollowUpsService internal-only areas", () => {
  const internalFollowUp = {
    id: INTERNAL_FU_ID,
    patientId: PATIENT_ID,
    therapistId: "therapist-1",
    status: "DRAFT",
    periodYear: 2026,
    periodMonth: 9,
    generalGoal: null,
    generalNotes: "Nota interna",
    homeWork: null,
    parentComments: null,
    observationsAuthor: null,
    visibleToParent: true,
    visibleToTherapist: true,
    visibleToSchool: true,
    area: {
      id: INTERNAL_AREA_ID,
      key: "COMUNICACION_INTERNA",
      name: "Comunicación interna",
      category: "Gestión",
      trackingMode: "TEXT_ONLY",
    },
    patient: { id: PATIENT_ID, firstName: "Ana", lastName: "Pérez" },
    therapist: { id: "therapist-1", fullName: "Terapeuta", email: "t@test.com", status: "ACTIVE" },
    objectives: [],
    sessions: [],
    attachments: [],
    metrics: [],
  };

  it("fuerza privacidad al crear aunque el cliente pida visibleToParent", async () => {
    let createdVisibility: Record<string, boolean> | undefined;
    const prisma = {
      area: {
        findUnique: async () => ({
          id: INTERNAL_AREA_ID,
          key: "COMUNICACION_INTERNA",
          trackingMode: "TEXT_ONLY",
        }),
      },
      followUp: {
        findFirst: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createdVisibility = {
            visibleToParent: data.visibleToParent as boolean,
            visibleToSchool: data.visibleToSchool as boolean,
            visibleToTherapist: data.visibleToTherapist as boolean,
          };
          return { id: INTERNAL_FU_ID };
        },
        findUnique: async () => internalFollowUp,
      },
      followUpObjective: { createMany: async () => ({ count: 0 }) },
    } as unknown as PrismaService;

    const access = makeAccessMock();
    const service = buildService(prisma, access);

    await service.createOrGet(
      { sub: "therapist-1", roles: ["THERAPIST"] } as AuthUser,
      {
        patientId: PATIENT_ID,
        areaId: INTERNAL_AREA_ID,
        periodYear: 2026,
        periodMonth: 9,
        therapistId: "therapist-1",
      },
    );

    expect(createdVisibility).toEqual({
      visibleToParent: false,
      visibleToSchool: false,
      visibleToTherapist: true,
    });
  });

  it("fuerza privacidad al actualizar ignorando visibleToParent del cliente", async () => {
    let updatedVisibility: Record<string, boolean> | undefined;
    const prisma = {
      followUp: {
        update: async ({ data }: { data: Record<string, boolean> }) => {
          updatedVisibility = data;
          return internalFollowUp;
        },
        findUnique: async () => internalFollowUp,
      },
    } as unknown as PrismaService;

    const access = makeAccessMock({
      getFollowUpForAccess: jest.fn().mockResolvedValue({
        id: INTERNAL_FU_ID,
        patientId: PATIENT_ID,
        therapistId: "therapist-1",
        status: "DRAFT",
        area: { key: "COMUNICACION_INTERNA", trackingMode: "TEXT_ONLY" },
      }),
    });

    const service = buildService(prisma, access);
    await service.update(
      { sub: "admin-1", roles: ["ADMIN"] } as AuthUser,
      INTERNAL_FU_ID,
      { visibleToParent: true, visibleToSchool: true, visibleToTherapist: false },
    );

    expect(updatedVisibility).toEqual({
      visibleToParent: false,
      visibleToSchool: false,
      visibleToTherapist: true,
    });
  });

  it("excluye seguimientos internos de getParentSummary", async () => {
    const prisma = {
      followUp: {
        findMany: async ({ where }: { where: { area?: { key: { notIn: string[] } } } }) => {
          expect(where.area?.key.notIn).toContain("COMUNICACION_INTERNA");
          return [];
        },
      },
      patient: {
        findUnique: async () => ({ id: PATIENT_ID, firstName: "Ana", lastName: "Pérez" }),
      },
    } as unknown as PrismaService;

    const access = makeAccessMock();
    const service = buildService(prisma, access);

    const summary = await service.getParentSummary(
      { sub: "parent-1", roles: ["PARENT"] } as AuthUser,
      PATIENT_ID,
      2026,
      9,
    );

    expect(summary.followUps).toEqual([]);
  });

  it("excluye seguimientos internos del expediente integral", async () => {
    const prisma = {
      patient: {
        findUnique: async () => ({
          id: PATIENT_ID,
          firstName: "Ana",
          lastName: "Pérez",
          birthDate: null,
          notes: null,
        }),
      },
      followUp: {
        findMany: async ({ where }: { where: { area?: { key: { notIn: string[] } } } }) => {
          expect(where.area?.key.notIn).toContain("COMUNICACION_INTERNA");
          return [];
        },
      },
      patientDocument: { findMany: async () => [] },
    } as unknown as PrismaService;

    const service = buildService(prisma, makeAccessMock());
    const dossier = await service.buildPatientDossier(PATIENT_ID);
    expect(dossier.totalFollowUps).toBe(0);
  });

  it("omite seguimientos internos en bulk-report", async () => {
    const prisma = {
      followUp: {
        findUnique: async ({ where }: { where: { id: string } }) => {
          if (where.id === INTERNAL_FU_ID) {
            return { area: { key: "COMUNICACION_INTERNA" } };
          }
          return { area: { key: "LECTURA" } };
        },
      },
    } as unknown as PrismaService;

    const access = makeAccessMock();
    const service = buildService(prisma, access);
    jest.spyOn(service, "get").mockResolvedValue({
      ...internalFollowUp,
      area: { ...internalFollowUp.area, key: "LECTURA", name: "Lectura" },
    } as never);

    const result = await service.getBulkReport(
      { sub: "admin-1", roles: ["ADMIN"] } as AuthUser,
      [INTERNAL_FU_ID, "fu-public"],
    );

    expect(result.reports).toHaveLength(1);
    expect(service.get).toHaveBeenCalledTimes(1);
    expect(service.get).toHaveBeenCalledWith({ sub: "admin-1", roles: ["ADMIN"] }, "fu-public");
  });

  it("devuelve 403 a PARENT en GET de seguimiento interno", async () => {
    const prisma = {
      followUp: {
        findUnique: async () => internalFollowUp,
      },
    } as unknown as PrismaService;

    const access = makeAccessMock();
    const service = buildService(prisma, access);

    await expect(
      service.get({ sub: "parent-1", roles: ["PARENT"] } as AuthUser, INTERNAL_FU_ID),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
