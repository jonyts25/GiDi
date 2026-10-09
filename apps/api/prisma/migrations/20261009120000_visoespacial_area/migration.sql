-- Área: Visoespacial (Aprendizaje)
INSERT INTO "Area" ("id", "key", "name", "category", "sortOrder", "isActive", "trackingMode", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'VISOESPACIAL', 'Visoespacial', 'Aprendizaje', 55, true, 'MONTHLY_GRID', NOW(), NOW())
ON CONFLICT ("key") DO UPDATE SET
  "name" = EXCLUDED."name",
  "category" = EXCLUDED."category",
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = EXCLUDED."isActive",
  "trackingMode" = EXCLUDED."trackingMode",
  "updatedAt" = NOW();
