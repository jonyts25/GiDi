import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Injectable()
export class TherapistService {
  constructor(private prisma: PrismaService) {}

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
      },
      orderBy: { lastName: "asc" },
    });
  }

  async getMyPatient(therapistId: string, patientId: string) {
    const p = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        assignments: { some: { therapistId } },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        notes: true,
      },
    });

    if (!p) throw new NotFoundException("Paciente no encontrado");
    return p;
  }
}