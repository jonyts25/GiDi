"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type FollowUpRow = {
  id: string;
  periodYear: number;
  periodMonth: number;
  status: string;
  area: { id: string; name: string };
  patient: { id: string; firstName: string; lastName: string };
  sessions: { id: string }[];
  objectives: { id: string }[];
};

export default function TherapistFollowUpsPage() {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows] = useState<FollowUpRow[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!roles.includes("THERAPIST")) return router.replace("/dashboard");

    (async () => {
      setLoading(true);
      setMsg("");
      try {
        const data = await apiFetch(`/therapist/followups?year=${year}&month=${month}`);
        setRows(data ?? []);
      } catch (e: unknown) {
        setMsg(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [router, year, month]);

  return (
    <main className="max-w-[980px] space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold">Mis seguimientos mensuales</h1>
        <p className="mt-1 text-sm text-subtle">Pacientes asignados · solo puede editar sus propios seguimientos</p>
      </div>

      <section className="card flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          <span className="text-subtle">Año</span>
          <input className="input w-28" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-subtle">Mes</span>
          <select className="select w-32" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
      </section>

      {msg ? <p className="text-sm text-danger">{msg}</p> : null}

      <section className="card">
        {loading ? (
          <p className="text-subtle">Cargando…</p>
        ) : rows.length === 0 ? (
          <div className="space-y-3 text-sm text-subtle">
            <p>No hay seguimientos suyos para este mes.</p>
            <p>
              Abra un paciente en{" "}
              <Link className="font-medium text-primary hover:underline" href="/therapist/patients">
                Mis pacientes
              </Link>{" "}
              y cree un seguimiento por área.
            </p>
          </div>
        ) : (
          <table className="table text-sm">
            <thead>
              <tr className="text-left text-subtle">
                <th>Paciente</th>
                <th>Área</th>
                <th>Sesiones</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">
                    {r.patient.firstName} {r.patient.lastName}
                  </td>
                  <td>{r.area.name}</td>
                  <td>{r.sessions.length}</td>
                  <td>
                    <span className="badge">{r.status}</span>
                  </td>
                  <td>
                    <Link className="btn rounded-lg px-3 py-1.5 text-xs" href={`/therapist/followups/${r.id}`}>
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
