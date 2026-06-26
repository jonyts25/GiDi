"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { SaveBanner } from "@/components/ui/SaveBanner";

type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: { fullName: string };
};

const AUDIENCE_OPTIONS: { key: string; label: string }[] = [
  { key: "PARENT", label: "Papás" },
  { key: "THERAPIST", label: "Terapeutas" },
  { key: "SCHOOL", label: "Escuelas" },
  { key: "ADMIN", label: "Administradores" },
];

function audienceLabel(audience: string[]): string {
  if (!audience.length) return "Todos";
  return audience
    .map((a) => AUDIENCE_OPTIONS.find((o) => o.key === a)?.label ?? a)
    .join(", ");
}

export default function AdminAnnouncementsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    try {
      const data = (await apiFetch("/announcements")) as Announcement[];
      setItems(data ?? []);
    } catch (e: unknown) {
      setMsgType("error");
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");
    const myRoles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!myRoles.includes("ADMIN")) return router.replace("/dashboard");
    void load();
  }, [router]);

  function toggleAudience(key: string) {
    setAudience((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (!title.trim() || !body.trim()) {
      setMsgType("error");
      setMsg("Título y mensaje son obligatorios");
      return;
    }
    try {
      await apiFetch("/announcements", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), body: body.trim(), audience }),
      });
      setTitle("");
      setBody("");
      setAudience([]);
      setMsgType("success");
      setMsg("✅ Aviso publicado");
      await load();
    } catch (e: unknown) {
      setMsgType("error");
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  async function onToggleActive(a: Announcement) {
    setMsg("");
    try {
      await apiFetch(`/announcements/${a.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !a.isActive }),
      });
      setItems((prev) => prev.map((it) => (it.id === a.id ? { ...it, isActive: !it.isActive } : it)));
      setMsgType("success");
      setMsg(a.isActive ? "✅ Aviso desactivado" : "✅ Aviso reactivado");
    } catch (e: unknown) {
      setMsgType("error");
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  async function onDelete(a: Announcement) {
    if (!window.confirm(`¿Eliminar el aviso «${a.title}»?`)) return;
    setMsg("");
    try {
      await apiFetch(`/announcements/${a.id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((it) => it.id !== a.id));
      setMsgType("success");
      setMsg("🗑️ Aviso eliminado");
    } catch (e: unknown) {
      setMsgType("error");
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <main className="container max-w-[820px] space-y-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Avisos generales</h1>
          <p className="text-sm text-subtle">
            Cada persona verá los avisos de su rol al entrar a la app.
          </p>
        </div>
        <Link className="btn rounded-xl px-3 py-2 text-sm" href="/dashboard">
          ← Volver
        </Link>
      </div>

      <section className="card space-y-4 border-l-4 border-l-primary">
        <h2 className="text-lg font-semibold">Nuevo aviso</h2>
        <form onSubmit={(e) => void onCreate(e)} className="grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Título</span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Mensaje</span>
            <textarea className="textarea min-h-[120px]" value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} required />
          </label>
          <div className="grid gap-1 text-sm">
            <span className="font-medium">¿Para quién? (vacío = todos)</span>
            <div className="flex flex-wrap gap-4">
              {AUDIENCE_OPTIONS.map((o) => (
                <label key={o.key} className="flex items-center gap-2">
                  <input type="checkbox" checked={audience.includes(o.key)} onChange={() => toggleAudience(o.key)} />
                  {o.label}
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className="btn-primary w-fit rounded-xl px-5 py-2.5 text-sm font-semibold">
            Publicar aviso
          </button>
        </form>
      </section>

      <SaveBanner message={msg} type={msgType} />

      <section className="card space-y-3 border-l-4 border-l-info">
        <h2 className="text-lg font-semibold">Avisos publicados</h2>
        {loading ? (
          <p className="text-sm text-subtle">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-subtle">Aún no hay avisos.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((a) => (
              <li key={a.id} className="rounded-lg border border-border px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      {a.title}
                      {!a.isActive ? (
                        <span className="ml-2 rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                          Inactivo
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-subtle">{a.body}</p>
                    <p className="mt-2 text-xs text-subtle">
                      Para: {audienceLabel(a.audience)} · {new Date(a.createdAt).toLocaleDateString("es-MX")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" className="btn rounded-lg px-3 py-1.5 text-xs" onClick={() => void onToggleActive(a)}>
                      {a.isActive ? "Desactivar" : "Reactivar"}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs text-danger hover:bg-danger/10"
                      onClick={() => void onDelete(a)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
