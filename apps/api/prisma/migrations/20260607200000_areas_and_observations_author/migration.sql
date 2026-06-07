-- FollowUp: comentarios del papá y autor de observaciones (áreas TEXT_ONLY)
ALTER TABLE "FollowUp" ADD COLUMN IF NOT EXISTS "parentComments" TEXT;
ALTER TABLE "FollowUp" ADD COLUMN IF NOT EXISTS "observationsAuthor" TEXT;

-- Catálogo de áreas (upsert por key)
INSERT INTO "Area" ("key", "name", "category", "sortOrder", "isActive", "trackingMode", "updatedAt")
VALUES
  ('ADMINISTRATIVO', 'Administrativo', 'Gestión', 0, true, 'TEXT_ONLY', NOW()),
  ('FAMILIAR', 'Familiar', 'Gestión', 1, true, 'TEXT_ONLY', NOW()),
  ('TRATAMIENTO_PSICOLOGICO', 'Tratamiento psicológico', 'Gestión', 2, true, 'TEXT_ONLY', NOW()),
  ('TRATAMIENTO_MEDICO', 'Tratamiento médico', 'Gestión', 3, true, 'TEXT_ONLY', NOW()),
  ('SEGUIMIENTO_ESCOLAR', 'Seguimiento escolar', 'Gestión', 4, true, 'TEXT_ONLY', NOW()),
  ('LECTURA', 'Lectura', 'Tratamiento', 10, true, 'MONTHLY_GRID', NOW()),
  ('VISUALES', 'Visuales', 'Tratamiento', 11, true, 'MONTHLY_GRID', NOW()),
  ('AUDITIVAS', 'Auditivas', 'Tratamiento', 12, true, 'MONTHLY_GRID', NOW()),
  ('PSICOLOGIA', 'Psicología', 'Clínica', 20, true, 'MONTHLY_GRID', NOW()),
  ('LENGUAJE', 'Lenguaje', 'Clínica', 21, true, 'MONTHLY_GRID', NOW()),
  ('TERAPIA_FISICA', 'Terapia Física', 'Clínica', 22, true, 'MONTHLY_GRID', NOW()),
  ('ESTIMULACION_TEMPRANA_NEURO', 'Estimulación temprana - Neuropsicológico', 'Tratamiento', 30, true, 'MONTHLY_GRID', NOW()),
  ('VISUAL_INTEGRACION_SENSORIAL', 'Visual - Integración sensorial', 'Integración sensorial', 40, true, 'MONTHLY_GRID', NOW()),
  ('VESTIBULAR_INTEGRACION_SENSORIAL', 'Vestibular - Integración sensorial', 'Integración sensorial', 41, true, 'MONTHLY_GRID', NOW()),
  ('GUSTATIVA_OLFATIVA_INTEGRACION', 'Gustativa y olfativa - Integración sensorial', 'Integración sensorial', 42, true, 'MONTHLY_GRID', NOW()),
  ('AUDITIVA_INTEGRACION_SENSORIAL', 'Auditiva - Integración sensorial', 'Integración sensorial', 43, true, 'MONTHLY_GRID', NOW()),
  ('PROPIOCEPTIVA_INTEGRACION', 'Propioceptiva - Integración sensorial', 'Integración sensorial', 44, true, 'MONTHLY_GRID', NOW()),
  ('TACTIL_INTEGRACION_SENSORIAL', 'Táctil - Integración sensorial', 'Integración sensorial', 45, true, 'MONTHLY_GRID', NOW()),
  ('MEMORIA_DISPOSITIVOS_APRENDIZAJE', 'Memoria - Dispositivos básicos de aprendizaje', 'Aprendizaje', 50, true, 'MONTHLY_GRID', NOW())
ON CONFLICT ("key") DO UPDATE SET
  "name" = EXCLUDED."name",
  "category" = EXCLUDED."category",
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = EXCLUDED."isActive",
  "trackingMode" = EXCLUDED."trackingMode",
  "updatedAt" = NOW();
