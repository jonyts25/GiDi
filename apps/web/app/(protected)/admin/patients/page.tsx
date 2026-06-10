"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../../lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SearchInput, filterByQuery } from "@/components/ui/SearchInput";

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  notes?: string | null;
  center?: string;
  createdAt: string;
};

export default function AdminPatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [centerFilter, setCenterFilter] = useState<"" | "SAN_AGUSTIN" | "VALLARTA">("");

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!roles.includes("ADMIN")) return router.replace("/dashboard");

    (async () => {
      try {
        const data = await apiFetch("/patients");
        setPatients(data);
      } catch (e: any) {
        setMsg(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    try {
      const created = await apiFetch("/patients", {
        method: "POST",
        body: JSON.stringify({ firstName, lastName, notes }),
      });

      setPatients((p) => [created, ...p]);
      setFirstName("");
      setLastName("");
      setNotes("");
      setMsg("✅ Paciente creado");
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  const filtered = useMemo(() => {
    let list = filterByQuery(patients, query, (p) => `${p.firstName} ${p.lastName} ${p.notes ?? ""}`);
    if (centerFilter) list = list.filter((p) => p.center === centerFilter);
    return list;
  }, [patients, query, centerFilter]);

  return (
    <main style={{ paddingTop: 18 }}>
      <div className="row">
        <div>
          <div className="h1">Pacientes</div>
          <p className="sub">Admin · listado y alta</p>
        </div>
               <Link className="btn" href="/dashboard">← Volver</Link>
               <span className="badge">{filtered.length} / {patients.length}</span>
      </div>

      <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 10 }}>
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar paciente…" />
        <select className="input" value={centerFilter} onChange={(e) => setCenterFilter(e.target.value as "" | "SAN_AGUSTIN" | "VALLARTA")}>
          <option value="">Todos los centros</option>
          <option value="SAN_AGUSTIN">San Agustín</option>
          <option value="VALLARTA">Vallarta</option>
        </select>
      </div>

      <div className="grid2" style={{ marginTop: 14 }}>
        <section className="card">
  <h3 style={{ marginTop: 0 }}>Alta completa</h3>
  <p className="sub" style={{ marginTop: 6 }}>
    Registra paciente + padres/tutores + escuela + terapeuta(s). Al final te muestra credenciales generadas para copiar y enviar.
  </p>

  <div style={{ marginTop: 12 }}>
    <Link href="/admin/patients/new">
      <button className="btn">Ir a alta completa</button>
    </Link>
  </div>

  <p className="sub" style={{ marginTop: 12 }}>
    (Si luego quieres, dejamos también “alta rápida”, pero para demo es mejor un solo flujo.)
  </p>
</section>


        <section className="card">
          <div className="row" style={{ alignItems: "baseline" }}>
            <h3 style={{ marginTop: 0 }}>Listado</h3>
            <span className="sub">Click en un nombre para abrir la ficha</span>
          </div>

          {loading ? (
            <p className="sub">Cargando...</p>
          ) : patients.length === 0 ? (
            <p className="sub">Aún no hay pacientes.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr style={{ textAlign: "left" }}>
                    <th>Nombre</th>
                    <th>Notas</th>
                    <th>Creado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/admin/patients/${p.id}`} style={{ fontWeight: 800 }}>
                          {p.firstName} {p.lastName}
                        </Link>
                        <div className="sub" style={{ marginTop: 4, fontSize: 12 }}>
                          ID: {p.id.slice(0, 8)}…
                        </div>
                      </td>
                      <td style={{ color: "var(--muted)" }}>{p.notes ?? ""}</td>
                      <td style={{ color: "var(--muted)" }}>{new Date(p.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
