"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { PatientFollowUpsExportTable } from "@/components/followups/PatientFollowUpsExportTable";
import { filterAreasForUserRoles } from "@/lib/area-permissions";
import { hasCoordinatorRole } from "@/lib/role-permissions";

type Area = { id: string; key: string; name: string; trackingMode?: string | null };
type FollowUpRow = {
  id: string;
  periodYear: number;
  periodMonth: number;
  status: string;
  programId?: string | null;
  area: Area;
  therapist?: { fullName: string };
  program?: { id: string; therapist?: { fullName: string } };
  createdAt: string;
};

export default function CoordinatorPatientFollowUpsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const patientId = params.id;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [allMonths, setAllMonths] = useState(false);
  const [areas, setAreas] = useState<Area[]>([]);
  const [rows, setRows] = useState<FollowUpRow[]>([]);
  const [msg, setMsg] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!hasCoordinatorRole(roles)) return router.replace("/dashboard");

    (async () => {
      try {
        const a = (await apiFetch("/areas")) as Area[];
        setAreas(filterAreasForUserRoles(roles, a));
        setReady(true);
      } catch (e: unknown) {
        setMsg(e instanceof Error ? e.message : "Error");
      }
    })();
  }, [router]);

  async function load() {
    setMsg("");
    try {
      const url = allMonths
        ? `/patients/${patientId}/followups`
        : `/patients/${patientId}/followups?year=${year}&month=${month}`;
      const r = await apiFetch(url);
      setRows(r);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  useEffect(() => {
    if (!ready) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, year, month, allMonths, ready]);

  return (
    <main className="container max-w-[980px] space-y-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Seguimientos del paciente</h1>
          <p className="text-sm text-subtle">Solo lectura · pacientes de su equipo</p>
        </div>
        <Link className="btn rounded-xl px-3 py-2 text-sm" href={`/coordinator/patients/${patientId}`}>
          ← Perfil y documentos
        </Link>
      </div>

      <section className="card space-y-3">
        <div className="flex flex-wrap gap-3">
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
          <label className="flex items-center gap-2 text-sm text-subtle">
            <input type="checkbox" checked={allMonths} onChange={(e) => setAllMonths(e.target.checked)} />
            Ver todos los meses
          </label>
        </div>
        {msg ? <p className="text-sm text-subtle">{msg}</p> : null}
      </section>

      <section className="card">
        <PatientFollowUpsExportTable
          rows={rows}
          allMonths={allMonths}
          openHref={(fid) => `/therapist/followups/${fid}`}
          openProgramHref={(programId) => `/coordinator/programs/${programId}`}
          areas={areas}
          areaFilter={areaFilter}
          onAreaFilterChange={setAreaFilter}
          readOnly
        />
      </section>
    </main>
  );
}
