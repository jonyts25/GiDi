"use client";

import { FollowUpReportBody } from "@/components/followups/FollowUpReportBody";
import { GiDiLogo } from "@/components/branding/GiDiLogo";
import type { FollowUpReport } from "@/lib/followup-report.types";

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

export type ParentPortalDossier = {
  generatedAt: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    birthDate: string | null;
    notes: string | null;
  };
  documents: { id: string; category: string; fileName: string; createdAt: string }[];
  months: {
    periodYear: number;
    periodMonth: number;
    followUpReports: FollowUpReport[];
  }[];
  totalFollowUps: number;
  totalMonths: number;
};

export function ParentPatientDossierPrint({ dossier }: { dossier: ParentPortalDossier }) {
  const patientName = `${dossier.patient.firstName} ${dossier.patient.lastName}`;

  return (
    <div id="patient-dossier-print" className="gidi-report-root" aria-hidden="true">
      <header className="gidi-report-header gidi-report-avoid-break">
        <div className="gidi-report-brand">
          <GiDiLogo variant="print" />
          <div>
            <p className="gidi-report-brand-tag">Centro de desarrollo integral</p>
          </div>
        </div>
        <div className="gidi-report-meta">
          <h1 className="gidi-report-title">Expediente integral</h1>
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
              <dt>Periodos registrados</dt>
              <dd>
                {dossier.totalMonths} mes(es) · {dossier.totalFollowUps} seguimiento(s)
              </dd>
            </div>
          </dl>
          <p className="gidi-report-generated">
            Generado: {new Date(dossier.generatedAt).toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" })}
          </p>
        </div>
      </header>

      {dossier.documents.length ? (
        <section className="gidi-report-section gidi-report-avoid-break">
          <h2 className="gidi-report-section-title">Documentos clínicos</h2>
          <ul className="gidi-report-marks-list">
            {dossier.documents.map((doc) => (
              <li key={doc.id}>
                <strong>{DOC_LABELS[doc.category] ?? doc.category}</strong> · {doc.fileName} ·{" "}
                {formatDate(doc.createdAt)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {dossier.months.length === 0 ? (
        <p className="gidi-report-empty-block">No hay seguimientos publicados para este paciente.</p>
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
              <article key={report.followUp.id} className="gidi-dossier-area-block gidi-report-avoid-break">
                <header className="gidi-dossier-area-header">
                  <h3>{report.followUp.area.name}</h3>
                  <p>Terapeuta: {report.followUp.therapist.fullName}</p>
                </header>
                <FollowUpReportBody report={report} showSignature />
              </article>
            ))}
          </section>
        ))
      )}

      <footer className="gidi-report-signature gidi-report-avoid-break">
        <p className="gidi-report-signature-legal">
          Expediente generado por GiDi. Contiene seguimientos visibles para familias y documentos del paciente.
        </p>
      </footer>
    </div>
  );
}
