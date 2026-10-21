import { pickCanonicalFollowUpId } from "./followup-program-area.util";

describe("pickCanonicalFollowUpId", () => {
  const d = (iso: string) => new Date(iso);

  it("prefers more marks", () => {
    const id = pickCanonicalFollowUpId([
      { id: "a", markCount: 1, objectiveCount: 2, createdAt: d("2026-01-02") },
      { id: "b", markCount: 5, objectiveCount: 1, createdAt: d("2026-01-01") },
    ]);
    expect(id).toBe("b");
  });

  it("breaks mark ties with more objectives", () => {
    const id = pickCanonicalFollowUpId([
      { id: "a", markCount: 0, objectiveCount: 1, createdAt: d("2026-01-02") },
      { id: "b", markCount: 0, objectiveCount: 3, createdAt: d("2026-01-01") },
    ]);
    expect(id).toBe("b");
  });
});
