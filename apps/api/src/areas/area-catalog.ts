import { AreaTrackingMode } from "@prisma/client";

export type AreaCatalogEntry = {
  key: string;
  name: string;
  category: string;
  sortOrder: number;
  trackingMode: AreaTrackingMode;
};

/** Áreas con seguimiento solo texto (Observaciones + quien registró). */
export const TEXT_ONLY_AREA_KEYS = new Set([
  "ADMINISTRATIVO",
  "FAMILIAR",
  "TRATAMIENTO_PSICOLOGICO",
  "TRATAMIENTO_MEDICO",
  "SEGUIMIENTO_ESCOLAR",
]);

export const AREA_CATALOG: AreaCatalogEntry[] = [
  { key: "ADMINISTRATIVO", name: "Administrativo", category: "Gestión", sortOrder: 0, trackingMode: AreaTrackingMode.TEXT_ONLY },
  { key: "FAMILIAR", name: "Familiar", category: "Gestión", sortOrder: 1, trackingMode: AreaTrackingMode.TEXT_ONLY },
  { key: "TRATAMIENTO_PSICOLOGICO", name: "Tratamiento psicológico", category: "Gestión", sortOrder: 2, trackingMode: AreaTrackingMode.TEXT_ONLY },
  { key: "TRATAMIENTO_MEDICO", name: "Tratamiento médico", category: "Gestión", sortOrder: 3, trackingMode: AreaTrackingMode.TEXT_ONLY },
  { key: "SEGUIMIENTO_ESCOLAR", name: "Seguimiento escolar", category: "Gestión", sortOrder: 4, trackingMode: AreaTrackingMode.TEXT_ONLY },
  { key: "LECTURA", name: "Lectura", category: "Tratamiento", sortOrder: 10, trackingMode: AreaTrackingMode.MONTHLY_GRID },
  { key: "VISUALES", name: "Visuales", category: "Tratamiento", sortOrder: 11, trackingMode: AreaTrackingMode.MONTHLY_GRID },
  { key: "AUDITIVAS", name: "Auditivas", category: "Tratamiento", sortOrder: 12, trackingMode: AreaTrackingMode.MONTHLY_GRID },
  { key: "PSICOLOGIA", name: "Psicología", category: "Clínica", sortOrder: 20, trackingMode: AreaTrackingMode.MONTHLY_GRID },
  { key: "LENGUAJE", name: "Lenguaje", category: "Clínica", sortOrder: 21, trackingMode: AreaTrackingMode.MONTHLY_GRID },
  { key: "TERAPIA_FISICA", name: "Terapia Física", category: "Clínica", sortOrder: 22, trackingMode: AreaTrackingMode.MONTHLY_GRID },
  {
    key: "ESTIMULACION_TEMPRANA_NEURO",
    name: "Estimulación temprana - Neuropsicológico",
    category: "Tratamiento",
    sortOrder: 30,
    trackingMode: AreaTrackingMode.MONTHLY_GRID,
  },
  {
    key: "VISUAL_INTEGRACION_SENSORIAL",
    name: "Visual - Integración sensorial",
    category: "Integración sensorial",
    sortOrder: 40,
    trackingMode: AreaTrackingMode.MONTHLY_GRID,
  },
  {
    key: "VESTIBULAR_INTEGRACION_SENSORIAL",
    name: "Vestibular - Integración sensorial",
    category: "Integración sensorial",
    sortOrder: 41,
    trackingMode: AreaTrackingMode.MONTHLY_GRID,
  },
  {
    key: "GUSTATIVA_OLFATIVA_INTEGRACION",
    name: "Gustativa y olfativa - Integración sensorial",
    category: "Integración sensorial",
    sortOrder: 42,
    trackingMode: AreaTrackingMode.MONTHLY_GRID,
  },
  {
    key: "AUDITIVA_INTEGRACION_SENSORIAL",
    name: "Auditiva - Integración sensorial",
    category: "Integración sensorial",
    sortOrder: 43,
    trackingMode: AreaTrackingMode.MONTHLY_GRID,
  },
  {
    key: "PROPIOCEPTIVA_INTEGRACION",
    name: "Propioceptiva - Integración sensorial",
    category: "Integración sensorial",
    sortOrder: 44,
    trackingMode: AreaTrackingMode.MONTHLY_GRID,
  },
  {
    key: "TACTIL_INTEGRACION_SENSORIAL",
    name: "Táctil - Integración sensorial",
    category: "Integración sensorial",
    sortOrder: 45,
    trackingMode: AreaTrackingMode.MONTHLY_GRID,
  },
  {
    key: "MEMORIA_DISPOSITIVOS_APRENDIZAJE",
    name: "Memoria - Dispositivos básicos de aprendizaje",
    category: "Aprendizaje",
    sortOrder: 50,
    trackingMode: AreaTrackingMode.MONTHLY_GRID,
  },
];
