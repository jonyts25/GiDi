import { IncomeMethod } from "@prisma/client";

/** Etiqueta legible del medio de pago (se guarda en Payment.method). */
export const INCOME_METHOD_LABEL: Record<IncomeMethod, string> = {
  EFECTIVO: "Efectivo",
  BANORTE_TRANSFERENCIA: "Banorte transferencia",
  BANORTE_TERMINAL: "Banorte terminal",
  STP: "STP",
  MERCADO_PAGO_TRANSFERENCIA: "Mercado Pago transferencia",
  MERCADO_PAGO_TERMINAL: "Mercado Pago terminal",
  OTRO: "Otro",
};

export function incomeMethodLabel(method: IncomeMethod): string {
  return INCOME_METHOD_LABEL[method] ?? method;
}

/** Conceptos que suman al monto pagado de la mensualidad del paciente. */
export const PAYMENT_COUNTING_CONCEPTS = new Set(["MENSUALIDAD", "SESION_INDIVIDUAL"]);
