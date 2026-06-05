"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TherapistIndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!roles.includes("THERAPIST")) return router.replace("/dashboard");

    router.replace("/therapist/patients");
  }, [router]);

  return <main className="container" style={{ paddingTop: 18 }}>Cargando...</main>;
}
