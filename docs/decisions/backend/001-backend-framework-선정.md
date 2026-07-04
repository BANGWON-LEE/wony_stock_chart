# 의사결정기록 001: MVP 백엔드 프레임워크는 Fastify로 선택한다

## 상태
확정 (Accepted)

## 일자
2026-05-12

## 배경
- MVP 백엔드는 인증, 포트폴리오 조회, 알림 규칙 CRUD, WebSocket 실시간 시세 fan-out을 담당한다.
- 성능 목표는 `quote reflection p95 <= 1s`, `alert dispatch start p95 <= 2s`다.
- 초기 단계에서는 프레임워크 추상화보다 단순한 구조와 낮은 런타임 오버헤드가 중요하다.

## 결정
MVP 백엔드 프레임워크는 `Fastify`를 사용한다.

## 선택 이유
1. MVP 요구에 맞는 단순성과 성능을 제공한다.
- REST + WebSocket + 플러그인 구조를 가볍게 구성할 수 있다.

2. 목표 KPI 달성에 유리하다.
- 낮은 오버헤드, 빠른 요청 처리, 스키마 기반 검증으로 지연 관리가 쉽다.

3. 운영/디버깅 경로가 명확하다.
- 단일 프로세스 구조에서 관측성(로깅/메트릭) 추가가 단순하고, 장애 분석 경로가 짧다.

## 영향
### 장점
- 초기 구현 속도와 실행 성능 균형이 좋다.
- JSON Schema 기반 요청/응답 검증을 표준화하기 쉽다.
- 모듈 단위로 API/실시간/알림 엔진을 분리하기 용이하다.

### 단점
- NestJS 대비 모듈/DI 규약이 약해 아키텍처 일관성을 팀 컨벤션으로 보완해야 한다.
- 대규모 조직 표준이 NestJS인 경우, 합류 인원의 적응 비용이 생길 수 있다.

## 실행 메모
1. 기본 스택: `Node.js LTS + TypeScript + Fastify`.
2. 검증: Fastify route schema(JSON Schema)로 입력 검증을 강제한다.
3. 모듈 구조:
- `src/modules/auth`
- `src/modules/portfolio`
- `src/modules/alerts`
- `src/modules/realtime`
- `src/adapters/brokers/kis`
4. 상태 전이/중복방지는 서비스 레이어에서 트랜잭션 + 조건부 업데이트로 처리한다.
5. 관측성:
- `X-Request-Id` 전파
- p95 측정 메트릭(quote reflection, alert dispatch start) 수집

## 재검토 조건
- 팀 규모 확대로 강한 DI/모듈 규약 필요성이 크게 증가하는 경우
- Fastify 기반 구조에서 기능 확장 속도가 유의미하게 저하되는 경우
- 운영 표준 통합을 위해 NestJS 전환 이점이 명확해지는 경우
