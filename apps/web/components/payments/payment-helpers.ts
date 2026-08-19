export type PaymentStatus = "PENDIENTE" | "PAGADO" | "PARCIAL" | "DEUDA" | "PAUSA_VACACIONES";

export type MonthlyBillingStatus = "NORMAL" | "NO_INTEGRADO";

export type PaymentRow = {
  id: string;
  periodYear: number;
  periodMonth: number;
  amountDue: number;
  amountPaid: number;
  status: PaymentStatus;
  paidAt?: string | null;
  method?: string | null;
  reference?: string | null;
  notes?: string | null;
  receiptName?: string | null;
  receiptUploadedAt?: string | null;
};

export type PatientArrears = { months: number; amount: number };

export type PaymentOverviewRow = PaymentRow & {
  patient: { id: string; firstName: string; lastName: string; center: string };
  debtCarriedOver: number;
  arrears: PatientArrears | null;
};

export type TransferInfo = {
  centerLabel: string;
  titular: string;
  banco: string;
  clabe: string;
  cuenta?: string;
  concepto: string;
};

export const STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDIENTE: "Pendiente",
  PAGADO: "Pagado",
  PARCIAL: "Parcial",
  DEUDA: "Deuda",
  PAUSA_VACACIONES: "Pauso/Vacaciones",
};

export const MONTHLY_BILLING_LABEL: Record<MonthlyBillingStatus, string> = {
  NORMAL: "Cobra mensualidad",
  NO_INTEGRADO: "No se integró a terapia",
};

export function statusClasses(status: PaymentStatus): string {
  switch (status) {
    case "PAGADO":
      return "bg-success/15 text-success border-success/30";
    case "PARCIAL":
      return "bg-warning/15 text-warning border-warning/30";
    case "PENDIENTE":
    case "DEUDA":
      return "bg-danger/15 text-danger border-danger/30";
    case "PAUSA_VACACIONES":
      return "bg-info/15 text-info border-info/30";
    default:
      return "bg-surface text-subtle border-border";
  }
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

export function formatMoney(pesos: number | null | undefined): string {
  if (pesos == null) return "—";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(pesos);
}

/** Badge secundario para adeudo de meses anteriores (mismo tono que deuda, más pequeño). */
export function arrearsBadgeClasses(): string {
  return "bg-danger/15 text-danger border-danger/30";
}
