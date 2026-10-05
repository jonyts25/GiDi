"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { resolveTrackingMode } from "@/lib/followup-area";
import { calendarDateToUtcIso, formatCalendarDate, localDateInputValue } from "@/lib/date-utils";
import { areaChipClass, areaHeaderClass } from "@/lib/area-display";
import { hasOfficeStaffRole } from "@/lib/role-permissions";
import { useToast } from "@/components/ui/Toast";
import { MultiDatePicker } from "@/components/ui/MultiDatePicker";
import {
  MonthlyFollowUpGrid,
  type FlatMark,
  type ProgramSessionColumn,
} from "@/components/followups/MonthlyFollowUpGrid";
import { ProgramReportDownloadButton } from "@/components/followups/ProgramReportDownloadButton";
import { DELETE_PROGRAM_CONFIRM } from "@/lib/followup-list-display";

type Area = { id: string; key: string; name: string; trackingMode?: string | null };
type BankObjective = {
  id: string;
  description: string;
  isPublic: boolean;
  area: { id: string; key: string; name: string };
  creator: { id: string; fullName: string };
};

type ProgramObjective = {
  id: string;
  idx: number;
  globalNo: number;
  text: string;
  activities: string | null;
};

type ProgramArea = {
  areaId: string;
  areaName: string;
  areaSortOrder: number;
  followUpId: string;
  objectives: ProgramObjective[];
};

type ProgramPayload = {
  program: {
    id: string;
    patientId: string;
    therapistId: string;
    periodYear: number;
    periodMonth: number;
    patient: { id: string; firstName: string; lastName: string };
    therapist: { id: string; fullName: string; email: string };
  };
  areas: ProgramArea[];
  sessions: ProgramSessionColumn[];
  marks: (FlatMark & { followUpId?: string; globalNo?: number })[];
};

type FollowUpNotes = {
  id: string;
  status: string;
  generalNotes: string | null;
  homeWork: string | null;
  parentComments: string | null;
};

type DraftObjective = { id?: string; text: string; activities: string };
type DraftAreaBlock = { areaId: string; objectives: DraftObjective[] };

const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function programToDraft(areas: ProgramArea[]): DraftAreaBlock[] {
  return areas.map((a) => ({
    areaId: a.areaId,
    objectives: a.objectives.map((o) => ({
      id: o.id,
      text: o.text,
      activities: o.activities ?? "",
    })),
  }));
}

function draftGlobalNumbers(blocks: DraftAreaBlock[]): Map<string, number> {
  const map = new Map<string, number>();
  let n = 1;
  for (const block of blocks) {
    for (const obj of block.objectives) {
      const key = obj.id ?? `${block.areaId}:${obj.text}`;
      map.set(key, n++);
    }
  }
  return map;
}

