"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { filterByQuery } from "@/components/ui/SearchInput";

const DAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

type PatientOption = {
  id: string;
  firstName: string;
  lastName: string;
};

type Cell = {
  label: string;
  patientId: string | null;
  patientName: string | null;
};

type Slot = {
  dayOfWeek: number;
  startTime: string;
  endTime?: string | null;
  label: string;
  patientId?: string | null;
  patient?: { firstName: string; lastName: string } | null;
};

type ScheduleData = {
  therapist: { id: string; fullName: string };
  location: string | null;
  notes: string | null;
  slots: Slot[];
};

/** Fila del editor: una franja horaria con una celda por día. */
type Row = {
  startTime: string;
  endTime: string;
  cells: Cell[];
};

function emptyCell(): Cell {
  return { label: "", patientId: null, patientName: null };
}

function emptyRow(): Row {
  return { startTime: "", endTime: "", cells: Array.from({ length: 6 }, emptyCell) };
}

function cellFromSlot(slot: Slot): Cell {
  if (slot.patientId && slot.patient) {
    return {
      label: slot.label,
      patientId: slot.patientId,
      patientName: `${slot.patient.firstName} ${slot.patient.lastName}`,
    };
  }
  return { label: slot.label, patientId: slot.patientId ?? null, patientName: null };
}

