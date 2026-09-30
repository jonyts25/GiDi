"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../../../lib/api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PatientDocumentsPanel } from "@/components/patients/PatientDocumentsPanel";
import { hasOfficeStaffRole } from "@/lib/role-permissions";
import { labelForCenter } from "@/lib/centers";
import { formatCalendarDate } from "@/lib/date-utils";
import { openDataUrlInNewTab } from "@/lib/open-data-url";
import { resolveTrackingMode } from "@/lib/followup-area";
import {
  formatMoney,
  monthLabel,
  statusClasses,
  STATUS_LABEL,
  type PaymentRow,
  type PaymentStatus,
} from "@/components/payments/payment-helpers";

type FullPatient = {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    birthDate?: string | null;
    notes?: string | null;
    center?: string;
  };
  therapists: {
    therapistId: string;
    fullName: string;
    email: string;
  }[];
};

type DocRow = {
  id: string;
  category: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
  uploadedBy: { fullName: string };
};

type FollowUpRow = {
  id: string;
  periodYear: number;
  periodMonth: number;
  status: string;
  area: { id: string; key: string; name: string; trackingMode?: string | null };
  therapist: { id: string; fullName: string; email: string };
};

type PaymentsView = {
  totals: { outstanding: number };
  payments: PaymentRow[];
};

function followUpStatusLabel(status: string): string {
  return status === "CLOSED" ? "Enviado" : "Borrador";
}

function periodSortDesc(a: FollowUpRow, b: FollowUpRow): number {
  if (a.periodYear !== b.periodYear) return b.periodYear - a.periodYear;
  return b.periodMonth - a.periodMonth;
}

