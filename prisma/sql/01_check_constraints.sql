-- =====================================================================
-- CHECK constraints that Prisma cannot express directly.
-- Apply after the initial Prisma migration.
--
-- This script is IDEMPOTENT: every constraint is wrapped so re-running
-- it on a database that already has the constraint is a no-op.
--
-- Naming: Prisma maps model->table to snake_case via @@map but keeps
-- field names as camelCase by default. So tables are snake_case (some
-- need quoting because of reserved words: "user", "case") and column
-- identifiers are camelCase, always double-quoted.
-- =====================================================================

CREATE OR REPLACE FUNCTION pg_temp.add_check(
  p_table text, p_name text, p_expr text
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE c.conname = p_name AND t.relname = p_table
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK (%s)', p_table, p_name, p_expr);
  END IF;
END $$;

SELECT pg_temp.add_check('job', 'job_subject_xor', $$
  ("subjectType" = 'beneficiary' AND "beneficiaryId" IS NOT NULL AND "spouseId" IS NULL)
  OR
  ("subjectType" = 'spouse' AND "spouseId" IS NOT NULL AND "beneficiaryId" IS NULL)
$$);

SELECT pg_temp.add_check('donation', 'donation_kind_amount', $$
  (kind = 'in_kind' AND "inKindItemId" IS NOT NULL AND "inKindQuantity" IS NOT NULL)
  OR
  (kind <> 'in_kind' AND "amountMinor" > 0)
$$);

SELECT pg_temp.add_check('distribution_line', 'distribution_line_payload', $$
  ("lineKind" = 'cash' AND "amountMinor" IS NOT NULL AND "amountMinor" > 0
     AND "itemId" IS NULL AND "lotId" IS NULL AND quantity IS NULL)
  OR
  ("lineKind" = 'item' AND "itemId" IS NOT NULL AND "lotId" IS NOT NULL
     AND quantity IS NOT NULL AND quantity > 0)
$$);

SELECT pg_temp.add_check('stock_lot', 'stock_lot_remaining_nonneg',       '"quantityRemaining" >= 0');
SELECT pg_temp.add_check('stock_lot', 'stock_lot_remaining_leq_initial',  '"quantityRemaining" <= "quantityInitial"');

SELECT pg_temp.add_check('pledge', 'pledge_paid_leq_amount',
  '"paidMinor" >= 0 AND "paidMinor" <= "amountMinor"');

SELECT pg_temp.add_check('bill', 'bill_total_nonneg', '"totalMinor" >= 0');

SELECT pg_temp.add_check('bill', 'bill_source_exclusive', $$
  (
    (CASE WHEN "linkedDonationId"     IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN "linkedDistributionId" IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN "linkedExpenseId"      IS NOT NULL THEN 1 ELSE 0 END)
  ) <= 1
$$);

SELECT pg_temp.add_check('consent', 'consent_subject_xor', $$
  ("beneficiaryId" IS NOT NULL AND "donorUserId" IS NULL)
  OR
  ("beneficiaryId" IS NULL AND "donorUserId" IS NOT NULL)
$$);

-- Money minor amounts must be non-negative where stored as BigInt
SELECT pg_temp.add_check('donation',            'donation_amount_nonneg',       '"amountMinor" >= 0');
SELECT pg_temp.add_check('donation_allocation', 'donation_alloc_amount_nonneg', '"amountMinor" >= 0');
SELECT pg_temp.add_check('recurring_donation',  'recurring_amount_pos',         '"amountMinor" > 0');
SELECT pg_temp.add_check('payment',             'payment_amount_pos',           '"amountMinor" > 0');
SELECT pg_temp.add_check('expense',             'expense_amount_pos',           '"amountMinor" > 0');
SELECT pg_temp.add_check('ledger_entry',        'ledger_amount_nonneg',         '"amountMinor" >= 0');

-- Period sanity
SELECT pg_temp.add_check('occasion',        'occasion_period',        '"periodStart" <= "periodEnd"');
SELECT pg_temp.add_check('campaign',        'campaign_period',        '"startsAt" <= "endsAt"');
SELECT pg_temp.add_check('volunteer_shift', 'volunteer_shift_period', '"startsAt" < "endsAt"');

-- Currency must be 3 chars uppercase
SELECT pg_temp.add_check('donation',          'donation_currency_iso',   $$currency ~ '^[A-Z]{3}$'$$);
SELECT pg_temp.add_check('payment',           'payment_currency_iso',    $$currency ~ '^[A-Z]{3}$'$$);
SELECT pg_temp.add_check('distribution_line', 'distline_currency_iso',   $$currency ~ '^[A-Z]{3}$'$$);
SELECT pg_temp.add_check('expense',           'expense_currency_iso',    $$currency ~ '^[A-Z]{3}$'$$);
SELECT pg_temp.add_check('bill',              'bill_currency_iso',       $$currency ~ '^[A-Z]{3}$'$$);
