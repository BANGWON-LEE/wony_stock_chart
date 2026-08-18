# Backend

Fastify 기반 MVP API 서버 초기 골격입니다.

## 실행

```bash
pnpm install
pnpm --filter @chart/backend dev
```

기본 포트는 `4000`입니다.

## 주요 엔드포인트

- `GET /health`
- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/google/url`
- `GET /auth/google/callback`
- `POST /auth/google/callback`
- `POST /auth/google/session`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /brokers/connections`
- `GET /portfolio/summary`
- `GET /portfolio/positions`
- `POST /alerts/rules`
- `GET /alerts/rules`
- `PATCH /alerts/rules/:id`
- `DELETE /alerts/rules/:id`
- `GET /alerts/history`
- `GET /markets/:market/symbols/:symbol/candles`
- `GET /ws`
- `GET /ws/kis/domestic-stock/trades?tr_key=005930`

일반 이메일 인증은 아직 API 계약 검증용 stub 응답입니다. Google 로그인은 OAuth code 교환과 Google ID token 검증 후 앱 JWT를 발급합니다.

## Google 로그인

필수 환경 변수:

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:4000/auth/google/callback
FRONTEND_URL=http://localhost:5173
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
```

로그인 URL 생성:

```text
GET /auth/google/url?state=optional-csrf-state
```

응답:

```json
{
  "success": true,
  "data": {
    "url": "https://accounts.google.com/o/oauth2/v2/auth?..."
  }
}
```

Google redirect는 백엔드가 직접 받습니다. 백엔드는 Google authorization
code를 토큰으로 교환하고, Google ID token을 검증한 뒤 서비스 JWT를
서버에 1회용 로그인 코드로 보관한 뒤 프론트로 이동시킵니다.

```text
GET /auth/google/callback?code=google-authorization-code&state=optional-csrf-state
```

성공 시:

```text
302 Location: http://localhost:5173/auth/google/callback?loginCode=one-time-login-code
```

프론트는 1회용 로그인 코드를 백엔드에 전달해 서비스 토큰을 받습니다.

```text
POST /auth/google/session
Content-Type: application/json
```

```json
{ "loginCode": "one-time-login-code" }
```

응답:

```json
{
  "success": true,
  "data": {
    "accessToken": "app-jwt",
    "expiresIn": 3600,
    "refreshToken": "app-refresh-jwt",
    "user": {
      "id": "google:123",
      "email": "user@example.com",
      "name": "User",
      "picture": "https://...",
      "provider": "google"
    }
  }
}
```

프론트가 Google redirect에서 받은 `code`를 백엔드로 직접 전달하는 방식도
호환을 위해 유지합니다.

```text
POST /auth/google/callback
Content-Type: application/json
```

```json
{ "code": "google-authorization-code" }
```

응답:

```json
{
  "success": true,
  "data": {
    "accessToken": "app-jwt",
    "expiresIn": 3600,
    "refreshToken": "app-refresh-jwt",
    "user": {
      "id": "google:123",
      "email": "user@example.com",
      "name": "User",
      "picture": "https://...",
      "provider": "google"
    }
  }
}
```

## KIS 초기 캔들 데이터

프론트는 실시간 WebSocket 연결 전에 종목 코드 기준으로 초기 캔들 데이터를 먼저 요청합니다.

```text
GET /markets/KR/symbols/005930/candles?interval=1d&limit=300
```

프론트는 일봉 개수(`limit`)를 보냅니다. 백엔드는 `to`가 없으면 한국 시간 기준 오늘을 사용하고, `from`이 없으면 `limit`에 맞춰 조회 시작일을 계산합니다.

백엔드는 KIS 실전 도메인 `https://openapi.koreainvestment.com:9443`의 아래 API를 호출합니다.

```text
GET /uapi/domestic-stock/v1/quotations/inquire-time-dailychartprice
```

사용 환경 변수:

```bash
KIS_TIME_DAILY_CHART_PRICE_TR_ID=FHKST03010100
```

응답:

```json
{
  "success": true,
  "data": {
    "market": "KR",
    "symbol": "005930",
    "interval": "1d",
    "source": "KIS",
    "summary": {
      "name": "삼성전자",
      "currentPrice": 71000,
      "previousChange": 500,
      "previousChangeRate": 0.71
    },
    "candles": [
      {
        "time": "2026-08-02T00:00:00+09:00",
        "open": 70500,
        "high": 71300,
        "low": 70200,
        "close": 71000,
        "volume": 12345678,
        "accumulatedTradeAmount": 8520000
      }
    ]
  }
}
```

## KIS 실시간 WebSocket 중계

백엔드가 KIS WebSocket(`KIS_WEBSOCKET_URL`, 기본값 `ws://ops.koreainvestment.com:21000/tryitout/H0STCNT0`)에 연결하고, 프론트는 백엔드 WebSocket만 구독하도록 분리합니다.

필수 환경 변수:

```bash
KIS_APP_KEY=...
KIS_APP_SECRET=...
KIS_WEBSOCKET_URL=ws://ops.koreainvestment.com:21000/tryitout/H0STCNT0
```

백엔드 WebSocket:

```text
GET ws://localhost:4000/ws/kis/domestic-stock/trades?tr_key=005930
```

클라이언트 메시지:

```json
{ "type": "subscribe", "tr_key": "005930" }
```

```json
{ "type": "unsubscribe", "tr_key": "005930" }
```

서버 이벤트:

```json
{
  "event": "kis.trade",
  "data": {
    "trKey": "005930",
    "symbol": "005930",
    "timestamp": "2026-08-02T09:01:05+09:00",
    "price": 71000,
    "currentPrice": 71000,
    "tradeVolume": 120,
    "accumulatedVolume": 1234567,
    "openPrice": 70500,
    "highPrice": 71300,
    "lowPrice": 70200,
    "tradeType": "1",
    "tradingHalt": false
  }
}
```

```json
{ "event": "kis.status", "data": { "type": "subscribed", "symbol": "005930" } }
```
