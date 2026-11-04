-- Per-user inventory ownership migration
-- Target database: the same Aiven MySQL database used by the Express API.
-- IMPORTANT: Take a database backup before running this migration.
-- Existing product #1 (Nail Gun) is assigned to Macleen Fetalver.
-- This migration deliberately does not delete or modify transaction rows.

ALTER TABLE products
  ADD COLUMN user_uid VARCHAR(128) NULL AFTER id,
  ADD KEY idx_products_user_uid (user_uid);

UPDATE products
SET user_uid = 'kbCoQxcRfZYEH4n97bQsCNHyOHY2'
WHERE id = 1
  AND user_uid IS NULL;

-- Verify every existing product has an owner before making the column mandatory.
-- If this query returns any rows, STOP and assign each product to its correct owner.
SELECT id, product
FROM products
WHERE user_uid IS NULL;

-- Run the following ALTER only after the verification query returns 0 rows:
-- ALTER TABLE products MODIFY user_uid VARCHAR(128) NOT NULL;

-- Transaction ownership is derived through products.product_id:
-- stock_in, sales, and damaged_items remain linked to their product records.
-- Do not add client-supplied user_uid fields to those transaction tables.
