/**
 * Reporte de áreas duplicadas en programaciones mensuales (solo lectura).
 * Uso: npx ts-node -r tsconfig-paths/register scripts/report-duplicate-program-areas.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  ARCHIVED_OBJECTIVE_IDX,
  pickCanonicalFollowUpId,
  type FollowUpAreaCandidate,
} from "../src/followups/followup-program-area.util";

function normalizeTexts(texts: string[]): Set<string> {
  return new Set(texts.map((t) => t.trim()).filter(Boolean));
}

function textsSubset(sub: Set<string>, sup: Set<string>): boolean {
  for (const t of sub) {
    if (!sup.has(t)) return false;
  }
  return true;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const groups = await prisma.followUp.groupBy({
      by: ["programId", "areaId"],
      where: { programId: { not: null } },
      _count: { id: true },
      having: { id: { _count: { gt: 1 } } },
    });

    if (groups.length === 0) {
      console.log("No se encontraron áreas duplicadas en programaciones.");
      return;
    }

    console.log(`Áreas duplicadas: ${groups.length} grupo(s)\n`);

    for (const group of groups) {
      const programId = group.programId!;
      const areaId = group.areaId;

      const [program, area, copies] = await Promise.all([
        prisma.followUpProgram.findUnique({
          where: { id: programId },
          select: {
            id: true,
            periodYear: true,
            periodMonth: true,
            patient: { select: { firstName: true, lastName: true } },
          },
        }),
        prisma.area.findUnique({ where: { id: areaId }, select: { name: true, key: true } }),
        prisma.followUp.findMany({
          where: { programId, areaId },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            createdAt: true,
            status: true,
            objectives: {
              where: { idx: { lt: ARCHIVED_OBJECTIVE_IDX } },
              orderBy: { idx: "asc" },
              select: { text: true },
            },
          },
        }),
      ]);

      const candidates: FollowUpAreaCandidate[] = [];
      for (const copy of copies) {
        const markCount = await prisma.followUpMark.count({
          where: { session: { followUpId: copy.id } },
        });
        candidates.push({
          id: copy.id,
          createdAt: copy.createdAt,
          objectiveCount: copy.objectives.length,
          markCount,
        });
      }

      const keepId = pickCanonicalFollowUpId(candidates);
      const keepCopy = copies.find((c) => c.id === keepId)!;
      const keepTexts = normalizeTexts(keepCopy.objectives.map((o) => o.text));

      const patientLabel = program
        ? `${program.patient.firstName} ${program.patient.lastName} (${program.periodYear}-${String(program.periodMonth).padStart(2, "0")})`
        : programId;

      console.log("═".repeat(72));
      console.log(`Programa: ${programId}`);
      console.log(`Paciente / periodo: ${patientLabel}`);
      console.log(`Área: ${area?.name ?? areaId} (${area?.key ?? "?"})`);
      console.log(`Copias: ${copies.length}`);
      console.log(`CONSERVAR: ${keepId} (marcas=${candidates.find((c) => c.id === keepId)?.markCount ?? 0})`);
      console.log("");

      for (const copy of copies) {
        const stats = candidates.find((c) => c.id === copy.id)!;
        console.log(`  • id=${copy.id}`);
        console.log(`    createdAt=${copy.createdAt.toISOString()} status=${copy.status}`);
        console.log(
          `    objetivos activos=${stats.objectiveCount} marcas=${stats.markCount}`,
        );
        if (copy.objectives.length) {
          console.log(`    textos: ${copy.objectives.map((o) => JSON.stringify(o.text)).join(", ")}`);
        } else {
          console.log("    textos: (ninguno)");
        }

        if (copy.id === keepId) {
          console.log("    sugerencia: CONSERVAR");
        } else {
          const copyTexts = normalizeTexts(copy.objectives.map((o) => o.text));
          const safeDelete =
            stats.markCount === 0 &&
            (copyTexts.size === 0 || textsSubset(copyTexts, keepTexts));
          console.log(`    sugerencia: ${safeDelete ? "BORRAR_SEGURO" : "REVISAR_MANUAL"}`);
        }
        console.log("");
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
