-- Hardware Inventory: MySQL-backed user directory and activity analytics
-- Run this migration once against the same database used by the Express API.
CREATE TABLE IF NOT EXISTS app_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  firebase_uid VARCHAR(128) NOT NULL,
  display_name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL DEFAULT '',
  photo_url TEXT NULL,
  role ENUM('user','admin','superadmin') NOT NULL DEFAULT 'user',
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  last_seen_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_app_users_firebase_uid (firebase_uid),
  KEY idx_app_users_role_status (role,status),
  KEY idx_app_users_created_at (created_at),
  KEY idx_app_users_last_seen (last_seen_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  firebase_uid VARCHAR(128) NOT NULL,
  event_type VARCHAR(40) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_activity_created_at (created_at),
  KEY idx_activity_user_created (firebase_uid,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- After the first account sync, promote the intended administrator using its Firebase UID:
-- UPDATE app_users SET role='admin' WHERE firebase_uid='YOUR_FIREBASE_UID';
-- Do not expose this SQL or allow clients to choose their own role.
