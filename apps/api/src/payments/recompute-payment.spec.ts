import { IncomeConcept, IncomeMethod, PaymentStatus } from "@prisma/client";
import {
  aggregatePaymentFromEntries,
  PaymentCountingEntry,
  resolveInheritedAmountDue,
} from "./recompute-payment";

const baseDue = 4000;

function entry(amount: number, day = 1, method: IncomeMethod = IncomeMethod.EFECTIVO): PaymentCountingEntry {
  return {
    amount,
    method,
    concept: IncomeConcept.MENSUALIDAD,
    receivedAt: new Date(2026, 0, day),
  };
}

describe("aggregatePaymentFromEntries", () => {
  it("marca PARCIAL con un abono parcial", () => {
    const result = aggregatePaymentFromEntries([entry(1500)], baseDue, PaymentStatus.PENDIENTE);
    expect(result.amountPaid).toBe(1500);
    expect(result.status).toBe(PaymentStatus.PARCIAL);
    expect(result.paidAt).not.toBeNull();
    expect(result.method).toBe("Efectivo");
  });

  it("marca PAGADO cuando dos abonos completan la mensualidad", () => {
    const result = aggregatePaymentFromEntries([entry(2000, 5), entry(2000, 20)], baseDue, PaymentStatus.PENDIENTE);
    expect(result.amountPaid).toBe(4000);
    expect(result.status).toBe(PaymentStatus.PAGADO);
    expect(result.method).toBe("Efectivo");
  });

  it("conserva PAUSA_VACACIONES sin abonos", () => {
    const result = aggregatePaymentFromEntries([], 0, PaymentStatus.PAUSA_VACACIONES);
    expect(result.amountPaid).toBe(0);
    expect(result.status).toBe(PaymentStatus.PAUSA_VACACIONES);
    expect(result.paidAt).toBeNull();
  });

  it("marca PAGADO cuando PARCIAL con 2150 pagado y amountDue baja de 4130 a 2150", () => {
    const result = aggregatePaymentFromEntries([entry(2150)], 2150, PaymentStatus.PARCIAL);
    expect(result.amountPaid).toBe(2150);
    expect(result.status).toBe(PaymentStatus.PAGADO);
  });

  it("recalcula al mover un abono de un mes a otro", () => {
    const jan = aggregatePaymentFromEntries([entry(4000, 10)], baseDue, PaymentStatus.PENDIENTE);
    expect(jan.status).toBe(PaymentStatus.PAGADO);

    const janAfterMove = aggregatePaymentFromEntries([], baseDue, PaymentStatus.PAGADO);
    expect(janAfterMove.amountPaid).toBe(0);
    expect(janAfterMove.status).toBe(PaymentStatus.PENDIENTE);

    const feb = aggregatePaymentFromEntries(
      [{ ...entry(4000, 10), receivedAt: new Date(2026, 1, 10) }],
      baseDue,
      PaymentStatus.PENDIENTE,
    );
    expect(feb.status).toBe(PaymentStatus.PAGADO);
  });
});

describe("resolveInheritedAmountDue", () => {
  it("hereda el amountDue del mes anterior", () => {
    const history = new Map([
      ["2026-9", { amountDue: 4130, status: PaymentStatus.PENDIENTE }],
    ]);
    expect(resolveInheritedAmountDue(2, 0, history, 2026, 10)).toBe(4130);
  });

  it("salta pausa del mes anterior y toma el último monto positivo en 6 meses", () => {
    const history = new Map([
      ["2026-9", { amountDue: 0, status: PaymentStatus.PAUSA_VACACIONES }],
      ["2026-8", { amountDue: 2150, status: PaymentStatus.PAGADO }],
    ]);
    expect(resolveInheritedAmountDue(2, 0, history, 2026, 10)).toBe(2150);
  });

  it("usa tarifa sugerida sin historial", () => {
    expect(resolveInheritedAmountDue(2, 0, new Map(), 2026, 10)).toBe(4130);
  });
});
