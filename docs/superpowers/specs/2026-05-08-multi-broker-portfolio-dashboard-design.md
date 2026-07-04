# Multi-Broker Portfolio Dashboard PRD (MVP)

## 1. Problem & Goals

### 1.1 Problem Statement
Individual investors lack a simple portfolio-centric dashboard that unifies domestic and overseas stock holdings and shows real-time price movement clearly. Existing broker apps provide rich features but not a focused unified monitoring experience.

### 1.2 MVP Goals
- Provide a personal web dashboard based on broker API integrations.
- Support integrated holdings view for domestic and overseas stocks.
- Provide real-time quote chart UI with symbol selection from holdings.
- Provide threshold-based alerts when portfolio/symbol target value crosses above or below.

### 1.3 Non-Goals (MVP)
- Order execution or auto-trading
- Rebalancing recommendation engine
- Multi-broker live integration in MVP release (architecture only)
- Native mobile app push (APNs/FCM app push)

### 1.4 Success Metrics
Primary KPI:
- Real-time quote reflection latency: p95 <= 1s
  - Definition: elapsed time from backend quote event receipt to UI reflection

Secondary KPI:
- Alert dispatch start latency (Web Push): p95 <= 2s
  - Definition: elapsed time from threshold condition met to push dispatch initiation

### 1.5 Target User
- Individual investors who want a unified monitoring dashboard for stock portfolios
- MVP live broker integration starts with Korea Investment & Securities (KIS)
- Product architecture is prepared for additional broker onboarding in later phases

## 2. Solution Design (Architecture)

### 2.1 High-Level Architecture
- Frontend (Web Dashboard/PWA): portfolio view, symbol-select chart, alert settings/history
- Single Backend (Node.js): REST API + WebSocket + alert evaluator + broker adapter routing
- Data Stores:
  - PostgreSQL: user/account metadata, alert rules, alert history
  - Redis: real-time cache, ephemeral state, dedup state
- Notification Gateways: Web Push, Email, In-app

### 2.2 Multi-Broker Ready, Single-Broker First
- Define a common `BrokerAdapter` contract.
- Implement only `KISAdapter` in MVP.
- Store `broker_type` in user broker connection metadata.
- Route runtime calls to adapter by `broker_type`.
- Add broker adapters in Phase 2 without redesigning product surfaces.

### 2.3 Real-Time Quote Flow
1. Client selects symbol and sends WebSocket subscribe request.
2. Backend subscribes to broker quote stream.
3. Backend normalizes quote payload into internal schema.
4. Cache/state updates (Redis/memory), then fan-out to subscribed sessions.
5. Client updates chart in real time.

### 2.4 Alert Flow (Above/Below Targets)
1. User stores rules for total portfolio and per-symbol thresholds.
2. On quote/valuation updates, backend evaluates matching rules.
3. On first crossing event, send notifications (In-app + Email + Web Push).
4. Mark rule state as `triggered` to block duplicate sends.
5. Re-arm only after opposite-direction crossing event.

### 2.5 Latency Targets
- Quote reflection p95 <= 1s
- Push dispatch start p95 <= 2s

## 3. Requirements

### 3.1 Functional Requirements
- User signup/login
- Broker connection registration (MVP live: KIS)
- Domestic/overseas holdings retrieval
- Portfolio summary retrieval (valuation, PnL, return)
- Symbol selection from holdings list
- Real-time selected-symbol chart via WebSocket
- Alert rule create/read/update/delete
  - Scope: total portfolio and per-symbol
  - Direction: above/below target value
  - Channels: In-app, Email, Web Push (PWA)
- Alert history retrieval
- Duplicate prevention policy:
  - One alert per condition crossing
  - No repeat until opposite crossing re-arms the rule

### 3.2 Non-Functional Requirements
- Quote latency p95 <= 1s
- Push dispatch start latency p95 <= 2s
- Auto-recovery/retry on transient API or stream failures
- Encrypted storage of credentials/tokens
- Secret masking in logs and responses
- Least-privilege API usage
- Baseline observability for latency/error/delivery metrics

### 3.3 Out of Scope
- Orders/auto-trading
- Rebalancing engine
- Multiple broker live adapters in initial release
- Native app push notifications

## 4. API & Data Model

### 4.1 REST API
- `POST /auth/signup`, `POST /auth/login`
- `POST /brokers/connections`
- `GET /portfolio/summary`
- `GET /portfolio/positions`
- `POST /alerts/rules`
- `GET /alerts/rules`
- `PATCH /alerts/rules/:id`
- `DELETE /alerts/rules/:id`
- `GET /alerts/history`

### 4.2 WebSocket Events
Client -> Server:
- `subscribe_quotes` (`symbols[]`, `market`)
- `unsubscribe_quotes`

Server -> Client:
- `quote_update`
- `portfolio_tick` (optional)

### 4.3 Core Data Models
- `User(id, email, password_hash, created_at)`
- `BrokerConnection(id, user_id, broker_type, encrypted_credentials, status, created_at)`
- `Position(user_id, broker_type, symbol, market, quantity, avg_price, current_price, currency, updated_at)`
- `PortfolioSnapshot(user_id, total_value, total_pnl, total_return, base_currency, updated_at)`
- `AlertRule(id, user_id, scope, symbol, direction, target_value, channels, state, enabled)`
- `AlertEvent(id, rule_id, trigger_value, triggered_at, delivery_status)`

### 4.4 Broker Adapter Contract
- `getAccounts(userConnection)`
- `getPositions(userConnection)`
- `subscribeQuotes(userConnection, symbols, onEvent)`
- `unsubscribeQuotes(...)`
- `refreshAuth(userConnection)`

### 4.5 Security Requirements
- No plaintext credential storage
- KMS-backed encryption/decryption key management
- Strict masking of secrets in logs/errors/responses
- User ownership checks on every portfolio/alert resource access

## 5. Operations, Risks, and Release Plan

### 5.1 Key Risks
- Broker API policy variability for future adapter expansion
- Web Push browser behavior differences and permission opt-in friction
- Latency spikes under high quote volume
- Credential handling/security incidents if safeguards are incomplete

### 5.2 Mitigations
- Keep adapter interface minimal and stable
- Build per-channel retry/failure tracking for notifications
- Use Redis-backed fan-out and rate controls for quote bursts
- Enforce encrypted secret storage + access auditing + key rotation paths

### 5.3 MVP Release Plan
Phase 1 (MVP):
- KIS live adapter only
- Unified holdings/summary
- Symbol-select real-time chart
- Threshold alerts (total + symbol, above/below) via In-app/Email/Web Push

Phase 2:
- Add next-priority broker adapter(s)
- Improve onboarding and broker connection UX
- Expand analytics and notification personalization

## 6. Open Decisions Deferred to Implementation Plan
- Frontend framework final pick (Next.js vs React+Vite) if not fixed by engineering team
- Exact broker credential lifecycle UX (registration, rotation, revocation)
- Currency normalization/FX source policy for cross-market display

