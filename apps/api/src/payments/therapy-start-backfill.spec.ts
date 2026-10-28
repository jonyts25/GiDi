import { earliestTherapyStartDate } from "./therapy-start-backfill.util";

const d = (y: number, m: number) => new Date(Date.UTC(y, m - 1, 1));

describe("earliestTherapyStartDate (backfill migración)", () => {
  it("solo alta → mes de createdAt", () => {
    expect(earliestTherapyStartDate(null, null, d(2026, 6))).toEqual(d(2026, 6));
  });

  it("pago ene, ingreso mar, alta jun → enero", () => {
    expect(earliestTherapyStartDate(d(2025, 1), d(2025, 3), d(2025, 6))).toEqual(d(2025, 1));
  });

  it("ingreso feb, alta jun, sin pago → febrero", () => {
    expect(earliestTherapyStartDate(null, d(2024, 2), d(2024, 6))).toEqual(d(2024, 2));
  });
});
