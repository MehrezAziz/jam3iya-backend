-- Inventory item: free-text category + default pack quantity (schema drift on some deployments).
ALTER TABLE "inventory_item" ADD COLUMN IF NOT EXISTS "defaultQuantity" DECIMAL(14,3);

ALTER TABLE "inventory_item" ALTER COLUMN "category" TYPE TEXT USING "category"::text;

DROP TYPE IF EXISTS "InventoryCategory";
