# 의사결정기록 운영 규칙

## 기본 원칙
- 모든 의사결정기록은 한국어로 작성한다.
- 주제에 맞는 카테고리 폴더에 저장한다.
- 파일명은 `번호-주제.md` 형식을 사용한다.
  - 예: `001-postgresql-선정-이유.md`

## 카테고리
- `docs/decisions/database`: DB 엔진, 스키마 전략, 인덱스/파티셔닝, 데이터 정합성
- `docs/decisions/architecture`: 서비스 경계, 모듈 구조, 통신 방식
- `docs/decisions/backend`: 백엔드 프레임워크, API 정책, 비즈니스 로직 처리 방식
- `docs/decisions/frontend`: 프론트 스택, 상태관리, 렌더링 전략, UI 기술 선택
- `docs/decisions/ops`: 배포, 모니터링, 장애대응, SLO/SLA
- `docs/decisions/security`: 인증/인가, 암호화, 비밀정보 관리
- `docs/decisions/product`: 기능 범위, 단계별 릴리즈, 사용자 정책

## 기록 템플릿
각 문서는 아래 순서를 따른다.
1. 상태
2. 일자
3. 배경
4. 결정
5. 선택 이유
6. 영향(장점/단점)
7. 실행 메모
8. 재검토 조건
