import { Injectable, NotFoundException } from "@nestjs/common";
import { PatientProfileService } from "../patients/patient-profile.service";
import { PrismaService } from "../prisma.service";

@Injectable()
export class ParentService {
  constructor(
    private prisma: PrismaService,
    private profiles: PatientProfileService,
  ) {}

  async listMyPatients(parentId: string) {
    const rows = await this.prisma.parentPatient.findMany({
      where: { parentId },
      select: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            birthDate: true,
            notes: true,
            center: true,
            createdAt: true,
          },
        },
      },
      orderBy: { patient: { createdAt: "desc" } },
    });

    return rows.map((r) => r.patient);
  }

  async getMyPatient(parentId: string, patientId: string) {
    const row = await this.prisma.parentPatient.findFirst({
      where: { parentId, patientId },
    });
    if (!row) throw new NotFoundException("Paciente no encontrado para este padre");
    return this.profiles.build(patientId);
  }
}