function buildRows(slots: Slot[]): Row[] {
  const byBand = new Map<string, Row>();
  for (const s of slots) {
    const key = `${s.startTime}|${s.endTime ?? ""}`;
    let row = byBand.get(key);
    if (!row) {
      row = emptyRow();
      row.startTime = s.startTime;
      row.endTime = s.endTime ?? "";
      byBand.set(key, row);
    }
    if (s.dayOfWeek >= 0 && s.dayOfWeek <= 5) row.cells[s.dayOfWeek] = cellFromSlot(s);
  }
  return Array.from(byBand.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function rowsToSlots(rows: Row[]): Slot[] {
  const slots: Slot[] = [];
  rows.forEach((row) => {
    if (!row.startTime.trim()) return;
    row.cells.forEach((cell, day) => {
      if (cell.patientId) {
        slots.push({
          dayOfWeek: day,
          startTime: row.startTime.trim(),
          endTime: row.endTime.trim() || null,
          patientId: cell.patientId,
          label: cell.patientName?.trim() || cell.label.trim() || "Paciente",
        });
      } else if (cell.label.trim()) {
        slots.push({
          dayOfWeek: day,
          startTime: row.startTime.trim(),
          endTime: row.endTime.trim() || null,
          label: cell.label.trim(),
          patientId: null,
        });
      }
    });
  });
  return slots;
}

function cellHasContent(cell: Cell): boolean {
  return Boolean(cell.patientId || cell.label.trim());
}

function ScheduleCell(props: {
  cell: Cell;
  patients: PatientOption[];
  canEdit: boolean;
  showPatientLinks: boolean;
  onChange: (cell: Cell) => void;
}) {
  const { cell, patients, canEdit, showPatientLinks, onChange } = props;
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => filterByQuery(patients, query, (p) => `${p.firstName} ${p.lastName}`),
    [patients, query],
  );

  if (!canEdit) {
    if (cell.patientId && cell.patientName) {
      if (showPatientLinks) {
        return (
          <Link href={`/admin/patients/${cell.patientId}`} className="font-medium text-primary hover:underline">
            {cell.patientName}
          </Link>
        );
      }
      return <span className="font-medium">{cell.patientName}</span>;
    }
    return <span className={cell.label ? "" : "text-subtle"}>{cell.label || "—"}</span>;
  }

  if (cell.patientId && cell.patientName) {
    return (
      <div className="grid gap-1">
        {showPatientLinks ? (
          <Link href={`/admin/patients/${cell.patientId}`} className="text-xs font-medium text-primary hover:underline">
            {cell.patientName}
          </Link>
        ) : (
          <span className="text-xs font-medium">{cell.patientName}</span>
        )}
        <button
          type="button"
          className="text-left text-xs text-subtle underline"
          onClick={() => onChange(emptyCell())}
        >
          Quitar paciente
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-1">
      <input
        className="input text-xs"
        style={{ minWidth: 90 }}
        value={cell.label}
        onChange={(e) => onChange({ ...cell, label: e.target.value })}
        placeholder="Texto libre"
      />
      {patients.length > 0 ? (
        <>
          <input
            type="search"
            className="input text-xs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar paciente…"
          />
          {query.trim() ? (
            <ul className="max-h-24 overflow-y-auto rounded border border-border bg-surface text-xs">
              {filtered.length === 0 ? (
                <li className="px-2 py-1 text-subtle">Sin coincidencias</li>
              ) : (
                filtered.slice(0, 8).map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="w-full px-2 py-1 text-left hover:bg-surface-elevated"
                      onClick={() => {
                        onChange({
                          label: `${p.firstName} ${p.lastName}`,
                          patientId: p.id,
                          patientName: `${p.firstName} ${p.lastName}`,
                        });
                        setQuery("");
                      }}
                    >
                      {p.firstName} {p.lastName}
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function TherapistScheduleEditor(props: {
  /** GET endpoint. Admin: /admin/therapists/:id/schedule · Terapeuta: /therapist/schedule */
  loadEndpoint: string;
  /** PUT endpoint (solo si canEdit). */
  saveEndpoint?: string;
  /** GET endpoint for patient picker (admin). */
  patientsEndpoint?: string;
  canEdit: boolean;
}) {
  const { loadEndpoint, saveEndpoint, patientsEndpoint, canEdit } = props;
  const [rows, setRows] = useState<Row[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [msgOk, setMsgOk] = useState(true);

  const showPatientLinks = loadEndpoint.includes("/admin/therapists/");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await apiFetch(loadEndpoint)) as ScheduleData;
      setLocation(data.location ?? "");
      setNotes(data.notes ?? "");
      setRows(buildRows(data.slots));
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error");
      setMsgOk(false);
    } finally {
      setLoading(false);
    }
  }, [loadEndpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!canEdit || !patientsEndpoint) {
      setPatients([]);
      return;
    }
    void (async () => {
      try {
        const data = (await apiFetch(patientsEndpoint)) as PatientOption[];
        setPatients(Array.isArray(data) ? data : []);
      } catch {
        setPatients([]);
      }
    })();
  }, [canEdit, patientsEndpoint]);

  const hasContent = useMemo(() => rows.some((r) => r.cells.some(cellHasContent)), [rows]);

  function updateCell(rowIdx: number, day: number, cell: Cell) {
    setRows((prev) =>
      prev.map((r, i) => (i === rowIdx ? { ...r, cells: r.cells.map((c, d) => (d === day ? cell : c)) } : r)),
    );
  }

  function updateBand(rowIdx: number, field: "startTime" | "endTime", value: string) {
    setRows((prev) => prev.map((r, i) => (i === rowIdx ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(rowIdx: number) {
    setRows((prev) => prev.filter((_, i) => i !== rowIdx));
  }

  async function save() {
    if (!saveEndpoint) return;
    setMsg("");
    try {
      await apiFetch(saveEndpoint, {
        method: "PUT",
        body: JSON.stringify({
          location: location.trim() || null,
          notes: notes.trim() || null,
          slots: rowsToSlots(rows),
        }),
      });
      setMsgOk(true);
      setMsg("✅ Horario guardado");
      await load();
    } catch (e: unknown) {
      setMsgOk(false);
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  if (loading) return <p className="sub">Cargando horario…</p>;

  return (
    <section className="card" style={{ marginTop: 14 }}>
      <div className="row" style={{ alignItems: "baseline", justifyContent: "space-between" }}>
        <h2 className="h2" style={{ margin: 0 }}>Horario semanal</h2>
        {!canEdit ? <span className="sub">Solo lectura</span> : null}
      </div>

      {canEdit ? (
        <div className="grid gap-3" style={{ marginTop: 10, maxWidth: 520 }}>
          <label className="grid gap-1 text-sm">
            <span className="sub">Sede / ubicación</span>
            <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ej. San Agustín" />
          </label>
        </div>
      ) : location ? (
        <p className="sub" style={{ marginTop: 8 }}>Sede: {location}</p>
      ) : null}

      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table className="w-full border-collapse text-sm" style={{ minWidth: 720 }}>
          <thead>
            <tr className="border-b border-border text-left text-subtle">
              <th className="py-2 pr-2" style={{ minWidth: 130 }}>Horario</th>
              {DAY_LABELS.map((d) => (
                <th key={d} className="py-2 pr-2">{d}</th>
              ))}
              {canEdit ? <th className="py-2" /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 8 : 7} className="py-3 text-subtle">
                  {canEdit ? "Sin franjas. Agregue una para empezar." : "Sin horario registrado."}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b border-border/60 align-top">
                  <td className="py-2 pr-2">
                    {canEdit ? (
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <input
                          className="input"
                          style={{ width: 70 }}
                          value={row.startTime}
                          onChange={(e) => updateBand(rowIdx, "startTime", e.target.value)}
                          placeholder="15:30"
                        />
                        <span>-</span>
                        <input
                          className="input"
                          style={{ width: 70 }}
                          value={row.endTime}
                          onChange={(e) => updateBand(rowIdx, "endTime", e.target.value)}
                          placeholder="16:20"
                        />
                      </div>
                    ) : (
                      <span className="font-medium">
                        {row.startTime}
                        {row.endTime ? ` - ${row.endTime}` : ""}
                      </span>
                    )}
                  </td>
                  {row.cells.map((cell, day) => (
                    <td key={day} className="py-2 pr-2">
                      <ScheduleCell
                        cell={cell}
                        patients={patients}
                        canEdit={canEdit}
                        showPatientLinks={showPatientLinks}
                        onChange={(next) => updateCell(rowIdx, day, next)}
                      />
                    </td>
                  ))}
                  {canEdit ? (
                    <td className="py-2">
                      <button type="button" className="btn rounded-lg px-2 py-1 text-xs text-danger" onClick={() => removeRow(rowIdx)}>
                        Quitar
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {canEdit ? (
        <>
          <div className="flex flex-wrap gap-2" style={{ marginTop: 12 }}>
            <button type="button" className="btn" onClick={addRow}>+ Agregar franja</button>
            <button type="button" className="btn-primary" onClick={() => void save()}>Guardar horario</button>
          </div>
          <label className="grid gap-1 text-sm" style={{ marginTop: 12 }}>
            <span className="sub">Notas</span>
            <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </label>
        </>
      ) : notes ? (
        <p className="sub" style={{ marginTop: 12 }}>Notas: {notes}</p>
      ) : null}

      {msg ? <p className={`text-sm ${msgOk ? "text-success" : "text-danger"}`} style={{ marginTop: 10 }}>{msg}</p> : null}
      {!canEdit && !hasContent ? null : null}
    </section>
  );
}
