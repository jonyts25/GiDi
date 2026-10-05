import { formatDateOnly } from "../../web/lib/date-utils";

describe("formatDateOnly", () => {
  it('formatea "2026-10-02T00:00:00.000Z" como 2 oct 2026 sin desfase', () => {
    expect(formatDateOnly("2026-10-02T00:00:00.000Z")).toBe("2 oct 2026");
  });

  it("formatea YYYY-MM-DD como fecha UTC", () => {
    expect(formatDateOnly("2026-10-02")).toBe("2 oct 2026");
  });
});
