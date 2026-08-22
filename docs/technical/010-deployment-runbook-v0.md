# Deployment Runbook v0

## 배포 구조

- Frontend: Vercel
- Backend: Render Web Service
- Repository: `BANGWON-LEE/wony_stock_chart`
- Frontend root: `frontend`
- Backend root: `backend`
- Backend production URL: `https://wony-stock-chart.onrender.com`
- Frontend production URL: `https://wony-stock-chart-frontend-ten.vercel.app`

## Frontend 배포

Vercel Project Settings:

```text
Root Directory: frontend
Framework Preset: Vite
Install Command: pnpm install
Build Command: pnpm build
Output Directory: apps/web/dist
```

Repository 설정 파일:

```text
frontend/vercel.json
```

```json
{
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install",
  "outputDirectory": "apps/web/dist",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://wony-stock-chart.onrender.com/:path*"
    }
  ]
}
```

Vercel 환경변수:

```text
VITE_API_BASE_URL=/api
VITE_WS_BASE_URL=https://wony-stock-chart.onrender.com
```

`VITE_API_BASE_URL`을 Render URL로 직접 설정하지 않는다. HTTP API는 Vercel rewrite를 통해 `/api/*`에서 Render로 프록시한다.

## Backend 배포

Render Web Service Settings:

```text
Root Directory: backend
Runtime: Node
Build Command: pnpm install && pnpm build
Start Command: pnpm start
```

`corepack enable`은 Render 빌드 명령에 넣지 않는다. Render에서 `/usr/bin`이 read-only라 다음 에러가 날 수 있다.

```text
Internal Error: EROFS: read-only file system, unlink '/usr/bin/pnpm'
```

Render 환경변수:

```text
NODE_ENV=production
HOST=0.0.0.0
JWT_ACCESS_SECRET=<long-random-secret>
JWT_REFRESH_SECRET=<different-long-random-secret>
FRONTEND_URL=https://wony-stock-chart-frontend-ten.vercel.app
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
GOOGLE_REDIRECT_URI=https://wony-stock-chart.onrender.com/auth/google/callback
KIS_APP_KEY=<kis-app-key>
KIS_APP_SECRET=<kis-app-secret>
KIS_BASE_URL=https://openapi.koreainvestment.com:9443
KIS_WEBSOCKET_URL=ws://ops.koreainvestment.com:21000/tryitout/H0STCNT0
KIS_MARKET_VALUE_TR_ID=FHPST01790000
KIS_TIME_DAILY_CHART_PRICE_TR_ID=FHKST03010100
KIS_TIME_MINUTE_CHART_PRICE_TR_ID=FHKST03010230
```

Render가 `PORT`를 주입하므로 보통 `PORT`는 직접 등록하지 않는다.

## 환경별 URL 기준

로컬 개발:

```text
Frontend: http://localhost:5173
Backend: http://localhost:4000
Frontend API base: /api
Frontend WS base: /api
Backend FRONTEND_URL: http://localhost:5173
Backend GOOGLE_REDIRECT_URI: http://localhost:4000/auth/google/callback
```

배포:

```text
Frontend: https://wony-stock-chart-frontend-ten.vercel.app
Backend: https://wony-stock-chart.onrender.com
Frontend API base: /api
Frontend WS base: https://wony-stock-chart.onrender.com
Backend FRONTEND_URL: https://wony-stock-chart-frontend-ten.vercel.app
Backend GOOGLE_REDIRECT_URI: https://wony-stock-chart.onrender.com/auth/google/callback
```

Render Environment Variables에는 같은 key를 중복 등록하지 않는다. 예를 들어 `FRONTEND_URL`은 배포용 Vercel URL 하나만 등록한다.

## API 요청 흐름

프론트 HTTP 요청:

```text
Browser
-> https://wony-stock-chart-frontend-ten.vercel.app/api/stocks/popular
-> Vercel rewrite
-> https://wony-stock-chart.onrender.com/stocks/popular
-> Render backend
```

브라우저 Network 탭에는 Vercel 도메인의 `/api/...`로 보이는 것이 정상이다. CORS를 피하기 위한 구조다.

프론트 WebSocket 요청:

```text
Browser
-> wss://wony-stock-chart.onrender.com/ws/kis/domestic-stock/trades?tr_key=005930
-> Render backend
-> KIS WebSocket
```

## 검증 명령

로컬 빌드 검증:

```bash
pnpm --dir frontend build
pnpm --filter @chart/backend typecheck
```

Vercel output 확인:

```bash
test -f frontend/apps/web/dist/index.html
```

Frontend lockfile 검증:

```bash
pnpm --dir frontend install --frozen-lockfile --lockfile-only --offline
```

