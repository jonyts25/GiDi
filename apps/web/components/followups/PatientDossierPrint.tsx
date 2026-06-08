"use client";

import type { PatientDossierReport } from "@/lib/followup-report.types";
import { FollowUpReportBody } from "@/components/followups/FollowUpReportBody";

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

export function PatientDossierPrint({ dossier }: { dossier: PatientDossierReport }) {
  const patientName = `${dossier.patient.firstName} ${dossier.patient.lastName}`;

  return (
    <div id="patient-dossier-print" className="gidi-report-root" aria-hidden="true">
      <header className="gidi-report-header gidi-report-avoid-break">
        <div className="gidi-report-brand">
          <div className="gidi-report-logo" aria-hidden>
            <span className="gidi-report-logo-g">G</span>
            <span className="gidi-report-logo-i">i</span>
            <span className="gidi-report-logo-d">D</span>
            <span className="gidi-report-logo-i2">i</span>
          </div>
          <div>
            <p className="gidi-report-brand-name">GiDi</p>
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
              <article key={report.followUp.id} className="gidi-dossier-area-block gidi-report-avoid-break">
                <header className="gidi-dossier-area-header">
                  <h3>{report.followUp.area.name}</h3>
                  <p>
                    Terapeuta: {report.followUp.therapist.fullName} · Estado: {report.followUp.status}
                  </p>
                </header>
                <FollowUpReportBody report={report} showSignature />
              </article>
            ))}
          </section>
        ))
      )}

      <footer className="gidi-report-signature gidi-report-avoid-break">
        <p className="gidi-report-signature-legal">
          Expediente consolidado generado por GiDi. Contiene el historial de seguimientos mensuales del paciente.
          Documento confidencial conforme a la normativa aplicable en protección de datos de salud.
        </p>
      </footer>
    </div>
  );
}
