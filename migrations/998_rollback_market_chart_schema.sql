-- Rollback for market chart schema
-- Drops objects created by migrations/003_market_chart_schema.sql

SET NAMES utf8mb4;
SET time_zone = '+00:00';

DROP TABLE IF EXISTS ohlcv_candles;
