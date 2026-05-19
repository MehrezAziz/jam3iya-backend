-- =====================================================================
-- Row-Level Security policies.
--
-- The application uses a non-superuser Postgres role (e.g. `jam3iya_app`)
-- that does NOT have BYPASSRLS. Every request opens a transaction and
-- calls PrismaService.runWithTenantContext() which runs:
--
--   SET LOCAL app.current_org  = '<organization-uuid>';
--   SET LOCAL app.current_user = '<user-uuid>';
--
-- RLS then filters every row.
--
-- The `super_admin` workflow uses a DIFFERENT role (`jam3iya_admin`) that
-- can read any tenant, but every action is wrapped by the application's
-- audit + break-the-glass procedure (see permission-matrix.md).
--
-- NOTE: Prisma 5 generates tables as snake_case (via @@map) but keeps
-- columns as camelCase. Tables `user` and `case` are reserved and need
-- double-quoting.
-- =====================================================================

-- Helpers
CREATE OR REPLACE FUNCTION app_current_org() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_org', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app_current_user() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_user', true), '')::uuid
$$;

-- ---------------------------------------------------------------------
-- 1) Enable + force RLS on every tenant-scoped table.
-- ---------------------------------------------------------------------
DO $body$
DECLARE
  t text;
  tables text[] := ARRAY[
    'organization', 'department', 'user', 'user_invite', 'user_two_factor',
    'user_session', 'role', 'role_permission', 'user_department_role',
    'beneficiary_counter', 'beneficiary', 'spouse', 'child', 'job',
    'housing', 'disease', 'serious_illness', 'social_coverage',
    'beneficiary_photo', 'case', 'case_review', 'need_score',
    'consent_version', 'consent',
    'donor', 'donation', 'donation_allocation', 'pledge', 'pledge_reminder',
    'recurring_donation', 'payment', 'payment_provider_config', 'payment_webhook_event',
    'inventory_item', 'stock_lot', 'stock_movement',
    'distribution', 'distribution_line', 'campaign', 'occasion',
    'expense_category', 'expense', 'bill_template', 'bill_number_counter',
    'bill', 'bill_line', 'ledger_entry',
    'stored_file', 'document',
    'audit_log', 'notification', 'volunteer_shift', 'cross_org_dedup_record'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $body$;

-- ---------------------------------------------------------------------
-- 2) Organization: a user can see only their own org row.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS org_isolation ON organization;
CREATE POLICY org_isolation ON organization
  USING (id = app_current_org())
  WITH CHECK (id = app_current_org());

