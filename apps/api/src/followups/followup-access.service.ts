import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { FollowUpStatus } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import { canRoleUseArea } from "../areas/area-permissions";
import { AuthUser } from "../auth/auth-user";

export { AuthUser };

@Injectable()
export class FollowUpAccessService {
  constructor(private prisma: PrismaService) {}

  isAdmin(user: AuthUser): boolean {
    return user.roles.some((r) => r === "ADMIN" || r === "SUPERADMIN");
  }

  async assertCanViewPatient(user: AuthUser, patientId: string): Promise<void> {
    if (this.isAdmin(user)) return;

    if (user.roles.includes("THERAPIST")) {
      const ok = await this.prisma.patientTherapist.findFirst({
        where: { patientId, therapistId: user.sub },
      });
      if (ok) return;
    }

    if (user.roles.includes("PARENT")) {
      const ok = await this.prisma.parentPatient.findFirst({
        where: { patientId, parentId: user.sub },
      });
      if (ok) return;
    }

    if (user.roles.includes("SCHOOL")) {
      const ok = await this.prisma.schoolPatient.findFirst({
        where: { patientId, schoolId: user.sub },
      });
      if (ok) return;
    }

    throw new ForbiddenException("No tiene acceso a este paciente");
  }

  async assertCanEditPatientFollowUps(user: AuthUser, patientId: string, areaKey?: string): Promise<void> {
    if (this.isAdmin(user)) return;

    if (user.roles.includes("THERAPIST")) {
      const ok = await this.prisma.patientTherapist.findFirst({
        where: { patientId, therapistId: user.sub },
      });
      if (ok) return;
    }

    if (user.roles.includes("PARENT")) {
      const ok = await this.prisma.parentPatient.findFirst({
        where: { patientId, parentId: user.sub },
      });
      if (ok && (!areaKey || areaKey === "FAMILIAR")) return;
    }

    if (user.roles.includes("SECRETARY") && areaKey === "ADMINISTRATIVO") {
      return;
    }

    throw new ForbiddenException("No puede editar seguimientos de este paciente");
  }

  async getFollowUpForAccess(followUpId: string) {
    const fu = await this.prisma.followUp.findUnique({
      where: { id: followUpId },
      select: {
        id: true,
        patientId: true,
        therapistId: true,
        status: true,
        area: { select: { key: true, trackingMode: true } },
      },
    });
    if (!fu) throw new NotFoundException("FollowUp not found");
    return fu;
  }

  async assertCanViewFollowUp(user: AuthUser, followUpId: string): Promise<void> {
    const fu = await this.getFollowUpForAccess(followUpId);
    await this.assertCanViewPatient(user, fu.patientId);
  }

  async assertCanEditFollowUp(user: AuthUser, followUpId: string): Promise<void> {
    const fu = await this.getFollowUpForAccess(followUpId);

    if (this.isAdmin(user)) return;

    await this.assertFollowUpNotLocked(user, fu.status);

    if (user.roles.includes("PARENT")) {
      const linked = await this.prisma.parentPatient.findFirst({
        where: { patientId: fu.patientId, parentId: user.sub },
      });
      if (linked && fu.area.key === "FAMILIAR") return;
      throw new ForbiddenException("No puede editar este seguimiento");
    }

    if (user.roles.includes("SECRETARY") && fu.area.key === "ADMINISTRATIVO") {
      return;
    }

    if (!user.roles.includes("THERAPIST")) {
      throw new ForbiddenException("No puede editar este seguimiento");
    }

    const assigned = await this.prisma.patientTherapist.findFirst({
      where: { patientId: fu.patientId, therapistId: user.sub },
    });
    if (!assigned) throw new ForbiddenException("Paciente no asignado");

    if (fu.therapistId !== user.sub) {
      throw new ForbiddenException("Solo el terapeuta titular puede editar este seguimiento");
    }
  }

  assertFollowUpNotLocked(user: AuthUser, status: FollowUpStatus): void {
    if (this.isAdmin(user)) return;
    if (status === FollowUpStatus.CLOSED) {
      throw new ForbiddenException("Este seguimiento ya fue publicado y no se puede modificar");
    }
  }

  assertRoleCanUseArea(user: AuthUser, areaKey: string, trackingMode: string): void {
    if (!canRoleUseArea(user.roles, areaKey, trackingMode)) {
      throw new ForbiddenException("Su perfil no puede crear seguimientos en esta área");
    }
  }
}
