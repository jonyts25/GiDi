import { ForbiddenException } from "@nestjs/common";
import { ProgramFeedbackService } from "./program-feedback.service";
import { FollowUpAccessService } from "./followup-access.service";
import { PrismaService } from "../prisma.service";
import { AuthUser } from "../auth/auth-user";

const PROGRAM_ID = "prog-1";
const THERAPIST_ID = "therapist-1";
const COORD_ID = "coord-1";
const OTHER_COORD = "coord-2";
const AUTHOR_ID = "author-1";
const PATIENT_ID = "patient-1";

function makeAccess(overrides: Partial<FollowUpAccessService> = {}): FollowUpAccessService {
  return {
    getProgramForAccess: jest.fn().mockResolvedValue({
      id: PROGRAM_ID,
      patientId: PATIENT_ID,
      therapistId: THERAPIST_ID,
      periodYear: 2026,
      periodMonth: 10,
    }),
    isCoordinatorOf: jest.fn().mockImplementation(async (_u, therapistId: string) => {
      return therapistId === THERAPIST_ID;
    }),
    assertCanViewPatient: jest.fn(),
    ...overrides,
  } as unknown as FollowUpAccessService;
}

function prismaWithAssignment(assigned: boolean): PrismaService {
  return {
    patientTherapist: {
      findFirst: jest.fn().mockResolvedValue(assigned ? { patientId: PATIENT_ID } : null),
    },
    programFeedback: {},
  } as unknown as PrismaService;
}

describe("ProgramFeedbackService access", () => {
  it("GET feedback: terapeuta del programa puede listar y marca visto", async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: "fb-1",
        programId: PROGRAM_ID,
        authorId: COORD_ID,
        body: "Buen trabajo",
        seenByTherapistAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: { id: COORD_ID, fullName: "Coord" },
      },
    ]);
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      ...prismaWithAssignment(true),
      programFeedback: { findMany, updateMany },
    } as unknown as PrismaService;
    const service = new ProgramFeedbackService(prisma, makeAccess());
    const user: AuthUser = { sub: THERAPIST_ID, roles: ["THERAPIST"] };

    const rows = await service.listForProgram(user, PROGRAM_ID);

    expect(rows).toHaveLength(1);
    expect(updateMany).toHaveBeenCalled();
  });

  it("GET feedback: otra terapeuta del paciente recibe 403", async () => {
    const prisma = {
      ...prismaWithAssignment(false),
      programFeedback: { findMany: jest.fn() },
    } as unknown as PrismaService;
    const access = makeAccess({
      isCoordinatorOf: jest.fn().mockResolvedValue(false),
    });
    const service = new ProgramFeedbackService(prisma, access);
    const user: AuthUser = { sub: "therapist-2", roles: ["THERAPIST"] };

    await expect(service.listForProgram(user, PROGRAM_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("GET feedback: titular del programa sin asignación PatientTherapist recibe 403", async () => {
    const prisma = {
      ...prismaWithAssignment(false),
      programFeedback: { findMany: jest.fn() },
    } as unknown as PrismaService;
    const service = new ProgramFeedbackService(
      prisma,
      makeAccess({ isCoordinatorOf: jest.fn().mockResolvedValue(false) }),
    );
    const user: AuthUser = { sub: THERAPIST_ID, roles: ["THERAPIST"] };

    await expect(service.listForProgram(user, PROGRAM_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("GET feedback: solo COORDINATOR con sub del terapeuta del programa no accede como terapeuta", async () => {
    const prisma = {
      ...prismaWithAssignment(true),
      programFeedback: { findMany: jest.fn() },
    } as unknown as PrismaService;
    const access = makeAccess({
      isCoordinatorOf: jest.fn().mockResolvedValue(false),
    });
    const service = new ProgramFeedbackService(prisma, access);
    const user: AuthUser = { sub: THERAPIST_ID, roles: ["COORDINATOR"] };

    await expect(service.listForProgram(user, PROGRAM_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("GET feedback: coordinadora del terapeuta puede listar", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      ...prismaWithAssignment(false),
      programFeedback: { findMany },
    } as unknown as PrismaService;
    const service = new ProgramFeedbackService(prisma, makeAccess());
    const user: AuthUser = { sub: COORD_ID, roles: ["COORDINATOR"] };

    await expect(service.listForProgram(user, PROGRAM_ID)).resolves.toEqual([]);
    expect(findMany).toHaveBeenCalled();
  });

  it("GET feedback: otra coordinadora recibe 403", async () => {
    const prisma = { programFeedback: { findMany: jest.fn() } } as unknown as PrismaService;
    const access = makeAccess({
      isCoordinatorOf: jest.fn().mockResolvedValue(false),
    });
    const service = new ProgramFeedbackService(prisma, access);
    const user: AuthUser = { sub: OTHER_COORD, roles: ["COORDINATOR"] };

    await expect(service.listForProgram(user, PROGRAM_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("POST feedback: coordinadora puede crear", async () => {
    const create = jest.fn().mockResolvedValue({
      id: "fb-new",
      programId: PROGRAM_ID,
      authorId: COORD_ID,
      body: "Texto",
      seenByTherapistAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      author: { id: COORD_ID, fullName: "Coord" },
    });
    const prisma = { programFeedback: { create } } as unknown as PrismaService;
    const service = new ProgramFeedbackService(prisma, makeAccess());
    const user: AuthUser = { sub: COORD_ID, roles: ["COORDINATOR"] };

    await service.create(user, PROGRAM_ID, { body: "Texto" });
    expect(create).toHaveBeenCalled();
  });

  it("PATCH resetea seenByTherapistAt", async () => {
    const update = jest.fn().mockResolvedValue({
      id: "fb-1",
      programId: PROGRAM_ID,
      authorId: COORD_ID,
      body: "Editado",
      seenByTherapistAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      author: { id: COORD_ID, fullName: "Coord" },
    });
    const prisma = {
      ...prismaWithAssignment(false),
      programFeedback: {
        findUnique: jest.fn().mockResolvedValue({
          id: "fb-1",
          programId: PROGRAM_ID,
          authorId: COORD_ID,
          program: { id: PROGRAM_ID, therapistId: THERAPIST_ID, patientId: PATIENT_ID },
        }),
        update,
      },
    } as unknown as PrismaService;
    const service = new ProgramFeedbackService(prisma, makeAccess());
    const user: AuthUser = { sub: COORD_ID, roles: ["COORDINATOR"] };

    const row = await service.update(user, "fb-1", { body: "Editado" });
    expect(row.seenByTherapistAt).toBeNull();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ seenByTherapistAt: null }),
      }),
    );
  });

  it("unread excluye entradas del propio autor", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      ...prismaWithAssignment(true),
      programFeedback: { findMany },
    } as unknown as PrismaService;
    const service = new ProgramFeedbackService(prisma, makeAccess());
    const user: AuthUser = { sub: THERAPIST_ID, roles: ["THERAPIST"] };

    await service.listUnreadForTherapist(user);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          authorId: { not: THERAPIST_ID },
          program: { therapistId: THERAPIST_ID },
          seenByTherapistAt: null,
        }),
      }),
    );
  });
});