-- ---------------------------------------------------------------------
-- 3) Generic policy for tables that carry organizationId directly.
-- ---------------------------------------------------------------------
DO $body$
DECLARE
  t text;
  tables text[] := ARRAY[
    'department', 'user', 'user_invite', 'beneficiary_counter',
    'beneficiary', 'donor', 'donation', 'pledge',
    'recurring_donation', 'payment_provider_config', 'payment_webhook_event',
    'inventory_item', 'distribution', 'campaign', 'occasion',
    'expense_category', 'expense', 'bill_template', 'bill_number_counter',
    'bill', 'ledger_entry', 'stored_file', 'document',
    'notification', 'volunteer_shift', 'cross_org_dedup_record',
    'consent_version', 'consent', 'case'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS org_isolation ON %I', t);
    EXECUTE format($p$
      CREATE POLICY org_isolation ON %I
        USING ("organizationId" = app_current_org())
        WITH CHECK ("organizationId" = app_current_org())
    $p$, t);
  END LOOP;
END $body$;

-- donation_allocation: tenant via donation
DROP POLICY IF EXISTS org_isolation ON donation_allocation;
CREATE POLICY org_isolation ON donation_allocation
  USING (EXISTS (SELECT 1 FROM donation d
                 WHERE d.id = donation_allocation."donationId"
                   AND d."organizationId" = app_current_org()))
  WITH CHECK (EXISTS (SELECT 1 FROM donation d
                      WHERE d.id = donation_allocation."donationId"
                        AND d."organizationId" = app_current_org()));

-- ---------------------------------------------------------------------
-- 4) Child tables that derive their tenant via a beneficiary parent.
--    Same shape, only the parent column changes.
-- ---------------------------------------------------------------------
DO $body$
DECLARE
  t text;
  tables text[] := ARRAY[
    'spouse', 'child', 'housing', 'disease', 'serious_illness',
    'social_coverage', 'beneficiary_photo'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS org_isolation ON %I', t);
    EXECUTE format($p$
      CREATE POLICY org_isolation ON %I
        USING (EXISTS (SELECT 1 FROM beneficiary b
                       WHERE b.id = %I."beneficiaryId"
                         AND b."organizationId" = app_current_org()))
        WITH CHECK (EXISTS (SELECT 1 FROM beneficiary b
                            WHERE b.id = %I."beneficiaryId"
                              AND b."organizationId" = app_current_org()))
    $p$, t, t, t);
  END LOOP;
END $body$;

-- case_review, need_score: tenant via case
DO $body$
DECLARE
  t text;
  tables text[] := ARRAY['case_review', 'need_score'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS org_isolation ON %I', t);
    EXECUTE format($p$
      CREATE POLICY org_isolation ON %I
        USING (EXISTS (SELECT 1 FROM "case" c
                       WHERE c.id = %I."caseId"
                         AND c."organizationId" = app_current_org()))
        WITH CHECK (EXISTS (SELECT 1 FROM "case" c
                            WHERE c.id = %I."caseId"
                              AND c."organizationId" = app_current_org()))
    $p$, t, t, t);
  END LOOP;
END $body$;

-- Special cases (parent table is not `beneficiary`):

-- job: subject is either a beneficiary or a spouse
DROP POLICY IF EXISTS org_isolation ON job;
CREATE POLICY org_isolation ON job
  USING (
    ("subjectType" = 'beneficiary' AND EXISTS (
       SELECT 1 FROM beneficiary b
       WHERE b.id = job."beneficiaryId" AND b."organizationId" = app_current_org()))
    OR
    ("subjectType" = 'spouse' AND EXISTS (
       SELECT 1 FROM spouse s
       JOIN beneficiary b ON b.id = s."beneficiaryId"
       WHERE s.id = job."spouseId" AND b."organizationId" = app_current_org()))
  )
  WITH CHECK (
    ("subjectType" = 'beneficiary' AND EXISTS (
       SELECT 1 FROM beneficiary b
       WHERE b.id = job."beneficiaryId" AND b."organizationId" = app_current_org()))
    OR
    ("subjectType" = 'spouse' AND EXISTS (
       SELECT 1 FROM spouse s
       JOIN beneficiary b ON b.id = s."beneficiaryId"
       WHERE s.id = job."spouseId" AND b."organizationId" = app_current_org()))
  );

-- distribution_line: parent is distribution
DROP POLICY IF EXISTS org_isolation ON distribution_line;
CREATE POLICY org_isolation ON distribution_line
  USING (EXISTS (SELECT 1 FROM distribution d
                 WHERE d.id = distribution_line."distributionId"
                   AND d."organizationId" = app_current_org()))
  WITH CHECK (EXISTS (SELECT 1 FROM distribution d
                      WHERE d.id = distribution_line."distributionId"
                        AND d."organizationId" = app_current_org()));

-- bill_line: parent is bill
DROP POLICY IF EXISTS org_isolation ON bill_line;
CREATE POLICY org_isolation ON bill_line
  USING (EXISTS (SELECT 1 FROM bill b
                 WHERE b.id = bill_line."billId"
                   AND b."organizationId" = app_current_org()))
  WITH CHECK (EXISTS (SELECT 1 FROM bill b
                      WHERE b.id = bill_line."billId"
                        AND b."organizationId" = app_current_org()));

-- stock_lot, stock_movement: tenant via inventory_item
DROP POLICY IF EXISTS org_isolation ON stock_lot;
CREATE POLICY org_isolation ON stock_lot
  USING (EXISTS (SELECT 1 FROM inventory_item i
                 WHERE i.id = stock_lot."itemId"
                   AND i."organizationId" = app_current_org()))
  WITH CHECK (EXISTS (SELECT 1 FROM inventory_item i
                      WHERE i.id = stock_lot."itemId"
                        AND i."organizationId" = app_current_org()));

DROP POLICY IF EXISTS org_isolation ON stock_movement;
CREATE POLICY org_isolation ON stock_movement
  USING (EXISTS (SELECT 1 FROM stock_lot l
                 JOIN inventory_item i ON i.id = l."itemId"
                 WHERE l.id = stock_movement."lotId"
                   AND i."organizationId" = app_current_org()))
  WITH CHECK (EXISTS (SELECT 1 FROM stock_lot l
                      JOIN inventory_item i ON i.id = l."itemId"
                      WHERE l.id = stock_movement."lotId"
                        AND i."organizationId" = app_current_org()));

-- payment, payment_webhook_event: tenant via donation
DROP POLICY IF EXISTS org_isolation ON payment;
CREATE POLICY org_isolation ON payment
  USING (EXISTS (SELECT 1 FROM donation d
                 WHERE d.id = payment."donationId"
                   AND d."organizationId" = app_current_org()))
  WITH CHECK (EXISTS (SELECT 1 FROM donation d
                      WHERE d.id = payment."donationId"
                        AND d."organizationId" = app_current_org()));

-- pledge_reminder: tenant via pledge
DROP POLICY IF EXISTS org_isolation ON pledge_reminder;
CREATE POLICY org_isolation ON pledge_reminder
  USING (EXISTS (SELECT 1 FROM pledge p
                 WHERE p.id = pledge_reminder."pledgeId"
                   AND p."organizationId" = app_current_org()))
  WITH CHECK (EXISTS (SELECT 1 FROM pledge p
                      WHERE p.id = pledge_reminder."pledgeId"
                        AND p."organizationId" = app_current_org()));

-- user_two_factor, user_session: tenant via user
DROP POLICY IF EXISTS org_isolation ON user_two_factor;
CREATE POLICY org_isolation ON user_two_factor
  USING (EXISTS (SELECT 1 FROM "user" u
                 WHERE u.id = user_two_factor."userId"
                   AND u."organizationId" = app_current_org()))
  WITH CHECK (EXISTS (SELECT 1 FROM "user" u
                      WHERE u.id = user_two_factor."userId"
                        AND u."organizationId" = app_current_org()));

DROP POLICY IF EXISTS org_isolation ON user_session;
CREATE POLICY org_isolation ON user_session
  USING (EXISTS (SELECT 1 FROM "user" u
                 WHERE u.id = user_session."userId"
                   AND u."organizationId" = app_current_org()))
  WITH CHECK (EXISTS (SELECT 1 FROM "user" u
                      WHERE u.id = user_session."userId"
                        AND u."organizationId" = app_current_org()));

-- role_permission, user_department_role: pure join tables
-- role_permission: roles are either tenant-scoped or system (organizationId NULL)
DROP POLICY IF EXISTS org_isolation ON role_permission;
CREATE POLICY org_isolation ON role_permission
  USING (EXISTS (SELECT 1 FROM role r
                 WHERE r.id = role_permission."roleId"
                   AND (r."organizationId" IS NULL OR r."organizationId" = app_current_org())))
  WITH CHECK (EXISTS (SELECT 1 FROM role r
                      WHERE r.id = role_permission."roleId"
                        AND (r."organizationId" IS NULL OR r."organizationId" = app_current_org())));

DROP POLICY IF EXISTS org_isolation ON user_department_role;
CREATE POLICY org_isolation ON user_department_role
  USING (EXISTS (SELECT 1 FROM "user" u
                 WHERE u.id = user_department_role."userId"
                   AND u."organizationId" = app_current_org()))
  WITH CHECK (EXISTS (SELECT 1 FROM "user" u
                      WHERE u.id = user_department_role."userId"
                        AND u."organizationId" = app_current_org()));

-- ---------------------------------------------------------------------
-- 5) Audit log: append-only. Insert is always allowed (writes match the
--    setter's org from the row data); reads only see your own org's
--    rows (or org-NULL rows that are platform-wide).
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS audit_org_isolation_select ON audit_log;
DROP POLICY IF EXISTS audit_org_isolation_insert ON audit_log;
CREATE POLICY audit_org_isolation_select ON audit_log
  FOR SELECT
  USING ("organizationId" IS NULL OR "organizationId" = app_current_org());
CREATE POLICY audit_org_isolation_insert ON audit_log
  FOR INSERT
  WITH CHECK ("organizationId" IS NULL OR "organizationId" = app_current_org());

-- Permissions table is global; everyone can read.
ALTER TABLE permission ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS permission_read_all ON permission;
CREATE POLICY permission_read_all ON permission FOR SELECT USING (true);

-- Role: a tenant sees its own custom roles + all system roles.
DROP POLICY IF EXISTS role_org_or_system ON role;
CREATE POLICY role_org_or_system ON role
  USING ("organizationId" IS NULL OR "organizationId" = app_current_org())
  WITH CHECK ("organizationId" = app_current_org());

-- ---------------------------------------------------------------------
-- 6) Defense-in-depth grants (only the app role can write tenant data;
--    nothing can hard-delete audit rows). When running this script in
--    dev with the default `jam3iya` superuser these have no effect; they
--    matter when you run with a non-superuser app role in production.
-- ---------------------------------------------------------------------
REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;
