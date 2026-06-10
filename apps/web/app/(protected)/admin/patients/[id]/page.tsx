"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../../../lib/api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PatientDocumentsPanel } from "@/components/patients/PatientDocumentsPanel";
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
      <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, marginTop: 18 }}>
        <h2>Terapeuta asignado</h2>
        <p className="sub" style={{ marginTop: 4 }}>
          Solo un terapeuta por paciente. Asignar uno nuevo reemplaza al anterior.
        </p>

        <ul style={{ paddingLeft: 18 }}>
          {data.therapists.length === 0 && <li>No hay terapeuta asignado</li>}
          {data.therapists.map((t) => (
            <li key={t.therapistId} style={{ marginBottom: 6 }}>
              {t.fullName} ({t.email}){" "}
              <button onClick={() => onUnassignTherapist(t.therapistId)}>Quitar</button>
            </li>
          ))}
        </ul>

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
          <select value={pickedTherapist} onChange={(e) => setPickedTherapist(e.target.value)}>
            <option value="">{data.therapists.length ? "— Cambiar terapeuta —" : "— Asignar terapeuta —"}</option>
            {allTherapists.map((t) => (
              <option key={t.id} value={t.id} disabled={assignedTherapistIds.has(t.id)}>
                {t.fullName} ({t.email})
              </option>
            ))}
          </select>
          <button onClick={onAssignTherapist} disabled={!pickedTherapist}>
            {data.therapists.length ? "Cambiar" : "Asignar"}
          </button>
        </div>
      </section>

      {/* -------- escuela -------- */}
      <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, marginTop: 18 }}>
        <h2>Escuela</h2>

        <p style={{ marginTop: 6, opacity: 0.85 }}>
          Actual: {data.school ? `${data.school.fullName} (${data.school.email})` : "— sin escuela —"}
        </p>

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
          <select value={pickedSchool} onChange={(e) => setPickedSchool(e.target.value)}>
            <option value="">— Sin escuela —</option>
            {allSchools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} ({s.email})
              </option>
            ))}
          </select>

          <button onClick={onSetSchool}>Guardar escuela</button>
        </div>
      </section>

      {/* -------- padres -------- */}
      <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, marginTop: 18 }}>
        <h2>Padres / Tutores</h2>

        {data.guardians.length === 0 ? (
          <p>No hay padres/tutores asignados.</p>
        ) : (
          <ul style={{ paddingLeft: 18 }}>
            {data.guardians.map((g) => (
              <li key={g.parentId} style={{ marginBottom: 10 }}>
                <div>
                  <b>{g.fullName}</b> ({g.email}) — {g.relationship}{" "}
                  {g.isPrimary ? <b>· PRIMARY</b> : null}
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
                  <select
                    value={g.relationship}
                    onChange={(e) => onSetGuardianMeta(g.parentId, { relationship: e.target.value })}
                  >
                    <option value="MOTHER">MOTHER</option>
                    <option value="FATHER">FATHER</option>
                    <option value="TUTOR">TUTOR</option>
                    <option value="OTHER">OTHER</option>
                  </select>

                  <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={g.isPrimary}
                      onChange={(e) => onSetGuardianMeta(g.parentId, { isPrimary: e.target.checked })}
                    />
                    Primary
                  </label>

                  <button onClick={() => onRemoveGuardian(g.parentId)}>Quitar del paciente</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <hr style={{ margin: "14px 0" }} />

        <h3>Agregar padre/tutor</h3>
        <p style={{ opacity: 0.85, fontSize: 14, marginTop: 6 }}>
          Vincula un usuario que ya es padre/tutor en el sistema, o crea uno nuevo con email.
        </p>

        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setGuardianMode("existing")}
            style={{
              padding: "8px 12px",
              fontWeight: guardianMode === "existing" ? 800 : 400,
              opacity: guardianMode === "existing" ? 1 : 0.75,
            }}
          >
            Elegir de la lista
          </button>
          <button
            type="button"
            onClick={() => setGuardianMode("new")}
            style={{
              padding: "8px 12px",
              fontWeight: guardianMode === "new" ? 800 : 400,
              opacity: guardianMode === "new" ? 1 : 0.75,
            }}
          >
            Registrar nuevo
          </button>
        </div>

        {guardianMode === "existing" ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10, maxWidth: 640 }}>
            <label>Padre / tutor</label>
            <select value={pickedParentId} onChange={(e) => setPickedParentId(e.target.value)}>
              <option value="">— Seleccionar —</option>
              {allParents.map((p) => (
                <option key={p.id} value={p.id} disabled={assignedParentIds.has(p.id)}>
                  {p.fullName} ({p.email})
                </option>
              ))}
            </select>

            <label>Relación</label>
            <select value={gRel} onChange={(e) => setGRel(e.target.value as any)}>
              <option value="MOTHER">MOTHER</option>
              <option value="FATHER">FATHER</option>
              <option value="TUTOR">TUTOR</option>
              <option value="OTHER">OTHER</option>
            </select>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={gPrimary} onChange={(e) => setGPrimary(e.target.checked)} />
              Marcar como Primary
            </label>

            <label>Notas (opcional)</label>
            <input value={gNotes} onChange={(e) => setGNotes(e.target.value)} />

            <button type="button" onClick={() => void onLinkExistingGuardian()}>
              Asignar a este paciente
            </button>
          </div>
        ) : (
          <form onSubmit={onAddGuardian} style={{ display: "grid", gap: 10, maxWidth: 520, marginTop: 14 }}>
            <label>Nombre completo</label>
            <input value={gFullName} onChange={(e) => setGFullName(e.target.value)} required />

            <label>Email</label>
            <input value={gEmail} onChange={(e) => setGEmail(e.target.value)} required />

            <label>Relación</label>
            <select value={gRel} onChange={(e) => setGRel(e.target.value as any)}>
              <option value="MOTHER">MOTHER</option>
              <option value="FATHER">FATHER</option>
              <option value="TUTOR">TUTOR</option>
              <option value="OTHER">OTHER</option>
            </select>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={gPrimary} onChange={(e) => setGPrimary(e.target.checked)} />
              Marcar como Primary
            </label>

            <label>Notas (opcional)</label>
            <input value={gNotes} onChange={(e) => setGNotes(e.target.value)} />

            <button type="submit">Crear y asignar</button>
          </form>
        )}
      </section>

      <PatientDocumentsPanel patientId={id} />
    </main>
  );
}
