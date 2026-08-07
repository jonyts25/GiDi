"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../../../lib/api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PatientDocumentsPanel } from "@/components/patients/PatientDocumentsPanel";
import { AdminPaymentsPanel } from "@/components/payments/AdminPaymentsPanel";
import { SaveBanner } from "@/components/ui/SaveBanner";
import { useToast } from "@/components/ui/Toast";
import { hasOfficeStaffRole } from "@/lib/role-permissions";
import { USERNAME_LABEL } from "@/lib/user-labels";
import { GIDI_CENTER_OPTIONS, type GidiCenterKey } from "@/lib/centers";

type MiniUser = { id: string; fullName: string; email: string; status: "ACTIVE" | "INACTIVE" };

type FullPatient = {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    birthDate?: string | null;
    notes?: string | null;
    center?: GidiCenterKey;
    lastRevaluationDate?: string | null;
    revaluationAlertSnoozedUntil?: string | null;
    revaluationSkipReason?: string | null;
  };
  guardians: {
    parentId: string;
    fullName: string;
    email: string;
    phone?: string | null;
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
  const { showToast } = useToast();

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
  const [birthDate, setBirthDate] = useState("");
  const [notes, setNotes] = useState("");
  const [center, setCenter] = useState<GidiCenterKey>("SAN_AGUSTIN");
  const [lastRevaluationDate, setLastRevaluationDate] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [skipReason, setSkipReason] = useState("");

  // add guardian form
  const [guardianMode, setGuardianMode] = useState<"existing" | "new">("existing");
  const [gFullName, setGFullName] = useState("");
  const [gEmail, setGEmail] = useState("");
  const [gPhone, setGPhone] = useState("");
  const [gRel, setGRel] = useState<"MOTHER" | "FATHER" | "TUTOR" | "OTHER">("OTHER");
  const [gPrimary, setGPrimary] = useState(false);
  const [gNotes, setGNotes] = useState("");
  const [guardianPasswordMsg, setGuardianPasswordMsg] = useState("");

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
    if (!hasOfficeStaffRole(roles)) return router.replace("/dashboard");

    (async () => {
      try {
        setMsg("");
        const [full, therapists, schools, parents] = await Promise.all([
          apiFetch(`/admin/patients/${id}`),
          apiFetch(`/admin/users/role/THERAPIST?status=ACTIVE`),
          apiFetch(`/admin/users/role/SCHOOL?status=ACTIVE`),
          apiFetch(`/admin/users/role/PARENT?status=ACTIVE`),
        ]);

        setData(full);

        setFirstName(full.patient.firstName ?? "");
        setLastName(full.patient.lastName ?? "");
        setBirthDate(full.patient.birthDate ? String(full.patient.birthDate).slice(0, 10) : "");
        setNotes(full.patient.notes ?? "");
        setCenter(full.patient.center ?? "SAN_AGUSTIN");
        setLastRevaluationDate(
          full.patient.lastRevaluationDate ? String(full.patient.lastRevaluationDate).slice(0, 10) : "",
        );
        const lastRev = full.patient.lastRevaluationDate ? String(full.patient.lastRevaluationDate).slice(0, 10) : "";
        const snoozed = full.patient.revaluationAlertSnoozedUntil
          ? String(full.patient.revaluationAlertSnoozedUntil).slice(0, 10)
          : "";
        if (snoozed) {
          setReminderDate(snoozed);
        } else if (lastRev) {
          const d = new Date(lastRev);
          d.setMonth(d.getMonth() + 6);
          setReminderDate(d.toISOString().slice(0, 10));
        } else {
          setReminderDate("");
        }
        setSkipReason(full.patient.revaluationSkipReason ?? "");

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
      apiFetch(`/admin/users/role/PARENT?status=ACTIVE`),
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
        body: JSON.stringify({
          firstName,
          lastName,
          ...(birthDate ? { birthDate: new Date(birthDate).toISOString() } : {}),
          notes,
          center,
        }),
      });
      await reload();
      setMsg("✅ Paciente guardado");
      showToast("✅ Paciente guardado");
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function onSaveRevaluation() {
    setMsg("");
    try {
      await apiFetch(`/admin/patients/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          lastRevaluationDate: lastRevaluationDate ? new Date(lastRevaluationDate).toISOString() : null,
        }),
      });
      if (reminderDate) {
        await apiFetch(`/admin/patients/${id}/revaluation/snooze`, {
          method: "POST",
          body: JSON.stringify({ until: new Date(reminderDate).toISOString() }),
        });
      }
      await reload();
      setMsg("✅ Revaloración guardada");
      showToast("✅ Revaloración guardada");
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function onSnoozeRevaluation(months: 6 | 12) {
    setMsg("");
    try {
      const until = new Date();
      until.setMonth(until.getMonth() + months);
      const untilStr = until.toISOString().slice(0, 10);
      setReminderDate(untilStr);
      await apiFetch(`/admin/patients/${id}/revaluation/snooze`, {
        method: "POST",
        body: JSON.stringify({ months }),
      });
      await reload();
      setMsg(`✅ Recordatorio pospuesto ${months} meses`);
      showToast(`✅ Recordatorio pospuesto ${months} meses`);
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function onSkipRevaluation() {
    if (!skipReason.trim()) {
      setMsg("Indique el motivo para omitir la alerta");
      return;
    }
    setMsg("");
    try {
      await apiFetch(`/admin/patients/${id}/revaluation/skip`, {
        method: "POST",
        body: JSON.stringify({ reason: skipReason.trim() }),
      });
      await reload();
      setMsg("✅ Alerta omitida");
      showToast("✅ Alerta de revaloración omitida");
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
    setGuardianPasswordMsg("");
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
        setGuardianPasswordMsg(`Password generado: ${resp.generatedPassword}`);
        setMsg("✅ Padre vinculado (contraseña abajo, junto a papás)");
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
    setGuardianPasswordMsg("");

    try {
      const resp = await apiFetch(`/admin/patients/${id}/guardians`, {
        method: "POST",
        body: JSON.stringify({
          fullName: gFullName,
          email: gEmail,
          phone: gPhone.trim() || undefined,
          relationship: gRel,
          isPrimary: gPrimary,
          notes: gNotes || undefined,
        }),
      });

      if (resp?.generatedPassword) {
        setGuardianPasswordMsg(`Password generado: ${resp.generatedPassword}`);
        setMsg("✅ Padre agregado (contraseña abajo, junto a papás)");
      } else {
        setMsg("✅ Padre agregado");
      }

      setGFullName("");
      setGEmail("");
      setGPhone("");
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

  async function onDischarge(type: "COMPLETED" | "DROPPED") {
    const label = type === "COMPLETED" ? "alta (terminó su proceso)" : "baja (abandono)";
    const reason = window.prompt(`Motivo de ${label} (opcional):`);
    if (reason === null) return;
    setMsg("");
    try {
      await apiFetch(`/admin/patients/${id}/discharge`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() || undefined, type }),
      });
      router.push(type === "COMPLETED" ? "/admin/patients/altas" : "/admin/patients/discharged");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error al inactivar paciente");
    }
  }

  async function onDeletePatient() {
    const fullName = `${data?.patient.firstName ?? ""} ${data?.patient.lastName ?? ""}`.trim();
    if (
      !confirm(
        `¿BORRAR permanentemente a «${fullName}»?\n\nSe eliminarán seguimientos, documentos, pagos y vínculos. No se puede deshacer.`,
      )
    ) {
      return;
    }
    const typed = window.prompt(`Para confirmar, escriba el nombre completo del paciente:\n${fullName}`);
    if (typed === null) return;
    if (typed.trim().toLowerCase() !== fullName.toLowerCase()) {
      setMsg("El nombre no coincide. No se borró el paciente.");
      return;
    }
    setMsg("");
    try {
      await apiFetch(`/admin/patients/${id}`, { method: "DELETE" });
      router.push("/admin/patients");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error al borrar paciente");
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
            <span className="font-medium">Fecha de nacimiento</span>
            <input className="input" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Centro GiDi</span>
            <select className="select" value={center} onChange={(e) => setCenter(e.target.value as GidiCenterKey)}>
              {GIDI_CENTER_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
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

      <section className="card mt-6 space-y-4 border-l-4 border-l-accent-yellow">
        <h2 className="text-lg font-semibold">Revaloración clínica</h2>
        <p className="text-sm text-subtle">
          Registre la fecha de la última revaloración o evaluación. Por defecto el recordatorio se programa a 6 meses,
          pero puede ajustarlo según la familia.
        </p>
        <label className="grid max-w-xs gap-1 text-sm">
          <span className="font-medium">Última revaloración o evaluación</span>
          <input
            className="input"
            type="date"
            value={lastRevaluationDate}
            onChange={(e) => {
              const val = e.target.value;
              setLastRevaluationDate(val);
              if (val) {
                const d = new Date(val);
                d.setMonth(d.getMonth() + 6);
                setReminderDate(d.toISOString().slice(0, 10));
              }
            }}
          />
        </label>
        <label className="grid max-w-xs gap-1 text-sm">
          <span className="font-medium">Próximo recordatorio</span>
          <input
            className="input"
            type="date"
            value={reminderDate}
            onChange={(e) => setReminderDate(e.target.value)}
          />
          <span className="text-xs text-subtle">Por defecto: 6 meses después de la última revaloración.</span>
        </label>
        <button
          type="button"
          className="btn-primary w-fit rounded-xl px-5 py-2.5 text-sm font-semibold"
          onClick={() => void onSaveRevaluation()}
        >
          Guardar revaloración
        </button>
        {data.patient.revaluationAlertSnoozedUntil ? (
          <p className="text-sm text-subtle">
            Alerta pospuesta hasta:{" "}
            {new Date(data.patient.revaluationAlertSnoozedUntil).toLocaleDateString("es-MX", { dateStyle: "long" })}
          </p>
        ) : null}
        {data.patient.revaluationSkipReason ? (
          <p className="text-sm text-subtle">Motivo de omisión: {data.patient.revaluationSkipReason}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn rounded-xl px-3 py-2 text-sm" onClick={() => void onSnoozeRevaluation(6)}>
            Recordarme en 6 meses
          </button>
          <button type="button" className="btn rounded-xl px-3 py-2 text-sm" onClick={() => void onSnoozeRevaluation(12)}>
            Posponer 12 meses
          </button>
        </div>
        <div className="grid max-w-lg gap-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Omitir alerta (motivo)</span>
            <textarea
              className="textarea"
              rows={2}
              placeholder="Ej. Los papás no desean revalorar por ahora"
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
            />
          </label>
          <button type="button" className="btn w-fit rounded-xl px-3 py-2 text-sm" onClick={() => void onSkipRevaluation()}>
            Omitir alerta con motivo
          </button>
        </div>
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
                    {g.phone ? (
                      <>
                        <br />
                        <span className="text-subtle">Tel: {g.phone}</span>
                      </>
                    ) : null}
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
                <span className="font-medium">{USERNAME_LABEL}</span>
                <input className="input" type="email" value={gEmail} onChange={(e) => setGEmail(e.target.value)} required />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium">Teléfono</span>
                <input className="input" type="tel" value={gPhone} onChange={(e) => setGPhone(e.target.value)} placeholder="Para contactarlo" />
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

          {guardianPasswordMsg ? (
            <div
              className="mt-4 rounded-xl border border-border px-3 py-3 text-sm"
              style={{ background: "var(--surface-elevated, #f7f7f7)" }}
            >
              <strong>Contraseña del papá/tutor</strong>
              <p className="mt-1 text-subtle">Cópiala ahora; se muestra solo una vez.</p>
              <code style={{ fontSize: 15, fontWeight: 700 }}>{guardianPasswordMsg.replace(/^Password generado:\s*/, "")}</code>
              <button
                type="button"
                className="btn ml-2 rounded-lg px-3 py-1 text-xs"
                onClick={() =>
                  void navigator.clipboard.writeText(guardianPasswordMsg.replace(/^Password generado:\s*/, ""))
                }
              >
                Copiar
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="card mt-6 space-y-3 border-l-4 border-l-warning">
        <h2 className="text-lg font-semibold">Alta / Baja</h2>
        <p className="text-sm text-subtle">
          Desvincula al paciente de sus terapeutas y lo mueve a la lista correspondiente. Papás, escuela e historial se conservan.
          Deja de contar en ingresos desde el mes de alta/baja en adelante.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn rounded-xl px-4 py-2 text-sm text-success" onClick={() => void onDischarge("COMPLETED")}>
            Dar de alta (terminó)
          </button>
          <button type="button" className="btn rounded-xl px-4 py-2 text-sm text-danger" onClick={() => void onDischarge("DROPPED")}>
            Dar de baja (abandono)
          </button>
        </div>
      </section>

      <section className="card mt-6 space-y-3 border-l-4 border-l-danger">
        <h2 className="text-lg font-semibold">Borrar paciente</h2>
        <p className="text-sm text-subtle">
          Eliminación permanente (útil para duplicados creados por error). Borra seguimientos, documentos, pagos y vínculos.
          Solo administrador o secretaria.
        </p>
        <button type="button" className="btn rounded-xl px-4 py-2 text-sm font-semibold text-danger" onClick={() => void onDeletePatient()}>
          Borrar paciente definitivamente
        </button>
      </section>

      <div className="mt-6">
        <AdminPaymentsPanel patientId={id} />
      </div>

      <PatientDocumentsPanel patientId={id} />
    </main>
  );
}
