-- Allow campaigns with no fixed end date (open-ended / ongoing).
ALTER TABLE "campaign" ALTER COLUMN "endsAt" DROP NOT NULL;
