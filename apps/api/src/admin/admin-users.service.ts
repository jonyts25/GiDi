import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { Prisma, RoleKey, UserStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { AuthUser } from "../auth/auth-user";
import { userHasFullAdminRole, assertRoleSetCompatible } from "../auth/role-permissions";

function randomPassword(len = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

@Injectable()
export class AdminUsersService {
  constructor(private prisma: PrismaService) {}

  async listByRole(role: RoleKey, status?: UserStatus) {
    return this.prisma.user.findMany({
      where: {
        roles: { some: { role: { key: role } } },
        ...(status ? { status } : {}),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        status: true,
        coordinatorId: true,
        coordinator: { select: { id: true, fullName: true } },
        roles: { select: { role: { select: { key: true, name: true } } } },
        createdAt: true,
      },
      orderBy: { fullName: "asc" },
    });
  }

  async listInactive() {
    return this.prisma.user.findMany({
      where: { status: UserStatus.INACTIVE },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        status: true,
        roles: { select: { role: { select: { key: true, name: true } } } },
        createdAt: true,
      },
      orderBy: { fullName: "asc" },
    });
  }

  async create(dto: CreateUserDto, actor: AuthUser) {
    if (dto.role === RoleKey.ADMIN || dto.role === RoleKey.SUPERADMIN) {
      if (!userHasFullAdminRole(actor)) {
        throw new ForbiddenException("Solo administración puede crear usuarios administradores");
      }
    }
    if (dto.role === RoleKey.SUPERADMIN && !actor.roles.includes(RoleKey.SUPERADMIN)) {
      throw new ForbiddenException("Solo superadministración puede crear usuarios superadmin");
    }

    const plain = dto.password ?? randomPassword();
    const passwordHash = await bcrypt.hash(plain, 10);

    const role = await this.prisma.role.findUnique({ where: { key: dto.role } });
    if (!role) {
      throw new BadRequestException(`Role ${dto.role} no existe`);
    }

    assertRoleSetCompatible([dto.role]);

    const created = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        fullName: dto.fullName,
        phone: dto.phone?.trim() || null,
        password: passwordHash,
        status: dto.status ?? UserStatus.ACTIVE,
        roles: {
          create: [{ roleId: role.id }],
        },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });

    // ⚠️ solo para demo/MVP: regresamos password en claro
    return { user: created, generatedPassword: plain };
  }

    async resetPassword(userId: string) {
    userId = (userId ?? "").trim();
    if (!userId) throw new BadRequestException("userId requerido");

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) throw new NotFoundException("Usuario no encontrado");

    const tempPassword = generateTempPassword(12);
    const hash = await bcrypt.hash(tempPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hash,
        mustChangePassword: true,
      },
    });

    return { tempPassword };
  }

  async get(id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        status: true,
        coordinatorId: true,
        coordinator: { select: { id: true, fullName: true, email: true } },
        roles: { select: { role: { select: { key: true, name: true } } } },
        createdAt: true,
        parentAssignments: {
          select: {
            relationship: true,
            isPrimary: true,
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                center: true,
                status: true,
              },
            },
          },
          orderBy: [{ isPrimary: "desc" }, { patient: { lastName: "asc" } }],
        },
      },
    });

    if (!u) throw new NotFoundException("User not found");

    const isParent = u.roles.some((r) => r.role.key === "PARENT");
    const { parentAssignments, ...rest } = u;

    return {
      ...rest,
      ...(isParent
        ? {
            children: parentAssignments.map((pp) => ({
              id: pp.patient.id,
              firstName: pp.patient.firstName,
              lastName: pp.patient.lastName,
              center: pp.patient.center,
              status: pp.patient.status,
              relationship: pp.relationship,
              isPrimary: pp.isPrimary,
            })),
          }
        : {}),
    };
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthUser) {
    const current = await this.get(id); // fuerza 404 limpio si no existe

    if (
      current.status === UserStatus.INACTIVE &&
      dto.status === UserStatus.ACTIVE &&
      !userHasFullAdminRole(actor)
    ) {
      throw new BadRequestException("Solo administración puede reactivar perfiles inactivos");
    }

    if (dto.coordinatorId !== undefined) {
      const isTherapist = current.roles.some((r) => r.role.key === RoleKey.THERAPIST);
      if (!isTherapist) {
        throw new BadRequestException("Solo terapeutas pueden tener coordinadora asignada");
      }
      if (dto.coordinatorId === null) {
        // ok
      } else {
        const coord = await this.prisma.user.findUnique({
          where: { id: dto.coordinatorId },
          select: {
            id: true,
            roles: { select: { role: { select: { key: true } } } },
          },
        });
        if (!coord) throw new NotFoundException("Coordinadora no encontrada");
        const hasCoordRole = coord.roles.some((r) => r.role.key === RoleKey.COORDINATOR);
        if (!hasCoordRole) {
          throw new BadRequestException("El usuario seleccionado no tiene rol COORDINATOR");
        }
      }
    }

    const currentRoleKeys = current.roles.map((r) => r.role.key as RoleKey);

    if (dto.roles !== undefined) {
      if (!userHasFullAdminRole(actor)) {
        throw new ForbiddenException("Solo administración puede cambiar perfiles de usuario");
      }
      if (dto.roles.length === 0) {
        throw new BadRequestException("Debe conservar al menos un perfil");
      }

      const nextRoleKeys = dto.roles;
      assertRoleSetCompatible(nextRoleKeys);

      const actorIsSuperAdmin = actor.roles.includes(RoleKey.SUPERADMIN);
      const hadSuperAdmin = currentRoleKeys.includes(RoleKey.SUPERADMIN);
      const hasSuperAdmin = nextRoleKeys.includes(RoleKey.SUPERADMIN);
      if (hadSuperAdmin !== hasSuperAdmin && !actorIsSuperAdmin) {
        throw new ForbiddenException("Solo superadministración puede asignar o quitar Superadmin");
      }

      if (actor.sub === id) {
        const hadAdminTier = currentRoleKeys.some(
          (k) => k === RoleKey.ADMIN || k === RoleKey.SUPERADMIN,
        );
        const hasAdminTier = nextRoleKeys.some(
          (k) => k === RoleKey.ADMIN || k === RoleKey.SUPERADMIN,
        );
        if (hadAdminTier && !hasAdminTier) {
          throw new BadRequestException("No puede quitarse a sí mismo el perfil de administración");
        }
      }

      const removingTherapist =
        currentRoleKeys.includes(RoleKey.THERAPIST) && !nextRoleKeys.includes(RoleKey.THERAPIST);
      const removingCoordinator =
        currentRoleKeys.includes(RoleKey.COORDINATOR) && !nextRoleKeys.includes(RoleKey.COORDINATOR);

      await this.prisma.$transaction(async (tx) => {
        if (removingTherapist) {
          const assignedActive = await tx.patientTherapist.count({
            where: { therapistId: id, patient: { status: UserStatus.ACTIVE } },
          });
          if (assignedActive > 0) {
            throw new BadRequestException(
              `Tiene ${assignedActive} pacientes asignados; reasígnelos antes de quitar el perfil de terapeuta`,
            );
          }
          await tx.user.update({
            where: { id },
            data: { coordinatorId: null },
          });
        }

        if (removingCoordinator) {
          await tx.user.updateMany({
            where: { coordinatorId: id },
            data: { coordinatorId: null },
          });
        }

        const roles = await tx.role.findMany({ where: { key: { in: nextRoleKeys } } });
        if (roles.length !== nextRoleKeys.length) {
          throw new BadRequestException("Uno o más perfiles no existen en el sistema");
        }

        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.createMany({
          data: roles.map((r) => ({ userId: id, roleId: r.id })),
        });
      });
    }

    try {
      await this.prisma.user.update({
        where: { id },
        data: {
          email: dto.email?.toLowerCase(),
          fullName: dto.fullName,
          phone: dto.phone === undefined ? undefined : (dto.phone?.trim() || null),
          status: dto.status,
          ...(dto.coordinatorId !== undefined ? { coordinatorId: dto.coordinatorId } : {}),
        },
      });

      return this.get(id);
    } catch (e: any) {
      // email duplicado
      if (e?.code === "P2002") throw new ConflictException("Email ya existe");
      throw e;
    }
  }
}

function generateTempPassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
