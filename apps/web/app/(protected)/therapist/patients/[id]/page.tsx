"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function TherapistPatientRedirectPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!roles.includes("THERAPIST")) return router.replace("/dashboard");

    router.replace(`/therapist/patients/${id}/followups`);
  }, [id, router]);

  return (
    <main className="container py-6">
      <p className="text-subtle">Cargando paciente…</p>
    </main>
  );
}
