"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../../../lib/api";

type PatientRow = {
  id: string;
  firstName: string;
  lastName: string;
};

export default function TherapistPatientsPage() {
  const router = useRouter();
  const [items, setItems] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!roles.includes("THERAPIST")) return router.replace("/dashboard");

    (async () => {
      try {
        const data = await apiFetch("/therapist/patients");
        setItems(data ?? []);
      } catch (e: any) {
        setMsg(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  return (
    <main style={{ paddingTop: 18 }}>
      <div>
        <div className="h1">Mis pacientes</div>
        <p className="sub">Terapeuta · lista de pacientes asignados</p>
      </div>

      <section className="card" style={{ marginTop: 14 }}>
        {loading ? (
          <p className="sub">Cargando...</p>
        ) : msg ? (
          <p className="sub">{msg}</p>
        ) : items.length === 0 ? (
          <p className="sub">No tienes pacientes asignados.</p>
        ) : (
          <ul style={{ paddingLeft: 18 }}>
            {items.map((p) => (
              <li key={p.id} style={{ marginBottom: 8 }}>
                <Link href={`/therapist/patients/${p.id}/followups`} className="font-bold text-primary hover:underline">
                  {p.firstName} {p.lastName}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
