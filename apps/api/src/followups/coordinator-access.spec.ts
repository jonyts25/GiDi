import { ForbiddenException } from "@nestjs/common";
import { FollowUpAccessService } from "./followup-access.service";
import { PrismaService } from "../prisma.service";
import { AuthUser } from "../auth/auth-user";

function prismaMock(overrides: Partial<PrismaService> = {}): PrismaService {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue({ coordinatorId: "coord-1" }),
    },
    patientTherapist: {
      findFirst: jest.fn().mockResolvedValue({ patientId: "p1" }),
    },
    patient: {
      findUnique: jest.fn().mockResolvedValue({ status: "ACTIVE" }),
    },
    followUpProgram: {
      findUnique: jest.fn().mockResolvedValue({
        id: "prog-1",
        patientId: "p1",
        therapistId: "therapist-1",
        periodYear: 2026,
        periodMonth: 10,
      }),
    },
    followUp: {
      findUnique: jest.fn().mockResolvedValue({
        id: "fu-1",
        patientId: "p1",
        therapistId: "therapist-1",
        status: "DRAFT",
        generalNotes: "",
        area: { key: "MOTOR", trackingMode: "MONTHLY_GRID" },
      }),
    },
    ...overrides,
  } as unknown as PrismaService;
}

describe("FollowUpAccessService coordinator", () => {
  it("isCoordinatorOf true cuando coordinatorId coincide", async () => {
    const svc = new FollowUpAccessService(prismaMock());
    const user: AuthUser = { sub: "coord-1", roles: ["COORDINATOR"] };
    await expect(svc.isCoordinatorOf(user, "therapist-1")).resolves.toBe(true);
  });

  it("coordinadora puede ver programa de su terapeuta", async () => {
    const svc = new FollowUpAccessService(prismaMock());
    const user: AuthUser = { sub: "coord-1", roles: ["COORDINATOR"] };
    await expect(svc.assertCanViewProgram(user, "prog-1")).resolves.toMatchObject({ id: "prog-1" });
  });

  it("coordinadora no puede editar programación", async () => {
    const svc = new FollowUpAccessService(prismaMock());
    const user: AuthUser = { sub: "coord-1", roles: ["COORDINATOR"] };
    await expect(svc.assertCanEditProgram(user, "prog-1")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("coordinadora+terapeuta titular sí puede editar su programa", async () => {
    const svc = new FollowUpAccessService(prismaMock());
    const user: AuthUser = { sub: "therapist-1", roles: ["THERAPIST", "COORDINATOR"] };
    await expect(svc.assertCanEditProgram(user, "prog-1")).resolves.toMatchObject({ therapistId: "therapist-1" });
  });
});
