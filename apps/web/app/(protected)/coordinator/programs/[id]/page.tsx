"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ProgramEditor } from "@/components/followups/ProgramEditor";
import { hasCoordinatorRole } from "@/lib/role-permissions";

export default function CoordinatorProgramPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");
    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!hasCoordinatorRole(roles)) return router.replace("/dashboard");
  }, [router]);

  return (
    <main className="container py-6">
      <ProgramEditor programId={params.id} basePath="coordinator" readOnly />
    </main>
  );
}
