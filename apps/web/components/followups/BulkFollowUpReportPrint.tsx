"use client";

import type { FollowUpReport } from "@/lib/followup-report.types";
import { FollowUpReportBody } from "@/components/followups/FollowUpReportBody";
import { GiDiLogo } from "@/components/branding/GiDiLogo";

function formatPeriod(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

function formatGeneratedAt(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export function BulkFollowUpReportPrint(props: {
  reports: FollowUpReport[];
  patientName?: string;
  generatedAt: string;
}) {
  const { reports, patientName, generatedAt } = props;
  const name =
    patientName ??
    (reports[0]
      ? `${reports[0].followUp.patient.firstName} ${reports[0].followUp.patient.lastName}`
      : "Paciente");

  return (
    <div id="follow-up-bulk-report-print" className="gidi-report-root">
      <header className="gidi-report-header gidi-report-avoid-break">
        <div className="gidi-report-brand">
          <GiDiLogo variant="print" />
          <div>
            <p className="gidi-report-brand-tag">Centro de desarrollo integral</p>
          </div>
        </div>
        <div className="gidi-report-meta">
          <h1 className="gidi-report-title">Expediente de seguimientos</h1>
          <dl className="gidi-report-meta-grid">
            <div>
              <dt>Paciente</dt>
              <dd>{name}</dd>
            </div>
            <div>
              <dt>Seguimientos incluidos</dt>
              <dd>{reports.length}</dd>
            </div>
          </dl>
          <p className="gidi-report-generated">Generado: {formatGeneratedAt(generatedAt)}</p>
        </div>
      </header>

      {reports.map((report, idx) => (
        <article
          key={report.followUp.id}
          className={`gidi-dossier-area-block gidi-report-avoid-break${idx > 0 ? " gidi-dossier-month-break" : ""}`}
        >
          <header className="gidi-dossier-area-header">
            <h3>
              {report.followUp.area.name} · {formatPeriod(report.followUp.periodYear, report.followUp.periodMonth)}
            </h3>
            <p>
              Terapeuta: {report.followUp.therapist.fullName} · Estado:{" "}
              {report.followUp.status === "CLOSED" ? "Enviado" : "Borrador"}
            </p>
          </header>
          <FollowUpReportBody report={report} showSignature />
        </article>
      ))}

      <footer className="gidi-report-signature gidi-report-avoid-break">
        <p className="gidi-report-signature-legal">
          Documento generado por GiDi. Contiene los seguimientos seleccionados del paciente.
        </p>
      </footer>
    </div>
  );
}
