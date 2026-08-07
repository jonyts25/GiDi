"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { PatientDossierPrint } from "@/components/followups/PatientDossierPrint";
import type { PatientDossierReport } from "@/lib/followup-report.types";
import { hasOfficeStaffRole } from "@/lib/role-permissions";

const DOC_LABELS: Record<string, string> = {
  EVALUACION: "Evaluación",
  REVALUACION: "Revaloración",
  SEGUIMIENTO_PADRES: "Seguimiento padres",
};

export default function AdminPatientDossierPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const patientId = params.id;

  const [dossier, setDossier] = useState<PatientDossierReport | null>(null);
  const [printDossier, setPrintDossier] = useState<PatientDossierReport | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const onAfterPrint = () => setPrintDossier(null);
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!hasOfficeStaffRole(roles)) return router.replace("/dashboard");

    (async () => {
      try {
        const data = (await apiFetch(`/admin/patients/${patientId}/dossier`)) as PatientDossierReport;
        setDossier(data);
        setSelectedDocIds(new Set((data.documents ?? []).map((d) => d.id)));
      } catch (e: unknown) {
        setMsg(e instanceof Error ? e.message : "Error al cargar expediente");
      }
    })();
  }, [patientId, router]);

  const allDocsSelected = useMemo(() => {
    const docs = dossier?.documents ?? [];
    return docs.length > 0 && docs.every((d) => selectedDocIds.has(d.id));
  }, [dossier, selectedDocIds]);

  function toggleDoc(id: string) {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllDocs() {
    const docs = dossier?.documents ?? [];
    if (allDocsSelected) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(docs.map((d) => d.id)));
    }
  }

  async function exportDossier() {
    if (!dossier) return;
    setMsg("");
    setExporting(true);
    try {
      const ids = [...selectedDocIds];
      const docsWithFiles = await Promise.all(
        (dossier.documents ?? [])
          .filter((d) => ids.includes(d.id))
          .map(async (doc) => {
            try {
              const file = (await apiFetch(`/patients/${patientId}/documents/${doc.id}/file`)) as {
                dataUrl: string;
                fileName: string;
                mimeType: string;
              };
              return { ...doc, dataUrl: file.dataUrl, mimeType: file.mimeType };
            } catch {
              return doc;
            }
          }),
      );

      const enriched: PatientDossierReport = {
        ...dossier,
        documents: [
          ...(dossier.documents ?? []).filter((d) => !ids.includes(d.id)),
          ...docsWithFiles,
        ],
      };

      setPrintDossier(enriched);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setTimeout(resolve, 350));
        });
      });
      window.print();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error al generar expediente");
      setPrintDossier(null);
    } finally {
      setExporting(false);
    }
  }

  if (!dossier) {
    return (
      <main className="container py-10 text-subtle">
        <p>{msg || "Cargando expediente…"}</p>
      </main>
    );
  }

  const patientName = `${dossier.patient.firstName} ${dossier.patient.lastName}`;
  const docs = dossier.documents ?? [];

  return (
    <>
      {printDossier ? (
        <PatientDossierPrint dossier={printDossier} documentIds={[...selectedDocIds]} />
      ) : null}

      <main className="gidi-screen-only container max-w-[980px] space-y-6 py-8 text-ink">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Expediente integral</h1>
            <p className="mt-1 text-sm text-subtle">{patientName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
              disabled={exporting}
              onClick={() => void exportDossier()}
            >
              {exporting ? "Preparando expediente…" : "Exportar expediente completo"}
            </button>
            <Link className="btn rounded-xl px-3 py-2 text-sm" href={`/admin/patients/${patientId}`}>
              ← Volver al paciente
            </Link>
          </div>
        </div>

        {msg ? <p className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-subtle">{msg}</p> : null}

        <section className="card space-y-3 border-l-4 border-l-primary">
          <h2 className="text-lg font-semibold">Resumen</h2>
          <p className="text-sm text-subtle">
            {dossier.totalMonths} mes(es) con actividad · {dossier.totalFollowUps} seguimiento(s) · {docs.length}{" "}
            documento(s)
          </p>
          {dossier.totalFollowUps === 0 ? (
            <p className="text-sm text-subtle">Este paciente aún no tiene seguimientos registrados.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {dossier.months.map((m) => (
                <li key={`${m.periodYear}-${m.periodMonth}`} className="rounded-lg border border-border px-3 py-2">
                  <strong>
                    {new Date(m.periodYear, m.periodMonth - 1, 1).toLocaleDateString("es-MX", {
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>
                  <span className="text-subtle">
                    {" "}
                    — {m.followUpReports.length} área(s):{" "}
                    {m.followUpReports.map((r) => r.followUp.area.name).join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {docs.length ? (
          <section className="card space-y-3 border-l-4 border-l-info">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Documentos a incluir</h2>
              <button type="button" className="btn rounded-lg px-3 py-1 text-xs" onClick={toggleAllDocs}>
                {allDocsSelected ? "Quitar todos" : "Seleccionar todos"}
              </button>
            </div>
            <ul className="space-y-2 text-sm">
              {docs.map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedDocIds.has(doc.id)}
                    onChange={() => toggleDoc(doc.id)}
                    aria-label={`Incluir ${doc.fileName}`}
                  />
                  <span>
                    <strong>{DOC_LABELS[doc.category] ?? doc.category}</strong>: {doc.fileName}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="text-xs text-subtle">
          Seleccione los documentos y use «Exportar» para imprimir o guardar como PDF. Las imágenes se incluyen en el
          expediente cuando es posible.
        </p>
      </main>
    </>
  );
}
