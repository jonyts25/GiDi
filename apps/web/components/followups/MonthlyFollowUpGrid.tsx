"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatCalendarDate } from "@/lib/date-utils";
import { areaBorderClass, areaChipClass, areaHeaderClass, areaShortLabel } from "@/lib/area-display";

type Mark = { objectiveId: string; code?: string | null; progressScale?: number | null };
type Session = {
  id: string;
  sessionDate: string;
  therapist?: { id: string; fullName: string };
  marks: Mark[];
};

export type GridObjective = {
  id: string;
  idx: number;
  text: string;
  followUpId: string;
  monthlyNotes?: string | null;
  globalNo?: number;
  areaId?: string;
  areaName?: string;
};

export type ProgramSessionColumn = {
  date: string;
  entries: { followUpId: string; sessionId: string; areaId: string }[];
  therapist?: { fullName: string };
};

export type FlatMark = {
  sessionId: string;
  objectiveId: string;
  code?: string | null;
  progressScale?: number | null;
};

const LETTERS = ["V", "E", "F", "R", "X"] as const;
const ARCHIVED_OBJECTIVE_IDX = 1000;

export const EMPTY_SESSIONS: Session[] = [];
export const EMPTY_COLUMNS: ProgramSessionColumn[] = [];
export const EMPTY_FLAT_MARKS: FlatMark[] = [];

function cellKey(sessionId: string, objectiveId: string) {
  return `${sessionId}:${objectiveId}`;
}

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

