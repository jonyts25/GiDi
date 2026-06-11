"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../../../lib/api"; // <-- AJUSTA si tu lib/api está en otra ruta

type Row = {
  id: string;
  fullName: string;
  email: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
};

export default function AdminTherapistsPage() {
  const router = useRouter();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // form alta
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [password, setPassword] = useState("");
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!roles.includes("ADMIN")) return router.replace("/dashboard");

    (async () => {
      try {
        // ✅ endpoint correcto para lista
        const data = await apiFetch(`/admin/users/role/THERAPIST`);
        setRows(data);
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
      // ✅ endpoint correcto para crear
      const created = await apiFetch(`/admin/users`, {
        method: "POST",
        body: JSON.stringify({
          email,
          fullName,
          role: "THERAPIST",
          status,
          ...(password ? { password } : {}),
        }),
      });

      // tu backend probablemente regresa { user, generatedPassword }
      const user = created?.user ?? created;

      setRows((prev) => [user, ...prev]);
      setFullName("");
      setEmail("");
      setPassword("");
      setStatus("ACTIVE");
      setFormKey((k) => k + 1);

      const gp = created?.generatedPassword;
      setMsg(gp ? `✅ Creado. Password: ${gp}` : "✅ Creado");
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  return (
    <main style={{ paddingTop: 18 }}>
      <div className="row">
        <div>
          <div className="h1">Terapeutas</div>
          <p className="sub">Admin · listado y alta</p>
        </div>
        <Link className="btn" href="/dashboard">← Volver</Link>
        <span className="badge">{rows.length} registrados</span>
      </div>

      <div className="grid2" style={{ marginTop: 14 }}>
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Nuevo terapeuta</h3>
          <p className="sub" style={{ marginTop: 6 }}>
            Crea un terapeuta para asignarlo a pacientes.
          </p>

          <form key={formKey} onSubmit={onCreate} autoComplete="off" style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <label className="sub">Nombre</label>
            <input className="input" autoComplete="off" value={fullName} onChange={(e) => setFullName(e.target.value)} required />

            <label className="sub">Email</label>
            <input className="input" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} required />

            <label className="sub">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>

            <label className="sub">Password (opcional)</label>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Si lo dejas vacío, se genera uno"
            />

            <button className="btn" type="submit">Crear</button>
          </form>

          {msg && <p className="sub" style={{ marginTop: 12 }}>{msg}</p>}
        </section>

        <section className="card">
          <div className="row" style={{ alignItems: "baseline" }}>
            <h3 style={{ marginTop: 0 }}>Listado</h3>
            <span className="sub">Click en un nombre para editar</span>
          </div>

          {loading ? (
            <p className="sub">Cargando...</p>
          ) : rows.length === 0 ? (
            <p className="sub">Aún no hay terapeutas.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr style={{ textAlign: "left" }}>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Creado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <Link href={`/admin/therapists/${u.id}`} style={{ fontWeight: 800 }}>
                          {u.fullName}
                        </Link>
                        <div className="sub" style={{ marginTop: 4, fontSize: 12 }}>
                          ID: {u.id.slice(0, 8)}…
                        </div>
                      </td>
                      <td style={{ color: "var(--muted)" }}>{u.email}</td>
                      <td style={{ color: "var(--muted)" }}>{u.status}</td>
                      <td style={{ color: "var(--muted)" }}>{new Date(u.createdAt).toLocaleString()}</td>
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
