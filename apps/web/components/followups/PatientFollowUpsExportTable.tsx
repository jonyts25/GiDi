"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { BulkFollowUpReportPrint } from "@/components/followups/BulkFollowUpReportPrint";
import type { FollowUpReport } from "@/lib/followup-report.types";
import { useToast } from "@/components/ui/Toast";
import { waitForPrintReady } from "@/lib/print-utils";
import {
  DELETE_PROGRAM_CONFIRM,
  formatProgramListLabel,
  groupFollowUpListRows,
  type FollowUpDisplayRow,
  type FollowUpProgramListRow,
} from "@/lib/followup-list-display";

export type FollowUpListRow = {
  id: string;
  periodYear: number;
  periodMonth: number;
  status: string;
  area: { id: string; name: string; key?: string };
  therapist?: { fullName: string };
  programId?: string | null;
  program?: { id: string; therapist?: { fullName: string } };
  createdAt?: string;
};

export function PatientFollowUpsExportTable(props: {
  rows: FollowUpListRow[];
  allMonths: boolean;
  openHref: (id: string) => string;
  openProgramHref?: (programId: string) => string;
  areas?: { id: string; name: string }[];
  areaFilter?: string;
  onAreaFilterChange?: (areaId: string) => void;
  exportable?: (row: FollowUpListRow) => boolean;
  isOfficeStaff?: boolean;
  onRowsChanged?: () => void;
}) {
  const {
    rows,
    allMonths,
    openHref,
    openProgramHref,
    areaFilter = "",
    onAreaFilterChange,
    areas = [],
    exportable = () => true,
    isOfficeStaff = false,
    onRowsChanged,
  } = props;

  const { showToast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [deletingProgramId, setDeletingProgramId] = useState<string | null>(null);
  const [printData, setPrintData] = useState<{
    reports: FollowUpReport[];
    generatedAt: string;
    programHeader?: { periodYear: number; periodMonth: number; therapistName: string };
  } | null>(null);
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

  const filtered = useMemo(() => {
    if (!areaFilter) return rows;
    return rows.filter((r) => r.area.id === areaFilter);
  }, [rows, areaFilter]);

  const displayRows = useMemo(() => groupFollowUpListRows(filtered), [filtered]);

  const exportableFollowUpIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of displayRows) {
      if (item.kind === "program") {
        for (const id of item.followUpIds) {
          const row = rows.find((r) => r.id === id);
          if (row && exportable(row)) ids.add(id);
        }
      } else if (exportable(item.row)) {
        ids.add(item.row.id);
      }
    }
    return ids;
  }, [displayRows, rows, exportable]);

  const selectedFollowUpCount = useMemo(() => {
    let count = 0;
    for (const item of displayRows) {
      if (item.kind === "program") {
        if (selected.has(item.programId)) {
          count += item.followUpIds.filter((id) => exportableFollowUpIds.has(id)).length;
        }
      } else if (selected.has(item.row.id)) {
        count += 1;
      }
    }
    return count;
  }, [displayRows, selected, exportableFollowUpIds]);

  const allSelected =
    displayRows.length > 0 &&
    displayRows.every((item) => {
      if (item.kind === "program") {
        return !item.followUpIds.some((id) => exportableFollowUpIds.has(id)) || selected.has(item.programId);
      }
      return !exportable(item.row) || selected.has(item.row.id);
    });

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    const next = new Set<string>();
    for (const item of displayRows) {
      if (item.kind === "program") {
        if (item.followUpIds.some((id) => exportableFollowUpIds.has(id))) {
          next.add(item.programId);
        }
      } else if (exportable(item.row)) {
        next.add(item.row.id);
      }
    }
    setSelected(next);
  }

  function toggleDisplayRow(item: FollowUpDisplayRow) {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = item.kind === "program" ? item.programId : item.row.id;
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function isRowSelected(item: FollowUpDisplayRow): boolean {
    return selected.has(item.kind === "program" ? item.programId : item.row.id);
  }

  function canSelectRow(item: FollowUpDisplayRow): boolean {
    if (item.kind === "program") {
      return item.followUpIds.some((id) => exportableFollowUpIds.has(id));
    }
    return exportable(item.row);
  }

  function resolveSelectedFollowUpIds(): string[] {
    const ids: string[] = [];
    for (const item of displayRows) {
      if (item.kind === "program") {
        if (!selected.has(item.programId)) continue;
        for (const id of item.followUpIds) {
          if (exportableFollowUpIds.has(id)) ids.push(id);
        }
      } else if (selected.has(item.row.id) && exportable(item.row)) {
        ids.push(item.row.id);
      }
    }
    return ids;
  }

  function resolveProgramHeader(ids: string[]) {
    const selectedRows = rows.filter((r) => ids.includes(r.id));
    const programIds = new Set(selectedRows.map((r) => r.programId).filter(Boolean) as string[]);
    if (programIds.size !== 1) return undefined;
    const programId = [...programIds][0];
    const programRows = selectedRows.filter((r) => r.programId === programId);
    if (programRows.length !== ids.length) return undefined;
    const first = programRows[0];
    return {
      periodYear: first.periodYear,
      periodMonth: first.periodMonth,
      therapistName: first.therapist?.fullName ?? first.program?.therapist?.fullName ?? "—",
    };
  }

  async function exportSelected() {
    const ids = resolveSelectedFollowUpIds();
    if (!ids.length) {
      showToast("Seleccione al menos un seguimiento", "error");
      return;
    }
    setExporting(true);
    try {
      const data = (await apiFetch("/followups/bulk-report", {
        method: "POST",
        body: JSON.stringify({ ids }),
      })) as { reports: FollowUpReport[]; generatedAt: string };

      if (!data.reports?.length) {
        showToast("No se pudieron cargar los seguimientos seleccionados", "error");
        return;
      }

      pendingPrintRef.current = true;
      setPrintData({
        ...data,
        programHeader: resolveProgramHeader(ids),
      });
      showToast(`✅ ${ids.length} seguimiento(s) exportado(s)`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error al exportar", "error");
    } finally {
      setExporting(false);
    }
  }

  function canDeleteProgramRow(item: FollowUpProgramListRow): boolean {
    return item.status !== "CLOSED" || isOfficeStaff;
  }

  async function deleteProgramRow(programId: string) {
    if (!confirm(DELETE_PROGRAM_CONFIRM)) return;
    setDeletingProgramId(programId);
    try {
      await apiFetch(`/programs/${programId}`, { method: "DELETE" });
      showToast("✅ Programación eliminada");
      onRowsChanged?.();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error al borrar", "error");
    } finally {
      setDeletingProgramId(null);
    }
  }

  function renderRowActions(item: FollowUpDisplayRow) {
    const openLink =
      item.kind === "program" && openProgramHref ? (
        <Link className="btn rounded-lg px-3 py-1 text-xs" href={openProgramHref(item.programId)}>
          Abrir
        </Link>
      ) : (
        <Link
          className="btn rounded-lg px-3 py-1 text-xs"
          href={openHref(item.kind === "program" ? item.followUpIds[0] : item.row.id)}
        >
          Abrir
        </Link>
      );

    if (item.kind !== "program" || !canDeleteProgramRow(item)) {
      return openLink;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {openLink}
        <button
          type="button"
          className="rounded-lg border border-danger/40 px-3 py-1 text-xs text-danger hover:bg-danger/10 disabled:opacity-50"
          disabled={deletingProgramId === item.programId}
          onClick={() => void deleteProgramRow(item.programId)}
        >
          {deletingProgramId === item.programId ? "Borrando…" : "Borrar"}
        </button>
      </div>
    );
  }

  return (
    <>
      {printData && typeof document !== "undefined"
        ? createPortal(
            <BulkFollowUpReportPrint
              reports={printData.reports}
              generatedAt={printData.generatedAt}
              programHeader={printData.programHeader}
            />,
            document.body,
          )
        : null}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {areas.length && onAreaFilterChange ? (
            <select
              className="select w-44 text-sm"
              value={areaFilter}
              onChange={(e) => onAreaFilterChange(e.target.value)}
            >
              <option value="">Todas las áreas</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          ) : null}
          <span className="text-xs text-subtle">{displayRows.length} seguimiento(s)</span>
        </div>
        <button
          type="button"
          className="btn rounded-xl px-3 py-1.5 text-xs font-semibold"
          disabled={exporting || selectedFollowUpCount === 0}
          onClick={() => void exportSelected()}
        >
          {exporting ? "Preparando PDF…" : `Exportar seleccionados (${selectedFollowUpCount})`}
        </button>
      </div>

      {displayRows.length === 0 ? (
        <p className="text-sm text-subtle">No hay seguimientos para mostrar.</p>
      ) : (
        <table className="table w-full text-sm">
          <thead>
            <tr className="text-left text-subtle">
              <th className="w-10 py-2">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Seleccionar todos" />
              </th>
              <th className="py-2">Seguimiento</th>
              {allMonths ? <th className="py-2">Mes</th> : null}
              <th className="py-2">Terapeuta</th>
              <th className="py-2">Estado</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {displayRows.map((item) => {
              const canSelect = canSelectRow(item);
              const key = item.kind === "program" ? item.programId : item.row.id;
              const label =
                item.kind === "program"
                  ? formatProgramListLabel(
                      item.periodYear,
                      item.periodMonth,
                      item.therapist?.fullName,
                      item.areas.map((a) => a.name),
                    )
                  : item.row.area.name;
              const status = item.kind === "program" ? item.status : item.row.status;
              const therapist =
                item.kind === "program" ? (item.therapist?.fullName ?? "—") : (item.row.therapist?.fullName ?? "—");
              const periodYear = item.kind === "program" ? item.periodYear : item.row.periodYear;
              const periodMonth = item.kind === "program" ? item.periodMonth : item.row.periodMonth;

              return (
                <tr key={key} className="border-t border-border">
                  <td className="py-2">
                    <input
                      type="checkbox"
                      checked={isRowSelected(item)}
                      disabled={!canSelect}
                      onChange={() => toggleDisplayRow(item)}
                      aria-label={`Seleccionar ${label}`}
                    />
                  </td>
                  <td className="py-2 font-medium">{label}</td>
                  {allMonths ? (
                    <td className="py-2 capitalize">
                      {new Date(periodYear, periodMonth - 1, 1).toLocaleDateString("es-MX", {
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  ) : null}
                  <td className="py-2">{therapist}</td>
                  <td className="py-2">
                    <span className="badge">{status === "CLOSED" ? "Enviado" : "Borrador"}</span>
                  </td>
                  <td className="py-2">{renderRowActions(item)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
