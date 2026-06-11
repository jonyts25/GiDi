"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { filterAreasForUserRoles } from "@/lib/area-permissions";

type Area = { id: string; key: string; name: string; trackingMode?: string | null };
type Therapist = { id: string; fullName: string; email: string };
type FollowUpRow = {
  id: string;
  periodYear: number;
  periodMonth: number;
  status: string;
  area: Area;
  therapist: Therapist;
  createdAt: string;
};

export default function AdminPatientFollowUpsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const patientId = params.id;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [areas, setAreas] = useState<Area[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [rows, setRows] = useState<FollowUpRow[]>([]);
  const [msg, setMsg] = useState("");

  const [pickedAreaId, setPickedAreaId] = useState("");
  const [pickedTherapistId, setPickedTherapistId] = useState("");

  const canCreate = useMemo(() => pickedAreaId && pickedTherapistId, [pickedAreaId, pickedTherapistId]);

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!roles.includes("ADMIN")) return router.replace("/dashboard");

    (async () => {
      try {
        const [a, t, patient] = await Promise.all([
          apiFetch("/areas"),
          apiFetch("/users/therapists"),
          apiFetch(`/admin/patients/${patientId}`),
        ]);
        setAreas(filterAreasForUserRoles(roles, a as Area[]));
        setTherapists(t);
        const assignedId = patient?.therapists?.[0]?.therapistId ?? patient?.therapists?.[0]?.id ?? "";
        if (assignedId) setPickedTherapistId(assignedId);
      } catch (e: any) {
        setMsg(e.message);
      }
    })();
  }, [router, patientId]);

  async function load() {
    setMsg("");
    try {
      const r = await apiFetch(`/patients/${patientId}/followups?year=${year}&month=${month}`);
      setRows(r);
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, year, month]);

  async function onCreate() {
    setMsg("");
    try {
      const created = await apiFetch("/followups", {
        method: "POST",
        body: JSON.stringify({
          patientId,
          therapistId: pickedTherapistId,
          areaId: pickedAreaId,
          periodYear: year,
          periodMonth: month,
        }),
      });

      router.push(`/admin/followups/${created.id}`);
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  return (
    <main style={{ maxWidth: 980, margin: "30px auto", padding: 16 }}>
      <div className="row">
        <div>
          <div className="h1">Seguimientos (FollowUps)</div>
          <p className="sub">Paciente: {patientId}</p>
        </div>
        <Link className="btn" href={`/admin/patients/${patientId}`}>← Volver al paciente</Link>
      </div>

      <section className="card" style={{ marginTop: 14, display: "grid", gap: 10 }}>
        <div className="row">
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <label className="sub">Año</label>
            <input className="input" style={{ width: 110 }} value={year} onChange={(e) => setYear(Number(e.target.value))} />
            <label className="sub">Mes</label>
            <select className="input" style={{ width: 130 }} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}</option>
              ))}
            </select>
          </div>
          <button className="btn" onClick={load}>Refrescar</button>
        </div>

        <hr />

        <div className="h2">Crear seguimiento del mes</div>
        <p className="sub" style={{ marginBottom: 8 }}>
          Puede crear varios seguimientos en el mismo mes (misma área y terapeuta). Cada uno es independiente.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10 }}>
          <select className="input" value={pickedAreaId} onChange={(e) => setPickedAreaId(e.target.value)}>
            <option value="">— Área —</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          <select className="input" value={pickedTherapistId} onChange={(e) => setPickedTherapistId(e.target.value)}>
            <option value="">— Terapeuta —</option>
            {therapists.map((t) => (
              <option key={t.id} value={t.id}>{t.fullName} ({t.email})</option>
            ))}
          </select>

          <button className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold" disabled={!canCreate} onClick={onCreate}>
            + Crear nuevo
          </button>
        </div>

        {msg && <p className="sub" style={{ marginTop: 10 }}>{msg}</p>}
      </section>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="h2">Follow-ups del periodo</div>
        {rows.length === 0 ? (
          <p className="sub">No hay follow-ups para este mes.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={{ padding: 8 }}>Área</th>
                <th style={{ padding: 8 }}>Terapeuta</th>
                <th style={{ padding: 8 }}>Status</th>
                <th style={{ padding: 8 }}>Creado</th>
                <th style={{ padding: 8 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{r.area?.name}</td>
                  <td style={{ padding: 8 }}>{r.therapist?.fullName}</td>
                  <td style={{ padding: 8 }}>{r.status}</td>
                  <td style={{ padding: 8, color: "var(--muted)", fontSize: 13 }}>
                    {new Date(r.createdAt).toLocaleString("es-MX")}
                  </td>
                  <td style={{ padding: 8 }}>
                    <Link className="btn" href={`/admin/followups/${r.id}`}>Abrir</Link>
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
