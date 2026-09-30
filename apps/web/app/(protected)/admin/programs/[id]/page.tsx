"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProgramEditor } from "@/components/followups/ProgramEditor";
import { hasOfficeStaffRole } from "@/lib/role-permissions";

export default function AdminProgramPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!hasOfficeStaffRole(roles)) return router.replace("/dashboard");
  }, [router]);

  return (
    <main className="container py-8 text-ink">
      <ProgramEditor programId={params.id} basePath="admin" />
    </main>
  );
}
