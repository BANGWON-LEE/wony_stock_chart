# Frontend

Vite React 프론트엔드입니다. 실제 앱은 `apps/web`에 있고, 디자인 토큰 패키지는 `packages/tokens`에 있습니다.

## 실행

```bash
pnpm install
pnpm dev
```

개발 서버는 기본적으로 `http://localhost:5173`에서 실행됩니다.

## 환경 변수

Vite env 파일은 `frontend/apps/web` 기준으로 둡니다.

로컬 개발:

```bash
cp apps/web/.env.development.example apps/web/.env.development
```

```env
VITE_API_BASE_URL=/api
VITE_WS_BASE_URL=/api
```

`/api`는 `apps/web/vite.config.ts`에서 `http://localhost:4000` 백엔드로 프록시됩니다.

Vercel 배포:

```env
VITE_API_BASE_URL=/api
VITE_WS_BASE_URL=https://wony-stock-chart.onrender.com
```

HTTP API는 `frontend/vercel.json`의 rewrite가 `/api/*`를 Render 백엔드로 프록시합니다. WebSocket은 Vercel rewrite 대신 Render 백엔드에 직접 연결하므로 `VITE_WS_BASE_URL`을 Render URL로 둡니다.

## 빌드

```bash
pnpm build
```

Vercel output directory는 `apps/web/dist`입니다.
