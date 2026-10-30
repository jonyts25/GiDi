"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { FollowUpDetailEditor } from "@/components/followups/FollowUpDetailEditor";
import { hasCoordinatorRole } from "@/lib/role-permissions";

export default function CoordinatorFollowUpDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!hasCoordinatorRole(roles)) return router.replace("/dashboard");
  }, [router]);

  return (
    <main className="container py-6 text-ink">
      <FollowUpDetailEditor
        followUpId={params.id}
        backHref="/coordinator"
        patientFollowUpsPrefix="/coordinator"
        showReportExport
        readOnly
      />
    </main>
  );
}
