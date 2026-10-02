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

type Slot = {
  dayOfWeek: number;
  startTime: string;
  endTime?: string | null;
  label: string;
  patientId?: string | null;
  patient?: { firstName: string; lastName: string } | null;
  isFree?: boolean;
};

type DaySlot = {
  startTime: string;
  endTime: string;
  label: string;
  patientId: string | null;
  patientName: string | null;
  isFree: boolean;
};

type DaySchedule = {
  dayOfWeek: number;
  slots: DaySlot[];
};

type ScheduleData = {
  therapist: { id: string; fullName: string };
  location: string | null;
  notes: string | null;
  slots: Slot[];
};

function emptyDaySlot(): DaySlot {
  return { startTime: "", endTime: "", label: "", patientId: null, patientName: null, isFree: false };
}

function slotFromApi(s: Slot): DaySlot {
  if (s.isFree) {
    return {
      startTime: s.startTime,
      endTime: s.endTime ?? "",
      label: "",
      patientId: null,
      patientName: null,
      isFree: true,
    };
  }
  if (s.patientId && s.patient) {
    return {
      startTime: s.startTime,
      endTime: s.endTime ?? "",
      label: s.label,
      patientId: s.patientId,
      patientName: `${s.patient.firstName} ${s.patient.lastName}`,
      isFree: false,
    };
  }
  return {
    startTime: s.startTime,
    endTime: s.endTime ?? "",
    label: s.label,
    patientId: s.patientId ?? null,
    patientName: null,
    isFree: false,
  };
}

function buildDays(slots: Slot[]): DaySchedule[] {
  const days: DaySchedule[] = Array.from({ length: 6 }, (_, dayOfWeek) => ({
    dayOfWeek,
    slots: [],
  }));
  for (const s of slots) {
    if (s.dayOfWeek >= 0 && s.dayOfWeek <= 5) {
      days[s.dayOfWeek].slots.push(slotFromApi(s));
    }
  }
  for (const day of days) {
    day.slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
  return days;
}

function daysToSlots(days: DaySchedule[]): Slot[] {
  const slots: Slot[] = [];
  for (const day of days) {
    for (const slot of day.slots) {
      if (!slot.startTime.trim()) continue;
      if (slot.isFree) {
        slots.push({
          dayOfWeek: day.dayOfWeek,
          startTime: slot.startTime.trim(),
          endTime: slot.endTime.trim() || null,
          label: "",
          patientId: null,
          isFree: true,
        });
      } else if (slot.patientId) {
        slots.push({
          dayOfWeek: day.dayOfWeek,
          startTime: slot.startTime.trim(),
          endTime: slot.endTime.trim() || null,
          patientId: slot.patientId,
          label: slot.patientName?.trim() || slot.label.trim() || "Paciente",
          isFree: false,
        });
      } else if (slot.label.trim()) {
        slots.push({
          dayOfWeek: day.dayOfWeek,
          startTime: slot.startTime.trim(),
          endTime: slot.endTime.trim() || null,
          label: slot.label.trim(),
          patientId: null,
          isFree: false,
        });
      }
    }
  }
  return slots;
}

function formatTimeRange(startTime: string, endTime: string): string {
  if (!startTime) return "—";
  return endTime ? `${startTime} – ${endTime}` : startTime;
}

function SlotContentEditor(props: {
  slot: DaySlot;
  patients: PatientOption[];
  showPatientLinks: boolean;
  onChange: (slot: DaySlot) => void;
}) {
  const { slot, patients, showPatientLinks, onChange } = props;
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => filterByQuery(patients, query, (p) => `${p.firstName} ${p.lastName}`),
    [patients, query],
  );

  const mode: "patient" | "text" | "free" = slot.isFree ? "free" : slot.patientId ? "patient" : "text";

  function setMode(next: "patient" | "text" | "free") {
    if (next === "free") {
      onChange({ ...slot, isFree: true, patientId: null, patientName: null, label: "" });
      setQuery("");
      return;
    }
    if (next === "text") {
      onChange({ ...slot, isFree: false, patientId: null, patientName: null });
      setQuery("");
      return;
    }
    onChange({ ...slot, isFree: false, label: "" });
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-1">
        {(["patient", "text", "free"] as const).map((key) => (
          <button
            key={key}
            type="button"
            className={`rounded-md border px-2 py-0.5 text-xs ${
              mode === key ? "border-primary bg-primary/10 font-semibold text-primary" : "border-border text-subtle"
            }`}
            onClick={() => setMode(key)}
          >
            {key === "patient" ? "Paciente" : key === "text" ? "Texto libre" : "Libre"}
          </button>
        ))}
      </div>

      {mode === "free" ? (
        <p className="rounded-md bg-surface-elevated px-2 py-1.5 text-xs text-subtle">Espacio libre</p>
      ) : null}

      {mode === "text" ? (
        <input
          className="input text-xs"
          value={slot.label}
          onChange={(e) => onChange({ ...slot, label: e.target.value, isFree: false })}
          placeholder="Texto libre"
        />
      ) : null}

      {mode === "patient" ? (
        <div className="grid gap-1">
          {slot.patientId && slot.patientName ? (
            <div className="grid gap-1">
              {showPatientLinks ? (
                <Link href={`/admin/patients/${slot.patientId}`} className="text-xs font-medium text-primary hover:underline">
                  {slot.patientName}
                </Link>
              ) : (
                <span className="text-xs font-medium">{slot.patientName}</span>
              )}
              <button
                type="button"
                className="text-left text-xs text-subtle underline"
                onClick={() => onChange({ ...slot, patientId: null, patientName: null, label: "" })}
              >
                Quitar paciente
              </button>
            </div>
          ) : (
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
                              ...slot,
                              isFree: false,
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
          )}
        </div>
      ) : null}
    </div>
  );
}

