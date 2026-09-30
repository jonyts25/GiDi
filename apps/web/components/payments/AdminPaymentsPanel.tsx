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
  MONTHLY_BILLING_LABEL,
  type MonthlyBillingStatus,
  type PaymentRow,
} from "@/components/payments/payment-helpers";
import { GIDI_CENTER_OPTIONS } from "@/lib/centers";
import { suggestedMonthly } from "@/lib/payment-rates";
import { formatShortDate } from "@/lib/income-helpers";

type PaymentsView = {
  patient: { id: string; firstName: string; lastName: string; center: string };
  billing: {
    sessionsPerWeek: number | null;
    discountPercent: number;
    suggestedMonthly: number | null;
    monthlyBillingStatus: MonthlyBillingStatus;
  };
  totals: { outstanding: number };
  payments: PaymentRow[];
};

export function AdminPaymentsPanel({ patientId }: { patientId: string }) {
  const [data, setData] = useState<PaymentsView | null>(null);
  const [msg, setMsg] = useState("");

  const [sessionsPerWeek, setSessionsPerWeek] = useState<string>("");
  const [discountPercent, setDiscountPercent] = useState<string>("0");
  const [center, setCenter] = useState<string>("SAN_AGUSTIN");
  const [monthlyBillingStatus, setMonthlyBillingStatus] = useState<MonthlyBillingStatus>("NORMAL");

  const reload = useCallback(async () => {
    const res = (await apiFetch(`/patients/${patientId}/payments`)) as PaymentsView;
    setData(res);
    setSessionsPerWeek(
      res.billing.sessionsPerWeek === 0
        ? "0"
        : res.billing.sessionsPerWeek
          ? String(res.billing.sessionsPerWeek)
          : "",
    );
    setDiscountPercent(String(res.billing.discountPercent ?? 0));
    setCenter(res.patient.center);
    setMonthlyBillingStatus(res.billing.monthlyBillingStatus ?? "NORMAL");
  }, [patientId]);

  useEffect(() => {
    void reload().catch((e: unknown) => setMsg(e instanceof Error ? e.message : "Error"));
  }, [patientId, reload]);

  async function onSaveBilling() {
    setMsg("");
    try {
      const res = await apiFetch(`/admin/patients/${patientId}/billing`, {
        method: "PATCH",
        body: JSON.stringify({
          sessionsPerWeek: sessionsPerWeek === "" ? null : Number(sessionsPerWeek),
          discountPercent: Number(discountPercent) || 0,
          center,
          monthlyBillingStatus,
        }),
      });
      setMsg(
        `✅ Cobro guardado · Mensualidad sugerida: ${
          res.suggestedMonthly != null ? formatMoney(res.suggestedMonthly) : sessionsPerWeek === "0" ? "pago por sesión (variable)" : "—"
        }`,
      );
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

  const liveSuggested =
    sessionsPerWeek && sessionsPerWeek !== "0"
      ? suggestedMonthly(Number(sessionsPerWeek), Number(discountPercent) || 0)
      : null;

  return (
    <section className="card space-y-5 border-l-4 border-l-accent-green">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Mensualidades y pagos</h2>
        <button type="button" className="btn rounded-lg px-3 py-1.5 text-xs" onClick={() => void exportChild()}>
          Exportar (CSV)
        </button>
      </div>

      {msg ? <p className={`text-sm ${msg.includes("✅") ? "text-success" : "text-danger"}`}>{msg}</p> : null}

      <div className="space-y-3 rounded-xl border border-border bg-surface/50 p-4">
        <h3 className="text-sm font-bold">Configuración de cobro</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm">
            <span className="text-subtle">Estado de mensualidad</span>
            <select
              className="select w-auto min-w-[14rem]"
              value={monthlyBillingStatus}
              onChange={(e) => setMonthlyBillingStatus(e.target.value as MonthlyBillingStatus)}
            >
              {(Object.keys(MONTHLY_BILLING_LABEL) as MonthlyBillingStatus[]).map((k) => (
                <option key={k} value={k}>{MONTHLY_BILLING_LABEL[k]}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-subtle">Sede</span>
            <select className="select w-auto" value={center} onChange={(e) => setCenter(e.target.value)}>
              {GIDI_CENTER_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-subtle">Frecuencia</span>
            <select className="select w-auto" value={sessionsPerWeek} onChange={(e) => setSessionsPerWeek(e.target.value)}>
              <option value="">Sin definir</option>
              <option value="1">1 vez/semana</option>
              <option value="2">2 veces/semana</option>
              <option value="3">3 veces/semana</option>
              <option value="0">Pago por sesión (variable)</option>
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
              disabled={sessionsPerWeek === "0"}
            />
          </label>
          <button type="button" className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold" onClick={() => void onSaveBilling()}>
            Guardar cobro
          </button>
          {sessionsPerWeek === "0" ? (
            <span className="text-sm text-subtle">Monto variable por sesión.</span>
          ) : liveSuggested != null ? (
            <span className="text-sm text-subtle">
              Mensualidad sugerida: <strong className="text-ink">{formatMoney(liveSuggested)}</strong>
            </span>
          ) : data?.billing.suggestedMonthly != null ? (
            <span className="text-sm text-subtle">
              Mensualidad sugerida: <strong className="text-ink">{formatMoney(data.billing.suggestedMonthly)}</strong>
            </span>
          ) : null}
        </div>
        {monthlyBillingStatus === "NO_INTEGRADO" ? (
          <p className="text-sm text-subtle">
            Este paciente no aparecerá en el control de ingresos mensuales, pero sigue activo en el sistema.
          </p>
        ) : null}
      </div>

      {monthlyBillingStatus === "NO_INTEGRADO" ? null : (
        <div className="space-y-2">
          <h3 className="text-sm font-bold">Historial</h3>
          {!data?.payments.length ? (
            <p className="text-sm text-subtle">Sin mensualidades registradas.</p>
          ) : (
            <ul className="space-y-3">
              {data.payments.map((p) => {
                const saldo = Math.max(p.amountDue - p.amountPaid, 0);
                return (
                  <li key={p.id} className="rounded-lg border border-border px-3 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium capitalize">{monthLabel(p.periodYear, p.periodMonth)}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClasses(p.status)}`}>
                        {STATUS_LABEL[p.status]}
                      </span>
                      <span className="text-subtle">
                        {formatMoney(p.amountPaid)} / {formatMoney(p.amountDue)}
                        {saldo > 0 ? ` · pendiente ${formatMoney(saldo)}` : ""}
                      </span>
                      {p.receiptName ? (
                        <button type="button" className="text-xs text-info hover:underline" onClick={() => void viewReceipt(p)}>
                          Ver comprobante
                        </button>
                      ) : null}
                    </div>
                    {p.entries && p.entries.length > 0 ? (
                      <ul className="mt-2 space-y-1 border-t border-border pt-2 text-xs text-subtle">
                        {p.entries.map((entry, idx) => (
                          <li key={`${p.id}-${idx}`}>
                            {formatShortDate(entry.receivedAt)} · {formatMoney(entry.amount)} · {entry.method}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {p.notes ? <p className="mt-2 text-xs text-subtle">{p.notes}</p> : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
