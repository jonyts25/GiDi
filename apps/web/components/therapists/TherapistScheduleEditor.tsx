"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

const DAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

type Slot = {
  dayOfWeek: number;
  startTime: string;
  endTime?: string | null;
  label: string;
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
  cells: string[]; // 6 columnas (Lun..Sáb)
};

function buildRows(slots: Slot[]): Row[] {
  const byBand = new Map<string, Row>();
  for (const s of slots) {
    const key = `${s.startTime}|${s.endTime ?? ""}`;
    let row = byBand.get(key);
    if (!row) {
      row = { startTime: s.startTime, endTime: s.endTime ?? "", cells: ["", "", "", "", "", ""] };
      byBand.set(key, row);
    }
    if (s.dayOfWeek >= 0 && s.dayOfWeek <= 5) row.cells[s.dayOfWeek] = s.label;
  }
  return Array.from(byBand.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function rowsToSlots(rows: Row[]): Slot[] {
  const slots: Slot[] = [];
  rows.forEach((row, rowIdx) => {
    if (!row.startTime.trim()) return;
    row.cells.forEach((label, day) => {
      if (label.trim()) {
        slots.push({
          dayOfWeek: day,
          startTime: row.startTime.trim(),
          endTime: row.endTime.trim() || null,
          label: label.trim(),
        });
      }
    });
    void rowIdx;
  });
  return slots;
}

export function TherapistScheduleEditor(props: {
  /** GET endpoint. Admin: /admin/therapists/:id/schedule · Terapeuta: /therapist/schedule */
  loadEndpoint: string;
  /** PUT endpoint (solo si canEdit). */
  saveEndpoint?: string;
  canEdit: boolean;
}) {
  const { loadEndpoint, saveEndpoint, canEdit } = props;
  const [rows, setRows] = useState<Row[]>([]);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [msgOk, setMsgOk] = useState(true);

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

  const hasContent = useMemo(() => rows.some((r) => r.cells.some((c) => c.trim())), [rows]);

  function updateCell(rowIdx: number, day: number, value: string) {
    setRows((prev) => prev.map((r, i) => (i === rowIdx ? { ...r, cells: r.cells.map((c, d) => (d === day ? value : c)) } : r)));
  }

  function updateBand(rowIdx: number, field: "startTime" | "endTime", value: string) {
    setRows((prev) => prev.map((r, i) => (i === rowIdx ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { startTime: "", endTime: "", cells: ["", "", "", "", "", ""] }]);
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
                      {canEdit ? (
                        <input
                          className="input"
                          style={{ minWidth: 90 }}
                          value={cell}
                          onChange={(e) => updateCell(rowIdx, day, e.target.value)}
                          placeholder="—"
                        />
                      ) : (
                        <span className={cell ? "" : "text-subtle"}>{cell || "—"}</span>
                      )}
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