function markToApiValue(mark: Mark | null | undefined): string | number | null {
  const payload = markPayload(mark);
  if (payload === null) return null;
  if (payload.progressScale !== undefined) return payload.progressScale;
  return payload.code ?? null;
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

function buildInitialMarksFromFlat(marks: FlatMark[]): Record<string, Mark> {
  const map: Record<string, Mark> = {};
  for (const mark of marks) {
    map[cellKey(mark.sessionId, mark.objectiveId)] = {
      objectiveId: mark.objectiveId,
      code: mark.code,
      progressScale: mark.progressScale,
    };
  }
  return map;
}

function resolveSessionId(
  objective: GridObjective,
  column: ProgramSessionColumn | Session,
  programMode: boolean,
): string | undefined {
  if (!programMode) return (column as Session).id;
  const col = column as ProgramSessionColumn;
  return col.entries.find((e) => e.followUpId === objective.followUpId)?.sessionId;
}

function columnDate(column: ProgramSessionColumn | Session, programMode: boolean): string {
  if (programMode) return (column as ProgramSessionColumn).date;
  return (column as Session).sessionDate;
}

function columnTherapist(column: ProgramSessionColumn | Session, programMode: boolean): string | undefined {
  if (programMode) return (column as ProgramSessionColumn).therapist?.fullName;
  return (column as Session).therapist?.fullName;
}

export function MonthlyFollowUpGrid(props: {
  objectives: GridObjective[];
  sessions?: Session[];
  sessionColumns?: ProgramSessionColumn[];
  flatMarks?: FlatMark[];
  onSaved: () => Promise<void> | void;
  onToast?: (message: string, type?: "success" | "error") => void;
  readOnly?: boolean;
  showObjectiveNotes?: boolean;
  programMode?: boolean;
  programId?: string;
}) {
  const {
    objectives,
    sessions = EMPTY_SESSIONS,
    sessionColumns = EMPTY_COLUMNS,
    flatMarks = EMPTY_FLAT_MARKS,
    onSaved,
    onToast,
    readOnly = false,
    showObjectiveNotes = true,
    programMode = false,
    programId,
  } = props;

  const columns = programMode ? sessionColumns : sessions;
  const followUpIdsKey = useMemo(
    () => [...new Set(objectives.map((o) => o.followUpId))].sort().join(","),
    [objectives],
  );

  const [picker, setPicker] = useState<{ sessionId: string; objectiveId: string } | null>(null);
  const [draftMarks, setDraftMarks] = useState<Record<string, Mark>>({});
  const [savedMarks, setSavedMarks] = useState<Record<string, Mark>>({});
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [savedNotes, setSavedNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightPromiseRef = useRef<Promise<void> | null>(null);
  const savedMarksRef = useRef<Record<string, Mark>>({});

  useEffect(() => {
    const initialMarks = programMode
      ? buildInitialMarksFromFlat(flatMarks)
      : buildInitialMarks(sessions);
    setDraftMarks((prev) => {
      const next = { ...initialMarks };
      for (const [key, mark] of Object.entries(prev)) {
        const saved = savedMarks[key];
        if (!marksEqual(mark, saved)) {
          next[key] = mark;
        }
      }
      return next;
    });
    setSavedMarks(initialMarks);
    savedMarksRef.current = initialMarks;

    const initialNotes: Record<string, string> = {};
    for (const o of objectives) {
      initialNotes[o.id] = o.monthlyNotes ?? "";
    }
    setNotesDraft((prev) => {
      const next = { ...initialNotes };
      for (const [id, note] of Object.entries(prev)) {
        if ((savedNotes[id] ?? "") !== note) {
          next[id] = note;
        }
      }
      return next;
    });
    setSavedNotes(initialNotes);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- preserve local drafts across prop reloads
  }, [followUpIdsKey, objectives, sessions, sessionColumns, flatMarks, programMode]);

  const sortedObjectives = useMemo(
    () => [...objectives].sort((a, b) => (a.globalNo ?? a.idx) - (b.globalNo ?? b.idx)),
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

  const areaIdsInOrder = useMemo(() => {
    const ids: string[] = [];
    for (const o of activeObjectives) {
      if (o.areaId && !ids.includes(o.areaId)) ids.push(o.areaId);
    }
    return ids;
  }, [activeObjectives]);

  const objectivesByArea = useMemo(() => {
    const groups: { areaId: string | null; areaName: string | null; items: GridObjective[] }[] = [];
    let currentAreaId: string | null | undefined = undefined;

    for (const obj of activeObjectives) {
      const areaId = obj.areaId ?? null;
      if (areaId !== currentAreaId) {
        groups.push({ areaId, areaName: obj.areaName ?? null, items: [obj] });
        currentAreaId = areaId;
      } else {
        groups[groups.length - 1]?.items.push(obj);
      }
    }
    return groups;
  }, [activeObjectives]);

  const followUpByObjective = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of objectives) map.set(o.id, o.followUpId);
    return map;
  }, [objectives]);

  const getDraftMark = useCallback(
    (sessionId: string, objectiveId: string) => {
      return draftMarks[cellKey(sessionId, objectiveId)] ?? null;
    },
    [draftMarks],
  );

  const hasUnsavedMarkChanges = useMemo(() => {
    for (const key of new Set([...Object.keys(draftMarks), ...Object.keys(savedMarks)])) {
      if (!marksEqual(draftMarks[key], savedMarks[key])) return true;
    }
    return false;
  }, [draftMarks, savedMarks]);

  const hasUnsavedChanges = useMemo(() => {
    if (hasUnsavedMarkChanges) return true;
    if (showObjectiveNotes) {
      for (const o of objectives) {
        if ((notesDraft[o.id] ?? "") !== (savedNotes[o.id] ?? "")) return true;
      }
    }
    return false;
  }, [hasUnsavedMarkChanges, notesDraft, savedNotes, objectives, showObjectiveNotes]);

  const collectChangedMarks = useCallback(() => {
    const changes: {
      followUpId: string;
      sessionId: string;
      objectiveId: string;
      value: string | number | null;
    }[] = [];
    const keys = new Set([...Object.keys(draftMarks), ...Object.keys(savedMarksRef.current)]);

    for (const key of keys) {
      const draft = draftMarks[key];
      const saved = savedMarksRef.current[key];
      if (marksEqual(draft, saved)) continue;

      const colon = key.indexOf(":");
      const sessionId = key.slice(0, colon);
      const objectiveId = key.slice(colon + 1);
      const followUpId = followUpByObjective.get(objectiveId);
      if (!followUpId) continue;

      changes.push({
        followUpId,
        sessionId,
        objectiveId,
        value: markToApiValue(draft),
      });
    }
    return changes;
  }, [draftMarks, followUpByObjective]);

  const flushProgramMarks = useCallback(async () => {
    if (!programMode || !programId || readOnly) return;

    if (inFlightPromiseRef.current) {
      await inFlightPromiseRef.current;
      if (collectChangedMarks().length === 0) return;
    }

    const changes = collectChangedMarks();
    if (changes.length === 0) return;

    const flushPromise = (async () => {
      setBusy(true);
      setErr("");
      onToast?.("Guardando…");

      try {
        await apiFetch(`/programs/${programId}/marks`, {
          method: "POST",
          body: JSON.stringify({ marks: changes }),
        });

        const nextSaved = { ...savedMarksRef.current };
        for (const change of changes) {
          const key = cellKey(change.sessionId, change.objectiveId);
          if (change.value == null) {
            delete nextSaved[key];
          } else {
            nextSaved[key] =
              typeof change.value === "number"
                ? { objectiveId: change.objectiveId, progressScale: change.value }
                : { objectiveId: change.objectiveId, code: String(change.value) };
          }
        }
        savedMarksRef.current = nextSaved;
        setSavedMarks(nextSaved);
        await onSaved();
        onToast?.("✅ Guardado", "success");
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Error al guardar";
        setErr(message);
        onToast?.(message, "error");
        throw e;
      } finally {
        setBusy(false);
      }
    })();

    inFlightPromiseRef.current = flushPromise;
    try {
      await flushPromise;
    } finally {
      if (inFlightPromiseRef.current === flushPromise) {
        inFlightPromiseRef.current = null;
      }
    }

    if (collectChangedMarks().length > 0) {
      await flushProgramMarks();
    }
  }, [programMode, programId, readOnly, collectChangedMarks, onSaved, onToast]);

  useEffect(() => {
    if (!programMode || readOnly || !hasUnsavedMarkChanges) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void flushProgramMarks();
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [programMode, readOnly, hasUnsavedMarkChanges, draftMarks, flushProgramMarks]);

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
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    setBusy(true);
    setErr("");
    try {
      if (programMode && programId) {
        await flushProgramMarks();
      } else {
        const markJobs: Promise<unknown>[] = [];
        const keys = new Set([...Object.keys(draftMarks), ...Object.keys(savedMarks)]);

        for (const key of keys) {
          const draft = draftMarks[key];
          const saved = savedMarks[key];
          if (marksEqual(draft, saved)) continue;

          const colon = key.indexOf(":");
          const sessionId = key.slice(0, colon);
          const objectiveId = key.slice(colon + 1);
          const followUpId = followUpByObjective.get(objectiveId);
          if (!followUpId) continue;

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

        await Promise.all(markJobs);
        savedMarksRef.current = { ...draftMarks };
        setSavedMarks({ ...draftMarks });
        await onSaved();
        onToast?.("✅ Guardado correctamente", "success");
      }

      if (showObjectiveNotes) {
        const notesByFollowUp = new Map<string, { objectiveId: string; monthlyNotes: string }[]>();
        for (const o of objectives) {
          if ((notesDraft[o.id] ?? "") === (savedNotes[o.id] ?? "")) continue;
          const list = notesByFollowUp.get(o.followUpId) ?? [];
          list.push({ objectiveId: o.id, monthlyNotes: notesDraft[o.id] ?? "" });
          notesByFollowUp.set(o.followUpId, list);
        }
        const noteJobs: Promise<unknown>[] = [];
        for (const [followUpId, notes] of notesByFollowUp) {
          noteJobs.push(
            apiFetch(`/followups/${followUpId}/objective-notes`, {
              method: "PATCH",
              body: JSON.stringify({ notes }),
            }),
          );
        }
        await Promise.all(noteJobs);
        if (!programMode) {
          await onSaved();
          onToast?.("✅ Guardado correctamente", "success");
        } else {
          onToast?.("✅ Guardado", "success");
        }
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error al guardar";
      setErr(message);
      onToast?.(message, "error");
    } finally {
      setBusy(false);
    }
  }

  function renderObjectiveRow(obj: GridObjective, archived = false, showAreaSeparator = false) {
    const displayNo = obj.globalNo ?? obj.idx;
    const chipLabel = obj.areaName ? areaShortLabel(obj.areaName) : null;
    const chipClass = obj.areaId ? areaChipClass(obj.areaId, areaIdsInOrder) : "";
    const borderClass = obj.areaId ? areaBorderClass(obj.areaId, areaIdsInOrder) : "";
    const headerClass = obj.areaId ? areaHeaderClass(obj.areaId, areaIdsInOrder) : "";

    return (
      <Fragment key={obj.id}>
        {showAreaSeparator && obj.areaName ? (
          <tr className="border-b border-border">
            <td
              colSpan={columns.length + (showObjectiveNotes ? 2 : 1)}
              className={`px-3 py-2 text-xs font-semibold ${headerClass}`}
            >
              {obj.areaName}
            </td>
          </tr>
        ) : null}
        <tr key={obj.id} className={`border-b border-border border-l-4 last:border-b-0 ${borderClass}`}>
          <td className="sticky left-0 z-10 max-w-[280px] border-r border-border bg-card px-3 py-2 align-top text-xs leading-snug">
            <div className="flex flex-wrap items-start gap-1.5">
              {chipLabel && obj.areaId ? (
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${chipClass}`}>
                  {chipLabel}
                </span>
              ) : null}
              <span>
                {archived ? (
                  <span className="mr-1 rounded bg-warning/20 px-1 text-[10px] font-semibold text-warning">Archivado</span>
                ) : null}
                <span className="font-medium text-primary">{displayNo}.</span> {obj.text}
              </span>
            </div>
          </td>
          {columns.map((col) => {
            const sessionId = resolveSessionId(obj, col, programMode);
            const dateKey = columnDate(col, programMode);
            const mark = sessionId ? getDraftMark(sessionId, obj.id) : null;
            const active = sessionId != null && picker?.sessionId === sessionId && picker?.objectiveId === obj.id;
            return (
              <td key={dateKey} className="border-r border-border p-0 text-center last:border-r-0">
                {sessionId ? (
                  <button
                    type="button"
                    disabled={busy || readOnly}
                    className={
                      active
                        ? "h-10 w-full bg-primary/20 font-bold text-primary ring-2 ring-inset ring-primary"
                        : "h-10 w-full bg-transparent font-semibold text-ink hover:bg-primary/10"
                    }
                    onClick={() => !readOnly && setPicker({ sessionId, objectiveId: obj.id })}
                  >
                    {cellLabel(mark) || "·"}
                  </button>
                ) : (
                  <span className="inline-flex h-10 w-full items-center justify-center text-subtle/40">—</span>
                )}
              </td>
            );
          })}
          {showObjectiveNotes ? (
            <td className="px-2 py-1 align-top">
              <textarea
                className="textarea min-h-[64px] text-xs"
                value={notesDraft[obj.id] ?? obj.monthlyNotes ?? ""}
                disabled={busy || readOnly}
                onChange={(e) => setNotesDraft((prev) => ({ ...prev, [obj.id]: e.target.value }))}
                placeholder="Notas del mes para este objetivo…"
              />
            </td>
          ) : null}
        </tr>
      </Fragment>
    );
  }

  if (!columns.length) {
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
          {busy
            ? "Guardando…"
            : hasUnsavedChanges
              ? programMode
                ? "Hay cambios sin guardar; se guardarán automáticamente."
                : "Hay cambios sin guardar en la cuadrícula."
              : "Cuadrícula sincronizada."}
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
              {columns.map((col) => {
                const date = columnDate(col, programMode);
                const therapist = columnTherapist(col, programMode);
                return (
                  <th
                    key={date}
                    className="min-w-[72px] border-r border-border px-2 py-2.5 text-center font-medium text-subtle last:border-r-0"
                    title={therapist}
                  >
                    <span className="block text-xs font-semibold text-ink">{formatSessionHeader(date)}</span>
                    {therapist ? (
                      <span className="mt-0.5 block truncate text-[10px] font-normal opacity-70">
                        {therapist.split(" ")[0]}
                      </span>
                    ) : null}
                  </th>
                );
              })}
              {showObjectiveNotes ? (
                <th className="min-w-[180px] px-3 py-2.5 text-left font-semibold text-subtle">Observaciones del objetivo</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {programMode
              ? objectivesByArea.flatMap((group, groupIdx) =>
                  group.items.map((obj, itemIdx) =>
                    renderObjectiveRow(obj, false, programMode && groupIdx > 0 && itemIdx === 0),
                  ),
                )
              : activeObjectives.map((obj) => renderObjectiveRow(obj))}
            {!programMode ? archivedObjectives.map((obj) => renderObjectiveRow(obj, true)) : null}
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
