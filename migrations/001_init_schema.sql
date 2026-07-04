-- MVP Initial Schema (MySQL 8+)
-- Source: docs/technical/004-db-schema-mysql-v0.md

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE broker_connections (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  broker_type ENUM('KIS') NOT NULL,
  encrypted_credentials JSON NOT NULL,
  status ENUM('ACTIVE', 'INACTIVE', 'ERROR') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_broker_connections_user_id (user_id),
  CONSTRAINT fk_broker_connections_user_id FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE portfolio_snapshots (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  base_currency CHAR(3) NOT NULL,
  fx_policy ENUM('FIXED_DAILY_0900_KST') NOT NULL DEFAULT 'FIXED_DAILY_0900_KST',
  total_value DECIMAL(20,4) NOT NULL,
  total_pnl DECIMAL(20,4) NOT NULL,
  total_return DECIMAL(9,4) NOT NULL,
  snapshot_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_portfolio_snapshots_user_snapshot (user_id, snapshot_at DESC),
  CONSTRAINT fk_portfolio_snapshots_user_id FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE positions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  broker_type ENUM('KIS') NOT NULL,
  symbol VARCHAR(32) NOT NULL,
  market ENUM('KR', 'US') NOT NULL,
  quantity DECIMAL(20,6) NOT NULL,
  avg_price DECIMAL(20,6) NOT NULL,
  current_price DECIMAL(20,6) NOT NULL,
  currency CHAR(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_positions_user_broker_symbol (user_id, broker_type, symbol),
  KEY idx_positions_user_market (user_id, market),
  CONSTRAINT fk_positions_user_id FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE alert_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  scope ENUM('portfolio', 'symbol') NOT NULL,
  symbol VARCHAR(32) NULL,
  direction ENUM('above', 'below') NOT NULL,
  target_value DECIMAL(20,6) NOT NULL,
  channels JSON NOT NULL,
  state ENUM('armed', 'triggered') NOT NULL DEFAULT 'armed',
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_alert_rules_user_enabled (user_id, enabled),
  KEY idx_alert_rules_user_scope_symbol (user_id, scope, symbol),
  CONSTRAINT fk_alert_rules_user_id FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT chk_alert_rules_target_value_positive CHECK (target_value > 0),
  CONSTRAINT chk_alert_rules_scope_symbol CHECK (
    (scope = 'portfolio' AND symbol IS NULL) OR
    (scope = 'symbol' AND symbol IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE alert_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  rule_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  symbol VARCHAR(32) NULL,
  direction ENUM('above', 'below') NOT NULL,
  trigger_value DECIMAL(20,6) NOT NULL,
  channel ENUM('IN_APP') NOT NULL,
  delivery_status ENUM('STARTED', 'DELIVERED', 'FAILED') NOT NULL DEFAULT 'STARTED',
  triggered_at DATETIME(3) NOT NULL,
  dispatch_started_at DATETIME(3) NOT NULL,
  delivered_at DATETIME(3) NULL,
  error_code VARCHAR(64) NULL,
  error_message VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_alert_events_user_triggered (user_id, triggered_at DESC, id DESC),
  KEY idx_alert_events_rule_triggered (rule_id, triggered_at DESC),
  CONSTRAINT fk_alert_events_rule_id FOREIGN KEY (rule_id) REFERENCES alert_rules(id),
  CONSTRAINT fk_alert_events_user_id FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE refresh_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  replaced_by_token_id BIGINT UNSIGNED NULL,
  user_agent VARCHAR(255) NULL,
  ip_address VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_tokens_token_hash (token_hash),
  KEY idx_refresh_tokens_user_expires (user_id, expires_at),
  KEY idx_refresh_tokens_user_revoked (user_id, revoked_at),
  CONSTRAINT fk_refresh_tokens_user_id FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_refresh_tokens_replaced_by FOREIGN KEY (replaced_by_token_id) REFERENCES refresh_tokens(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
