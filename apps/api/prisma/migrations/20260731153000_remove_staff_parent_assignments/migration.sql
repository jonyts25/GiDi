-- Remove parent links and PARENT role from internal staff incorrectly assigned as guardians.
-- Fixes cases like recepcionvallarta@gidi.org (SECRETARY + PARENT).

DELETE FROM "ParentPatient" pp
USING "User" u
WHERE pp."parentId" = u.id
  AND EXISTS (
    SELECT 1
    FROM "UserRole" ur
    JOIN "Role" r ON r.id = ur."roleId"
    WHERE ur."userId" = u.id
      AND r.key IN ('SUPERADMIN', 'ADMIN', 'SECRETARY', 'THERAPIST', 'FINANCE')
  );

DELETE FROM "UserRole" ur
USING "Role" r_parent
WHERE ur."roleId" = r_parent.id
  AND r_parent.key = 'PARENT'
  AND EXISTS (
    SELECT 1
    FROM "UserRole" ur2
    JOIN "Role" r_staff ON r_staff.id = ur2."roleId"
    WHERE ur2."userId" = ur."userId"
      AND r_staff.key IN ('SUPERADMIN', 'ADMIN', 'SECRETARY', 'THERAPIST', 'FINANCE')
  );
