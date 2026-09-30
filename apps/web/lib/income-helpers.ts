export type IncomeConcept =
  | "MENSUALIDAD"
  | "EVALUACION"
  | "REVALORACION"
  | "SESION_INDIVIDUAL"
  | "VISITA_ESCUELA"
  | "PROTEINA"
  | "OTRO";

export type IncomeMethod =
  | "EFECTIVO"
  | "BANORTE_TRANSFERENCIA"
  | "BANORTE_TERMINAL"
  | "STP"
  | "MERCADO_PAGO_TRANSFERENCIA"
  | "MERCADO_PAGO_TERMINAL"
  | "OTRO";

export const INCOME_CONCEPT_LABEL: Record<IncomeConcept, string> = {
  MENSUALIDAD: "Mensualidad",
  EVALUACION: "Evaluación",
  REVALORACION: "Revaloración",
  SESION_INDIVIDUAL: "Sesión individual",
  VISITA_ESCUELA: "Visita a escuela",
  PROTEINA: "Proteína",
  OTRO: "Otro",
};

export const INCOME_METHOD_LABEL: Record<IncomeMethod, string> = {
  EFECTIVO: "Efectivo",
  BANORTE_TRANSFERENCIA: "Banorte transferencia",
  BANORTE_TERMINAL: "Banorte terminal",
  STP: "STP",
  MERCADO_PAGO_TRANSFERENCIA: "Mercado Pago transferencia",
  MERCADO_PAGO_TERMINAL: "Mercado Pago terminal",
  OTRO: "Otro",
};

export const INCOME_CONCEPTS = Object.keys(INCOME_CONCEPT_LABEL) as IncomeConcept[];
export const INCOME_METHODS = Object.keys(INCOME_METHOD_LABEL) as IncomeMethod[];

export function labelIncomeConcept(concept: string): string {
  return INCOME_CONCEPT_LABEL[concept as IncomeConcept] ?? concept;
}

export function labelIncomeMethod(method: string): string {
  return INCOME_METHOD_LABEL[method as IncomeMethod] ?? method;
}

export function conceptRequiresPatient(concept: IncomeConcept): boolean {
  return concept === "MENSUALIDAD" || concept === "SESION_INDIVIDUAL";
}

export function conceptRequiresPeriod(concept: IncomeConcept): boolean {
  return conceptRequiresPatient(concept);
}

export function formatShortDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("es-MX", { day: "numeric", month: "short" })
    .replace(/\./g, "");
}

export function joinEntryDates(dates: string[]): string {
  return dates.map(formatShortDate).join(" / ") || "—";
}

export function joinEntryMethods(methods: string[]): string {
  const labels = [...new Set(methods.map(labelIncomeMethod))];
  return labels.join(" / ") || "—";
}

export type IncomeEntryRow = {
  id: string;
  center: string;
  receivedAt: string;
  concept: IncomeConcept;
  patientId: string | null;
  payerName: string | null;
  amount: number | string;
  periodYear: number | null;
  periodMonth: number | null;
  method: IncomeMethod;
  invoiced: boolean;
  notes: string | null;
  patient?: { id: string; firstName: string; lastName: string } | null;
};

export type MonthSheetRow = {
  patientId: string;
  firstName: string;
  lastName: string;
  billingNotes: string | null;
  amountDue: number;
  status: string;
  entries: { receivedAt: string; amount: number; method: string }[];
  totalPaid: number;
  pending: number;
};

export type MonthSheetResponse = {
  periodYear: number;
  periodMonth: number;
  center: string | null;
  totals: { totalDue: number; totalPaid: number };
  rows: MonthSheetRow[];
};
