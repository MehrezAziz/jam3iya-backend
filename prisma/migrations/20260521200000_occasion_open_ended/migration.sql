-- Open-ended occasions (no fixed end date).
ALTER TABLE "occasion" ALTER COLUMN "periodEnd" DROP NOT NULL;

ALTER TABLE "occasion" DROP CONSTRAINT IF EXISTS "occasion_period";
ALTER TABLE "occasion"
  ADD CONSTRAINT "occasion_period"
  CHECK ("periodEnd" IS NULL OR "periodStart" <= "periodEnd");
