"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { resolveTrackingMode, areaSupportsObjectiveSuggestions } from "@/lib/followup-area";
import { suggestionsForArea } from "@/lib/followup-suggestions";
import { MonthlyFollowUpGrid } from "@/components/followups/MonthlyFollowUpGrid";
import { NewFollowUpSessionForm } from "@/components/followups/NewFollowUpSessionForm";
import { FollowUpReportPrint } from "@/components/followups/FollowUpReportPrint";
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
  area: Area;
  patient?: { id: string; firstName: string; lastName: string };
  therapist?: { id: string; fullName: string; email: string };
  objectives: Objective[];
  sessions: Session[];
};

function readLoggedUser(): { id: string; fullName: string } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("gidi_user");
  if (!raw) return null;
  try {
    const u = JSON.parse(raw) as { id?: string; fullName?: string };
    return u.id ? { id: u.id, fullName: u.fullName ?? "Usuario actual" } : null;
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

  const [fu, setFu] = useState<FollowUpDetail | null>(null);
  const [msg, setMsg] = useState("");
  const [loggedUser, setLoggedUser] = useState<{ id: string; fullName: string } | null>(null);
  const [therapists, setTherapists] = useState<{ id: string; fullName: string }[]>([]);
  const [reportForPrint, setReportForPrint] = useState<FollowUpReport | null>(null);
  const [exporting, setExporting] = useState(false);

  const [generalGoal, setGeneralGoal] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [homeWork, setHomeWork] = useState("");
  const [parentComments, setParentComments] = useState("");
  const [observationsAuthor, setObservationsAuthor] = useState("");
  const [objectivesText, setObjectivesText] = useState("");

  const objectives = useMemo(
    () =>
      objectivesText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    [objectivesText],
  );

  const tracking = useMemo(() => (fu?.area ? resolveTrackingMode(fu.area) : "MONTHLY_GRID"), [fu?.area]);
  const showSuggestions = useMemo(() => (fu?.area ? areaSupportsObjectiveSuggestions(fu.area) : false), [fu?.area]);

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

  async function onSaveTextOnly() {
    setMsg("");
    try {
      await apiFetch(`/followups/${followUpId}`, {
        method: "PATCH",
        body: JSON.stringify({
          generalNotes,
          observationsAuthor: observationsAuthor.trim() || loggedUser?.fullName || null,
        }),
      });
      await reload();
      setMsg("✅ Guardado");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  async function onSaveHeader() {
    setMsg("");
    try {
      const body = { generalNotes, homeWork, parentComments };
      await apiFetch(`/followups/${followUpId}`, { method: "PATCH", body: JSON.stringify(body) });
      await reload();
      setMsg("✅ Guardado");
    } catch (e: unknown) {
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
  const resolvedBackHref =
    fu.patient?.id && patientFollowUpsPrefix
      ? `${patientFollowUpsPrefix}/patients/${fu.patient.id}/followups`
      : backHref;

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
            {fu.patient?.firstName} {fu.patient?.lastName} — {fu.therapist?.fullName}
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
          <Link className="btn rounded-xl px-3 py-2 text-sm" href={resolvedBackHref}>
            ← Volver
          </Link>
        </div>
      </div>

      {msg ? <p className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-subtle">{msg}</p> : null}

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
            />
          </label>
          <label className="grid max-w-md gap-1 text-sm">
            <span className="font-medium text-subtle">Registrado por</span>
            <input
              className="input"
              value={observationsAuthor}
              onChange={(e) => setObservationsAuthor(e.target.value)}
              placeholder="Nombre de quien llenó este registro"
            />
          </label>
          <button type="button" className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold" onClick={onSaveTextOnly}>
            Guardar observaciones
          </button>
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
                  >
                    Sugerencia {i + 1}
                  </button>
                ))}
              </div>
            ) : null}
            <textarea className="textarea min-h-[140px]" value={objectivesText} onChange={(e) => setObjectivesText(e.target.value)} />
            <button type="button" className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold" onClick={onSaveObjectives}>
              Guardar objetivos
            </button>
          </section>

          <section className="card space-y-4 border-l-4 border-l-primary">
            <h2 className="text-lg font-semibold">Sesiones del mes</h2>
            {defaultTherapistId ? (
              <NewFollowUpSessionForm
                followUpId={fu.id}
                defaultTherapistId={defaultTherapistId}
                therapists={therapists.length ? therapists : [{ id: defaultTherapistId, fullName: fu.therapist?.fullName ?? "Terapeuta" }]}
                onCreated={reload}
              />
            ) : null}
            {fu.sessions?.length ? (
              <ul className="flex flex-wrap gap-2 text-sm">
                {fu.sessions.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface-elevated/60 px-3 py-1.5">
                    <span>{new Date(s.sessionDate).toLocaleDateString("es-MX")}</span>
                    <span className="text-subtle">· {s.therapist?.fullName}</span>
                    <button type="button" className="text-xs text-danger hover:underline" onClick={() => void onDeleteSession(s.id)}>
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="card space-y-3 border-l-4 border-l-warning">
            <h2 className="text-lg font-semibold">Cuadrícula</h2>
            {fu.objectives?.length ? (
              <MonthlyFollowUpGrid followUpId={fu.id} objectives={fu.objectives} sessions={fu.sessions ?? []} onSaved={reload} />
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
          <textarea className="textarea min-h-[120px]" value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-subtle">Trabajo en casa</span>
          <textarea className="textarea min-h-[120px]" value={homeWork} onChange={(e) => setHomeWork(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-subtle">Comentarios que hizo el papá</span>
          <textarea className="textarea min-h-[120px]" value={parentComments} onChange={(e) => setParentComments(e.target.value)} />
        </label>
        <button type="button" className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold" onClick={onSaveHeader}>
          Guardar cierre de mes
        </button>
      </section>
      ) : null}
    </div>
    </>
  );
}
