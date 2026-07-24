"use client";

import { InactivePatientsList } from "@/components/patients/InactivePatientsList";

export default function CompletedPatientsPage() {
  return (
    <InactivePatientsList
      endpoint="/admin/patients/completed"
      title="Altas"
      subtitle="Pacientes dados de alta (terminaron su proceso). El historial se conserva."
      emptyLabel="No hay pacientes dados de alta."
      searchPlaceholder="Buscar paciente dado de alta…"
      dateColumnLabel="Fecha de alta"
    />
  );
}
