"use client";

import type { FollowUpReport } from "@/lib/followup-report.types";
import { FollowUpReportBody } from "@/components/followups/FollowUpReportBody";
import { GiDiLogo } from "@/components/branding/GiDiLogo";
import { GiDiPrintPageLogo } from "@/components/branding/GiDiPrintPageLogo";

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
    <div id="follow-up-report-print" className="gidi-report-root gidi-report-compact" aria-hidden="true">
      <GiDiPrintPageLogo />
      <header className="gidi-report-header gidi-report-avoid-break">
        <div className="gidi-report-brand">
          <GiDiLogo variant="print" />
          <div>
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

      <FollowUpReportBody report={report} showLegalFooter compact />
    </div>
  );
}
