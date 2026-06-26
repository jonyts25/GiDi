"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { resolveTrackingMode, areaSupportsObjectiveSuggestions } from "@/lib/followup-area";
import { suggestionsForArea } from "@/lib/followup-suggestions";
import { MonthlyFollowUpGrid } from "@/components/followups/MonthlyFollowUpGrid";
import { NewFollowUpSessionForm } from "@/components/followups/NewFollowUpSessionForm";
import { FollowUpReportPrint } from "@/components/followups/FollowUpReportPrint";
import { SaveBanner } from "@/components/ui/SaveBanner";
import { formatCalendarDate } from "@/lib/date-utils";
import type { FollowUpReport } from "@/lib/followup-report.types";

type Area = { id: string; key: string; name: string; trackingMode?: string | null };
type Objective = { id: string; idx: number; text: string; monthlyNotes?: string | null };
type Mark = { objectiveId: string; code?: string | null; progressScale?: number | null };
type Session = {
  id: string;
  sessionDate: string;
  therapist?: { id: string; fullName: string };
  marks: Mark[];
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

  const [fu, setFu] = useState<FollowUpDetail | null>(null);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");
  const [loggedUser, setLoggedUser] = useState<{ id: string; fullName: string; roles: string[] } | null>(null);
  const [therapists, setTherapists] = useState<{ id: string; fullName: string }[]>([]);
  const [reportForPrint, setReportForPrint] = useState<FollowUpReport | null>(null);
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

  const objectives = useMemo(
    () =>
      objectivesText
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [objectivesText],
  );

  const tracking = useMemo(() => (fu?.area ? resolveTrackingMode(fu.area) : "MONTHLY_GRID"), [fu?.area]);
  const showSuggestions = useMemo(() => (fu?.area ? areaSupportsObjectiveSuggestions(fu.area) : false), [fu?.area]);
  const isAdmin = useMemo(
    () => loggedUser?.roles.some((r) => r === "ADMIN" || r === "SUPERADMIN") ?? false,
    [loggedUser],
  );
  const isLocked = fu?.status === "CLOSED" && !isAdmin;
  const isTextOnly = tracking === "TEXT_ONLY";
  const submitterLabel = isTextOnly
    ? fu?.observationsAuthor?.trim() || fu?.therapist?.fullName || "—"
    : fu?.therapist?.fullName ?? "—";

  const resolvedBackHref = useMemo(() => {
    if (fu?.patient?.id && patientFollowUpsPrefix) {
      return `${patientFollowUpsPrefix}/patients/${fu.patient.id}/followups`;
    }
    return backHref;
  }, [fu?.patient?.id, patientFollowUpsPrefix, backHref]);

  const reload = useCallback(async () => {
    const data = (await apiFetch(`/followups/${followUpId}`)) as FollowUpDetail;
    setFu(data);
    setGeneralGoal(data.generalGoal ?? "");
    setHomeWork(data.homeWork ?? "");
    setParentComments(data.parentComments ?? "");
    setObservationsAuthor(
      data.observationsAuthor ?? readLoggedUser()?.fullName ?? "",
    );
    setGeneralNotes(data.generalNotes ?? data.generalGoal ?? "");
    setVisibleToParent(data.visibleToParent ?? true);
    setVisibleToTherapist(data.visibleToTherapist ?? true);
    setVisibleToSchool(data.visibleToSchool ?? false);
    setObjectivesText(
      (data.objectives ?? [])
        .filter((o) => o.idx < 1000)
        .sort((a, b) => a.idx - b.idx)
        .map((o) => o.text)
        .join("\n"),
    );
  }, [followUpId]);

  useEffect(() => {
    const onAfterPrint = () => setReportForPrint(null);
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, []);

  useEffect(() => {
    setLoggedUser(readLoggedUser());
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
      if (publish) {
        router.push(resolvedBackHref);
        return;
      }
      await reload();
      setMsgType("success");
      setMsg("✅ Borrador guardado correctamente");
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
      if (publish) {
        router.push(resolvedBackHref);
        return;
      }
      await reload();
      setMsgType("success");
      setMsg("✅ Borrador guardado correctamente");
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
    if (!confirm("¿Eliminar este seguimiento completo? Esta acción no se puede deshacer.")) return;
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
      await reload();
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
      await reload();
      setMsg("✅ Objetivos actualizados");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  async function onDeleteSession(sessionId: string) {
    if (!confirm("¿Eliminar esta sesión y todas sus marcas?")) return;
    setMsg("");
    try {
      await apiFetch(`/followups/${followUpId}/sessions/${sessionId}`, { method: "DELETE" });
      await reload();
      setMsg("✅ Sesión eliminada");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  function appendSuggestion(text: string) {
    setObjectivesText((prev) => (prev.trim() ? `${prev.trim()}\n${text}` : text));
  }

  async function printReport() {
    setMsg("");
    setExporting(true);
    try {
      const report = (await apiFetch(`/followups/${followUpId}/report`)) as FollowUpReport;
      setReportForPrint(report);
      await new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 150)));
      window.print();
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
            Estado: {fu.status === "CLOSED" ? "Publicado" : "Borrador"}
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
          {isAdmin ? (
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
              <input type="checkbox" checked={visibleToParent} onChange={(e) => setVisibleToParent(e.target.checked)} />
              Papás
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={visibleToTherapist} onChange={(e) => setVisibleToTherapist(e.target.checked)} />
              Terapeutas
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={visibleToSchool} onChange={(e) => setVisibleToSchool(e.target.checked)} />
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
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Escriba aquí las observaciones del mes…"
              disabled={isLocked}
            />
          </label>
          <label className="grid max-w-md gap-1 text-sm">
            <span className="font-medium text-subtle">Registrado por</span>
            <input
              className="input"
              value={observationsAuthor}
              onChange={(e) => setObservationsAuthor(e.target.value)}
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
            <p className="text-xs text-subtle">Una por línea o separadas por coma.</p>
            <textarea
              className="textarea min-h-[140px]"
              value={objectivesText}
              onChange={(e) => setObjectivesText(e.target.value)}
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
                onCreated={reload}
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
                onSaved={reload}
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
          <textarea className="textarea min-h-[120px]" value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} disabled={isLocked} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-subtle">Trabajo en casa</span>
          <textarea className="textarea min-h-[120px]" value={homeWork} onChange={(e) => setHomeWork(e.target.value)} disabled={isLocked} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-subtle">Comentarios que hizo el papá</span>
          <textarea className="textarea min-h-[120px]" value={parentComments} onChange={(e) => setParentComments(e.target.value)} disabled={isLocked} />
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
