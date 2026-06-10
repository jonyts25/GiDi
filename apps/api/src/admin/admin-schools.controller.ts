import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { PrismaService } from "../prisma.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";

@UseGuards(JwtGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/schools")
export class AdminSchoolsController {
  constructor(private prisma: PrismaService) {}

  @Get(":schoolId/patients")
  async listPatients(@Param("schoolId") schoolId: string) {
    await this.ensureSchool(schoolId);
    const rows = await this.prisma.schoolPatient.findMany({
      where: { schoolId },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, center: true, birthDate: true },
        },
      },
      orderBy: { patient: { lastName: "asc" } },
    });
    return rows.map((r) => ({
      patientId: r.patient.id,
      firstName: r.patient.firstName,
      lastName: r.patient.lastName,
      center: r.patient.center,
      birthDate: r.patient.birthDate,
      notes: r.notes,
    }));
  }

  @Get(":schoolId/available-patients")
  async availablePatients(@Param("schoolId") schoolId: string) {
    await this.ensureSchool(schoolId);
    const linked = await this.prisma.schoolPatient.findMany({
      where: { schoolId },
      select: { patientId: true },
    });
    const linkedIds = linked.map((l) => l.patientId);
    return this.prisma.patient.findMany({
      where: linkedIds.length ? { id: { notIn: linkedIds } } : {},
      select: { id: true, firstName: true, lastName: true, center: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
  }

  @Post(":schoolId/patients")
  async assignPatients(
    @Param("schoolId") schoolId: string,
    @Body() body: { patientIds: string[] },
  ) {
    await this.ensureSchool(schoolId);
    const ids = body.patientIds ?? [];
    if (!ids.length) throw new BadRequestException("Seleccione al menos un paciente");

    for (const patientId of ids) {
      await this.prisma.schoolPatient.upsert({
        where: { schoolId_patientId: { schoolId, patientId } },
        create: { schoolId, patientId },
        update: {},
      });
    }
    return { ok: true, count: ids.length };
  }

  private async ensureSchool(schoolId: string) {
    const school = await this.prisma.user.findFirst({
      where: { id: schoolId, roles: { some: { role: { key: "SCHOOL" } } } },
    });
    if (!school) throw new NotFoundException("Escuela no encontrada");
  }
}
