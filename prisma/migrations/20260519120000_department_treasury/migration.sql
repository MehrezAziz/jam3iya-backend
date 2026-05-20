-- Department treasury: donation owner + inter-department transfers

ALTER TABLE "donation" ADD COLUMN IF NOT EXISTS "departmentId" UUID;

CREATE INDEX IF NOT EXISTS "donation_departmentId_idx" ON "donation"("departmentId");

ALTER TABLE "donation"
  ADD CONSTRAINT "donation_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "department"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "department_transfer" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "fromDepartmentId" UUID NOT NULL,
  "toDepartmentId" UUID NOT NULL,
  "amountMinor" BIGINT NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'TND',
  "notes" TEXT,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "department_transfer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "department_transfer_organizationId_idx" ON "department_transfer"("organizationId");
CREATE INDEX IF NOT EXISTS "department_transfer_fromDepartmentId_idx" ON "department_transfer"("fromDepartmentId");
CREATE INDEX IF NOT EXISTS "department_transfer_toDepartmentId_idx" ON "department_transfer"("toDepartmentId");
CREATE INDEX IF NOT EXISTS "department_transfer_createdAt_idx" ON "department_transfer"("createdAt");

ALTER TABLE "department_transfer"
  ADD CONSTRAINT "department_transfer_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "department_transfer"
  ADD CONSTRAINT "department_transfer_fromDepartmentId_fkey"
  FOREIGN KEY ("fromDepartmentId") REFERENCES "department"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "department_transfer"
  ADD CONSTRAINT "department_transfer_toDepartmentId_fkey"
  FOREIGN KEY ("toDepartmentId") REFERENCES "department"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "department_transfer"
  ADD CONSTRAINT "department_transfer_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "user"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill donation department from cashier assignment when possible
UPDATE "donation" d
SET "departmentId" = sub."departmentId"
FROM (
  SELECT DISTINCT ON (udr."userId")
    udr."userId",
    udr."departmentId"
  FROM "user_department_role" udr
  WHERE udr."deletedAt" IS NULL
  ORDER BY udr."userId", udr."createdAt" ASC
) sub
WHERE d."receivedById" = sub."userId"
  AND d."departmentId" IS NULL
  AND d."deletedAt" IS NULL;
