import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Injectable()
export class ParentService {
  constructor(private prisma: PrismaService) {}

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
      select: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            birthDate: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!row) throw new NotFoundException("Paciente no encontrado para este padre");
    return row.patient;
  }
}
