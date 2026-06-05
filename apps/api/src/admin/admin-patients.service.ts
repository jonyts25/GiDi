import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { GuardianRelationship, RoleKey, UserStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { AddGuardianDto } from "./dto/add-guardian.dto";
import { SetGuardianMetaDto } from "./dto/set-guardian-meta.dto";
import { UpdatePatientDto } from "./dto/update-patient.dto";
import { CreatePatientDto } from "./dto/create-patient.dto";

function randomPassword(len = 12) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

type MiniUser = { id: string; email: string; fullName: string; status: UserStatus };

@Injectable()
export class AdminPatientsService {
  constructor(private prisma: PrismaService) {}

  // ✅ Vista completa: Patient + Padres + Terapeutas + Escuela (1 activa)
  async getFull(patientId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        notes: true,
        createdAt: true,
        updatedAt: true,

        parents: {
          select: {
            parentId: true,
            relationship: true,
            isPrimary: true,
            notes: true,
            parent: { select: { id: true, fullName: true, email: true, status: true } },
          },
          // ✅ NO hay createdAt en ParentPatient -> ordenamos por isPrimary y luego por parent.fullName
          orderBy: [{ isPrimary: "desc" }, { parent: { fullName: "asc" } }],
        },

        assignments: {
          select: {
            therapistId: true,
            therapist: { select: { id: true, fullName: true, email: true, status: true } },
          },
          // ✅ NO hay createdAt en PatientTherapist -> ordenamos por therapist.fullName
          orderBy: { therapist: { fullName: "asc" } },
        },

        schools: {
          select: {
            schoolId: true,
            notes: true,
            school: { select: { id: true, fullName: true, email: true, status: true } },
          },
          // ✅ NO hay createdAt en SchoolPatient -> ordenamos por school.fullName
          orderBy: { school: { fullName: "asc" } },
        },
      },
    });

    if (!patient) throw new NotFoundException("Patient not found");

    // Como tu schema es many-to-many, escogemos la primera (si quieres “última asignada”
    // necesitarías createdAt en SchoolPatient o un campo isActive).
    const activeSchool = patient.schools[0] ?? null;

    return {
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        birthDate: patient.birthDate,
        notes: patient.notes,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
      },
      guardians: patient.parents.map((pp) => ({
        parentId: pp.parentId,
        fullName: pp.parent.fullName,
        email: pp.parent.email,
        status: pp.parent.status,
        relationship: pp.relationship,
        isPrimary: pp.isPrimary,
        notes: pp.notes,
      })),
      therapists: patient.assignments.map((pt) => ({
        therapistId: pt.therapistId,
        fullName: pt.therapist.fullName,
        email: pt.therapist.email,
        status: pt.therapist.status,
      })),
      school: activeSchool
        ? {
            schoolId: activeSchool.schoolId,
            fullName: activeSchool.school.fullName,
            email: activeSchool.school.email,
            status: activeSchool.school.status,
            notes: activeSchool.notes,
          }
        : null,
    };
  }

  async createPatient(dto: CreatePatientDto) {
    // Prisma + DTO => si falta firstName/lastName, class-validator manda 400 con mensaje claro
    return this.prisma.patient.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        notes: dto.notes ?? null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }



  async updatePatient(patientId: string, dto: UpdatePatientDto) {
    await this.ensurePatient(patientId);

    return this.prisma.patient.update({
      where: { id: patientId },
      data: {
        firstName: dto.firstName ?? undefined,
        lastName: dto.lastName ?? undefined,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        notes: dto.notes ?? undefined,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // -------------------- Padres --------------------
  async addGuardian(patientId: string, dto: AddGuardianDto) {
    await this.ensurePatient(patientId);

    let parent: MiniUser | null = null;
    let generatedPassword: string | null = null;

    if (dto.parentId) {
      const u = await this.prisma.user.findUnique({
        where: { id: dto.parentId },
        select: {
          id: true,
          email: true,
          fullName: true,
          status: true,
          roles: { include: { role: true } },
        },
      });
      if (!u) throw new NotFoundException("Usuario no encontrado");
      const hasParent = u.roles.some((r) => r.role.key === RoleKey.PARENT);
      if (!hasParent) {
        throw new BadRequestException("El usuario seleccionado no tiene rol de padre/tutor");
      }
      parent = { id: u.id, email: u.email, fullName: u.fullName, status: u.status };
    } else {
      const email = (dto.email ?? "").toLowerCase().trim();
      if (!email || !dto.fullName?.trim()) {
        throw new BadRequestException("Nombre y email son obligatorios si no eliges un padre existente");
      }

      parent = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, fullName: true, status: true },
      });

      if (!parent) {
        const plain = dto.password ?? randomPassword();
        generatedPassword = plain;

        const passwordHash = await bcrypt.hash(plain, 10);

        const parentRole = await this.prisma.role.findUnique({ where: { key: RoleKey.PARENT } });
        if (!parentRole) throw new Error("Role PARENT no existe (corre seed)");

        parent = await this.prisma.user.create({
          data: {
            email,
            fullName: dto.fullName.trim(),
            password: passwordHash,
            status: UserStatus.ACTIVE,
            roles: { create: [{ roleId: parentRole.id }] },
          },
          select: { id: true, email: true, fullName: true, status: true },
        });
      } else {
        const parentRole = await this.prisma.role.findUnique({ where: { key: RoleKey.PARENT } });
        if (!parentRole) throw new Error("Role PARENT no existe (corre seed)");
        const hasRole = await this.prisma.userRole.findFirst({
          where: { userId: parent.id, roleId: parentRole.id },
        });
        if (!hasRole) {
          await this.prisma.userRole.create({
            data: { userId: parent.id, roleId: parentRole.id },
          });
        }
      }
    }

    if (!parent) throw new Error("No se pudo crear/encontrar el padre (unexpected)");

    // 2) vincular ParentPatient (tu esquema tiene @@unique([parentId, patientId]))
    try {
      await this.prisma.parentPatient.create({
        data: {
          patientId,
          parentId: parent.id,
          relationship: dto.relationship ?? GuardianRelationship.OTHER,
          isPrimary: !!dto.isPrimary,
          notes: dto.notes ?? null,
        },
      });
    } catch (e: any) {
      if (e?.code === "P2002")
        throw new ConflictException("Este padre ya está asignado a este paciente");
      throw e;
    }

    // 3) si isPrimary, desmarcar otros
    if (dto.isPrimary) {
      await this.prisma.parentPatient.updateMany({
        where: { patientId, parentId: { not: parent.id } },
        data: { isPrimary: false },
      });
    }

    return { ok: true, parentId: parent.id, generatedPassword };
  }

  async setGuardianMeta(patientId: string, parentId: string, dto: SetGuardianMetaDto) {
    await this.ensurePatient(patientId);

    const rel = await this.prisma.parentPatient.findUnique({
      where: { parentId_patientId: { parentId, patientId } },
      select: { id: true },
    });
    if (!rel) throw new NotFoundException("Guardian relation not found");

    await this.prisma.parentPatient.update({
      where: { parentId_patientId: { parentId, patientId } },
      data: {
        relationship: dto.relationship ?? undefined,
        isPrimary: dto.isPrimary ?? undefined,
        notes: dto.notes ?? undefined,
      },
    });

    if (dto.isPrimary) {
      await this.prisma.parentPatient.updateMany({
        where: { patientId, parentId: { not: parentId } },
        data: { isPrimary: false },
      });
    }

    return { ok: true };
  }

  async removeGuardian(patientId: string, parentId: string) {
    await this.ensurePatient(patientId);

    await this.prisma.parentPatient.delete({
      where: { parentId_patientId: { parentId, patientId } },
    });

    return { ok: true };
  }

  // -------------------- Terapeutas --------------------
  async assignTherapist(patientId: string, therapistId: string) {
    await this.ensurePatient(patientId);
    await this.ensureUserExists(therapistId);

    try {
      await this.prisma.patientTherapist.create({
        data: { patientId, therapistId },
      });
    } catch (e: any) {
      if (e?.code === "P2002") return { ok: true }; // ya estaba asignado
      throw e;
    }
    return { ok: true };
  }

  async unassignTherapist(patientId: string, therapistId: string) {
    await this.ensurePatient(patientId);

    await this.prisma.patientTherapist.delete({
      where: { patientId_therapistId: { patientId, therapistId } },
    });

    return { ok: true };
  }

  // -------------------- Escuela (1 activa) --------------------
  async setSchool(patientId: string, schoolId: string) {
    await this.ensurePatient(patientId);
    await this.ensureUserExists(schoolId);

    // dejamos una sola asignación “activa”
    await this.prisma.schoolPatient.deleteMany({ where: { patientId } });

    await this.prisma.schoolPatient.create({
      data: { patientId, schoolId },
    });

    return { ok: true };
  }

  async clearSchool(patientId: string) {
    await this.ensurePatient(patientId);
    await this.prisma.schoolPatient.deleteMany({ where: { patientId } });
    return { ok: true };
  }

  // -------------------- Helpers --------------------
  private async ensurePatient(id: string) {
    const p = await this.prisma.patient.findUnique({ where: { id }, select: { id: true } });
    if (!p) throw new NotFoundException("Patient not found");
  }

  private async ensureUserExists(id: string) {
    const u = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!u) throw new NotFoundException("User not found");
  }
}
