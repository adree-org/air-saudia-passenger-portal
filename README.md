# Air Saudia Passenger Portal (ASPP)

A bilingual (Arabic/English), PDPL-compliant, KSA-resident passenger self-service portal for Air Saudia. Built with React 18, Node.js 20, and PostgreSQL 15, the portal enables flight rebooking, baggage claims, loyalty miles management, seat selection, upgrade requests, and online check-in — all hosted exclusively within KSA infrastructure.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Quick Start](#quick-start)
5. [Environment Variables](#environment-variables)
6. [Database Migrations](#database-migrations)
7. [API Reference](#api-reference)
8. [Frontend Pages](#frontend-pages)
9. [Docker Deployment](#docker-deployment)
10. [Testing](#testing)
11. [Security & Compliance](#security--compliance)
12. [Project Structure](#project-structure)
13. [Contributing](#contributing)

---

## Project Overview

The Air Saudia Passenger Portal (ASPP) is a mobile-first Progressive Web Application (PWA) providing self-service capabilities to Air Saudia passengers. Key capabilities include:

- **Bilingual Interface** — Full Arabic (RTL) and English (LTR) support with real-time locale switching via react-i18next. The `<html>` element `dir` and `lang` attributes update without a full page reload.
- **Flight Rebooking** — Passengers can rebook eligible flights up to 2 hours before scheduled departure, with real-time PSS integration, fare difference calculation, and integrated payment.
- **Baggage Claims** — Structured claim submission (lost, delayed, damaged), document upload (JPG/PNG/PDF, up to 10 MB per file, 5 files per claim), CRN generation, and real-time BMS status tracking.
- **Loyalty Programme (Saudia Miles)** — Real-time miles balance, tier status, transaction history, miles redemption for upgrades, and partial Cash + Miles payment for rebooking.
- **Seat Selection & Upgrades** — Interactive seat map with touch support, free and paid seat selection, and cabin upgrade request submission (cash, miles, or hybrid).
- **Online Check-In & Boarding Pass** — Web check-in wizard with PDF boarding pass download and Apple/Google Wallet pass generation (with DPO-approved data-minimised payload).
- **PDPL Compliance** — All personal data remains within KSA-resident infrastructure. AES-256-GCM column-level encryption for PII, PDPL consent logging, data subject access requests, and a cross-border transfer approval gate enforced by the PDPL Interceptor middleware.
- **Security** — JWT RS256 authentication, HttpOnly Secure cookies for refresh tokens, MFA (TOTP + SMS OTP), account lockout after 5 failed attempts, refresh token rotation with reuse detection, and a Redis-backed JWT revocation list.

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Frontend Framework | React | 18.x | Component-based SPA / PWA |
| Frontend Build | Vite | 5.x | Fast HMR development build; production bundle |
| UI / Styling | Tailwind CSS | 3.x | Utility-first CSS; RTL/LTR layout switching |
| State Management | Redux Toolkit + RTK Query | 2.x | Predictable state; PSS cache invalidation |
| Internationalisation | react-i18next | 14.x | Arabic/English string catalogue; RTL toggle |
| PWA | Workbox | 7.x | Offline boarding pass caching; installable PWA |
| Backend Runtime | Node.js | 20 LTS | Non-blocking I/O; concurrent PSS polling |
| Backend Framework | Express.js | 4.x | HTTP routing; middleware stack |
| ORM | Prisma | 5.x | Type-safe schema-first ORM; migrations |
| Database | PostgreSQL | 15.x | ACID transactions; KSA-resident; JSON fare rules |
| Caching / Sessions | Redis | 7.x | Refresh token store; OTP TTL; JWT revocation list |
| Job Queue | Bull | 4.x | Async notifications; BMS sync; boarding pass PDF |
| Authentication | JWT (RS256) | — | 15-min access tokens; 7-day refresh tokens |
| MFA | TOTP (RFC 6238) + SMS OTP | — | Authenticator app + SMS fallback |
| Encryption | AES-256-GCM | — | Column-level PII encryption; KSA KMS key management |
| File Storage | S3-Compatible (STC Cloud) | — | Baggage documents; AES-256 SSE; KSA-resident |
| Logging | Winston + ELK Stack | — | Structured audit logs; PDPL breach detection |
| Containerisation | Docker + Kubernetes | — | KSA IaaS deployment; horizontal scaling |
| CI/CD | GitHub Actions + ArgoCD | — | GitOps pipeline |
| CDN | KSA-resident CDN | — | Static assets; Arabic font hosting |

---

## Prerequisites

Ensure the following are installed on your development machine before proceeding:

| Requirement | Minimum Version | Notes |
|---|---|---|
| Node.js | 20.x LTS | Use [nvm](https://github.com/nvm-sh/nvm) to manage versions |
| npm | 10.x | Bundled with Node.js 20 |
| PostgreSQL | 15.x | Local instance or Docker container |
| Redis | 7.x | Local instance or Docker container |
| Docker | 24.x | Required for containerised deployment |
| Docker Compose | 2.x | Required for local multi-service stack |
| Git | 2.x | Source control |

Optional but recommended:

- [Prisma CLI](https://www.prisma.io/docs/reference/api-reference/command-reference) — `npm install -g prisma`
- [pgAdmin 4](https://www.pgadmin.org/) or [DBeaver](https://dbeaver.io/) — PostgreSQL GUI client
- [Redis Insight](https://redis.com/redis-enterprise/redis-insight/) — Redis GUI client
- [Postman](https://www.postman.com/) or [Bruno](https://www.usebruno.com/) — API testing

---

## Quick Start

Follow these steps to get the full stack running locally in development mode.

### 1. Clone the Repository

```bash
git clone https://github.com/airsaudia/passenger-portal.git
cd passenger-portal
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### 4. Copy Environment Files

Copy the example environment files and populate them with your local configuration values. See the [Environment Variables](#environment-variables) section for a full description of each variable.

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

Edit `backend/.env` and `frontend/.env` with your local database credentials, Redis connection string, JWT keys, and external service API keys.

### 5. Generate RSA Key Pair for JWT Signing

The backend requires an RSA-2048 key pair for RS256 JWT signing. In production, keys are managed by the KSA-resident KMS. For local development, generate a key pair as follows:

```bash
cd backend
mkdir -p keys
openssl genrsa -out keys/jwt_private.pem 2048
openssl rsa -in keys/jwt_private.pem -pubout -out keys/jwt_public.pem
```

Set `JWT_PRIVATE_KEY_PATH=./keys/jwt_private.pem` and `JWT_PUBLIC_KEY_PATH=./keys/jwt_public.pem` in `backend/.env`.

### 6. Start PostgreSQL and Redis (Docker)

If you do not have local PostgreSQL and Redis instances, start them using Docker Compose:

```bash
docker compose -f docker-compose.dev.yml up -d postgres redis
```

Wait for both services to report healthy before proceeding.

### 7. Run Database Migrations

```bash
cd backend
npx prisma migrate dev --name init
```

This applies all migrations in `backend/prisma/migrations/` and generates the Prisma client.

### 8. Seed the Database (Optional)

Populate the database with development seed data (sample users, bookings, and loyalty accounts):

```bash
cd backend
npx prisma db seed
```

### 9. Start the Backend API Server

```bash
cd backend
npm run dev
```

The API server starts on `http://localhost:4000` by default. You should see:

```
[ASPP] Server listening on port 4000
[ASPP] PostgreSQL connected
[ASPP] Redis connected
[ASPP] Bull queue workers started
```

### 10. Start the Frontend Development Server

Open a new terminal:

```bash
cd frontend
npm run dev
```

The React application starts on `http://localhost:5173` by default. The Vite dev server proxies all `/api` requests to `http://localhost:4000`.

### 11. Access the Application

Open your browser and navigate to:

- **Public landing page:** `http://localhost:5173/`
- **Passenger dashboard:** `http://localhost:5173/dashboard` (requires login)
- **API health check:** `http://localhost:4000/health`
- **OpenAPI documentation:** `http://localhost:4000/api-docs`

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | Yes | `development` | Runtime environment: `development`, `staging`, or `production` |
| `PORT` | No | `4000` | HTTP port the Express server listens on |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string. Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public&sslmode=verify-full` |
| `REDIS_URL` | Yes | — | Redis connection string. Format: `redis://:PASSWORD@HOST:6379` |
| `JWT_PRIVATE_KEY_PATH` | Yes | `./keys/jwt_private.pem` | Path to RSA-2048 private key PEM file used for RS256 JWT signing |
| `JWT_PUBLIC_KEY_PATH` | Yes | `./keys/jwt_public.pem` | Path to RSA-2048 public key PEM file used for RS256 JWT verification |
| `JWT_ACCESS_TOKEN_TTL_SECONDS` | No | `900` | Access token lifetime in seconds (default: 15 minutes) |
| `JWT_REFRESH_TOKEN_TTL_SECONDS` | No | `604800` | Refresh token lifetime in seconds (default: 7 days) |
| `JWT_ISSUER` | Yes | — | JWT `iss` claim value. Example: `https://aspp.airsaudia.com.sa` |
| `JWT_AUDIENCE` | Yes | — | JWT `aud` claim value. Example: `aspp-api` |
| `BCRYPT_COST` | No | `12` | Bcrypt work factor for password hashing |
| `OTP_TTL_MINUTES` | No | `10` | OTP expiry in minutes |
| `OTP_MAX_ATTEMPTS` | No | `5` | Maximum OTP verification attempts before account lock |
| `LOGIN_MAX_FAILURES` | No | `5` | Consecutive failed logins before account soft-lock |
| `SESSION_IDLE_TIMEOUT_MINUTES` | No | `30` | Idle session timeout in minutes |
| `ENCRYPTION_KEY_ID` | Yes | — | KMS key ID used for AES-256-GCM PII column encryption. For local dev, use `local-dev-key` |
| `ENCRYPTION_LOCAL_DEV_KEY` | Dev only | — | 32-byte hex key for local AES-256-GCM encryption (bypasses KMS in development). **Never set in production.** |
| `KMS_ENDPOINT` | Prod only | — | KSA-resident KMS API endpoint URL |
| `KMS_REGION` | Prod only | — | KMS region identifier |
| `PSS_API_BASE_URL` | Yes | — | Passenger Service System (PSS) base URL |
| `PSS_API_KEY` | Yes | — | PSS API authentication key |
| `PSS_API_TIMEOUT_MS` | No | `8000` | PSS API request timeout in milliseconds |
| `PSS_CERT_FINGERPRINT` | Prod only | — | SHA-256 fingerprint of pinned PSS TLS certificate |
| `LOYALTY_API_BASE_URL` | Yes | — | Saudia Miles Loyalty Back-End System base URL |
| `LOYALTY_API_KEY` | Yes | — | Loyalty API authentication key |
| `BMS_API_BASE_URL` | Yes | — | Baggage Management System base URL |
| `BMS_API_KEY` | Yes | — | BMS API authentication key |
| `PAYMENT_GATEWAY_BASE_URL` | Yes | — | KSA-certified payment gateway base URL |
| `PAYMENT_GATEWAY_API_KEY` | Yes | — | Payment gateway API key |
| `PAYMENT_GATEWAY_WEBHOOK_SECRET` | Yes | — | HMAC secret for validating payment gateway webhook signatures |
| `SMS_GATEWAY_BASE_URL` | Yes | — | KSA SMS gateway base URL |
| `SMS_GATEWAY_API_KEY` | Yes | — | SMS gateway API key |
| `SMS_GATEWAY_SENDER_ID` | Yes | — | Sender ID displayed on outbound SMS messages |
| `EMAIL_SERVICE_HOST` | Yes | — | KSA-hosted SMTP host or email API base URL |
| `EMAIL_SERVICE_PORT` | No | `587` | SMTP port (587 for STARTTLS) |
| `EMAIL_SERVICE_USER` | Yes | — | SMTP username or API key |
| `EMAIL_SERVICE_PASS` | Yes | — | SMTP password or API secret |
| `EMAIL_FROM_ADDRESS` | Yes | — | From address for outbound emails. Example: `noreply@airsaudia.com.sa` |
| `EMAIL_FROM_NAME_AR` | Yes | — | Arabic sender display name. Example: `طيران السعودية` |
| `EMAIL_FROM_NAME_EN` | Yes | — | English sender display name. Example: `Air Saudia` |
| `S3_ENDPOINT` | Yes | — | KSA-resident S3-compatible object store endpoint |
| `S3_REGION` | Yes | — | Object store region |
| `S3_ACCESS_KEY_ID` | Yes | — | Object store access key |
| `S3_SECRET_ACCESS_KEY` | Yes | — | Object store secret key |
| `S3_BUCKET_BAGGAGE_DOCS` | Yes | — | Bucket name for baggage claim document uploads |
| `S3_PRESIGNED_URL_TTL_SECONDS` | No | `900` | Pre-signed URL expiry in seconds (default: 15 minutes) |
| `PDPL_CONSENT_VERSION` | Yes | — | Current PDPL consent document version. Example: `v2.1` |
| `WALLET_API_APPLE_CERT_PATH` | No | — | Path to Apple Wallet signing certificate (DPO-approved payload only) |
| `WALLET_API_GOOGLE_ISSUER_ID` | No | — | Google Wallet issuer ID (DPO-approved payload only) |
| `CORS_ALLOWED_ORIGINS` | Yes | — | Comma-separated list of allowed CORS origins. Example: `https://portal.airsaudia.com.sa` |
| `RATE_LIMIT_PUBLIC_RPM` | No | `100` | Rate limit for unauthenticated routes (requests per minute per IP) |
| `RATE_LIMIT_AUTH_RPM` | No | `300` | Rate limit for authenticated routes (requests per minute per user) |
| `LOG_LEVEL` | No | `info` | Winston log level: `error`, `warn`, `info`, `debug` |
| `AUDIT_LOG_RETENTION_DAYS` | No | `1095` | Audit log retention period in days (default: 3 years) |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | Yes | `http://localhost:4000/api/v1` | Backend API base URL |
| `VITE_APP_NAME_AR` | No | `بوابة طيران السعودية` | Arabic application name displayed in the browser title and header |
| `VITE_APP_NAME_EN` | No | `Air Saudia Passenger Portal` | English application name |
| `VITE_DEFAULT_LANGUAGE` | No | `ar` | Default locale on first load: `ar` or `en` |
| `VITE_PAYMENT_GATEWAY_JS_SDK_URL` | Yes | — | URL of the KSA payment gateway hosted JavaScript SDK for card tokenisation |
| `VITE_SENTRY_DSN` | No | — | Sentry DSN for frontend error tracking (KSA-hosted Sentry instance) |
| `VITE_ENABLE_PWA` | No | `true` | Enable PWA service worker registration |
| `VITE_MILES_TO_SAR_RATE` | No | `0.01` | Miles-to-SAR conversion rate for display (1,000 miles = SAR 10 at default rate) |

---

## Database Migrations

ASPP uses Prisma Migrate for schema management. All migrations are stored in `backend/prisma/migrations/`.

### Apply Pending Migrations

```bash
cd backend
npx prisma migrate deploy
```

Use `migrate deploy` in staging and production environments. It applies all pending migrations without prompting for confirmation.

### Create a New Migration (Development)

```bash
cd backend
npx prisma migrate dev --name describe_your_change
```

This generates a new migration file, applies it to the development database, and regenerates the Prisma client.

### Reset the Database (Development Only)

```bash
cd backend
npx prisma migrate reset
```

**Warning:** This drops all data and re-applies all migrations from scratch. Never run in staging or production.

### View Migration Status

```bash
cd backend
npx prisma migrate status
```

### Database Schema Overview

The PostgreSQL database uses logical schema separation by domain:

| Schema | Tables | Description |
|---|---|---|
| `identity` | `users`, `sessions`, `otp_codes`, `pdpl_consent`, `password_reset_tokens`, `cross_border_transfer_approvals` | Authentication, MFA, sessions, PDPL consent |
| `booking` | `bookings`, `booking_passengers`, `rebooking_requests`, `fare_rules_cache` | PNR data, rebooking workflow |
| `baggage` | `claims`, `claim_documents`, `claim_status_history` | Baggage claim lifecycle |
| `loyalty` | `loyalty_accounts`, `miles_transactions`, `redemption_requests` | Saudia Miles programme |
| `seat` | `seat_selections`, `upgrade_requests` | Seat map selections and upgrade bids |
| `audit` | `audit_log` | Immutable platform-wide audit trail (3-year retention) |
| `notification` | `notification_templates`, `notification_log` | Email/SMS dispatch records |

---

## API Reference

All API endpoints are prefixed with `/api/v1`. Full OpenAPI 3.0 documentation is available at `http://localhost:4000/api-docs` when the backend is running.

### Authentication

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Register a new passenger account; triggers OTP delivery |
| POST | `/auth/register/verify-otp` | No | Verify registration OTP; activates account and returns JWT |
| POST | `/auth/login` | No | Authenticate with email + password; returns pre-auth token if MFA enabled |
| POST | `/auth/login/mfa` | Pre-auth token | Submit MFA code (TOTP or SMS OTP); returns full JWT access + refresh tokens |
| POST | `/auth/refresh` | Refresh cookie | Rotate refresh token; issue new access token |
| POST | `/auth/logout` | Yes | Revoke current session; add JTI to Redis revocation list |
| POST | `/auth/forgot-password` | No | Request password reset email |
| POST | `/auth/reset-password` | No | Submit new password using single-use reset token |
| GET | `/.well-known/jwks.json` | No | RS256 public key set for service-to-service JWT verification |

### Passenger Profile

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | `/profile` | Yes | Retrieve authenticated passenger's full profile |
| PATCH | `/profile` | Yes | Update editable profile fields (name, language, dietary preferences, notification preferences) |
| POST | `/profile/verify-critical-update` | Yes | Request OTP for critical field update (National ID, date of birth) |
| PATCH | `/profile/critical` | Yes | Update critical fields after OTP verification |
| POST | `/profile/pdpl/data-request` | Yes | Submit a PDPL data subject access request |
| GET | `/profile/pdpl/consent` | Yes | Retrieve current PDPL consent record |
| POST | `/profile/pdpl/consent` | Yes | Record updated PDPL consent |

### Bookings

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | `/bookings` | Yes | List all bookings linked to the authenticated passenger's profile |
| GET | `/bookings/{pnr}` | No | Retrieve booking by PNR + surname (query param: `surname`) |
| GET | `/bookings/{pnr}/alternatives` | No | Search alternative flights for rebooking (query params: `dateFrom`, `dateTo`) |
| GET | `/bookings/{pnr}/fare-rules` | No | Retrieve fare rules and change fee summary for a rebooking |
| POST | `/bookings/{pnr}/rebook` | Yes | Initiate rebooking; triggers payment if fare difference applies |
| GET | `/bookings/{pnr}/confirmation` | Yes | Retrieve rebooking confirmation details |

### Payment

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| POST | `/payments/initiate` | Yes | Initiate a payment session for fare difference, seat upgrade, or paid seat selection |
| POST | `/payments/webhook` | No (HMAC-signed) | Payment gateway webhook for settlement confirmation |
| GET | `/payments/{transactionId}` | Yes | Retrieve payment transaction status |

### Baggage Claims

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| POST | `/baggage/claims` | No | Submit a new baggage claim; returns CRN |
| GET | `/baggage/claims` | Yes | List all claims for the authenticated passenger |
| GET | `/baggage/claims/{crn}` | No | Retrieve claim status by CRN + surname (query param: `surname`) |
| POST | `/baggage/claims/{crn}/documents` | No | Upload additional supporting documents to an existing claim |
| GET | `/baggage/claims/{crn}/history` | No | Retrieve claim status change history timeline |

### Loyalty Programme

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | `/loyalty/account` | Yes | Retrieve miles balance, tier status, expiry dates, and tier points |
| GET | `/loyalty/transactions` | Yes | Paginated miles transaction history (20 per page; sortable by date and type) |
| POST | `/loyalty/link` | Yes | Initiate loyalty account linking; sends OTP to loyalty account contact |
| POST | `/loyalty/link/verify` | Yes | Verify OTP to complete loyalty account linking |
| POST | `/loyalty/redeem/upgrade` | Yes | Redeem miles for a cabin class upgrade on an upcoming flight |
| GET | `/loyalty/redeem/upgrade/eligibility/{pnr}` | Yes | Check upgrade redemption eligibility for a specific booking |

### Seat Selection

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | `/seats/{pnr}/map` | Yes | Retrieve interactive seat map for a flight (real-time PSS data) |
| POST | `/seats/{pnr}/select` | Yes | Select a seat; free seats confirm immediately, paid seats route to payment |
| DELETE | `/seats/{pnr}/select` | Yes | Release current seat selection |
| POST | `/seats/{pnr}/upgrade` | Yes | Submit a cabin upgrade request (cash, miles, or hybrid) |
| GET | `/seats/{pnr}/upgrade` | Yes | Retrieve upgrade request status |

### Check-In & Boarding Pass

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | `/checkin/{pnr}/eligibility` | Yes | Check web check-in eligibility (window: 48h to 1h before departure) |
| POST | `/checkin/{pnr}` | Yes | Complete web check-in for one or more passengers on the booking |
| GET | `/checkin/{pnr}/boarding-pass` | Yes | Download boarding pass as PDF |
| GET | `/checkin/{pnr}/boarding-pass/wallet` | Yes | Generate Apple/Google Wallet pass (DPO-approved data-minimised payload) |

### Notifications

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | `/notifications/preferences` | Yes | Retrieve notification preferences |
| PATCH | `/notifications/preferences` | Yes | Update notification preferences (email bookings, SMS alerts, loyalty newsletters) |

---

## Frontend Pages

| File | Route | Description |
|---|---|---|
| `index.html` | `/` | Public landing page — bilingual hero section, quick PNR lookup strip, language toggle, registration and login CTAs, footer |
| `dashboard.html` | `/dashboard` | Authenticated passenger dashboard — KPI cards (miles balance, upcoming flights, open claims), sidebar navigation, welcome banner |
| `feature.html` | `/dashboard/bookings`, `/dashboard/baggage`, `/dashboard/loyalty`, `/dashboard/seats`, `/dashboard/checkin` | Feature module pages — each domain module renders within the dashboard shell with its own route |
| `form.html` | `/dashboard/baggage/new`, `/dashboard/seats/{pnr}/map`, `/dashboard/checkin/{pnr}` | Multi-step form pages — baggage claim submission wizard, seat selection with interactive map, check-in wizard |
| `detail.html` | `/dashboard/bookings/{pnr}`, `/dashboard/baggage/{crn}`, `/dashboard/loyalty/transactions` | Detail and status pages — booking itinerary detail, baggage claim status timeline, loyalty transaction history |

### Module Routing Summary

| Module | Primary Route | Sub-Routes |
|---|---|---|
| Auth | `/auth` | `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/mfa` |
| Bookings | `/dashboard/bookings` | `/dashboard/bookings/:pnr`, `/dashboard/bookings/:pnr/rebook`, `/dashboard/bookings/:pnr/confirmation` |
| Baggage | `/dashboard/baggage` | `/dashboard/baggage/new`, `/dashboard/baggage/:crn` |
| Loyalty | `/dashboard/loyalty` | `/dashboard/loyalty/transactions`, `/dashboard/loyalty/redeem`, `/dashboard/loyalty/link` |
| Seats | `/dashboard/seats` | `/dashboard/seats/:pnr/map`, `/dashboard/seats/:pnr/upgrade` |
| Check-In | `/dashboard/checkin` | `/dashboard/checkin/:pnr`, `/dashboard/checkin/:pnr/boarding-pass` |
| Profile | `/dashboard/profile` | `/dashboard/profile/edit`, `/dashboard/profile/pdpl` |

### Internationalisation

The frontend uses `react-i18next` with two translation bundles:

- `frontend/src/locales/ar.json` — Arabic strings (RTL)
- `frontend/src/locales/en.json` — English strings (LTR)

Language switching is available on every page via the language toggle in the navigation bar. Changing the language:

1. Updates the `i18next` locale context.
2. Swaps the active translation bundle.
3. Sets `dir="rtl"` or `dir="ltr"` on the `<html>` element.
4. Sets `lang="ar"` or `lang="en"` on the `<html>` element.
5. Persists the preference to `localStorage` and updates the user's profile via `PATCH /api/v1/profile` if authenticated.

No full page reload occurs during language switching.

---

## Docker Deployment

### Local Development Stack

Start all services (PostgreSQL, Redis, backend API, and frontend dev server) using Docker Compose:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Services exposed:

| Service | Port | URL |
|---|---|---|
| Frontend (Vite dev) | 5173 | `http://localhost:5173` |
| Backend API | 4000 | `http://localhost:4000` |
| PostgreSQL | 5432 | `postgresql://localhost:5432/aspp_dev` |
| Redis | 6379 | `redis://localhost:6379` |

### Production Build

Build production Docker images:

```bash
# Build backend image
docker build -t aspp-backend:latest ./backend

# Build frontend image (produces optimised static assets served by Nginx)
docker build -t aspp-frontend:latest ./frontend
```

### Production Deployment (Kubernetes)

ASPP is deployed to a KSA-resident Kubernetes cluster using ArgoCD for GitOps continuous delivery.

Apply Kubernetes manifests:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml        # Sealed Secrets — never commit plaintext secrets
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml
```

ArgoCD automatically syncs the cluster state from the `main` branch on every merge via the GitHub Actions CI/CD pipeline.

### Docker Compose Files

| File | Purpose |
|---|---|
| `docker-compose.dev.yml` | Local development — all services with hot reload |
| `docker-compose.test.yml` | CI test environment — isolated database and Redis |
| `docker-compose.prod.yml` | Production reference — used for smoke testing before Kubernetes deployment |

---

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests (requires running PostgreSQL and Redis)
npm run test:integration

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode (development)
npm run test:watch
```

Backend test framework: **Jest** with **Supertest** for HTTP integration tests.

Test coverage targets:

| Category | Target |
|---|---|
| Unit test coverage (statements) | ≥ 80% |
| Integration test coverage (API endpoints) | 100% of documented endpoints |
| Authentication flows | 100% (registration, login, MFA, password reset, token refresh, logout) |
| Payment flows | 100% (success, failure, rollback) |

### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run end-to-end tests (requires running full stack)
npm run test:e2e
```

Frontend test framework: **Vitest** with **React Testing Library** for component tests. End-to-end tests use **Playwright**.

### Accessibility Testing

```bash
cd frontend

# Run axe-core accessibility audit against all pages
npm run test:a11y
```

Accessibility targets: WCAG 2.1 Level AA. Zero critical or serious violations permitted in CI.

### Load Testing

```bash
cd load-tests

# Run k6 load test against staging environment
k6 run --env BASE_URL=https://api.portal-staging.airsaudia.com.sa/v1 scenarios/booking-flow.js
k6 run --env BASE_URL=https://api.portal-staging.airsaudia.com.sa/v1 scenarios/login-flow.js
k6 run --env BASE_URL=https://api.portal-staging.airsaudia.com.sa/v1 scenarios/baggage-claim.js
```

Performance targets (from NFR-001):

| Metric | Target |
|---|---|
| API read operations (P95) | ≤ 800 ms |
| API write operations (P95) | ≤ 1,500 ms |
| Flight search results render (P95) | ≤ 3 seconds |
| Payment processing round-trip (P99) | ≤ 10 seconds |
| Boarding pass PDF generation (P99) | ≤ 5 seconds |
| Concurrent authenticated sessions | 2,000 simultaneous |

### CI Pipeline

The GitHub Actions CI pipeline (`.github/workflows/ci.yml`) runs on every pull request and push to `main`:

1. Lint — ESLint (backend + frontend)
2. Type check — TypeScript strict mode (backend)
3. Unit tests — Jest (backend) + Vitest (frontend)
4. Integration tests — Jest + Supertest against Docker Compose test stack
5. Accessibility audit — axe-core against built frontend
6. TLS scan — testssl.sh against staging environment (on merge to `main`)
7. Docker build — verify images build without errors
8. ArgoCD sync — deploy to staging on merge to `main`

---

## Security & Compliance

### Authentication

- **JWT RS256** — Access tokens (15-minute lifetime) signed with RSA-2048 private key stored in KSA-resident KMS. Public key published at `/.well-known/jwks.json`.
- **Refresh tokens** — 7-day lifetime, stored as SHA-256 hash in `identity.sessions`, rotated on every use. Reuse detection triggers immediate revocation of all user sessions.
- **Token storage** — Access tokens stored in Redux store (browser memory only, never `localStorage`). Refresh tokens stored in HttpOnly, Secure, SameSite=Strict cookies.
- **JWT revocation** — Revoked JTIs stored in Redis sorted set with TTL equal to remaining access token lifetime. Every authenticated request checks the revocation list.
- **MFA** — TOTP (RFC 6238, 30-second window) and SMS OTP (6-digit, 10-minute TTL). TOTP secrets encrypted at rest with AES-256-GCM.
- **Account lockout** — Soft-lock after 5 consecutive failed login attempts. Unlock via email link or admin action.

### Encryption

- **In transit** — TLS 1.3 preferred, TLS 1.2 minimum on all channels. TLS 1.0 and 1.1 disabled. HSTS enforced with `max-age=31536000; includeSubDomains; preload`.
- **At rest** — AES-256-GCM column-level encryption for all PII fields in PostgreSQL (national ID, passport number, date of birth, phone number, TOTP secret, IP addresses). AES-256 SSE for S3-compatible object store. LUKS AES-256-XTS for all VM volumes.
- **Key management** — KSA-resident KMS with HSM-backed master keys. 90-day automated DEK rotation. 365-day KEK rotation. Private keys never leave the KMS.

### PDPL Compliance

- All personal data of Saudi residents remains within KSA-resident infrastructure at all times.
- PDPL consent is recorded in `identity.pdpl_consent` with version and timestamp on registration and on any consent update.
- The PDPL Interceptor middleware strips non-consented fields from API responses and blocks egress of PII to non-KSA endpoints.
- Cross-border transfers (currently only Apple/Google Wallet boarding pass pass-kit) require written DPO approval recorded in `identity.cross_border_transfer_approvals` before implementation. The Wallet payload is data-minimised to exclude full PII.
- Passengers can submit a data subject access request from the profile page (`POST /api/v1/profile/pdpl/data-request`). Confirmation email is sent within 24 hours.
- Audit logs record every PII access and mutation event with user ID, field changed, old value hash, timestamp, and IP address. Logs are retained for 3 years.

### Payment Security

- Card data flows directly from the browser to the KSA-certified payment gateway via the gateway's hosted JavaScript SDK. Card data never touches ASPP servers (PCI-DSS scope reduction).
- ASPP stores only the payment token and transaction reference returned by the gateway.
- Payment gateway webhooks are validated using HMAC-SHA256 signature verification.

### Rate Limiting

- Public (unauthenticated) routes: 100 requests per minute per IP.
- Authenticated routes: 300 requests per minute per authenticated user.
- Login and OTP endpoints have stricter limits enforced by the Redis-backed rate limiter.

---

## Project Structure

```
passenger-portal/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Prisma schema — all domain models
│   │   ├── migrations/            # Prisma migration files
│   │   └── seed.ts                # Development seed data
│   ├── src/
│   │   ├── modules/
│   │   │   ├── identity/          # Auth, MFA, sessions, profile, PDPL
│   │   │   ├── booking/           # PNR retrieval, rebooking, PSS adapter
│   │   │   ├── baggage/           # Claims, document upload, BMS adapter
│   │   │   ├── loyalty/           # Miles, redemption, loyalty adapter
│   │   │   ├── seat/              # Seat map, selection, upgrades
│   │   │   ├── checkin/           # Check-in, boarding pass, wallet
│   │   │   ├── payment/           # Payment gateway adapter, atomic transactions
│   │   │   └── notification/      # Email/SMS dispatch, Bull queue workers
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts          # JWT RS256 validation + revocation check
│   │   │   ├── rateLimiter.middleware.ts   # Redis-backed rate limiting
│   │   │   ├── auditLogger.middleware.ts   # Immutable audit event writer
│   │   │   ├── language.middleware.ts      # Accept-Language / user preference
│   │   │   └── pdplInterceptor.middleware.ts # Consent enforcement + egress block
│   │   ├── adapters/
│   │   │   ├── pss.adapter.ts             # PSS API client with circuit breaker
│   │   │   ├── loyalty.adapter.ts         # Loyalty Back-End API client
│   │   │   ├── bms.adapter.ts             # BMS API client
│   │   │   ├── payment.adapter.ts         # Payment gateway client
│   │   │   ├── sms.adapter.ts             # SMS gateway client
│   │   │   └── email.adapter.ts           # Email service client
│   │   ├── crypto/
│   │   │   ├── encryption.ts              # AES-256-GCM encrypt/decrypt via KMS
│   │   │   └── jwt.ts                     # RS256 sign/verify helpers
│   │   ├── config/
│   │   │   └── index.ts                   # Validated environment configuration
│   │   ├── utils/
│   │   │   ├── errors.ts                  # Typed error classes
│   │   │   └── validators.ts              # Zod validation schemas
│   │   ├── app.ts                         # Express app factory
│   │   └── server.ts                      # HTTP server entry point
│   ├── keys/                              # Local dev RSA key pair (gitignored)
│   ├── .env.example                       # Environment variable template
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── public/
│   │   ├── index.html                     # Public landing page
│   │   ├── dashboard.html                 # Authenticated dashboard shell
│   │   ├── feature.html                   # Feature module page
│   │   ├── form.html                      # Multi-step form page
│   │   └── detail.html                    # Detail / status page
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/                      # Registration, login, MFA, password reset
│   │   │   ├── booking/                   # My bookings, rebooking wizard
│   │   │   ├── baggage/                   # Claim form, status timeline
│   │   │   ├── loyalty/                   # Miles dashboard, redemption
│   │   │   ├── seat/                      # Seat map, upgrade form
│   │   │   ├── checkin/                   # Check-in wizard, boarding pass
│   │   │   └── profile/                   # Profile editor, PDPL requests
│   │   ├── components/
│   │   │   ├── common/                    # Button, Input, Modal, Toast, Spinner
│   │   │   ├── layout/                    # PublicShell, DashboardShell, Sidebar
│   │   │   └── payment/                   # PaymentWidget, MilesCashSlider
│   │   ├── store/
│   │   │   ├── index.ts                   # Redux store configuration
│   │   │   ├── authSlice.ts               # Authentication state
│   │   │   └── api/                       # RTK Query API slices per domain
│   │   ├── locales/
│   │   │   ├── ar.json                    # Arabic translation strings
│   │   │   └── en.json                    # English translation strings
│   │   ├── hooks/
│   │   │   ├── useAuth.ts                 # Authentication hook
│   │   │   ├── useLocale.ts               # RTL/LTR locale hook
│   │   │   └── useIdleTimeout.ts          # 30-minute idle session timeout
│   │   ├── utils/
│   │   │   ├── formatters.ts              # SAR currency, Eastern Arabic numerals
│   │   │   └── validators.ts              # Client-side validation helpers
│   │   ├── i18n.ts                        # react-i18next configuration
│   │   ├── App.tsx                        # Root component + router
│   │   └── main.tsx                       # Vite entry point
│   ├── .env.example                       # Frontend environment variable template
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
├── k8s/                                   # Kubernetes manifests
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── backend.yaml
│   ├── frontend.yaml
│   ├── postgres.yaml
│   ├── redis.yaml
│   └── ingress.yaml
├── load-tests/                            # k6 load test scenarios
│   └── scenarios/
│       ├── booking-flow.js
│       ├── login-flow.js
│       └── baggage-claim.js
├── docker-compose.dev.yml
├── docker-compose.test.yml
├── docker-compose.prod.yml
├── .github/
│   └── workflows/
│       └── ci.yml                         # GitHub Actions CI pipeline
└── README.md
```

---

## Contributing

1. Fork the repository and create a feature branch from `main`: `git checkout -b feature/your-feature-name`
2. Ensure all new code has corresponding unit and integration tests.
3. Run the full test suite locally before opening a pull request: `npm test` in both `backend/` and `frontend/`.
4. Run the accessibility audit: `npm run test:a11y` in `frontend/`.
5. Ensure no ESLint errors: `npm run lint` in both directories.
6. Open a pull request against `main` with a clear description of the change and the functional requirement (FR-XXX) it addresses.
7. All pull requests require at least one approval from a senior engineer and must pass all CI checks before merging.
8. Any change that introduces a new external integration or modifies data flows must include a PDPL impact assessment reviewed by the Data Protection Officer before the pull request is approved.

---

## Licence

Proprietary — Air Saudia Digital Products. All rights reserved.

For API integration enquiries: digital-api@airsaudia.com.sa