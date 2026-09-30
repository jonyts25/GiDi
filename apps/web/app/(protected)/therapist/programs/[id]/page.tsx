"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProgramEditor } from "@/components/followups/ProgramEditor";

export default function TherapistProgramPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!roles.includes("THERAPIST")) return router.replace("/dashboard");
  }, [router]);

  const patientId = typeof window !== "undefined" ? sessionStorage.getItem("gidi_program_patient") : null;

  return (
    <main className="py-6 text-ink">
      <ProgramEditor
        programId={params.id}
        backHref={patientId ? `/therapist/patients/${patientId}/followups` : "/therapist/followups"}
      />
    </main>
  );
}
