# 프론트엔드 알림 아키텍처 v0

## 1. 목적

React + Vite 기반 웹/PWA에서 다음 알림 경험을 구현하기 위한 프론트엔드 중심 아키텍처를 정의한다.

- 포그라운드에서는 In-app 토스트를 표시한다.
- 백그라운드 또는 앱 종료 상태에서는 Firebase Cloud Messaging(FCM) 기반 시스템 Push를 표시한다.
- 알림을 누르면 관련 종목 차트 또는 포트폴리오 화면으로 이동한다.
- Android 모바일 브라우저와 iPhone/iPad 홈 화면 설치형 PWA를 지원한다.

이 문서는 기존 `docs/technical/003-alerting-운영정책-v0.md`의 알림 판정과 중복 방지 정책을 유지하면서, 채널 범위를 `IN_APP only`에서 `IN_APP + PUSH`로 확장한다.

## 2. 확정 사항

| 항목 | 결정 |
| --- | --- |
| 프론트엔드 | React 19 + TypeScript + Vite |
| 서버 상태 | TanStack Query |
| Push 제공자 | Firebase Cloud Messaging |
| 메시지 형식 | FCM `notification + data` |
| 포그라운드 | In-app 토스트, 알림 이력 캐시 갱신 |
| 백그라운드/종료 | Service Worker를 통한 시스템 Push |
| 권한 요청 시점 | 첫 알림 규칙 저장 직후 별도 버튼 클릭 시 |
| 종목 알림 클릭 | `/charts/:symbol?alertEventId=:eventId` |
| 포트폴리오 알림 클릭 | `/portfolio?alertEventId=:eventId` |
| 중복 식별자 | 서버가 생성한 `eventId` |

서버는 브라우저가 포그라운드인지 판단하지 않는다. 동일한 FCM 메시지를 발송하고, 포그라운드에서는 페이지의 `onMessage`, 백그라운드에서는 Service Worker가 처리한다.

## 3. 지원 조건과 제한

### 3.1 공통

- 운영 환경은 HTTPS로 제공해야 한다.
- 브라우저가 Service Worker, Notification API, Push API를 지원해야 한다.
- 알림 권한 요청은 사용자의 명시적인 클릭 이벤트 안에서 시작한다.
- 권한이 거절된 경우 반복해서 시스템 권한 창을 요청하지 않고 브라우저 설정 안내를 제공한다.

### 3.2 iPhone/iPad

- iOS/iPadOS 16.4 이상을 대상으로 한다.
- 사용자가 웹앱을 홈 화면에 추가한 PWA 상태에서만 Push 등록을 제공한다.
- 미설치 상태에서는 알림 권한을 요청하지 않고 홈 화면 설치 안내를 먼저 표시한다.
- PWA manifest는 `display: "standalone"`과 고정된 `id`를 포함한다.

### 3.3 Android

- Push API를 지원하는 모바일 브라우저를 대상으로 한다.
- 기능 지원 여부는 브라우저 이름이 아니라 런타임 feature detection으로 판단한다.

## 4. 전체 구성

```text
quote_update / portfolio_tick
            |
            v
      alert-engine
      - crossing 판정
      - armed -> triggered
      - AlertEvent 생성
            |
            v
      push-dispatcher
      - 사용자 활성 기기 조회
      - Firebase Admin SDK 발송
      - 발송 결과 저장
            |
            v
            FCM
       /             \
포그라운드 페이지     Service Worker
onMessage             백그라운드/종료
   |                        |
In-app 토스트          시스템 Push
이력 캐시 갱신              |
                    notificationclick
                            |
                         딥링크
```

`AlertEvent`가 알림의 기준 데이터다. In-app 토스트와 시스템 Push는 동일한 `eventId`를 사용하며, 클라이언트는 최근 처리한 `eventId`를 기준으로 중복 표시를 방지한다.

## 5. 프론트엔드 파일 구조

