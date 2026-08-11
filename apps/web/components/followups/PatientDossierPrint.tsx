"use client";

import type { PatientDossierReport } from "@/lib/followup-report.types";
import { FollowUpReportBody } from "@/components/followups/FollowUpReportBody";
import { GiDiLogo } from "@/components/branding/GiDiLogo";
import { GiDiPrintPageLogo } from "@/components/branding/GiDiPrintPageLogo";

const DOC_LABELS: Record<string, string> = {
  EVALUACION: "Evaluación",
  REVALUACION: "Revaloración",
  SEGUIMIENTO_PADRES: "Seguimiento padres",
};

function formatPeriod(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", { dateStyle: "long" });
}

function formatGeneratedAt(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export function PatientDossierPrint({
  dossier,
  documentIds,
}: {
  dossier: PatientDossierReport;
  documentIds?: string[];
}) {
  const patientName = `${dossier.patient.firstName} ${dossier.patient.lastName}`;
  const docs = (dossier.documents ?? []).filter((d) => !documentIds || documentIds.includes(d.id));

  return (
    <div id="patient-dossier-print" className="gidi-report-root gidi-report-compact">
      <GiDiPrintPageLogo />
      <header className="gidi-report-header gidi-report-avoid-break">
        <div className="gidi-report-brand">
          <GiDiLogo variant="print" />
          <div>
            <p className="gidi-report-brand-tag">Centro de desarrollo integral</p>
          </div>
        </div>
        <div className="gidi-report-meta">
          <h1 className="gidi-report-title">Expediente clínico integral</h1>
          <dl className="gidi-report-meta-grid">
            <div>
              <dt>Paciente</dt>
              <dd>{patientName}</dd>
            </div>
            <div>
              <dt>Fecha de nacimiento</dt>
              <dd>{formatDate(dossier.patient.birthDate)}</dd>
            </div>
            <div>
              <dt>Terapeuta(s)</dt>
              <dd>
                {dossier.therapists.length
                  ? dossier.therapists.map((t) => t.fullName).join(", ")
                  : "Sin asignar"}
              </dd>
            </div>
            <div>
              <dt>Periodos registrados</dt>
              <dd>
                {dossier.totalMonths} mes(es) · {dossier.totalFollowUps} seguimiento(s)
              </dd>
            </div>
          </dl>
          <p className="gidi-report-generated">Generado: {formatGeneratedAt(dossier.generatedAt)}</p>
        </div>
      </header>

      {dossier.guardians.length ? (
        <section className="gidi-report-section gidi-report-avoid-break">
          <h2 className="gidi-report-section-title">Tutores / contacto</h2>
          <ul className="gidi-report-marks-list">
            {dossier.guardians.map((g) => (
              <li key={g.parentId}>
                <strong>{g.fullName}</strong>
                {g.isPrimary ? " (principal)" : ""} · {g.email}
                {g.relationship ? ` · ${g.relationship}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {dossier.school ? (
        <section className="gidi-report-section gidi-report-avoid-break">
          <h2 className="gidi-report-section-title">Escuela</h2>
          <p>{dossier.school.fullName}</p>
        </section>
      ) : null}

      {docs.length ? (
        <section className="gidi-report-section">
          <h2 className="gidi-report-section-title gidi-report-avoid-break">Documentos clínicos</h2>
          {docs.map((doc) => (
            <article key={doc.id} className="gidi-report-avoid-break" style={{ marginBottom: 16 }}>
              <p className="gidi-report-section-title" style={{ fontSize: "0.95rem", marginBottom: 6 }}>
                {DOC_LABELS[doc.category] ?? doc.category}: {doc.fileName}
              </p>
              <p className="text-subtle" style={{ fontSize: "0.8rem", marginBottom: 8 }}>
                {formatDate(doc.createdAt)}
              </p>
              {doc.dataUrl && doc.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={doc.dataUrl}
                  alt={doc.fileName}
                  style={{ maxWidth: "100%", maxHeight: "480px", objectFit: "contain" }}
                />
              ) : doc.dataUrl && doc.mimeType === "application/pdf" ? (
                <p style={{ fontSize: "0.85rem" }}>Documento PDF adjunto: {doc.fileName}</p>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      {dossier.months.length === 0 ? (
        <p className="gidi-report-empty-block">No hay seguimientos registrados para este paciente.</p>
      ) : (
        dossier.months.map((month, monthIdx) => (
          <section
            key={`${month.periodYear}-${month.periodMonth}`}
            className={`gidi-dossier-month${monthIdx > 0 ? " gidi-dossier-month-break" : ""}`}
          >
            <h2 className="gidi-dossier-month-title gidi-report-avoid-break">
              {formatPeriod(month.periodYear, month.periodMonth)}
            </h2>

            {month.followUpReports.map((report) => (
              <article key={report.followUp.id} className="gidi-dossier-area-block">
                <header className="gidi-dossier-area-header gidi-report-avoid-break">
                  <h3>{report.followUp.area.name}</h3>
                  <p>
                    Terapeuta: {report.followUp.therapist.fullName} · Estado: {report.followUp.status}
                  </p>
                </header>
                <FollowUpReportBody report={report} showSignature compact />
              </article>
            ))}
          </section>
        ))
      )}

      <footer className="gidi-report-legal-footer gidi-report-avoid-break">
        <p className="gidi-report-signature-legal">
          Expediente consolidado generado por GiDi. Contiene el historial de seguimientos mensuales del paciente.
          Documento confidencial conforme a la normativa aplicable en protección de datos de salud.
        </p>
      </footer>
    </div>
  );
}
