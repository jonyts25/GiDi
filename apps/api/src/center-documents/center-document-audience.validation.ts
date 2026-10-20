import { BadRequestException } from "@nestjs/common";
import { RoleKey } from "@prisma/client";

const ALLOWED_AUDIENCE = new Set<RoleKey>([RoleKey.PARENT, RoleKey.THERAPIST]);

export function assertValidCenterDocumentAudience(audience: RoleKey[] | undefined): RoleKey[] {
  if (!audience || audience.length === 0) {
    throw new BadRequestException("Debe seleccionar al menos un destinatario (Papás o Terapeutas).");
  }

  for (const role of audience) {
    if (role === RoleKey.SCHOOL || !ALLOWED_AUDIENCE.has(role)) {
      throw new BadRequestException("La audiencia solo puede incluir Papás o Terapeutas.");
    }
  }

  return [...new Set(audience)];
}
