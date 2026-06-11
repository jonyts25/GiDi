import { Injectable, NotFoundException } from "@nestjs/common";
import { PatientProfileService } from "../patients/patient-profile.service";
import { PrismaService } from "../prisma.service";

@Injectable()
export class SchoolPortalService {
  constructor(
    private prisma: PrismaService,
    private profiles: PatientProfileService,
  ) {}

  async listMyPatients(schoolId: string) {
    const rows = await this.prisma.schoolPatient.findMany({
      where: { schoolId },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            birthDate: true,
            center: true,
          },
        },
      },
      orderBy: { patient: { lastName: "asc" } },
    });

    return rows.map((r) => ({
      id: r.patient.id,
      firstName: r.patient.firstName,
      lastName: r.patient.lastName,
      birthDate: r.patient.birthDate,
      center: r.patient.center,
      notes: r.notes,
    }));
  }

  async getPatient(schoolId: string, patientId: string) {
    const link = await this.prisma.schoolPatient.findFirst({
      where: { schoolId, patientId },
    });
    if (!link) throw new NotFoundException("Paciente no vinculado a esta escuela");
    return this.profiles.build(patientId);
  }
}
