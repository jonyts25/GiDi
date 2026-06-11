import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Injectable()
export class PatientProfileService {
  constructor(private prisma: PrismaService) {}

  async build(patientId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        notes: true,
        center: true,
        createdAt: true,
        parents: {
          select: {
            relationship: true,
            isPrimary: true,
            parent: { select: { id: true, fullName: true, email: true } },
          },
          orderBy: [{ isPrimary: "desc" }, { parent: { fullName: "asc" } }],
        },
        schools: {
          select: {
            school: { select: { id: true, fullName: true, email: true } },
          },
          take: 1,
        },
        assignments: {
          select: {
            therapist: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });

    if (!patient) throw new NotFoundException("Paciente no encontrado");

    const schoolLink = patient.schools[0];

    return {
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        birthDate: patient.birthDate,
        notes: patient.notes,
        center: patient.center,
        createdAt: patient.createdAt,
      },
      guardians: patient.parents.map((pp) => ({
        parentId: pp.parent.id,
        fullName: pp.parent.fullName,
        email: pp.parent.email,
        relationship: pp.relationship,
        isPrimary: pp.isPrimary,
      })),
      school: schoolLink
        ? {
            schoolId: schoolLink.school.id,
            fullName: schoolLink.school.fullName,
            email: schoolLink.school.email,
          }
        : null,
      therapists: patient.assignments.map((a) => ({
        therapistId: a.therapist.id,
        fullName: a.therapist.fullName,
        email: a.therapist.email,
      })),
    };
  }
}
