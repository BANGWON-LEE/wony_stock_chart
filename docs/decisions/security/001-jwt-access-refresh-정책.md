# 의사결정기록 001: JWT는 Access 1시간 + Refresh Token 회전 정책으로 운영한다

## 상태
확정 (Accepted)

## 일자
2026-05-12

## 배경
- 인증 API는 현재 로그인 시 Access Token을 발급한다.
- 보안 강화를 위해 Access Token 유효시간을 짧게 가져가되, 사용자 재로그인 부담은 줄여야 한다.

## 결정
1. Access Token 만료시간은 `1시간(3600초)`으로 고정한다.
2. Refresh Token 기능을 도입한다.
3. Refresh Token은 DB에 해시로 저장하고, 재발급 시 회전(rotating)한다.
4. 로그아웃 시 Refresh Token을 폐기(revoke)한다.

## 선택 이유
1. 보안/사용성 균형이 좋다.
- Access Token 탈취 시 피해 시간을 1시간으로 제한할 수 있다.
- Refresh Token으로 반복 로그인 불편을 줄일 수 있다.

2. 세션 통제력이 올라간다.
- 토큰 회전/폐기 전략으로 비정상 재사용 탐지 및 차단이 가능하다.

## 영향
### 장점
- 짧은 Access Token 수명으로 보안 리스크를 낮춘다.
- 사용자 체감 로그인 불편을 최소화한다.

### 단점
- Refresh Token 저장/회전/폐기 로직 구현이 추가된다.
- 인증 관련 테스트 범위가 늘어난다.

## 실행 메모
1. API 추가: `POST /auth/refresh`, `POST /auth/logout`.
2. DB: `refresh_tokens` 테이블(해시, 만료시각, revoked_at, user_id, device/session 식별자).
3. 재사용 감지 시 해당 세션(또는 사용자 전체 세션) 강제 만료 정책을 둔다.
4. 로그/에러에 토큰 원문 출력 금지.

## 재검토 조건
- 공격/오남용 패턴에서 현재 만료시간이 과도하게 짧거나 긴 것으로 확인되는 경우
- 멀티디바이스 세션 정책 변경 필요가 발생하는 경우
