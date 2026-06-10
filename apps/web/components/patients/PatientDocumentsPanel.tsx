"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

const CATEGORY_LABELS: Record<string, string> = {
  EVALUACION: "Evaluación",
  REVALORACION: "Revaloración",
  SEGUIMIENTO_PADRES: "Seguimiento con papás",
};

type DocRow = {
  id: string;
  category: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
  uploadedBy: { fullName: string };
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function PatientDocumentsPanel({ patientId, canUpload = true }: { patientId: string; canUpload?: boolean }) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [category, setCategory] = useState("EVALUACION");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

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
    setBusy(true);
    setMsg("");
    try {
      const dataUrl = await readFileAsDataUrl(file);
      await apiFetch(`/patients/${patientId}/documents`, {
        method: "POST",
        body: JSON.stringify({
          category,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          dataUrl,
        }),
      });
      setMsg(`✅ «${file.name}» subido correctamente`);
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
    };
    const w = window.open();
    if (w) {
      w.document.write(`<title>${data.fileName}</title><img src="${data.dataUrl}" style="max-width:100%" />`);
    }
  }

  const grouped = ["EVALUACION", "REVALORACION", "SEGUIMIENTO_PADRES"].map((cat) => ({
    cat,
    items: docs.filter((d) => d.category === cat),
  }));

  return (
    <section className="card space-y-4 border-l-4 border-l-info">
      <h2 className="text-lg font-semibold">Documentos y fotos</h2>

      {canUpload ? (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface/50 p-4">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-subtle">Apartado</span>
            <select className="select w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
              {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-subtle">Archivo</span>
            <input type="file" accept="image/*,.pdf" disabled={busy} onChange={(e) => void onUpload(e)} />
          </label>
        </div>
      ) : null}

      {msg ? <p className="text-sm text-subtle">{msg}</p> : null}

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
