-- FollowUp: comentarios del papá y autor de observaciones (áreas TEXT_ONLY)
ALTER TABLE "FollowUp" ADD COLUMN IF NOT EXISTS "parentComments" TEXT;
ALTER TABLE "FollowUp" ADD COLUMN IF NOT EXISTS "observationsAuthor" TEXT;

-- Catálogo de áreas (upsert por key)
INSERT INTO "Area" ("id", "key", "name", "category", "sortOrder", "isActive", "trackingMode", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'ADMINISTRATIVO', 'Administrativo', 'Gestión', 0, true, 'TEXT_ONLY', NOW(), NOW()),
  (gen_random_uuid(), 'FAMILIAR', 'Familiar', 'Gestión', 1, true, 'TEXT_ONLY', NOW(), NOW()),
  (gen_random_uuid(), 'TRATAMIENTO_PSICOLOGICO', 'Tratamiento psicológico', 'Gestión', 2, true, 'TEXT_ONLY', NOW(), NOW()),
  (gen_random_uuid(), 'TRATAMIENTO_MEDICO', 'Tratamiento médico', 'Gestión', 3, true, 'TEXT_ONLY', NOW(), NOW()),
  (gen_random_uuid(), 'SEGUIMIENTO_ESCOLAR', 'Seguimiento escolar', 'Gestión', 4, true, 'TEXT_ONLY', NOW(), NOW()),
  (gen_random_uuid(), 'LECTURA', 'Lectura', 'Tratamiento', 10, true, 'MONTHLY_GRID', NOW(), NOW()),
  (gen_random_uuid(), 'VISUALES', 'Visuales', 'Tratamiento', 11, true, 'MONTHLY_GRID', NOW(), NOW()),
  (gen_random_uuid(), 'AUDITIVAS', 'Auditivas', 'Tratamiento', 12, true, 'MONTHLY_GRID', NOW(), NOW()),
  (gen_random_uuid(), 'PSICOLOGIA', 'Psicología', 'Clínica', 20, true, 'MONTHLY_GRID', NOW(), NOW()),
  (gen_random_uuid(), 'LENGUAJE', 'Lenguaje', 'Clínica', 21, true, 'MONTHLY_GRID', NOW(), NOW()),
  (gen_random_uuid(), 'TERAPIA_FISICA', 'Terapia Física', 'Clínica', 22, true, 'MONTHLY_GRID', NOW(), NOW()),
  (gen_random_uuid(), 'ESTIMULACION_TEMPRANA_NEURO', 'Estimulación temprana - Neuropsicológico', 'Tratamiento', 30, true, 'MONTHLY_GRID', NOW(), NOW()),
  (gen_random_uuid(), 'VISUAL_INTEGRACION_SENSORIAL', 'Visual - Integración sensorial', 'Integración sensorial', 40, true, 'MONTHLY_GRID', NOW(), NOW()),
  (gen_random_uuid(), 'VESTIBULAR_INTEGRACION_SENSORIAL', 'Vestibular - Integración sensorial', 'Integración sensorial', 41, true, 'MONTHLY_GRID', NOW(), NOW()),
  (gen_random_uuid(), 'GUSTATIVA_OLFATIVA_INTEGRACION', 'Gustativa y olfativa - Integración sensorial', 'Integración sensorial', 42, true, 'MONTHLY_GRID', NOW(), NOW()),
  (gen_random_uuid(), 'AUDITIVA_INTEGRACION_SENSORIAL', 'Auditiva - Integración sensorial', 'Integración sensorial', 43, true, 'MONTHLY_GRID', NOW(), NOW()),
  (gen_random_uuid(), 'PROPIOCEPTIVA_INTEGRACION', 'Propioceptiva - Integración sensorial', 'Integración sensorial', 44, true, 'MONTHLY_GRID', NOW(), NOW()),
  (gen_random_uuid(), 'TACTIL_INTEGRACION_SENSORIAL', 'Táctil - Integración sensorial', 'Integración sensorial', 45, true, 'MONTHLY_GRID', NOW(), NOW()),
  (gen_random_uuid(), 'MEMORIA_DISPOSITIVOS_APRENDIZAJE', 'Memoria - Dispositivos básicos de aprendizaje', 'Aprendizaje', 50, true, 'MONTHLY_GRID', NOW(), NOW())
ON CONFLICT ("key") DO UPDATE SET
  "name" = EXCLUDED."name",
  "category" = EXCLUDED."category",
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = EXCLUDED."isActive",
  "trackingMode" = EXCLUDED."trackingMode",
  "updatedAt" = NOW();
