import { Injectable, BadRequestException, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { Prisma, RoleKey, UserStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";

function randomPassword(len = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

@Injectable()
export class AdminUsersService {
  constructor(private prisma: PrismaService) {}

  async listByRole(role: RoleKey) {
    return this.prisma.user.findMany({
      where: {
        roles: { some: { role: { key: role } } },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        roles: { select: { role: { select: { key: true, name: true } } } },
        createdAt: true,
      },
      orderBy: { fullName: "asc" },
    });
  }

  async create(dto: CreateUserDto) {
    const plain = dto.password ?? randomPassword();
    const passwordHash = await bcrypt.hash(plain, 10);

    const role = await this.prisma.role.findUnique({ where: { key: dto.role } });
  if (!role) {
    throw new BadRequestException(`Role ${dto.role} no existe`);
  }

    const created = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        fullName: dto.fullName,
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
        status: true,
        roles: { select: { role: { select: { key: true, name: true } } } },
        createdAt: true,
      },
    });

    if (!u) throw new NotFoundException("User not found");
    return u;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.get(id); // fuerza 404 limpio si no existe

    try {
      const updated = await this.prisma.user.update({
        where: { id },
        data: {
          email: dto.email?.toLowerCase(),
          fullName: dto.fullName,
          status: dto.status,
        },
        select: { id: true, email: true, fullName: true, status: true, createdAt: true },
      });

      if (dto.roles?.length) {
        const roles = await this.prisma.role.findMany({ where: { key: { in: dto.roles } } });

        await this.prisma.userRole.deleteMany({ where: { userId: id } });
        if (roles.length) {
          await this.prisma.userRole.createMany({
            data: roles.map((r) => ({ userId: id, roleId: r.id })),
          });
        }
      }

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
