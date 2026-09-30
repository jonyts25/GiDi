"use client";

import { areaHeaderClass } from "@/lib/area-display";

type Attendance = {
  percent: number | null;
  present: number;
  absent: number;
  excluded: number;
  totalCounted: number;
};

type ObjectiveSummary = {
  objectiveId: string;
  idx: number;
  text: string;
  monthlyNotes: string | null;
  lastProgressScale: number | null;
  lastProgressPercent: number | null;
  lastSessionDate: string | null;
};

export type ParentFollowUpCardData = {
  followUpId: string;
  periodYear: number;
  periodMonth: number;
  area: { id: string; key: string; name: string; trackingMode?: string };
  therapist: { id: string; fullName: string };
  attendance: Attendance;
  objectives: ObjectiveSummary[];
  generalNotes: string | null;
  homeWork: string | null;
  parentComments?: string | null;
  observationsAuthor: string | null;
  sessionCount: number;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ParentProgramSummaryData = {
  programId: string;
  therapistName: string;
  periodYear: number;
  periodMonth: number;
  areas: ParentFollowUpCardData[];
};

export type ParentFollowUpSummaryItem = ParentFollowUpCardData | ParentProgramSummaryData;

export function isProgramSummary(item: ParentFollowUpSummaryItem): item is ParentProgramSummaryData {
  return "areas" in item && Array.isArray(item.areas);
}

function ProgressRing({ percent }: { percent: number | null }) {
  const p = percent ?? 0;
  const stroke = 8;
  const r = 44;
  const c = 2 * Math.PI * r;
  const offset = c - (p / 100) * c;

  return (
    <div className="relative inline-flex h-28 w-28 items-center justify-center">
      <svg className="-rotate-90" width="112" height="112" viewBox="0 0 112 112">
        <circle cx="56" cy="56" r={r} fill="none" stroke="var(--color-border)" strokeWidth={stroke} />
        <circle
          cx="56"
          cy="56"
          r={r}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-xl font-bold text-ink">{percent != null ? `${percent}%` : "—"}</span>
    </div>
  );
}

function ObjectiveBar({ percent }: { percent: number | null }) {
  const p = percent ?? 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${p}%` }} />
    </div>
  );
}

function formatPeriod(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });
}

function FollowUpAreaBody({ data, compactHeader = false }: { data: ParentFollowUpCardData; compactHeader?: boolean }) {
  const isTextOnly = data.area.trackingMode === "TEXT_ONLY";
  const authorLabel = data.observationsAuthor?.trim() || data.therapist.fullName;

  return (
    <>
      {compactHeader ? (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          {!isTextOnly ? (
            <div className="text-center">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-subtle">Asistencia</p>
              <ProgressRing percent={data.attendance.percent} />
              <p className="mt-1 text-xs text-subtle">
                {data.attendance.present} presente(s) · {data.attendance.absent} falta(s)
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {isTextOnly ? (
        <div className="space-y-3 py-4 text-sm">
          <p className="leading-relaxed text-subtle">
            <span className="font-semibold text-ink">Observaciones: </span>
            {data.generalNotes?.trim() || "Sin observaciones registradas este mes."}
          </p>
          {data.observationsAuthor ? (
            <p className="text-subtle">
              <span className="font-semibold text-ink">Registrado por: </span>
              {data.observationsAuthor}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-semibold text-ink">Objetivos activos</h3>
          {data.objectives.length === 0 ? (
            <p className="text-sm text-subtle">Aún no hay objetivos definidos para este mes.</p>
          ) : (
            <ul className="space-y-4">
              {data.objectives.map((obj) => (
                <li key={obj.objectiveId} className="rounded-xl border border-border bg-surface/80 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug text-ink">
                      <span className="text-primary">{obj.idx}.</span> {obj.text}
                    </p>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                      {obj.lastProgressPercent != null
                        ? `${obj.lastProgressPercent}%`
                        : obj.lastProgressScale === null
                          ? "Sin registro"
                          : "Objetivo no trabajado (X)"}
                    </span>
                  </div>
                  <div className="mt-2">
                    <ObjectiveBar percent={obj.lastProgressPercent} />
                  </div>
                  {obj.lastSessionDate ? (
                    <p className="mt-1 text-[11px] text-subtle">
                      Última evaluación: {new Date(obj.lastSessionDate).toLocaleDateString("es-MX")}
                    </p>
                  ) : null}
                  {obj.monthlyNotes ? (
                    <p className="mt-3 rounded-lg bg-card p-3 text-sm leading-relaxed text-subtle">
                      <span className="font-semibold text-ink">Observaciones: </span>
                      {obj.monthlyNotes}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!isTextOnly && (data.homeWork || data.generalNotes || data.parentComments) && (
        <footer className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          {data.generalNotes ? (
            <p>
              <span className="font-semibold text-ink">Notas del mes: </span>
              <span className="text-subtle">{data.generalNotes}</span>
            </p>
          ) : null}
          {data.homeWork ? (
            <p>
              <span className="font-semibold text-ink">Trabajo en casa: </span>
              <span className="text-subtle">{data.homeWork}</span>
            </p>
          ) : null}
          {data.parentComments ? (
            <p>
              <span className="font-semibold text-ink">Comentarios de la familia: </span>
              <span className="text-subtle">{data.parentComments}</span>
            </p>
          ) : null}
        </footer>
      )}

      {!compactHeader && isTextOnly ? (
        <p className="mt-2 text-xs text-subtle">Registrado por: {authorLabel}</p>
      ) : null}
    </>
  );
}

function StandaloneFollowUpCard({ data }: { data: ParentFollowUpCardData }) {
  const isTextOnly = data.area.trackingMode === "TEXT_ONLY";
  const authorLabel = data.observationsAuthor?.trim() || data.therapist.fullName;
  const periodLabel = formatPeriod(data.periodYear, data.periodMonth);

  return (
    <article className="card overflow-hidden border-l-4 border-l-primary">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-bold text-ink">{data.area.name}</h2>
          <p className="text-xs font-semibold capitalize text-primary">{periodLabel}</p>
          <p className="text-sm text-subtle">
            {isTextOnly ? `Registrado por: ${authorLabel}` : `Terapeuta: ${data.therapist.fullName}`}
          </p>
          <p className="mt-1 text-xs text-subtle">{data.sessionCount} sesión(es) registrada(s) este mes</p>
          {data.createdAt ? (
            <p className="mt-0.5 text-xs text-subtle">
              Subido el {new Date(data.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          ) : null}
        </div>
        {!isTextOnly ? (
          <div className="text-center">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-subtle">Asistencia</p>
            <ProgressRing percent={data.attendance.percent} />
            <p className="mt-1 text-xs text-subtle">
              {data.attendance.present} presente(s) · {data.attendance.absent} falta(s)
            </p>
          </div>
        ) : null}
      </header>
      <FollowUpAreaBody data={data} />
    </article>
  );
}

function ProgramFollowUpCard({ data }: { data: ParentProgramSummaryData }) {
  const periodLabel = formatPeriod(data.periodYear, data.periodMonth);
  const areaIdsInOrder = data.areas.map((a) => a.area.id);

  return (
    <article className="card overflow-hidden border-l-4 border-l-primary">
      <header className="border-b border-border pb-4">
        <h2 className="text-lg font-bold text-ink">Programación mensual</h2>
        <p className="text-xs font-semibold capitalize text-primary">{periodLabel}</p>
        <p className="text-sm text-subtle">Terapeuta: {data.therapistName}</p>
        <p className="mt-1 text-xs text-subtle">{data.areas.length} área(s)</p>
      </header>

      <div className="divide-y divide-border">
        {data.areas.map((area) => (
          <section key={area.followUpId} className="py-4">
            <div className={`mb-3 inline-block rounded px-3 py-1.5 text-sm font-semibold ${areaHeaderClass(area.area.id, areaIdsInOrder)}`}>
              {area.area.name}
            </div>
            <FollowUpAreaBody data={area} compactHeader />
          </section>
        ))}
      </div>
    </article>
  );
}

export function ParentFollowUpSummaryCard({ data }: { data: ParentFollowUpSummaryItem }) {
  if (isProgramSummary(data)) {
    return <ProgramFollowUpCard data={data} />;
  }
  return <StandaloneFollowUpCard data={data} />;
}
