-- El índice único original fue truncado por Postgres a 63 caracteres (periodMont, no periodMonth).
-- La migración anterior usó nombre y tipo incorrectos (DROP CONSTRAINT), por lo que el índice siguió activo.
DROP INDEX IF EXISTS "FollowUp_patientId_therapistId_areaId_periodYear_periodMont_key";
