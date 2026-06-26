"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { downloadCsv } from "@/lib/csv-download";
import { openDataUrlInNewTab } from "@/lib/open-data-url";
import {
  formatMoney,
  monthLabel,
  statusClasses,
  STATUS_LABEL,
  type PaymentRow,
  type PaymentStatus,
} from "@/components/payments/payment-helpers";

type PaymentsView = {
  billing: { sessionsPerWeek: number | null; discountPercent: number; suggestedMonthly: number | null };
  totals: { totalPaid: number; outstanding: number };
  payments: PaymentRow[];
};

const STATUS_OPTIONS: PaymentStatus[] = ["PENDIENTE", "PAGADO", "PARCIAL", "DEUDA"];

const now = new Date();

export function AdminPaymentsPanel({ patientId }: { patientId: string }) {
  const [data, setData] = useState<PaymentsView | null>(null);
  const [msg, setMsg] = useState("");

  const [sessionsPerWeek, setSessionsPerWeek] = useState<string>("");
  const [discountPercent, setDiscountPercent] = useState<string>("0");

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [amountDue, setAmountDue] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [status, setStatus] = useState<PaymentStatus>("PENDIENTE");
  const [paidAt, setPaidAt] = useState("");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const reload = useCallback(async () => {
    const res = (await apiFetch(`/patients/${patientId}/payments`)) as PaymentsView;
    setData(res);
    setSessionsPerWeek(res.billing.sessionsPerWeek ? String(res.billing.sessionsPerWeek) : "");
    setDiscountPercent(String(res.billing.discountPercent ?? 0));
    if (!amountDue) setAmountDue(res.billing.suggestedMonthly != null ? String(res.billing.suggestedMonthly) : "");
  }, [patientId, amountDue]);

  useEffect(() => {
    void reload().catch((e: unknown) => setMsg(e instanceof Error ? e.message : "Error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function onSaveBilling() {
    setMsg("");
    try {
      const res = await apiFetch(`/admin/patients/${patientId}/billing`, {
        method: "PATCH",
        body: JSON.stringify({
          sessionsPerWeek: sessionsPerWeek ? Number(sessionsPerWeek) : 0,
          discountPercent: Number(discountPercent) || 0,
        }),
      });
      setMsg(`✅ Cobro guardado · Mensualidad sugerida: ${res.suggestedMonthly != null ? formatMoney(res.suggestedMonthly) : "—"}`);
      await reload();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  function loadRow(p: PaymentRow) {
    setYear(p.periodYear);
    setMonth(p.periodMonth);
    setAmountDue(String(p.amountDue));
    setAmountPaid(String(p.amountPaid));
    setStatus(p.status);
    setPaidAt(p.paidAt ? p.paidAt.slice(0, 10) : "");
    setMethod(p.method ?? "");
    setReference(p.reference ?? "");
    setNotes(p.notes ?? "");
  }

  async function onSaveMonth() {
    setMsg("");
    try {
      await apiFetch(`/admin/patients/${patientId}/payments/${year}/${month}`, {
        method: "PUT",
        body: JSON.stringify({
          amountDue: amountDue === "" ? undefined : Number(amountDue),
          amountPaid: amountPaid === "" ? undefined : Number(amountPaid),
          status,
          paidAt: paidAt || undefined,
          method: method || undefined,
          reference: reference || undefined,
          notes: notes || undefined,
        }),
      });
      setMsg("✅ Mensualidad guardada");
      await reload();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  async function quickPaid(p: PaymentRow) {
    setMsg("");
    try {
      await apiFetch(`/admin/patients/${patientId}/payments/${p.periodYear}/${p.periodMonth}`, {
        method: "PUT",
        body: JSON.stringify({
          status: "PAGADO",
          amountPaid: p.amountDue,
          paidAt: new Date().toISOString().slice(0, 10),
        }),
      });
      await reload();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  async function exportChild() {
    setMsg("");
    try {
      const rows = (await apiFetch(`/admin/payments/export?patientId=${patientId}`)) as Record<string, unknown>[];
      downloadCsv(`pagos-paciente-${patientId.slice(0, 8)}`, rows);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error al exportar");
    }
  }

  async function viewReceipt(p: PaymentRow) {
    try {
      const res = (await apiFetch(`/patients/${patientId}/payments/${p.id}/receipt`)) as {
        dataUrl: string;
        fileName: string;
      };
      openDataUrlInNewTab(res.dataUrl, "", res.fileName);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "No se pudo abrir el comprobante");
    }
  }

  return (
    <section className="card space-y-5 border-l-4 border-l-accent-green">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Mensualidades y pagos</h2>
        <button type="button" className="btn rounded-lg px-3 py-1.5 text-xs" onClick={() => void exportChild()}>
          Exportar (CSV)
        </button>
      </div>

      {msg ? <p className={`text-sm ${msg.includes("✅") ? "text-success" : "text-danger"}`}>{msg}</p> : null}

      {/* Configuración de cobro */}
      <div className="space-y-3 rounded-xl border border-border bg-surface/50 p-4">
        <h3 className="text-sm font-bold">Configuración de cobro</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm">
            <span className="text-subtle">Frecuencia</span>
            <select className="select w-auto" value={sessionsPerWeek} onChange={(e) => setSessionsPerWeek(e.target.value)}>
              <option value="">Sin definir</option>
              <option value="1">1 vez/semana</option>
              <option value="2">2 veces/semana</option>
              <option value="3">3 veces/semana</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-subtle">Descuento (%)</span>
            <input
              className="input w-28"
              type="number"
              min={0}
              max={100}
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
            />
          </label>
          <button type="button" className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold" onClick={() => void onSaveBilling()}>
            Guardar cobro
          </button>
          {data?.billing.suggestedMonthly != null ? (
            <span className="text-sm text-subtle">
              Mensualidad sugerida: <strong className="text-ink">{formatMoney(data.billing.suggestedMonthly)}</strong>
            </span>
          ) : null}
        </div>
      </div>

      {/* Editor de mes */}
      <div className="space-y-3 rounded-xl border border-border bg-surface/50 p-4">
        <h3 className="text-sm font-bold">Registrar / editar mensualidad</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-subtle">Año</span>
            <input className="input" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-subtle">Mes</span>
            <select className="select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i, 1).toLocaleDateString("es-MX", { month: "long" })}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-subtle">Monto a pagar</span>
            <input className="input" type="number" value={amountDue} onChange={(e) => setAmountDue(e.target.value)} placeholder="Proporcional o mensualidad" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-subtle">Monto pagado</span>
            <input className="input" type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-subtle">Estado</span>
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-subtle">Fecha de pago</span>
            <input className="input" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-subtle">Forma de pago</span>
            <input className="input" value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Transferencia, efectivo…" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-subtle">Referencia</span>
            <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="text-subtle">Notas</span>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. proporcional por enfermedad" />
          </label>
        </div>
        <button type="button" className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold" onClick={() => void onSaveMonth()}>
          Guardar mensualidad
        </button>
      </div>

      {/* Lista de meses */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold">Historial</h3>
        {!data?.payments.length ? (
          <p className="text-sm text-subtle">Sin mensualidades registradas.</p>
        ) : (
          <ul className="space-y-2">
            {data.payments.map((p) => {
              const saldo = Math.max(p.amountDue - p.amountPaid, 0);
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium capitalize">{monthLabel(p.periodYear, p.periodMonth)}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClasses(p.status)}`}>
                      {STATUS_LABEL[p.status]}
                    </span>
                    <span className="text-subtle">
                      {formatMoney(p.amountPaid)} / {formatMoney(p.amountDue)}
                      {saldo > 0 ? ` · saldo ${formatMoney(saldo)}` : ""}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    {p.receiptName ? (
                      <button type="button" className="text-xs text-info hover:underline" onClick={() => void viewReceipt(p)}>
                        Ver comprobante
                      </button>
                    ) : null}
                    {p.status !== "PAGADO" ? (
                      <button type="button" className="rounded-lg border border-success/40 px-2 py-1 text-xs text-success hover:bg-success/10" onClick={() => void quickPaid(p)}>
                        Marcar pagado
                      </button>
                    ) : null}
                    <button type="button" className="btn rounded-lg px-2 py-1 text-xs" onClick={() => loadRow(p)}>
                      Editar
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