```text
src/
  notifications/
    firebase.ts
    notification-api.ts
    notification-query.ts
    notification-types.ts
    permission.ts
    foreground-handler.ts
    deep-link.ts
    components/
      NotificationPermissionPrompt.tsx
      PwaInstallGuide.tsx
      NotificationToast.tsx
      NotificationCenter.tsx

public/
  firebase-messaging-sw.js
  manifest.webmanifest
  notification-icons/
    icon-192.png
    badge-96.png
```

### 5.1 모듈 책임

#### `firebase.ts`

- Firebase App과 Messaging 인스턴스를 초기화한다.
- `isSupported()`로 현재 브라우저의 FCM 지원 여부를 확인한다.
- Service Worker registration과 VAPID public key를 사용해 FCM 토큰을 발급한다.
- Firebase 설정값은 공개 가능한 클라이언트 설정만 사용한다. Firebase Admin 인증정보는 포함하지 않는다.

#### `permission.ts`

- `Notification.permission` 상태를 `default | granted | denied`로 반환한다.
- iOS의 standalone PWA 실행 여부를 확인한다.
- 권한 요청, 토큰 발급, 서버 기기 등록을 하나의 사용자 흐름으로 제공한다.
- 권한 거절 후 자동 재요청하지 않는다.

#### `notification-api.ts`

- FCM 기기 등록, 갱신, 해제를 담당한다.
- 로그아웃 전에 현재 브라우저의 기기 등록을 해제한다.
- 토큰 원문을 로그나 오류 추적 도구에 기록하지 않는다.

#### `foreground-handler.ts`

- Firebase `onMessage`를 애플리케이션 시작 시 한 번만 등록한다.
- 수신한 payload를 런타임 스키마로 검증한다.
- `eventId`가 이미 표시된 이벤트이면 무시한다.
- In-app 토스트를 표시하고 `['alerts', 'history']` 쿼리를 invalidate한다.
- 포그라운드에서는 `new Notification()`을 호출하지 않는다.

#### `firebase-messaging-sw.js`

- FCM 백그라운드 메시지를 처리한다.
- `notification + data` 메시지의 시스템 알림 표시는 FCM에 맡긴다.
- `onBackgroundMessage`에서 `showNotification()`을 다시 호출하지 않는다. 호출하면 동일 메시지가 중복 표시될 수 있다.
- `notificationclick` 핸들러는 FCM 라이브러리 초기화보다 먼저 등록한다.
- `webpush.fcmOptions.link`를 기본 이동 경로로 사용한다.
- 커스텀 클릭 핸들러를 적용할 경우 동일 origin의 기존 창이 있으면 focus 후 딥링크로 이동하고, 없으면 새 창을 연다.

## 6. 프론트엔드 인터페이스

```ts
export type NotificationScope = 'symbol' | 'portfolio';

export interface PushMessageData {
  eventId: string;
  ruleId: string;
  scope: NotificationScope;
  symbol?: string;
  deepLink: string;
  triggeredAt: string;
}

export interface NotificationPermissionState {
  supported: boolean;
  permission: NotificationPermission;
  isInstalledPwa: boolean;
  registered: boolean;
  reason?:
    | 'UNSUPPORTED_BROWSER'
    | 'IOS_PWA_REQUIRED'
    | 'PERMISSION_DENIED'
    | 'TOKEN_REGISTRATION_FAILED';
}
```

`scope=symbol`이면 `symbol`이 필수이고, `scope=portfolio`이면 `symbol`은 없어야 한다. `deepLink`는 서버가 허용된 내부 경로로 생성하고 프론트와 Service Worker는 동일 origin 경로만 연다.

## 7. 사용자 흐름

### 7.1 첫 알림 규칙 저장

