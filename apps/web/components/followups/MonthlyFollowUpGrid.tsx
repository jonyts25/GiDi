"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type Mark = { objectiveId: string; code?: string | null; progressScale?: number | null };
type Session = {
  id: string;
  sessionDate: string;
  therapist?: { id: string; fullName: string };
  marks: Mark[];
};
type Objective = { id: string; idx: number; text: string; monthlyNotes?: string | null };

const LETTERS = ["V", "E", "F", "R", "X"] as const;
const ARCHIVED_OBJECTIVE_IDX = 1000;

function cellKey(sessionId: string, objectiveId: string) {
  return `${sessionId}:${objectiveId}`;
}

import { formatCalendarDate } from "@/lib/date-utils";

function formatSessionHeader(iso: string) {
  return formatCalendarDate(iso, { day: "2-digit", month: "short" });
}

function markPayload(mark: Mark | null | undefined): { code?: string; progressScale?: number } | null {
  if (!mark) return null;
  if (mark.progressScale != null && mark.progressScale !== undefined) {
    return { progressScale: mark.progressScale };
  }
  if (mark.code) return { code: mark.code };
  return null;
}

function marksEqual(a: Mark | null | undefined, b: Mark | null | undefined): boolean {
  const pa = markPayload(a);
  const pb = markPayload(b);
  if (pa === null && pb === null) return true;
  if (!pa || !pb) return false;
  if (pa.progressScale !== undefined) return pa.progressScale === pb.progressScale;
  return pa.code === pb.code;
}

function cellLabel(mark?: Mark | null): string {
  if (!mark) return "";
  if (mark.progressScale != null && mark.progressScale !== undefined) return String(mark.progressScale);
  if (mark.code) return mark.code;
  return "";
}

function buildInitialMarks(sessions: Session[]): Record<string, Mark> {
  const map: Record<string, Mark> = {};
  for (const session of sessions) {
    for (const mark of session.marks ?? []) {
      map[cellKey(session.id, mark.objectiveId)] = { ...mark };
    }
  }
  return map;
}

