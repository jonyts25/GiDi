"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../../../lib/api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PatientDocumentsPanel } from "@/components/patients/PatientDocumentsPanel";
import { AdminPaymentsPanel } from "@/components/payments/AdminPaymentsPanel";
import { SaveBanner } from "@/components/ui/SaveBanner";

type MiniUser = { id: string; fullName: string; email: string; status: "ACTIVE" | "INACTIVE" };

type FullPatient = {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    birthDate?: string | null;
    notes?: string | null;
    center?: "SAN_AGUSTIN" | "VALLARTA";
  };
  guardians: {
    parentId: string;
    fullName: string;
    email: string;
    status: "ACTIVE" | "INACTIVE";
    relationship: "MOTHER" | "FATHER" | "TUTOR" | "OTHER";
    isPrimary: boolean;
    notes?: string | null;
  }[];
  therapists: {
    therapistId: string;
    fullName: string;
    email: string;
    status: "ACTIVE" | "INACTIVE";
  }[];
  school: null | {
    schoolId: string;
    fullName: string;
    email: string;
    status: "ACTIVE" | "INACTIVE";
    notes?: string | null;
  };
};

export default function AdminPatientDetail() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [data, setData] = useState<FullPatient | null>(null);

  const [allTherapists, setAllTherapists] = useState<MiniUser[]>([]);
  const [allSchools, setAllSchools] = useState<MiniUser[]>([]);
  const [allParents, setAllParents] = useState<MiniUser[]>([]);

  const [pickedTherapist, setPickedTherapist] = useState("");
  const [pickedSchool, setPickedSchool] = useState("");
  const [pickedParentId, setPickedParentId] = useState("");

  const [msg, setMsg] = useState("");

  // patient edit fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [notes, setNotes] = useState("");
  const [center, setCenter] = useState<"SAN_AGUSTIN" | "VALLARTA">("SAN_AGUSTIN");

  // add guardian form
  const [guardianMode, setGuardianMode] = useState<"existing" | "new">("existing");
  const [gFullName, setGFullName] = useState("");
  const [gEmail, setGEmail] = useState("");
  const [gRel, setGRel] = useState<"MOTHER" | "FATHER" | "TUTOR" | "OTHER">("OTHER");
  const [gPrimary, setGPrimary] = useState(false);
  const [gNotes, setGNotes] = useState("");

  const assignedTherapistIds = useMemo(
    () => new Set((data?.therapists ?? []).map((t) => t.therapistId)),
    [data]
  );

  const assignedParentIds = useMemo(
    () => new Set((data?.guardians ?? []).map((g) => g.parentId)),
    [data]
  );

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!roles.includes("ADMIN")) return router.replace("/dashboard");

    (async () => {
      try {
        setMsg("");
        const [full, therapists, schools, parents] = await Promise.all([
          apiFetch(`/admin/patients/${id}`),
          apiFetch(`/admin/users/role/THERAPIST`),
          apiFetch(`/admin/users/role/SCHOOL`),
          apiFetch(`/admin/users/role/PARENT`),
        ]);

        setData(full);

        setFirstName(full.patient.firstName ?? "");
        setLastName(full.patient.lastName ?? "");
        setNotes(full.patient.notes ?? "");
        setCenter(full.patient.center ?? "SAN_AGUSTIN");

        setAllTherapists(therapists);
        setAllSchools(schools);
        setAllParents(parents);

        setPickedSchool(full.school?.schoolId ?? "");
      } catch (e: any) {
        setMsg(e.message);
      }
    })();
  }, [id, router]);

  async function reload() {
    const [full, parents] = await Promise.all([
      apiFetch(`/admin/patients/${id}`),
      apiFetch(`/admin/users/role/PARENT`),
    ]);
    setData(full);
    setAllParents(parents);
    setPickedSchool(full.school?.schoolId ?? "");
  }

  async function onSavePatient(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await apiFetch(`/admin/patients/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ firstName, lastName, notes, center }),
      });
      await reload();
      setMsg("✅ Paciente guardado");
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function onAssignTherapist() {
    setMsg("");
    if (!pickedTherapist) return;

    try {
      await apiFetch(`/admin/patients/${id}/therapists`, {
        method: "POST",
        body: JSON.stringify({ therapistId: pickedTherapist }),
      });
      setPickedTherapist("");
      await reload();
      setMsg("✅ Terapeuta asignado");
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function onUnassignTherapist(therapistId: string) {
    setMsg("");
    try {
      await apiFetch(`/admin/patients/${id}/therapists/${therapistId}`, { method: "DELETE" });
      await reload();
      setMsg("✅ Terapeuta removido");
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function onSetSchool() {
    setMsg("");
    try {
      if (!pickedSchool) {
        await apiFetch(`/admin/patients/${id}/school`, { method: "DELETE" });
        await reload();
        setMsg("✅ Escuela removida");
        return;
      }

      await apiFetch(`/admin/patients/${id}/school`, {
        method: "PUT",
        body: JSON.stringify({ schoolId: pickedSchool }),
      });
      await reload();
      setMsg("✅ Escuela asignada");
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function onLinkExistingGuardian() {
    setMsg("");
    if (!pickedParentId) {
      setMsg("Elige un padre/tutor de la lista.");
      return;
    }
    if (assignedParentIds.has(pickedParentId)) {
      setMsg("Ese tutor ya está asignado a este paciente.");
      return;
    }

    try {
      const resp = await apiFetch(`/admin/patients/${id}/guardians`, {
        method: "POST",
        body: JSON.stringify({
          parentId: pickedParentId,
          relationship: gRel,
          isPrimary: gPrimary,
          notes: gNotes || undefined,
        }),
      });

      if (resp?.generatedPassword) {
        setMsg(`✅ Padre vinculado. Password generado: ${resp.generatedPassword}`);
      } else {
        setMsg("✅ Padre vinculado");
      }

      setPickedParentId("");
      setGRel("OTHER");
      setGPrimary(false);
      setGNotes("");

      await reload();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function onAddGuardian(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    try {
      const resp = await apiFetch(`/admin/patients/${id}/guardians`, {
        method: "POST",
        body: JSON.stringify({
          fullName: gFullName,
          email: gEmail,
          relationship: gRel,
          isPrimary: gPrimary,
          notes: gNotes || undefined,
        }),
      });

      if (resp?.generatedPassword) {
        setMsg(`✅ Padre agregado. Password generado: ${resp.generatedPassword}`);
      } else {
        setMsg("✅ Padre agregado");
      }

      setGFullName("");
      setGEmail("");
      setGRel("OTHER");
      setGPrimary(false);
      setGNotes("");

      await reload();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function onSetGuardianMeta(parentId: string, patch: any) {
    setMsg("");
    try {
      await apiFetch(`/admin/patients/${id}/guardians/${parentId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      await reload();
      setMsg("✅ Padre actualizado");
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function onRemoveGuardian(parentId: string) {
    setMsg("");
    try {
      await apiFetch(`/admin/patients/${id}/guardians/${parentId}`, { method: "DELETE" });
      await reload();
      setMsg("✅ Padre removido del paciente");
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  if (!data) return <p style={{ padding: 20 }}>Cargando...</p>;

  return (
    <main style={{ maxWidth: 980, margin: "30px auto", fontFamily: "sans-serif", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <button onClick={() => router.back()}>← Volver</button>
        <Link className="btn" href={`/admin/patients/${id}/followups`}>Seguimientos mensuales →</Link>
        <Link className="btn" href={`/admin/patients/${id}/dossier`}>Expediente integral →</Link>

      </div>

      <h1 style={{ marginTop: 12 }}>
        {data.patient.firstName} {data.patient.lastName}
      </h1>

      <section className="card mt-6 space-y-4 border-l-4 border-l-primary">
        <h2 className="text-lg font-semibold">Datos del paciente</h2>
        <p className="text-sm text-subtle">Edite los campos y pulse Guardar para aplicar los cambios.</p>

        <form onSubmit={onSavePatient} className="grid max-w-lg gap-4">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Nombre</span>
            <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Apellido</span>
            <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Centro GiDi</span>
            <select className="select" value={center} onChange={(e) => setCenter(e.target.value as "SAN_AGUSTIN" | "VALLARTA")}>
              <option value="SAN_AGUSTIN">San Agustín</option>
              <option value="VALLARTA">Vallarta</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Notas</span>
            <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </label>
          <button type="submit" className="btn-primary w-fit rounded-xl px-5 py-2.5 text-sm font-semibold">
            Guardar paciente
          </button>
        </form>
      </section>

      <SaveBanner message={msg} type={msg.includes("✅") ? "success" : "error"} />

      {/* -------- terapeutas -------- */}
      <section className="card mt-6 space-y-4 border-l-4 border-l-success">
        <div>
          <h2 className="text-lg font-semibold">Terapeuta asignado</h2>
          <p className="text-sm text-subtle">
            Solo un terapeuta por paciente. Asignar uno nuevo reemplaza al anterior.
          </p>
        </div>

        {data.therapists.length === 0 ? (
          <p className="text-sm text-subtle">No hay terapeuta asignado.</p>
        ) : (
          <ul className="space-y-2">
            {data.therapists.map((t) => (
              <li key={t.therapistId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <span>
                  <strong>{t.fullName}</strong> · <span className="text-subtle">{t.email}</span>
                </span>
                <button type="button" className="btn rounded-lg px-3 py-1.5 text-xs" onClick={() => onUnassignTherapist(t.therapistId)}>
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-3">
          <select className="select max-w-md flex-1" value={pickedTherapist} onChange={(e) => setPickedTherapist(e.target.value)}>
            <option value="">{data.therapists.length ? "— Cambiar terapeuta —" : "— Asignar terapeuta —"}</option>
            {allTherapists.map((t) => (
              <option key={t.id} value={t.id} disabled={assignedTherapistIds.has(t.id)}>
                {t.fullName} ({t.email})
              </option>
            ))}
          </select>
          <button type="button" className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold" onClick={onAssignTherapist} disabled={!pickedTherapist}>
            {data.therapists.length ? "Cambiar" : "Asignar"}
          </button>
        </div>
      </section>

      {/* -------- escuela -------- */}
      <section className="card mt-6 space-y-4 border-l-4 border-l-warning">
        <h2 className="text-lg font-semibold">Escuela</h2>

        <p className="text-sm">
          Actual:{" "}
          {data.school ? (
            <>
              <strong>{data.school.fullName}</strong> · <span className="text-subtle">{data.school.email}</span>
            </>
          ) : (
            <span className="text-subtle">Sin escuela asignada</span>
          )}
        </p>

        <div className="flex flex-wrap gap-3">
          <select className="select max-w-md flex-1" value={pickedSchool} onChange={(e) => setPickedSchool(e.target.value)}>
            <option value="">— Sin escuela —</option>
            {allSchools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} ({s.email})
              </option>
            ))}
          </select>
          <button type="button" className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold" onClick={onSetSchool}>
            Guardar escuela
          </button>
        </div>
      </section>

      {/* -------- padres -------- */}
      <section className="card mt-6 space-y-4 border-l-4 border-l-info">
        <h2 className="text-lg font-semibold">Padres / tutores</h2>

        {data.guardians.length === 0 ? (
          <p className="text-sm text-subtle">No hay padres o tutores asignados.</p>
        ) : (
          <ul className="space-y-3">
            {data.guardians.map((g) => (
              <li key={g.parentId} className="rounded-lg border border-border px-3 py-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <strong>{g.fullName}</strong> · <span className="text-subtle">{g.email}</span>
                    <br />
                    <span className="text-subtle">
                      {g.relationship}{g.isPrimary ? " · principal" : ""}
                    </span>
                  </div>
                  <button type="button" className="btn rounded-lg px-3 py-1.5 text-xs" onClick={() => onRemoveGuardian(g.parentId)}>
                    Quitar
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
                  <label className="grid gap-1 text-xs">
                    <span className="text-subtle">Relación</span>
                    <select
                      className="select"
                      value={g.relationship}
                      onChange={(e) => onSetGuardianMeta(g.parentId, { relationship: e.target.value })}
                    >
                      <option value="MOTHER">Madre</option>
                      <option value="FATHER">Padre</option>
                      <option value="TUTOR">Tutor</option>
                      <option value="OTHER">Otro</option>
                    </select>
                  </label>

                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={g.isPrimary}
                      onChange={(e) => onSetGuardianMeta(g.parentId, { isPrimary: e.target.checked })}
                    />
                    Principal
                  </label>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-border pt-4">
          <h3 className="font-semibold">Agregar padre o tutor</h3>
          <p className="mt-1 text-sm text-subtle">
            Vincula un usuario existente o crea uno nuevo con email.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={guardianMode === "existing" ? "btn-primary rounded-xl px-4 py-2 text-sm font-semibold" : "btn rounded-xl px-4 py-2 text-sm"}
              onClick={() => setGuardianMode("existing")}
            >
              Elegir de la lista
            </button>
            <button
              type="button"
              className={guardianMode === "new" ? "btn-primary rounded-xl px-4 py-2 text-sm font-semibold" : "btn rounded-xl px-4 py-2 text-sm"}
              onClick={() => setGuardianMode("new")}
            >
              Registrar nuevo
            </button>
          </div>

          {guardianMode === "existing" ? (
            <div className="mt-4 grid max-w-lg gap-3">
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Padre / tutor</span>
                <select className="select" value={pickedParentId} onChange={(e) => setPickedParentId(e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {allParents.map((p) => (
                    <option key={p.id} value={p.id} disabled={assignedParentIds.has(p.id)}>
                      {p.fullName} ({p.email})
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium">Relación</span>
                <select className="select" value={gRel} onChange={(e) => setGRel(e.target.value as any)}>
                  <option value="MOTHER">Madre</option>
                  <option value="FATHER">Padre</option>
                  <option value="TUTOR">Tutor</option>
                  <option value="OTHER">Otro</option>
                </select>
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={gPrimary} onChange={(e) => setGPrimary(e.target.checked)} />
                Marcar como principal
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium">Notas (opcional)</span>
                <input className="input" value={gNotes} onChange={(e) => setGNotes(e.target.value)} />
              </label>

              <button type="button" className="btn-primary w-fit rounded-xl px-4 py-2 text-sm font-semibold" onClick={() => void onLinkExistingGuardian()}>
                Asignar a este paciente
              </button>
            </div>
          ) : (
            <form onSubmit={onAddGuardian} className="mt-4 grid max-w-lg gap-3">
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Nombre completo</span>
                <input className="input" value={gFullName} onChange={(e) => setGFullName(e.target.value)} required />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium">Email</span>
                <input className="input" type="email" value={gEmail} onChange={(e) => setGEmail(e.target.value)} required />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium">Relación</span>
                <select className="select" value={gRel} onChange={(e) => setGRel(e.target.value as any)}>
                  <option value="MOTHER">Madre</option>
                  <option value="FATHER">Padre</option>
                  <option value="TUTOR">Tutor</option>
                  <option value="OTHER">Otro</option>
                </select>
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={gPrimary} onChange={(e) => setGPrimary(e.target.checked)} />
                Marcar como principal
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium">Notas (opcional)</span>
                <input className="input" value={gNotes} onChange={(e) => setGNotes(e.target.value)} />
              </label>

              <button type="submit" className="btn-primary w-fit rounded-xl px-4 py-2 text-sm font-semibold">
                Crear y asignar
              </button>
            </form>
          )}
        </div>
      </section>

      <div className="mt-6">
        <AdminPaymentsPanel patientId={id} />
      </div>

      <PatientDocumentsPanel patientId={id} />
    </main>
  );
}
