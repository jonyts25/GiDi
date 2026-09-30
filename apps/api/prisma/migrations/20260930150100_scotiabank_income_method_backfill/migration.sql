UPDATE "IncomeEntry" e
SET method = 'SCOTIABANK_TRANSFERENCIA'
FROM "Payment_backup_20260930" p
WHERE e.notes = 'Migrado de captura previa'
  AND e."patientId" = p."patientId"
  AND e."periodYear" = p."periodYear"
  AND e."periodMonth" = p."periodMonth"
  AND p.method ILIKE '%scotia%';
