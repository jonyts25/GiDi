"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../../lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SearchInput, filterByQuery } from "@/components/ui/SearchInput";
import { ListPagination } from "@/components/ui/ListPagination";
import { paginate, sortByFullName, type SortDir } from "@/lib/list-utils";

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  notes?: string | null;
  center?: string;
  createdAt: string;
};

const CENTER_LABEL: Record<string, string> = {
  SAN_AGUSTIN: "San Agustín",
  VALLARTA: "Vallarta",
};

export default function AdminPatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [query, setQuery] = useState("");
  const [centerFilter, setCenterFilter] = useState<"" | "SAN_AGUSTIN" | "VALLARTA">("");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!roles.includes("ADMIN")) return router.replace("/dashboard");

    (async () => {
      try {
        const data = await apiFetch("/patients");
        setPatients(data);
      } catch (e: unknown) {
        setMsg(e instanceof Error ? e.message : "Error al cargar pacientes");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    setPage(1);
  }, [query, centerFilter, sortDir, pageSize]);

  const filtered = useMemo(() => {
    let list = filterByQuery(patients, query, (p) => `${p.firstName} ${p.lastName}`);
    if (centerFilter) list = list.filter((p) => p.center === centerFilter);
    return sortByFullName(list, (p) => p, sortDir);
  }, [patients, query, centerFilter, sortDir]);

  const paged = useMemo(
    () => paginate(filtered, page, pageSize),
    [filtered, page, pageSize],
  );

  function toggleSort() {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  }

  return (
    <main style={{ paddingTop: 18 }}>
      <div className="row">
        <div>
          <div className="h1">Pacientes</div>
          <p className="sub">Admin · listado y alta</p>
        </div>
        <Link className="btn" href="/dashboard">
          ← Volver
        </Link>
        <span className="badge">
          {filtered.length} / {patients.length}
        </span>
      </div>

      <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 10 }}>
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar por nombre…" />
        <select
          className="input"
          value={centerFilter}
          onChange={(e) => setCenterFilter(e.target.value as "" | "SAN_AGUSTIN" | "VALLARTA")}
        >
          <option value="">Todos los centros</option>
          <option value="SAN_AGUSTIN">San Agustín</option>
          <option value="VALLARTA">Vallarta</option>
        </select>
      </div>

      <div className="grid2" style={{ marginTop: 14 }}>
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Alta completa</h3>
          <p className="sub" style={{ marginTop: 6 }}>
            Registra paciente + padres/tutores + escuela + terapeuta(s). Al final te muestra credenciales generadas
            para copiar y enviar.
          </p>
          <div style={{ marginTop: 12 }}>
            <Link href="/admin/patients/new">
              <button className="btn">Ir a alta completa</button>
            </Link>
          </div>
          <p className="sub" style={{ marginTop: 12 }}>
            (Si luego quieres, dejamos también “alta rápida”, pero para demo es mejor un solo flujo.)
          </p>
        </section>

        <section className="card">
          <div className="row" style={{ alignItems: "baseline" }}>
            <h3 style={{ marginTop: 0 }}>Listado</h3>
            <span className="sub">Click en un nombre para abrir la ficha</span>
          </div>

          {msg ? <p className="sub text-danger">{msg}</p> : null}

          {loading ? (
            <p className="sub">Cargando...</p>
          ) : patients.length === 0 ? (
            <p className="sub">Aún no hay pacientes.</p>
          ) : filtered.length === 0 ? (
            <p className="sub">Ningún paciente coincide con la búsqueda.</p>
          ) : (
            <>
              <div
                className="mt-3 overflow-x-auto overflow-y-auto rounded-lg border border-border"
                style={{ maxHeight: "min(520px, 60vh)" }}
              >
                <table className="table">
                  <thead className="sticky top-0 z-10 bg-surface-elevated shadow-sm">
                    <tr style={{ textAlign: "left" }}>
                      <th>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 font-semibold hover:text-primary"
                          onClick={toggleSort}
                        >
                          Nombre
                          <span className="text-xs text-subtle" aria-hidden>
                            {sortDir === "asc" ? "↑" : "↓"}
                          </span>
                        </button>
                      </th>
                      <th>Sede</th>
                      <th>Notas</th>
                      <th>Creado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.items.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <Link href={`/admin/patients/${p.id}`} style={{ fontWeight: 800 }}>
                            {p.firstName} {p.lastName}
                          </Link>
                        </td>
                        <td style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>
                          {p.center ? (CENTER_LABEL[p.center] ?? p.center) : "—"}
                        </td>
                        <td style={{ color: "var(--muted)" }}>{p.notes ?? ""}</td>
                        <td style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>
                          {new Date(p.createdAt).toLocaleDateString("es-MX")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ListPagination
                page={paged.page}
                totalPages={paged.totalPages}
                from={paged.from}
                to={paged.to}
                total={paged.total}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
