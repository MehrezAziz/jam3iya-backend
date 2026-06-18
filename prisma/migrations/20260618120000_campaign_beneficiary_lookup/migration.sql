-- CreateEnum
CREATE TYPE "BeneficiaryLookupField" AS ENUM ('name', 'phone', 'cin', 'code');

-- AlterTable
ALTER TABLE "campaign"
ADD COLUMN "beneficiaryLookupFields" "BeneficiaryLookupField"[] NOT NULL DEFAULT ARRAY['name', 'phone', 'cin']::"BeneficiaryLookupField"[];
