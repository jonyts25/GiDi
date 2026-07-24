import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { ReplaceScheduleDto } from "./dto/replace-schedule.dto";

@Injectable()
export class TherapistScheduleService {
  constructor(private prisma: PrismaService) {}

  private async ensureTherapist(therapistId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: therapistId, roles: { some: { role: { key: "THERAPIST" } } } },
      select: { id: true, fullName: true },
    });
    if (!user) throw new NotFoundException("Terapeuta no encontrado");
    return user;
  }

  async getSchedule(therapistId: string) {
    const therapist = await this.ensureTherapist(therapistId);
    const [meta, slots] = await Promise.all([
      this.prisma.therapistSchedule.findUnique({ where: { therapistId } }),
      this.prisma.therapistScheduleSlot.findMany({
        where: { therapistId },
        orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }, { dayOfWeek: "asc" }],
      }),
    ]);

    return {
      therapist: { id: therapist.id, fullName: therapist.fullName },
      location: meta?.location ?? null,
      notes: meta?.notes ?? null,
      updatedAt: meta?.updatedAt ?? null,
      slots: slots.map((s) => ({
        id: s.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        label: s.label,
        sortOrder: s.sortOrder,
      })),
    };
  }

  async replaceSchedule(therapistId: string, dto: ReplaceScheduleDto) {
    await this.ensureTherapist(therapistId);

    const cleanSlots = (dto.slots ?? [])
      .filter((s) => s.startTime?.trim() && s.label?.trim())
      .map((s, i) => ({
        therapistId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime.trim(),
        endTime: s.endTime?.trim() || null,
        label: s.label.trim(),
        sortOrder: s.sortOrder ?? i,
      }));

    await this.prisma.$transaction([
      this.prisma.therapistSchedule.upsert({
        where: { therapistId },
        create: {
          therapistId,
          location: dto.location?.trim() || null,
          notes: dto.notes?.trim() || null,
        },
        update: {
          location: dto.location?.trim() || null,
          notes: dto.notes?.trim() || null,
        },
      }),
      this.prisma.therapistScheduleSlot.deleteMany({ where: { therapistId } }),
      ...(cleanSlots.length
        ? [this.prisma.therapistScheduleSlot.createMany({ data: cleanSlots })]
        : []),
    ]);

    return this.getSchedule(therapistId);
  }
}
