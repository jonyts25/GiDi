-- Audiencia de seguimientos: a quién se publica cada uno (admin siempre ve).
ALTER TABLE "FollowUp" ADD COLUMN IF NOT EXISTS "visibleToParent" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "FollowUp" ADD COLUMN IF NOT EXISTS "visibleToTherapist" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "FollowUp" ADD COLUMN IF NOT EXISTS "visibleToSchool" BOOLEAN NOT NULL DEFAULT false;

-- Avisos generales.
CREATE TABLE IF NOT EXISTS "Announcement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" "RoleKey"[] NOT NULL DEFAULT ARRAY[]::"RoleKey"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Announcement_isActive_idx" ON "Announcement"("isActive");

DO $$ BEGIN
  ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
