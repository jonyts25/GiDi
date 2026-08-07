"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "../../../../../lib/api";
import { hasOfficeStaffRole, STATUS_LABELS } from "@/lib/role-permissions";
import { USERNAME_LABEL } from "@/lib/user-labels";
import { labelForCenter } from "@/lib/centers";
import ResetPasswordButton from "@/components/admin/ResetPasswordButton";

type ChildLink = {
  id: string;
  firstName: string;
  lastName: string;
  center: string;
  status: string;
  relationship: string;
  isPrimary: boolean;
};

type UserDetail = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  status: "ACTIVE" | "INACTIVE";
  roles?: { role: { key: string; name: string } }[];
  children?: ChildLink[];
};

export default function AdminParentDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [u, setU] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!hasOfficeStaffRole(roles)) return router.replace("/dashboard");

    (async () => {
      try {
        const data = await apiFetch(`/admin/users/${id}`);
        setU(data);
        setFullName(data.fullName);
        setEmail(data.email);
        setPhone(data.phone ?? "");
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

    try {
      const updated = await apiFetch(`/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ fullName, email, phone: phone.trim() || null, status }),
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
          <div className="h1">Editar padres</div>
          <p className="sub">{u ? `${u.fullName} · ${u.email}` : ""}</p>
        </div>
        <Link className="btn" href="/admin/parents">← Volver</Link>
      </div>

      <section className="card" style={{ marginTop: 14 }}>
        <form onSubmit={onSave} style={{ display: "grid", gap: 10 }}>
          <label className="sub">Nombre</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />

          <label className="sub">{USERNAME_LABEL}</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />

          <label className="sub">Teléfono</label>
          <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />

          <label className="sub">Estatus</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="ACTIVE">{STATUS_LABELS.ACTIVE}</option>
            <option value="INACTIVE">{STATUS_LABELS.INACTIVE}</option>
          </select>

          <button className="btn" type="submit">Guardar</button>
        </form>

        {msg && <p className="sub" style={{ marginTop: 12 }}>{msg}</p>}
      </section>

      <section className="card" style={{ marginTop: 14 }}>
        <h2 className="h2" style={{ marginTop: 0 }}>Hijos asignados</h2>
        {u?.children?.length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {u.children.map((c) => (
              <li key={c.id} style={{ marginBottom: 8 }}>
                <Link href={`/admin/patients/${c.id}`} style={{ fontWeight: 700 }}>
                  {c.firstName} {c.lastName}
                </Link>
                <span className="sub">
                  {" "}
                  · {labelForCenter(c.center as any)} · {c.status === "ACTIVE" ? "Activo" : "Inactivo"}
                  {c.isPrimary ? " · Principal" : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="sub">Este padre no tiene hijos vinculados. Asigne tutores desde la ficha de cada paciente.</p>
        )}
      </section>

      <section className="card" style={{ marginTop: 14 }}>
        <h2 className="h2" style={{ marginTop: 0 }}>Contraseña</h2>
        <p className="sub">Genera una contraseña temporal si la olvidaron. Deberán cambiarla al entrar.</p>
        <div style={{ marginTop: 10 }}>
          <ResetPasswordButton userId={id} />
        </div>
      </section>
    </main>
  );
}
