-- RoleKey COORDINATOR se añade en 20261027200000; el registro en Role va en migración aparte.
INSERT INTO "Role" ("id", "key", "name")
VALUES (gen_random_uuid(), 'COORDINATOR', 'Coordinadora/o')
ON CONFLICT ("key") DO NOTHING;
