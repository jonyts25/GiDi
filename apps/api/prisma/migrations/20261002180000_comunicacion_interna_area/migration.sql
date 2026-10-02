-- Área: Comunicación interna (solo personal)
INSERT INTO "Area" ("id", "key", "name", "category", "sortOrder", "isActive", "trackingMode", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'COMUNICACION_INTERNA', 'Comunicación interna', 'Gestión', 5, true, 'TEXT_ONLY', NOW(), NOW())
ON CONFLICT ("key") DO UPDATE SET
  "name" = EXCLUDED."name",
  "category" = EXCLUDED."category",
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = EXCLUDED."isActive",
  "trackingMode" = EXCLUDED."trackingMode",
  "updatedAt" = NOW();

-- Asegurar privacidad en seguimientos existentes del área
UPDATE "FollowUp"
SET
  "visibleToParent" = false,
  "visibleToSchool" = false
WHERE "areaId" = (SELECT id FROM "Area" WHERE key = 'COMUNICACION_INTERNA');
