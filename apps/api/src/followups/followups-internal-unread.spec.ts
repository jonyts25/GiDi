import { FollowUpsService } from "./followups.service";
import { FollowUpAccessService } from "./followup-access.service";
import { PrismaService } from "../prisma.service";
import { AuthUser } from "../auth/auth-user";

const USER_ID = "user-viewer";
const AUTHOR_ID = "user-author";
const FU_ID = "fu-1";
const PATIENT_ID = "patient-1";

function makeAccess(overrides: Partial<FollowUpAccessService> = {}): FollowUpAccessService {
  return {
    assertCanViewFollowUp: jest.fn(),
    assertCanViewPatient: jest.fn(),
    assertCanEditFollowUp: jest.fn(),
    assertCanEditPatientFollowUps: jest.fn(),
    assertRoleCanUseArea: jest.fn(),
    getFollowUpForAccess: jest.fn(),
    isAdmin: jest.fn().mockReturnValue(false),
    isOfficeStaff: jest.fn().mockReturnValue(false),
    ...overrides,
  } as unknown as FollowUpAccessService;
}

describe("FollowUpsService internal unread", () => {
  const lastNoteAt = new Date("2026-10-27T18:00:00Z");

  it("listInternalUnread devuelve [] para rol sin acceso", async () => {
    const prisma = { followUp: { findMany: jest.fn() } } as unknown as PrismaService;
    const service = new FollowUpsService(prisma, makeAccess());
    const user: AuthUser = { sub: USER_ID, roles: ["PARENT"] };

    await expect(service.listInternalUnread(user)).resolves.toEqual([]);
    expect(prisma.followUp.findMany).not.toHaveBeenCalled();
  });

  it("listInternalUnread filtra terapeuta por PatientTherapist y excluye mensajes propios", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { followUp: { findMany } } as unknown as PrismaService;
    const service = new FollowUpsService(prisma, makeAccess());
    const user: AuthUser = { sub: USER_ID, roles: ["THERAPIST"] };

    await service.listInternalUnread(user);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          lastNoteById: { not: USER_ID },
          lastNoteAt: { not: null },
          patient: {
            status: "ACTIVE",
            assignments: { some: { therapistId: USER_ID } },
          },
        }),
        orderBy: { lastNoteAt: "desc" },
      }),
    );
  });

  it("listInternalUnread incluye solo no leídos o editados después de seenAt", async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: "fu-read",
        patientId: PATIENT_ID,
        generalNotes: "Leído",
        lastNoteAt,
        patient: { firstName: "Ana", lastName: "López" },
        lastNoteBy: { fullName: "Secretaria" },
        internalNoteReads: [{ seenAt: lastNoteAt }],
      },
      {
        id: "fu-unread",
        patientId: PATIENT_ID,
        generalNotes: "Nuevo",
        lastNoteAt,
        patient: { firstName: "Ana", lastName: "López" },
        lastNoteBy: { fullName: "Secretaria" },
        internalNoteReads: [],
      },
      {
        id: "fu-edited",
        patientId: PATIENT_ID,
        generalNotes: "Editado",
        lastNoteAt,
        patient: { firstName: "Ana", lastName: "López" },
        lastNoteBy: { fullName: "Editor reciente" },
        internalNoteReads: [{ seenAt: new Date("2026-10-26T12:00:00Z") }],
      },
    ]);
    const prisma = { followUp: { findMany } } as unknown as PrismaService;
    const service = new FollowUpsService(prisma, makeAccess());
    const user: AuthUser = { sub: USER_ID, roles: ["ADMIN"] };

    const rows = await service.listInternalUnread(user);

    expect(rows.map((r) => r.followUpId)).toEqual(["fu-unread", "fu-edited"]);
    expect(rows[0]?.authorName).toBe("Secretaria");
    expect(rows[1]?.authorName).toBe("Editor reciente");
    expect(rows[0]?.updatedAt).toBe(lastNoteAt.toISOString());
  });

  it("update no toca lastNoteAt al cambiar solo status o audiencia", async () => {
    const update = jest.fn().mockResolvedValue({});
    const access = makeAccess({
      getFollowUpForAccess: jest.fn().mockResolvedValue({
        id: FU_ID,
        patientId: PATIENT_ID,
        therapistId: AUTHOR_ID,
        status: "DRAFT",
        generalNotes: "Mensaje fijo",
        area: { key: "COMUNICACION_INTERNA", trackingMode: "TEXT_ONLY" },
      }),
      assertCanEditFollowUp: jest.fn(),
      isAdmin: jest.fn().mockReturnValue(true),
    });
    const prisma = {
      followUp: {
        update,
        findUnique: jest.fn().mockResolvedValue({
          id: FU_ID,
          area: { key: "COMUNICACION_INTERNA" },
        }),
      },
      internalNoteRead: { upsert: jest.fn() },
    } as unknown as PrismaService;
    const service = new FollowUpsService(prisma, access);

    await service.update(
      { sub: USER_ID, roles: ["ADMIN"] },
      FU_ID,
      { status: "CLOSED", visibleToTherapist: false },
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          lastNoteAt: expect.anything(),
          lastNoteBy: expect.anything(),
        }),
      }),
    );
  });

  it("update setea lastNoteAt y lastNoteById cuando cambia generalNotes", async () => {
    const update = jest.fn().mockResolvedValue({});
    const access = makeAccess({
      getFollowUpForAccess: jest.fn().mockResolvedValue({
        id: FU_ID,
        patientId: PATIENT_ID,
        therapistId: AUTHOR_ID,
        status: "DRAFT",
        generalNotes: "Antes",
        area: { key: "COMUNICACION_INTERNA", trackingMode: "TEXT_ONLY" },
      }),
      assertCanEditFollowUp: jest.fn(),
    });
    const prisma = {
      followUp: {
        update,
        findUnique: jest.fn().mockResolvedValue({
          id: FU_ID,
          area: { key: "COMUNICACION_INTERNA" },
        }),
      },
      internalNoteRead: { upsert: jest.fn() },
    } as unknown as PrismaService;
    const service = new FollowUpsService(prisma, access);

    await service.update(
      { sub: USER_ID, roles: ["SECRETARY"] },
      FU_ID,
      { generalNotes: "Después" },
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          generalNotes: "Después",
          lastNoteBy: { connect: { id: USER_ID } },
          lastNoteAt: expect.any(Date),
        }),
      }),
    );
  });

  it("listInternalUnread no incluye mensajes cuyo lastNoteById es el usuario", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { followUp: { findMany } } as unknown as PrismaService;
    const service = new FollowUpsService(prisma, makeAccess());

    await service.listInternalUnread({ sub: AUTHOR_ID, roles: ["ADMIN"] });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ lastNoteById: { not: AUTHOR_ID } }),
      }),
    );
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

    await service.get({ sub: USER_ID, roles: ["ADMIN"] }, FU_ID);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_followUpId: { userId: USER_ID, followUpId: FU_ID } },
      }),
    );
  });
});
