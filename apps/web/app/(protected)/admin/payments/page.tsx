"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { downloadCsv } from "@/lib/csv-download";
import { SearchInput, filterByQuery } from "@/components/ui/SearchInput";
import { IncomeEntryForm, type IncomeFormPrefill } from "@/components/payments/IncomeEntryForm";
import {
  formatMoney,
  statusClasses,
  STATUS_LABEL,
  type PaymentStatus,
} from "@/components/payments/payment-helpers";
import {
  formatShortDate,
  joinEntryDates,
  joinEntryMethods,
  labelIncomeConcept,
  labelIncomeMethod,
  type IncomeConcept,
  type IncomeEntryRow,
  type MonthSheetResponse,
} from "@/lib/income-helpers";
import { GIDI_CENTER_OPTIONS, labelForCenter, type CenterFilter } from "@/lib/centers";
import { canRegisterIncome, canViewRevenueOverview, hasFullAdminRole } from "@/lib/role-permissions";

const now = new Date();

type Tab = "mensualidades" | "ingresos";

function monthRange(year: number, month: number) {
  const from = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const to = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();
  return { from, to };
}

export default function AdminPaymentsOverviewPage() {
  const router = useRouter();
  const [myRoles, setMyRoles] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("mensualidades");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [center, setCenter] = useState<CenterFilter>("SAN_AGUSTIN");
  const [query, setQuery] = useState("");
  const [conceptFilter, setConceptFilter] = useState<"" | IncomeConcept>("");
  const [sheet, setSheet] = useState<MonthSheetResponse | null>(null);
  const [incomeRows, setIncomeRows] = useState<IncomeEntryRow[]>([]);
  const [patients, setPatients] = useState<{ id: string; firstName: string; lastName: string; center?: string }[]>([]);
  const [msg, setMsg] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [incomePrefill, setIncomePrefill] = useState<IncomeFormPrefill | undefined>();
  const [editingIncome, setEditingIncome] = useState<IncomeEntryRow | null>(null);

  const isAdmin = hasFullAdminRole(myRoles);
  const showKpis = canViewRevenueOverview(myRoles);

  const isAllCenters = center === "ALL";

  const centerPatients = useMemo(
    () => (isAllCenters ? patients : patients.filter((p) => !p.center || p.center === center)),
    [patients, center, isAllCenters],
  );

  const patientCenterById = useMemo(
    () => new Map(patients.map((p) => [p.id, p.center])),
    [patients],
  );

  const filteredSheetRows = useMemo(() => {
    const rows = sheet?.rows ?? [];
    return filterByQuery(rows, query, (r) => `${r.firstName} ${r.lastName}`);
  }, [sheet, query]);

  const filteredIncome = useMemo(() => {
    let rows = incomeRows;
    if (conceptFilter) rows = rows.filter((r) => r.concept === conceptFilter);
    return rows;
  }, [incomeRows, conceptFilter]);

  const incomeTotalsByConcept = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of filteredIncome) {
      map.set(row.concept, (map.get(row.concept) ?? 0) + Number(row.amount));
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredIncome]);

  const incomeTotalsByMethod = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of filteredIncome) {
      map.set(row.method, (map.get(row.method) ?? 0) + Number(row.amount));
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredIncome]);

  const reloadSheet = useCallback(async () => {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
    });
    if (!isAllCenters) params.set("center", center);
    const res = (await apiFetch(`/admin/payments/month-sheet?${params.toString()}`)) as MonthSheetResponse;
    setSheet(res);
  }, [year, month, center, isAllCenters]);

  const reloadIncome = useCallback(async () => {
    const { from, to } = monthRange(year, month);
    const params = new URLSearchParams({ from, to });
    if (!isAllCenters) params.set("center", center);
    const rows = (await apiFetch(`/admin/income?${params.toString()}`)) as IncomeEntryRow[];
    setIncomeRows(rows);
  }, [year, month, center, isAllCenters]);

  const reloadAll = useCallback(async () => {
    setMsg("");
    try {
      await Promise.all([reloadSheet(), reloadIncome()]);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error al cargar");
    }
  }, [reloadSheet, reloadIncome]);

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");
    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    setMyRoles(roles);
    if (!canRegisterIncome(roles)) return router.replace("/dashboard");

    void (async () => {
      try {
        const pts = await apiFetch("/patients");
        setPatients(pts);
      } catch {
        /* optional */
      }
    })();
  }, [router]);

  useEffect(() => {
    void reloadAll();
  }, [reloadAll]);

  async function exportCsv(scope: "month" | "all" | "center") {
    setMsg("");
    try {
      const params = new URLSearchParams();
      if (scope === "month") {
        params.set("year", String(year));
        params.set("month", String(month));
      }
      if (scope === "center") params.set("center", center);
      const rows = (await apiFetch(`/admin/payments/export?${params.toString()}`)) as Record<string, unknown>[];
      const label =
        scope === "month"
          ? `${year}-${String(month).padStart(2, "0")}`
          : scope === "center"
            ? center.toLowerCase()
            : "historico-completo";
      downloadCsv(`pagos-${label}`, rows);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error al exportar");
    }
  }

  async function saveBillingNotes(patientId: string, billingNotes: string) {
    const key = `notes-${patientId}`;
    setSavingKey(key);
    try {
      await apiFetch(`/admin/patients/${patientId}/billing-notes`, {
        method: "PATCH",
        body: JSON.stringify({ billingNotes: billingNotes.trim() || null }),
      });
      await reloadSheet();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error al guardar notas");
    } finally {
      setSavingKey(null);
    }
  }

  async function saveAmountDue(patientId: string, amountDue: number) {
    const key = `due-${patientId}`;
    setSavingKey(key);
    try {
      await apiFetch(`/admin/patients/${patientId}/payments/${year}/${month}`, {
        method: "PUT",
        body: JSON.stringify({ amountDue }),
      });
      await reloadAll();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error al guardar monto");
    } finally {
      setSavingKey(null);
    }
  }

  async function setPauseStatus(patientId: string, pause: boolean) {
    const key = `pause-${patientId}`;
    setSavingKey(key);
    try {
      await apiFetch(`/admin/patients/${patientId}/payments/${year}/${month}`, {
        method: "PUT",
        body: JSON.stringify({
          status: pause ? "PAUSA_VACACIONES" : "PENDIENTE",
          amountDue: pause ? 0 : undefined,
        }),
      });
      await reloadAll();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error al actualizar estado");
    } finally {
      setSavingKey(null);
    }
  }

  function openPaymentForm(patientId: string) {
    setEditingIncome(null);
    setIncomePrefill({ patientId, concept: "MENSUALIDAD", periodYear: year, periodMonth: month });
    setShowIncomeForm(true);
    setTab("ingresos");
  }

  function openNewIncome() {
    setEditingIncome(null);
    setIncomePrefill(undefined);
    setShowIncomeForm(true);
  }

  function openEditIncome(row: IncomeEntryRow) {
    setEditingIncome(row);
    setIncomePrefill(undefined);
    setShowIncomeForm(true);
    setTab("ingresos");
  }

  function closeIncomeForm() {
    setShowIncomeForm(false);
    setEditingIncome(null);
    setIncomePrefill(undefined);
  }

  async function onIncomeSaved() {
    closeIncomeForm();
    await reloadAll();
  }

  const sheetTotals = sheet?.totals ?? { totalDue: 0, totalPaid: 0 };
  const pendingTotal = filteredSheetRows.reduce((acc, r) => acc + r.pending, 0);

  return (
    <main className="container max-w-[1200px] space-y-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ingresos</h1>
          <p className="text-sm text-subtle">Hoja mensual de mensualidades y registro de ingresos.</p>
        </div>
        <Link className="btn rounded-xl px-3 py-2 text-sm" href="/dashboard">← Volver</Link>
      </div>

      <section className="card flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          <span className="text-subtle">Sede</span>
          <select className="select w-44" value={center} onChange={(e) => setCenter(e.target.value as CenterFilter)}>
            <option value="ALL">Todas las sedes</option>
            {GIDI_CENTER_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-subtle">Año</span>
          <input className="input w-28" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-subtle">Mes</span>
          <select className="select w-36" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i, 1).toLocaleDateString("es-MX", { month: "long" })}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn rounded-xl px-3 py-2 text-sm" onClick={() => void exportCsv("month")}>
            Exportar mes
          </button>
          {!isAllCenters ? (
            <button type="button" className="btn rounded-xl px-3 py-2 text-sm" onClick={() => void exportCsv("center")}>
              Exportar sede (todo)
            </button>
          ) : null}
          {isAdmin ? (
            <button type="button" className="btn rounded-xl px-3 py-2 text-sm" onClick={() => void exportCsv("all")}>
              Exportar histórico completo
            </button>
          ) : null}
        </div>
      </section>

      {msg ? <p className="text-sm text-danger">{msg}</p> : null}

      {showKpis && sheet ? (
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="card">
            <p className="text-xs uppercase tracking-wide text-subtle">Cobrado (mes)</p>
            <p className="text-2xl font-bold text-success">{formatMoney(sheetTotals.totalPaid)}</p>
          </div>
          <div className="card">
            <p className="text-xs uppercase tracking-wide text-subtle">Esperado (mes)</p>
            <p className="text-2xl font-bold text-ink">{formatMoney(sheetTotals.totalDue)}</p>
          </div>
          <div className="card">
            <p className="text-xs uppercase tracking-wide text-subtle">Pendiente (mes + arrastre)</p>
            <p className="text-2xl font-bold text-danger">{formatMoney(pendingTotal)}</p>
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-border">
        <button
          type="button"
          className={tab === "mensualidades" ? "border-b-2 border-primary px-4 py-2 text-sm font-semibold text-primary" : "px-4 py-2 text-sm text-subtle"}
          onClick={() => setTab("mensualidades")}
        >
          Mensualidades
        </button>
        <button
          type="button"
          className={tab === "ingresos" ? "border-b-2 border-primary px-4 py-2 text-sm font-semibold text-primary" : "px-4 py-2 text-sm text-subtle"}
          onClick={() => setTab("ingresos")}
        >
          Registro de ingresos
        </button>
      </div>

      {tab === "mensualidades" ? (
        <section className="card space-y-3 overflow-x-auto">
          <SearchInput value={query} onChange={setQuery} placeholder="Buscar paciente…" />
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-subtle">
                <th className="py-2 pr-3">Paciente</th>
                {isAllCenters ? <th className="py-2 pr-3">Sede</th> : null}
                <th className="py-2 pr-3">Notas</th>
                <th className="py-2 pr-3">Cuánto deben</th>
                <th className="py-2 pr-3">Revisión</th>
                <th className="py-2 pr-3">Fecha(s) de pago</th>
                <th className="py-2 pr-3">Cantidad pagada</th>
                <th className="py-2 pr-3">Medio de pago</th>
                <th className="py-2 pr-3">Pendiente</th>
                <th className="py-2 pr-3" />
              </tr>
            </thead>
            <tbody>
              {filteredSheetRows.length === 0 ? (
                <tr>
                  <td colSpan={isAllCenters ? 10 : 9} className="py-4 text-subtle">
                    {sheet?.rows.length ? "Sin coincidencias." : "Sin pacientes este mes."}
                  </td>
                </tr>
              ) : (
                filteredSheetRows.map((row) => {
                  const status = row.status as PaymentStatus;
                  const rowBusy = savingKey?.includes(row.patientId) ?? false;
                  return (
                    <tr key={row.patientId} className="border-b border-border/60 align-top">
                      <td className="py-2 pr-3">
                        <Link className="font-medium text-info hover:underline" href={`/admin/patients/${row.patientId}`}>
                          {row.firstName} {row.lastName}
                        </Link>
                      </td>
                      {isAllCenters ? (
                        <td className="py-2 pr-3 text-subtle">
                          {labelForCenter(patientCenterById.get(row.patientId))}
                        </td>
                      ) : null}
                      <td className="py-2 pr-3">
                        <input
                          className="input min-w-[8rem] text-xs"
                          defaultValue={row.billingNotes ?? ""}
                          disabled={rowBusy}
                          onBlur={(e) => {
                            if ((row.billingNotes ?? "") !== e.target.value) {
                              void saveBillingNotes(row.patientId, e.target.value);
                            }
                          }}
                          placeholder="Notas de cobro"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          className="input w-24 text-xs"
                          type="number"
                          min={0}
                          defaultValue={row.amountDue}
                          disabled={rowBusy || status === "PAUSA_VACACIONES"}
                          onBlur={(e) => {
                            const next = Number(e.target.value);
                            if (!Number.isNaN(next) && next !== row.amountDue) {
                              void saveAmountDue(row.patientId, next);
                            }
                          }}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClasses(status)}`}>
                            {STATUS_LABEL[status]}
                          </span>
                          <select
                            className="select text-xs"
                            value={status === "PAUSA_VACACIONES" ? "PAUSA" : "NORMAL"}
                            disabled={rowBusy}
                            onChange={(e) => void setPauseStatus(row.patientId, e.target.value === "PAUSA")}
                          >
                            <option value="NORMAL">Activo</option>
                            <option value="PAUSA">Pausa/vacaciones</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-subtle">
                        {joinEntryDates(row.entries.map((e) => e.receivedAt))}
                      </td>
                      <td className="py-2 pr-3">{formatMoney(row.totalPaid)}</td>
                      <td className="py-2 pr-3 text-subtle">
                        {joinEntryMethods(row.entries.map((e) => e.method))}
                      </td>
                      <td className={`py-2 pr-3 ${row.pending > 0 ? "font-medium text-danger" : "text-subtle"}`}>
                        {formatMoney(row.pending)}
                      </td>
                      <td className="py-2 pr-3">
                        <button
                          type="button"
                          className="btn rounded-lg px-2 py-1 text-xs"
                          onClick={() => openPaymentForm(row.patientId)}
                        >
                          + Pago
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredSheetRows.length > 0 ? (
              <tfoot>
                <tr className="border-t-2 border-border font-semibold">
                  <td className="py-3 pr-3" colSpan={isAllCenters ? 3 : 2}>TOTALES</td>
                  <td className="py-3 pr-3">{formatMoney(sheetTotals.totalDue)}</td>
                  <td className="py-3 pr-3" colSpan={2} />
                  <td className="py-3 pr-3">{formatMoney(sheetTotals.totalPaid)}</td>
                  <td className="py-3 pr-3" />
                  <td className="py-3 pr-3 text-danger">{formatMoney(pendingTotal)}</td>
                  <td />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </section>
      ) : (
        <div className="space-y-4">
          {!showIncomeForm ? (
            <button type="button" className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold" onClick={openNewIncome}>
              Nuevo ingreso
            </button>
          ) : null}

          {showIncomeForm ? (
            <IncomeEntryForm
              pageCenter={center}
              year={year}
              month={month}
              patients={centerPatients}
              prefill={incomePrefill}
              editing={editingIncome}
              canDelete={isAdmin}
              onSaved={() => void onIncomeSaved()}
              onCancel={closeIncomeForm}
            />
          ) : null}

          <section className="card space-y-3 overflow-x-auto">
            <div className="flex flex-wrap items-end gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-subtle">Filtrar por concepto</span>
                <select className="select w-48" value={conceptFilter} onChange={(e) => setConceptFilter(e.target.value as "" | IncomeConcept)}>
                  <option value="">Todos</option>
                  {(["MENSUALIDAD", "EVALUACION", "REVALORACION", "SESION_INDIVIDUAL", "VISITA_ESCUELA", "PROTEINA", "OTRO"] as IncomeConcept[]).map((c) => (
                    <option key={c} value={c}>{labelIncomeConcept(c)}</option>
                  ))}
                </select>
              </label>
            </div>

            <table className="w-full min-w-[880px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-subtle">
                  <th className="py-2 pr-3">Fecha</th>
                  {isAllCenters ? <th className="py-2 pr-3">Sede</th> : null}
                  <th className="py-2 pr-3">Concepto</th>
                  <th className="py-2 pr-3">Paciente / pagador</th>
                  <th className="py-2 pr-3">Monto</th>
                  <th className="py-2 pr-3">Medio</th>
                  <th className="py-2 pr-3">Periodo</th>
                  <th className="py-2 pr-3" />
                </tr>
              </thead>
              <tbody>
                {filteredIncome.length === 0 ? (
                  <tr><td colSpan={isAllCenters ? 8 : 7} className="py-4 text-subtle">Sin ingresos este mes.</td></tr>
                ) : (
                  filteredIncome.map((row) => (
                    <tr key={row.id} className="border-b border-border/60">
                      <td className="py-2 pr-3">{formatShortDate(row.receivedAt)}</td>
                      {isAllCenters ? (
                        <td className="py-2 pr-3 text-subtle">{labelForCenter(row.center)}</td>
                      ) : null}
                      <td className="py-2 pr-3">{labelIncomeConcept(row.concept)}</td>
                      <td className="py-2 pr-3">
                        {row.patient
                          ? `${row.patient.firstName} ${row.patient.lastName}`
                          : row.payerName ?? "—"}
                      </td>
                      <td className="py-2 pr-3">{formatMoney(Number(row.amount))}</td>
                      <td className="py-2 pr-3">{labelIncomeMethod(row.method)}</td>
                      <td className="py-2 pr-3 text-subtle">
                        {row.periodYear && row.periodMonth
                          ? `${row.periodMonth}/${row.periodYear}`
                          : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        <button type="button" className="btn rounded-lg px-2 py-1 text-xs" onClick={() => openEditIncome(row)}>
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          {filteredIncome.length > 0 ? (
            <section className="grid gap-4 sm:grid-cols-2">
              <div className="card space-y-2">
                <h3 className="text-sm font-bold">Totales por concepto</h3>
                <ul className="space-y-1 text-sm">
                  {incomeTotalsByConcept.map(([concept, total]) => (
                    <li key={concept} className="flex justify-between gap-2">
                      <span>{labelIncomeConcept(concept)}</span>
                      <strong>{formatMoney(total)}</strong>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card space-y-2">
                <h3 className="text-sm font-bold">Totales por medio de pago</h3>
                <ul className="space-y-1 text-sm">
                  {incomeTotalsByMethod.map(([method, total]) => (
                    <li key={method} className="flex justify-between gap-2">
                      <span>{labelIncomeMethod(method)}</span>
                      <strong>{formatMoney(total)}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}
        </div>
      )}
    </main>
  );
}