function FollowUpList({ rows }: { rows: FollowUpRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-subtle">Sin seguimientos en este bloque.</p>;
  }

  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
          <span className="min-w-0">
            <strong>{r.area.name}</strong>
            <span className="text-subtle">
              {" "}
              · {monthLabel(r.periodYear, r.periodMonth)} · {r.therapist.fullName} · {followUpStatusLabel(r.status)}
            </span>
          </span>
          <Link className="btn rounded-lg px-2 py-1 text-xs" href={`/admin/followups/${r.id}`}>
            Ver
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function AdminPatientDetail() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [data, setData] = useState<FullPatient | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpRow[]>([]);
  const [payments, setPayments] = useState<PaymentsView | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!hasOfficeStaffRole(roles)) return router.replace("/dashboard");

    (async () => {
      try {
        setMsg("");
        const [full, documents, followups, pay] = await Promise.all([
          apiFetch(`/admin/patients/${id}`),
          apiFetch(`/patients/${id}/documents`),
          apiFetch(`/patients/${id}/followups`),
          apiFetch(`/patients/${id}/payments`),
        ]);

        setData(full);
        setDocs(documents as DocRow[]);
        setFollowUps(followups as FollowUpRow[]);
        setPayments(pay as PaymentsView);
      } catch (e: unknown) {
        setMsg(e instanceof Error ? e.message : "Error al cargar paciente");
      }
    })();
  }, [id, router]);

  const evaluationDoc = useMemo(() => {
    return docs
      .filter((d) => d.category === "EVALUACION")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
  }, [docs]);

  const revaluationDocs = useMemo(() => {
    return docs
      .filter((d) => d.category === "REVALUACION")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [docs]);

  const { adminFollowUps, clinicalFollowUps } = useMemo(() => {
    const sorted = [...followUps].sort(periodSortDesc);
    const admin: FollowUpRow[] = [];
    const clinical: FollowUpRow[] = [];

    for (const row of sorted) {
      if (resolveTrackingMode(row.area) === "TEXT_ONLY") {
        admin.push(row);
      } else {
        clinical.push(row);
      }
    }

    return { adminFollowUps: admin, clinicalFollowUps: clinical };
  }, [followUps]);

  const currentMonthPayment = useMemo(() => {
    if (!payments) return null;
    const now = new Date();
    return (
      payments.payments.find((p) => p.periodYear === now.getFullYear() && p.periodMonth === now.getMonth() + 1) ?? null
    );
  }, [payments]);

  async function openDoc(docId: string) {
    try {
      const file = (await apiFetch(`/patients/${id}/documents/${docId}/file`)) as {
        dataUrl: string;
        fileName: string;
        mimeType: string;
      };
      openDataUrlInNewTab(file.dataUrl, file.mimeType, file.fileName);
    } catch (ex: unknown) {
      setMsg(ex instanceof Error ? ex.message : "No se pudo abrir el archivo");
    }
  }

  if (!data) {
    return <p style={{ padding: 20 }}>{msg || "Cargando..."}</p>;
  }

  const currentMonthPending =
    currentMonthPayment != null
      ? Math.max(currentMonthPayment.amountDue - currentMonthPayment.amountPaid, 0)
      : null;

  const currentMonthStatus: PaymentStatus | null = currentMonthPayment?.status ?? null;

  return (
    <main style={{ maxWidth: 980, margin: "30px auto", fontFamily: "sans-serif", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <button type="button" onClick={() => router.back()}>
          ← Volver
        </button>
      </div>

      <h1 style={{ marginTop: 12 }}>
        {data.patient.firstName} {data.patient.lastName}
      </h1>

      {msg ? <p className="mt-3 text-sm text-danger">{msg}</p> : null}

      <section className="card mt-6 space-y-4 border-l-4 border-l-primary">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">Información esencial</h2>
          <Link className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold" href={`/admin/patients/${id}/edit`}>
            Editar perfil
          </Link>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-subtle">Nombre completo</dt>
            <dd className="font-medium">
              {data.patient.firstName} {data.patient.lastName}
            </dd>
          </div>
          <div>
            <dt className="text-subtle">Fecha de nacimiento</dt>
            <dd className="font-medium">
              {data.patient.birthDate
                ? formatCalendarDate(data.patient.birthDate, { dateStyle: "long" })
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-subtle">Centro</dt>
            <dd className="font-medium">{labelForCenter(data.patient.center)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-subtle">Terapeuta(s) asignado(s)</dt>
            <dd className="font-medium">
              {data.therapists.length === 0 ? (
                <span className="text-subtle">Sin terapeuta asignado</span>
              ) : (
                data.therapists.map((t) => t.fullName).join(", ")
              )}
            </dd>
          </div>
          {data.patient.notes ? (
            <div className="sm:col-span-2">
              <dt className="text-subtle">Notas</dt>
              <dd className="mt-1 whitespace-pre-wrap leading-relaxed">{data.patient.notes}</dd>
            </div>
          ) : null}
        </dl>

        <div className="space-y-3 border-t border-border pt-4">
          <div>
            <h3 className="text-sm font-bold">Reporte de evaluación</h3>
            {evaluationDoc ? (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <span>
                  {evaluationDoc.fileName}
                  <span className="text-subtle">
                    {" "}
                    · {new Date(evaluationDoc.createdAt).toLocaleDateString("es-MX")}
                  </span>
                </span>
                <button type="button" className="btn rounded-lg px-2 py-1 text-xs" onClick={() => void openDoc(evaluationDoc.id)}>
                  Ver
                </button>
              </div>
            ) : (
              <p className="mt-1 text-sm text-subtle">Sin reporte cargado</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold">Revaloraciones</h3>
            {revaluationDocs.length === 0 ? (
              <p className="mt-1 text-sm text-subtle">Sin reporte cargado</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {revaluationDocs.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                    <span>
                      {d.fileName}
                      <span className="text-subtle"> · {new Date(d.createdAt).toLocaleDateString("es-MX")}</span>
                    </span>
                    <button type="button" className="btn rounded-lg px-2 py-1 text-xs" onClick={() => void openDoc(d.id)}>
                      Ver
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Link className="btn" href={`/admin/patients/${id}/dossier`}>
            Expediente integral →
          </Link>
          <Link className="btn" href={`/admin/patients/${id}/followups`}>
            Seguimientos mensuales →
          </Link>
        </div>
      </section>

      <section className="card mt-6 space-y-4 border-l-4 border-l-success">
        <h2 className="text-lg font-semibold">Seguimientos</h2>

        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-bold">Seguimientos administrativos</h3>
            <div className="mt-2">
              <FollowUpList rows={adminFollowUps} />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold">Seguimientos clínicos</h3>
            <div className="mt-2">
              <FollowUpList rows={clinicalFollowUps} />
            </div>
          </div>
        </div>
      </section>

      <section className="card mt-6 space-y-3 border-l-4 border-l-accent-green">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Pagos</h2>
          <Link className="btn rounded-lg px-3 py-1.5 text-xs" href="/admin/payments">
            Ir a pagos →
          </Link>
        </div>

        {!payments ? (
          <p className="text-sm text-subtle">Cargando pagos…</p>
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-subtle">Estado del mes actual</dt>
              <dd className="mt-1">
                {currentMonthStatus ? (
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClasses(currentMonthStatus)}`}>
                    {STATUS_LABEL[currentMonthStatus]}
                  </span>
                ) : (
                  <span className="text-subtle">Sin registro</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-subtle">Pendiente</dt>
              <dd className="mt-1 font-medium">
                {currentMonthPending != null ? formatMoney(currentMonthPending) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-subtle">Deuda acumulada</dt>
              <dd className={`mt-1 font-medium ${payments.totals.outstanding > 0 ? "text-danger" : "text-success"}`}>
                {formatMoney(payments.totals.outstanding)}
              </dd>
            </div>
          </dl>
        )}
      </section>

      <div className="mt-6">
        <PatientDocumentsPanel patientId={id} />
      </div>
    </main>
  );
}
