"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { SearchInput, filterByQuery } from "@/components/ui/SearchInput";

type PatientRow = {
  id: string;
  firstName: string;
  lastName: string;
  center?: string;
};

export default function SchoolPatientsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!roles.includes("SCHOOL")) return router.replace("/dashboard");

    (async () => {
      try {
        const data = await apiFetch("/school/patients");
        setRows(data ?? []);
      } catch (e: unknown) {
        setMsg(e instanceof Error ? e.message : "Error al cargar pacientes");
      }
    })();
  }, [router]);

  const filtered = useMemo(
    () => filterByQuery(rows, query, (p) => `${p.firstName} ${p.lastName}`),
    [rows, query],
  );

  return (
    <main className="container py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mis pacientes</h1>
          <p className="text-sm text-subtle">Escuela · GiDi</p>
        </div>
      </div>

      <SearchInput value={query} onChange={setQuery} placeholder="Buscar paciente…" />

      {msg ? <p className="mt-4 text-sm text-subtle">{msg}</p> : null}

      <section className="card mt-4">
        {filtered.length === 0 ? (
          <p className="text-subtle">{rows.length ? "Sin coincidencias." : "No hay pacientes vinculados a esta escuela."}</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3">
                <span className="font-medium">
                  {p.lastName}, {p.firstName}
                  {p.center ? <span className="ml-2 text-xs text-subtle">· {p.center === "VALLARTA" ? "Vallarta" : "San Agustín"}</span> : null}
                </span>
                <Link className="btn rounded-lg px-3 py-1.5 text-sm" href={`/school/patients/${p.id}`}>
                  Ver
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
