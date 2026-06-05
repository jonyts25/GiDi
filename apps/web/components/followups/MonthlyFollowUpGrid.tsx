"use client";

import { useCallback, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type Mark = { objectiveId: string; code?: string | null; progressScale?: number | null };
type Session = {
  id: string;
  sessionDate: string;
  therapist?: { id: string; fullName: string };
  marks: Mark[];
};
type Objective = { id: string; idx: number; text: string; monthlyNotes?: string | null };

const LETTERS = ["A", "V", "E", "F", "R", "X"] as const;

function formatSessionHeader(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

function cellLabel(mark?: Mark | null): string {
  if (!mark) return "";
  if (mark.progressScale != null && mark.progressScale !== undefined) return String(mark.progressScale);
  if (mark.code) return mark.code;
  return "";
}

export function MonthlyFollowUpGrid(props: {
  followUpId: string;
  objectives: Objective[];
  sessions: Session[];
  onSaved: () => Promise<void> | void;
}) {
  const { followUpId, objectives, sessions, onSaved } = props;

  const [picker, setPicker] = useState<{ sessionId: string; objectiveId: string } | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const notesByObjective = useMemo(() => {
    const map: Record<string, string> = {};
    for (const o of objectives) {
      map[o.id] = notesDraft[o.id] ?? o.monthlyNotes ?? "";
    }
    return map;
  }, [objectives, notesDraft]);

  const getMark = useCallback(
    (sessionId: string, objectiveId: string) => {
      const session = sessions.find((s) => s.id === sessionId);
      return session?.marks?.find((m) => m.objectiveId === objectiveId) ?? null;
    },
    [sessions],
  );

  async function applyCell(sessionId: string, objectiveId: string, payload: { code?: string; progressScale?: number } | null) {
    setBusy(true);
    setErr("");
    try {
      await apiFetch(`/followups/${followUpId}/sessions/${sessionId}/marks`, {
        method: "POST",
        body: JSON.stringify(
          payload === null
            ? { objectiveId }
            : payload.progressScale !== undefined
              ? { objectiveId, progressScale: payload.progressScale }
              : { objectiveId, code: payload.code },
        ),
      });
      setPicker(null);
      await onSaved();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function saveObjectiveNotes(objectiveId: string) {
    const monthlyNotes = notesByObjective[objectiveId] ?? "";
    setBusy(true);
    setErr("");
    try {
      await apiFetch(`/followups/${followUpId}/objective-notes`, {
        method: "PATCH",
        body: JSON.stringify({ notes: [{ objectiveId, monthlyNotes }] }),
      });
      await onSaved();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (!sessions.length) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-surface-elevated/50 px-4 py-8 text-center text-sm text-subtle">
        Registre la primera sesión del mes para generar las columnas de la cuadrícula.
      </p>
    );
  }

  return (
    <div className="relative overflow-x-auto rounded-xl border border-border bg-card/60">
      {err ? <p className="p-2 text-sm text-danger">{err}</p> : null}
      <table className="min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-elevated/80">
            <th className="sticky left-0 z-10 min-w-[200px] border-r border-border bg-card px-3 py-2.5 text-left font-semibold text-subtle">
              Objetivo
            </th>
            {sessions.map((s) => (
              <th
                key={s.id}
                className="min-w-[72px] border-r border-border px-2 py-2.5 text-center font-medium text-subtle last:border-r-0"
                title={s.therapist?.fullName}
              >
                <span className="block text-xs font-semibold text-ink">{formatSessionHeader(s.sessionDate)}</span>
                {s.therapist ? <span className="mt-0.5 block truncate text-[10px] font-normal opacity-70">{s.therapist.fullName.split(" ")[0]}</span> : null}
              </th>
            ))}
            <th className="min-w-[180px] px-3 py-2.5 text-left font-semibold text-subtle">Observaciones del objetivo</th>
          </tr>
        </thead>
        <tbody>
          {objectives.map((obj) => (
            <tr key={obj.id} className="border-b border-border last:border-b-0">
              <td className="sticky left-0 z-10 max-w-[260px] border-r border-border bg-card px-3 py-2 align-top text-xs leading-snug">
                <span className="font-medium text-primary">{obj.idx}.</span> {obj.text}
              </td>
              {sessions.map((s) => {
                const mark = getMark(s.id, obj.id);
                const active = picker?.sessionId === s.id && picker?.objectiveId === obj.id;
                return (
                  <td key={s.id} className="border-r border-border p-0 text-center last:border-r-0">
                    <button
                      type="button"
                      disabled={busy}
                      className={
                        active
                          ? "h-10 w-full bg-primary/20 font-bold text-primary ring-2 ring-inset ring-primary"
                          : "h-10 w-full bg-transparent font-semibold text-ink hover:bg-primary/10"
                      }
                      onClick={() => setPicker({ sessionId: s.id, objectiveId: obj.id })}
                    >
                      {cellLabel(mark) || "·"}
                    </button>
                  </td>
                );
              })}
              <td className="px-2 py-1 align-top">
                <textarea
                  className="textarea min-h-[64px] text-xs"
                  disabled={busy}
                  value={notesByObjective[obj.id] ?? ""}
                  onChange={(e) => setNotesDraft((prev) => ({ ...prev, [obj.id]: e.target.value }))}
                  onBlur={() => void saveObjectiveNotes(obj.id)}
                  placeholder="Notas del mes para este objetivo…"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {picker ? (
        <>
          <button type="button" className="fixed inset-0 z-40 bg-black/40" aria-label="Cerrar" onClick={() => setPicker(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[min(96vw,320px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-4 shadow-2xl">
            <p className="text-sm font-semibold text-subtle">Marque escala o código de asistencia</p>
            <div className="mt-3 grid grid-cols-5 gap-1">
              {[0, 1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="rounded-lg border border-border py-2 text-sm font-bold hover:border-primary hover:bg-primary/15"
                  disabled={busy}
                  onClick={() => void applyCell(picker.sessionId, picker.objectiveId, { progressScale: n })}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 sm:grid-cols-6">
              {LETTERS.map((L) => (
                <button
                  key={L}
                  type="button"
                  className="rounded-lg border border-border py-2 text-sm font-bold hover:border-info hover:bg-info/15"
                  disabled={busy}
                  onClick={() => void applyCell(picker.sessionId, picker.objectiveId, { code: L })}
                >
                  {L}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-danger/40 px-3 py-1.5 text-sm text-danger hover:bg-danger/10"
                disabled={busy}
                onClick={() => void applyCell(picker.sessionId, picker.objectiveId, null)}
              >
                Borrar celda
              </button>
              <button type="button" className="btn rounded-lg px-3 py-1.5 text-sm" disabled={busy} onClick={() => setPicker(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
