-- Recoverable delete migration for Hardware Tools Inventory.
-- Run once against the LOCAL database, then separately against the ONLINE database.
-- This migration only adds nullable metadata columns; it does not delete or rewrite records.

ALTER TABLE products
  ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL,
  ADD COLUMN deleted_by VARCHAR(128) NULL DEFAULT NULL,
  ADD INDEX idx_products_deleted_at (deleted_at);

ALTER TABLE stock_in
  ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL,
  ADD COLUMN deleted_by VARCHAR(128) NULL DEFAULT NULL,
  ADD INDEX idx_stock_in_deleted_at (deleted_at);

ALTER TABLE sales
  ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL,
  ADD COLUMN deleted_by VARCHAR(128) NULL DEFAULT NULL,
  ADD INDEX idx_sales_deleted_at (deleted_at);

ALTER TABLE damaged_items
  ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL,
  ADD COLUMN deleted_by VARCHAR(128) NULL DEFAULT NULL,
  ADD INDEX idx_damaged_items_deleted_at (deleted_at);
