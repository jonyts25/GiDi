"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../../../lib/api";
import { useRouter } from "next/navigation";

type UserLite = { id: string; fullName: string; email: string; status: string };

type Rel = "MOTHER" | "FATHER" | "TUTOR" | "OTHER";

type GuardianRow =
  | {
      kind: "new";
      fullName: string;
      email: string;
      relationship: Rel;
      isPrimary: boolean;
      notes?: string;
    }
  | {
      kind: "existing";
      parentId: string;
      fullName: string;
      email: string;
      relationship: Rel;
      isPrimary: boolean;
      notes?: string;
    };

export default function AdminNewPatientPage() {
  const router = useRouter();

  // patient
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState(""); // yyyy-mm-dd
  const [notes, setNotes] = useState("");

  // guardians
  const [guardians, setGuardians] = useState<GuardianRow[]>([]);
  const [guardianMode, setGuardianMode] = useState<"existing" | "new">("existing");
  const [parents, setParents] = useState<UserLite[]>([]);
  const [pickedParentId, setPickedParentId] = useState("");
  const [gFullName, setGFullName] = useState("");
  const [gEmail, setGEmail] = useState("");
  const [gRel, setGRel] = useState<Rel>("MOTHER");
  const [gPrimary, setGPrimary] = useState(true);
  const [gNotes, setGNotes] = useState("");

  // therapists
  const [therapists, setTherapists] = useState<UserLite[]>([]);
  const [selectedTherapistIds, setSelectedTherapistIds] = useState<string[]>([]);

  // school
  const [schoolFullName, setSchoolFullName] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [schoolNotes, setSchoolNotes] = useState("");

  // result
  const [msg, setMsg] = useState<string>("");
  const [createdCreds, setCreatedCreds] = useState<
    Array<{ email: string; fullName: string; role: string; temporaryPassword: string }>
  >([]);

  const canSave = useMemo(() => firstName.trim() && lastName.trim(), [firstName, lastName]);

  const assignedParentKeySet = useMemo(() => {
    const s = new Set<string>();
    for (const g of guardians) {
      if (g.kind === "existing") s.add(g.parentId);
      else s.add(g.email.toLowerCase());
    }
    return s;
  }, [guardians]);

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!roles.includes("ADMIN")) return router.replace("/dashboard");

    (async () => {
      try {
        const [t, p] = await Promise.all([
          apiFetch("/users/therapists"),
          apiFetch("/admin/users/role/PARENT"),
        ]);
        setTherapists(t);
        setParents(p);
      } catch (e: any) {
        setMsg(e.message);
      }
    })();
  }, [router]);

  function addGuardianFromExisting() {
    if (!pickedParentId) {
      setMsg("Elige un padre/tutor de la lista.");
      return;
    }
    const row = parents.find((x) => x.id === pickedParentId);
    if (!row) {
      setMsg("Padre no encontrado en la lista.");
      return;
    }
    if (assignedParentKeySet.has(row.id)) {
      setMsg("Ese tutor ya está en la lista.");
      return;
    }
    const newG: GuardianRow = {
      kind: "existing",
      parentId: row.id,
      fullName: row.fullName,
      email: row.email,
      relationship: gRel,
      isPrimary: gPrimary,
      notes: gNotes.trim() ? gNotes.trim() : undefined,
    };
    setGuardians((prev) => [...prev, newG]);
    setPickedParentId("");
    setGRel("MOTHER");
    setGPrimary(false);
    setGNotes("");
    setMsg("");
  }

  function addGuardianNew() {
    if (!gFullName.trim() || !gEmail.trim()) {
      setMsg("Falta nombre y email del tutor/padre nuevo.");
      return;
    }
    const email = gEmail.trim().toLowerCase();
    if (assignedParentKeySet.has(email)) {
      setMsg("Ese email ya está en la lista de tutores.");
      return;
    }
    const newG: GuardianRow = {
      kind: "new",
      fullName: gFullName.trim(),
      email,
      relationship: gRel,
      isPrimary: gPrimary,
      notes: gNotes.trim() ? gNotes.trim() : undefined,
    };
    setGuardians((prev) => [...prev, newG]);
    setGFullName("");
    setGEmail("");
    setGRel("MOTHER");
    setGPrimary(false);
    setGNotes("");
    setMsg("");
  }

  function removeGuardian(idx: number) {
    setGuardians((prev) => prev.filter((_, i) => i !== idx));
  }

  function toggleTherapist(id: string) {
    setSelectedTherapistIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function onSave() {
    setMsg("Guardando...");
    setCreatedCreds([]);

    try {
      const guardiansPayload = guardians.map((g) =>
        g.kind === "existing"
          ? {
              existingParentId: g.parentId,
              relationship: g.relationship,
              isPrimary: g.isPrimary,
              notes: g.notes,
            }
          : {
              email: g.email,
              fullName: g.fullName,
              relationship: g.relationship,
              isPrimary: g.isPrimary,
              notes: g.notes,
            }
      );

      const payload: Record<string, unknown> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: birthDate ? new Date(birthDate).toISOString() : undefined,
        notes: notes.trim() || undefined,
        therapistIds: selectedTherapistIds.length ? selectedTherapistIds : undefined,
      };

      if (guardiansPayload.length) {
        payload.guardians = guardiansPayload;
      }

      const res = await apiFetch("/patients", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      setMsg("✅ Paciente creado");

      const fromList = Array.isArray(res?.parentCredentials) ? res.parentCredentials : [];
      const creds: Array<{ email: string; fullName: string; role: string; temporaryPassword: string }> =
        fromList.map((c: { email: string; fullName: string; temporaryPassword: string }) => ({
          role: "PARENT",
          fullName: c.fullName,
          email: c.email,
          temporaryPassword: c.temporaryPassword,
        }));

      if (!creds.length && res?.parentTempPassword && res?.parent?.email) {
        creds.push({
          role: "PARENT",
          fullName: res.parent.fullName,
          email: res.parent.email,
          temporaryPassword: res.parentTempPassword,
        });
      }

      setCreatedCreds(creds);
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  function copyCreds() {
    const text = createdCreds
      .map((c) => `${c.role} | ${c.fullName} | ${c.email} | PASS: ${c.temporaryPassword}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setMsg("✅ Credenciales copiadas al portapapeles");
  }

  return (
    <main style={{ paddingTop: 18 }}>
      <div className="card">
        <div className="h1">Alta de paciente (Admin)</div>
        <p className="sub">Crea paciente + asigna tutores, terapeuta(s) y escuela.</p>
        {msg ? <p className="sub">{msg}</p> : null}
      </div>

      {/* Datos paciente */}
      <section className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Paciente</h3>

        <div className="row">
          <input className="input" placeholder="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <input className="input" placeholder="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>

        <div className="row">
          <input className="input" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          <input className="input" placeholder="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </section>

      {/* Padres/Tutores */}
      <section className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Padres / Tutores</h3>
        <p className="sub" style={{ marginBottom: 12 }}>
          Elige un padre ya registrado (misma lista que en Admin → Padres) o registra uno nuevo con nombre y email.
        </p>

        <div className="row" style={{ marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <button
            type="button"
            className="btn"
            style={{ fontWeight: guardianMode === "existing" ? 800 : 400, opacity: guardianMode === "existing" ? 1 : 0.75 }}
            onClick={() => setGuardianMode("existing")}
          >
            Elegir de la lista
          </button>
          <button
            type="button"
            className="btn"
            style={{ fontWeight: guardianMode === "new" ? 800 : 400, opacity: guardianMode === "new" ? 1 : 0.75 }}
            onClick={() => setGuardianMode("new")}
          >
            Registrar nuevo
          </button>
        </div>

        {guardianMode === "existing" ? (
          <div className="row" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
            <select
              className="input"
              style={{ minWidth: 220 }}
              value={pickedParentId}
              onChange={(e) => setPickedParentId(e.target.value)}
            >
              <option value="">— Padre / tutor —</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id} disabled={assignedParentKeySet.has(p.id)}>
                  {p.fullName} ({p.email})
                </option>
              ))}
            </select>

            <select className="input" value={gRel} onChange={(e) => setGRel(e.target.value as Rel)}>
              <option value="MOTHER">Mamá</option>
              <option value="FATHER">Papá</option>
              <option value="TUTOR">Tutor</option>
              <option value="OTHER">Otro</option>
            </select>

            <label className="sub" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={gPrimary} onChange={(e) => setGPrimary(e.target.checked)} />
              Principal
            </label>

            <input className="input" placeholder="Notas (opcional)" value={gNotes} onChange={(e) => setGNotes(e.target.value)} />
            <button type="button" className="btn" onClick={addGuardianFromExisting}>
              + Añadir
            </button>
          </div>
        ) : (
          <>
            <div className="row">
              <input className="input" placeholder="Nombre completo" value={gFullName} onChange={(e) => setGFullName(e.target.value)} />
              <input className="input" placeholder="Email" value={gEmail} onChange={(e) => setGEmail(e.target.value)} />
            </div>

            <div className="row">
              <select className="input" value={gRel} onChange={(e) => setGRel(e.target.value as Rel)}>
                <option value="MOTHER">Mamá</option>
                <option value="FATHER">Papá</option>
                <option value="TUTOR">Tutor</option>
                <option value="OTHER">Otro</option>
              </select>

              <label className="sub" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={gPrimary} onChange={(e) => setGPrimary(e.target.checked)} />
                Principal
              </label>

              <input className="input" placeholder="Notas (opcional)" value={gNotes} onChange={(e) => setGNotes(e.target.value)} />
              <button type="button" className="btn" onClick={addGuardianNew}>
                + Añadir
              </button>
            </div>
          </>
        )}

        {guardians.length ? (
          <ul style={{ paddingLeft: 18, marginTop: 14 }}>
            {guardians.map((g, i) => (
              <li key={i} style={{ marginBottom: 8 }}>
                <b>{g.fullName}</b> — {g.email} — {g.relationship} {g.isPrimary ? "(Principal)" : ""}
                {g.kind === "existing" ? " · ya registrado" : " · nuevo"}
                {g.notes ? ` — ${g.notes}` : ""}
                <button className="btn" style={{ marginLeft: 10 }} onClick={() => removeGuardian(i)}>
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="sub" style={{ marginTop: 10 }}>
            Aún no agregas padres/tutores. (Opcional, pero recomendado)
          </p>
        )}
      </section>

      {/* Terapeutas */}
      <section className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Asignar terapeuta(s)</h3>
        {therapists.length === 0 ? (
          <p className="sub">No hay terapeutas disponibles.</p>
        ) : (
          <ul style={{ paddingLeft: 18 }}>
            {therapists.map((t) => (
              <li key={t.id} style={{ marginBottom: 8 }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={selectedTherapistIds.includes(t.id)}
                    onChange={() => toggleTherapist(t.id)}
                  />
                  <span>
                    <b>{t.fullName}</b> — {t.email}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Escuela */}
      <section className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Escuela (opcional)</h3>
        <div className="row">
          <input className="input" placeholder="Nombre escuela / contacto" value={schoolFullName} onChange={(e) => setSchoolFullName(e.target.value)} />
          <input className="input" placeholder="Email escuela" value={schoolEmail} onChange={(e) => setSchoolEmail(e.target.value)} />
        </div>
        <input className="input" placeholder="Notas escuela (opcional)" value={schoolNotes} onChange={(e) => setSchoolNotes(e.target.value)} />
      </section>

      {/* Guardar */}
      <section className="card" style={{ marginTop: 12 }}>
        <button className="btn" disabled={!canSave} onClick={onSave}>
          Guardar alta completa
        </button>

        {createdCreds.length ? (
          <div style={{ marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>Credenciales generadas (copiar y mandar)</h3>
            <p className="sub">Estas contraseñas se muestran solo una vez. Si se pierden, después haremos “Reset password”.</p>
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {createdCreds
                .map((c) => `${c.role} | ${c.fullName} | ${c.email} | PASS: ${c.temporaryPassword}`)
                .join("\n")}
            </pre>
            <button className="btn" onClick={copyCreds}>
              Copiar credenciales
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
