import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { AuthUser } from "../auth/auth-user";
import { hasCoordinatorRole } from "../auth/role-permissions";

@Injectable()
export class CoordinatorService {
  constructor(private prisma: PrismaService) {}

  private assertCoordinator(user: AuthUser) {
    if (!hasCoordinatorRole(user.roles)) {
      throw new ForbiddenException("Solo coordinadoras");
    }
  }

  async listTeam(user: AuthUser) {
    this.assertCoordinator(user);

    const therapists = await this.prisma.user.findMany({
      where: {
        coordinatorId: user.sub,
        roles: { some: { role: { key: "THERAPIST" } } },
        status: "ACTIVE",
      },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        therapistAssignments: {
          where: { patient: { status: "ACTIVE" } },
          select: {
            patient: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: [{ patient: { lastName: "asc" } }, { patient: { firstName: "asc" } }],
        },
      },
    });

    return therapists.map((t) => ({
      id: t.id,
      fullName: t.fullName,
      email: t.email,
      patients: t.therapistAssignments.map((a) => a.patient),
    }));
  }
}
