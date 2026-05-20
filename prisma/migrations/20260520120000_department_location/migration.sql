-- Main department location (governorate + delegation/city names, same as beneficiary region/city)
ALTER TABLE "department" ADD COLUMN IF NOT EXISTS "region" TEXT;
ALTER TABLE "department" ADD COLUMN IF NOT EXISTS "city" TEXT;