function SlotReadOnly(props: { slot: DaySlot; showPatientLinks: boolean }) {
  const { slot, showPatientLinks } = props;
  if (slot.isFree) {
    return <span className="text-sm text-subtle">Libre</span>;
  }
  if (slot.patientId && slot.patientName) {
    if (showPatientLinks) {
      return (
        <Link href={`/admin/patients/${slot.patientId}`} className="text-sm font-medium text-primary hover:underline">
          {slot.patientName}
        </Link>
      );
    }
    return <span className="text-sm font-medium">{slot.patientName}</span>;
  }
  return <span className="text-sm">{slot.label || "—"}</span>;
}

export function TherapistScheduleEditor(props: {
  loadEndpoint: string;
  saveEndpoint?: string;
  patientsEndpoint?: string;
  canEdit: boolean;
}) {
  const { loadEndpoint, saveEndpoint, patientsEndpoint, canEdit } = props;
  const [days, setDays] = useState<DaySchedule[]>(() => buildDays([]));
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
      setDays(buildDays(data.slots));
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

  function updateSlot(dayIdx: number, slotIdx: number, slot: DaySlot) {
    setDays((prev) =>
      prev.map((day, d) =>
        d === dayIdx
          ? {
              ...day,
              slots: day.slots.map((s, i) => (i === slotIdx ? slot : s)),
            }
          : day,
      ),
    );
  }

  function addSlot(dayIdx: number) {
    setDays((prev) =>
      prev.map((day, d) => (d === dayIdx ? { ...day, slots: [...day.slots, emptyDaySlot()] } : day)),
    );
  }

  function removeSlot(dayIdx: number, slotIdx: number) {
    setDays((prev) =>
      prev.map((day, d) =>
        d === dayIdx ? { ...day, slots: day.slots.filter((_, i) => i !== slotIdx) } : day,
      ),
    );
  }

  function copyDaySchedule(targetDayIdx: number, sourceDayIdx: number) {
    if (targetDayIdx === sourceDayIdx) return;
    const target = days[targetDayIdx];
    const source = days[sourceDayIdx];
    if (target.slots.length > 0) {
      const ok = window.confirm(
        `¿Reemplazar los horarios de ${DAY_LABELS[targetDayIdx]} con los de ${DAY_LABELS[sourceDayIdx]}?`,
      );
      if (!ok) return;
    }
    setDays((prev) =>
      prev.map((day, d) =>
        d === targetDayIdx
          ? {
              ...day,
              slots: source.slots.map((s) => ({ ...s })),
            }
          : day,
      ),
    );
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
          slots: daysToSlots(days),
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

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-6">
        {days.map((day, dayIdx) => (
          <div key={day.dayOfWeek} className="rounded-xl border border-border bg-surface/40 p-3">
            <h3 className="mb-2 text-sm font-bold">{DAY_LABELS[dayIdx]}</h3>

            {canEdit ? (
              <div className="mb-3 grid gap-1">
                <label className="text-xs text-subtle">Copiar horario de…</label>
                <div className="flex gap-1">
                  <select
                    className="select min-w-0 flex-1 text-xs"
                    defaultValue=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      copyDaySchedule(dayIdx, Number(val));
                      e.target.value = "";
                    }}
                  >
                    <option value="">Elegir día…</option>
                    {DAY_LABELS.map((label, i) =>
                      i !== dayIdx ? (
                        <option key={label} value={i}>
                          {label}
                        </option>
                      ) : null,
                    )}
                  </select>
                </div>
              </div>
            ) : null}

            {day.slots.length === 0 ? (
              <p className="py-4 text-center text-sm text-subtle">No labora</p>
            ) : (
              <ul className="space-y-2">
                {day.slots.map((slot, slotIdx) => (
                  <li
                    key={slotIdx}
                    className={`rounded-lg border px-2 py-2 ${
                      slot.isFree ? "border-border/60 bg-surface-elevated/80" : "border-border bg-surface"
                    }`}
                  >
                    {canEdit ? (
                      <div className="grid gap-2">
                        <div className="flex flex-wrap items-center gap-1">
                          <input
                            className="input w-[4.5rem] text-xs"
                            value={slot.startTime}
                            onChange={(e) => updateSlot(dayIdx, slotIdx, { ...slot, startTime: e.target.value })}
                            placeholder="15:30"
                          />
                          <span className="text-subtle">–</span>
                          <input
                            className="input w-[4.5rem] text-xs"
                            value={slot.endTime}
                            onChange={(e) => updateSlot(dayIdx, slotIdx, { ...slot, endTime: e.target.value })}
                            placeholder="16:20"
                          />
                          <button
                            type="button"
                            className="ml-auto text-xs text-danger underline"
                            onClick={() => removeSlot(dayIdx, slotIdx)}
                          >
                            Quitar
                          </button>
                        </div>
                        <SlotContentEditor
                          slot={slot}
                          patients={patients}
                          showPatientLinks={showPatientLinks}
                          onChange={(next) => updateSlot(dayIdx, slotIdx, next)}
                        />
                      </div>
                    ) : (
                      <div className="grid gap-1">
                        <span className="text-xs font-semibold text-subtle">
                          {formatTimeRange(slot.startTime, slot.endTime)}
                        </span>
                        <SlotReadOnly slot={slot} showPatientLinks={showPatientLinks} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {canEdit ? (
              <button
                type="button"
                className="btn mt-3 w-full rounded-lg px-2 py-1.5 text-xs"
                onClick={() => addSlot(dayIdx)}
              >
                + Agregar horario
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {canEdit ? (
        <>
          <div className="flex flex-wrap gap-2" style={{ marginTop: 12 }}>
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
    </section>
  );
}
