"use client";

import { InactivePatientsList } from "@/components/patients/InactivePatientsList";

export default function DischargedPatientsPage() {
  return (
    <InactivePatientsList
      endpoint="/admin/patients/discharged"
      title="Bajas"
      subtitle="Pacientes dados de baja (abandono). El historial se conserva."
      emptyLabel="No hay pacientes dados de baja."
      searchPlaceholder="Buscar paciente dado de baja…"
      dateColumnLabel="Fecha de baja"
    />
  );
}
