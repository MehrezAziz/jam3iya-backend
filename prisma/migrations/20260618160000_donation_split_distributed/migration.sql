ALTER TABLE "donation_beneficiary_split"
ADD COLUMN "distributedAmountMinor" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN "paidAt" TIMESTAMPTZ;
