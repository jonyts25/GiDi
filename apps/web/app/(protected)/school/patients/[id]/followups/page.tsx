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
  area: { id: string; name: string };
  therapist?: { fullName: string };
};

export default function SchoolPatientFollowUpsPage() {
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
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    if (!token) return router.replace("/");

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
        setAreas((areasRes as { id: string; name: string }[]).map((a) => ({ id: a.id, name: a.name })));
        setExportRows((list as FollowUpRow[]).filter((r) => r.status === "CLOSED"));
      } catch (e: unknown) {
        setMsg(e instanceof Error ? e.message : "Error");
        setData(null);
      }
    })();
  }, [router, patientId, year, month, allMonths]);

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
          <p className="mt-1 text-xs text-subtle">Solo lectura · seguimientos publicados por el centro</p>
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
          openHref={(fid) => `/school/patients/${patientId}/followups#${fid}`}
          areas={areas}
          areaFilter={areaFilter}
          onAreaFilterChange={setAreaFilter}
        />
      </section>

      {msg ? <p className="text-sm text-danger">{msg}</p> : null}
      {!data && !msg ? <p className="text-subtle">Cargando resumen…</p> : null}

      {data?.followUps.length === 0 ? (
        <section className="card text-center text-sm text-subtle">
          <p>No hay seguimientos publicados para {allMonths ? "mostrar" : "este mes"}.</p>
        </section>
      ) : (
        <div className="space-y-6">
          {data?.followUps.map((fu) => <ParentFollowUpSummaryCard key={fu.followUpId} data={fu} />)}
        </div>
      )}
    </main>
  );
}
