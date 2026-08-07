"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { BulkFollowUpReportPrint } from "@/components/followups/BulkFollowUpReportPrint";
import type { FollowUpReport } from "@/lib/followup-report.types";
import { useToast } from "@/components/ui/Toast";

export type FollowUpListRow = {
  id: string;
  periodYear: number;
  periodMonth: number;
  status: string;
  area: { id: string; name: string; key?: string };
  therapist?: { fullName: string };
  createdAt?: string;
};

export function PatientFollowUpsExportTable(props: {
  rows: FollowUpListRow[];
  allMonths: boolean;
  openHref: (id: string) => string;
  areaFilter?: string;
  onAreaFilterChange?: (areaId: string) => void;
  areas?: { id: string; name: string }[];
  exportable?: (row: FollowUpListRow) => boolean;
}) {
  const {
    rows,
    allMonths,
    openHref,
    areaFilter = "",
    onAreaFilterChange,
    areas = [],
    exportable = () => true,
  } = props;

  const { showToast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [printData, setPrintData] = useState<{ reports: FollowUpReport[]; generatedAt: string } | null>(null);

  useEffect(() => {
    const onAfterPrint = () => setPrintData(null);
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, []);

  const filtered = useMemo(() => {
    if (!areaFilter) return rows;
    return rows.filter((r) => r.area.id === areaFilter);
  }, [rows, areaFilter]);

  const exportableRows = useMemo(() => filtered.filter(exportable), [filtered, exportable]);

  const allSelected = exportableRows.length > 0 && exportableRows.every((r) => selected.has(r.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(exportableRows.map((r) => r.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function exportSelected() {
    const ids = [...selected].filter((id) => exportableRows.some((r) => r.id === id));
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

      setPrintData(data);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setTimeout(resolve, 350));
        });
      });
      window.print();
      showToast(`✅ ${ids.length} seguimiento(s) exportado(s)`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error al exportar", "error");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      {printData ? <BulkFollowUpReportPrint reports={printData.reports} generatedAt={printData.generatedAt} /> : null}

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
          <span className="text-xs text-subtle">{filtered.length} seguimiento(s)</span>
        </div>
        <button
          type="button"
          className="btn rounded-xl px-3 py-1.5 text-xs font-semibold"
          disabled={exporting || selected.size === 0}
          onClick={() => void exportSelected()}
        >
          {exporting ? "Preparando PDF…" : `Exportar seleccionados (${selected.size})`}
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-subtle">No hay seguimientos para mostrar.</p>
      ) : (
        <table className="table w-full text-sm">
          <thead>
            <tr className="text-left text-subtle">
              <th className="w-10 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Seleccionar todos"
                />
              </th>
              <th className="py-2">Área</th>
              {allMonths ? <th className="py-2">Mes</th> : null}
              <th className="py-2">Terapeuta</th>
              <th className="py-2">Estado</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const canExport = exportable(r);
              return (
                <tr key={r.id} className="border-t border-border">
                  <td className="py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      disabled={!canExport}
                      onChange={() => toggleOne(r.id)}
                      aria-label={`Seleccionar ${r.area.name}`}
                    />
                  </td>
                  <td className="py-2 font-medium">{r.area.name}</td>
                  {allMonths ? (
                    <td className="py-2 capitalize">
                      {new Date(r.periodYear, r.periodMonth - 1, 1).toLocaleDateString("es-MX", {
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  ) : null}
                  <td className="py-2">{r.therapist?.fullName ?? "—"}</td>
                  <td className="py-2">
                    <span className="badge">{r.status === "CLOSED" ? "Enviado" : "Borrador"}</span>
                  </td>
                  <td className="py-2">
                    <Link className="btn rounded-lg px-3 py-1 text-xs" href={openHref(r.id)}>
                      Abrir
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
