-- CreateEnum
CREATE TYPE "CareRelationType" AS ENUM ('mother', 'father', 'orphan', 'sibling', 'grandparent', 'uncle_aunt', 'other');

-- CreateEnum
CREATE TYPE "HealthSubjectType" AS ENUM ('beneficiary', 'spouse', 'child', 'dependent');

-- AlterTable
ALTER TABLE "disease" ADD COLUMN "subjectType" "HealthSubjectType" NOT NULL DEFAULT 'beneficiary',
ADD COLUMN "childId" UUID,
ADD COLUMN "dependentPersonId" UUID;

-- CreateTable
CREATE TABLE "dependent_person" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "beneficiaryId" UUID NOT NULL,
    "relationType" "CareRelationType" NOT NULL,
    "relationOther" TEXT,
    "firstNameEnc" BYTEA NOT NULL,
    "lastNameEnc" BYTEA NOT NULL,
    "fullNameHash" BYTEA NOT NULL,
    "gender" "Gender" NOT NULL,
    "dateOfBirth" DATE,
    "cinEnc" BYTEA,
    "cinHash" BYTEA,
    "phoneEnc" BYTEA,
    "notesEnc" BYTEA,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "dependent_person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiary_access_grant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beneficiary_access_grant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dependent_person_beneficiaryId_idx" ON "dependent_person"("beneficiaryId");

-- CreateIndex
CREATE INDEX "disease_childId_idx" ON "disease"("childId");

-- CreateIndex
CREATE INDEX "disease_dependentPersonId_idx" ON "disease"("dependentPersonId");

-- CreateIndex
CREATE INDEX "beneficiary_access_grant_expiresAt_idx" ON "beneficiary_access_grant"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiary_access_grant_organizationId_userId_key" ON "beneficiary_access_grant"("organizationId", "userId");

-- AddForeignKey
ALTER TABLE "dependent_person" ADD CONSTRAINT "dependent_person_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disease" ADD CONSTRAINT "disease_childId_fkey" FOREIGN KEY ("childId") REFERENCES "child"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disease" ADD CONSTRAINT "disease_dependentPersonId_fkey" FOREIGN KEY ("dependentPersonId") REFERENCES "dependent_person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_access_grant" ADD CONSTRAINT "beneficiary_access_grant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_access_grant" ADD CONSTRAINT "beneficiary_access_grant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Fix governorate display names (strip suffix, UTF-8 names from seed)
UPDATE governorate SET name = REPLACE(name, ' Governorate', '') WHERE name LIKE '% Governorate';
