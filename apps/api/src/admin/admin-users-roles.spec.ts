import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { RoleKey, UserStatus } from "@prisma/client";
import { AdminUsersService } from "./admin-users.service";
import { PrismaService } from "../prisma.service";
import { AuthUser } from "../auth/auth-user";

const USER_ID = "user-target";
const ADMIN_ACTOR: AuthUser = { sub: "admin-1", roles: ["ADMIN"] };
const SECRETARY_ACTOR: AuthUser = { sub: "sec-1", roles: ["SECRETARY"] };
const SUPER_ACTOR: AuthUser = { sub: "super-1", roles: ["SUPERADMIN"] };

function baseUser(roles: RoleKey[]) {
  return {
    id: USER_ID,
    email: "u@test.com",
    fullName: "Usuario",
    phone: null,
    status: UserStatus.ACTIVE,
    coordinatorId: null,
    coordinator: null,
    roles: roles.map((key) => ({ role: { key, name: key } })),
    createdAt: new Date(),
    parentAssignments: [],
  };
}

function buildService(opts: {
  user?: ReturnType<typeof baseUser>;
  activePatientCount?: number;
  transactionImpl?: (fn: (tx: unknown) => Promise<void>) => Promise<void>;
}) {
  const user = opts.user ?? baseUser([RoleKey.THERAPIST]);
  const tx = {
    patientTherapist: {
      count: jest.fn().mockResolvedValue(opts.activePatientCount ?? 0),
    },
    user: {
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    role: {
      findMany: jest.fn().mockImplementation(async ({ where }: { where: { key: { in: RoleKey[] } } }) =>
        where.key.in.map((key) => ({ id: `role-${key}`, key })),
      ),
    },
    userRole: {
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };

  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(user),
      update: jest.fn().mockResolvedValue(user),
    },
    $transaction: jest.fn().mockImplementation(async (fn: (inner: typeof tx) => Promise<void>) => {
      if (opts.transactionImpl) return opts.transactionImpl(fn);
      return fn(tx);
    }),
  } as unknown as PrismaService;

  return { service: new AdminUsersService(prisma), tx, prisma };
}

describe("AdminUsersService create", () => {
  it("secretaría no puede crear ADMIN", async () => {
    const prisma = {
      role: { findUnique: jest.fn().mockResolvedValue({ id: "r1", key: RoleKey.ADMIN }) },
      user: { create: jest.fn() },
    } as unknown as PrismaService;
    const service = new AdminUsersService(prisma);
    await expect(
      service.create(
        {
          email: "new@test.com",
          fullName: "N",
          role: RoleKey.ADMIN,
        },
        SECRETARY_ACTOR,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});

describe("AdminUsersService role updates", () => {
  it("secretaría no puede cambiar roles", async () => {
    const { service } = buildService({});
    await expect(
      service.update(USER_ID, { roles: [RoleKey.THERAPIST] }, SECRETARY_ACTOR),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("admin no puede quitarse a sí mismo el perfil de administración", async () => {
    const selfAdmin: AuthUser = { sub: USER_ID, roles: ["ADMIN"] };
    const { service } = buildService({ user: baseUser([RoleKey.ADMIN, RoleKey.SECRETARY]) });
    await expect(
      service.update(USER_ID, { roles: [RoleKey.SECRETARY] }, selfAdmin),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("quitar terapeuta con pacientes activos falla", async () => {
    const { service, tx } = buildService({
      user: baseUser([RoleKey.THERAPIST]),
      activePatientCount: 3,
    });
    await expect(
      service.update(USER_ID, { roles: [RoleKey.ADMIN] }, ADMIN_ACTOR),
    ).rejects.toThrow(/3 pacientes asignados/);
    expect(tx.userRole.deleteMany).not.toHaveBeenCalled();
  });

  it("quitar coordinadora limpia coordinatorId de su equipo", async () => {
    const { service, tx } = buildService({
      user: baseUser([RoleKey.COORDINATOR, RoleKey.THERAPIST]),
      activePatientCount: 0,
    });
    await service.update(
      USER_ID,
      { roles: [RoleKey.THERAPIST] },
      ADMIN_ACTOR,
    );
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { coordinatorId: USER_ID },
      data: { coordinatorId: null },
    });
  });

  it("roles vacíos falla", async () => {
    const { service } = buildService({});
    await expect(service.update(USER_ID, { roles: [] }, ADMIN_ACTOR)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("solo superadmin puede asignar SUPERADMIN", async () => {
    const { service } = buildService({ user: baseUser([RoleKey.ADMIN]) });
    await expect(
      service.update(USER_ID, { roles: [RoleKey.ADMIN, RoleKey.SUPERADMIN] }, ADMIN_ACTOR),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.update(USER_ID, { roles: [RoleKey.ADMIN, RoleKey.SUPERADMIN] }, SUPER_ACTOR),
    ).resolves.toBeDefined();
  });
});