라이브 백엔드 확인:

```bash
curl -i https://wony-stock-chart.onrender.com/health
curl -i https://wony-stock-chart.onrender.com/stocks/popular
```

라이브 프론트 프록시 확인:

```bash
curl -i https://wony-stock-chart-frontend-ten.vercel.app/api/stocks/popular
```

정상이라면 Vercel proxy URL도 200을 반환해야 한다.

## 배포 중 발생한 에러와 조치

### Vercel lockfile 에러

에러:

```text
ERR_PNPM_OUTDATED_LOCKFILE
Cannot install with "frozen-lockfile"
specifiers in the lockfile don't match specifiers in package.json
```

원인:

- `frontend/apps/web/package.json`에서 제거된 dependency가 `frontend/pnpm-lock.yaml`에 남아 있었다.
- 사례: `chartjs-plugin-zoom`

조치:

```bash
pnpm --dir frontend install --lockfile-only
```

이후 `frontend/pnpm-lock.yaml`을 커밋한다.

### Vercel output directory 에러

에러:

```text
No Output Directory named "dist" found after the Build completed
```

원인:

- Vercel이 `frontend/dist`를 찾고 있었다.
- 실제 앱 빌드 산출물은 `frontend/apps/web/dist`다.

조치:

- Vercel Output Directory를 `apps/web/dist`로 설정한다.
- `frontend/vercel.json`에 `outputDirectory`를 둔다.

### Vercel `/api/*` 404

증상:

```text
https://wony-stock-chart-frontend-ten.vercel.app/api/stocks/popular
-> 404 Vercel NOT_FOUND
```

확인:

```text
https://wony-stock-chart.onrender.com/health
-> 200

https://wony-stock-chart.onrender.com/stocks/popular
-> 200
```

원인:

- Render backend는 정상이다.
- Vercel rewrite가 현재 배포에 적용되지 않은 상태다.

조치:

- Vercel Root Directory가 `frontend`인지 확인한다.
- `frontend/vercel.json`이 배포에 포함된 최신 커밋으로 redeploy한다.
- Vercel Project의 Production Branch가 현재 배포하려는 브랜치인지 확인한다.

### Render `corepack enable` EROFS

에러:

```text
Internal Error: EROFS: read-only file system, unlink '/usr/bin/pnpm'
```

원인:

- `corepack enable`이 `/usr/bin/pnpm`을 수정하려고 했다.
- Render 빌드 환경의 `/usr/bin`은 read-only다.

조치:

```text
Build Command: pnpm install && pnpm build
```

`corepack enable &&`를 제거한다.

### Render JWT secret 누락

에러:

```text
Error: JWT_ACCESS_SECRET is required in production
```

원인:

- `NODE_ENV=production`인데 `JWT_ACCESS_SECRET`이 Render Environment Variables에 없다.

조치:

```text
JWT_ACCESS_SECRET=<long-random-secret>
JWT_REFRESH_SECRET=<different-long-random-secret>
```

예시 생성:

```bash
openssl rand -base64 48
openssl rand -base64 48
```

### Render duplicate env key

에러:

```text
Duplicate key "FRONTEND_URL" is not allowed
```

원인:

- Render Environment Variables에 같은 key를 두 번 넣었다.
- 로컬용 URL과 배포용 URL을 동시에 같은 key로 등록하려고 했다.

조치:

- Render에는 배포용 값 하나만 등록한다.

```text
FRONTEND_URL=https://wony-stock-chart-frontend-ten.vercel.app
```

## 배포 체크리스트

- Vercel Root Directory가 `frontend`다.
- Vercel Output Directory가 `apps/web/dist`다.
- Vercel 최신 배포에 `frontend/vercel.json`이 포함되어 있다.
- Vercel에 `VITE_API_BASE_URL=/api`가 설정되어 있거나 unset 상태다.
- Vercel에 `VITE_WS_BASE_URL=https://wony-stock-chart.onrender.com`가 설정되어 있다.
- Render Root Directory가 `backend`다.
- Render Build Command가 `pnpm install && pnpm build`다.
- Render Start Command가 `pnpm start`다.
- Render에 JWT secret 2개가 등록되어 있다.
- Render에 Google OAuth redirect URL이 배포 백엔드 URL로 등록되어 있다.
- Google Cloud Console OAuth authorized redirect URI에 `https://wony-stock-chart.onrender.com/auth/google/callback`이 등록되어 있다.
- `https://wony-stock-chart.onrender.com/health`가 200을 반환한다.
- `https://wony-stock-chart.onrender.com/stocks/popular`가 200을 반환한다.
- `https://wony-stock-chart-frontend-ten.vercel.app/api/stocks/popular`가 200을 반환한다.
