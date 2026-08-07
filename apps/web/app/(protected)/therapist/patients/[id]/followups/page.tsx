"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { PatientFollowUpsExportTable } from "@/components/followups/PatientFollowUpsExportTable";
import { filterAreasForUserRoles } from "@/lib/area-permissions";

type Area = { id: string; key: string; name: string; trackingMode?: string | null };
type FollowUpRow = {
  id: string;
  periodYear: number;
  periodMonth: number;
  status: string;
  area: Area;
  createdAt: string;
};

export default function TherapistPatientFollowUpsPage() {
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
  const [pickedAreaId, setPickedAreaId] = useState("");
  const [therapistId, setTherapistId] = useState("");
  const [areaFilter, setAreaFilter] = useState("");

  const canCreate = useMemo(() => pickedAreaId && therapistId, [pickedAreaId, therapistId]);

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!roles.includes("THERAPIST")) return router.replace("/dashboard");

    const user = JSON.parse(userRaw);
    setTherapistId(user.id ?? "");

    (async () => {
      try {
        const a = (await apiFetch("/areas")) as Area[];
        setAreas(filterAreasForUserRoles(roles, a));
      } catch (e: unknown) {
        setMsg(e instanceof Error ? e.message : "Error");
      }
    })();
  }, [router]);

  const allowedAreas = areas;

  async function load() {
    setMsg("");
    try {
      const url = allMonths ? `/patients/${patientId}/followups` : `/patients/${patientId}/followups?year=${year}&month=${month}`;
      const r = await apiFetch(url);
      setRows(r);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  useEffect(() => {
    if (therapistId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, year, month, therapistId, allMonths]);

  async function onCreate() {
    setMsg("");
    try {
      const created = await apiFetch("/followups", {
        method: "POST",
        body: JSON.stringify({
          patientId,
          therapistId,
          areaId: pickedAreaId,
          periodYear: year,
          periodMonth: month,
        }),
      });
      router.push(`/therapist/followups/${created.id}`);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <main className="max-w-[980px] space-y-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Seguimientos del paciente</h1>
          <p className="text-sm text-subtle">Verá sus seguimientos y los enviados para terapeutas</p>
        </div>
        <Link className="btn rounded-xl px-3 py-2 text-sm" href={`/therapist/patients/${patientId}`}>
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

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <select className="select max-w-xs flex-1" value={pickedAreaId} onChange={(e) => setPickedAreaId(e.target.value)}>
            <option value="">— Área —</option>
            {allowedAreas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button type="button" className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold" disabled={!canCreate} onClick={onCreate}>
            + Crear nuevo
          </button>
        </div>
        {msg ? <p className="text-sm text-subtle">{msg}</p> : null}
      </section>

      <section className="card">
        <PatientFollowUpsExportTable
          rows={rows}
          allMonths={allMonths}
          openHref={(id) => `/therapist/followups/${id}`}
          areas={allowedAreas}
          areaFilter={areaFilter}
          onAreaFilterChange={setAreaFilter}
        />
      </section>
    </main>
  );
}
