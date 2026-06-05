import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { RoleKey } from "@prisma/client";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async listTherapists() {
    return this.prisma.user.findMany({
      where: {
        roles: { some: { role: { key: "THERAPIST" } } },
        status: "ACTIVE",
      },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: "asc" },
    });
  }
  async listByRole(roleKey: keyof typeof RoleKey | string) {
  const key = (String(roleKey).toUpperCase()) as RoleKey;

  const users = await this.prisma.user.findMany({
    where: {
      roles: {
        some: { role: { key } },
      },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, fullName: true, status: true },
  });

  return users;
}
}
