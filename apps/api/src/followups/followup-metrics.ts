import { FollowUpMarkCode } from "@prisma/client";

export type SessionMarkInput = {
  code?: FollowUpMarkCode | string | null;
  progressScale?: number | null;
};

export type SessionInput = {
  sessionDate: Date | string;
  marks: SessionMarkInput[];
};

/** Vacaciones, enfermedad y reposición no entran al cálculo de asistencia. */
const EXCLUDED_ATTENDANCE_CODES = new Set<string>(["V", "E", "R"]);
const PRESENT_CODES = new Set<string>(["A", "OK"]);
/** Falta del niño (inasistencia). X = no se trabajó el objetivo, NO es falta. */
const ABSENT_CODES = new Set<string>(["F"]);
/** X indica objetivo no trabajado pero el niño asistió. */
const OBJECTIVE_NOT_WORKED = "X";

export type SessionAttendance = "present" | "absent" | "excluded" | "unknown";

export function sessionAttendanceFromMarks(marks: SessionMarkInput[]): SessionAttendance {
  const codes = marks.map((m) => m.code).filter((c): c is string => c != null && c !== "");
  const hasProgressScale = marks.some(
    (m) => m.progressScale != null && m.progressScale >= 0 && m.progressScale <= 4,
  );

  if (codes.some((c) => EXCLUDED_ATTENDANCE_CODES.has(c))) return "excluded";
  if (codes.some((c) => ABSENT_CODES.has(c))) return "absent";
  if (hasProgressScale) return "present";
  if (codes.some((c) => PRESENT_CODES.has(c))) return "present";
  if (codes.some((c) => c === OBJECTIVE_NOT_WORKED)) return "present";
  if (codes.length === 0) return "unknown";
  return "unknown";
}

export function computeAttendancePercent(sessions: SessionInput[]): {
  percent: number | null;
  present: number;
  absent: number;
  excluded: number;
  unknown: number;
  totalCounted: number;
} {
  let present = 0;
  let absent = 0;
  let excluded = 0;
  let unknown = 0;

  for (const s of sessions) {
    const status = sessionAttendanceFromMarks(s.marks);
    if (status === "present") present++;
    else if (status === "absent") absent++;
    else if (status === "excluded") excluded++;
    else unknown++;
  }

  const totalCounted = present + absent;
  const percent = totalCounted > 0 ? Math.round((present / totalCounted) * 100) : null;

  return { percent, present, absent, excluded, unknown, totalCounted };
}

/** Escala 0–4 → porcentaje (0=0%, 4=100%). */
export function progressScaleToPercent(scale: number | null | undefined): number | null {
  if (scale == null || scale < 0 || scale > 4) return null;
  return Math.round((scale / 4) * 100);
}

export type ObjectiveProgressInput = {
  id: string;
  idx: number;
  text: string;
  monthlyNotes?: string | null;
};

export function lastObjectiveScores(
  objectives: ObjectiveProgressInput[],
  sessions: { sessionDate: Date | string; marks: (SessionMarkInput & { objectiveId: string })[] }[],
): {
  objectiveId: string;
  idx: number;
  text: string;
  monthlyNotes: string | null;
  lastProgressScale: number | null;
  lastProgressPercent: number | null;
  lastSessionDate: string | null;
}[] {
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime(),
  );

  return objectives.map((obj) => {
    let lastScale: number | null = null;
    let lastDate: string | null = null;

    for (const session of sorted) {
      const mark = session.marks.find((m) => m.objectiveId === obj.id);
      if (mark?.progressScale != null) {
        lastScale = mark.progressScale;
        lastDate = new Date(session.sessionDate).toISOString();
        break;
      }
    }

    return {
      objectiveId: obj.id,
      idx: obj.idx,
      text: obj.text,
      monthlyNotes: obj.monthlyNotes ?? null,
      lastProgressScale: lastScale,
      lastProgressPercent: progressScaleToPercent(lastScale),
      lastSessionDate: lastDate,
    };
  });
}
