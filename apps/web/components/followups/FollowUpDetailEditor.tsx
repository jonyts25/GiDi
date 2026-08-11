"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { resolveTrackingMode, areaSupportsObjectiveSuggestions } from "@/lib/followup-area";
import { suggestionsForArea } from "@/lib/followup-suggestions";
import { MonthlyFollowUpGrid } from "@/components/followups/MonthlyFollowUpGrid";
import { NewFollowUpSessionForm } from "@/components/followups/NewFollowUpSessionForm";
import { FollowUpReportPrint } from "@/components/followups/FollowUpReportPrint";
import { SaveBanner } from "@/components/ui/SaveBanner";
import { useToast } from "@/components/ui/Toast";
import { formatCalendarDate } from "@/lib/date-utils";
import { hasFullAdminRole, hasOfficeStaffRole } from "@/lib/role-permissions";
import type { FollowUpReport } from "@/lib/followup-report.types";
import { waitForPrintReady } from "@/lib/print-utils";

type Area = { id: string; key: string; name: string; trackingMode?: string | null };
type Objective = { id: string; idx: number; text: string; monthlyNotes?: string | null };
type Mark = { objectiveId: string; code?: string | null; progressScale?: number | null };
type Session = {
  id: string;
  sessionDate: string;
  therapist?: { id: string; fullName: string };
  marks: Mark[];
};
type BankObjective = {
  id: string;
  description: string;
  isPublic: boolean;
  area: { id: string; key: string; name: string };
  creator: { id: string; fullName: string };
};

export type FollowUpDetail = {
  id: string;
  periodYear: number;
  periodMonth: number;
  generalGoal: string | null;
  generalNotes: string | null;
  homeWork: string | null;
  parentComments: string | null;
  observationsAuthor: string | null;
  status: string;
  visibleToParent?: boolean;
  visibleToTherapist?: boolean;
  visibleToSchool?: boolean;
  area: Area;
  patient?: { id: string; firstName: string; lastName: string };
  therapist?: { id: string; fullName: string; email: string };
  objectives: Objective[];
  sessions: Session[];
};

function readLoggedUser(): { id: string; fullName: string; roles: string[] } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("gidi_user");
  if (!raw) return null;
  try {
    const u = JSON.parse(raw) as { id?: string; fullName?: string; roles?: string[] };
    return u.id ? { id: u.id, fullName: u.fullName ?? "Usuario actual", roles: u.roles ?? [] } : null;
  } catch {
    return null;
  }
}

function applyFollowUpToForm(
  data: FollowUpDetail,
  setters: {
    setGeneralGoal: (v: string) => void;
    setHomeWork: (v: string) => void;
    setParentComments: (v: string) => void;
    setObservationsAuthor: (v: string) => void;
    setGeneralNotes: (v: string) => void;
    setVisibleToParent: (v: boolean) => void;
    setVisibleToTherapist: (v: boolean) => void;
    setVisibleToSchool: (v: boolean) => void;
    setObjectivesText: (v: string) => void;
  },
  options?: { skipObjectives?: boolean; skipHeader?: boolean; skipAudience?: boolean },
) {
  if (!options?.skipHeader) {
    setters.setGeneralGoal(data.generalGoal ?? "");
    setters.setHomeWork(data.homeWork ?? "");
    setters.setParentComments(data.parentComments ?? "");
    setters.setObservationsAuthor(data.observationsAuthor ?? readLoggedUser()?.fullName ?? "");
    setters.setGeneralNotes(data.generalNotes ?? data.generalGoal ?? "");
  }
  if (!options?.skipAudience) {
    setters.setVisibleToParent(data.visibleToParent ?? true);
    setters.setVisibleToTherapist(data.visibleToTherapist ?? true);
    setters.setVisibleToSchool(data.visibleToSchool ?? false);
  }
  if (!options?.skipObjectives) {
    setters.setObjectivesText(
      (data.objectives ?? [])
        .filter((o) => o.idx < 1000)
        .sort((a, b) => a.idx - b.idx)
        .map((o) => o.text)
        .join("\n"),
    );
  }
}

