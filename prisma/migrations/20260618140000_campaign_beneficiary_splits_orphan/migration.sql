-- Beneficiary orphan flag
ALTER TABLE "beneficiary" ADD COLUMN "isOrphan" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "beneficiary_organizationId_isOrphan_idx" ON "beneficiary"("organizationId", "isOrphan");

-- Extend search kind enum for first/last name lookup
ALTER TYPE "BeneficiarySearchKind" ADD VALUE IF NOT EXISTS 'first_name';
ALTER TYPE "BeneficiarySearchKind" ADD VALUE IF NOT EXISTS 'last_name';

-- Campaign ↔ beneficiary membership
CREATE TABLE "campaign_beneficiary" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL,
    "beneficiaryId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_beneficiary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "campaign_beneficiary_campaignId_beneficiaryId_key" ON "campaign_beneficiary"("campaignId", "beneficiaryId");
CREATE INDEX "campaign_beneficiary_campaignId_idx" ON "campaign_beneficiary"("campaignId");
CREATE INDEX "campaign_beneficiary_beneficiaryId_idx" ON "campaign_beneficiary"("beneficiaryId");

ALTER TABLE "campaign_beneficiary" ADD CONSTRAINT "campaign_beneficiary_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaign_beneficiary" ADD CONSTRAINT "campaign_beneficiary_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Per-donation beneficiary amount splits
CREATE TABLE "donation_beneficiary_split" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "donationId" UUID NOT NULL,
    "beneficiaryId" UUID NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'TND',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donation_beneficiary_split_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "donation_beneficiary_split_donationId_idx" ON "donation_beneficiary_split"("donationId");
CREATE INDEX "donation_beneficiary_split_beneficiaryId_idx" ON "donation_beneficiary_split"("beneficiaryId");

ALTER TABLE "donation_beneficiary_split" ADD CONSTRAINT "donation_beneficiary_split_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "donation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "donation_beneficiary_split" ADD CONSTRAINT "donation_beneficiary_split_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
