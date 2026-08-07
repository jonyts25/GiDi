"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { downloadCsv } from "@/lib/csv-download";
import { SearchInput, filterByQuery } from "@/components/ui/SearchInput";
import { canViewRevenueOverview, hasFullAdminRole } from "@/lib/role-permissions";
import {
  formatMoney,
  statusClasses,
  STATUS_LABEL,
  type PaymentRow,
  type PaymentStatus,
} from "@/components/payments/payment-helpers";
import { GIDI_CENTER_OPTIONS, labelForCenter } from "@/lib/centers";

type OverviewRow = PaymentRow & {
  patient: { id: string; firstName: string; lastName: string; center: string };
};

type Overview = {
  periodYear: number;
  periodMonth: number;
  totals: {
    totalDue: number;
    totalPaid: number;
    outstanding: number;
    count: number;
    byStatus: Record<string, number>;
  };
  payments: OverviewRow[];
};

const STATUS_OPTIONS: PaymentStatus[] = ["PENDIENTE", "PAGADO", "PARCIAL", "DEUDA", "PAUSA_VACACIONES"];

const now = new Date();

export default function AdminPaymentsOverviewPage() {
  const router = useRouter();
  const [myRoles, setMyRoles] = useState<string[]>([]);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [center, setCenter] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Overview | null>(null);
  const [msg, setMsg] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const isAdmin = hasFullAdminRole(myRoles);

  const filteredPayments = useMemo(
    () => {
      const byCenter = center
        ? data?.payments.filter((p) => p.patient.center === center) ?? []
        : data?.payments ?? [];
      return filterByQuery(byCenter, query, (p) => `${p.patient.firstName} ${p.patient.lastName}`);
    },
    [data, query, center],
  );

  const displayTotals = useMemo(() => {
    const payments = center
      ? data?.payments.filter((p) => p.patient.center === center) ?? []
      : data?.payments ?? [];
    const totalDue = payments.reduce((a, p) => a + p.amountDue, 0);
    const totalPaid = payments.reduce((a, p) => a + p.amountPaid, 0);
    const byStatus: Record<string, number> = {};
    for (const p of payments) byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
    return {
      totalDue,
      totalPaid,
      outstanding: Math.max(totalDue - totalPaid, 0),
      count: payments.length,
      byStatus,
    };
  }, [data, center]);

  async function exportCsv(scope: "month" | "all" | "center") {
    setMsg("");
    try {
      const params = new URLSearchParams();
      if (scope === "month") {
        params.set("year", String(year));
        params.set("month", String(month));
      }
      if (scope === "center" && center) params.set("center", center);
      const rows = (await apiFetch(`/admin/payments/export?${params.toString()}`)) as Record<string, unknown>[];
      const label =
        scope === "month"
          ? `${year}-${String(month).padStart(2, "0")}`
          : scope === "center"
            ? (center || "todos").toLowerCase()
            : "historico-completo";
      downloadCsv(`pagos-${label}`, rows);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error al exportar");
    }
  }

  const reload = useCallback(async () => {
    setMsg("");
    try {
      const params = new URLSearchParams({ year: String(year), month: String(month) });
      if (center) params.set("center", center);
      const res = (await apiFetch(`/admin/payments?${params.toString()}`)) as Overview;
      setData(res);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }, [year, month, center]);

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");
    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    setMyRoles(roles);
    if (!canViewRevenueOverview(roles)) return router.replace("/dashboard");
    void reload();
  }, [router, reload]);

  async function onChangeStatus(p: OverviewRow, next: PaymentStatus) {
    if (!isAdmin) return;
    setSavingId(p.id);
    setMsg("");
    try {
      await apiFetch(`/admin/patients/${p.patient.id}/payments/${p.periodYear}/${p.periodMonth}`, {
        method: "PUT",
        body: JSON.stringify({
          status: next,
          amountDue: p.amountDue,
          amountPaid: next === "PAGADO" ? p.amountDue : next === "PAUSA_VACACIONES" ? 0 : p.amountPaid,
          ...(next === "PAGADO" && !p.paidAt ? { paidAt: new Date().toISOString().slice(0, 10) } : {}),
        }),
      });
      await reload();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error al actualizar estado");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="container max-w-[1000px] space-y-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Control de ingresos</h1>
          <p className="text-sm text-subtle">Mensualidades por mes y estado de pago.</p>
        </div>
        <Link className="btn rounded-xl px-3 py-2 text-sm" href="/dashboard">← Volver</Link>
      </div>

      <section className="card flex flex-wrap items-end gap-3">
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
        <label className="grid gap-1 text-sm">
          <span className="text-subtle">Sede</span>
          <select className="select w-40" value={center} onChange={(e) => setCenter(e.target.value)}>
            <option value="">Todas</option>
            {GIDI_CENTER_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn rounded-xl px-3 py-2 text-sm" onClick={() => void exportCsv("month")}>
            Exportar mes
          </button>
          <button type="button" className="btn rounded-xl px-3 py-2 text-sm" onClick={() => void exportCsv("center")} disabled={!center}>
            Exportar sede (todo)
          </button>
          <button type="button" className="btn rounded-xl px-3 py-2 text-sm" onClick={() => void exportCsv("all")}>
            Exportar histórico completo
          </button>
        </div>
      </section>

      {msg ? <p className="text-sm text-danger">{msg}</p> : null}

      {data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="card">
              <p className="text-xs uppercase tracking-wide text-subtle">Cobrado</p>
              <p className="text-2xl font-bold text-success">{formatMoney(displayTotals.totalPaid)}</p>
            </div>
            <div className="card">
              <p className="text-xs uppercase tracking-wide text-subtle">Esperado</p>
              <p className="text-2xl font-bold text-ink">{formatMoney(displayTotals.totalDue)}</p>
            </div>
            <div className="card">
              <p className="text-xs uppercase tracking-wide text-subtle">Pendiente</p>
              <p className="text-2xl font-bold text-danger">{formatMoney(displayTotals.outstanding)}</p>
            </div>
          </section>

          <section className="card space-y-3 overflow-x-auto">
            <SearchInput value={query} onChange={setQuery} placeholder="Buscar paciente por nombre…" />
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-subtle">
                  <th className="py-2 pr-3">Paciente</th>
                  <th className="py-2 pr-3">Sede</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Pagado</th>
                  <th className="py-2 pr-3">Mensualidad</th>
                  <th className="py-2 pr-3">Comprobante</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr><td colSpan={6} className="py-3 text-subtle">{data.payments.length === 0 ? "Sin mensualidades este mes." : "Sin coincidencias."}</td></tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="border-b border-border/60">
                      <td className="py-2 pr-3">
                        <Link className="text-info hover:underline" href={`/admin/patients/${p.patient.id}`}>
                          {p.patient.firstName} {p.patient.lastName}
                        </Link>
                      </td>
                      <td className="py-2 pr-3 text-subtle">{labelForCenter(p.patient.center)}</td>
                      <td className="py-2 pr-3">
                        {isAdmin ? (
                          <select
                            className={`select text-xs ${statusClasses(p.status as PaymentStatus)}`}
                            value={p.status}
                            disabled={savingId === p.id}
                            onChange={(e) => void onChangeStatus(p, e.target.value as PaymentStatus)}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClasses(p.status as PaymentStatus)}`}>
                            {STATUS_LABEL[p.status as PaymentStatus]}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3">{formatMoney(p.amountPaid)}</td>
                      <td className="py-2 pr-3">{formatMoney(p.amountDue)}</td>
                      <td className="py-2 pr-3 text-subtle">{p.receiptName ? "✓" : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </main>
  );
}
