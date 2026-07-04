# Alerting 운영정책 v0

## 1. 문서 목적
- MVP 알림 기능의 동작 규칙을 구현 가능한 수준으로 고정한다.
- 알림 중복방지, 상태전이, 이력조회, 운영 점검 기준을 명확히 한다.

## 2. 적용 범위 (MVP)
- 채널: `IN_APP` only
- 스코프: `portfolio`, `symbol`
- 방향: `above`, `below`
- 이벤트 소스: `quote_update`, `portfolio_tick`

## 3. 연관 API
- `POST /alerts/rules`
- `GET /alerts/rules`
- `PATCH /alerts/rules/:id`
- `DELETE /alerts/rules/:id`
- `GET /alerts/history` (최신순 고정)

## 4. 데이터 모델
## 4.1 AlertRule
- `id` (PK)
- `user_id` (FK)
- `scope` (`portfolio` | `symbol`)
- `symbol` (nullable, `scope=symbol`일 때 필수)
- `direction` (`above` | `below`)
- `target_value` (Decimal string)
- `channels` (MVP: `["IN_APP"]` 고정)
- `state` (`armed` | `triggered`)
- `enabled` (boolean)
- `created_at`, `updated_at`

## 4.2 AlertEvent
- `id` (PK)
- `rule_id` (FK)
- `user_id`
- `symbol` (nullable)
- `direction`
- `trigger_value`
- `channel` (`IN_APP`)
- `delivery_status` (`STARTED` | `DELIVERED` | `FAILED`)
- `triggered_at`
- `dispatch_started_at`
- `delivered_at` (nullable)
- `error_code` (nullable)
- `error_message` (nullable)

## 5. 유효성 규칙
1. `targetValue`는 0 초과 Decimal 문자열이어야 한다.
2. `scope=portfolio`이면 `symbol`은 null이어야 한다.
3. `scope=symbol`이면 `symbol`은 필수다.
4. `channels`는 MVP에서 `["IN_APP"]`만 허용한다.
5. 비활성(`enabled=false`) 규칙은 평가 대상에서 제외한다.

## 6. 판정 기준
## 6.1 비교 입력값
- `scope=symbol`: 해당 심볼의 최신 가격
- `scope=portfolio`: 사용자 최신 `totalValue`

## 6.2 crossing 정의
- `direction=above`: 직전값 `< target` 이고 현재값 `>= target`
- `direction=below`: 직전값 `> target` 이고 현재값 `<= target`

## 7. 상태 전이
초기 상태는 `armed`다.

1. `armed -> triggered`
- 조건: 규칙 방향 기준 crossing 발생
- 처리: 알림 이벤트 생성 + In-app 디스패치 시작

2. `triggered -> armed` (re-arm)
- 조건: 반대 방향 crossing 발생
- 처리: 재무장만 수행, 알림 발송 없음

## 8. 중복 방지 정책
1. 동일 규칙은 동일 방향 crossing에서 1회만 발송한다.
2. 원자적 전이 보장:
- `UPDATE alert_rules SET state='triggered' ... WHERE id=? AND state='armed' AND enabled=1`
3. 조건부 업데이트 성공한 워커만 이벤트를 생성한다.
4. 실패/경합 시 재시도는 하되, 이벤트 중복 insert를 금지한다.

## 9. 처리 흐름
1. 시세/포트폴리오 이벤트 수신
2. 사용자별 활성 규칙 조회
3. crossing 판정
4. 규칙 상태 조건부 업데이트
5. `AlertEvent` insert (`delivery_status=STARTED`)
6. In-app 알림 레코드 생성/전달
7. 성공 시 `DELIVERED`, 실패 시 `FAILED` 업데이트

## 10. `GET /alerts/history` 정책
1. 정렬: `triggeredAt DESC` 고정
2. 페이징: cursor 기반 (`nextCursor`)
3. 기본 `limit=20`, 최대 `100`
4. 사용자 소유 이벤트만 조회 가능

예시 쿼리:
- `WHERE user_id = :userId AND id < :cursor ORDER BY triggered_at DESC, id DESC LIMIT :limit`

## 11. 실패 처리 및 재시도
1. In-app 저장 실패 시 동일 이벤트에 대해 최대 3회 재시도
2. 최종 실패 시 `delivery_status=FAILED` + 오류코드 기록
3. 재시도 백오프: 1s, 3s, 10s
4. 재시도 중에도 규칙 상태는 `triggered` 유지 (중복 발송 방지)

## 12. 운영 가드레일
1. 사용자당 활성 규칙 수 제한: 기본 100개
2. 심볼당 초당 평가 상한(폭주 방지) 적용
3. API/워커 로그에 `X-Request-Id` 또는 내부 trace id 전파
4. 토큰/계좌/개인정보 마스킹 로그 정책 준수

## 13. 모니터링 지표
1. `alert_dispatch_start_latency_ms` p50/p95/p99
2. `alerts_triggered_total`
3. `alerts_delivered_total`
4. `alerts_failed_total`
5. `alert_rearm_total`
6. `dedup_conflict_total` (조건부 업데이트 경합 수)

## 14. 검증 체크리스트
1. 같은 방향 재진입에서 중복 알림이 발생하지 않는가
2. 반대 방향 crossing 후 재무장이 정상 동작하는가
3. `enabled=false` 규칙이 평가되지 않는가
4. `GET /alerts/history`가 최신순 고정으로 일관되게 반환되는가
5. 실패/재시도 후 최종 상태(`DELIVERED`/`FAILED`)가 정확히 기록되는가

## 15. 연관 문서
- `docs/technical/001-mvp-시스템-기술설계서-v0.md`
- `docs/technical/002-api-상세명세서-v0.md`
- `docs/decisions/security/001-jwt-access-refresh-정책.md`
