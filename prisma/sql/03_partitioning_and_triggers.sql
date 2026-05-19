-- =====================================================================
-- Partitioning and triggers that Prisma cannot express.
-- =====================================================================

-- pgcrypto is needed for `digest()` used by the hash-chain trigger.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Audit log partitioning sketch (for production use; v0 keeps single table).
--    To partition: rename, recreate as PARTITION BY RANGE ("at"), copy rows,
--    create monthly partitions, use pg_partman / scheduled DDL.

-- 2) Audit log hash-chain trigger.
CREATE OR REPLACE FUNCTION audit_log_set_hash() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  prev bytea;
BEGIN
  SELECT "thisHash" INTO prev FROM audit_log
    WHERE "organizationId" IS NOT DISTINCT FROM NEW."organizationId"
    ORDER BY "at" DESC, id DESC
    LIMIT 1;

  NEW."prevHash" := COALESCE(prev, '\x00'::bytea);
  NEW."thisHash" := digest(
    NEW."prevHash"
      || coalesce(NEW."organizationId"::text, '')
      || coalesce(NEW."actorUserId"::text, '')
      || NEW.action
      || coalesce(NEW."resourceType", '')
      || coalesce(NEW."resourceId"::text, '')
      || NEW.outcome::text
      || coalesce(NEW.reason, '')
      || coalesce(NEW.before::text, '')
      || coalesce(NEW.after::text, '')
      || NEW."at"::text,
    'sha256'
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS audit_log_hash_chain ON audit_log;
CREATE TRIGGER audit_log_hash_chain
  BEFORE INSERT ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_set_hash();

-- 3) Bill numbering: gap-free per (organization, series, year) using an
--    advisory lock to serialize issuance per tenant series.
CREATE OR REPLACE FUNCTION next_bill_number(
  p_org uuid, p_series text, p_year int
) RETURNS int LANGUAGE plpgsql AS $$
DECLARE
  v_next int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_org::text || p_series || p_year::text));

  INSERT INTO bill_number_counter ("organizationId", series, year, "lastValue")
  VALUES (p_org, p_series, p_year, 1)
  ON CONFLICT ("organizationId", series, year)
  DO UPDATE SET "lastValue" = bill_number_counter."lastValue" + 1
  RETURNING "lastValue" INTO v_next;

  RETURN v_next;
END $$;

-- 4) Beneficiary code generator (PP-2026-00012)
CREATE OR REPLACE FUNCTION next_beneficiary_code(p_org uuid, p_year int)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_next int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('pp::' || p_org::text || p_year::text));

  INSERT INTO beneficiary_counter ("organizationId", year, "lastValue")
  VALUES (p_org, p_year, 1)
  ON CONFLICT ("organizationId", year)
  DO UPDATE SET "lastValue" = beneficiary_counter."lastValue" + 1
  RETURNING "lastValue" INTO v_next;

  RETURN 'PP-' || p_year::text || '-' || lpad(v_next::text, 5, '0');
END $$;

-- 5) Soft-delete guard (production only): keep hard DELETE on key tables
--    away from the app role. In dev with a superuser this is a no-op.
--    REVOKE DELETE ON beneficiary, donation, distribution, bill, payment,
--                     ledger_entry, audit_log FROM jam3iya_app;
