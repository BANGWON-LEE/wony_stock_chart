# Market Chart Server Design v0

## 1. 문서 목적
- 주식 차트에 필요한 과거 일봉 데이터를 서버가 조회, 캐싱, 제공하는 구조를 정의한다.
- 프론트엔드 차트가 브로커 API에 직접 의존하지 않고 백엔드 API만 사용하도록 API/DB/동기화 경계를 고정한다.

## 2. 범위
### 포함
- 종목별 과거 일봉(OHLCV) 조회
- MySQL 기반 일봉 캐싱
- 요청 시 부족한 기간을 브로커 API에서 보충 후 upsert
- 브로커 장애 시 캐시 데이터 기반 fallback 응답

### 제외
- 분봉 차트
- 실시간 캔들 생성
- 주문/자동매매
- 차트 보조지표 계산

## 3. 기본 방향
- 차트 API는 항상 MySQL의 `ohlcv_candles`를 기준으로 응답한다.
- 요청 기간의 캐시가 부족하면 서버가 KIS 과거 일봉 API를 호출하고, 표준 OHLCV 포맷으로 변환해 DB에 upsert한다.
- upsert 이후 다시 DB를 조회해 최종 응답을 만든다.
- MVP는 `interval=1d`만 지원한다.

## 4. 시스템 구성
- `chart-api`: 차트 REST API 요청 검증, 인증, 응답 포맷 변환
- `chart-service`: 캐시 조회, 누락 구간 판단, 브로커 보충 조회, fallback 정책 처리
- `KISHistoricalPriceAdapter`: KIS 과거 일봉 API 호출 및 표준 OHLCV 변환
- `mysql.ohlcv_candles`: 확정된 차트 캔들 캐시
- `redis`(선택): 동일 종목/기간 반복 요청 단기 캐시 및 브로커 호출 중복 억제

## 5. 처리 흐름
## 5.1 정상 조회
1. 클라이언트가 `GET /markets/:market/symbols/:symbol/candles` 호출
2. 서버가 `market`, `symbol`, `interval`, `from`, `to`, `limit` 검증
3. `ohlcv_candles`에서 요청 기간 일봉 조회
4. 요청 기간 데이터가 충분하면 DB 결과를 반환

## 5.2 캐시 보충 조회
1. DB 조회 결과가 비어 있거나 요청 기간 일부가 부족함
2. `KISHistoricalPriceAdapter.fetchDailyCandles()` 호출
3. 응답을 표준 OHLCV로 변환
4. `ohlcv_candles`에 `(market, symbol, interval_type, started_at)` 기준 upsert
5. DB를 다시 조회해 최종 응답 반환

## 5.3 브로커 장애 fallback
1. 브로커 조회 실패
2. DB에 일부 데이터가 있으면 `source=CACHE`, `stale=true`로 반환
3. DB에도 데이터가 없으면 `BROKER_UNAVAILABLE` 에러 반환

## 6. API 계약
### Endpoint
```http
GET /markets/:market/symbols/:symbol/candles?interval=1d&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=500
```

### Path
- `market`: `KR` | `US`
- `symbol`: 종목 코드 또는 티커

### Query
- `interval`: MVP는 `1d`만 허용
- `from`: 선택, `YYYY-MM-DD`
- `to`: 선택, `YYYY-MM-DD`
- `limit`: 선택, 기본 `300`, 최대 `1000`

### Response 200
```json
{
  "success": true,
  "data": {
    "market": "KR",
    "symbol": "005930",
    "interval": "1d",
    "source": "CACHE",
    "stale": false,
    "candles": [
      {
        "time": "2026-06-19T00:00:00Z",
        "open": "74500",
        "high": "75200",
        "low": "74100",
        "close": "75000",
        "volume": "12345678"
      }
    ]
  }
}
```

## 7. DB 모델
### `ohlcv_candles`
- `market`: 거래 시장(`KR`, `US`)
- `symbol`: 종목 코드
- `interval_type`: 캔들 주기(MVP: `1d`)
- `started_at`: 캔들 시작 시각(UTC)
- `open_price`, `high_price`, `low_price`, `close_price`: Decimal 가격
- `volume`: 거래량
- `source`: 데이터 출처(MVP: `KIS`)

중복 방지 키:
```sql
UNIQUE KEY uq_ohlcv_market_symbol_interval_started (
  market, symbol, interval_type, started_at
)
```

## 8. 캐싱 정책
1. API 응답은 DB에 저장된 값을 기준으로 한다.
2. 브로커에서 가져온 동일 캔들은 upsert한다.
3. 장 마감 전 당일 일봉은 변동 가능하므로 재조회 시 갱신될 수 있다.
4. 장 마감 후 최근 5거래일은 배치 또는 운영 작업으로 재동기화한다.
5. 장기 과거 데이터는 요청 시 최초 1회 캐싱하고 이후 DB에서 제공한다.

## 9. 에러 처리
### `INVALID_INPUT`
- `interval`이 `1d`가 아님
- `from > to`
- `limit > 1000`
- 지원하지 않는 `market`

### `BROKER_UNAVAILABLE`
- 캐시가 없고 브로커 과거 일봉 API 호출도 실패

### `SYMBOL_NOT_FOUND`
- 브로커가 해당 종목을 찾지 못함

## 10. 테스트/검증 기준
### 단위 테스트
- query 검증(`interval`, `from/to`, `limit`)
- KIS 응답을 표준 OHLCV로 변환
- 누락 구간 판단

### 통합 테스트
- 캐시 hit 시 브로커 호출 없이 DB 결과 반환
- 캐시 miss 시 브로커 호출 후 upsert 및 반환
- 브로커 실패 + DB 데이터 있음: `stale=true` 반환
- 브로커 실패 + DB 데이터 없음: `BROKER_UNAVAILABLE`

### DB 검증
```sql
EXPLAIN SELECT started_at, open_price, high_price, low_price, close_price, volume
FROM ohlcv_candles
WHERE market = 'KR'
  AND symbol = '005930'
  AND interval_type = '1d'
  AND started_at BETWEEN '2025-01-01 00:00:00.000' AND '2026-06-19 00:00:00.000'
ORDER BY started_at ASC
LIMIT 500;
```
- 기대: `idx_ohlcv_lookup` 또는 unique key range 사용

## 11. 연관 문서
- `docs/technical/001-mvp-시스템-기술설계서-v0.md`
- `docs/technical/002-api-상세명세서-v0.md`
- `docs/technical/004-db-schema-mysql-v0.md`
- `migrations/003_market_chart_schema.sql`
