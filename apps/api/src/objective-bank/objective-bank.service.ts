import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreateObjectiveBankDto } from "./dto/create-objective-bank.dto";
import { UpdateObjectiveBankDto } from "./dto/update-objective-bank.dto";

@Injectable()
export class ObjectiveBankService {
  constructor(private readonly prisma: PrismaService) {}

  private isAdminLike(roles: string[]) {
    return roles.includes("ADMIN") || roles.includes("SUPERADMIN");
  }

  async listTherapistBank(therapistId: string, areaId?: string) {
    return this.prisma.objectiveBank.findMany({
      where: {
        OR: [{ creatorId: therapistId }, { isPublic: true }],
        ...(areaId ? { areaId } : {}),
      },
      orderBy: [{ isPublic: "desc" }, { createdAt: "desc" }],
      include: {
        area: { select: { id: true, key: true, name: true } },
        creator: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async createForTherapist(therapistId: string, dto: CreateObjectiveBankDto) {
    await this.ensureAreaExists(dto.areaId);
    return this.prisma.objectiveBank.create({
      data: {
        description: dto.description.trim(),
        areaId: dto.areaId,
        creatorId: therapistId,
        isPublic: !!dto.isPublic,
      },
      include: {
        area: { select: { id: true, key: true, name: true } },
        creator: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async createForAdmin(adminId: string, dto: CreateObjectiveBankDto) {
    await this.ensureAreaExists(dto.areaId);
    const isPublic = dto.isPublic !== false;
    return this.prisma.objectiveBank.create({
      data: {
        description: dto.description.trim(),
        areaId: dto.areaId,
        creatorId: adminId,
        isPublic,
      },
      include: {
        area: { select: { id: true, key: true, name: true } },
        creator: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async listPatientObjectives(patientId: string, viewerId: string, roles: string[]) {
    await this.assertCanViewPatient(patientId, viewerId, roles);
    return this.prisma.patientObjective.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      include: {
        objectiveBank: {
          include: {
            area: { select: { id: true, key: true, name: true } },
            creator: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });
  }

  async linkPatientObjective(
    patientId: string,
    objectiveBankId: string,
    viewerId: string,
    roles: string[],
  ) {
    await this.assertCanViewPatient(patientId, viewerId, roles);

    const bank = await this.prisma.objectiveBank.findUnique({ where: { id: objectiveBankId } });
    if (!bank) throw new NotFoundException("Objective not found");

    if (!this.isAdminLike(roles)) {
      const allowed = bank.creatorId === viewerId || bank.isPublic === true;
      if (!allowed) {
        throw new ForbiddenException("No puedes asignar este objetivo a un paciente");
      }
      await this.assertTherapistAssigned(viewerId, patientId);
    }

    try {
      return await this.prisma.patientObjective.create({
        data: { patientId, objectiveBankId },
        include: {
          objectiveBank: {
            include: {
              area: { select: { id: true, key: true, name: true } },
              creator: { select: { id: true, fullName: true, email: true } },
            },
          },
        },
      });
    } catch (e: any) {
      if (e?.code === "P2002") {
        throw new ConflictException("Este objetivo ya está vinculado al paciente");
      }
      throw e;
    }
  }

  private async ensureAreaExists(areaId: string) {
    const a = await this.prisma.area.findUnique({ where: { id: areaId } });
    if (!a) throw new NotFoundException("Area not found");
  }

  private async assertTherapistAssigned(therapistId: string, patientId: string) {
    const row = await this.prisma.patientTherapist.findUnique({
      where: { patientId_therapistId: { patientId, therapistId } },
    });
    if (!row) throw new ForbiddenException("No estás asignado a este paciente");
  }

  private async assertCanViewPatient(patientId: string, viewerId: string, roles: string[]) {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException("Patient not found");

    if (this.isAdminLike(roles)) return;

    if (roles.includes("THERAPIST")) {
      await this.assertTherapistAssigned(viewerId, patientId);
      return;
    }

    throw new ForbiddenException("No autorizado");
  }

  async updateForTherapist(therapistId: string, id: string, dto: UpdateObjectiveBankDto) {
    const row = await this.prisma.objectiveBank.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Objective not found");
    if (row.creatorId !== therapistId) {
      throw new ForbiddenException("Solo puedes editar tus propios objetivos");
    }
    if (dto.areaId) await this.ensureAreaExists(dto.areaId);
    return this.prisma.objectiveBank.update({
      where: { id },
      data: {
        description: dto.description !== undefined ? dto.description.trim() : undefined,
        areaId: dto.areaId,
        isPublic: dto.isPublic !== undefined ? dto.isPublic : undefined,
      },
      include: {
        area: { select: { id: true, key: true, name: true } },
        creator: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async deleteForAdmin(id: string) {
    const row = await this.prisma.objectiveBank.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Objective not found");
    await this.prisma.objectiveBank.delete({ where: { id } });
    return { ok: true, id };
  }
}
