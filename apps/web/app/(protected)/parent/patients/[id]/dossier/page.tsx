"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { ParentPatientDossierPrint, type ParentPortalDossier } from "@/components/followups/ParentPatientDossierPrint";
import { hasParentPortalAccess } from "@/lib/role-permissions";

export default function ParentPatientDossierPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const patientId = params.id;

  const [dossier, setDossier] = useState<ParentPortalDossier | null>(null);
  const [printDossier, setPrintDossier] = useState<ParentPortalDossier | null>(null);
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
    if (!hasParentPortalAccess(roles)) return router.replace("/dashboard");

    (async () => {
      try {
        const data = (await apiFetch(`/parent/patients/${patientId}/dossier`)) as ParentPortalDossier;
        setDossier(data);
      } catch (e: unknown) {
        setMsg(e instanceof Error ? e.message : "Error al cargar expediente");
      }
    })();
  }, [patientId, router]);

  async function exportDossier() {
    if (!dossier) return;
    setExporting(true);
    try {
      setPrintDossier(dossier);
      await new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 200)));
      window.print();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error al generar expediente");
      setPrintDossier(null);
    } finally {
      setExporting(false);
    }
  }

  const patientName = dossier ? `${dossier.patient.firstName} ${dossier.patient.lastName}` : "";

  return (
    <>
      {printDossier ? <ParentPatientDossierPrint dossier={printDossier} /> : null}

      <main className="gidi-screen-only container max-w-[820px] space-y-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Expediente integral</h1>
            <p className="mt-1 text-sm text-subtle">{patientName || "Cargando…"}</p>
          </div>
          <Link className="btn rounded-xl px-3 py-2 text-sm" href={`/parent/patients/${patientId}`}>
            ← Volver
          </Link>
        </div>

        {msg ? <p className="text-sm text-danger">{msg}</p> : null}

        {dossier ? (
          <section className="card space-y-4">
            <p className="text-sm text-subtle">
              Incluye seguimientos visibles para familias y el listado de documentos clínicos ({dossier.documents.length}{" "}
              documento(s), {dossier.totalFollowUps} seguimiento(s)).
            </p>
            <button
              type="button"
              className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              disabled={exporting}
              onClick={() => void exportDossier()}
            >
              {exporting ? "Preparando PDF…" : "Descargar expediente (PDF)"}
            </button>
          </section>
        ) : null}
      </main>
    </>
  );
}