export function MonthlyFollowUpGrid(props: {
  followUpId: string;
  objectives: Objective[];
  sessions: Session[];
  onSaved: () => Promise<void> | void;
  readOnly?: boolean;
}) {
  const { followUpId, objectives, sessions, onSaved, readOnly = false } = props;

  const [picker, setPicker] = useState<{ sessionId: string; objectiveId: string } | null>(null);
  const [draftMarks, setDraftMarks] = useState<Record<string, Mark>>({});
  const [savedMarks, setSavedMarks] = useState<Record<string, Mark>>({});
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [savedNotes, setSavedNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const initialMarks = buildInitialMarks(sessions);
    setDraftMarks(initialMarks);
    setSavedMarks(initialMarks);

    const initialNotes: Record<string, string> = {};
    for (const o of objectives) {
      initialNotes[o.id] = o.monthlyNotes ?? "";
    }
    setNotesDraft(initialNotes);
    setSavedNotes(initialNotes);
  }, [followUpId, objectives, sessions]);

  const sortedObjectives = useMemo(
    () => [...objectives].sort((a, b) => a.idx - b.idx),
    [objectives],
  );

  const activeObjectives = useMemo(
    () => sortedObjectives.filter((o) => o.idx < ARCHIVED_OBJECTIVE_IDX),
    [sortedObjectives],
  );

  const archivedObjectives = useMemo(
    () => sortedObjectives.filter((o) => o.idx >= ARCHIVED_OBJECTIVE_IDX),
    [sortedObjectives],
  );

  const notesByObjective = useMemo(() => {
    const map: Record<string, string> = {};
    for (const o of objectives) {
      map[o.id] = notesDraft[o.id] ?? o.monthlyNotes ?? "";
    }
    return map;
  }, [objectives, notesDraft]);

  const getDraftMark = useCallback(
    (sessionId: string, objectiveId: string) => {
      return draftMarks[cellKey(sessionId, objectiveId)] ?? null;
    },
    [draftMarks],
  );

  const hasUnsavedChanges = useMemo(() => {
    for (const key of new Set([...Object.keys(draftMarks), ...Object.keys(savedMarks)])) {
      if (!marksEqual(draftMarks[key], savedMarks[key])) return true;
    }
    for (const o of objectives) {
      if ((notesDraft[o.id] ?? "") !== (savedNotes[o.id] ?? "")) return true;
    }
    return false;
  }, [draftMarks, savedMarks, notesDraft, savedNotes, objectives]);

  function setDraftCell(sessionId: string, objectiveId: string, payload: { code?: string; progressScale?: number } | null) {
    const key = cellKey(sessionId, objectiveId);
    setDraftMarks((prev) => {
      const next = { ...prev };
      if (payload === null) {
        delete next[key];
      } else {
        next[key] = { objectiveId, ...payload };
      }
      return next;
    });
    setPicker(null);
  }

  async function saveGrid() {
    setBusy(true);
    setErr("");
    try {
      const markJobs: Promise<unknown>[] = [];
      const keys = new Set([...Object.keys(draftMarks), ...Object.keys(savedMarks)]);

      for (const key of keys) {
        const draft = draftMarks[key];
        const saved = savedMarks[key];
        if (marksEqual(draft, saved)) continue;

        const colon = key.indexOf(":");
        const sessionId = key.slice(0, colon);
        const objectiveId = key.slice(colon + 1);
        const payload = markPayload(draft);
        markJobs.push(
          apiFetch(`/followups/${followUpId}/sessions/${sessionId}/marks`, {
            method: "POST",
            body: JSON.stringify(
              payload === null
                ? { objectiveId }
                : payload.progressScale !== undefined
                  ? { objectiveId, progressScale: payload.progressScale }
                  : { objectiveId, code: payload.code },
            ),
          }),
        );
      }

      const noteChanges = objectives
        .filter((o) => (notesDraft[o.id] ?? "") !== (savedNotes[o.id] ?? ""))
        .map((o) => ({ objectiveId: o.id, monthlyNotes: notesDraft[o.id] ?? "" }));

      if (noteChanges.length) {
        markJobs.push(
          apiFetch(`/followups/${followUpId}/objective-notes`, {
            method: "PATCH",
            body: JSON.stringify({ notes: noteChanges }),
          }),
        );
      }

      await Promise.all(markJobs);
      await onSaved();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  function renderObjectiveRow(obj: Objective, archived = false) {
    return (
      <tr key={obj.id} className="border-b border-border last:border-b-0">
        <td className="sticky left-0 z-10 max-w-[260px] border-r border-border bg-card px-3 py-2 align-top text-xs leading-snug">
          {archived ? (
            <span className="mr-1 rounded bg-warning/20 px-1 text-[10px] font-semibold text-warning">Archivado</span>
          ) : null}
          <span className="font-medium text-primary">{obj.idx}.</span> {obj.text}
        </td>
        {sessions.map((s) => {
          const mark = getDraftMark(s.id, obj.id);
          const active = picker?.sessionId === s.id && picker?.objectiveId === obj.id;
          return (
            <td key={s.id} className="border-r border-border p-0 text-center last:border-r-0">
              <button
                type="button"
                disabled={busy || readOnly}
                className={
                  active
                    ? "h-10 w-full bg-primary/20 font-bold text-primary ring-2 ring-inset ring-primary"
                    : "h-10 w-full bg-transparent font-semibold text-ink hover:bg-primary/10"
                }
                onClick={() => !readOnly && setPicker({ sessionId: s.id, objectiveId: obj.id })}
              >
                {cellLabel(mark) || "·"}
              </button>
            </td>
          );
        })}
        <td className="px-2 py-1 align-top">
          <textarea
            className="textarea min-h-[64px] text-xs"
            disabled={busy || readOnly}
            onChange={(e) => setNotesDraft((prev) => ({ ...prev, [obj.id]: e.target.value }))}
            placeholder="Notas del mes para este objetivo…"
          />
        </td>
      </tr>
    );
  }

  if (!sessions.length) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-surface-elevated/50 px-4 py-8 text-center text-sm text-subtle">
        Registre la primera sesión del mes para generar las columnas de la cuadrícula.
      </p>
    );
  }

  return (
    <div className="relative space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-subtle">
          {hasUnsavedChanges ? "Hay cambios sin guardar en la cuadrícula." : "Cuadrícula sincronizada."}
        </p>
        {!readOnly ? (
          <button
            type="button"
            className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
            disabled={busy || !hasUnsavedChanges}
            onClick={() => void saveGrid()}
          >
            {busy ? "Guardando…" : "Guardar cuadrícula"}
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card/60">
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
                  {s.therapist ? (
                    <span className="mt-0.5 block truncate text-[10px] font-normal opacity-70">
                      {s.therapist.fullName.split(" ")[0]}
                    </span>
                  ) : null}
                </th>
              ))}
              <th className="min-w-[180px] px-3 py-2.5 text-left font-semibold text-subtle">Observaciones del objetivo</th>
            </tr>
          </thead>
          <tbody>
            {activeObjectives.map((obj) => renderObjectiveRow(obj))}
            {archivedObjectives.map((obj) => renderObjectiveRow(obj, true))}
          </tbody>
        </table>
      </div>

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
                  onClick={() => setDraftCell(picker.sessionId, picker.objectiveId, { progressScale: n })}
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
                  onClick={() => setDraftCell(picker.sessionId, picker.objectiveId, { code: L })}
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
                onClick={() => setDraftCell(picker.sessionId, picker.objectiveId, null)}
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
