import {
  billingAmountFor,
  DEBT_TRACKING_START,
  isOnOrAfterDebtStart,
  suggestedMonthly,
} from "./payment-config";

describe("isOnOrAfterDebtStart", () => {
  it("marzo 2026 está antes del inicio de deuda", () => {
    expect(isOnOrAfterDebtStart(2026, 3)).toBe(false);
  });

  it("agosto 2026 es el primer mes que cuenta", () => {
    expect(isOnOrAfterDebtStart(DEBT_TRACKING_START.year, DEBT_TRACKING_START.month)).toBe(true);
  });

  it("septiembre 2026 cuenta como deuda", () => {
    expect(isOnOrAfterDebtStart(2026, 9)).toBe(true);
  });
});

describe("billingAmountFor", () => {
  it("devuelve la mensualidad acordada aunque haya descuento", () => {
    expect(
      billingAmountFor({
        agreedMonthlyAmount: 1500,
        sessionsPerWeek: 1,
        discountPercent: 30,
      }),
    ).toBe(1500);
  });

  it("usa tarifa sugerida sin mensualidad acordada", () => {
    expect(
      billingAmountFor({
        agreedMonthlyAmount: null,
        sessionsPerWeek: 1,
        discountPercent: 30,
      }),
    ).toBe(1505);
  });

  it("coincide con suggestedMonthly cuando no hay acordada", () => {
    expect(suggestedMonthly(1, 30)).toBe(1505);
  });
});
