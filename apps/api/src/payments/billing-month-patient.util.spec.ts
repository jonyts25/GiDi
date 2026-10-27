import { includePaymentPatientInMonthSheet } from "./billing-month-patient.util";

describe("includePaymentPatientInMonthSheet", () => {
  it("incluye pacientes integrados", () => {
    expect(includePaymentPatientInMonthSheet("NORMAL", 0, false)).toBe(true);
  });

  it("omite NO_INTEGRADO sin pago ni ingreso del periodo", () => {
    expect(includePaymentPatientInMonthSheet("NO_INTEGRADO", 0, false)).toBe(false);
  });

  it("conserva NO_INTEGRADO con pago parcial o ingreso", () => {
    expect(includePaymentPatientInMonthSheet("NO_INTEGRADO", 100, false)).toBe(true);
    expect(includePaymentPatientInMonthSheet("NO_INTEGRADO", 0, true)).toBe(true);
  });
});
