"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { SearchInput, filterByQuery } from "@/components/ui/SearchInput";
import { hasOfficeStaffRole } from "@/lib/role-permissions";

type DischargedPatient = {
  id: string;
  firstName: string;
  lastName: string;
  center?: string | null;
  notes?: string | null;
  dischargedAt?: string | null;
  dischargeReason?: string | null;
};

const CENTER_LABEL: Record<string, string> = {
  SAN_AGUSTIN: "San Agustín",
  VALLARTA: "Vallarta",
};

export default function DischargedPatientsPage() {
  const router = useRouter();
  const [items, setItems] = useState<DischargedPatient[]>([]);
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const data = (await apiFetch("/admin/patients/discharged")) as DischargedPatient[];
      setItems(data ?? []);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");
    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!hasOfficeStaffRole(roles)) return router.replace("/dashboard");
    void load();
  }, [router]);

  const filtered = useMemo(
    () => filterByQuery(items, query, (p) => `${p.firstName} ${p.lastName} ${p.dischargeReason ?? ""}`),
    [items, query],
  );

  async function reactivate(id: string) {
    setMsg("");
    try {
      await apiFetch(`/admin/patients/${id}/reactivate`, { method: "POST" });
      setMsg("✅ Paciente reactivado");
      await load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <main className="space-y-5 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bajas</h1>
          <p className="text-sm text-subtle">Pacientes dados de baja. El historial se conserva.</p>
        </div>
        <Link className="btn rounded-xl px-3 py-2 text-sm" href="/admin/patients">← Pacientes</Link>
      </div>

      <section className="card space-y-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar paciente dado de baja…" />
        {msg ? <p className={`text-sm ${msg.includes("✅") ? "text-success" : "text-danger"}`}>{msg}</p> : null}

        {loading ? (
          <p className="text-sm text-subtle">Cargando…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-subtle">No hay pacientes dados de baja.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-subtle">
                  <th className="py-2 pr-3">Paciente</th>
                  <th className="py-2 pr-3">Sede</th>
                  <th className="py-2 pr-3">Fecha de baja</th>
                  <th className="py-2 pr-3">Motivo</th>
                  <th className="py-2 pr-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-semibold">
                      {p.firstName} {p.lastName}
                    </td>
                    <td className="py-2 pr-3 text-subtle">{p.center ? (CENTER_LABEL[p.center] ?? p.center) : "—"}</td>
                    <td className="py-2 pr-3 text-subtle">
                      {p.dischargedAt ? new Date(p.dischargedAt).toLocaleDateString("es-MX") : "—"}
                    </td>
                    <td className="py-2 pr-3 text-subtle">{p.dischargeReason || "—"}</td>
                    <td className="py-2 pr-3">
                      <span className="flex flex-wrap gap-2">
                        <Link className="btn rounded-lg px-2 py-1 text-xs" href={`/admin/patients/${p.id}`}>
                          Abrir
                        </Link>
                        <button type="button" className="btn rounded-lg px-2 py-1 text-xs" onClick={() => void reactivate(p.id)}>
                          Reactivar paciente
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
