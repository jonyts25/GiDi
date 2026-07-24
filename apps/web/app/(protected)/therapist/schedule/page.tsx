"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TherapistScheduleEditor } from "@/components/therapists/TherapistScheduleEditor";

export default function TherapistSchedulePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");
    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!roles.includes("THERAPIST")) return router.replace("/dashboard");
    setReady(true);
  }, [router]);

  if (!ready) return <p className="py-10 text-subtle">Cargando…</p>;

  return (
    <main className="space-y-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">Mi horario</h1>
        <p className="text-sm text-subtle">
          Horario semanal registrado por administración. Solo lectura; si algo no coincide, avísale a admin o secretaría.
        </p>
      </div>
      <TherapistScheduleEditor loadEndpoint="/therapist/schedule" canEdit={false} />
    </main>
  );
}
