-- Seguimientos visibles por defecto para papás, colegios, terapeutas (y siempre admin/secretaría).
ALTER TABLE "FollowUp" ALTER COLUMN "visibleToSchool" SET DEFAULT true;

-- Backfill: antes el colegio venía apagado por defecto; se publica a colegio todo lo que
-- no sea comunicación interna (esa área sigue forzada a privada).
UPDATE "FollowUp" f
SET "visibleToSchool" = true
FROM "Area" a
WHERE f."areaId" = a."id"
  AND a."key" <> 'COMUNICACION_INTERNA'
  AND f."visibleToSchool" = false;
