"use client";

import Link from "next/link";
import {
  ParentFollowUpSummaryCard,
  type ParentProgramSummaryData,
} from "@/components/followups/ParentFollowUpSummaryCard";
import { ProgramReportDownloadButton } from "@/components/followups/ProgramReportDownloadButton";

export function ProgramParentView(props: {
  data: ParentProgramSummaryData & { patient?: { firstName: string; lastName: string } };
  backHref: string;
  backLabel?: string;
}) {
  const { data, backHref, backLabel = "← Volver" } = props;
  const patientName = data.patient
    ? `${data.patient.firstName} ${data.patient.lastName}`
    : undefined;
  const followUpIds = data.areas.map((a) => a.followUpId);

  return (
    <main className="max-w-[820px] space-y-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Programación mensual</h1>
          {patientName ? <p className="mt-1 text-sm text-subtle">{patientName}</p> : null}
          <p className="mt-1 text-sm text-subtle">Terapeuta: {data.therapistName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ProgramReportDownloadButton
            followUpIds={followUpIds}
            patientName={patientName}
            programHeader={{
              periodYear: data.periodYear,
              periodMonth: data.periodMonth,
              therapistName: data.therapistName,
            }}
          />
          <Link className="btn rounded-xl px-3 py-2 text-sm" href={backHref}>
            {backLabel}
          </Link>
        </div>
      </div>

      <ParentFollowUpSummaryCard data={data} />
    </main>
  );
}
