-- Donation spending preference (category vs campaign); was in Prisma schema but missing from DB on some deployments.
ALTER TABLE "donation" ADD COLUMN IF NOT EXISTS "spendCategory" TEXT;
