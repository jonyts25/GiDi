"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "../../../../../lib/api";

type UserDetail = {
  id: string;
  fullName: string;
  email: string;
  status: "ACTIVE" | "INACTIVE";
  roles?: { role: { key: string; name: string } }[];
};

export default function AdminTherapistDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [u, setU] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

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
          <div className="h1">Editar terapeuta</div>
          <p className="sub">{u ? `${u.fullName} · ${u.email}` : ""}</p>
        </div>
        <Link className="btn" href="/admin/therapists">← Volver</Link>
      </div>

      <section className="card" style={{ marginTop: 14 }}>
        <form onSubmit={onSave} style={{ display: "grid", gap: 10 }}>
          <label className="sub">Nombre</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />

          <label className="sub">Email</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />

          <label className="sub">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>

          <button className="btn" type="submit">Guardar</button>
        </form>

        {msg && <p className="sub" style={{ marginTop: 12 }}>{msg}</p>}
      </section>
    </main>
  );
}
