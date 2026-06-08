"use client";

import type { FollowUpReport } from "@/lib/followup-report.types";
import { FollowUpReportBody } from "@/components/followups/FollowUpReportBody";

function formatPeriod(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

function formatGeneratedAt(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export function FollowUpReportPrint({ report }: { report: FollowUpReport }) {
  const { followUp } = report;
  const patientName = `${followUp.patient.firstName} ${followUp.patient.lastName}`;
  const periodLabel = formatPeriod(followUp.periodYear, followUp.periodMonth);

  return (
    <div id="follow-up-report-print" className="gidi-report-root" aria-hidden="true">
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
          <h1 className="gidi-report-title">Expediente clínico mensual</h1>
          <dl className="gidi-report-meta-grid">
            <div>
              <dt>Paciente</dt>
              <dd>{patientName}</dd>
            </div>
            <div>
              <dt>Terapeuta titular</dt>
              <dd>{followUp.therapist.fullName}</dd>
            </div>
            <div>
              <dt>Área</dt>
              <dd>{followUp.area.name}</dd>
            </div>
            <div>
              <dt>Periodo</dt>
              <dd>{periodLabel}</dd>
            </div>
          </dl>
          <p className="gidi-report-generated">Generado: {formatGeneratedAt(report.generatedAt)}</p>
        </div>
      </header>

      <FollowUpReportBody report={report} showLegalFooter />
    </div>
  );
}
