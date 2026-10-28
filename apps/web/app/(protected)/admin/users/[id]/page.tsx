"use client";
import { USERNAME_LABEL } from "@/lib/user-labels";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "../../../../../lib/api";
import ResetPasswordButton from "@/components/admin/ResetPasswordButton";
import { hasFullAdminRole, hasOfficeStaffRole, STATUS_LABELS, labelForRole } from "@/lib/role-permissions";

type UserDetail = {
  id: string;
  fullName: string;
  email: string;
  status: "ACTIVE" | "INACTIVE";
  roles?: { role: { key: string; name: string } }[];
};

const EDITABLE_ROLE_OPTIONS: { key: string; label: string }[] = [
  { key: "ADMIN", label: "Administrador" },
  { key: "SECRETARY", label: "Secretaría" },
  { key: "THERAPIST", label: "Terapeuta" },
  { key: "COORDINATOR", label: "Coordinadora" },
  { key: "FINANCE", label: "Finanzas" },
  { key: "SCHOOL", label: "Escuela" },
  { key: "PARENT", label: "Papá/Mamá" },
];

export default function AdminUserDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [u, setU] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [myRoles, setMyRoles] = useState<string[]>([]);

  const canEditRoles = hasFullAdminRole(myRoles);
  const isSuperAdmin = myRoles.includes("SUPERADMIN");

  const roleOptions = useMemo(() => {
    if (isSuperAdmin) {
      return [{ key: "SUPERADMIN", label: "Superadmin" }, ...EDITABLE_ROLE_OPTIONS];
    }
    return EDITABLE_ROLE_OPTIONS;
  }, [isSuperAdmin]);

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    setMyRoles(roles);
    if (!hasOfficeStaffRole(roles)) return router.replace("/dashboard");

    (async () => {
      try {
        const data = await apiFetch(`/admin/users/${id}`);
        setU(data);
        setFullName(data.fullName);
        setEmail(data.email);
        setStatus(data.status);
        setSelectedRoles((data.roles ?? []).map((r: { role: { key: string } }) => r.role.key));
      } catch (e: unknown) {
        setMsg(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  function toggleRole(key: string) {
    setSelectedRoles((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    if (u?.status === "INACTIVE" && status === "ACTIVE" && !hasFullAdminRole(myRoles)) {
      setMsg("Solo administración puede reactivar perfiles inactivos");
      return;
    }

    if (canEditRoles && selectedRoles.length === 0) {
      setMsg("Debe conservar al menos un perfil");
      return;
    }

    try {
      const body: Record<string, unknown> = { fullName, email, status };
      if (canEditRoles) {
        body.roles = selectedRoles;
      }
      const updated = await apiFetch(`/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setU(updated);
      setSelectedRoles((updated.roles ?? []).map((r: { role: { key: string } }) => r.role.key));
      setMsg("✅ Guardado");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error al guardar");
    }
  }

  if (loading) return <p style={{ padding: 20 }}>Cargando...</p>;

  return (
    <main style={{ paddingTop: 18 }}>
      <div className="row">
        <div>
          <div className="h1">Editar usuario</div>
          <p className="sub">{u ? `${u.fullName} · ${u.email}` : ""}</p>
        </div>
        <Link className="btn" href="/admin/users">← Volver</Link>
      </div>

      <section className="card" style={{ marginTop: 14 }}>
        {u && (
          <div style={{ marginBottom: 12 }}>
            <div className="sub" style={{ marginBottom: 6 }}>Acciones admin</div>
            <ResetPasswordButton userId={u.id} />
          </div>
        )}

        <form onSubmit={onSave} style={{ display: "grid", gap: 10 }}>
          <label className="sub">Nombre</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />

          <label className="sub">{USERNAME_LABEL}</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />

          <label className="sub">Estado</label>
          {u?.status === "INACTIVE" && !hasFullAdminRole(myRoles) ? (
            <p className="sub">{STATUS_LABELS.INACTIVE} — solo administración puede reactivar</p>
          ) : (
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}>
              <option value="ACTIVE">{STATUS_LABELS.ACTIVE}</option>
              <option value="INACTIVE">{STATUS_LABELS.INACTIVE}</option>
            </select>
          )}

          <div style={{ marginTop: 8 }}>
            <div className="sub" style={{ marginBottom: 8, fontWeight: 600 }}>
              Perfiles
            </div>
            {canEditRoles ? (
              <>
                <div style={{ display: "grid", gap: 8 }}>
                  {roleOptions.map((opt) => (
                    <label key={opt.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(opt.key)}
                        onChange={() => toggleRole(opt.key)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
                <p className="sub" style={{ marginTop: 10 }}>
                  El usuario debe cerrar sesión y volver a entrar para ver su nuevo menú.
                </p>
              </>
            ) : u?.roles?.length ? (
              <p className="sub">{u.roles.map((r) => labelForRole(r.role.key)).join(", ")}</p>
            ) : (
              <p className="sub">Sin perfiles</p>
            )}
          </div>

          <button className="btn" type="submit">Guardar</button>
        </form>

        {msg && <p className="sub" style={{ marginTop: 12 }}>{msg}</p>}
      </section>
    </main>
  );
}
