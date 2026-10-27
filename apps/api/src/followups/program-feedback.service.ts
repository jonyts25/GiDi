import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { AuthUser } from "../auth/auth-user";
import { FollowUpAccessService } from "./followup-access.service";
import { userHasFullAdminRole } from "../auth/role-permissions";
import { CreateProgramFeedbackDto, UpdateProgramFeedbackDto } from "./dto/program-feedback.dto";

@Injectable()
export class ProgramFeedbackService {
  constructor(
    private prisma: PrismaService,
    private access: FollowUpAccessService,
  ) {}

  private async assertCanViewFeedback(user: AuthUser, programId: string) {
    const program = await this.access.getProgramForAccess(programId);
    if (userHasFullAdminRole(user)) return program;
    if (program.therapistId === user.sub) return program;
    if (await this.access.isCoordinatorOf(user, program.therapistId)) {
      await this.access.assertCanViewPatient(user, program.patientId);
      return program;
    }
    throw new ForbiddenException("No tiene acceso a la retroalimentación de este programa");
  }

  private async assertCanWriteFeedback(user: AuthUser, programId: string) {
    const program = await this.access.getProgramForAccess(programId);
    if (userHasFullAdminRole(user)) return program;
    if (await this.access.isCoordinatorOf(user, program.therapistId)) {
      await this.access.assertCanViewPatient(user, program.patientId);
      return program;
    }
    throw new ForbiddenException("No puede agregar retroalimentación a este programa");
  }

  async listForProgram(user: AuthUser, programId: string) {
    const program = await this.assertCanViewFeedback(user, programId);

    const rows = await this.prisma.programFeedback.findMany({
      where: { programId },
      orderBy: { createdAt: "asc" },
      include: {
        author: { select: { id: true, fullName: true } },
      },
    });

    if (program.therapistId === user.sub && user.roles.includes("THERAPIST")) {
      const unseen = rows.filter((r) => r.seenByTherapistAt == null && r.authorId !== user.sub);
      if (unseen.length) {
        await this.prisma.programFeedback.updateMany({
          where: { id: { in: unseen.map((r) => r.id) } },
          data: { seenByTherapistAt: new Date() },
        });
        for (const r of unseen) {
          r.seenByTherapistAt = new Date();
        }
      }
    }

    return rows.map((r) => ({
      id: r.id,
      programId: r.programId,
      body: r.body,
      authorId: r.authorId,
      author: r.author,
      seenByTherapistAt: r.seenByTherapistAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async create(user: AuthUser, programId: string, dto: CreateProgramFeedbackDto) {
    await this.assertCanWriteFeedback(user, programId);
    const row = await this.prisma.programFeedback.create({
      data: {
        programId,
        authorId: user.sub,
        body: dto.body.trim(),
      },
      include: { author: { select: { id: true, fullName: true } } },
    });
    return {
      id: row.id,
      programId: row.programId,
      body: row.body,
      authorId: row.authorId,
      author: row.author,
      seenByTherapistAt: null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async update(user: AuthUser, feedbackId: string, dto: UpdateProgramFeedbackDto) {
    const row = await this.prisma.programFeedback.findUnique({
      where: { id: feedbackId },
      include: { program: { select: { id: true, therapistId: true, patientId: true } } },
    });
    if (!row) throw new NotFoundException("Retroalimentación no encontrada");

    await this.assertCanViewFeedback(user, row.programId);
    if (row.authorId !== user.sub && !userHasFullAdminRole(user)) {
      throw new ForbiddenException("Solo el autor puede editar esta entrada");
    }

    const updated = await this.prisma.programFeedback.update({
      where: { id: feedbackId },
      data: {
        body: dto.body.trim(),
        seenByTherapistAt: null,
      },
      include: { author: { select: { id: true, fullName: true } } },
    });

    return {
      id: updated.id,
      programId: updated.programId,
      body: updated.body,
      authorId: updated.authorId,
      author: updated.author,
      seenByTherapistAt: null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async delete(user: AuthUser, feedbackId: string) {
    const row = await this.prisma.programFeedback.findUnique({
      where: { id: feedbackId },
    });
    if (!row) throw new NotFoundException("Retroalimentación no encontrada");

    await this.assertCanViewFeedback(user, row.programId);
    if (row.authorId !== user.sub && !userHasFullAdminRole(user)) {
      throw new ForbiddenException("Solo el autor puede borrar esta entrada");
    }

    await this.prisma.programFeedback.delete({ where: { id: feedbackId } });
    return { ok: true };
  }

  async listUnreadForTherapist(user: AuthUser) {
    if (!user.roles.includes("THERAPIST")) {
      throw new ForbiddenException("Solo terapeutas");
    }

    const rows = await this.prisma.programFeedback.findMany({
      where: {
        seenByTherapistAt: null,
        authorId: { not: user.sub },
        program: { therapistId: user.sub },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        programId: true,
        createdAt: true,
        author: { select: { fullName: true } },
        program: {
          select: {
            periodYear: true,
            periodMonth: true,
            patient: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    return rows.map((r) => ({
      feedbackId: r.id,
      programId: r.programId,
      patientName: `${r.program.patient.firstName} ${r.program.patient.lastName}`.trim(),
      authorName: r.author.fullName,
      periodYear: r.program.periodYear,
      periodMonth: r.program.periodMonth,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
