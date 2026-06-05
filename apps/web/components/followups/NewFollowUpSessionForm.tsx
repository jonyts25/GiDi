"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

type TherapistOption = { id: string; fullName: string };

export function NewFollowUpSessionForm(props: {
  followUpId: string;
  defaultTherapistId: string;
  therapists?: TherapistOption[];
  onCreated: () => Promise<void> | void;
}) {
  const { followUpId, defaultTherapistId, therapists = [], onCreated } = props;
  const options =
    therapists.length > 0
      ? therapists
      : defaultTherapistId
        ? [{ id: defaultTherapistId, fullName: "Terapeuta asignado" }]
        : [];
  const today = new Date().toISOString().slice(0, 10);

  const [sessionDate, setSessionDate] = useState(today);
  const [therapistId, setTherapistId] = useState(defaultTherapistId);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const [y, m, d] = sessionDate.split("-").map(Number);
      const iso = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)).toISOString();
      await apiFetch(`/followups/${followUpId}/sessions`, {
        method: "POST",
        body: JSON.stringify({ sessionDate: iso, therapistId }),
      });
      setSessionDate(today);
      await onCreated();
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Error al crear sesión");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface-elevated/40 p-4">
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-subtle">Fecha de la sesión</span>
        <input type="date" className="input w-auto" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} required />
      </label>
      <label className="grid min-w-[200px] flex-1 gap-1 text-sm">
        <span className="font-medium text-subtle">Terapeuta</span>
        <input type="hidden" name="therapistId" value={therapistId} />
        <select className="select" value={therapistId} onChange={(e) => setTherapistId(e.target.value)} required>
          {options.map((t) => (
            <option key={t.id} value={t.id}>
              {t.fullName}
              {t.id === defaultTherapistId ? " (asignado al seguimiento)" : ""}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold" disabled={busy}>
        {busy ? "Guardando…" : "+ Nueva sesión"}
      </button>
      {err ? <p className="w-full text-sm text-danger">{err}</p> : null}
    </form>
  );
}
