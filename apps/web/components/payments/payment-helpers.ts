export type PaymentStatus = "PENDIENTE" | "PAGADO" | "PARCIAL" | "DEUDA";

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
};

export function statusClasses(status: PaymentStatus): string {
  switch (status) {
    case "PAGADO":
      return "bg-success/15 text-success border-success/30";
    case "PARCIAL":
      return "bg-warning/15 text-warning border-warning/30";
    case "DEUDA":
      return "bg-danger/15 text-danger border-danger/30";
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
