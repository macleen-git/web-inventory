-- Per-user inventory ownership migration
-- Run once against the Aiven MySQL database used by the Express API.
-- Back up the database before running this migration.
-- The current products query showed only product #1 (Nail Gun),
-- confirmed by the user as belonging to Macleen Fetalver.
-- This migration does not delete or modify transaction rows.

ALTER TABLE products
  ADD COLUMN user_uid VARCHAR(128) NULL AFTER id,
  ADD KEY idx_products_user_uid (user_uid);

UPDATE products
SET user_uid = 'kbCoQxcRfZYEH4n97bQsCNHyOHY2'
WHERE id = 1
  AND user_uid IS NULL;

-- Safety verification: this must return zero rows before continuing.
SELECT id, product
FROM products
WHERE user_uid IS NULL;

-- The user confirmed the query returned exactly one product, Nail Gun.
-- Make ownership mandatory for all future products.
ALTER TABLE products
  MODIFY user_uid VARCHAR(128) NOT NULL;

-- Transaction ownership is derived through products.product_id:
-- stock_in, sales, and damaged_items remain linked to their product records.
-- Never accept a client-supplied user_uid for transaction ownership.
