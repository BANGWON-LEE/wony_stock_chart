-- Dev seed data for local MVP testing
-- Depends on: migrations/001_init_schema.sql

SET NAMES utf8mb4;
SET time_zone = '+00:00';

START TRANSACTION;

-- users
INSERT INTO users (id, email, password_hash)
VALUES
  (1001, 'alice@example.com', '$2b$12$dev_only_hash_alice'),
  (1002, 'bob@example.com', '$2b$12$dev_only_hash_bob');

-- broker_connections
INSERT INTO broker_connections (id, user_id, broker_type, encrypted_credentials, status)
VALUES
  (
    2001,
    1001,
    'KIS',
    JSON_OBJECT('appKey', 'enc_app_key', 'appSecret', 'enc_app_secret', 'accountNo', 'enc_account_no'),
    'ACTIVE'
  ),
  (
    2002,
    1002,
    'KIS',
    JSON_OBJECT('appKey', 'enc_app_key_b', 'appSecret', 'enc_app_secret_b', 'accountNo', 'enc_account_no_b'),
    'ACTIVE'
  );

-- positions
INSERT INTO positions (
  id, user_id, broker_type, symbol, market, quantity, avg_price, current_price, currency, updated_at
)
VALUES
  (3001, 1001, 'KIS', '005930', 'KR', 10.000000, 70000.000000, 74500.000000, 'KRW', '2026-05-13 09:00:00.000'),
  (3002, 1001, 'KIS', 'AAPL',   'US',  2.000000,   180.000000,   186.500000, 'USD', '2026-05-13 09:00:00.000'),
  (3003, 1002, 'KIS', '035420', 'KR', 15.000000, 210000.000000, 208500.000000, 'KRW', '2026-05-13 09:00:00.000');

-- portfolio_snapshots
INSERT INTO portfolio_snapshots (
  id, user_id, base_currency, fx_policy, total_value, total_pnl, total_return, snapshot_at
)
VALUES
  (4001, 1001, 'KRW', 'FIXED_DAILY_0900_KST', 12500000.5000, 350000.5000, 2.8800, '2026-05-13 09:00:00.000'),
  (4002, 1002, 'KRW', 'FIXED_DAILY_0900_KST',  8600000.0000, -90000.0000, -1.0300, '2026-05-13 09:00:00.000');

-- alert_rules (MVP IN_APP only)
INSERT INTO alert_rules (
  id, user_id, scope, symbol, direction, target_value, channels, state, enabled
)
VALUES
  (5001, 1001, 'symbol', '005930', 'above', 80000.000000, JSON_ARRAY('IN_APP'), 'armed', 1),
  (5002, 1001, 'portfolio', NULL, 'below', 12000000.000000, JSON_ARRAY('IN_APP'), 'triggered', 1),
  (5003, 1002, 'symbol', '035420', 'below', 200000.000000, JSON_ARRAY('IN_APP'), 'armed', 1);

-- alert_events
INSERT INTO alert_events (
  id, rule_id, user_id, symbol, direction, trigger_value, channel, delivery_status,
  triggered_at, dispatch_started_at, delivered_at, error_code, error_message
)
VALUES
  (
    6001, 5002, 1001, NULL, 'below', 11995000.000000, 'IN_APP', 'DELIVERED',
    '2026-05-13 09:10:00.000', '2026-05-13 09:10:00.500', '2026-05-13 09:10:00.700', NULL, NULL
  ),
  (
    6002, 5001, 1001, '005930', 'above', 80010.000000, 'IN_APP', 'FAILED',
    '2026-05-13 09:20:00.000', '2026-05-13 09:20:00.300', NULL, 'IN_APP_STORE_ERROR', 'dev simulated failure'
  );

-- refresh_tokens (SHA-256 hex placeholder)
INSERT INTO refresh_tokens (
  id, user_id, token_hash, expires_at, revoked_at, replaced_by_token_id, user_agent, ip_address
)
VALUES
  (
    7001,
    1001,
    '1111111111111111111111111111111111111111111111111111111111111111',
    '2026-05-20 00:00:00.000',
    NULL,
    NULL,
    'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
    '127.0.0.1'
  ),
  (
    7002,
    1002,
    '2222222222222222222222222222222222222222222222222222222222222222',
    '2026-05-20 00:00:00.000',
    '2026-05-13 10:00:00.000',
    NULL,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    '127.0.0.1'
  );

COMMIT;
