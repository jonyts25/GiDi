import { Injectable, NotFoundException } from "@nestjs/common";
import { PatientProfileService } from "../patients/patient-profile.service";
import { PrismaService } from "../prisma.service";

@Injectable()
export class TherapistService {
  constructor(
    private prisma: PrismaService,
    private profiles: PatientProfileService,
  ) {}

  async listMyPatients(therapistId: string) {
    return this.prisma.patient.findMany({
      where: {
        assignments: { some: { therapistId } },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        notes: true,
        center: true,
      },
      orderBy: { lastName: "asc" },
    });
  }

  async getMyPatient(therapistId: string, patientId: string) {
    const ok = await this.prisma.patientTherapist.findFirst({
      where: { patientId, therapistId },
    });
    if (!ok) throw new NotFoundException("Paciente no encontrado");
    return this.profiles.build(patientId);
  }
}
