"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { PatientGeneralProfile, type PatientProfileData } from "@/components/patients/PatientGeneralProfile";

export default function TherapistPatientDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [profile, setProfile] = useState<PatientProfileData | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!roles.includes("THERAPIST")) return router.replace("/dashboard");

    (async () => {
      try {
        const data = (await apiFetch(`/therapist/patients/${id}`)) as PatientProfileData;
        setProfile(data);
      } catch (e: unknown) {
        setMsg(e instanceof Error ? e.message : "Error");
      }
    })();
  }, [id, router]);

  return (
    <main className="container max-w-[820px] space-y-4 py-6">
      <Link className="btn inline-flex rounded-xl px-3 py-2 text-sm" href="/therapist/patients">
        ← Mis pacientes
      </Link>
      {msg ? <p className="text-sm text-danger">{msg}</p> : null}
      {!profile && !msg ? <p className="text-subtle">Cargando…</p> : null}
      {profile ? (
        <PatientGeneralProfile
          profile={profile}
          followUpsHref={`/therapist/patients/${id}/followups`}
          followUpsLabel="Seguimientos del mes →"
        />
      ) : null}
    </main>
  );
}
