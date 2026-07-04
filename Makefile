SHELL := /bin/bash

.PHONY: help db-init db-seed db-chart db-verify db-chart-rollback db-rollback db-reset

help:
	@echo "Available targets:"
	@echo "  make db-init      - Apply schema migration (001_init_schema.sql)"
	@echo "  make db-seed      - Apply dev seed data (002_seed_dev_data.sql)"
	@echo "  make db-chart     - Apply chart schema migration (003_market_chart_schema.sql)"
	@echo "  make db-verify    - Verify tables, counts, index usage, state transition"
	@echo "  make db-chart-rollback - Drop chart schema objects (998_rollback_market_chart_schema.sql)"
	@echo "  make db-rollback  - Drop schema objects (999_rollback_init.sql)"
	@echo "  make db-reset     - Rollback + init + seed"
	@echo ""
	@echo "Required env vars: DB_HOST DB_PORT DB_NAME DB_USER DB_PASS"

check-env:
	@: "$${DB_HOST:?DB_HOST is required}"
	@: "$${DB_PORT:?DB_PORT is required}"
	@: "$${DB_NAME:?DB_NAME is required}"
	@: "$${DB_USER:?DB_USER is required}"
	@: "$${DB_PASS:?DB_PASS is required}"

db-init: check-env
	mysql -h "$$DB_HOST" -P "$$DB_PORT" -u "$$DB_USER" -p"$$DB_PASS" -e "CREATE DATABASE IF NOT EXISTS \`$$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
	mysql -h "$$DB_HOST" -P "$$DB_PORT" -u "$$DB_USER" -p"$$DB_PASS" "$$DB_NAME" < migrations/001_init_schema.sql
	@echo "[db-init] done"

db-seed: check-env
	mysql -h "$$DB_HOST" -P "$$DB_PORT" -u "$$DB_USER" -p"$$DB_PASS" "$$DB_NAME" < migrations/002_seed_dev_data.sql
	@echo "[db-seed] done"

db-chart: check-env
	mysql -h "$$DB_HOST" -P "$$DB_PORT" -u "$$DB_USER" -p"$$DB_PASS" "$$DB_NAME" < migrations/003_market_chart_schema.sql
	@echo "[db-chart] done"

db-verify: check-env
	@echo "== tables =="
	mysql -h "$$DB_HOST" -P "$$DB_PORT" -u "$$DB_USER" -p"$$DB_PASS" "$$DB_NAME" -e "SHOW TABLES;"
	@echo ""
	@echo "== row counts =="
	mysql -h "$$DB_HOST" -P "$$DB_PORT" -u "$$DB_USER" -p"$$DB_PASS" "$$DB_NAME" -e "\
SELECT 'users' AS t, COUNT(*) AS c FROM users \
UNION ALL SELECT 'broker_connections', COUNT(*) FROM broker_connections \
UNION ALL SELECT 'positions', COUNT(*) FROM positions \
UNION ALL SELECT 'portfolio_snapshots', COUNT(*) FROM portfolio_snapshots \
UNION ALL SELECT 'alert_rules', COUNT(*) FROM alert_rules \
UNION ALL SELECT 'alert_events', COUNT(*) FROM alert_events \
UNION ALL SELECT 'refresh_tokens', COUNT(*) FROM refresh_tokens \
UNION ALL SELECT 'ohlcv_candles', COUNT(*) FROM ohlcv_candles;"
	@echo ""
	@echo "== alerts history index explain =="
	mysql -h "$$DB_HOST" -P "$$DB_PORT" -u "$$DB_USER" -p"$$DB_PASS" "$$DB_NAME" -e "\
EXPLAIN SELECT id, user_id, triggered_at FROM alert_events \
WHERE user_id = 1001 \
ORDER BY triggered_at DESC, id DESC \
LIMIT 20;"
	@echo ""
	@echo "== conditional state transition check =="
	mysql -h "$$DB_HOST" -P "$$DB_PORT" -u "$$DB_USER" -p"$$DB_PASS" "$$DB_NAME" -e "\
UPDATE alert_rules \
SET state='triggered', updated_at=CURRENT_TIMESTAMP(3) \
WHERE id=5001 AND user_id=1001 AND state='armed' AND enabled=1; \
SELECT ROW_COUNT() AS affected_rows;"
	@echo ""
	@echo "== chart candles index explain =="
	mysql -h "$$DB_HOST" -P "$$DB_PORT" -u "$$DB_USER" -p"$$DB_PASS" "$$DB_NAME" -e "\
EXPLAIN SELECT started_at, open_price, high_price, low_price, close_price, volume \
FROM ohlcv_candles \
WHERE market = 'KR' \
  AND symbol = '005930' \
  AND interval_type = '1d' \
  AND started_at BETWEEN '2025-01-01 00:00:00.000' AND '2026-06-19 00:00:00.000' \
ORDER BY started_at ASC \
LIMIT 500;"
	@echo "[db-verify] done"

db-chart-rollback: check-env
	mysql -h "$$DB_HOST" -P "$$DB_PORT" -u "$$DB_USER" -p"$$DB_PASS" "$$DB_NAME" < migrations/998_rollback_market_chart_schema.sql
	@echo "[db-chart-rollback] done"

db-rollback: check-env
	mysql -h "$$DB_HOST" -P "$$DB_PORT" -u "$$DB_USER" -p"$$DB_PASS" "$$DB_NAME" < migrations/999_rollback_init.sql
	@echo "[db-rollback] done"

db-reset: db-rollback db-init db-seed db-chart
	@echo "[db-reset] done"
