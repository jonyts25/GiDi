"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { downloadCsv } from "@/lib/csv-download";
import {
  formatMoney,
  statusClasses,
  STATUS_LABEL,
  type PaymentRow,
  type PaymentStatus,
} from "@/components/payments/payment-helpers";

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

const now = new Date();

export default function AdminPaymentsOverviewPage() {
  const router = useRouter();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [center, setCenter] = useState("");
  const [data, setData] = useState<Overview | null>(null);
  const [msg, setMsg] = useState("");

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
      const res = (await apiFetch(`/admin/payments?year=${year}&month=${month}`)) as Overview;
      setData(res);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }, [year, month]);

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");
    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!roles.includes("ADMIN")) return router.replace("/dashboard");
    void reload();
  }, [router, reload]);

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
          <span className="text-subtle">Sede (para exportar)</span>
          <select className="select w-40" value={center} onChange={(e) => setCenter(e.target.value)}>
            <option value="">Todas</option>
            <option value="SAN_AGUSTIN">San Agustín</option>
            <option value="VALLARTA">Vallarta</option>
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
              <p className="text-2xl font-bold text-success">{formatMoney(data.totals.totalPaid)}</p>
            </div>
            <div className="card">
              <p className="text-xs uppercase tracking-wide text-subtle">Esperado</p>
              <p className="text-2xl font-bold text-ink">{formatMoney(data.totals.totalDue)}</p>
            </div>
            <div className="card">
              <p className="text-xs uppercase tracking-wide text-subtle">Pendiente</p>
              <p className="text-2xl font-bold text-danger">{formatMoney(data.totals.outstanding)}</p>
            </div>
          </section>

          <section className="card overflow-x-auto">
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
                {data.payments.length === 0 ? (
                  <tr><td colSpan={6} className="py-3 text-subtle">Sin mensualidades este mes.</td></tr>
                ) : (
                  data.payments.map((p) => (
                    <tr key={p.id} className="border-b border-border/60">
                      <td className="py-2 pr-3">
                        <Link className="text-info hover:underline" href={`/admin/patients/${p.patient.id}`}>
                          {p.patient.firstName} {p.patient.lastName}
                        </Link>
                      </td>
                      <td className="py-2 pr-3 text-subtle">{p.patient.center === "VALLARTA" ? "Vallarta" : "San Agustín"}</td>
                      <td className="py-2 pr-3">
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClasses(p.status as PaymentStatus)}`}>
                          {STATUS_LABEL[p.status as PaymentStatus]}
                        </span>
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
