"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  ParentFollowUpSummaryCard,
  type ParentFollowUpCardData,
} from "@/components/followups/ParentFollowUpSummaryCard";

type SummaryResponse = {
  patient: { id: string; firstName: string; lastName: string };
  periodYear: number;
  periodMonth: number;
  followUps: ParentFollowUpCardData[];
};

export default function ParentPatientFollowUpsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const patientId = params.id;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!roles.includes("PARENT")) return router.replace("/dashboard");

    (async () => {
      setMsg("");
      try {
        const res = await apiFetch(`/parent/patients/${patientId}/followups/summary?year=${year}&month=${month}`);
        setData(res);
      } catch (e: unknown) {
        setMsg(e instanceof Error ? e.message : "Error");
        setData(null);
      }
    })();
  }, [router, patientId, year, month]);

  const monthLabel = data
    ? new Date(data.periodYear, data.periodMonth - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" })
    : "";

  return (
    <main className="max-w-[720px] space-y-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Progreso del mes</h1>
          {data ? (
            <p className="mt-1 text-sm text-subtle">
              {data.patient.firstName} {data.patient.lastName} · {monthLabel}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-subtle">Vista informativa · solo lectura</p>
        </div>
        <Link className="btn rounded-xl px-3 py-2 text-sm" href={`/parent/patients/${patientId}`}>
          ← Volver
        </Link>
      </div>

      <section className="card flex flex-wrap gap-3">
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
      </section>

      {msg ? <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{msg}</p> : null}

      {!data && !msg ? <p className="text-subtle">Cargando resumen…</p> : null}

      {data?.followUps.length === 0 ? (
        <section className="card text-center text-sm text-subtle">
          <p>No hay seguimientos publicados para este mes.</p>
          <p className="mt-2">Su terapeuta aún no ha registrado información en este periodo.</p>
        </section>
      ) : (
        <div className="space-y-6">
          {data?.followUps.map((fu) => <ParentFollowUpSummaryCard key={fu.followUpId} data={fu} />)}
        </div>
      )}
    </main>
  );
}
