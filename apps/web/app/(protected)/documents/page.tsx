"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { openDataUrlInNewTab } from "@/lib/open-data-url";
import {
  hasFullAdminRole,
  hasOfficeStaffRole,
  hasParentPortalAccess,
} from "@/lib/role-permissions";

type CenterDoc = {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  mimeType: string;
  updatedAt: string;
};

export default function CenterDocumentsReadPage() {
  const router = useRouter();
  const [items, setItems] = useState<CenterDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (roles.includes("SCHOOL") && !roles.some((r) => ["ADMIN", "SUPERADMIN", "SECRETARY", "FINANCE", "PARENT", "THERAPIST"].includes(r))) {
      return router.replace("/dashboard");
    }
    if (hasFullAdminRole(roles)) return router.replace("/admin/documents");

    const allowed =
      hasOfficeStaffRole(roles) ||
      roles.includes("THERAPIST") ||
      hasParentPortalAccess(roles) ||
      (roles.includes("PARENT") && !roles.includes("SCHOOL"));

    if (!allowed) return router.replace("/dashboard");

    (async () => {
      try {
        const data = (await apiFetch("/center-documents")) as CenterDoc[];
        setItems(data ?? []);
      } catch (e: unknown) {
        setMsg(e instanceof Error ? e.message : "Error al cargar documentos");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function openDoc(id: string) {
    setMsg("");
    try {
      const data = (await apiFetch(`/center-documents/${id}/file`)) as {
        dataUrl: string;
        fileName: string;
        mimeType: string;
      };
      openDataUrlInNewTab(data.dataUrl, data.mimeType, data.fileName);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "No se pudo abrir el documento");
    }
  }

  return (
    <main className="container max-w-[720px] space-y-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Documentos del centro</h1>
          <p className="text-sm text-subtle">Reglamentos e información institucional.</p>
        </div>
        <Link className="btn rounded-xl px-3 py-2 text-sm" href="/dashboard">
          ← Volver
        </Link>
      </div>

      {msg ? <p className="text-sm text-danger">{msg}</p> : null}

      <section className="card space-y-4">
        {loading ? (
          <p className="text-sm text-subtle">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-subtle">No hay documentos disponibles.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border px-4 py-3">
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">{doc.title}</h2>
                  {doc.description ? <p className="mt-1 text-sm text-subtle">{doc.description}</p> : null}
                  <p className="mt-2 text-xs text-subtle">Actualizado: {new Date(doc.updatedAt).toLocaleString("es-MX")}</p>
                </div>
                <button type="button" className="btn shrink-0 rounded-lg px-3 py-1.5 text-sm" onClick={() => void openDoc(doc.id)}>
                  Ver
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