export function ProgramEditor(props: {
  programId: string;
  basePath: "therapist" | "admin";
}) {
  const { programId, basePath } = props;
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<ProgramPayload | null>(null);
  const [allAreas, setAllAreas] = useState<Area[]>([]);
  const [followUpNotes, setFollowUpNotes] = useState<Record<string, FollowUpNotes>>({});
  const [draftBlocks, setDraftBlocks] = useState<DraftAreaBlock[]>([]);
  const [notesDraft, setNotesDraft] = useState<
    Record<string, { generalNotes: string; homeWork: string; parentComments: string }>
  >({});
  const [bankByArea, setBankByArea] = useState<Record<string, BankObjective[]>>({});
  const [bankQuery, setBankQuery] = useState<Record<string, string>>({});
  const [bankOpen, setBankOpen] = useState<string | null>(null);
  const bankRef = useRef<HTMLDivElement>(null);
  const [sessionMode, setSessionMode] = useState<"single" | "multi">("single");
  const [singleSessionDate, setSingleSessionDate] = useState(localDateInputValue());
  const [multiSessionDates, setMultiSessionDates] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [gridKey, setGridKey] = useState(0);
  const [isOfficeStaff, setIsOfficeStaff] = useState(false);

  const monthlyAreas = useMemo(
    () => allAreas.filter((a) => resolveTrackingMode(a) === "MONTHLY_GRID"),
    [allAreas],
  );

  const usedAreaIds = useMemo(() => new Set(draftBlocks.map((b) => b.areaId)), [draftBlocks]);

  const reload = useCallback(async () => {
    const payload = (await apiFetch(`/programs/${programId}`)) as ProgramPayload;
    setData(payload);
    setDraftBlocks(programToDraft(payload.areas));

    const { patientId, periodYear, periodMonth } = payload.program;
    const followups = (await apiFetch(
      `/patients/${patientId}/followups?year=${periodYear}&month=${periodMonth}`,
    )) as FollowUpNotes[];

    const notesMap: Record<string, FollowUpNotes> = {};
    const draft: Record<string, { generalNotes: string; homeWork: string; parentComments: string }> = {};
    for (const fu of followups) {
      notesMap[fu.id] = fu;
    }
    for (const area of payload.areas) {
      const fu = notesMap[area.followUpId];
      draft[area.followUpId] = {
        generalNotes: fu?.generalNotes ?? "",
        homeWork: fu?.homeWork ?? "",
        parentComments: fu?.parentComments ?? "",
      };
    }
    setFollowUpNotes(notesMap);
    setNotesDraft(draft);
    setGridKey((k) => k + 1);
    return { payload, notesDraft: draft };
  }, [programId]);

  useEffect(() => {
    const raw = localStorage.getItem("gidi_user");
    if (raw) {
      try {
        const roles: string[] = JSON.parse(raw).roles ?? [];
        setIsOfficeStaff(hasOfficeStaffRole(roles));
      } catch {
        setIsOfficeStaff(false);
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const areas = (await apiFetch("/areas")) as Area[];
        setAllAreas(areas);
        await reload();
      } catch (e: unknown) {
        showToast(e instanceof Error ? e.message : "Error al cargar", "error");
      }
    })();
  }, [reload, showToast]);

  const canLoadBank = useMemo(() => {
    if (typeof window === "undefined") return false;
    const raw = localStorage.getItem("gidi_user");
    if (!raw) return false;
    try {
      const roles: string[] = JSON.parse(raw).roles ?? [];
      return roles.includes("THERAPIST") || hasOfficeStaffRole(roles);
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!bankOpen) return;

    const onMouseDown = (e: MouseEvent) => {
      const el = bankRef.current;
      if (el && !el.contains(e.target as Node)) {
        setBankOpen(null);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBankOpen(null);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [bankOpen]);

  async function loadBankForArea(areaId: string) {
    if (!canLoadBank || bankByArea[areaId]) return;
    try {
      const rows = await apiFetch(`/therapist/objective-bank?areaId=${encodeURIComponent(areaId)}`);
      setBankByArea((prev) => ({ ...prev, [areaId]: Array.isArray(rows) ? rows : [] }));
    } catch {
      setBankByArea((prev) => ({ ...prev, [areaId]: [] }));
    }
  }

  const isLocked = useMemo(() => {
    if (!data) return false;
    return data.areas.some((a) => followUpNotes[a.followUpId]?.status === "CLOSED");
  }, [data, followUpNotes]);

  const canDeleteProgram = !isLocked || isOfficeStaff;

  const backHref = useMemo(
    () => (data ? `/${basePath}/patients/${data.program.patientId}/followups` : null),
    [basePath, data],
  );

  const globalNumbers = useMemo(() => draftGlobalNumbers(draftBlocks), [draftBlocks]);

  const flatMarks: FlatMark[] = useMemo(() => {
    if (!data) return [];
    return data.marks.map((m) => ({
      sessionId: m.sessionId,
      objectiveId: m.objectiveId,
      code: m.code,
      progressScale: m.progressScale,
    }));
  }, [data]);

  const sessionColumns: ProgramSessionColumn[] = useMemo(() => {
    if (!data) return [];
    return data.sessions.map((s) => ({
      date: s.date.includes("T") ? s.date.slice(0, 10) : s.date,
      entries: s.entries,
      therapist: data.program.therapist ? { fullName: data.program.therapist.fullName } : undefined,
    }));
  }, [data]);

  const areaIdsInOrder = useMemo(() => draftBlocks.map((b) => b.areaId), [draftBlocks]);

  const programEmpty = data ? data.areas.length === 0 : false;

  function buildRowsPayload() {
    return draftBlocks
      .filter((b) => b.objectives.some((o) => o.text.trim()))
      .map((b) => ({
        areaId: b.areaId,
        objectives: b.objectives
          .filter((o) => o.text.trim())
          .map((o) => ({
            ...(o.id ? { id: o.id } : {}),
            text: o.text.trim(),
            activities: o.activities.trim() || null,
          })),
      }));
  }

  async function persistRows() {
    await apiFetch(`/programs/${programId}/rows`, {
      method: "PUT",
      body: JSON.stringify(buildRowsPayload()),
    });
  }

  async function persistAllObservations(
    areas: ProgramArea[],
    drafts: Record<string, { generalNotes: string; homeWork: string; parentComments: string }>,
    status: "DRAFT" | "CLOSED" = "DRAFT",
  ) {
    for (const area of areas) {
      const draft = drafts[area.followUpId];
      if (!draft) continue;
      await apiFetch(`/followups/${area.followUpId}`, {
        method: "PATCH",
        body: JSON.stringify({
          generalNotes: draft.generalNotes,
          homeWork: draft.homeWork,
          parentComments: draft.parentComments,
          status,
        }),
      });
    }
  }

  function addAreaBlock(areaId: string) {
    if (!areaId || usedAreaIds.has(areaId)) return;
    setDraftBlocks((prev) => [...prev, { areaId, objectives: [{ text: "", activities: "" }] }]);
  }

  function removeAreaBlock(areaId: string) {
    setDraftBlocks((prev) => prev.filter((b) => b.areaId !== areaId));
  }

  function addObjective(areaId: string) {
    setDraftBlocks((prev) =>
      prev.map((b) =>
        b.areaId === areaId ? { ...b, objectives: [...b.objectives, { text: "", activities: "" }] } : b,
      ),
    );
  }

  function updateObjective(areaId: string, index: number, patch: Partial<DraftObjective>) {
    setDraftBlocks((prev) =>
      prev.map((b) => {
        if (b.areaId !== areaId) return b;
        const objectives = b.objectives.map((o, i) => (i === index ? { ...o, ...patch } : o));
        return { ...b, objectives };
      }),
    );
  }

  function removeObjective(areaId: string, index: number) {
    setDraftBlocks((prev) =>
      prev.map((b) => {
        if (b.areaId !== areaId) return b;
        return { ...b, objectives: b.objectives.filter((_, i) => i !== index) };
      }),
    );
  }

  function appendBankObjective(areaId: string, index: number, text: string) {
    updateObjective(areaId, index, { text });
    setBankQuery((prev) => ({ ...prev, [areaId]: "" }));
    setBankOpen(null);
  }

  async function saveRows() {
    setBusy(true);
    try {
      await persistRows();
      await reload();
      showToast("✅ Guardado correctamente");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error al guardar", "error");
    } finally {
      setBusy(false);
    }
  }

  async function copyFromPrevious() {
    setBusy(true);
    try {
      await apiFetch(`/programs/${programId}/copy-from-previous`, { method: "POST" });
      await reload();
      showToast("✅ Guardado correctamente");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error al copiar", "error");
    } finally {
      setBusy(false);
    }
  }

  async function addSession() {
    if (!data) return;
    const dates = sessionMode === "single" ? [singleSessionDate] : multiSessionDates;
    if (!dates.length) {
      showToast("Indique al menos una fecha válida", "error");
      return;
    }
    setBusy(true);
    try {
      const body =
        sessionMode === "single"
          ? { date: calendarDateToUtcIso(dates[0]) }
          : { dates: dates.map((d) => calendarDateToUtcIso(d)) };
      await apiFetch(`/programs/${programId}/sessions`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      await reload();
      setSingleSessionDate(localDateInputValue());
      setMultiSessionDates([]);
      showToast("✅ Guardado correctamente");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error al agregar sesión", "error");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSession(date: string) {
    if (!confirm(`¿Eliminar la sesión del ${formatCalendarDate(date)} y todas sus marcas?`)) return;
    setBusy(true);
    try {
      await apiFetch(`/programs/${programId}/sessions/${encodeURIComponent(date)}`, { method: "DELETE" });
      await reload();
      showToast("✅ Guardado correctamente");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error al eliminar sesión", "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveObservations(followUpId: string) {
    const draft = notesDraft[followUpId];
    if (!draft) return;
    setBusy(true);
    try {
      await apiFetch(`/followups/${followUpId}`, {
        method: "PATCH",
        body: JSON.stringify({
          generalNotes: draft.generalNotes,
          homeWork: draft.homeWork,
          parentComments: draft.parentComments,
        }),
      });
      await reload();
      showToast("✅ Guardado correctamente");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error al guardar observaciones", "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    setBusy(true);
    try {
      await persistRows();
      const { payload, notesDraft: freshNotes } = await reload();
      await persistAllObservations(payload.areas, freshNotes, "DRAFT");
      await reload();
      showToast("✅ Guardado correctamente");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error al guardar borrador", "error");
    } finally {
      setBusy(false);
    }
  }

  async function deleteProgram() {
    if (!data || !backHref) return;
    const confirmMessage = isLocked
      ? "Este seguimiento ya está publicado y los papás pueden verlo. ¿Borrarlo de todos modos?"
      : DELETE_PROGRAM_CONFIRM;
    if (!confirm(confirmMessage)) return;
    setBusy(true);
    try {
      await apiFetch(`/programs/${programId}`, { method: "DELETE" });
      showToast("✅ Programación eliminada");
      router.push(backHref);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error al borrar", "error");
    } finally {
      setBusy(false);
    }
  }

  async function publishProgram() {
    if (
      !confirm(
        "¿Publicar este seguimiento? Ya no podrá modificarse (solo un administrador puede revertirlo).",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await persistRows();
      const { payload, notesDraft: freshNotes } = await reload();

      for (const area of payload.areas) {
        const draft = freshNotes[area.followUpId];
        if (!draft) continue;
        await apiFetch(`/followups/${area.followUpId}`, {
          method: "PATCH",
          body: JSON.stringify({
            generalNotes: draft.generalNotes,
            homeWork: draft.homeWork,
            parentComments: draft.parentComments,
          }),
        });
      }

      await apiFetch(`/programs/${programId}/publish`, { method: "POST" });
      await reload();
      showToast("✅ Publicado correctamente");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error al publicar", "error");
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <div className="max-w-[1200px] space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Programación</h1>
            <p className="mt-1 text-sm text-subtle">Cargando…</p>
          </div>
          <button type="button" className="btn rounded-xl px-3 py-2 text-sm opacity-50" disabled>
            ← Volver a seguimientos
          </button>
        </div>
        <p className="py-10 text-subtle">Cargando programación…</p>
      </div>
    );
  }

  const { program } = data;
  const monthLabel = MONTH_NAMES[program.periodMonth - 1] ?? String(program.periodMonth);
  const patientName = `${program.patient.firstName} ${program.patient.lastName}`;
  const programFollowUpIds = data.areas.map((a) => a.followUpId);

  return (
    <div className="max-w-[1200px] space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Programación · {program.periodYear}/{String(program.periodMonth).padStart(2, "0")}
          </h1>
          <p className="mt-1 text-sm text-subtle">
            {patientName} — Terapeuta: {program.therapist.fullName}
          </p>
          <p className="mt-1 text-xs capitalize text-subtle">
            {monthLabel} {program.periodYear}
          </p>
          {isLocked ? (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-warning">
              Algunas áreas están publicadas · solo lectura
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {programFollowUpIds.length > 0 ? (
            <ProgramReportDownloadButton
              followUpIds={programFollowUpIds}
              patientName={patientName}
              programHeader={{
                periodYear: program.periodYear,
                periodMonth: program.periodMonth,
                therapistName: program.therapist.fullName,
              }}
            />
          ) : null}
          {backHref ? (
            <Link className="btn rounded-xl px-3 py-2 text-sm" href={backHref}>
              ← Volver a seguimientos
            </Link>
          ) : (
            <button type="button" className="btn rounded-xl px-3 py-2 text-sm opacity-50" disabled>
              ← Volver a seguimientos
            </button>
          )}
        </div>
      </div>

      <section className="card space-y-4 border-l-4 border-l-primary">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Programación individual</h2>
          {programEmpty && !isLocked ? (
            <button
              type="button"
              className="btn rounded-xl px-4 py-2 text-sm"
              disabled={busy}
              onClick={() => void copyFromPrevious()}
            >
              Copiar programación del mes anterior
            </button>
          ) : null}
        </div>

        {draftBlocks.length === 0 ? (
          <p className="text-sm text-subtle">Agregue al menos un área para definir objetivos.</p>
        ) : (
          <div className="space-y-6">
            {draftBlocks.map((block) => {
              const areaName =
                data.areas.find((a) => a.areaId === block.areaId)?.areaName ??
                monthlyAreas.find((a) => a.id === block.areaId)?.name ??
                "Área";
              const headerClass = areaHeaderClass(block.areaId, areaIdsInOrder);
              const query = bankQuery[block.areaId] ?? "";
              const bankItems = (bankByArea[block.areaId] ?? []).filter((item) => {
                if (!query.trim()) return true;
                return item.description.toLowerCase().includes(query.toLowerCase());
              });

              return (
                <div key={block.areaId} className="overflow-hidden rounded-xl border border-border">
                  <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 ${headerClass}`}>
                    <span className="text-sm font-semibold">{areaName}</span>
                    {!isLocked ? (
                      <button
                        type="button"
                        className="text-xs text-white/90 underline hover:text-white"
                        disabled={busy}
                        onClick={() => removeAreaBlock(block.areaId)}
                      >
                        Quitar área
                      </button>
                    ) : null}
                  </div>
                  <div className="bg-surface-elevated/30 p-4">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-subtle">
                            <th className="w-12 px-2 py-2 font-semibold">No.</th>
                            <th className="min-w-[220px] px-2 py-2 font-semibold">Objetivo específico</th>
                            <th className="min-w-[180px] px-2 py-2 font-semibold">Actividades</th>
                            {!isLocked ? <th className="w-10" /> : null}
                          </tr>
                        </thead>
                        <tbody>
                          {block.objectives.map((obj, objIdx) => {
                            const key = obj.id ?? `${block.areaId}:${obj.text}`;
                            const no = globalNumbers.get(key) ?? objIdx + 1;
                            return (
                              <tr key={`${block.areaId}-${objIdx}`} className="border-b border-border/60 last:border-b-0">
                                <td className="px-2 py-2 align-top font-semibold text-primary">{no}</td>
                                <td className="px-2 py-2 align-top">
                                  <div className="relative">
                                    <textarea
                                      className="textarea min-h-[56px] w-full text-sm"
                                      value={obj.text}
                                      disabled={busy || isLocked}
                                      placeholder="Objetivo específico…"
                                      onChange={(e) => updateObjective(block.areaId, objIdx, { text: e.target.value })}
                                      onFocus={() => {
                                        if (canLoadBank) void loadBankForArea(block.areaId);
                                      }}
                                      onBlur={(e) => {
                                        if (bankOpen !== `${block.areaId}:${objIdx}`) return;
                                        const next = e.relatedTarget as Node | null;
                                        if (next && bankRef.current?.contains(next)) return;
                                        setBankOpen(null);
                                      }}
                                    />
                                    {canLoadBank && !isLocked && bankOpen === `${block.areaId}:${objIdx}` ? (
                                      <>
                                        <div
                                          ref={bankRef}
                                          className="absolute left-0 top-full z-40 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg"
                                        >
                                          <input
                                            className="input w-full rounded-none border-0 border-b text-xs"
                                            placeholder="Buscar en banco…"
                                            value={query}
                                            autoFocus
                                            onChange={(e) =>
                                              setBankQuery((prev) => ({ ...prev, [block.areaId]: e.target.value }))
                                            }
                                          />
                                          {bankItems.length ? (
                                            bankItems.slice(0, 20).map((item) => (
                                              <button
                                                key={item.id}
                                                type="button"
                                                className="block w-full px-3 py-2 text-left text-xs hover:bg-primary/10"
                                                onClick={() => appendBankObjective(block.areaId, objIdx, item.description)}
                                              >
                                                {item.description}
                                              </button>
                                            ))
                                          ) : (
                                            <p className="px-3 py-2 text-xs text-subtle">Sin coincidencias</p>
                                          )}
                                        </div>
                                      </>
                                    ) : null}
                                    {canLoadBank && !isLocked ? (
                                      <button
                                        type="button"
                                        className="mt-1 text-xs text-primary hover:underline"
                                        onClick={() => {
                                          void loadBankForArea(block.areaId);
                                          setBankOpen(`${block.areaId}:${objIdx}`);
                                        }}
                                      >
                                        Elegir del banco
                                      </button>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="px-2 py-2 align-top">
                                  <textarea
                                    className="textarea min-h-[56px] w-full text-sm"
                                    value={obj.activities}
                                    disabled={busy || isLocked}
                                    placeholder="Actividades…"
                                    onChange={(e) => updateObjective(block.areaId, objIdx, { activities: e.target.value })}
                                  />
                                </td>
                                {!isLocked ? (
                                  <td className="px-1 py-2 align-top">
                                    <button
                                      type="button"
                                      className="text-xs text-danger hover:underline"
                                      disabled={busy || block.objectives.length <= 1}
                                      onClick={() => removeObjective(block.areaId, objIdx)}
                                    >
                                      ✕
                                    </button>
                                  </td>
                                ) : null}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {!isLocked ? (
                      <button
                        type="button"
                        className="mt-3 text-sm text-primary hover:underline"
                        disabled={busy}
                        onClick={() => addObjective(block.areaId)}
                      >
                        + Agregar objetivo
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isLocked ? (
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <select
              className="select max-w-xs"
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value;
                if (v) {
                  addAreaBlock(v);
                  e.target.value = "";
                }
              }}
            >
              <option value="">— Agregar área —</option>
              {monthlyAreas
                .filter((a) => !usedAreaIds.has(a.id))
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
            <button
              type="button"
              className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
              disabled={busy || draftBlocks.length === 0}
              onClick={() => void saveRows()}
            >
              {busy ? "Guardando…" : "Guardar programación"}
            </button>
          </div>
        ) : null}
      </section>

      <section className="card space-y-4 border-l-4 border-l-warning">
        <h2 className="text-lg font-semibold">Tabla de seguimiento</h2>

        {!isLocked ? (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-elevated/40 p-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-lg px-3 py-1 text-xs font-semibold ${sessionMode === "single" ? "bg-primary text-white" : "border border-border"}`}
                onClick={() => setSessionMode("single")}
                disabled={busy}
              >
                Una fecha
              </button>
              <button
                type="button"
                className={`rounded-lg px-3 py-1 text-xs font-semibold ${sessionMode === "multi" ? "bg-primary text-white" : "border border-border"}`}
                onClick={() => setSessionMode("multi")}
                disabled={busy}
              >
                Varias fechas
              </button>
            </div>

            {sessionMode === "single" ? (
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-subtle">Fecha de sesión</span>
                <input
                  type="date"
                  className="input w-auto"
                  value={singleSessionDate}
                  onChange={(e) => setSingleSessionDate(e.target.value)}
                  disabled={busy}
                />
              </label>
            ) : (
              <div className="grid gap-1 text-sm">
                <span className="font-medium text-subtle">Seleccione fechas en el calendario</span>
                <MultiDatePicker selected={multiSessionDates} onChange={setMultiSessionDates} disabled={busy} />
              </div>
            )}

            <button
              type="button"
              className="btn-primary w-fit rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
              disabled={busy || data.areas.length === 0}
              onClick={() => void addSession()}
            >
              {sessionMode === "multi" ? "+ Agregar sesiones" : "+ Agregar sesión"}
            </button>
          </div>
        ) : null}

        {sessionColumns.length > 0 ? (
          <ul className="flex flex-wrap gap-2 text-sm">
            {sessionColumns.map((s) => (
              <li
                key={s.date}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface-elevated/60 px-3 py-1.5"
              >
                <span>{formatCalendarDate(s.date)}</span>
                {!isLocked ? (
                  <button
                    type="button"
                    className="text-xs text-danger hover:underline"
                    disabled={busy}
                    onClick={() => void deleteSession(s.date)}
                  >
                    Eliminar
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {data.areas.some((a) => a.objectives.length > 0) ? (
          <MonthlyFollowUpGrid
            key={gridKey}
            objectives={data.areas.flatMap((area) =>
              area.objectives.map((o) => ({
                id: o.id,
                idx: o.idx,
                globalNo: o.globalNo,
                text: o.text,
                followUpId: area.followUpId,
                areaId: area.areaId,
                areaName: area.areaName,
              })),
            )}
            sessionColumns={sessionColumns}
            flatMarks={flatMarks}
            onSaved={() => {
              void reload();
            }}
            onToast={showToast}
            readOnly={isLocked}
            showObjectiveNotes={false}
            programMode
            programId={programId}
          />
        ) : (
          <p className="text-sm text-subtle">Guarde objetivos en la programación individual para habilitar la cuadrícula.</p>
        )}
      </section>

      <section className="card space-y-4 border-l-4 border-l-primary">
        <h2 className="text-lg font-semibold">Observaciones</h2>
        {data.areas.length === 0 ? (
          <p className="text-sm text-subtle">Las observaciones por área aparecerán cuando guarde la programación.</p>
        ) : (
          <div className="space-y-6">
            {data.areas.map((area) => {
              const draft = notesDraft[area.followUpId] ?? { generalNotes: "", homeWork: "", parentComments: "" };
              const chipClass = areaChipClass(area.areaId, areaIdsInOrder);
              const areaLocked = followUpNotes[area.followUpId]?.status === "CLOSED";
              return (
                <div key={area.followUpId} className="rounded-xl border border-border p-4">
                  <p className={`mb-3 inline-block rounded px-2 py-1 text-xs font-semibold ${chipClass}`}>
                    {area.areaName}
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium text-subtle">Observaciones generales</span>
                      <textarea
                        className="textarea min-h-[100px]"
                        value={draft.generalNotes}
                        disabled={busy || areaLocked}
                        onChange={(e) =>
                          setNotesDraft((prev) => ({
                            ...prev,
                            [area.followUpId]: { ...draft, generalNotes: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium text-subtle">Trabajo en casa</span>
                      <textarea
                        className="textarea min-h-[100px]"
                        value={draft.homeWork}
                        disabled={busy || areaLocked}
                        onChange={(e) =>
                          setNotesDraft((prev) => ({
                            ...prev,
                            [area.followUpId]: { ...draft, homeWork: e.target.value },
                          }))
                        }
                      />
                    </label>
                  </div>
                  <label className="mt-4 grid gap-1 text-sm">
                    <span className="font-medium text-subtle">Comentarios que hizo la familia / tutores</span>
                    <textarea
                      className="textarea min-h-[100px]"
                      value={draft.parentComments}
                      disabled={busy || areaLocked}
                      onChange={(e) =>
                        setNotesDraft((prev) => ({
                          ...prev,
                          [area.followUpId]: { ...draft, parentComments: e.target.value },
                        }))
                      }
                    />
                  </label>
                  {!areaLocked ? (
                    <button
                      type="button"
                      className="btn mt-3 rounded-xl px-4 py-2 text-sm"
                      disabled={busy}
                      onClick={() => void saveObservations(area.followUpId)}
                    >
                      Guardar observaciones
                    </button>
                  ) : (
                    <p className="mt-2 text-xs text-subtle">Área publicada · solo lectura</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {(!isLocked && data.areas.length > 0) || canDeleteProgram ? (
        <section className="card space-y-4 border-l-4 border-l-primary">
          {!isLocked && data.areas.length > 0 ? (
            <>
              <h2 className="text-lg font-semibold">Publicar programación</h2>
              <p className="text-sm text-subtle">
                Guarde la programación, observaciones y comentarios como borrador, o publíquelos para cerrar el mes.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  disabled={busy}
                  onClick={() => void saveDraft()}
                >
                  {busy ? "Guardando…" : "Guardar borrador"}
                </button>
                <button
                  type="button"
                  className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  disabled={busy}
                  onClick={() => void publishProgram()}
                >
                  {busy ? "Publicando…" : "Publicar seguimiento"}
                </button>
                {canDeleteProgram ? (
                  <button
                    type="button"
                    className="rounded-xl border border-danger/40 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-50"
                    disabled={busy}
                    onClick={() => void deleteProgram()}
                  >
                    {isLocked ? "Borrar seguimiento publicado" : "Borrar borrador"}
                  </button>
                ) : null}
              </div>
            </>
          ) : canDeleteProgram ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-xl border border-danger/40 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-50"
                disabled={busy}
                onClick={() => void deleteProgram()}
              >
                {isLocked ? "Borrar seguimiento publicado" : "Borrar borrador"}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
