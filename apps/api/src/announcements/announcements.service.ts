import { Injectable, NotFoundException } from "@nestjs/common";
import { RoleKey } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import { UpdateAnnouncementDto } from "./dto/update-announcement.dto";

const announcementSelect = {
  id: true,
  title: true,
  body: true,
  audience: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, fullName: true } },
} as const;

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  listAll() {
    return this.prisma.announcement.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      select: announcementSelect,
    });
  }

  /** Avisos activos que le corresponden al usuario por su rol. */
  async activeForUser(roles: string[]) {
    const items = await this.prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      select: announcementSelect,
    });

    return items.filter(
      (a) => a.audience.length === 0 || a.audience.some((r) => roles.includes(r)),
    );
  }

  create(userId: string, dto: CreateAnnouncementDto) {
    return this.prisma.announcement.create({
      data: {
        title: dto.title.trim(),
        body: dto.body.trim(),
        audience: dto.audience ?? [],
        isActive: dto.isActive ?? true,
        createdById: userId,
      },
      select: announcementSelect,
    });
  }

  async update(id: string, dto: UpdateAnnouncementDto) {
    await this.getOrThrow(id);
    return this.prisma.announcement.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        body: dto.body?.trim(),
        audience: dto.audience as RoleKey[] | undefined,
        isActive: dto.isActive,
      },
      select: announcementSelect,
    });
  }

  async remove(id: string) {
    await this.getOrThrow(id);
    await this.prisma.announcement.delete({ where: { id } });
    return { ok: true };
  }

  private async getOrThrow(id: string) {
    const found = await this.prisma.announcement.findUnique({ where: { id } });
    if (!found) throw new NotFoundException("Aviso no encontrado");
    return found;
  }
}
