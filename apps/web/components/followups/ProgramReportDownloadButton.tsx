"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "@/lib/api";
import { BulkFollowUpReportPrint } from "@/components/followups/BulkFollowUpReportPrint";
import type { FollowUpReport } from "@/lib/followup-report.types";
import { useToast } from "@/components/ui/Toast";
import { waitForPrintReady } from "@/lib/print-utils";

export function ProgramReportDownloadButton(props: {
  followUpIds: string[];
  patientName?: string;
  programHeader?: {
    periodYear: number;
    periodMonth: number;
    therapistName: string;
  };
  disabled?: boolean;
  className?: string;
  label?: string;
}) {
  const {
    followUpIds,
    patientName,
    programHeader,
    disabled = false,
    className = "btn rounded-xl px-4 py-2 text-sm font-semibold",
    label = "Descargar PDF",
  } = props;

  const { showToast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [printData, setPrintData] = useState<{ reports: FollowUpReport[]; generatedAt: string } | null>(null);
  const pendingPrintRef = useRef(false);

  useEffect(() => {
    const onAfterPrint = () => {
      setPrintData(null);
      pendingPrintRef.current = false;
    };
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, []);

  useEffect(() => {
    if (!printData || !pendingPrintRef.current) return;

    let cancelled = false;
    void (async () => {
      await waitForPrintReady("#follow-up-bulk-report-print");
      if (!cancelled && pendingPrintRef.current) {
        window.print();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [printData]);

  async function downloadPdf() {
    if (!followUpIds.length) {
      showToast("No hay seguimientos para exportar", "error");
      return;
    }
    setExporting(true);
    try {
      const data = (await apiFetch("/followups/bulk-report", {
        method: "POST",
        body: JSON.stringify({ ids: followUpIds }),
      })) as { reports: FollowUpReport[]; generatedAt: string };

      if (!data.reports?.length) {
        showToast("No se pudieron cargar los seguimientos", "error");
        return;
      }

      pendingPrintRef.current = true;
      setPrintData(data);
      showToast("✅ PDF listo para imprimir o guardar");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error al exportar", "error");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      {printData && typeof document !== "undefined"
        ? createPortal(
            <BulkFollowUpReportPrint
              reports={printData.reports}
              generatedAt={printData.generatedAt}
              patientName={patientName}
              programHeader={programHeader}
            />,
            document.body,
          )
        : null}

      <button
        type="button"
        className={className}
        disabled={disabled || exporting || followUpIds.length === 0}
        onClick={() => void downloadPdf()}
      >
        {exporting ? "Preparando PDF…" : label}
      </button>
    </>
  );
}
