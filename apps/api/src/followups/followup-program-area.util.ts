import { Prisma } from "@prisma/client";

export const ARCHIVED_OBJECTIVE_IDX = 1000;

export type FollowUpAreaCandidate = {
  id: string;
  createdAt: Date;
  objectiveCount: number;
  markCount: number;
};

/** Elige la copia a conservar: más marcas → más objetivos activos → más reciente. */
export function pickCanonicalFollowUpId(candidates: FollowUpAreaCandidate[]): string {
  if (candidates.length === 0) {
    throw new Error("pickCanonicalFollowUpId: lista vacía");
  }
  const sorted = [...candidates].sort((a, b) => {
    if (b.markCount !== a.markCount) return b.markCount - a.markCount;
    if (b.objectiveCount !== a.objectiveCount) return b.objectiveCount - a.objectiveCount;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  return sorted[0]!.id;
}

export async function loadFollowUpAreaCandidates(
  tx: Prisma.TransactionClient,
  followUpIds: string[],
): Promise<FollowUpAreaCandidate[]> {
  if (followUpIds.length === 0) return [];

  const followUps = await tx.followUp.findMany({
    where: { id: { in: followUpIds } },
    select: {
      id: true,
      createdAt: true,
      objectives: {
        where: { idx: { lt: ARCHIVED_OBJECTIVE_IDX } },
        select: { id: true },
      },
    },
  });

  const candidates: FollowUpAreaCandidate[] = [];
  for (const fu of followUps) {
    const markCount = await tx.followUpMark.count({
      where: { session: { followUpId: fu.id } },
    });
    candidates.push({
      id: fu.id,
      createdAt: fu.createdAt,
      objectiveCount: fu.objectives.length,
      markCount,
    });
  }
  return candidates;
}

/** Resuelve el FollowUp existente para (programId, areaId) o null si no hay ninguno. */
export async function resolveExistingFollowUpForProgramArea(
  tx: Prisma.TransactionClient,
  programId: string,
  areaId: string,
): Promise<{ id: string } | null> {
  const rows = await tx.followUp.findMany({
    where: { programId, areaId },
    select: { id: true },
  });
  if (rows.length === 0) return null;
  if (rows.length === 1) return rows[0]!;

  const candidates = await loadFollowUpAreaCandidates(
    tx,
    rows.map((r) => r.id),
  );
  const canonicalId = pickCanonicalFollowUpId(candidates);
  return { id: canonicalId };
}
