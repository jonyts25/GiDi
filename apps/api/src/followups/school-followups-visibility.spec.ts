import { ForbiddenException } from "@nestjs/common";
import { FollowUpsService } from "./followups.service";
import { FollowUpAccessService } from "./followup-access.service";
import { PrismaService } from "../prisma.service";
import { AuthUser } from "../auth/auth-user";
import { canRoleUseArea } from "../areas/area-permissions";

const FU_ID = "fu-1";
const PATIENT_ID = "patient-1";

function makeFollowUp(overrides: Record<string, unknown> = {}) {
  return {
    id: FU_ID,
    patientId: PATIENT_ID,
    therapistId: "therapist-1",
    status: "CLOSED",
    periodYear: 2026,
    periodMonth: 10,
    generalGoal: null,
    generalNotes: "Observaciones",
    homeWork: null,
    parentComments: null,
    observationsAuthor: null,
    visibleToParent: true,
    visibleToTherapist: true,
    visibleToSchool: true,
    area: { id: "area-1", key: "LECTURA", name: "Lectura", category: "T", trackingMode: "MONTHLY_GRID" },
    patient: { id: PATIENT_ID, firstName: "Ana", lastName: "Pérez" },
    therapist: { id: "therapist-1", fullName: "T", email: "t@test.com", status: "ACTIVE" },
    objectives: [],
    sessions: [],
    attachments: [],
    metrics: [],
    ...overrides,
  };
}

function makeAccess(isAdmin = false) {
  return {
    assertCanViewFollowUp: jest.fn(),
    assertCanEditFollowUp: jest.fn(),
    isAdmin: jest.fn().mockReturnValue(isAdmin),
    getFollowUpForAccess: jest.fn().mockResolvedValue({
      id: FU_ID,
      patientId: PATIENT_ID,
      therapistId: "therapist-1",
      status: "DRAFT",
      generalNotes: null,
      area: { key: "LECTURA", trackingMode: "MONTHLY_GRID" },
    }),
  } as unknown as FollowUpAccessService;
}

function prismaReturning(fu: ReturnType<typeof makeFollowUp>, onUpdate?: (data: unknown) => void) {
  return {
    followUp: {
      findUnique: async () => fu,
      update: async ({ data }: { data: unknown }) => {
        onUpdate?.(data);
        return fu;
      },
    },
  } as unknown as PrismaService;
}

const school = { sub: "school-1", roles: ["SCHOOL"] } as AuthUser;
const parent = { sub: "parent-1", roles: ["PARENT"] } as AuthUser;

describe("Perfil de colegio: áreas permitidas", () => {
  it("solo puede generar Seguimiento escolar", () => {
    expect(canRoleUseArea(["SCHOOL"], "SEGUIMIENTO_ESCOLAR", "TEXT_ONLY")).toBe(true);
    expect(canRoleUseArea(["SCHOOL"], "FAMILIAR", "TEXT_ONLY")).toBe(false);
    expect(canRoleUseArea(["SCHOOL"], "LECTURA", "MONTHLY_GRID")).toBe(false);
  });
});

describe("Visibilidad de seguimientos para papás / colegio", () => {
  it("colegio ve un seguimiento publicado visible para escuela", async () => {
    const svc = new FollowUpsService(prismaReturning(makeFollowUp()), makeAccess());
    await expect(svc.get(school, FU_ID)).resolves.toMatchObject({ id: FU_ID });
  });

  it("colegio no ve un seguimiento oculto para escuela", async () => {
    const svc = new FollowUpsService(
      prismaReturning(makeFollowUp({ visibleToSchool: false })),
      makeAccess(),
    );
    await expect(svc.get(school, FU_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("papá no ve borradores ajenos", async () => {
    const svc = new FollowUpsService(prismaReturning(makeFollowUp({ status: "DRAFT" })), makeAccess());
    await expect(svc.get(parent, FU_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("colegio ve su propio borrador aunque no esté publicado", async () => {
    const svc = new FollowUpsService(
      prismaReturning(
        makeFollowUp({
          status: "DRAFT",
          therapistId: "school-1",
          visibleToSchool: false,
          area: { id: "a", key: "SEGUIMIENTO_ESCOLAR", name: "SE", category: "G", trackingMode: "TEXT_ONLY" },
        }),
      ),
      makeAccess(),
    );
    await expect(svc.get(school, FU_ID)).resolves.toMatchObject({ id: FU_ID });
  });
});

describe("Solo admin puede cambiar la audiencia", () => {
  it("terapeuta: se ignoran cambios de visibilidad", async () => {
    let data: Record<string, unknown> = {};
    const svc = new FollowUpsService(
      prismaReturning(makeFollowUp(), (d) => (data = d as Record<string, unknown>)),
      makeAccess(false),
    );
    await svc.update({ sub: "therapist-1", roles: ["THERAPIST"] } as AuthUser, FU_ID, {
      visibleToSchool: false,
      visibleToParent: false,
    });
    expect(data.visibleToSchool).toBeUndefined();
    expect(data.visibleToParent).toBeUndefined();
  });

  it("admin: aplica cambios de visibilidad", async () => {
    let data: Record<string, unknown> = {};
    const svc = new FollowUpsService(
      prismaReturning(makeFollowUp(), (d) => (data = d as Record<string, unknown>)),
      makeAccess(true),
    );
    await svc.update({ sub: "admin-1", roles: ["ADMIN"] } as AuthUser, FU_ID, { visibleToSchool: false });
    expect(data.visibleToSchool).toBe(false);
  });
});
