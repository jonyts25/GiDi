"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Dashboard() {
  const router = useRouter();

  const user = useMemo(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("gidi_user") : null;
    return raw ? JSON.parse(raw) : null;
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) router.replace("/");
  }, [router]);

  const roles: string[] = user?.roles ?? [];

  // si no es admin, redirigimos como antes
  useEffect(() => {
    if (roles.includes("THERAPIST")) router.replace("/therapist/patients");
    else if (roles.includes("PARENT")) router.replace("/parent/patients");
    else if (roles.includes("SCHOOL")) router.replace("/school/patients");
  }, [roles, router]);

  if (!roles.length) return <p style={{ padding: 20 }}>Cargando...</p>;

  if (roles.includes("ADMIN")) {
    return (
      <main style={{ padding: 20 }}>
        <h1 style={{ marginTop: 0 }}>Dashboard Admin</h1>
        <p style={{ opacity: 0.8 }}>Elige un módulo:</p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
          <Link className="btn" href="/admin/patients">Pacientes</Link>
          <Link className="btn" href="/admin/therapists">Terapeutas</Link>
          <Link className="btn" href="/admin/parents">Padres</Link>
          <Link className="btn" href="/admin/schools">Escuelas</Link>
          <Link className="btn" href="/admin/users">Usuarios</Link>
          <Link className="btn" href="/admin/announcements">Avisos</Link>
          <Link className="btn" href="/admin/payments">Ingresos</Link>
        </div>
      </main>
    );
  }

  return <p style={{ padding: 20 }}>Cargando...</p>;
}
