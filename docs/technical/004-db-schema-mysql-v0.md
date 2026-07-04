# DB Schema (MySQL) 상세명세 v0

## 1. 문서 목적
- MVP 구현에 필요한 MySQL 스키마를 고정한다.
- API/워커가 공통으로 의존할 테이블, 인덱스, 제약조건, 상태전이 규칙을 정의한다.

- MySQL 8+ 기준
- 도메인: 인증, 브로커 연결, 포트폴리오 스냅샷, 알림 규칙/이력, 리프레시 토큰, 차트 캔들 캐시
- 마이그레이션 도구 중립(SQL 기준)

## 3. 공통 규칙
1. 시간 컬럼은 UTC 저장 (`DATETIME(3)`).
2. 금액/수량은 `DECIMAL` 사용(부동소수 금지).
3. PK는 `BIGINT UNSIGNED AUTO_INCREMENT`.
4. 외부 노출 ID가 필요하면 `public_id`(문자열) 별도 운용 가능.
5. 문자셋은 `utf8mb4`, Collation은 `utf8mb4_0900_ai_ci`.

## 4. 테이블 DDL 초안
## 4.1 users
```sql
CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

## 4.2 broker_connections
```sql
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
```

## 4.3 portfolio_snapshots
```sql
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
```

## 4.4 positions
```sql
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
```

## 4.5 alert_rules
```sql
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
```

## 4.6 alert_events
```sql
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
```

## 4.7 refresh_tokens
```sql
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
```

## 4.8 ohlcv_candles
```sql
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
```

## 5. 핵심 쿼리 계약
## 5.1 활성 알림 규칙 조회
```sql
SELECT id, user_id, scope, symbol, direction, target_value, state
FROM alert_rules
WHERE user_id = ? AND enabled = 1;
```

## 5.2 `armed -> triggered` 조건부 전이
```sql
UPDATE alert_rules
SET state = 'triggered', updated_at = CURRENT_TIMESTAMP(3)
WHERE id = ? AND user_id = ? AND state = 'armed' AND enabled = 1;
```
- `affected_rows = 1`인 워커만 `alert_events` insert 수행.

## 5.3 `triggered -> armed` re-arm 전이
```sql
UPDATE alert_rules
SET state = 'armed', updated_at = CURRENT_TIMESTAMP(3)
WHERE id = ? AND user_id = ? AND state = 'triggered' AND enabled = 1;
```

## 5.4 알림 이력 조회 (최신순 고정 + cursor)
```sql
SELECT id, rule_id, symbol, direction, trigger_value, channel, delivery_status, triggered_at, dispatch_started_at
FROM alert_events
WHERE user_id = ?
  AND (? IS NULL OR id < ?)
ORDER BY triggered_at DESC, id DESC
LIMIT ?;
```

## 5.5 차트 일봉 조회
```sql
SELECT started_at, open_price, high_price, low_price, close_price, volume, source
FROM ohlcv_candles
WHERE market = ?
  AND symbol = ?
  AND interval_type = '1d'
  AND started_at BETWEEN ? AND ?
ORDER BY started_at ASC
LIMIT ?;
```

## 5.6 차트 일봉 upsert
```sql
INSERT INTO ohlcv_candles (
  market, symbol, interval_type, started_at,
  open_price, high_price, low_price, close_price, volume, source
) VALUES (?, ?, '1d', ?, ?, ?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
  open_price = VALUES(open_price),
  high_price = VALUES(high_price),
  low_price = VALUES(low_price),
  close_price = VALUES(close_price),
  volume = VALUES(volume),
  source = VALUES(source),
  updated_at = CURRENT_TIMESTAMP(3);
```

## 6. 마이그레이션 순서
1. `users`
2. `broker_connections`
3. `portfolio_snapshots`
4. `positions`
5. `alert_rules`
6. `alert_events`
7. `refresh_tokens`
8. `ohlcv_candles`
9. 인덱스/체크 제약 추가

## 7. 롤백 원칙
1. 역순으로 FK 의존 제거 후 테이블 삭제.
2. 운영 DB 롤백은 데이터 보존 덤프 후 진행.
3. 토큰/알림 이력 테이블 롤백 시 보안 감사 로그 보존 확인.

## 8. 운영 점검 항목
1. `alert_events` 인덱스(`user_id, triggered_at, id`) 사용 여부 `EXPLAIN` 점검.
2. `alert_rules` 조건부 업데이트 경합률 모니터링.
3. `refresh_tokens` 만료/폐기 배치 정리 작업(예: 1일 1회).
4. UTC 저장/KST 변환 표시가 API 계층에서 일관적인지 확인.
5. `ohlcv_candles` 조회가 `(market, symbol, interval_type, started_at)` 인덱스를 사용하는지 확인.

## 9. 검증 체크리스트
1. `scope/symbol` CHECK 제약이 기대대로 동작하는가.
2. 동일 규칙 동시 전이 시 이벤트 중복 insert가 방지되는가.
3. `GET /alerts/history`가 대량 데이터에서도 최신순 커서 조회 성능을 유지하는가.
4. 로그아웃 후 해당 Refresh Token으로 재발급이 차단되는가.
5. FX 정책 값(`FIXED_DAILY_0900_KST`)이 스냅샷에 일관되게 기록되는가.
6. 동일 일봉 upsert 시 중복 row가 생성되지 않고 기존 row가 갱신되는가.

## 10. 연관 문서
- `docs/technical/001-mvp-시스템-기술설계서-v0.md`
- `docs/technical/002-api-상세명세서-v0.md`
- `docs/technical/003-alerting-운영정책-v0.md`
- `docs/technical/006-market-chart-server-design-v0.md`
- `docs/decisions/database/002-mysql-선정-이유-mvp.md`
- `docs/decisions/security/001-jwt-access-refresh-정책.md`
