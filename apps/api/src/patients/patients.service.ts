import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreatePatientDto } from "./dto/create-patient.dto";
import { generateTempPassword } from "src/common/security/temp-password";
import { GuardianRelationship, RoleKey } from "@prisma/client";
import * as bcrypt from "bcrypt";

type GuardianInput = {
  existingParentId?: string;
  email?: string;
  fullName?: string;
  relationship?: GuardianRelationship;
  isPrimary?: boolean;
  notes?: string | null;
};

type CreatePatientBody = CreatePatientDto & { guardians?: GuardianInput[] };

function collectGuardians(dto: CreatePatientBody): GuardianInput[] {
  if (Array.isArray(dto.guardians) && dto.guardians.length > 0) {
    return dto.guardians;
  }
  if (dto.parent?.email?.trim() && dto.parent.fullName?.trim()) {
    return [
      {
        email: dto.parent.email,
        fullName: dto.parent.fullName,
        relationship: dto.parent.relationship,
        isPrimary: dto.parent.isPrimary,
        notes: dto.parent.notes ?? null,
      },
    ];
  }
  return [];
}

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePatientBody) {
    return this.prisma.$transaction(async (tx) => {
      const therapistId = dto.therapistIds?.[0];
      const patient = await tx.patient.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
          notes: dto.notes,
          assignments: therapistId
            ? {
                create: { therapistId },
              }
            : undefined,
        },
      });

      const parentRole = await tx.role.findUnique({
        where: { key: RoleKey.PARENT },
      });
      if (!parentRole) {
        throw new BadRequestException("Rol PARENT no existe (seed)");
      }

      const guardianRows = collectGuardians(dto);
      const parentCredentials: { email: string; fullName: string; temporaryPassword: string }[] = [];
      let parentUser: { id: string; email: string; fullName: string } | null = null;
      let parentTempPassword: string | null = null;

      const markPrimary = async (parentId: string, isPrimary: boolean) => {
        if (!isPrimary) return;
        await tx.parentPatient.updateMany({
          where: { patientId: patient.id, parentId: { not: parentId } },
          data: { isPrimary: false },
        });
      };

      const createParentPatient = async (parentId: string, g: GuardianInput) => {
        try {
          await tx.parentPatient.create({
            data: {
              parentId,
              patientId: patient.id,
              relationship: g.relationship ?? GuardianRelationship.OTHER,
              isPrimary: g.isPrimary ?? false,
              notes: g.notes ?? undefined,
            },
          });
        } catch (e: unknown) {
          const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
          if (code === "P2002") {
            throw new BadRequestException("Un tutor ya está vinculado a este paciente (duplicado)");
          }
          throw e;
        }
        await markPrimary(parentId, !!g.isPrimary);
      };

      for (const g of guardianRows) {
        if (g.existingParentId?.trim()) {
          const user = await tx.user.findUnique({
            where: { id: g.existingParentId.trim() },
            include: { roles: { include: { role: true } } },
          });
          if (!user) {
            throw new BadRequestException(`Padre/tutor no encontrado: ${g.existingParentId}`);
          }
          const hasParent = user.roles.some((r) => r.role.key === RoleKey.PARENT);
          if (!hasParent) {
            await tx.userRole.create({
              data: { userId: user.id, roleId: parentRole.id },
            });
          }
          await createParentPatient(user.id, g);
          parentUser = { id: user.id, email: user.email, fullName: user.fullName };
          continue;
        }

        const email = (g.email ?? "").toLowerCase().trim();
        const fullName = (g.fullName ?? "").trim();
        if (!email || !fullName) {
          throw new BadRequestException(
            "Cada tutor nuevo debe incluir email y nombre, o usa existingParentId para uno ya registrado",
          );
        }

        let user = await tx.user.findUnique({ where: { email } });
        let newTemp: string | null = null;

        if (!user) {
          newTemp = generateTempPassword(12);
          const passwordHash = await bcrypt.hash(newTemp, 12);
          user = await tx.user.create({
            data: {
              email,
              fullName,
              password: passwordHash,
              mustChangePassword: true,
              status: "ACTIVE",
            },
          });
          await tx.userRole.create({
            data: { userId: user.id, roleId: parentRole.id },
          });
        } else {
          const hasRole = await tx.userRole.findFirst({
            where: { userId: user.id, roleId: parentRole.id },
          });
          if (!hasRole) {
            await tx.userRole.create({
              data: { userId: user.id, roleId: parentRole.id },
            });
          }
        }

        await createParentPatient(user.id, g);
        parentUser = { id: user.id, email: user.email, fullName: user.fullName };
        if (newTemp) {
          parentCredentials.push({
            email: user.email,
            fullName: user.fullName,
            temporaryPassword: newTemp,
          });
          parentTempPassword = parentTempPassword ?? newTemp;
        }
      }

      return {
        patient,
        parent: parentUser,
        parentTempPassword,
        parentCredentials: parentCredentials.length ? parentCredentials : undefined,
      };
    });
  }

  async findOne(id: string) {
    return this.prisma.patient.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            therapist: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
        parents: {
          include: {
            parent: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
      },
    });
  }


  async findAll() {
    return this.prisma.patient.findMany({
      include: {
        assignments: {
          include: {
            therapist: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
        parents: {
          include: {
            parent: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
      },
    });
  }

  async assignTherapist(patientId: string, therapistId: string) {
    return this.prisma.patientTherapist.upsert({
      where: { patientId_therapistId: { patientId, therapistId } },
      update: {},
      create: { patientId, therapistId },
    });
  }

  async findForTherapist(therapistId: string) {
    return this.prisma.patient.findMany({
      where: {
        assignments: {
          some: { therapistId },
        },
      },
    });
  }

  async findOneForTherapist(therapistId: string, patientId: string) {
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
