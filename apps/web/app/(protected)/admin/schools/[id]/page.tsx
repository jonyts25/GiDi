"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "../../../../../lib/api";
import { SaveBanner } from "@/components/ui/SaveBanner";

type UserDetail = {
  id: string;
  fullName: string;
  email: string;
  status: "ACTIVE" | "INACTIVE";
};

type SchoolPatient = {
  patientId: string;
  firstName: string;
  lastName: string;
  center?: string;
};

type AvailablePatient = { id: string; firstName: string; lastName: string; center?: string };

export default function AdminSchoolDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [u, setU] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [patients, setPatients] = useState<SchoolPatient[]>([]);
  const [available, setAvailable] = useState<AvailablePatient[]>([]);
  const [picked, setPicked] = useState<string[]>([]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  async function loadPatients() {
    const [linked, avail] = await Promise.all([
      apiFetch(`/admin/schools/${id}/patients`),
      apiFetch(`/admin/schools/${id}/available-patients`),
    ]);
    setPatients(linked);
    setAvailable(avail);
  }

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!roles.includes("ADMIN")) return router.replace("/dashboard");

    (async () => {
      try {
        const data = await apiFetch(`/admin/users/${id}`);
        setU(data);
        setFullName(data.fullName);
        setEmail(data.email);
        setStatus(data.status);
        await loadPatients();
      } catch (e: unknown) {
        setMsg(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      const updated = await apiFetch(`/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ fullName, email, status }),
      });
      setU(updated);
      setMsg("✅ Guardado");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  async function onAssignPatients() {
    if (!picked.length) return;
    setMsg("");
    try {
      await apiFetch(`/admin/schools/${id}/patients`, {
        method: "POST",
        body: JSON.stringify({ patientIds: picked }),
      });
      setPicked([]);
      await loadPatients();
      setMsg(`✅ ${picked.length} paciente(s) vinculado(s)`);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  const availableFiltered = useMemo(() => available, [available]);

  if (loading) return <p style={{ padding: 20 }}>Cargando...</p>;

  return (
    <main style={{ paddingTop: 18 }}>
      <div className="row">
        <div>
          <div className="h1">Editar escuela</div>
          <p className="sub">{u ? `${u.fullName} · ${u.email}` : ""}</p>
        </div>
        <Link className="btn" href="/admin/schools">← Volver</Link>
      </div>

      <section className="card" style={{ marginTop: 14 }}>
        <form onSubmit={(e) => void onSave(e)} style={{ display: "grid", gap: 10 }}>
          <label className="sub">Nombre</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <label className="sub">Email</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label className="sub">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
          <button className="btn-primary" type="submit">Guardar</button>
        </form>
      </section>

      <section className="card" style={{ marginTop: 14 }}>
        <h2 className="h2">Pacientes vinculados ({patients.length})</h2>
        {patients.length === 0 ? (
          <p className="sub">Esta escuela aún no tiene pacientes asignados.</p>
        ) : (
          <ul style={{ paddingLeft: 18 }}>
            {patients.map((p) => (
              <li key={p.patientId}>
                {p.lastName}, {p.firstName}
                {p.center ? ` · ${p.center === "VALLARTA" ? "Vallarta" : "San Agustín"}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" style={{ marginTop: 14 }}>
        <h2 className="h2">Agregar pacientes</h2>
        <p className="sub">Seleccione uno o varios pacientes para vincular a esta escuela.</p>
        <select
          className="input"
          multiple
          size={8}
          value={picked}
          onChange={(e) => setPicked(Array.from(e.target.selectedOptions, (o) => o.value))}
          style={{ width: "100%", maxWidth: 480 }}
        >
          {availableFiltered.map((p) => (
            <option key={p.id} value={p.id}>
              {p.lastName}, {p.firstName}
            </option>
          ))}
        </select>
        <button className="btn-primary" type="button" style={{ marginTop: 10 }} disabled={!picked.length} onClick={() => void onAssignPatients()}>
          Vincular seleccionados
        </button>
      </section>

      <SaveBanner message={msg} type={msg.includes("✅") ? "success" : "error"} />
    </main>
  );
}
