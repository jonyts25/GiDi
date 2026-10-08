import {
  computeAttendancePercent,
  lastObjectiveScores,
  sessionAttendanceFromMarks,
} from "./followup-metrics";

describe("lastObjectiveScores", () => {
  it("includes activities and monthlyNotes on each row", () => {
    const rows = lastObjectiveScores(
      [{ id: "o1", idx: 1, text: "Obj", activities: "Actividades del mes", monthlyNotes: "Nota" }],
      [{ sessionDate: "2026-01-05", marks: [{ objectiveId: "o1", progressScale: 2 }] }],
    );
    expect(rows[0].activities).toBe("Actividades del mes");
    expect(rows[0].monthlyNotes).toBe("Nota");
    expect(rows[0].lastProgressScale).toBe(2);
  });
});

describe("followup-metrics attendance", () => {
  it("counts session with progress scales as present", () => {
    expect(
      sessionAttendanceFromMarks([{ progressScale: 3 }, { progressScale: 2 }]),
    ).toBe("present");
  });

  it("prioritizes absence codes over progress scales", () => {
    expect(
      sessionAttendanceFromMarks([{ progressScale: 4 }, { code: "F" }]),
    ).toBe("absent");
  });

  it("treats X as present (objective not worked, child attended)", () => {
    expect(sessionAttendanceFromMarks([{ code: "X" }, { code: "X" }])).toBe("present");
  });

  it("treats V, E and F as absences", () => {
    expect(sessionAttendanceFromMarks([{ code: "V" }])).toBe("absent");
    expect(sessionAttendanceFromMarks([{ code: "E" }])).toBe("absent");
    expect(sessionAttendanceFromMarks([{ code: "F" }])).toBe("absent");
  });

  it("treats R (reposición) as present", () => {
    expect(sessionAttendanceFromMarks([{ code: "R" }])).toBe("present");
  });

  it("includes scale-only sessions in attendance percent", () => {
    const result = computeAttendancePercent([
      { sessionDate: "2026-01-05", marks: [{ progressScale: 3 }] },
      { sessionDate: "2026-01-12", marks: [{ code: "F" }] },
      { sessionDate: "2026-01-19", marks: [{ progressScale: 4 }] },
    ]);
    expect(result.present).toBe(2);
    expect(result.absent).toBe(1);
    expect(result.percent).toBe(67);
  });

  it("counts V/E/F in the denominator as absences", () => {
    const result = computeAttendancePercent([
      { sessionDate: "2026-01-05", marks: [{ code: "V" }] },
      { sessionDate: "2026-01-12", marks: [{ progressScale: 2 }] },
    ]);
    expect(result.absent).toBe(1);
    expect(result.present).toBe(1);
    expect(result.percent).toBe(50);
  });
});
