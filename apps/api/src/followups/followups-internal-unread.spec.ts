import { FollowUpsService } from "./followups.service";
import { FollowUpAccessService } from "./followup-access.service";
import { PrismaService } from "../prisma.service";
import { AuthUser } from "../auth/auth-user";

const USER_ID = "user-viewer";
const AUTHOR_ID = "user-author";
const FU_ID = "fu-1";
const PATIENT_ID = "patient-1";

function makeAccess(): FollowUpAccessService {
  return {
    assertCanViewFollowUp: jest.fn(),
    assertCanViewPatient: jest.fn(),
    assertCanEditFollowUp: jest.fn(),
    assertCanEditPatientFollowUps: jest.fn(),
    assertRoleCanUseArea: jest.fn(),
    isAdmin: jest.fn().mockReturnValue(false),
    isOfficeStaff: jest.fn().mockReturnValue(false),
  } as unknown as FollowUpAccessService;
}

describe("FollowUpsService internal unread", () => {
  const updatedAt = new Date("2026-10-27T18:00:00Z");

  it("listInternalUnread devuelve [] para rol sin acceso", async () => {
    const prisma = { followUp: { findMany: jest.fn() } } as unknown as PrismaService;
    const service = new FollowUpsService(prisma, makeAccess());
    const user: AuthUser = { sub: USER_ID, roles: ["PARENT"] };

    await expect(service.listInternalUnread(user)).resolves.toEqual([]);
    expect(prisma.followUp.findMany).not.toHaveBeenCalled();
  });

  it("listInternalUnread filtra terapeuta por PatientTherapist", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { followUp: { findMany } } as unknown as PrismaService;
    const service = new FollowUpsService(prisma, makeAccess());
    const user: AuthUser = { sub: USER_ID, roles: ["THERAPIST"] };

    await service.listInternalUnread(user);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          patient: {
            status: "ACTIVE",
            assignments: { some: { therapistId: USER_ID } },
          },
        }),
      }),
    );
  });

  it("listInternalUnread incluye solo no leídos o editados después de seenAt", async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: "fu-read",
        patientId: PATIENT_ID,
        generalNotes: "Leído",
        updatedAt,
        patient: { firstName: "Ana", lastName: "López" },
        therapist: { fullName: "Autor" },
        internalNoteReads: [{ seenAt: updatedAt }],
      },
      {
        id: "fu-unread",
        patientId: PATIENT_ID,
        generalNotes: "Nuevo",
        updatedAt,
        patient: { firstName: "Ana", lastName: "López" },
        therapist: { fullName: "Autor" },
        internalNoteReads: [],
      },
      {
        id: "fu-edited",
        patientId: PATIENT_ID,
        generalNotes: "Editado",
        updatedAt,
        patient: { firstName: "Ana", lastName: "López" },
        therapist: { fullName: "Autor" },
        internalNoteReads: [{ seenAt: new Date("2026-10-26T12:00:00Z") }],
      },
    ]);
    const prisma = { followUp: { findMany } } as unknown as PrismaService;
    const service = new FollowUpsService(prisma, makeAccess());
    const user: AuthUser = { sub: USER_ID, roles: ["ADMIN"] };

    const rows = await service.listInternalUnread(user);

    expect(rows.map((r) => r.followUpId)).toEqual(["fu-unread", "fu-edited"]);
    expect(rows[0]?.authorName).toBe("Autor");
  });

  it("get marca InternalNoteRead en comunicación interna", async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const internalFollowUp = {
      id: FU_ID,
      area: { key: "COMUNICACION_INTERNA" },
    };
    const prisma = {
      followUp: {
        findUnique: jest.fn().mockResolvedValue(internalFollowUp),
      },
      internalNoteRead: { upsert },
    } as unknown as PrismaService;
    const service = new FollowUpsService(prisma, makeAccess());
    const user: AuthUser = { sub: USER_ID, roles: ["ADMIN"] };

    await service.get(user, FU_ID);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_followUpId: { userId: USER_ID, followUpId: FU_ID } },
        create: expect.objectContaining({ userId: USER_ID, followUpId: FU_ID }),
        update: expect.objectContaining({ seenAt: expect.any(Date) }),
      }),
    );
  });

  it("get no marca lectura en áreas que no son comunicación interna", async () => {
    const upsert = jest.fn();
    const prisma = {
      followUp: {
        findUnique: jest.fn().mockResolvedValue({ id: FU_ID, area: { key: "MOTOR" } }),
      },
      internalNoteRead: { upsert },
    } as unknown as PrismaService;
    const service = new FollowUpsService(prisma, makeAccess());

    await service.get({ sub: USER_ID, roles: ["ADMIN"] }, FU_ID);

    expect(upsert).not.toHaveBeenCalled();
  });
});
