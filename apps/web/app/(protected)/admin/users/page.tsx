"use client";
import { USERNAME_LABEL } from "@/lib/user-labels";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../../../lib/api";
import { SaveBanner } from "@/components/ui/SaveBanner";
import { SearchInput, filterByQuery } from "@/components/ui/SearchInput";
import { hasFullAdminRole, hasOfficeStaffRole, labelForRole, STATUS_LABELS } from "@/lib/role-permissions";

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  status: "ACTIVE" | "INACTIVE";
  roles?: { role: { key: string; name: string } }[];
};

const roles = ["ADMIN", "SECRETARY", "THERAPIST", "PARENT", "SCHOOL"] as const;
type RoleKey = (typeof roles)[number] | "ALL_INACTIVE";

type StatusFilter = "ACTIVE" | "INACTIVE" | "ALL";

export default function AdminUsersPage() {
  const router = useRouter();
  const [myRoles, setMyRoles] = useState<string[]>([]);
  const [role, setRole] = useState<RoleKey>("PARENT");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [createRole, setCreateRole] = useState<RoleKey>("ADMIN");
  const [formKey, setFormKey] = useState(0);

  async function loadUsers() {
    setLoading(true);
    setMsg("");
    try {
      if (statusFilter === "INACTIVE" && role === "ALL_INACTIVE") {
        const data = await apiFetch(`/admin/users/inactive`);
        setItems(data ?? []);
      } else {
        const data = await apiFetch(`/admin/users/role/${role}`);
        setItems(data ?? []);
      }
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

    const rolesFromSession: string[] = JSON.parse(userRaw).roles ?? [];
    setMyRoles(rolesFromSession);
    if (!hasOfficeStaffRole(rolesFromSession)) return router.replace("/dashboard");

    void loadUsers();
  }, [role, statusFilter, router]);

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
      setFormKey((k) => k + 1);
      setMsgType("success");
      setMsg(created?.generatedPassword ? `✅ Creado. Contraseña: ${created.generatedPassword}` : "✅ Usuario creado correctamente");
      if (createRole !== role) setRole(createRole);
    } catch (e: unknown) {
      setMsgType("error");
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  const filtered = useMemo(
    () => {
      const byStatus = statusFilter === "ALL" ? items : items.filter((u) => u.status === statusFilter);
      return filterByQuery(byStatus, query, (u) => `${u.fullName} ${u.email}`);
    },
    [items, statusFilter, query],
  );

  async function onToggleStatus(u: UserRow) {
    const next = u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setMsg("");
    try {
      await apiFetch(`/admin/users/${u.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setItems((prev) => prev.map((it) => (it.id === u.id ? { ...it, status: next } : it)));
      setMsgType("success");
      setMsg(next === "INACTIVE" ? "✅ Perfil marcado como inactivo" : "✅ Perfil reactivado");
    } catch (e: unknown) {
      setMsgType("error");
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

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
        <form key={formKey} onSubmit={(e) => void onCreate(e)} autoComplete="off" style={{ display: "grid", gap: 10, marginTop: 10, maxWidth: 520 }}>
          <input className="input" autoComplete="off" placeholder="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <label className="sub">{USERNAME_LABEL}</label>
          <input className="input" type="email" autoComplete="off" placeholder="usuario@gidi.org" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input" type="password" autoComplete="new-password" placeholder="Contraseña (opcional, se genera automática)" value={password} onChange={(e) => setPassword(e.target.value)} />
          <select className="input" value={createRole} onChange={(e) => setCreateRole(e.target.value as RoleKey)}>
            {roles.map((r) => (
              <option key={r} value={r}>{labelForRole(r)}</option>
            ))}
          </select>
          <button className="btn-primary" type="submit">+ Crear usuario</button>
        </form>
      </section>

      <section className="card" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label className="sub">Filtrar por rol</label>
          <select
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value as RoleKey)}
          >
            {statusFilter === "INACTIVE" ? (
              <option value="ALL_INACTIVE">Todos los inactivos</option>
            ) : null}
            {roles.map((r) => (
              <option key={r} value={r}>{labelForRole(r)}</option>
            ))}
          </select>
          <label className="sub">Estado</label>
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => {
              const next = e.target.value as StatusFilter;
              setStatusFilter(next);
              if (next === "INACTIVE") setRole("ALL_INACTIVE");
              else if (role === "ALL_INACTIVE") setRole("PARENT");
            }}
          >
            <option value="ACTIVE">Activos</option>
            <option value="INACTIVE">Inactivos</option>
            <option value="ALL">Todos</option>
          </select>
          <SearchInput value={query} onChange={setQuery} placeholder="Buscar usuario…" />
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
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Estado</th>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Roles</th>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>{u.fullName}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>{u.email}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>{STATUS_LABELS[u.status] ?? u.status}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>
                      {(u.roles ?? []).map((r) => labelForRole(r.role.key)).join(", ") || "-"}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3", display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <Link className="btn" href={`/admin/users/${u.id}`}>Ver / Editar</Link>
                      {u.status === "ACTIVE" || hasFullAdminRole(myRoles) ? (
                        <button type="button" className="btn" onClick={() => void onToggleStatus(u)}>
                          {u.status === "ACTIVE" ? "Desactivar" : "Reactivar"}
                        </button>
                      ) : null}
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