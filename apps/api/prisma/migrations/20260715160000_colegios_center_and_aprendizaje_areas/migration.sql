-- Nueva sede Colegios
ALTER TYPE "GidiCenter" ADD VALUE IF NOT EXISTS 'COLEGIOS';

-- Áreas: Atención y Motivación (Dispositivos básicos del aprendizaje)
INSERT INTO "Area" ("id", "key", "name", "category", "sortOrder", "isActive", "trackingMode", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'ATENCION_DISPOSITIVOS_APRENDIZAJE', 'Atención - Dispositivos básicos del aprendizaje', 'Aprendizaje', 51, true, 'MONTHLY_GRID', NOW(), NOW()),
  (gen_random_uuid(), 'MOTIVACION_DISPOSITIVOS_APRENDIZAJE', 'Motivación - Dispositivos básicos del aprendizaje', 'Aprendizaje', 52, true, 'MONTHLY_GRID', NOW(), NOW())
ON CONFLICT ("key") DO UPDATE SET
  "name" = EXCLUDED."name",
  "category" = EXCLUDED."category",
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = EXCLUDED."isActive",
  "trackingMode" = EXCLUDED."trackingMode",
  "updatedAt" = NOW();
