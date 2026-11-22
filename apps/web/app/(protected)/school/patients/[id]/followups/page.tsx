"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { defaultFollowUpPeriod } from "@/lib/date-utils";
import {
  ParentFollowUpSummaryCard,
  type ParentFollowUpSummaryItem,
} from "@/components/followups/ParentFollowUpSummaryCard";
import { PatientFollowUpsExportTable } from "@/components/followups/PatientFollowUpsExportTable";

type SummaryResponse = {
  patient: { id: string; firstName: string; lastName: string };
  periodYear: number | null;
  periodMonth: number | null;
  followUps: ParentFollowUpSummaryItem[];
};

type FollowUpRow = {
  id: string;
  status: string;
  periodYear: number;
  periodMonth: number;
  programId?: string | null;
  area: { id: string; name: string; key: string };
  therapist?: { id: string; fullName: string };
  program?: { id: string; therapist?: { fullName: string } };
};

export default function SchoolPatientFollowUpsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const patientId = params.id;

  const now = new Date();

  const defaultPeriod = defaultFollowUpPeriod(now);
  const [year, setYear] = useState(defaultPeriod.periodYear);
  const [month, setMonth] = useState(defaultPeriod.periodMonth);
  const [allMonths, setAllMonths] = useState(false);
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [exportRows, setExportRows] = useState<FollowUpRow[]>([]);
  const [areas, setAreas] = useState<{ id: string; name: string }[]>([]);
  const [areaFilter, setAreaFilter] = useState("");
  const [msg, setMsg] = useState("");
  const [schoolUserId, setSchoolUserId] = useState("");
  const [schoolAreaId, setSchoolAreaId] = useState("");
  const [myRows, setMyRows] = useState<FollowUpRow[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");
    const me = JSON.parse(userRaw) as { id?: string };
    const myId = me.id ?? "";

    (async () => {
      setMsg("");
      try {
        const summaryUrl = allMonths
          ? `/school/patients/${patientId}/followups/summary`
          : `/school/patients/${patientId}/followups/summary?year=${year}&month=${month}`;
        const listUrl = allMonths
          ? `/patients/${patientId}/followups`
          : `/patients/${patientId}/followups?year=${year}&month=${month}`;
        const [res, areasRes, list] = await Promise.all([
          apiFetch(summaryUrl),
          apiFetch("/areas"),
          apiFetch(listUrl),
        ]);
        setData(res as SummaryResponse);
        setSchoolUserId(myId);
        const areaList = areasRes as { id: string; key: string; name: string }[];
        setAreas(areaList.map((a) => ({ id: a.id, name: a.name })));
        const schoolArea = areaList.find((a) => a.key === "SEGUIMIENTO_ESCOLAR");
        if (schoolArea) setSchoolAreaId(schoolArea.id);
        const rows = list as FollowUpRow[];
        setMyRows(rows.filter((r) => r.area.key === "SEGUIMIENTO_ESCOLAR" && r.therapist?.id === myId));
        setExportRows(rows.filter((r) => r.status === "CLOSED"));
      } catch (e: unknown) {
        setMsg(e instanceof Error ? e.message : "Error");
        setData(null);
      }
    })();
  }, [router, patientId, year, month, allMonths]);

  async function onCreateSchoolFollowUp() {
    if (!schoolAreaId || !schoolUserId) return;
    setMsg("");
    try {
      const created = (await apiFetch("/followups", {
        method: "POST",
        body: JSON.stringify({
          patientId,
          therapistId: schoolUserId,
          areaId: schoolAreaId,
          periodYear: year,
          periodMonth: month,
        }),
      })) as { id: string };
      router.push(`/school/followups/${created.id}`);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  const monthLabel = data?.periodYear && data?.periodMonth
    ? new Date(data.periodYear, data.periodMonth - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" })
    : "Todos los meses";

  return (
    <main className="container max-w-[820px] space-y-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Seguimientos mensuales</h1>
          {data ? (
            <p className="mt-1 text-sm text-subtle">
              {data.patient.firstName} {data.patient.lastName} · {monthLabel}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-subtle">Seguimientos publicados por el centro · puede registrar el seguimiento escolar</p>
        </div>
        <Link className="btn rounded-xl px-3 py-2 text-sm" href={`/school/patients/${patientId}`}>
          ← Volver al perfil
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

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Exportar seguimientos</h2>
        <PatientFollowUpsExportTable
          rows={exportRows}
          allMonths={allMonths}
          openHref={(fid) => `/school/followups/${fid}`}
          openProgramHref={(programId) => `/school/programs/${programId}`}
          areas={areas}
          areaFilter={areaFilter}
          onAreaFilterChange={setAreaFilter}
        />
      </section>

      <section className="card space-y-3 border-l-4 border-l-info">
        <h2 className="text-lg font-semibold">Seguimiento escolar</h2>
        <p className="text-sm text-subtle">
          Registre las observaciones escolares del mes. Guarde borrador y publíquelo cuando esté listo.
        </p>
        {myRows.length ? (
          <ul className="space-y-2 text-sm">
            {myRows.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span>
                  Seguimiento escolar ·{" "}
                  {new Date(r.periodYear, r.periodMonth - 1, 1).toLocaleDateString("es-MX", {
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  · {r.status === "CLOSED" ? "Publicado" : "Borrador"}
                </span>
                <Link className="btn rounded-lg px-3 py-1 text-xs" href={`/school/followups/${r.id}`}>
                  {r.status === "CLOSED" ? "Ver" : "Continuar"}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {schoolAreaId ? (
          <button
            type="button"
            className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold"
            onClick={() => void onCreateSchoolFollowUp()}
          >
            {myRows.length ? "+ Crear otro seguimiento escolar" : "+ Crear seguimiento escolar"}
          </button>
        ) : null}
      </section>

      {msg ? <p className="text-sm text-danger">{msg}</p> : null}
      {!data && !msg ? <p className="text-subtle">Cargando resumen…</p> : null}

      {data?.followUps.length === 0 ? (
        <section className="card text-center text-sm text-subtle">
          <p>No hay seguimientos publicados para {allMonths ? "mostrar" : "este mes"}.</p>
        </section>
      ) : (
        <div className="space-y-6">
          {data?.followUps.map((item) => (
            <ParentFollowUpSummaryCard
              key={"programId" in item ? item.programId : item.followUpId}
              data={item}
            />
          ))}
        </div>
      )}
    </main>
  );
}