1. 프론트가 `POST /alerts/rules`를 호출한다.
2. 규칙 저장이 성공하면 현재 Push 등록 상태를 확인한다.
3. 이미 등록된 기기이면 추가 동작 없이 완료한다.
4. iOS에서 PWA가 아니면 `PwaInstallGuide`를 표시한다.
5. 그 외에는 `NotificationPermissionPrompt`를 표시한다.
6. 사용자가 `푸시 알림 켜기`를 누르면 시스템 권한을 요청한다.
7. 권한 허용 후 FCM 토큰을 발급하고 서버에 기기를 등록한다.
8. 등록 실패 시 알림 규칙 생성은 유지하고 재시도 UI를 제공한다.

권한 요청 실패 때문에 알림 규칙 생성 자체를 롤백하지 않는다.

### 7.2 포그라운드 수신

1. FCM 메시지가 `onMessage`에 도착한다.
2. payload와 `eventId`를 검증한다.
3. In-app 토스트를 표시한다.
4. TanStack Query의 알림 이력 캐시를 invalidate한다.
5. 사용자가 토스트를 누르면 `deepLink`로 이동한다.

### 7.3 백그라운드 수신과 클릭

1. FCM 메시지가 Service Worker에 도착한다.
2. 브라우저가 시스템 알림을 표시한다.
3. 사용자가 알림을 누르면 Service Worker가 동일 origin 창을 찾는다.
4. 기존 창이 있으면 focus하고 딥링크 메시지를 전달한다.
5. 기존 창이 없으면 `clients.openWindow(deepLink)`를 실행한다.
6. 앱은 `alertEventId`를 사용해 알림 상세를 조회하거나 읽음 처리한다.

## 8. FCM 메시지 계약

```json
{
  "notification": {
    "title": "목표 가격 도달",
    "body": "삼성전자가 80,000원에 도달했습니다."
  },
  "data": {
    "eventId": "ae_3001",
    "ruleId": "ar_2001",
    "scope": "symbol",
    "symbol": "005930",
    "deepLink": "/charts/005930?alertEventId=ae_3001",
    "triggeredAt": "2026-06-20T08:10:00Z"
  },
  "webpush": {
    "fcmOptions": {
      "link": "https://app.example.com/charts/005930?alertEventId=ae_3001"
    },
    "notification": {
      "icon": "/notification-icons/icon-192.png",
      "badge": "/notification-icons/badge-96.png",
      "tag": "alert-ae_3001",
      "data": {
        "eventId": "ae_3001",
        "deepLink": "/charts/005930?alertEventId=ae_3001"
      }
    }
  }
}
```

- 모든 `data` 값은 FCM 요구에 맞게 문자열로 전달한다.
- `tag`에는 `eventId`를 포함해 동일 이벤트의 중복 시스템 알림을 줄인다.
- 민감정보, 계좌번호, 토큰, 상세 포트폴리오 금액은 payload에 포함하지 않는다.
- 알림은 단서만 제공하며 최신 데이터는 앱 진입 후 API로 조회한다.

## 9. 서버 API

### 9.1 기기 등록

```http
POST /notifications/devices
Authorization: Bearer <access-token>
Content-Type: application/json
```

```json
{
  "token": "<fcm-registration-token>",
  "platform": "WEB",
  "deviceName": "iPhone Safari PWA"
}
```

```json
{
  "success": true,
  "data": {
    "device": {
      "id": "nd_1001",
      "platform": "WEB",
      "status": "ACTIVE",
      "updatedAt": "2026-06-20T08:00:00Z"
    }
  }
}
```

동일 사용자와 동일 토큰 등록은 upsert로 처리한다. 토큰이 다른 사용자에게 이미 연결되어 있으면 현재 인증 사용자로 안전하게 재귀속하거나 기존 등록을 폐기하는 정책을 서버에서 원자적으로 적용한다.

### 9.2 현재 기기 해제

```http
DELETE /notifications/devices/:deviceId
Authorization: Bearer <access-token>
```

응답은 `204 No Content`다. 로그아웃 시 호출하되 네트워크 실패 때문에 로그아웃을 막지 않는다.

### 9.3 등록 상태

```http
GET /notifications/status
Authorization: Bearer <access-token>
```

```json
{
  "success": true,
  "data": {
    "pushEnabled": true,
    "activeDeviceCount": 2
  }
}
```

