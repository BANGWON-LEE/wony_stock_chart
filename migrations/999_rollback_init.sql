-- Rollback for MVP initial schema
-- Drops objects created by migrations/001_init_schema.sql and dependent extension migrations.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS ohlcv_candles;
DROP TABLE IF EXISTS alert_events;
DROP TABLE IF EXISTS alert_rules;
DROP TABLE IF EXISTS positions;
DROP TABLE IF EXISTS portfolio_snapshots;
DROP TABLE IF EXISTS broker_connections;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;
