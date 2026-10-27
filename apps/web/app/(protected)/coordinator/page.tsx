"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { hasCoordinatorRole } from "@/lib/role-permissions";

type TeamPatient = { id: string; firstName: string; lastName: string };
type TeamTherapist = {
  id: string;
  fullName: string;
  email: string;
  patients: TeamPatient[];
};

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export default function CoordinatorTeamPage() {
  const router = useRouter();
  const now = new Date();
  const [team, setTeam] = useState<TeamTherapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [openTherapist, setOpenTherapist] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<{ patientId: string; therapistId: string } | null>(
    null,
  );
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [programs, setPrograms] = useState<{ id: string; periodYear: number; periodMonth: number }[]>([]);
  const [programsLoading, setProgramsLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!hasCoordinatorRole(roles)) return router.replace("/dashboard");

    (async () => {
      try {
        const data = (await apiFetch("/coordinator/team")) as TeamTherapist[];
        setTeam(Array.isArray(data) ? data : []);
      } catch (e: unknown) {
        setMsg(e instanceof Error ? e.message : "Error al cargar equipo");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!selectedPatient) {
      setPrograms([]);
      return;
    }
    setProgramsLoading(true);
    (async () => {
      try {
        const rows = (await apiFetch(
          `/patients/${selectedPatient.patientId}/programs?year=${year}&month=${month}`,
        )) as { id: string; periodYear: number; periodMonth: number; therapistId: string }[];
        setPrograms(
          (Array.isArray(rows) ? rows : []).filter((p) => p.therapistId === selectedPatient.therapistId),
        );
      } catch {
        setPrograms([]);
      } finally {
        setProgramsLoading(false);
      }
    })();
  }, [selectedPatient, year, month]);

  const patientLabel = useMemo(() => {
    if (!selectedPatient) return "";
    for (const t of team) {
      if (t.id !== selectedPatient.therapistId) continue;
      const p = t.patients.find((x) => x.id === selectedPatient.patientId);
      if (p) return `${p.firstName} ${p.lastName}`.trim();
    }
    return "";
  }, [selectedPatient, team]);

  if (loading) {
    return (
      <main className="container py-8">
        <p className="text-subtle">Cargando equipo…</p>
      </main>
    );
  }

  return (
    <main className="container max-w-4xl space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Mi equipo</h1>
        <p className="text-sm text-subtle">Terapeutas coordinadas · programación mensual (solo lectura)</p>
      </div>

      {msg ? <p className="text-sm text-danger">{msg}</p> : null}

      {team.length === 0 ? (
        <p className="text-subtle">No hay terapeutas asignadas a tu coordinación.</p>
      ) : (
        <ul className="space-y-3">
          {team.map((t) => {
            const expanded = openTherapist === t.id;
            return (
              <li key={t.id} className="rounded-xl border border-border bg-card">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  onClick={() => setOpenTherapist(expanded ? null : t.id)}
                >
                  <span>
                    <span className="font-semibold text-ink">{t.fullName}</span>
                    <span className="ml-2 text-sm text-subtle">{t.patients.length} pacientes</span>
                  </span>
                  <span className="text-subtle">{expanded ? "▾" : "▸"}</span>
                </button>
                {expanded ? (
                  <ul className="border-t border-border px-4 py-2">
                    {t.patients.length === 0 ? (
                      <li className="py-2 text-sm text-subtle">Sin pacientes activos</li>
                    ) : (
                      t.patients.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-surface-elevated/60"
                            onClick={() =>
                              setSelectedPatient({ patientId: p.id, therapistId: t.id })
                            }
                          >
                            {p.firstName} {p.lastName}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {selectedPatient ? (
        <section className="card space-y-4">
          <h2 className="text-lg font-semibold">Programación · {patientLabel}</h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-subtle">Año</span>
              <input
                type="number"
                className="input w-28"
                value={year}
                min={2020}
                max={2100}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-subtle">Mes</span>
              <select className="select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {programsLoading ? (
            <p className="text-sm text-subtle">Buscando programación…</p>
          ) : programs.length === 0 ? (
            <p className="text-sm text-subtle">No hay programación para este mes.</p>
          ) : (
            <ul className="space-y-2">
              {programs.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/coordinator/programs/${p.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    Ver {MONTH_NAMES[p.periodMonth - 1]} {p.periodYear}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </main>
  );
}