### 9.4 알림 이력과 읽음 처리

기존 `GET /alerts/history`를 유지한다. 읽음 상태가 필요하므로 다음 API를 추가한다.

```http
PATCH /alerts/history/:eventId/read
Authorization: Bearer <access-token>
```

서버는 인증 사용자가 소유한 이벤트만 읽음 처리한다.

## 10. 서버 데이터 모델

### 10.1 `notification_devices`

| 필드 | 설명 |
| --- | --- |
| `id` | 기기 등록 ID |
| `user_id` | 사용자 ID |
| `fcm_token_ciphertext` | 암호화한 FCM 토큰 |
| `token_hash` | 중복 등록 확인용 해시 |
| `platform` | MVP에서는 `WEB` |
| `device_name` | 사용자 표시용 선택 필드 |
| `status` | `ACTIVE` 또는 `INVALID` |
| `last_seen_at` | 마지막 등록/갱신 시각 |
| `created_at`, `updated_at` | 생성/수정 시각 |

- `(user_id, token_hash)`에 unique 제약을 둔다.
- FCM 토큰은 인증수단에 준하는 민감 값으로 취급해 로그에 남기지 않는다.
- 장기간 사용되지 않은 기기는 운영 정책에 따라 정리한다.

### 10.2 `notification_deliveries`

| 필드 | 설명 |
| --- | --- |
| `id` | 발송 ID |
| `event_id` | `alert_events.id` |
| `device_id` | 대상 기기 ID |
| `channel` | `PUSH` |
| `status` | `PENDING`, `SENT`, `FAILED` |
| `provider_message_id` | FCM 응답 메시지 ID |
| `error_code` | 실패 코드 |
| `attempt_count` | 발송 시도 횟수 |
| `sent_at` | 발송 성공 시각 |
| `created_at`, `updated_at` | 생성/수정 시각 |

`(event_id, device_id, channel)`에 unique 제약을 둬 동일 이벤트가 같은 기기에 중복 발송되지 않도록 한다.

### 10.3 `alert_events` 확장

- 기존 이벤트 생성과 crossing 중복 방지 정책은 유지한다.
- 사용자 알림함에 읽음 상태가 필요하면 `read_at`을 추가한다.
- 채널별 발송 상태는 `notification_deliveries`에서 관리하고 이벤트 자체와 분리한다.

## 11. 서버 발송 처리

1. `alert-engine`이 crossing을 판정하고 `AlertEvent`를 생성한다.
2. 사용자에게 속한 `ACTIVE` 기기를 조회한다.
3. 기기별 `NotificationDelivery(PENDING)`를 중복 없이 생성한다.
4. `push-dispatcher`가 Firebase Admin SDK로 메시지를 발송한다.
5. 성공하면 `SENT`와 FCM message ID를 저장한다.
6. 일시적 오류는 기존 정책에 맞춰 1초, 3초, 10초 간격으로 최대 3회 재시도한다.
7. FCM이 미등록 또는 유효하지 않은 토큰 오류를 반환하면 기기를 `INVALID` 처리하고 재시도하지 않는다.
8. 최종 실패는 `FAILED`와 오류 코드를 기록한다.

FCM 발송 실패가 `AlertEvent` 생성이나 규칙의 `triggered` 상태를 롤백해서는 안 된다.

## 12. 환경변수와 보안

### 12.1 프론트엔드

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=
```

이 값들은 Firebase Web App의 공개 클라이언트 설정이다. Firebase 보안은 이 값의 비공개성에 의존하지 않으며, 허용 도메인과 서버 측 인증/인가를 별도로 적용한다.

### 12.2 서버

```dotenv
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

- Admin SDK 인증정보는 Secret Manager 또는 배포 환경의 secret으로 주입한다.
- 프론트 번들, 저장소, 로그에 private key를 포함하지 않는다.
- Push 등록/해제 API는 인증과 사용자 소유권 검증을 필수로 한다.
- `deepLink`는 서버에서 생성한 동일 origin allowlist 경로만 허용한다.

