import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Injectable()
export class SchoolPortalService {
  constructor(private prisma: PrismaService) {}

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
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            birthDate: true,
            center: true,
            notes: true,
          },
        },
      },
    });
    if (!link) throw new NotFoundException("Paciente no vinculado a esta escuela");
    return { patient: link.patient, schoolNotes: link.notes };
  }
}
