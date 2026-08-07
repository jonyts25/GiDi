"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  ParentFollowUpSummaryCard,
  type ParentFollowUpCardData,
} from "@/components/followups/ParentFollowUpSummaryCard";
import { PatientFollowUpsExportTable } from "@/components/followups/PatientFollowUpsExportTable";
import { hasOfficeStaffRole, hasParentPortalAccess } from "@/lib/role-permissions";

type SummaryResponse = {
  patient: { id: string; firstName: string; lastName: string };
  periodYear: number | null;
  periodMonth: number | null;
  followUps: ParentFollowUpCardData[];
};

type FollowUpRow = {
  id: string;
  status: string;
  periodYear: number;
  periodMonth: number;
  area: { id: string; name: string; key: string };
  therapist?: { fullName: string };
};

export default function ParentPatientFollowUpsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const patientId = params.id;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [allMonths, setAllMonths] = useState(false);
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [exportRows, setExportRows] = useState<FollowUpRow[]>([]);
  const [areas, setAreas] = useState<{ id: string; name: string }[]>([]);
  const [areaFilter, setAreaFilter] = useState("");
  const [myRows, setMyRows] = useState<FollowUpRow[]>([]);
  const [familiarAreaId, setFamiliarAreaId] = useState("");
  const [msg, setMsg] = useState("");
  const [parentId, setParentId] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (hasOfficeStaffRole(roles)) return router.replace("/admin/patients");
    if (!hasParentPortalAccess(roles)) return router.replace("/dashboard");
    const user = JSON.parse(userRaw);
    setParentId(user.id ?? "");

    (async () => {
      setMsg("");
      try {
        const summaryUrl = allMonths
          ? `/parent/patients/${patientId}/followups/summary`
          : `/parent/patients/${patientId}/followups/summary?year=${year}&month=${month}`;
        const listUrl = allMonths
          ? `/patients/${patientId}/followups`
          : `/patients/${patientId}/followups?year=${year}&month=${month}`;
        const [res, areasRes, list] = await Promise.all([
          apiFetch(summaryUrl),
          apiFetch("/areas"),
          apiFetch(listUrl),
        ]);
        setData(res);
        const areaList = areasRes as { id: string; key: string; name: string }[];
        setAreas(areaList.map((a) => ({ id: a.id, name: a.name })));
        const fam = areaList.find((a) => a.key === "FAMILIAR");
        if (fam) setFamiliarAreaId(fam.id);
        const rows = list as FollowUpRow[];
        setMyRows(rows.filter((r) => r.area.key === "FAMILIAR"));
        setExportRows(rows.filter((r) => r.status === "CLOSED"));
      } catch (e: unknown) {
        setMsg(e instanceof Error ? e.message : "Error");
        setData(null);
      }
    })();
  }, [router, patientId, year, month, allMonths]);

  async function onCreateFamiliar() {
    if (!familiarAreaId || !parentId) return;
    setMsg("");
    try {
      const created = await apiFetch("/followups", {
        method: "POST",
        body: JSON.stringify({
          patientId,
          therapistId: parentId,
          areaId: familiarAreaId,
          periodYear: year,
          periodMonth: month,
        }),
      });
      router.push(`/parent/followups/${created.id}`);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  const monthLabel = data?.periodYear && data?.periodMonth
    ? new Date(data.periodYear, data.periodMonth - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" })
    : "Todos los meses";

  return (
    <main className="max-w-[820px] space-y-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Progreso del mes</h1>
          {data ? (
            <p className="mt-1 text-sm text-subtle">
              {data.patient.firstName} {data.patient.lastName} · {monthLabel}
            </p>
          ) : null}
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
        <label className="flex items-center gap-2 text-sm text-subtle">
          <input type="checkbox" checked={allMonths} onChange={(e) => setAllMonths(e.target.checked)} />
          Ver todos los meses
        </label>
      </section>

      <section className="card space-y-3 border-l-4 border-l-info">
        <h2 className="text-lg font-semibold">Exportar seguimientos</h2>
        <p className="text-sm text-subtle">Seleccione seguimientos publicados para exportar en un solo PDF.</p>
        <PatientFollowUpsExportTable
          rows={exportRows}
          allMonths={allMonths}
          openHref={(fid) => `/parent/followups/${fid}`}
          areas={areas}
          areaFilter={areaFilter}
          onAreaFilterChange={setAreaFilter}
        />
      </section>

      <section className="card space-y-3 border-l-4 border-l-info">
        <h2 className="text-lg font-semibold">Mi seguimiento familiar</h2>
        <p className="text-sm text-subtle">Registre observaciones del mes. Guarde borrador y publíquelo cuando esté listo.</p>
        {myRows.length ? (
          <ul className="space-y-2 text-sm">
            {myRows.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span>Familiar · {r.status === "CLOSED" ? "Enviado" : "Borrador"}</span>
                <Link className="btn rounded-lg px-3 py-1 text-xs" href={`/parent/followups/${r.id}`}>
                  {r.status === "CLOSED" ? "Ver" : "Continuar"}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <button type="button" className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold" onClick={() => void onCreateFamiliar()}>
          {myRows.length ? "+ Crear otro seguimiento familiar" : "+ Crear seguimiento familiar"}
        </button>
      </section>

      {msg ? <p className="text-sm text-danger">{msg}</p> : null}

      {!data && !msg ? <p className="text-subtle">Cargando resumen…</p> : null}

      <h2 className="text-lg font-semibold">Progreso publicado por el centro</h2>

      {data?.followUps.length === 0 ? (
        <section className="card text-center text-sm text-subtle">
          <p>No hay seguimientos publicados para este mes.</p>
        </section>
      ) : (
        <div className="space-y-6">
          {data?.followUps.map((fu) => <ParentFollowUpSummaryCard key={fu.followUpId} data={fu} />)}
        </div>
      )}
    </main>
  );
}
