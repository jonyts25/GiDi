"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { PatientGeneralProfile, type PatientProfileData } from "@/components/patients/PatientGeneralProfile";

export default function SchoolPatientDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PatientProfileData | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    if (!token) return router.replace("/");
    (async () => {
      try {
        const data = (await apiFetch(`/school/patients/${params.id}`)) as PatientProfileData;
        setProfile(data);
      } catch (e: unknown) {
        setMsg(e instanceof Error ? e.message : "Error");
      }
    })();
  }, [params.id, router]);

  if (!profile && !msg) return <p className="p-8 text-subtle">Cargando…</p>;

  return (
    <main className="container max-w-[820px] space-y-4 py-8">
      <Link className="btn inline-block" href="/school/patients">← Volver</Link>
      {msg ? <p className="text-sm text-danger">{msg}</p> : null}
      {profile ? (
        <PatientGeneralProfile
          profile={profile}
          followUpsHref={`/school/patients/${params.id}/followups`}
          followUpsLabel="Seguimientos mensuales →"
        />
      ) : null}
    </main>
  );
}
