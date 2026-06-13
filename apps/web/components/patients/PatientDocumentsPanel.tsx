"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

import { prepareFileForUpload } from "@/lib/compress-upload";

import { openDataUrlInNewTab } from "@/lib/open-data-url";

const CATEGORY_LABELS: Record<string, string> = {
  EVALUACION: "Evaluación",
  REVALUACION: "Revaloración",
  SEGUIMIENTO_PADRES: "Seguimiento con papás",
};

const UPLOAD_HINT =
  "Formatos permitidos: JPG, PNG, WEBP o PDF · Máximo 20 MB · Las fotos se comprimen automáticamente al subir.";

type DocRow = {
  id: string;
  category: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
  uploadedBy: { fullName: string };
};

export function PatientDocumentsPanel({ patientId, canUpload = true }: { patientId: string; canUpload?: boolean }) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [category, setCategory] = useState("EVALUACION");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    const data = (await apiFetch(`/patients/${patientId}/documents`)) as DocRow[];
    setDocs(data);
  }, [patientId]);

  useEffect(() => {
    void reload().catch((e: unknown) => setMsg(e instanceof Error ? e.message : "Error"));
  }, [reload]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setBusy(true);
    setMsg("");
    try {
      setMsg("Comprimiendo y subiendo…");
      const prepared = await prepareFileForUpload(file);
      await apiFetch(`/patients/${patientId}/documents`, {
        method: "POST",
        body: JSON.stringify({
          category,
          fileName: prepared.fileName,
          mimeType: prepared.mimeType,
          dataUrl: prepared.dataUrl,
        }),
      });
      setMsg(`✅ «${prepared.fileName}» subido correctamente`);
      setSelectedFileName(null);
      await reload();
    } catch (ex: unknown) {
      setMsg(ex instanceof Error ? ex.message : "Error al subir");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function openDoc(docId: string) {
    const data = (await apiFetch(`/patients/${patientId}/documents/${docId}/file`)) as {
      dataUrl: string;
      fileName: string;
      mimeType: string;
    };
    try {
      openDataUrlInNewTab(data.dataUrl, data.mimeType, data.fileName);
    } catch (ex: unknown) {
      setMsg(ex instanceof Error ? ex.message : "No se pudo abrir el archivo");
    }
  }

  const grouped = ["EVALUACION", "REVALUACION", "SEGUIMIENTO_PADRES"].map((cat) => ({
    cat,
    items: docs.filter((d) => d.category === cat),
  }));

  return (
    <section className="card space-y-4 border-l-4 border-l-info">
      <h2 className="text-lg font-semibold">Documentos y fotos</h2>

      {canUpload ? (
        <div className="space-y-2 rounded-xl border border-border bg-surface/50 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-subtle">Apartado</span>
              <select className="select w-auto min-w-[12rem]" value={category} onChange={(e) => setCategory(e.target.value)}>
                {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn shrink-0 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              >
                Seleccionar archivo
              </button>
              <span
                className="min-w-0 max-w-full truncate text-sm text-subtle sm:max-w-xs"
                title={selectedFileName ?? undefined}
              >
                {busy && selectedFileName ? selectedFileName : selectedFileName ?? "Ningún archivo seleccionado"}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*,.pdf,application/pdf"
                disabled={busy}
                className="sr-only"
                onChange={(e) => void onUpload(e)}
              />
            </div>
          </div>
          <p className="text-xs leading-relaxed text-subtle">{UPLOAD_HINT}</p>
        </div>
      ) : null}

      {msg ? (
        <p className={`text-sm ${msg.includes("✅") ? "text-success" : "text-subtle"}`}>{msg}</p>
      ) : null}

      {grouped.map(({ cat, items }) => (
        <div key={cat}>
          <h3 className="mb-2 text-sm font-bold text-ink">{CATEGORY_LABELS[cat]}</h3>
          {items.length === 0 ? (
            <p className="text-sm text-subtle">Sin archivos en este apartado.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {items.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                  <span>{d.fileName}</span>
                  <span className="text-xs text-subtle">
                    {new Date(d.createdAt).toLocaleString("es-MX")} · {d.uploadedBy.fullName}
                  </span>
                  <button type="button" className="btn rounded-lg px-2 py-1 text-xs" onClick={() => void openDoc(d.id)}>
                    Ver
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </section>
  );
}
