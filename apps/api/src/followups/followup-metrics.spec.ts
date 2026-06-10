import {
  computeAttendancePercent,
  sessionAttendanceFromMarks,
} from "./followup-metrics";

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

  it("treats V and E as excluded from attendance percent", () => {
    expect(sessionAttendanceFromMarks([{ code: "V" }])).toBe("excluded");
    expect(sessionAttendanceFromMarks([{ code: "E" }])).toBe("excluded");
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

  it("keeps excluded sessions out of the denominator", () => {
    const result = computeAttendancePercent([
      { sessionDate: "2026-01-05", marks: [{ code: "V" }] },
      { sessionDate: "2026-01-12", marks: [{ progressScale: 2 }] },
    ]);
    expect(result.excluded).toBe(1);
    expect(result.present).toBe(1);
    expect(result.percent).toBe(100);
  });
});
