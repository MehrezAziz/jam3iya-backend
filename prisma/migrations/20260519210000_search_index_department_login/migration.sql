-- Beneficiary searchable name tokens + phone prefixes (HMAC hashes)
CREATE TYPE "BeneficiarySearchKind" AS ENUM ('name_token', 'phone_prefix');

CREATE TABLE "beneficiary_search_index" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "beneficiaryId" UUID NOT NULL,
    "kind" "BeneficiarySearchKind" NOT NULL,
    "tokenHash" BYTEA NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beneficiary_search_index_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "beneficiary_search_index_beneficiaryId_kind_tokenHash_key"
  ON "beneficiary_search_index"("beneficiaryId", "kind", "tokenHash");

CREATE INDEX "beneficiary_search_index_org_kind_hash_idx"
  ON "beneficiary_search_index"("organizationId", "kind", "tokenHash");

ALTER TABLE "beneficiary_search_index" ADD CONSTRAINT "beneficiary_search_index_beneficiaryId_fkey"
  FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "beneficiary_search_index" ADD CONSTRAINT "beneficiary_search_index_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Department portal login (code + password per department)
ALTER TABLE "department" ADD COLUMN "loginCode" TEXT;
ALTER TABLE "department" ADD COLUMN "passwordHash" TEXT;

CREATE UNIQUE INDEX "department_organizationId_loginCode_key"
  ON "department"("organizationId", "loginCode")
  WHERE "loginCode" IS NOT NULL AND "deletedAt" IS NULL;

-- Fix corrupted governorate names (UTF-8).
-- Merge duplicates into one canonical row per governorate (avoids governorate_name_key violations).

UPDATE governorate SET name = TRIM(REPLACE(name, ' Governorate', '')) WHERE name LIKE '% Governorate%';

CREATE OR REPLACE FUNCTION _jam3iya_merge_governorate(canonical TEXT, pattern TEXT) RETURNS void AS $$
DECLARE
  keep_id INT;
  drop_id INT;
BEGIN
  SELECT id INTO keep_id FROM governorate WHERE name = canonical LIMIT 1;
  IF keep_id IS NULL THEN
    SELECT MIN(id) INTO keep_id FROM governorate g WHERE lower(g.name) LIKE pattern AND g.name <> canonical;
    IF keep_id IS NOT NULL THEN
      UPDATE governorate SET name = canonical WHERE id = keep_id;
    END IF;
  END IF;
  IF keep_id IS NULL THEN
    RETURN;
  END IF;

  FOR drop_id IN
    SELECT g.id FROM governorate g
    WHERE lower(g.name) LIKE pattern AND g.id <> keep_id
  LOOP
    DELETE FROM delegation d_drop
    USING delegation d_keep
    WHERE d_drop."governorateId" = drop_id
      AND d_keep."governorateId" = keep_id
      AND d_keep.name = d_drop.name;
    UPDATE delegation SET "governorateId" = keep_id WHERE "governorateId" = drop_id;
    DELETE FROM governorate WHERE id = drop_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT _jam3iya_merge_governorate('Béja', '%b%ja%');
SELECT _jam3iya_merge_governorate('Gabès', '%gab%s%');
SELECT _jam3iya_merge_governorate('Kébili', '%k%bili%');
SELECT _jam3iya_merge_governorate('Médenine', '%m%denine%');

DROP FUNCTION _jam3iya_merge_governorate(TEXT, TEXT);

DELETE FROM governorate a USING governorate b
WHERE a.id > b.id AND lower(trim(a.name)) = lower(trim(b.name));
