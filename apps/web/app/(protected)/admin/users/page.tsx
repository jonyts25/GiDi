"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../../../lib/api";
import { SaveBanner } from "@/components/ui/SaveBanner";

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  status: "ACTIVE" | "INACTIVE";
  roles?: { role: { key: string; name: string } }[];
};

const roles = ["THERAPIST", "PARENT", "SCHOOL", "ADMIN"] as const;
type RoleKey = (typeof roles)[number];

export default function AdminUsersPage() {
  const router = useRouter();
  const [role, setRole] = useState<RoleKey>("PARENT");
  const [items, setItems] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [createRole, setCreateRole] = useState<RoleKey>("ADMIN");

  async function loadUsers() {
    setLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(`/admin/users/role/${role}`);
      setItems(data ?? []);
    } catch (e: unknown) {
      setMsgType("error");
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const myRoles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!myRoles.includes("ADMIN")) return router.replace("/dashboard");

    void loadUsers();
  }, [role, router]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      const created = await apiFetch(`/admin/users`, {
        method: "POST",
        body: JSON.stringify({
          email,
          fullName,
          role: createRole,
          status: "ACTIVE",
          ...(password ? { password } : {}),
        }),
      });
      const user = created?.user ?? created;
      setItems((prev) => [user, ...prev]);
      setFullName("");
      setEmail("");
      setPassword("");
      setMsgType("success");
      setMsg(created?.generatedPassword ? `✅ Creado. Contraseña: ${created.generatedPassword}` : "✅ Usuario creado correctamente");
      if (createRole !== role) setRole(createRole);
    } catch (e: unknown) {
      setMsgType("error");
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  const filtered = useMemo(() => items, [items]);

  return (
    <main style={{ paddingTop: 18 }}>
      <div className="row">
        <div>
          <div className="h1">Usuarios</div>
          <p className="sub">Admin · listado por rol</p>
        </div>
        <Link className="btn" href="/dashboard">← Volver</Link>
      </div>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="h2">Crear usuario</div>
        <form onSubmit={(e) => void onCreate(e)} style={{ display: "grid", gap: 10, marginTop: 10, maxWidth: 520 }}>
          <input className="input" placeholder="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Contraseña (opcional, se genera automática)" value={password} onChange={(e) => setPassword(e.target.value)} />
          <select className="input" value={createRole} onChange={(e) => setCreateRole(e.target.value as RoleKey)}>
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button className="btn-primary" type="submit">+ Crear usuario</button>
        </form>
      </section>

      <section className="card" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label className="sub">Filtrar por rol</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as RoleKey)}>
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <SaveBanner message={msg} type={msgType} />

        {loading ? (
          <p className="sub" style={{ marginTop: 12 }}>Cargando...</p>
        ) : (
          <div style={{ marginTop: 12, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Nombre</th>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Email</th>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Status</th>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Roles</th>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>{u.fullName}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>{u.email}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>{u.status}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>
                      {(u.roles ?? []).map((r) => r.role.key).join(", ") || "-"}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>
                      <Link className="btn" href={`/admin/users/${u.id}`}>Ver / Editar</Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 8 }} className="sub">Sin resultados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}