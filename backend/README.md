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

현재는 API 계약 검증용 stub 응답이며, DB/Redis/JWT/KIS 연동은 다음 단계에서 구현합니다.
