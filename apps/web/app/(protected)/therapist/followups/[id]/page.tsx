"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { FollowUpDetailEditor } from "@/components/followups/FollowUpDetailEditor";

export default function TherapistFollowUpDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!roles.includes("THERAPIST")) return router.replace("/dashboard");
  }, [router]);

  return (
    <main className="py-6 text-ink">
      <FollowUpDetailEditor
        followUpId={params.id}
        backHref="/therapist/followups"
        patientFollowUpsPrefix="/therapist"
        showReportExport
      />
    </main>
  );
}
