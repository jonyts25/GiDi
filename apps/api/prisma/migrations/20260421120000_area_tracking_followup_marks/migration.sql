CREATE TYPE "AreaTrackingMode" AS ENUM ('TEXT_ONLY', 'MONTHLY_GRID');

ALTER TABLE "Area" ADD COLUMN "trackingMode" "AreaTrackingMode" NOT NULL DEFAULT 'MONTHLY_GRID';

UPDATE "Area" SET "trackingMode" = 'TEXT_ONLY' WHERE UPPER("key") IN ('ADMINISTRATIVO', 'FAMILIAR');

ALTER TABLE "FollowUpMark" ADD COLUMN "progressScale" INTEGER;

ALTER TABLE "FollowUpMark" ALTER COLUMN "code" DROP NOT NULL;

ALTER TABLE "FollowUpMark" ADD CONSTRAINT "FollowUpMark_progressScale_range" CHECK (
  "progressScale" IS NULL OR ("progressScale" >= 0 AND "progressScale" <= 4)
);
