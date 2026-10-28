import {
  isBeforeTherapyStart,
  isBillableForPeriod,
  isInactiveForPeriod,
} from "./payment-period";

describe("isBeforeTherapyStart", () => {
  const nov2026 = new Date(Date.UTC(2026, 10, 1));

  it("agosto 2026 es anterior a inicio noviembre 2026", () => {
    expect(isBeforeTherapyStart({ therapyStartDate: nov2026 }, 2026, 8)).toBe(true);
  });

  it("noviembre 2026 no es anterior al inicio", () => {
    expect(isBeforeTherapyStart({ therapyStartDate: nov2026 }, 2026, 11)).toBe(false);
  });

  it("sin fecha de inicio no excluye periodos", () => {
    expect(isBeforeTherapyStart({ therapyStartDate: null }, 2026, 1)).toBe(false);
  });
});

describe("isInactiveForPeriod", () => {
  it("sigue excluyendo meses desde la baja", () => {
    const discharged = {
      status: "DISCHARGED",
      dischargedAt: new Date(Date.UTC(2026, 8, 15)),
      therapyStartDate: new Date(Date.UTC(2020, 0, 1)),
    };
    expect(isInactiveForPeriod(discharged, 2026, 8)).toBe(false);
    expect(isInactiveForPeriod(discharged, 2026, 9)).toBe(true);
  });
});

describe("isBillableForPeriod", () => {
  const nov2026 = new Date(Date.UTC(2026, 10, 1));

  it("no cobra agosto si inicia en noviembre", () => {
    const patient = {
      status: "ACTIVE",
      dischargedAt: null,
      therapyStartDate: nov2026,
    };
    expect(isBillableForPeriod(patient, 2026, 8)).toBe(false);
    expect(isBillableForPeriod(patient, 2026, 11)).toBe(true);
  });
});
