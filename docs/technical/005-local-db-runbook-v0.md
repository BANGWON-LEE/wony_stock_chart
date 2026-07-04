# Local DB Runbook v0 (MySQL)

## 1. 문서 목적
- 로컬 환경에서 MVP DB 스키마를 안전하게 적용/검증/롤백하는 절차를 제공한다.
- 대상 스크립트:
  - `migrations/001_init_schema.sql`
  - `migrations/002_seed_dev_data.sql`
  - `migrations/003_market_chart_schema.sql`
  - `migrations/998_rollback_market_chart_schema.sql`
  - `migrations/999_rollback_init.sql`

## 2. 사전 조건
1. MySQL 8+ 실행 중
2. DB/계정 준비 완료
3. 터미널에서 `mysql` CLI 사용 가능

예시 환경변수:
```bash
export DB_HOST=127.0.0.1
export DB_PORT=3306
export DB_NAME=chart_mvp
export DB_USER=chart_user
export DB_PASS=chart_password
```

## 3. 적용 절차
## 3.1 DB 생성 (최초 1회)
```bash
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
```

## 3.2 초기 스키마 적용
```bash
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < migrations/001_init_schema.sql
```

## 3.3 개발 시드 적용 (선택)
```bash
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < migrations/002_seed_dev_data.sql
```

## 3.4 차트 스키마 적용
```bash
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < migrations/003_market_chart_schema.sql
```

## 4. 검증 절차
## 4.1 테이블 생성 확인
```bash
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SHOW TABLES;"
```
기대 테이블:
- `users`
- `broker_connections`
- `portfolio_snapshots`
- `positions`
- `alert_rules`
- `alert_events`
- `refresh_tokens`
- `ohlcv_candles`

## 4.2 건수 확인 (시드 적용 시)
```bash
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "\
SELECT 'users' AS t, COUNT(*) AS c FROM users
UNION ALL SELECT 'broker_connections', COUNT(*) FROM broker_connections
UNION ALL SELECT 'positions', COUNT(*) FROM positions
UNION ALL SELECT 'portfolio_snapshots', COUNT(*) FROM portfolio_snapshots
UNION ALL SELECT 'alert_rules', COUNT(*) FROM alert_rules
UNION ALL SELECT 'alert_events', COUNT(*) FROM alert_events
UNION ALL SELECT 'refresh_tokens', COUNT(*) FROM refresh_tokens
UNION ALL SELECT 'ohlcv_candles', COUNT(*) FROM ohlcv_candles;"
```

## 4.3 핵심 정책 검증 쿼리
1. 알림 채널 정책(`IN_APP only`)
```bash
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "\
SELECT id, channels FROM alert_rules;"
```

2. 알림 이력 최신순 조회 인덱스 확인
```bash
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "\
EXPLAIN SELECT id, user_id, triggered_at FROM alert_events
WHERE user_id = 1001
ORDER BY triggered_at DESC, id DESC
LIMIT 20;"
```
기대: `idx_alert_events_user_triggered` 사용.

3. 조건부 상태전이 검증 (`armed -> triggered`)
```bash
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "\
UPDATE alert_rules
SET state='triggered', updated_at=CURRENT_TIMESTAMP(3)
WHERE id=5001 AND user_id=1001 AND state='armed' AND enabled=1;
SELECT ROW_COUNT() AS affected_rows;"
```
기대: 첫 실행 `affected_rows=1`, 재실행 `affected_rows=0`.

4. 차트 일봉 조회 인덱스 확인
```bash
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "\
EXPLAIN SELECT started_at, open_price, high_price, low_price, close_price, volume
FROM ohlcv_candles
WHERE market = 'KR'
  AND symbol = '005930'
  AND interval_type = '1d'
  AND started_at BETWEEN '2025-01-01 00:00:00.000' AND '2026-06-19 00:00:00.000'
ORDER BY started_at ASC
LIMIT 500;"
```
기대: `idx_ohlcv_lookup` 또는 `uq_ohlcv_market_symbol_interval_started` 사용.

## 5. 차트 스키마 롤백
```bash
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < migrations/998_rollback_market_chart_schema.sql
```

## 6. 전체 롤백 절차
```bash
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < migrations/999_rollback_init.sql
```

롤백 확인:
```bash
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SHOW TABLES;"
```
기대: 테이블 없음(또는 기존 별도 테이블만 존재).

## 7. 재적용(클린 재시작) 절차
1. `999_rollback_init.sql` 실행
2. `001_init_schema.sql` 실행
3. `002_seed_dev_data.sql` 실행(선택)
4. `003_market_chart_schema.sql` 실행
5. `4. 검증 절차` 재실행

## 8. 장애 대응 메모
1. `CHECK` 제약 오류:
- `alert_rules.scope/symbol` 규칙 위반 데이터 여부 확인.

2. FK 오류:
- 삽입 순서가 `users` 선행인지 확인.

3. 중복키 오류:
- 시드를 재실행한 경우 기존 데이터 삭제 또는 롤백 후 재적용.

4. `ohlcv_candles` 중복키 오류:
- 동일 `(market, symbol, interval_type, started_at)` 데이터는 insert가 아니라 upsert 경로를 사용해야 한다.

## 9. 연관 문서
- `docs/technical/004-db-schema-mysql-v0.md`
- `docs/technical/003-alerting-운영정책-v0.md`
- `docs/technical/006-market-chart-server-design-v0.md`
