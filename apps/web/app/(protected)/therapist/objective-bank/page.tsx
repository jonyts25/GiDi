"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Area = { id: string; key: string; name: string };
type Creator = { id: string; fullName: string; email: string };
type Objective = {
  id: string;
  description: string;
  areaId: string;
  isPublic: boolean;
  area: Area;
  creator: Creator;
};

function readUser(): { id: string; roles: string[] } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("gidi_user");
  if (!raw) return null;
  try {
    const u = JSON.parse(raw);
    return { id: u.id, roles: (u.roles ?? []) as string[] };
  } catch {
    return null;
  }
}

export default function TherapistObjectiveBankPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [areas, setAreas] = useState<Area[]>([]);
  const [rows, setRows] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);

  const user = useMemo(() => readUser(), []);
  const isAdmin = !!(user?.roles.includes("ADMIN") || user?.roles.includes("SUPERADMIN"));

  const mine = useMemo(
    () => rows.filter((r) => r.creator.id === user?.id),
    [rows, user?.id],
  );
  const publicOthers = useMemo(
    () => rows.filter((r) => r.isPublic && r.creator.id !== user?.id),
    [rows, user?.id],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const [a, o] = await Promise.all([apiFetch("/areas"), apiFetch("/therapist/objective-bank")]);
      setAreas(Array.isArray(a) ? a : []);
      setRows(Array.isArray(o) ? o : []);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const u = readUser();
    if (!token || !u) return router.replace("/");
    if (!u.roles.includes("THERAPIST")) return router.replace("/dashboard");
    void load();
  }, [router, load]);

  const [creating, setCreating] = useState(false);
  const [desc, setDesc] = useState("");
  const [areaId, setAreaId] = useState("");
  const [isPublicNew, setIsPublicNew] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Guardando…");
    try {
      await apiFetch("/therapist/objective-bank", {
        method: "POST",
        body: JSON.stringify({ description: desc, areaId, isPublic: isPublicNew }),
      });
      setDesc("");
      setAreaId("");
      setIsPublicNew(false);
      setCreating(false);
      setMsg("✅ Objetivo creado");
      await load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  const [editing, setEditing] = useState<Objective | null>(null);
  const [eDesc, setEDesc] = useState("");
  const [eAreaId, setEAreaId] = useState("");
  const [ePublic, setEPublic] = useState(false);

  function openEdit(o: Objective) {
    setEditing(o);
    setEDesc(o.description);
    setEAreaId(o.areaId);
    setEPublic(o.isPublic);
    setMsg("");
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setMsg("Guardando…");
    try {
      await apiFetch(`/therapist/objective-bank/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ description: eDesc, areaId: eAreaId, isPublic: ePublic }),
      });
      setEditing(null);
      setMsg("✅ Actualizado");
      await load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  async function onDeleteAdmin(id: string) {
    if (!isAdmin) return;
    if (!confirm("¿Eliminar este objetivo del banco? Se desvinculará de pacientes.")) return;
    setMsg("Eliminando…");
    try {
      await apiFetch(`/admin/objective-bank/${id}`, { method: "DELETE" });
      setMsg("✅ Eliminado");
      await load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  if (loading && rows.length === 0) {
    return (
      <main className="pt-4 text-subtle">
        <p>Cargando banco de objetivos…</p>
      </main>
    );
  }

  return (
      <main className="space-y-6 pt-2 text-ink">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Banco de objetivos</h1>
          <p className="mt-1 text-sm text-subtle">Tus objetivos y el catálogo público compartido.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/therapist/patients"
            className="rounded-xl border border-border bg-white/5 px-3 py-2 text-sm text-subtle hover:border-primary/50 hover:text-ink"
          >
            ← Mis pacientes
          </Link>
          <button
            type="button"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-hover"
            onClick={() => setCreating((v) => !v)}
          >
            {creating ? "Cerrar formulario" : "+ Nuevo objetivo"}
          </button>
        </div>
      </div>

      {msg ? (
        <p className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-subtle">{msg}</p>
      ) : null}

      {creating ? (
        <section className="card space-y-3 border-l-4 border-l-primary">
          <h2 className="text-lg font-semibold">Crear objetivo</h2>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={onCreate}>
            <label className="md:col-span-2 grid gap-1 text-sm">
              <span className="text-subtle">Descripción</span>
              <textarea
                className="textarea min-h-[88px]"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                required
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-subtle">Área</span>
              <select className="select" value={areaId} onChange={(e) => setAreaId(e.target.value)} required>
                <option value="">Selecciona…</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-border bg-white/5 px-3 py-3 text-sm">
              <input
                type="checkbox"
                checked={isPublicNew}
                onChange={(e) => setIsPublicNew(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <span>
                <span className="font-medium">Objetivo público</span>
                <span className="mt-0.5 block text-subtle">Visible para otros terapeutas en su banco.</span>
              </span>
            </label>
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <button type="submit" className="btn-primary rounded-xl px-4 py-2 text-sm">
                Guardar
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="card space-y-3 border-l-4 border-l-accent-blue">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Mis objetivos</h2>
          <span className="rounded-full bg-accent-blue/25 px-2 py-0.5 text-xs font-medium text-accent-yellow">
            Editable
          </span>
        </div>
        {mine.length === 0 ? (
          <p className="text-sm text-subtle">Aún no tienes objetivos propios.</p>
        ) : (
          <ul className="space-y-2">
            {mine.map((o) => (
              <li
                key={o.id}
                className="flex flex-col gap-2 rounded-xl border border-border bg-surface-elevated/90 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{o.description}</p>
                  <p className="text-xs text-subtle">
                    {o.area.name} · {o.isPublic ? "Público" : "Privado"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn rounded-lg px-3 py-1.5 text-sm" onClick={() => openEdit(o)}>
                    Editar
                  </button>
                  {isAdmin ? (
                    <button
                      type="button"
                      className="rounded-lg border border-accent-red/50 bg-accent-red/15 px-3 py-1.5 text-sm font-medium text-accent-red hover:bg-accent-red/25"
                      onClick={() => void onDeleteAdmin(o.id)}
                    >
                      Eliminar
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card space-y-3 border-l-4 border-l-accent-green">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Catálogo público</h2>
          <span className="text-xs text-subtle">Solo lectura</span>
        </div>
        {publicOthers.length === 0 ? (
          <p className="text-sm text-subtle">No hay objetivos públicos de otros usuarios.</p>
        ) : (
          <ul className="space-y-2">
            {publicOthers.map((o) => (
              <li
                key={o.id}
                className="flex flex-col gap-2 rounded-xl border border-border bg-white/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{o.description}</p>
                  <p className="text-xs text-subtle">
                    {o.area.name} · {o.creator.fullName}
                  </p>
                </div>
                {isAdmin ? (
                  <button
                    type="button"
                    className="shrink-0 rounded-lg border border-accent-red/50 bg-accent-red/15 px-3 py-1.5 text-sm font-medium text-accent-red hover:bg-accent-red/25"
                    onClick={() => void onDeleteAdmin(o.id)}
                  >
                    Eliminar
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-black/55"
            aria-label="Cerrar"
            onClick={() => setEditing(null)}
          />
          <section className="card fixed left-1/2 top-1/2 z-50 flex max-h-[min(90vh,640px)] w-[min(96vw,520px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-auto border-primary/40 bg-card p-4 shadow-2xl">
          <h2 className="text-lg font-semibold">Editar objetivo</h2>
          <form className="mt-3 grid flex-1 gap-3" onSubmit={onSaveEdit}>
            <label className="grid gap-1 text-sm">
              <span className="text-subtle">Descripción</span>
              <textarea className="textarea min-h-[100px]" value={eDesc} onChange={(e) => setEDesc(e.target.value)} required />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-subtle">Área</span>
              <select className="select" value={eAreaId} onChange={(e) => setEAreaId(e.target.value)} required>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-border bg-white/5 px-3 py-3 text-sm">
              <input
                type="checkbox"
                checked={ePublic}
                onChange={(e) => setEPublic(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <span className="font-medium">Público</span>
            </label>
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              <button type="submit" className="btn-primary rounded-xl px-4 py-2 text-sm">
                Guardar
              </button>
              <button type="button" className="btn rounded-xl px-4 py-2 text-sm" onClick={() => setEditing(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </section>
        </>
      ) : null}
    </main>
  );
}