## 13. 오류 처리

| 상황 | 처리 |
| --- | --- |
| 브라우저 미지원 | Push 옵션 비활성화, In-app 이력만 제공 |
| iOS PWA 미설치 | 홈 화면 설치 안내 |
| 권한 미결정 | 첫 규칙 저장 후 활성화 안내 |
| 권한 거절 | 자동 재요청 금지, 설정 변경 방법 안내 |
| FCM 토큰 발급 실패 | 규칙은 유지하고 수동 재시도 제공 |
| 서버 기기 등록 실패 | 토큰을 로컬에 영구 저장하지 않고 재등록 유도 |
| 토큰 만료/폐기 | 서버에서 기기를 `INVALID` 처리 |
| Push 발송 실패 | 최대 3회 재시도 후 `FAILED` 기록 |
| 잘못된 payload | 토스트/딥링크 실행 없이 오류 지표만 기록 |
| 딥링크 대상 없음 | 대시보드 또는 알림 이력 화면으로 fallback |

## 14. 테스트 및 검증

### 14.1 단위 테스트

- payload 스키마 검증
- scope별 딥링크 생성과 allowlist 검증
- PWA 설치 상태와 권한 상태 판정
- 동일 `eventId` 중복 토스트 방지
- FCM 오류 코드별 재시도/토큰 폐기 판정

### 14.2 프론트엔드 통합 테스트

- 첫 알림 규칙 저장 후 권한 안내가 나타난다.
- 권한 허용 후 토큰 등록 API가 한 번 호출된다.
- 포그라운드 메시지는 시스템 알림 없이 토스트로 표시된다.
- 메시지 수신 후 알림 이력 쿼리가 갱신된다.
- 로그아웃 시 현재 기기 해제를 시도한다.

### 14.3 실기기 검증

- Android Chrome 포그라운드/백그라운드/브라우저 종료 상태
- iPhone 홈 화면 PWA 포그라운드/백그라운드/앱 종료 상태
- iOS PWA 미설치 상태의 설치 안내
- 알림 클릭 시 기존 창 focus 및 딥링크 이동
- 동일 계정의 여러 기기 동시 발송
- 권한 거절 후 재방문 UX
- 만료된 토큰의 `INVALID` 처리

Service Worker와 OS Push는 일반 브라우저 자동화만으로 완전히 검증할 수 없으므로 Android와 iPhone 실기기 검증을 릴리즈 체크에 포함한다.

## 15. 구현 순서

1. Firebase 프로젝트와 Web App, Web Push 인증서(VAPID)를 구성한다.
2. `notification_devices`, `notification_deliveries`, 읽음 상태 migration을 추가한다.
3. 기기 등록/해제/상태 API를 구현한다.
4. `push-dispatcher`와 Firebase Admin SDK 발송을 구현한다.
5. PWA manifest와 Firebase Messaging Service Worker를 추가한다.
6. 프론트 권한 요청과 FCM 토큰 등록 흐름을 구현한다.
7. 포그라운드 토스트와 TanStack Query 갱신을 연결한다.
8. 알림 클릭 딥링크와 읽음 처리를 구현한다.
9. 브라우저 통합 테스트와 Android/iPhone 실기기 검증을 수행한다.

## 16. 완료 기준

- 첫 알림 규칙 저장 후 사용자가 Push 활성화 절차를 진행할 수 있다.
- Android와 iPhone PWA에서 백그라운드 시스템 알림을 수신한다.
- 포그라운드에서는 시스템 알림 대신 In-app 토스트만 표시한다.
- 알림 클릭 시 관련 종목 차트 또는 포트폴리오로 이동한다.
- 모든 알림은 `AlertEvent` 이력으로 조회할 수 있다.
- 동일 이벤트가 같은 기기에 중복 발송되지 않는다.
- 만료된 FCM 토큰과 최종 발송 실패가 운영 데이터에 정확히 반영된다.
