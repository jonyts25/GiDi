"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { calendarDateToUtcIso, localDateInputValue } from "@/lib/date-utils";

type TherapistOption = { id: string; fullName: string };

export function NewFollowUpSessionForm(props: {
  followUpId: string;
  defaultTherapistId: string;
  therapists?: TherapistOption[];
  disabled?: boolean;
  onCreated: () => Promise<void> | void;
}) {
  const { followUpId, defaultTherapistId, therapists = [], disabled = false, onCreated } = props;
  const options =
    therapists.length > 0
      ? therapists
      : defaultTherapistId
        ? [{ id: defaultTherapistId, fullName: "Terapeuta asignado" }]
        : [];

  const [singleDate, setSingleDate] = useState(localDateInputValue());
  const [multiDates, setMultiDates] = useState("");
  const [mode, setMode] = useState<"single" | "multi">("single");
  const [therapistId, setTherapistId] = useState(defaultTherapistId);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  function parseMultiDates(raw: string): string[] {
    return [...new Set(raw.split(/[\n,;\s]+/).map((s) => s.trim()).filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s)))];
  }

  async function createSessions(dates: string[]) {
    for (const d of dates) {
      await apiFetch(`/followups/${followUpId}/sessions`, {
        method: "POST",
        body: JSON.stringify({ sessionDate: calendarDateToUtcIso(d), therapistId }),
      });
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setOk("");
    try {
      const dates = mode === "single" ? [singleDate] : parseMultiDates(multiDates);
      if (!dates.length) {
        setErr("Indique al menos una fecha válida (AAAA-MM-DD)");
        return;
      }
      await createSessions(dates);
      setSingleDate(localDateInputValue());
      setMultiDates("");
      setOk(`✅ ${dates.length} sesión(es) agregada(s)`);
      await onCreated();
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Error al crear sesión");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface-elevated/40 p-4"
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-lg px-3 py-1 text-xs font-semibold ${mode === "single" ? "bg-primary text-white" : "border border-border"}`}
          onClick={() => setMode("single")}
          disabled={disabled}
        >
          Una fecha
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1 text-xs font-semibold ${mode === "multi" ? "bg-primary text-white" : "border border-border"}`}
          onClick={() => setMode("multi")}
          disabled={disabled}
        >
          Varias fechas
        </button>
      </div>

      {mode === "single" ? (
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-subtle">Fecha de la sesión</span>
          <input
            type="date"
            className="input w-auto"
            value={singleDate}
            onChange={(e) => setSingleDate(e.target.value)}
            required
            disabled={disabled}
          />
        </label>
      ) : (
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-subtle">Fechas (una por línea o separadas por coma)</span>
          <textarea
            className="textarea min-h-[88px] font-mono text-sm"
            placeholder={"2026-06-03\n2026-06-10\n2026-06-17"}
            value={multiDates}
            onChange={(e) => setMultiDates(e.target.value)}
            disabled={disabled}
          />
        </label>
      )}

      <label className="grid min-w-[200px] flex-1 gap-1 text-sm">
        <span className="font-medium text-subtle">Terapeuta</span>
        <select
          className="select"
          value={therapistId}
          onChange={(e) => setTherapistId(e.target.value)}
          required
          disabled={disabled}
        >
          {options.map((t) => (
            <option key={t.id} value={t.id}>
              {t.fullName}
              {t.id === defaultTherapistId ? " (asignado)" : ""}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className="btn-primary w-fit rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
        disabled={busy || disabled}
      >
        {busy ? "Guardando…" : mode === "multi" ? "+ Agregar sesiones" : "+ Nueva sesión"}
      </button>
      {ok ? <p className="text-sm text-success">{ok}</p> : null}
      {err ? <p className="text-sm text-danger">{err}</p> : null}
    </form>
  );
}
