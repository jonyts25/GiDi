"use client";
import { USERNAME_LABEL } from "@/lib/user-labels";

import { useEffect, useState } from "react";
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
  const [myRoles, setMyRoles] = useState<string[]>([]);

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
      } catch (e: any) {
        setMsg(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    if (u?.status === "INACTIVE" && status === "ACTIVE" && !hasFullAdminRole(myRoles)) {
      setMsg("Solo administración puede reactivar perfiles inactivos");
      return;
    }

    try {
      const updated = await apiFetch(`/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ fullName, email, status }),
      });
      setU(updated);
      setMsg("✅ Guardado");
    } catch (e: any) {
      setMsg(e.message);
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

          {u?.roles?.length ? (
            <p className="sub">Roles: {u.roles.map((r) => labelForRole(r.role.key)).join(", ")}</p>
          ) : null}

          <button className="btn" type="submit">Guardar</button>
        </form>

        {msg && <p className="sub" style={{ marginTop: 12 }}>{msg}</p>}
      </section>
    </main>
  );
}
