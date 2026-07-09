# Wony Stock Chart

주식 시장 대시보드와 차트 UI를 중심으로, 멀티브로커 포트폴리오 MVP까지 확장하기 위한 프로젝트입니다. 현재 저장소에는 React 기반 프론트엔드, 디자인 토큰 패키지, MySQL 스키마/마이그레이션, API/운영 설계 문서가 포함되어 있습니다.

## 현재 구현 상태

### 구현됨

- 메인 시장 대시보드 UI
  - 지수 요약
  - 시장 차트
  - 시장 시그널
  - 일정 섹션
- Chart.js 기반 차트 컴포넌트
  - line
  - bar
  - candlestick
  - combo chart
- `@chart/tokens` 디자인 토큰 패키지
  - primitive / semantic / component 토큰 JSON
  - CSS variables, JS module, TypeScript declaration 빌드
- MySQL 마이그레이션 초안
  - 초기 MVP 스키마
  - 개발 seed
  - OHLCV 일봉 캔들 캐시 스키마

### 설계됨

- 인증/브로커 연결/포트폴리오/알림 API
- 실시간 시세 WebSocket 이벤트
- 차트 서버 캐싱 구조
- 알림 dedup/re-arm 정책
- 로컬 DB 실행 및 SQL 안전 운영 기준

### 아직 구현 필요

- 백엔드 API 서버
- quote gateway / alert worker
- 실제 KIS 브로커 연동
- 프론트엔드 API 연동
- 인증/사용자 세션 UI

## 기술 스택

- Package manager: `pnpm@10.12.4`
- Frontend: React 19, TypeScript, Vite
- Routing: React Router
- Chart: Chart.js, chartjs-chart-financial, chartjs-adapter-date-fns
- Styling: Tailwind CSS v4, design tokens
- Planned backend: Node.js + Fastify
- Planned database: MySQL 8+
- Planned realtime/cache: WebSocket, Redis

## 프로젝트 구조

```text
.
├── docs/
│   ├── decisions/                 # 주요 기술 의사결정 기록
│   └── technical/                 # MVP/API/DB/운영 상세 설계
├── frontend/
│   ├── apps/web/                  # React 웹 앱
│   └── packages/tokens/           # 디자인 토큰 패키지
├── migrations/                    # MySQL 마이그레이션/롤백 SQL
├── package.json                   # 루트 실행 스크립트
└── pnpm-workspace.yaml
```

## 주요 프론트엔드 파일

- `frontend/apps/web/src/components/main/Main.tsx`: 메인 대시보드 레이아웃
- `frontend/apps/web/src/components/main/data.ts`: 현재 UI 샘플 데이터
- `frontend/apps/web/src/feat/chart/components/Chart.tsx`: 차트 타입별 렌더러 선택
- `frontend/apps/web/src/feat/chart/data/chartDataAdapter.ts`: row/map 입력 데이터를 Chart.js 모델로 정규화

## 차트 컴포넌트 입력

`Chart`는 row 배열 또는 column map 형태의 데이터를 받습니다.

```tsx
import { Chart } from './feat/chart'

const rows = [
  { time: '2026-07-01', open: 120, high: 132, low: 116, close: 128 },
  { time: '2026-07-02', open: 128, high: 134, low: 121, close: 124 },
]

export function MarketChart() {
  return (
    <Chart
      type="candlestick"
      data={rows}
      timePropertyName="time"
      options={{ title: '삼성전자 일봉', compact: true }}
    />
  )
}
```

지원 타입:

- `line`
- `bar`
- `candlestick`
- `ChartType[]`를 넘기는 combo chart

## 디자인 토큰

토큰 소스는 `frontend/packages/tokens/src` 아래에 있습니다.

- `primitive`: 색상, 스케일, 그림자, 타이포그래피 원시값
- `semantic/light`, `semantic/dark`: 라이트/다크 테마 의미 토큰
- `component`: 버튼, 카드, 입력 컴포넌트 토큰

빌드 결과는 `frontend/packages/tokens/dist`에 생성됩니다.

- `dist/css/tokens.css`
- `dist/css/light.css`
- `dist/css/dark.css`
- `dist/css/themes.css`
- `dist/js/*.js`
- `dist/types/*.d.ts`

## 데이터베이스와 마이그레이션

마이그레이션은 MySQL 8+ 기준 SQL 파일입니다.

- `migrations/001_init_schema.sql`: MVP 기본 테이블
- `migrations/002_seed_dev_data.sql`: 개발용 seed
- `migrations/003_market_chart_schema.sql`: `ohlcv_candles` 일봉 캐시 테이블
- `migrations/998_rollback_market_chart_schema.sql`: 차트 스키마 롤백
- `migrations/999_rollback_init.sql`: 초기 스키마 롤백

차트 서버 설계상 일봉 데이터는 `ohlcv_candles`를 기준으로 응답하며, 캐시 miss 시 브로커 API에서 보충 후 upsert하는 구조입니다.

## 문서 맵

- `docs/technical/001-mvp-시스템-기술설계서-v0.md`: 전체 MVP 시스템 범위와 구성
- `docs/technical/002-api-상세명세서-v0.md`: REST/WebSocket API 계약
- `docs/technical/003-alerting-운영정책-v0.md`: 알림 운영 정책
- `docs/technical/004-db-schema-mysql-v0.md`: MySQL 스키마 상세
- `docs/technical/005-local-db-runbook-v0.md`: 로컬 DB 실행 절차
- `docs/technical/006-market-chart-server-design-v0.md`: 시장 차트 서버/캐시 설계
- `docs/technical/007-frontend-notification-architecture-v0.md`: 프론트엔드 알림 구조
- `docs/technical/008-sql-git-safety-v0.md`: SQL/Git 안전 기준
- `docs/decisions/`: 프론트엔드, 백엔드, DB, 보안 기술 결정 기록

## 개발 메모

- 현재 화면 데이터는 `frontend/apps/web/src/components/main/data.ts`의 샘플 데이터입니다.
- 백엔드 API는 문서 계약이 먼저 정의된 상태이며 실제 서버 코드는 아직 없습니다.
- 브로커 자격증명은 설계상 암호화 저장이 필수이며, 로그와 에러 응답에 토큰/계좌번호가 노출되면 안 됩니다.
- 금액/수량은 API와 DB 모두 부동소수 대신 Decimal 문자열 또는 `DECIMAL` 타입을 사용합니다.
