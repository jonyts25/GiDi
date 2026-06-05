"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "../../../../../lib/api";

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: string | null;
  notes?: string | null;
};

export default function ParentPatientDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [msg, setMsg] = useState("Cargando...");

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!roles.includes("PARENT")) return router.replace("/dashboard");

    (async () => {
      try {
        const p = await apiFetch(`/parent/patients/${id}`);
        setPatient(p);
        setMsg("");
      } catch (e: unknown) {
        setMsg(e instanceof Error ? e.message : "Error");
      }
    })();
  }, [id, router]);

  return (
    <main className="max-w-[720px] space-y-6 py-6">
      <Link className="btn inline-flex rounded-xl px-3 py-2 text-sm" href="/parent/patients">
        ← Mis hijos
      </Link>

      <div className="card">
        <h1 className="text-2xl font-bold">
          {patient ? `${patient.firstName} ${patient.lastName}` : "Paciente"}
        </h1>
        {patient?.notes ? <p className="mt-2 text-sm text-subtle">{patient.notes}</p> : null}
        {msg ? <p className="mt-2 text-sm text-subtle">{msg}</p> : null}
      </div>

      <section className="card border-l-4 border-l-primary">
        <h2 className="text-lg font-semibold">Seguimiento terapéutico</h2>
        <p className="mt-1 text-sm text-subtle">
          Consulte el avance del mes: asistencia, objetivos y observaciones de cada área.
        </p>
        <Link
          className="btn-primary mt-4 inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold"
          href={`/parent/patients/${id}/followups`}
        >
          Ver resumen del mes →
        </Link>
      </section>
    </main>
  );
}
