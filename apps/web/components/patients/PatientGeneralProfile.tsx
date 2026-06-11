"use client";

import Link from "next/link";
import { PatientDocumentsPanel } from "@/components/patients/PatientDocumentsPanel";

export type PatientProfileData = {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    birthDate?: string | null;
    notes?: string | null;
    center?: string;
  };
  guardians: {
    parentId: string;
    fullName: string;
    email: string;
    relationship: string;
    isPrimary: boolean;
  }[];
  school: { schoolId: string; fullName: string; email: string } | null;
  therapists: { therapistId: string; fullName: string; email: string }[];
};

const REL_LABELS: Record<string, string> = {
  MOTHER: "Madre",
  FATHER: "Padre",
  TUTOR: "Tutor",
  OTHER: "Otro",
};

function centerLabel(center?: string) {
  if (center === "VALLARTA") return "GiDi Vallarta";
  if (center === "SAN_AGUSTIN") return "GiDi San Agustín";
  return "—";
}

export function PatientGeneralProfile({
  profile,
  followUpsHref,
  followUpsLabel = "Ver seguimientos →",
  canUploadDocuments = false,
}: {
  profile: PatientProfileData;
  followUpsHref?: string;
  followUpsLabel?: string;
  canUploadDocuments?: boolean;
}) {
  const p = profile.patient;

  return (
    <div className="space-y-6">
      <section className="card border-l-4 border-l-primary">
        <h1 className="text-2xl font-bold">
          {p.firstName} {p.lastName}
        </h1>
        <p className="mt-1 text-sm text-subtle">Centro: {centerLabel(p.center)}</p>
        {p.birthDate ? (
          <p className="text-sm text-subtle">
            Nacimiento: {new Date(p.birthDate).toLocaleDateString("es-MX")}
          </p>
        ) : null}
        {p.notes ? <p className="mt-3 text-sm leading-relaxed text-subtle">{p.notes}</p> : null}
        {followUpsHref ? (
          <Link className="btn-primary mt-4 inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold" href={followUpsHref}>
            {followUpsLabel}
          </Link>
        ) : null}
      </section>

      <section className="card space-y-3 border-l-4 border-l-info">
        <h2 className="text-lg font-semibold">Padres / tutores</h2>
        {profile.guardians.length === 0 ? (
          <p className="text-sm text-subtle">Sin tutores registrados.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {profile.guardians.map((g) => (
              <li key={g.parentId} className="rounded-lg border border-border px-3 py-2">
                <strong>{g.fullName}</strong>
                {g.isPrimary ? " (principal)" : ""} · {REL_LABELS[g.relationship] ?? g.relationship}
                <br />
                <span className="text-subtle">{g.email}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card space-y-2 border-l-4 border-l-warning">
        <h2 className="text-lg font-semibold">Escuela</h2>
        {profile.school ? (
          <p className="text-sm">
            <strong>{profile.school.fullName}</strong>
            <br />
            <span className="text-subtle">{profile.school.email}</span>
          </p>
        ) : (
          <p className="text-sm text-subtle">Sin escuela asignada.</p>
        )}
      </section>

      <section className="card space-y-2 border-l-4 border-l-success">
        <h2 className="text-lg font-semibold">Terapeuta(s)</h2>
        {profile.therapists.length === 0 ? (
          <p className="text-sm text-subtle">Sin terapeuta asignado.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {profile.therapists.map((t) => (
              <li key={t.therapistId}>
                {t.fullName} · <span className="text-subtle">{t.email}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PatientDocumentsPanel patientId={p.id} canUpload={canUploadDocuments} />
    </div>
  );
}
