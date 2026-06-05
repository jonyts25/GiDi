"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../../lib/api";
import { useRouter } from "next/navigation";

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: string | null;
  notes?: string | null;
};

export default function ParentPatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [msg, setMsg] = useState("Cargando...");

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!roles.includes("PARENT")) return router.replace("/dashboard");

    (async () => {
      try {
        const data = await apiFetch("/parent/patients");
        setPatients(data);
        setMsg("");
      } catch (e: any) {
        setMsg(e.message);
      }
    })();
  }, [router]);

  return (
    <main style={{ paddingTop: 18 }}>
      <div className="card">
        <div className="h1">Mis hijos</div>
        {msg && <p className="sub">{msg}</p>}
      </div>

      <section className="card" style={{ marginTop: 12 }}>
        {patients.length === 0 ? (
          <p className="sub">Aún no tienes pacientes asignados.</p>
        ) : (
          <ul style={{ paddingLeft: 18 }}>
            {patients.map((p) => (
              <li key={p.id} style={{ marginBottom: 10 }}>
                <Link href={`/parent/patients/${p.id}`}>
                  {p.firstName} {p.lastName}
                </Link>
                {p.notes ? <div className="sub">{p.notes}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
