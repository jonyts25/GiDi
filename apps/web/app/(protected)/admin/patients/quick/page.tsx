"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../../../lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { hasOfficeStaffRole } from "@/lib/role-permissions";
import { prepareFileForUpload } from "@/lib/compress-upload";
import { GIDI_CENTER_OPTIONS, type GidiCenterKey } from "@/lib/centers";
import { FilePickerButton, MultiFilePickerButton } from "@/components/ui/FilePickerButton";

type DocCategory = "EVALUACION" | "REVALUACION";
type UserLite = { id: string; fullName: string; email: string; status: string };

export default function AdminQuickPatientPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [notes, setNotes] = useState("");
  const [center, setCenter] = useState<GidiCenterKey>("SAN_AGUSTIN");
  const [therapistId, setTherapistId] = useState("");
  const [therapists, setTherapists] = useState<UserLite[]>([]);
  const [docEval, setDocEval] = useState<File | null>(null);
  const [docRevals, setDocRevals] = useState<File[]>([]);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const canSave = useMemo(
    () => Boolean(firstName.trim() && lastName.trim() && birthDate),
    [firstName, lastName, birthDate],
  );

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");
    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!hasOfficeStaffRole(roles)) return router.replace("/dashboard");

    (async () => {
      try {
        const t = await apiFetch("/users/therapists");
        setTherapists(t);
      } catch (e: unknown) {
        setMsg(e instanceof Error ? e.message : "Error");
      }
    })();
  }, [router]);

  async function uploadDoc(patientId: string, category: DocCategory, file: File) {
    const prepared = await prepareFileForUpload(file);
    await apiFetch(`/patients/${patientId}/documents`, {
      method: "POST",
      body: JSON.stringify({
        category,
        fileName: prepared.fileName,
        mimeType: prepared.mimeType,
        dataUrl: prepared.dataUrl,
      }),
    });
  }

  async function onSave() {
    if (!canSave || saving || createdId) return;
    const full = `${firstName.trim()} ${lastName.trim()}`;
    if (!window.confirm(`¿Confirmar registro rápido de «${full}»?`)) return;

    setSaving(true);
    setMsg("Guardando…");
    try {
      const res = await apiFetch("/patients", {
        method: "POST",
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          birthDate: new Date(birthDate).toISOString(),
          notes: notes.trim() || undefined,
          center,
          therapistIds: therapistId ? [therapistId] : undefined,
        }),
      });
      const patientId = res?.patient?.id as string | undefined;
      if (!patientId) throw new Error("No se recibió el ID del paciente");

      if (docEval) await uploadDoc(patientId, "EVALUACION", docEval);
      for (const f of docRevals) await uploadDoc(patientId, "REVALUACION", f);

      setCreatedId(patientId);
      setMsg("✅ Paciente creado (registro rápido)");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ paddingTop: 18 }}>
      <div className="card">
        <div className="h1">Nuevo paciente, registro rápido</div>
        <p className="sub">
          Solo lo esencial: nombre, fecha de nacimiento, centro, terapeuta y documentos iniciales.
          Obligatorios: nombre completo y fecha de nacimiento.
        </p>
        {msg ? <p className="sub">{msg}</p> : null}
      </div>

      <section className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Datos</h3>
        <div className="row">
          <input
            className="input"
            placeholder="Nombre *"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={!!createdId}
          />
          <input
            className="input"
            placeholder="Apellido *"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={!!createdId}
          />
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <label className="grid gap-1 text-sm" style={{ flex: 1 }}>
            <span className="text-subtle">Fecha de nacimiento *</span>
            <input
              className="input"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              disabled={!!createdId}
              required
            />
          </label>
          <label className="grid gap-1 text-sm" style={{ flex: 1 }}>
            <span className="text-subtle">Centro GiDi</span>
            <select
              className="select"
              value={center}
              onChange={(e) => setCenter(e.target.value as GidiCenterKey)}
              disabled={!!createdId}
            >
              {GIDI_CENTER_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ marginTop: 10 }}>
          <input
            className="input"
            placeholder="Notas (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!!createdId}
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <label className="grid gap-1 text-sm">
            <span className="text-subtle">Terapeuta</span>
            <select
              className="select"
              value={therapistId}
              onChange={(e) => setTherapistId(e.target.value)}
              disabled={!!createdId}
            >
              <option value="">— Sin asignar —</option>
              {therapists.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName} ({t.email})
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Documentos iniciales</h3>
        <div className="grid gap-4">
          <FilePickerButton label="Evaluación" file={docEval} onPick={setDocEval} />
          <MultiFilePickerButton label="Revaloración (puedes subir varios)" files={docRevals} onPick={setDocRevals} />
        </div>
      </section>

      <section className="card" style={{ marginTop: 12 }}>
        {!createdId ? (
          <button className="btn" disabled={!canSave || saving} onClick={() => void onSave()}>
            {saving ? "Guardando…" : "Guardar registro rápido"}
          </button>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <span className="sub">✅ Guardado. Puedes ir a la ficha del paciente.</span>
            <Link className="btn" href={`/admin/patients/${createdId}`}>
              Abrir ficha del paciente
            </Link>
            <Link className="btn" href="/admin/patients">
              Volver al listado
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
