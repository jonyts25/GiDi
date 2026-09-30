import type { FollowUpListRow } from "@/components/followups/PatientFollowUpsExportTable";

export const DELETE_PROGRAM_CONFIRM =
  "¿Borrar esta programación completa? Se eliminarán todas sus áreas, sesiones y calificaciones.";

export type FollowUpProgramListRow = {
  kind: "program";
  id: string;
  programId: string;
  periodYear: number;
  periodMonth: number;
  status: string;
  therapist?: { fullName: string };
  areas: { id: string; name: string }[];
  followUpIds: string[];
};

export type FollowUpStandaloneListRow = {
  kind: "standalone";
  row: FollowUpListRow;
};

export type FollowUpDisplayRow = FollowUpProgramListRow | FollowUpStandaloneListRow;

export function groupFollowUpListRows(rows: FollowUpListRow[]): FollowUpDisplayRow[] {
  const byProgram = new Map<string, FollowUpListRow[]>();
  for (const row of rows) {
    if (!row.programId) continue;
    const list = byProgram.get(row.programId) ?? [];
    list.push(row);
    byProgram.set(row.programId, list);
  }

  const emittedPrograms = new Set<string>();
  const display: FollowUpDisplayRow[] = [];

  for (const row of rows) {
    if (row.programId) {
      if (emittedPrograms.has(row.programId)) continue;
      emittedPrograms.add(row.programId);
      const group = byProgram.get(row.programId) ?? [row];
      display.push({
        kind: "program",
        id: row.programId,
        programId: row.programId,
        periodYear: row.periodYear,
        periodMonth: row.periodMonth,
        status: group.every((r) => r.status === "CLOSED") ? "CLOSED" : group[0].status,
        therapist: row.therapist ?? row.program?.therapist,
        areas: group.map((r) => ({ id: r.area.id, name: r.area.name })),
        followUpIds: group.map((r) => r.id),
      });
    } else {
      display.push({ kind: "standalone", row });
    }
  }

  return display;
}

export function formatProgramListLabel(
  periodYear: number,
  periodMonth: number,
  therapistName?: string,
  areaNames?: string[],
): string {
  const monthLabel = new Date(periodYear, periodMonth - 1, 1).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });
  const therapist = therapistName ? ` — ${therapistName}` : "";
  const areas = areaNames?.length ? ` (${areaNames.join(", ")})` : "";
  return `Programación de ${monthLabel}${therapist}${areas}`;
}
