-- Recently Deleted storage for Hardware Tools Inventory.
-- Run this same script once in each database:
--   Local: hardware_inventory_local
--   Online: defaultdb (Aiven)
--
-- This creates one dedicated table only. It does NOT alter, delete, or rewrite
-- products, stock_in, sales, damaged_items, app_users, or store_settings.
-- The API must store the full original row as JSON before removing it from
-- its source table, and must validate source_database before restoring it.

CREATE TABLE IF NOT EXISTS deleted_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_uid VARCHAR(128) NOT NULL,
  source_database VARCHAR(128) NOT NULL,
  record_type VARCHAR(32) NOT NULL,
  original_record_id BIGINT UNSIGNED NOT NULL,
  original_product_id BIGINT UNSIGNED NULL,
  delete_batch_id CHAR(36) NULL,
  record_data JSON NOT NULL,
  deleted_by VARCHAR(128) NOT NULL,
  deleted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_deleted_records_user (user_uid),
  KEY idx_deleted_records_expiry (expires_at),
  KEY idx_deleted_records_user_type (user_uid, record_type),
  KEY idx_deleted_records_original (user_uid, record_type, original_record_id),
  KEY idx_deleted_records_batch (user_uid, delete_batch_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
