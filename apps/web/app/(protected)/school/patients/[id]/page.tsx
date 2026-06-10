"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function SchoolPatientDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<{ patient: { firstName: string; lastName: string; birthDate?: string | null; center?: string; notes?: string | null } } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    if (!token) return router.replace("/");
    (async () => {
      const res = await apiFetch(`/school/patients/${params.id}`);
      setData(res);
    })().catch(() => router.replace("/school/patients"));
  }, [params.id, router]);

  if (!data) return <p className="p-8 text-subtle">Cargando…</p>;

  const p = data.patient;

  return (
    <main className="container max-w-xl py-8">
      <Link className="btn mb-4 inline-block" href="/school/patients">← Volver</Link>
      <h1 className="text-2xl font-bold">{p.firstName} {p.lastName}</h1>
      <p className="mt-2 text-sm text-subtle">
        Centro: {p.center === "VALLARTA" ? "GiDi Vallarta" : "GiDi San Agustín"}
      </p>
      {p.birthDate ? (
        <p className="text-sm text-subtle">Nacimiento: {new Date(p.birthDate).toLocaleDateString("es-MX")}</p>
      ) : null}
      {p.notes ? <p className="mt-4 rounded-xl border border-border p-4 text-sm">{p.notes}</p> : null}
    </main>
  );
}
