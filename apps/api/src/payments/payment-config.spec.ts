import { billingAmountFor, suggestedMonthly } from "./payment-config";

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
