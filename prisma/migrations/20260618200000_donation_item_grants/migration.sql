-- Donation item grants: inventory items given to beneficiaries (stock out)
CREATE TABLE "donation_item_grant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "donationId" UUID NOT NULL,
    "beneficiaryId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donation_item_grant_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "donation_item_grant"
  ADD CONSTRAINT "donation_item_grant_donationId_fkey"
  FOREIGN KEY ("donationId") REFERENCES "donation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "donation_item_grant"
  ADD CONSTRAINT "donation_item_grant_beneficiaryId_fkey"
  FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "donation_item_grant"
  ADD CONSTRAINT "donation_item_grant_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "inventory_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "donation_item_grant_donationId_idx" ON "donation_item_grant"("donationId");
CREATE INDEX "donation_item_grant_beneficiaryId_idx" ON "donation_item_grant"("beneficiaryId");
CREATE INDEX "donation_item_grant_itemId_idx" ON "donation_item_grant"("itemId");

ALTER TABLE "stock_movement" ADD COLUMN "donationItemGrantId" UUID;

ALTER TABLE "stock_movement"
  ADD CONSTRAINT "stock_movement_donationItemGrantId_fkey"
  FOREIGN KEY ("donationItemGrantId") REFERENCES "donation_item_grant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "stock_movement_donationItemGrantId_key" ON "stock_movement"("donationItemGrantId");

-- Relax: non in_kind donations may have amountMinor >= 0 (0 allowed when item grants exist)
ALTER TABLE "donation" DROP CONSTRAINT IF EXISTS "donation_kind_payload";