export function FollowUpDetailEditor(props: {
  followUpId: string;
  backHref: string;
  /** Si se indica, el enlace «Volver» apunta a /{prefix}/patients/:id/followups cuando ya cargó el paciente. */
  patientFollowUpsPrefix?: string;
  loadTherapists?: boolean;
  showReportExport?: boolean;
}) {
  const { followUpId, backHref, patientFollowUpsPrefix, loadTherapists = false, showReportExport = false } = props;
  const router = useRouter();
  const { showToast } = useToast();

  const [fu, setFu] = useState<FollowUpDetail | null>(null);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");
  const [loggedUser, setLoggedUser] = useState<{ id: string; fullName: string; roles: string[] } | null>(null);
  const [therapists, setTherapists] = useState<{ id: string; fullName: string }[]>([]);
  const [reportForPrint, setReportForPrint] = useState<FollowUpReport | null>(null);
  const pendingPrintRef = useRef(false);
  const [exporting, setExporting] = useState(false);

  const [generalGoal, setGeneralGoal] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [homeWork, setHomeWork] = useState("");
  const [parentComments, setParentComments] = useState("");
  const [observationsAuthor, setObservationsAuthor] = useState("");
  const [objectivesText, setObjectivesText] = useState("");
  const [visibleToParent, setVisibleToParent] = useState(true);
  const [visibleToTherapist, setVisibleToTherapist] = useState(true);
  const [visibleToSchool, setVisibleToSchool] = useState(false);

  const dirtyObjectives = useRef(false);
  const dirtyHeader = useRef(false);
  const dirtyAudience = useRef(false);

  const [bankItems, setBankItems] = useState<BankObjective[]>([]);
  const [bankQuery, setBankQuery] = useState("");
  const [bankOpen, setBankOpen] = useState(false);

  const formSetters = useMemo(
    () => ({
      setGeneralGoal,
      setHomeWork,
      setParentComments,
      setObservationsAuthor,
      setGeneralNotes,
      setVisibleToParent,
      setVisibleToTherapist,
      setVisibleToSchool,
      setObjectivesText,
    }),
    [],
  );

  const objectives = useMemo(
    () =>
      objectivesText
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [objectivesText],
  );

  const tracking = useMemo(() => (fu?.area ? resolveTrackingMode(fu.area) : "MONTHLY_GRID"), [fu?.area]);
  const showSuggestions = useMemo(() => (fu?.area ? areaSupportsObjectiveSuggestions(fu.area) : false), [fu?.area]);
  const isAdmin = useMemo(() => hasFullAdminRole(loggedUser?.roles ?? []), [loggedUser]);
  const isOfficeStaff = useMemo(() => hasOfficeStaffRole(loggedUser?.roles ?? []), [loggedUser]);
  const isLocked = fu?.status === "CLOSED" && !isOfficeStaff;
  const canDelete =
    !!fu && (isOfficeStaff || (fu.status === "DRAFT" && !isLocked));
  const isTextOnly = tracking === "TEXT_ONLY";
  const submitterLabel = isTextOnly
    ? fu?.observationsAuthor?.trim() || fu?.therapist?.fullName || "—"
    : fu?.therapist?.fullName ?? "—";

  const filteredBank = useMemo(() => {
    const q = bankQuery.trim().toLowerCase();
    if (!q) return bankItems;
    return bankItems.filter(
      (b) =>
        b.description.toLowerCase().includes(q) ||
        b.creator.fullName.toLowerCase().includes(q) ||
        (b.isPublic ? "público" : "privado").includes(q),
    );
  }, [bankItems, bankQuery]);

  const resolvedBackHref = useMemo(() => {
    if (fu?.patient?.id && patientFollowUpsPrefix) {
      return `${patientFollowUpsPrefix}/patients/${fu.patient.id}/followups`;
    }
    return backHref;
  }, [fu?.patient?.id, patientFollowUpsPrefix, backHref]);

  const reload = useCallback(
    async (opts?: { skipObjectives?: boolean; skipHeader?: boolean; skipAudience?: boolean }) => {
      const data = (await apiFetch(`/followups/${followUpId}`)) as FollowUpDetail;
      setFu(data);
      applyFollowUpToForm(data, formSetters, {
        skipObjectives: opts?.skipObjectives || dirtyObjectives.current,
        skipHeader: opts?.skipHeader || dirtyHeader.current,
        skipAudience: opts?.skipAudience || dirtyAudience.current,
      });
      return data;
    },
    [followUpId, formSetters],
  );

  useEffect(() => {
    const onAfterPrint = () => {
      setReportForPrint(null);
      pendingPrintRef.current = false;
    };
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, []);

  useEffect(() => {
    if (!reportForPrint || !pendingPrintRef.current) return;

    let cancelled = false;
    void (async () => {
      await waitForPrintReady("#follow-up-report-print");
      if (!cancelled && pendingPrintRef.current) {
        window.print();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reportForPrint]);

  useEffect(() => {
    setLoggedUser(readLoggedUser());
    dirtyObjectives.current = false;
    dirtyHeader.current = false;
    dirtyAudience.current = false;
    (async () => {
      try {
        if (loadTherapists) {
          const [_, t] = await Promise.all([reload(), apiFetch("/users/therapists")]);
          setTherapists(t);
        } else {
          await reload();
          const user = readLoggedUser();
          if (user) setTherapists([{ id: user.id, fullName: user.fullName }]);
        }
      } catch (e: unknown) {
        setMsg(e instanceof Error ? e.message : "Error");
      }
    })();
  }, [followUpId, loadTherapists, reload]);

  useEffect(() => {
    if (!fu?.area?.id || isTextOnly || isLocked) {
      setBankItems([]);
      return;
    }
    const roles = loggedUser?.roles ?? [];
    const canLoadBank =
      roles.includes("THERAPIST") || hasOfficeStaffRole(roles);
    if (!canLoadBank) return;

    (async () => {
      try {
        const rows = await apiFetch(`/therapist/objective-bank?areaId=${encodeURIComponent(fu.area.id)}`);
        setBankItems(Array.isArray(rows) ? rows : []);
      } catch {
        setBankItems([]);
      }
    })();
  }, [fu?.area?.id, isTextOnly, isLocked, loggedUser?.roles]);

  async function onSaveTextOnly(publish = false) {
    setMsg("");
    try {
      await apiFetch(`/followups/${followUpId}`, {
        method: "PATCH",
        body: JSON.stringify({
          generalNotes,
          observationsAuthor: observationsAuthor.trim() || loggedUser?.fullName || null,
          ...(publish ? { status: "CLOSED" } : { status: "DRAFT" }),
        }),
      });
      dirtyHeader.current = false;
      if (publish) {
        router.push(resolvedBackHref);
        return;
      }
      await reload({ skipObjectives: true, skipAudience: true });
      setMsgType("success");
      setMsg("✅ Borrador guardado correctamente");
      showToast("✅ Borrador guardado correctamente");
    } catch (e: unknown) {
      setMsgType("error");
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  async function onSaveHeader(publish = false) {
    setMsg("");
    try {
      const body = {
        generalNotes,
        homeWork,
        parentComments,
        ...(publish ? { status: "CLOSED" } : { status: "DRAFT" }),
      };
      await apiFetch(`/followups/${followUpId}`, { method: "PATCH", body: JSON.stringify(body) });
      dirtyHeader.current = false;
      if (publish) {
        router.push(resolvedBackHref);
        return;
      }
      await reload({ skipObjectives: true, skipAudience: true });
      setMsgType("success");
      setMsg("✅ Borrador guardado correctamente");
      showToast("✅ Borrador guardado correctamente");
    } catch (e: unknown) {
      setMsgType("error");
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  async function onPublish() {
    if (!confirm("¿Publicar este seguimiento? Ya no podrá modificarse (solo un administrador puede revertirlo).")) return;
    if (isTextOnly) await onSaveTextOnly(true);
    else await onSaveHeader(true);
  }

  async function onDeleteFollowUp() {
    const label = fu?.status === "CLOSED" ? "publicado" : "borrador";
    if (!confirm(`¿Eliminar este seguimiento ${label}? Esta acción no se puede deshacer.`)) return;
    setMsg("");
    try {
      await apiFetch(`/followups/${followUpId}`, { method: "DELETE" });
      router.push(resolvedBackHref);
    } catch (e: unknown) {
      setMsgType("error");
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  async function onSaveAudience() {
    setMsg("");
    try {
      await apiFetch(`/followups/${followUpId}`, {
        method: "PATCH",
        body: JSON.stringify({ visibleToParent, visibleToTherapist, visibleToSchool }),
      });
      dirtyAudience.current = false;
      await reload({ skipObjectives: true, skipHeader: true });
      setMsgType("success");
      setMsg("✅ Audiencia actualizada");
    } catch (e: unknown) {
      setMsgType("error");
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  async function onSaveObjectives() {
    setMsg("");
    try {
      await apiFetch(`/followups/${followUpId}/objectives`, {
        method: "POST",
        body: JSON.stringify({ objectives }),
      });
      dirtyObjectives.current = false;
      await reload({ skipHeader: true, skipAudience: true });
      setMsgType("success");
      setMsg("✅ Objetivos actualizados");
      showToast("✅ Objetivos guardados correctamente");
    } catch (e: unknown) {
      setMsgType("error");
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  async function onDeleteSession(sessionId: string) {
    if (!confirm("¿Eliminar esta sesión y todas sus marcas?")) return;
    setMsg("");
    try {
      await apiFetch(`/followups/${followUpId}/sessions/${sessionId}`, { method: "DELETE" });
      await reload();
      setMsgType("success");
      setMsg("✅ Sesión eliminada");
    } catch (e: unknown) {
      setMsgType("error");
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  function appendSuggestion(text: string) {
    dirtyObjectives.current = true;
    setObjectivesText((prev) => (prev.trim() ? `${prev.trim()}\n${text}` : text));
  }

  function appendBankObjective(text: string) {
    appendSuggestion(text);
    setBankQuery("");
    setBankOpen(false);
  }

  async function printReport() {
    setMsg("");
    setExporting(true);
    try {
      const report = (await apiFetch(`/followups/${followUpId}/report`)) as FollowUpReport;
      pendingPrintRef.current = true;
      setReportForPrint(report);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error al generar expediente");
      setReportForPrint(null);
    } finally {
      setExporting(false);
    }
  }

  if (!fu) return <p className="py-10 text-subtle">Cargando seguimiento…</p>;

  const defaultTherapistId = fu.therapist?.id ?? loggedUser?.id ?? "";

  return (
    <>
      {reportForPrint ? (
        <FollowUpReportPrint report={reportForPrint} />
      ) : null}

    <div className="gidi-screen-only max-w-[1200px] space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Seguimiento · {fu.area?.name} · {fu.periodYear}/{String(fu.periodMonth).padStart(2, "0")}
          </h1>
          <p className="mt-1 text-sm text-subtle">
            {fu.patient?.firstName} {fu.patient?.lastName} —{" "}
            {isTextOnly ? `Registrado por: ${submitterLabel}` : `Terapeuta: ${submitterLabel}`}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-subtle">
            Estado: {fu.status === "CLOSED" ? "Enviado" : "Borrador"}
            {isLocked ? " · Solo lectura" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {showReportExport ? (
            <button
              type="button"
              className="btn rounded-xl px-3 py-2 text-sm"
              disabled={exporting}
              onClick={() => void printReport()}
            >
              {exporting ? "Preparando expediente…" : "Exportar expediente"}
            </button>
          ) : null}
          {canDelete ? (
            <button type="button" className="btn rounded-xl px-3 py-2 text-sm text-danger" onClick={() => void onDeleteFollowUp()}>
              Eliminar seguimiento
            </button>
          ) : null}
          <Link className="btn rounded-xl px-3 py-2 text-sm" href={resolvedBackHref}>
            ← Volver
          </Link>
        </div>
      </div>

      <SaveBanner message={msg} type={msgType} />

      {isAdmin ? (
        <section className="card space-y-3 border-l-4 border-l-accent-blue">
          <div>
            <h2 className="text-lg font-semibold">¿Quién puede ver este seguimiento?</h2>
            <p className="text-sm text-subtle">
              El administrador siempre lo ve. Puede cambiar la audiencia aun después de publicado.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={visibleToParent}
                onChange={(e) => {
                  dirtyAudience.current = true;
                  setVisibleToParent(e.target.checked);
                }}
              />
              Papás
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={visibleToTherapist}
                onChange={(e) => {
                  dirtyAudience.current = true;
                  setVisibleToTherapist(e.target.checked);
                }}
              />
              Terapeutas
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={visibleToSchool}
                onChange={(e) => {
                  dirtyAudience.current = true;
                  setVisibleToSchool(e.target.checked);
                }}
              />
              Escuela
            </label>
          </div>
          <button type="button" className="btn rounded-xl px-4 py-2 text-sm font-semibold" onClick={() => void onSaveAudience()}>
            Guardar audiencia
          </button>
        </section>
      ) : null}

      {isLocked ? (
        <p className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          Este seguimiento ya fue publicado y no se puede modificar.
        </p>
      ) : null}

      {tracking === "TEXT_ONLY" ? (
        <section className="card space-y-4 border-l-4 border-l-info">
          <h2 className="text-lg font-semibold">Observaciones</h2>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-subtle">Observaciones del mes</span>
            <textarea
              className="textarea min-h-[220px]"
              value={generalNotes}
              onChange={(e) => {
                dirtyHeader.current = true;
                setGeneralNotes(e.target.value);
              }}
              placeholder="Escriba aquí las observaciones del mes…"
              disabled={isLocked}
            />
          </label>
          <label className="grid max-w-md gap-1 text-sm">
            <span className="font-medium text-subtle">Registrado por</span>
            <input
              className="input"
              value={observationsAuthor}
              onChange={(e) => {
                dirtyHeader.current = true;
                setObservationsAuthor(e.target.value);
              }}
              placeholder="Nombre de quien llenó este registro"
              disabled={isLocked}
            />
          </label>
          {!isLocked ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn rounded-xl px-4 py-2 text-sm font-semibold" onClick={() => void onSaveTextOnly(false)}>
                Guardar borrador
              </button>
              <button type="button" className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold" onClick={() => void onPublish()}>
                Publicar seguimiento
              </button>
            </div>
          ) : null}
        </section>
      ) : (
        <>
          <section className="card space-y-3 border-l-4 border-l-success">
            <h2 className="text-lg font-semibold">Objetivos del mes</h2>
            {showSuggestions ? (
              <div className="flex flex-wrap gap-2">
                {suggestionsForArea(fu.area.key).map((t, i) => (
                  <button
                    key={i}
                    type="button"
                    className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium hover:bg-primary/20"
                    onClick={() => appendSuggestion(t)}
                    disabled={isLocked}
                  >
                    Sugerencia {i + 1}
                  </button>
                ))}
              </div>
            ) : null}

            {!isLocked ? (
              <div className="space-y-2 rounded-xl border border-border bg-surface-elevated/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">Buscar en banco de objetivos</p>
                  <button
                    type="button"
                    className="text-xs text-subtle underline"
                    onClick={() => setBankOpen((v) => !v)}
                  >
                    {bankOpen ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                {bankOpen ? (
                  <>
                    <input
                      className="input"
                      placeholder="Buscar en mis objetivos o catálogo público…"
                      value={bankQuery}
                      onChange={(e) => setBankQuery(e.target.value)}
                    />
                    {filteredBank.length === 0 ? (
                      <p className="text-xs text-subtle">
                        {bankItems.length === 0
                          ? "No hay objetivos en el banco para esta área."
                          : "Sin coincidencias."}
                      </p>
                    ) : (
                      <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
                        {filteredBank.map((b) => (
                          <li key={b.id}>
                            <button
                              type="button"
                              className="w-full rounded-lg border border-transparent px-2 py-1.5 text-left hover:border-border hover:bg-surface-elevated"
                              onClick={() => appendBankObjective(b.description)}
                            >
                              <span className="font-medium">{b.description}</span>
                              <span className="mt-0.5 block text-xs text-subtle">
                                {b.isPublic ? "Público" : "Privado"} · {b.creator.fullName}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : null}
              </div>
            ) : null}

            <p className="text-xs text-subtle">Un objetivo por línea (Enter). Puede usar comas dentro del texto.</p>
            <textarea
              className="textarea min-h-[140px]"
              value={objectivesText}
              onChange={(e) => {
                dirtyObjectives.current = true;
                setObjectivesText(e.target.value);
              }}
              disabled={isLocked}
            />
            {!isLocked ? (
              <button type="button" className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold" onClick={() => void onSaveObjectives()}>
                Guardar objetivos
              </button>
            ) : null}
          </section>

          <section className="card space-y-4 border-l-4 border-l-primary">
            <h2 className="text-lg font-semibold">Sesiones del mes</h2>
            {defaultTherapistId ? (
              <NewFollowUpSessionForm
                followUpId={fu.id}
                defaultTherapistId={defaultTherapistId}
                therapists={therapists.length ? therapists : [{ id: defaultTherapistId, fullName: fu.therapist?.fullName ?? "Terapeuta" }]}
                onCreated={() => void reload()}
                disabled={isLocked}
              />
            ) : null}
            {fu.sessions?.length ? (
              <ul className="flex flex-wrap gap-2 text-sm">
                {fu.sessions.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface-elevated/60 px-3 py-1.5">
                    <span>{formatCalendarDate(s.sessionDate)}</span>
                    <span className="text-subtle">· {s.therapist?.fullName}</span>
                    {!isLocked ? (
                      <button type="button" className="text-xs text-danger hover:underline" onClick={() => void onDeleteSession(s.id)}>
                        Eliminar
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="card space-y-3 border-l-4 border-l-warning">
            <h2 className="text-lg font-semibold">Cuadrícula</h2>
            {fu.objectives?.length ? (
              <MonthlyFollowUpGrid
                followUpId={fu.id}
                objectives={fu.objectives}
                sessions={fu.sessions ?? []}
                onSaved={() => void reload()}
                readOnly={isLocked}
              />
            ) : (
              <p className="text-sm text-subtle">Defina objetivos para habilitar la cuadrícula.</p>
            )}
          </section>
        </>
      )}

      {tracking !== "TEXT_ONLY" ? (
      <section className="card space-y-4 border-l-4 border-l-primary">
        <h2 className="text-lg font-semibold">Cierre de mes</h2>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-subtle">Observaciones generales</span>
          <textarea
            className="textarea min-h-[120px]"
            value={generalNotes}
            onChange={(e) => {
              dirtyHeader.current = true;
              setGeneralNotes(e.target.value);
            }}
            disabled={isLocked}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-subtle">Trabajo en casa</span>
          <textarea
            className="textarea min-h-[120px]"
            value={homeWork}
            onChange={(e) => {
              dirtyHeader.current = true;
              setHomeWork(e.target.value);
            }}
            disabled={isLocked}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-subtle">Comentarios que hizo el papá</span>
          <textarea
            className="textarea min-h-[120px]"
            value={parentComments}
            onChange={(e) => {
              dirtyHeader.current = true;
              setParentComments(e.target.value);
            }}
            disabled={isLocked}
          />
        </label>
        {!isLocked ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn rounded-xl px-4 py-2 text-sm font-semibold" onClick={() => void onSaveHeader(false)}>
              Guardar borrador
            </button>
            <button type="button" className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold" onClick={() => void onPublish()}>
              Publicar seguimiento
            </button>
          </div>
        ) : null}
      </section>
      ) : null}
    </div>
    </>
  );
}
