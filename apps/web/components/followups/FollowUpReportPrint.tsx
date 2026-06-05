"use client";

import type { FollowUpReport } from "@/lib/followup-report.types";

function formatPeriod(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatGeneratedAt(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

function markLabel(m: { code: string | null; progressScale: number | null; progressPercent: number | null }) {
  if (m.progressScale != null) return String(m.progressScale);
  if (m.code) return m.code;
  return "—";
}

function attendanceLabel(status: string) {
  const map: Record<string, string> = {
    present: "Asistió",
    absent: "Falta",
    excluded: "No cuenta",
    unknown: "Sin código",
  };
  return map[status] ?? status;
}

function ProgressBar({ percent }: { percent: number | null }) {
  const p = percent ?? 0;
  return (
    <div className="gidi-report-progress-track">
      <div className="gidi-report-progress-fill" style={{ width: `${p}%` }} />
      <span className="gidi-report-progress-label">{percent != null ? `${percent}%` : "Sin registro"}</span>
    </div>
  );
}

export function FollowUpReportPrint({ report }: { report: FollowUpReport }) {
  const { followUp, summary, sessions } = report;
  const patientName = `${followUp.patient.firstName} ${followUp.patient.lastName}`;
  const periodLabel = formatPeriod(followUp.periodYear, followUp.periodMonth);

  const objectivesRows = summary.objectiveProgress.length
    ? summary.objectiveProgress
    : report.objectives.map((o) => ({
        objectiveId: o.id,
        idx: o.idx,
        text: o.text,
        monthlyNotes: o.monthlyNotes,
        lastProgressScale: null as number | null,
        lastProgressPercent: null as number | null,
        lastSessionDate: null as string | null,
      }));

  return (
    <div id="follow-up-report-print" className="gidi-report-root" aria-hidden="true">
      <header className="gidi-report-header gidi-report-avoid-break">
        <div className="gidi-report-brand">
          <div className="gidi-report-logo" aria-hidden>
            <span className="gidi-report-logo-g">G</span>
            <span className="gidi-report-logo-i">i</span>
            <span className="gidi-report-logo-d">D</span>
            <span className="gidi-report-logo-i2">i</span>
          </div>
          <div>
            <p className="gidi-report-brand-name">GiDi</p>
            <p className="gidi-report-brand-tag">Centro de desarrollo integral</p>
          </div>
        </div>
        <div className="gidi-report-meta">
          <h1 className="gidi-report-title">Expediente clínico mensual</h1>
          <dl className="gidi-report-meta-grid">
            <div>
              <dt>Paciente</dt>
              <dd>{patientName}</dd>
            </div>
            <div>
              <dt>Terapeuta titular</dt>
              <dd>{followUp.therapist.fullName}</dd>
            </div>
            <div>
              <dt>Área</dt>
              <dd>{followUp.area.name}</dd>
            </div>
            <div>
              <dt>Periodo</dt>
              <dd>{periodLabel}</dd>
            </div>
          </dl>
          <p className="gidi-report-generated">Generado: {formatGeneratedAt(report.generatedAt)}</p>
        </div>
      </header>

      <section className="gidi-report-kpis gidi-report-avoid-break">
        <div className="gidi-report-kpi">
          <span className="gidi-report-kpi-value">
            {summary.attendance.percent != null ? `${summary.attendance.percent}%` : "—"}
          </span>
          <span className="gidi-report-kpi-label">Asistencia del mes</span>
          <span className="gidi-report-kpi-sub">
            {summary.attendance.present} presente(s) · {summary.attendance.absent} falta(s)
            {summary.attendance.excluded > 0 ? ` · ${summary.attendance.excluded} excluida(s)` : ""}
          </span>
        </div>
        <div className="gidi-report-kpi">
          <span className="gidi-report-kpi-value">{summary.attendance.present}</span>
          <span className="gidi-report-kpi-label">Sesiones con asistencia</span>
          <span className="gidi-report-kpi-sub">{summary.sessionCount} sesión(es) registrada(s) en el mes</span>
        </div>
        <div className="gidi-report-kpi">
          <span className="gidi-report-kpi-value">{summary.objectiveCount}</span>
          <span className="gidi-report-kpi-label">Objetivos activos</span>
          <span className="gidi-report-kpi-sub">Escala 0–4 (0% a 100%)</span>
        </div>
      </section>

      <section className="gidi-report-section gidi-report-avoid-break">
        <h2 className="gidi-report-section-title">Avance por objetivo</h2>
        <table className="gidi-report-table">
          <thead>
            <tr>
              <th className="gidi-report-th-num">#</th>
              <th>Objetivo terapéutico</th>
              <th className="gidi-report-th-progress">Progreso</th>
              <th>Observaciones del objetivo</th>
            </tr>
          </thead>
          <tbody>
            {objectivesRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="gidi-report-empty">
                  No hay objetivos registrados para este periodo.
                </td>
              </tr>
            ) : (
              objectivesRows.map((obj) => (
                <tr key={obj.objectiveId}>
                  <td className="gidi-report-td-num">{obj.idx}</td>
                  <td>{obj.text}</td>
                  <td>
                    <ProgressBar percent={obj.lastProgressPercent} />
                    {obj.lastSessionDate ? (
                      <span className="gidi-report-cell-note">
                        Última marca: {formatDate(obj.lastSessionDate)}
                      </span>
                    ) : null}
                  </td>
                  <td className="gidi-report-td-notes">{obj.monthlyNotes?.trim() || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="gidi-report-section gidi-report-avoid-break">
        <h2 className="gidi-report-section-title">Bitácora de sesiones</h2>
        {sessions.length === 0 ? (
          <p className="gidi-report-empty-block">No se registraron sesiones en este mes.</p>
        ) : (
          <table className="gidi-report-table gidi-report-table-compact">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Terapeuta</th>
                <th>Asistencia</th>
                <th>Marcas por objetivo</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td className="gidi-report-td-date">{formatDate(s.sessionDate)}</td>
                  <td>{s.therapist.fullName}</td>
                  <td>
                    <span className={`gidi-report-badge gidi-report-badge--${s.attendance}`}>
                      {attendanceLabel(s.attendance)}
                    </span>
                  </td>
                  <td>
                    <ul className="gidi-report-marks-list">
                      {s.marks.length === 0 ? (
                        <li>Sin marcas</li>
                      ) : (
                        s.marks.map((m) => (
                          <li key={m.id}>
                            <strong>{m.objectiveIdx ?? "?"}. {m.objectiveText ?? "Objetivo"}:</strong>{" "}
                            <span className="gidi-report-mark-value">{markLabel(m)}</span>
                            {m.progressPercent != null ? ` (${m.progressPercent}%)` : ""}
                          </li>
                        ))
                      )}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="gidi-report-closure gidi-report-avoid-break">
        <h2 className="gidi-report-section-title">Cierre del periodo</h2>
        <div className="gidi-report-text-block">
          <h3>Observaciones generales</h3>
          <p>{followUp.generalNotes?.trim() || "Sin observaciones registradas."}</p>
        </div>
        <div className="gidi-report-text-block">
          <h3>Trabajo en casa</h3>
          <p>{followUp.homeWork?.trim() || "Sin tareas registradas."}</p>
        </div>
      </section>

      <footer className="gidi-report-signature gidi-report-avoid-break">
        <div className="gidi-report-signature-line" />
        <p className="gidi-report-signature-name">{followUp.therapist.fullName}</p>
        <p className="gidi-report-signature-role">Terapeuta titular · {followUp.area.name}</p>
        <p className="gidi-report-signature-legal">
          Documento generado por GiDi con fines de seguimiento clínico. Uso confidencial conforme a la normativa
          aplicable en protección de datos de salud.
        </p>
      </footer>
    </div>
  );
}
