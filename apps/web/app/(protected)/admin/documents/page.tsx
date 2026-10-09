"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { prepareFileForUpload } from "@/lib/compress-upload";
import { hasFullAdminRole } from "@/lib/role-permissions";
import { useToast } from "@/components/ui/Toast";

type CenterDoc = {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  mimeType: string;
  audience: string[];
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
};

const UPLOAD_HINT =
  "Formatos permitidos: JPG, PNG, WEBP o PDF · Máximo 20 MB · Las fotos se comprimen automáticamente al subir.";

function audienceLabel(audience: string[]): string {
  const parts: string[] = [];
  if (audience.includes("PARENT")) parts.push("Papás");
  if (audience.includes("THERAPIST")) parts.push("Terapeutas");
  return parts.join(", ") || "—";
}

export default function AdminCenterDocumentsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<CenterDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [officeStaffAccess, setOfficeStaffAccess] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audienceParent, setAudienceParent] = useState(true);
  const [audienceTherapist, setAudienceTherapist] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const [pendingFile, setPendingFile] = useState<{ fileName: string; mimeType: string; dataUrl: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editParent, setEditParent] = useState(false);
  const [editTherapist, setEditTherapist] = useState(false);
  const [editSortOrder, setEditSortOrder] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [docs, settings] = await Promise.all([
        apiFetch("/center-documents") as Promise<CenterDoc[]>,
        apiFetch("/admin/center-documents/settings") as Promise<{ officeStaffAccess: boolean }>,
      ]);
      setItems(docs ?? []);
      setOfficeStaffAccess(settings.officeStaffAccess);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error al cargar", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");
    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!hasFullAdminRole(roles)) return router.replace("/dashboard");
    void load();
  }, [router, load]);

  function buildAudience(parent: boolean, therapist: boolean): string[] {
    const a: string[] = [];
    if (parent) a.push("PARENT");
    if (therapist) a.push("THERAPIST");
    return a;
  }

  async function onPickNewFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const prepared = await prepareFileForUpload(file);
      setPendingFile(prepared);
      showToast(`Archivo listo: ${prepared.fileName}`, "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error al procesar archivo", "error");
    } finally {
      setBusy(false);
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const audience = buildAudience(audienceParent, audienceTherapist);
    if (!title.trim()) {
      showToast("El título es obligatorio", "error");
      return;
    }
    if (audience.length === 0) {
      showToast("Seleccione al menos Papás o Terapeutas", "error");
      return;
    }
    if (!pendingFile) {
      showToast("Seleccione un archivo PDF o imagen", "error");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/admin/center-documents", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          audience,
          sortOrder,
          ...pendingFile,
        }),
      });
      setTitle("");
      setDescription("");
      setAudienceParent(true);
      setAudienceTherapist(false);
      setSortOrder(0);
      setPendingFile(null);
      showToast("Documento publicado", "success");
      await load();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error al crear", "error");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(doc: CenterDoc) {
    setEditingId(doc.id);
    setEditTitle(doc.title);
    setEditDescription(doc.description ?? "");
    setEditParent(doc.audience.includes("PARENT"));
    setEditTherapist(doc.audience.includes("THERAPIST"));
    setEditSortOrder(doc.sortOrder);
  }

  async function saveEdit() {
    if (!editingId) return;
    const audience = buildAudience(editParent, editTherapist);
    if (!editTitle.trim() || audience.length === 0) {
      showToast("Título y al menos un destinatario son obligatorios", "error");
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/admin/center-documents/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          audience,
          sortOrder: editSortOrder,
        }),
      });
      setEditingId(null);
      showToast("Cambios guardados", "success");
      await load();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error al guardar", "error");
    } finally {
      setBusy(false);
    }
  }

  async function onReplaceFile(docId: string, file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const prepared = await prepareFileForUpload(file);
      await apiFetch(`/admin/center-documents/${docId}`, {
        method: "PATCH",
        body: JSON.stringify(prepared),
      });
      showToast("Archivo reemplazado", "success");
      await load();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error al reemplazar", "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(doc: CenterDoc) {
    setBusy(true);
    try {
      await apiFetch(`/admin/center-documents/${doc.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !doc.isActive }),
      });
      showToast(doc.isActive ? "Documento desactivado" : "Documento activado", "success");
      await load();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error", "error");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(doc: CenterDoc) {
    if (!window.confirm(`¿Eliminar «${doc.title}»? Esta acción no se puede deshacer.`)) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/center-documents/${doc.id}`, { method: "DELETE" });
      showToast("Documento eliminado", "success");
      await load();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error al eliminar", "error");
    } finally {
      setBusy(false);
    }
  }

  async function onToggleOfficeAccess() {
    const next = !officeStaffAccess;
    setSavingSettings(true);
    try {
      const updated = (await apiFetch("/admin/center-documents/settings", {
        method: "PATCH",
        body: JSON.stringify({ officeStaffAccess: next }),
      })) as { officeStaffAccess: boolean };
      setOfficeStaffAccess(updated.officeStaffAccess);
      showToast(
        updated.officeStaffAccess
          ? "Secretaría y finanzas pueden ver documentos"
          : "Acceso restringido para secretaría y finanzas",
        "success",
      );
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error al guardar configuración", "error");
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <main className="container max-w-[920px] space-y-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Documentos del centro</h1>
          <p className="text-sm text-subtle">
            Reglamento, aviso de privacidad y documentos institucionales visibles por rol.
          </p>
        </div>
        <Link className="btn rounded-xl px-3 py-2 text-sm" href="/dashboard">
          ← Volver
        </Link>
      </div>

      <section className="card space-y-3 border-l-4 border-l-accent-blue">
        <h2 className="text-lg font-semibold">Acceso de secretaría y finanzas</h2>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={officeStaffAccess}
            disabled={savingSettings}
            onChange={() => void onToggleOfficeAccess()}
          />
          <span>
            Permitir que secretaría y finanzas consulten los documentos activos (solo lectura).
            Desmarque para restringir ese acceso.
          </span>
        </label>
      </section>

      <section className="card space-y-4 border-l-4 border-l-primary">
        <h2 className="text-lg font-semibold">Subir documento nuevo</h2>
        <form onSubmit={(e) => void onCreate(e)} className="grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Título</span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Descripción (opcional)</span>
            <textarea className="input min-h-[4rem]" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
          </label>
          <div className="grid gap-2 text-sm">
            <span className="font-medium">Dirigido a</span>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={audienceParent} onChange={(e) => setAudienceParent(e.target.checked)} />
              Papás
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={audienceTherapist} onChange={(e) => setAudienceTherapist(e.target.checked)} />
              Terapeutas
            </label>
          </div>
          <label className="grid max-w-[8rem] gap-1 text-sm">
            <span className="font-medium">Orden</span>
            <input
              type="number"
              className="input"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn rounded-xl px-4 py-2 text-sm"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              Seleccionar archivo
            </button>
            <span className="text-sm text-subtle">{pendingFile?.fileName ?? "Ningún archivo seleccionado"}</span>
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept="image/jpeg,image/png,image/webp,image/*,.pdf,application/pdf"
              disabled={busy}
              onChange={(e) => void onPickNewFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <p className="text-xs text-subtle">{UPLOAD_HINT}</p>
          <button type="submit" className="btn w-fit rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50" disabled={busy}>
            Publicar documento
          </button>
        </form>
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Documentos registrados</h2>
        {loading ? (
          <p className="text-sm text-subtle">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-subtle">Aún no hay documentos.</p>
        ) : (
          <ul className="space-y-4">
            {items.map((doc) => (
              <li key={doc.id} className="rounded-xl border border-border p-4">
                {editingId === doc.id ? (
                  <div className="grid gap-3">
                    <input className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                    <textarea className="input min-h-[3rem]" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={editParent} onChange={(e) => setEditParent(e.target.checked)} />
                      Papás
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={editTherapist} onChange={(e) => setEditTherapist(e.target.checked)} />
                      Terapeutas
                    </label>
                    <input
                      type="number"
                      className="input max-w-[8rem]"
                      min={0}
                      value={editSortOrder}
                      onChange={(e) => setEditSortOrder(Number(e.target.value) || 0)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn rounded-lg px-3 py-1 text-sm" disabled={busy} onClick={() => void saveEdit()}>
                        Guardar
                      </button>
                      <button type="button" className="rounded-lg border border-border px-3 py-1 text-sm" onClick={() => setEditingId(null)}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">
                          {doc.title}
                          {!doc.isActive ? (
                            <span className="ml-2 rounded-full bg-subtle/20 px-2 py-0.5 text-xs font-normal text-subtle">Inactivo</span>
                          ) : null}
                        </h3>
                        {doc.description ? <p className="mt-1 text-sm text-subtle">{doc.description}</p> : null}
                        <p className="mt-2 text-xs text-subtle">
                          Dirigido a: {audienceLabel(doc.audience)} · Archivo: {doc.fileName}
                        </p>
                        <p className="text-xs text-subtle">Actualizado: {new Date(doc.updatedAt).toLocaleString("es-MX")}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="btn rounded-lg px-2 py-1 text-xs" onClick={() => startEdit(doc)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn rounded-lg px-2 py-1 text-xs"
                          disabled={busy}
                          onClick={() => {
                            replaceInputRef.current?.setAttribute("data-doc-id", doc.id);
                            replaceInputRef.current?.click();
                          }}
                        >
                          Reemplazar archivo
                        </button>
                        <button type="button" className="rounded-lg border border-border px-2 py-1 text-xs" disabled={busy} onClick={() => void toggleActive(doc)}>
                          {doc.isActive ? "Desactivar" : "Activar"}
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-danger/40 px-2 py-1 text-xs text-danger"
                          disabled={busy}
                          onClick={() => void onDelete(doc)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        <input
          ref={replaceInputRef}
          type="file"
          className="sr-only"
          accept="image/jpeg,image/png,image/webp,image/*,.pdf,application/pdf"
          disabled={busy}
          onChange={(e) => {
            const docId = replaceInputRef.current?.getAttribute("data-doc-id");
            const file = e.target.files?.[0] ?? null;
            e.target.value = "";
            if (docId) void onReplaceFile(docId, file);
          }}
        />
      </section>
    </main>
  );
}
