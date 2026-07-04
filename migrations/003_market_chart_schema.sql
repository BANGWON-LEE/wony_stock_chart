-- Market chart schema (MySQL 8+)
-- Source: docs/technical/006-market-chart-server-design-v0.md

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE ohlcv_candles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  market ENUM('KR', 'US') NOT NULL,
  symbol VARCHAR(32) NOT NULL,
  interval_type ENUM('1d') NOT NULL,
  started_at DATETIME(3) NOT NULL,
  open_price DECIMAL(20,6) NOT NULL,
  high_price DECIMAL(20,6) NOT NULL,
  low_price DECIMAL(20,6) NOT NULL,
  close_price DECIMAL(20,6) NOT NULL,
  volume DECIMAL(24,6) NOT NULL,
  source ENUM('KIS') NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_ohlcv_market_symbol_interval_started (market, symbol, interval_type, started_at),
  KEY idx_ohlcv_lookup (market, symbol, interval_type, started_at DESC),
  CONSTRAINT chk_ohlcv_prices_non_negative CHECK (
    open_price >= 0 AND high_price >= 0 AND low_price >= 0 AND close_price >= 0
  ),
  CONSTRAINT chk_ohlcv_volume_non_negative CHECK (volume >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
