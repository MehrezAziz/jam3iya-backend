-- Allow cash donations with zero amount (items-only grants).
ALTER TABLE "donation" DROP CONSTRAINT IF EXISTS "donation_kind_amount";
ALTER TABLE "donation" ADD CONSTRAINT "donation_kind_amount" CHECK (
  (kind = 'in_kind' AND "inKindItemId" IS NOT NULL AND "inKindQuantity" IS NOT NULL)
  OR
  (kind = 'cash' AND "amountMinor" >= 0)
  OR
  (kind NOT IN ('in_kind', 'cash') AND "amountMinor" > 0)
);

-- Index consecutive digit substrings for phone/CIN partial search.
ALTER TYPE "BeneficiarySearchKind" ADD VALUE IF NOT EXISTS 'digit_substring';
