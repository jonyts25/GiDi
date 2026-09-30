"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { filterByQuery, SearchInput } from "@/components/ui/SearchInput";
import {
  conceptRequiresPatient,
  conceptRequiresPeriod,
  INCOME_CONCEPTS,
  INCOME_METHODS,
  INCOME_CONCEPT_LABEL,
  INCOME_METHOD_LABEL,
  type IncomeConcept,
  type IncomeEntryRow,
  type IncomeMethod,
} from "@/lib/income-helpers";
import { GIDI_CENTER_OPTIONS, type GidiCenterKey } from "@/lib/centers";

type PatientMini = { id: string; firstName: string; lastName: string };

export type IncomeFormPrefill = {
  patientId?: string;
  concept?: IncomeConcept;
  periodYear?: number;
  periodMonth?: number;
  amount?: number;
};

type Props = {
  center: GidiCenterKey;
  year: number;
  month: number;
  patients: PatientMini[];
  prefill?: IncomeFormPrefill;
  editing?: IncomeEntryRow | null;
  canDelete?: boolean;
  onSaved: () => void;
  onCancel: () => void;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

export function IncomeEntryForm({
  center,
  year,
  month,
  patients,
  prefill,
  editing,
  canDelete,
  onSaved,
  onCancel,
}: Props) {
  const [receivedAt, setReceivedAt] = useState(todayIso());
  const [concept, setConcept] = useState<IncomeConcept>("MENSUALIDAD");
  const [patientQuery, setPatientQuery] = useState("");
  const [patientId, setPatientId] = useState("");
  const [payerName, setPayerName] = useState("");
  const [amount, setAmount] = useState("");
  const [periodYear, setPeriodYear] = useState(year);
  const [periodMonth, setPeriodMonth] = useState(month);
  const [method, setMethod] = useState<IncomeMethod>("EFECTIVO");
  const [invoiced, setInvoiced] = useState(false);
  const [notes, setNotes] = useState("");
  const [entryCenter, setEntryCenter] = useState<GidiCenterKey>(center);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editing) {
      setReceivedAt(editing.receivedAt.slice(0, 10));
      setConcept(editing.concept);
      setPatientId(editing.patientId ?? "");
      setPayerName(editing.payerName ?? "");
      setAmount(String(Number(editing.amount)));
      setPeriodYear(editing.periodYear ?? year);
      setPeriodMonth(editing.periodMonth ?? month);
      setMethod(editing.method);
      setInvoiced(editing.invoiced);
      setNotes(editing.notes ?? "");
      setEntryCenter(editing.center as GidiCenterKey);
      return;
    }
    setReceivedAt(todayIso());
    setConcept(prefill?.concept ?? "MENSUALIDAD");
    setPatientId(prefill?.patientId ?? "");
    setPayerName("");
    setAmount(prefill?.amount != null ? String(prefill.amount) : "");
    setPeriodYear(prefill?.periodYear ?? year);
    setPeriodMonth(prefill?.periodMonth ?? month);
    setMethod("EFECTIVO");
    setInvoiced(false);
    setNotes("");
    setEntryCenter(center);
  }, [editing, prefill, center, year, month]);

  const filteredPatients = useMemo(
    () => filterByQuery(patients, patientQuery, (p) => `${p.firstName} ${p.lastName}`),
    [patients, patientQuery],
  );

  const needsPatient = conceptRequiresPatient(concept);
  const needsPeriod = conceptRequiresPeriod(concept);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const body = {
        center: entryCenter,
        receivedAt: new Date(receivedAt).toISOString(),
        concept,
        patientId: patientId || undefined,
        payerName: payerName.trim() || undefined,
        amount: Number(amount),
        periodYear: needsPeriod ? periodYear : undefined,
        periodMonth: needsPeriod ? periodMonth : undefined,
        method,
        invoiced,
        notes: notes.trim() || undefined,
      };

      if (editing) {
        await apiFetch(`/admin/income/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await apiFetch("/admin/income", { method: "POST", body: JSON.stringify(body) });
      }
      onSaved();
    } catch (ex: unknown) {
      setMsg(ex instanceof Error ? ex.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!editing || !canDelete) return;
    if (!window.confirm("¿Eliminar este ingreso?")) return;
    setBusy(true);
    setMsg("");
    try {
      await apiFetch(`/admin/income/${editing.id}`, { method: "DELETE" });
      onSaved();
    } catch (ex: unknown) {
      setMsg(ex instanceof Error ? ex.message : "Error al eliminar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="card space-y-4 border-l-4 border-l-primary">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">{editing ? "Editar ingreso" : "Nuevo ingreso"}</h3>
        <button type="button" className="btn rounded-lg px-3 py-1 text-xs" onClick={onCancel}>
          Cerrar
        </button>
      </div>

      {msg ? <p className="text-sm text-danger">{msg}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Fecha de ingreso</span>
          <input className="input" type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} required />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">Concepto</span>
          <select className="select" value={concept} onChange={(e) => setConcept(e.target.value as IncomeConcept)}>
            {INCOME_CONCEPTS.map((c) => (
              <option key={c} value={c}>{INCOME_CONCEPT_LABEL[c]}</option>
            ))}
          </select>
        </label>

        {needsPatient ? (
          <div className="grid gap-2 sm:col-span-2">
            <span className="text-sm font-medium">Paciente</span>
            <SearchInput value={patientQuery} onChange={setPatientQuery} placeholder="Buscar paciente…" />
            <select className="select" value={patientId} onChange={(e) => setPatientId(e.target.value)} required>
              <option value="">— Seleccionar —</option>
              {filteredPatients.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:col-span-2">
              <span className="text-sm font-medium">Paciente (opcional)</span>
              <SearchInput value={patientQuery} onChange={setPatientQuery} placeholder="Buscar paciente…" />
              <select className="select" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
                <option value="">— Sin paciente —</option>
                {filteredPatients.map((p) => (
                  <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                ))}
              </select>
            </div>
            {!patientId ? (
              <label className="grid gap-1 text-sm sm:col-span-2">
                <span className="font-medium">Persona relacionada</span>
                <input className="input" value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder="Nombre del pagador" required />
              </label>
            ) : null}
          </>
        )}

        <label className="grid gap-1 text-sm">
          <span className="font-medium">Monto</span>
          <input className="input" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>

        {needsPeriod ? (
          <>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Mes al que corresponde</span>
              <select className="select" value={periodMonth} onChange={(e) => setPeriodMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i, 1).toLocaleDateString("es-MX", { month: "long" })}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Año</span>
              <input className="input" type="number" value={periodYear} onChange={(e) => setPeriodYear(Number(e.target.value))} />
            </label>
          </>
        ) : null}

        <label className="grid gap-1 text-sm">
          <span className="font-medium">Dónde se recibió</span>
          <select
            className="select"
            value={entryCenter}
            onChange={(e) => setEntryCenter(e.target.value as GidiCenterKey)}
            disabled={!!patientId}
          >
            {GIDI_CENTER_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">Medio de pago</span>
          <select className="select" value={method} onChange={(e) => setMethod(e.target.value as IncomeMethod)}>
            {INCOME_METHODS.map((m) => (
              <option key={m} value={m}>{INCOME_METHOD_LABEL[m]}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={invoiced} onChange={(e) => setInvoiced(e.target.checked)} />
          ¿Factura?
        </label>

        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="font-medium">Observaciones</span>
          <textarea className="textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold" disabled={busy}>
          {busy ? "Guardando…" : editing ? "Guardar cambios" : "Registrar ingreso"}
        </button>
        {editing && canDelete ? (
          <button type="button" className="btn rounded-xl px-4 py-2 text-sm text-danger" disabled={busy} onClick={() => void onDelete()}>
            Eliminar
          </button>
        ) : null}
      </div>
    </form>
  );
}
