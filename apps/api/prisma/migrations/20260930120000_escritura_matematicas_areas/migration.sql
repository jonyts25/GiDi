-- Áreas: Escritura y Matemáticas (Aprendizaje)
INSERT INTO "Area" ("id", "key", "name", "category", "sortOrder", "isActive", "trackingMode", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'ESCRITURA', 'Escritura', 'Aprendizaje', 53, true, 'MONTHLY_GRID', NOW(), NOW()),
  (gen_random_uuid(), 'MATEMATICAS', 'Matemáticas', 'Aprendizaje', 54, true, 'MONTHLY_GRID', NOW(), NOW())
ON CONFLICT ("key") DO UPDATE SET
  "name" = EXCLUDED."name",
  "category" = EXCLUDED."category",
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = EXCLUDED."isActive",
  "trackingMode" = EXCLUDED."trackingMode",
  "updatedAt" = NOW();
