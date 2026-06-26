"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { prepareFileForUpload } from "@/lib/compress-upload";
import {
  formatMoney,
  monthLabel,
  statusClasses,
  STATUS_LABEL,
  type PaymentRow,
  type TransferInfo,
} from "@/components/payments/payment-helpers";

type PaymentsView = {
  patient: { id: string; firstName: string; lastName: string; center: string };
  billing: { sessionsPerWeek: number | null; discountPercent: number; suggestedMonthly: number | null };
  transferInfo: TransferInfo;
  totals: { totalPaid: number; outstanding: number };
  payments: PaymentRow[];
};

export default function ParentPaymentsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const patientId = params.id;
  const [data, setData] = useState<PaymentsView | null>(null);
  const [msg, setMsg] = useState("");
  const [busyMonth, setBusyMonth] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingMonth = useRef<{ year: number; month: number } | null>(null);

  const reload = useCallback(async () => {
    const res = (await apiFetch(`/patients/${patientId}/payments`)) as PaymentsView;
    setData(res);
  }, [patientId]);

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");
    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!roles.includes("PARENT")) return router.replace("/dashboard");
    void reload().catch((e: unknown) => setMsg(e instanceof Error ? e.message : "Error"));
  }, [router, reload]);

  function pickReceipt(year: number, month: number) {
    pendingMonth.current = { year, month };
    fileInputRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const target = pendingMonth.current;
    e.target.value = "";
    if (!file || !target) return;
    const key = `${target.year}-${target.month}`;
    setBusyMonth(key);
    setMsg("");
    try {
      const prepared = await prepareFileForUpload(file);
      await apiFetch(`/patients/${patientId}/payments/${target.year}/${target.month}/receipt`, {
        method: "POST",
        body: JSON.stringify({
          fileName: prepared.fileName,
          mimeType: prepared.mimeType,
          dataUrl: prepared.dataUrl,
        }),
      });
      setMsg("✅ Comprobante enviado. El centro lo revisará.");
      await reload();
    } catch (ex: unknown) {
      setMsg(ex instanceof Error ? ex.message : "Error al subir comprobante");
    } finally {
      setBusyMonth(null);
    }
  }

  return (
    <main className="container max-w-[760px] space-y-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Mensualidades</h1>
        <Link className="btn rounded-xl px-3 py-2 text-sm" href={`/parent/patients/${patientId}`}>
          ← Volver
        </Link>
      </div>

      {msg ? <p className={`text-sm ${msg.includes("✅") ? "text-success" : "text-danger"}`}>{msg}</p> : null}
      {!data && !msg ? <p className="text-subtle">Cargando…</p> : null}

      {data ? (
        <>
          <section className="card grid gap-4 border-l-4 border-l-primary sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-subtle">Saldo pendiente</p>
              <p className={`text-3xl font-bold ${data.totals.outstanding > 0 ? "text-danger" : "text-success"}`}>
                {formatMoney(data.totals.outstanding)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-subtle">Total pagado (histórico)</p>
              <p className="text-3xl font-bold text-ink">{formatMoney(data.totals.totalPaid)}</p>
            </div>
          </section>

          {data.totals.outstanding > 0 ? (
            <section className="card space-y-2 border-l-4 border-l-info text-sm">
              <h2 className="text-lg font-semibold">Datos para transferencia</h2>
              <p className="text-subtle">{data.transferInfo.centerLabel}</p>
              <ul className="space-y-1">
                <li><span className="text-subtle">Titular:</span> <strong>{data.transferInfo.titular}</strong></li>
                <li><span className="text-subtle">Banco:</span> {data.transferInfo.banco}</li>
                <li><span className="text-subtle">CLABE:</span> <strong>{data.transferInfo.clabe}</strong></li>
                {data.transferInfo.cuenta ? (
                  <li><span className="text-subtle">Cuenta:</span> {data.transferInfo.cuenta}</li>
                ) : null}
                <li>
                  <span className="text-subtle">Concepto:</span>{" "}
                  <strong>{data.patient.firstName} {data.patient.lastName}</strong>
                </li>
              </ul>
              <p className="text-xs text-subtle">
                Después de pagar, sube tu comprobante en el mes correspondiente.
              </p>
            </section>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Historial por mes</h2>
            {data.payments.length === 0 ? (
              <p className="card text-sm text-subtle">Aún no hay mensualidades registradas.</p>
            ) : (
              <ul className="space-y-3">
                {data.payments.map((p) => {
                  const key = `${p.periodYear}-${p.periodMonth}`;
                  const saldo = Math.max(p.amountDue - p.amountPaid, 0);
                  return (
                    <li key={p.id} className="card space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold capitalize">{monthLabel(p.periodYear, p.periodMonth)}</span>
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClasses(p.status)}`}>
                          {STATUS_LABEL[p.status]}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-subtle">
                        <span>Mensualidad: <strong className="text-ink">{formatMoney(p.amountDue)}</strong></span>
                        <span>Pagado: <strong className="text-ink">{formatMoney(p.amountPaid)}</strong></span>
                        {saldo > 0 ? <span>Saldo: <strong className="text-danger">{formatMoney(saldo)}</strong></span> : null}
                        {p.paidAt ? <span>Fecha: {new Date(p.paidAt).toLocaleDateString("es-MX")}</span> : null}
                      </div>
                      {p.notes ? <p className="text-xs text-subtle">{p.notes}</p> : null}
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <button
                          type="button"
                          className="btn rounded-lg px-3 py-1.5 text-xs"
                          disabled={busyMonth === key}
                          onClick={() => pickReceipt(p.periodYear, p.periodMonth)}
                        >
                          {busyMonth === key ? "Subiendo…" : p.receiptName ? "Reemplazar comprobante" : "Subir comprobante"}
                        </button>
                        {p.receiptName ? (
                          <span className="text-xs text-success">✓ Comprobante enviado</span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*,.pdf,application/pdf"
            className="sr-only"
            onChange={(e) => void onFile(e)}
          />
        </>
      ) : null}
    </main>
  );
}
