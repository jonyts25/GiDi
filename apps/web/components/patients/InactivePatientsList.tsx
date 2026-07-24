"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { SearchInput, filterByQuery } from "@/components/ui/SearchInput";
import { hasOfficeStaffRole } from "@/lib/role-permissions";
import { labelForCenter } from "@/lib/centers";

type InactivePatient = {
  id: string;
  firstName: string;
  lastName: string;
  center?: string | null;
  notes?: string | null;
  dischargedAt?: string | null;
  dischargeReason?: string | null;
};

export function InactivePatientsList(props: {
  endpoint: string;
  title: string;
  subtitle: string;
  emptyLabel: string;
  searchPlaceholder: string;
  dateColumnLabel: string;
}) {
  const { endpoint, title, subtitle, emptyLabel, searchPlaceholder, dateColumnLabel } = props;
  const router = useRouter();
  const [items, setItems] = useState<InactivePatient[]>([]);
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const data = (await apiFetch(endpoint)) as InactivePatient[];
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, endpoint]);

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
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-subtle">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="btn rounded-xl px-3 py-2 text-sm" href="/admin/patients">← Pacientes</Link>
          <Link className="btn rounded-xl px-3 py-2 text-sm" href="/admin/patients/altas">Altas</Link>
          <Link className="btn rounded-xl px-3 py-2 text-sm" href="/admin/patients/discharged">Bajas</Link>
        </div>
      </div>

      <section className="card space-y-3">
        <SearchInput value={query} onChange={setQuery} placeholder={searchPlaceholder} />
        {msg ? <p className={`text-sm ${msg.includes("✅") ? "text-success" : "text-danger"}`}>{msg}</p> : null}

        {loading ? (
          <p className="text-sm text-subtle">Cargando…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-subtle">{emptyLabel}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-subtle">
                  <th className="py-2 pr-3">Paciente</th>
                  <th className="py-2 pr-3">Sede</th>
                  <th className="py-2 pr-3">{dateColumnLabel}</th>
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
                    <td className="py-2 pr-3 text-subtle">{labelForCenter(p.center)}</td>
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
