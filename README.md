# API Management Platform

> A production-grade mini Postman + Kong dashboard.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-green?logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red?logo=redis)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://www.docker.com/)

---

## Overview

The **API Management Platform** is a full-stack SaaS-grade application that enables developers and teams to:

- 🔑 **Generate & manage API keys** with hashing, rotation, and expiry
- 🚦 **Apply Redis-backed rate limiting** per key (per-minute / hour / day)
- 🛡️ **Validate JWT tokens** at the gateway layer before proxying
- 🌐 **Proxy requests** through a smart API gateway that logs, authenticates, and rate-limits
- 📊 **Visualise analytics** — requests over time, error rates, top endpoints, status code breakdown
- 🔌 **Create mock API servers** for testing, complete with delay simulation
- 🪝 **Fire webhooks** on events (rate limit exceeded, gateway failure, etc.)
- 🤝 **Manage OAuth clients** with secure credential generation and hashing
- 📋 **Inspect request logs** with filtering, pagination, and search

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js 14)                   │
│  React Query · Zustand · TailwindCSS · Recharts · React Hook Form│
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP / REST
┌──────────────────────────▼──────────────────────────────────────┐
│                        BACKEND (Express + TypeScript)           │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌─────────────┐  │
│  │Controllers│→│ Services │→│Repositories│→│  Prisma ORM  │  │
│  └──────────┘  └──────────┘  └────────────┘  └──────┬──────┘  │
│                                                       │         │
│  ┌──────────────────────────────────────┐   ┌────────▼───────┐ │
│  │  Middleware Stack                    │   │  PostgreSQL 16  │ │
│  │  helmet · cors · rate-limit         │   └────────────────┘ │
│  │  auth · validate · errorHandler     │                       │
│  │  requestLogger · responseWrapper    │   ┌────────────────┐  │
│  └──────────────────────────────────────┘   │    Redis 7     │  │
│                                              │ Rate limiting  │  │
│  ┌───────────────────────────────┐          │ Sessions/cache │  │
│  │  API Gateway (proxy)          │          └────────────────┘  │
│  │  → Validate API key           │                               │
│  │  → Check rate limit (Redis)   │   ┌────────────────────────┐ │
│  │  → Validate JWT (optional)    │   │  Swagger / OpenAPI     │ │
│  │  → Proxy to target            │   │  /api/docs             │ │
│  │  → Log request                │   └────────────────────────┘ │
│  │  → Fire webhooks              │                               │
│  └───────────────────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

### Backend Layer Responsibilities

| Layer | Responsibility |
|---|---|
| **Controllers** | Parse HTTP requests, call service, return response |
| **Services** | Business logic, orchestration, error throwing |
| **Repositories** | Database access via Prisma (no raw SQL leaked up) |
| **Middleware** | Auth, rate-limit, validation, error handling, logging |
| **Utils** | Crypto helpers, pagination, response wrapper, logger |
| **Config** | Environment variables, DB connection, Redis client |

---

## Features

### 1. Authentication & Authorization
- JWT-based access token (15-min TTL) + refresh token rotation (7-day TTL)
- bcrypt password hashing (configurable salt rounds)
- Role-Based Access Control: **Admin**, **Developer**, **Viewer**
- Refresh token stored in DB; revoked on logout or password change
- Token rotation — old refresh token invalidated on every refresh

### 2. API Projects
- Create projects with name, base URL, environment (prod/staging/dev), and description
- Per-project configuration for rate limits, JWT validation, mock endpoints, webhooks

### 3. API Key Management
- Generate keys with format `amp_{env}_{random}` (base64url)
- Keys are **SHA-256 hashed** before storage — raw key shown once only
- Support for expiry dates, revocation, rotation
- Track last-used timestamp (async, non-blocking)

### 4. Rate Limiting
- Redis sliding-window counters per API key
- Three independent limits: per-minute, per-hour, per-day
- Returns `429` with `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining` headers
- Gateway skips global rate limiter — uses per-key rules instead

### 5. API Gateway Proxy
```
GET /api/gateway/:projectId/path/to/resource
  X-API-Key: amp_dev_xxxxxxxxxxxx
```
Pipeline:
1. Extract API key from header / query / Bearer token
2. Validate key (lookup by SHA-256 hash)
3. Check Redis rate limit counters
4. Optionally validate incoming JWT against project config
5. Forward request to `project.baseUrl + path`
6. Persist request log to PostgreSQL
7. Fire relevant webhooks (async)
8. Return proxied response with timing headers

### 6. Request Logs
Stores: method, path, status code, response time, IP, user agent, error message, API key reference.

### 7. Analytics Dashboard
- Total / success / failed requests
- Error rate percentage
- Average / max / min response times
- Requests by status code (pie chart)
- Requests by HTTP method (bar chart)
- Traffic over time — 24h area chart (aggregated by hour)
- Top 10 endpoints by call count

### 8. JWT Validation
Per-project JWT config: issuer, audience, secret (AES-256 encrypted at rest), algorithm (HS256–RS512), expiry validation toggle.

### 9. OAuth Clients
- Generate `clientId` + `clientSecret`; secret is SHA-256 hashed before storage
- Full lifecycle: create, revoke, delete
- Redirect URL and scope configuration

### 10. Mock Server
```
GET /api/mocks/serve/:projectId/path/to/endpoint
```
- Configurable HTTP method, path, response body (JSON), status code, delay
- Hit counter tracked per endpoint
- Webhook event fired on each mock call

### 11. Webhooks
Supported events: `API_KEY_USED`, `RATE_LIMIT_EXCEEDED`, `GATEWAY_REQUEST_FAILED`, `MOCK_ENDPOINT_CALLED`

- HMAC-SHA256 signed payloads (`X-Webhook-Signature` header)
- Async delivery — doesn't block request pipeline
- Full delivery log (status code, response body, duration, success/fail)
- Active/pause toggle

---

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, TailwindCSS, React Query, Zustand, Recharts, React Hook Form + Zod |
| Backend | Node.js, Express 4, TypeScript |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 |
| Cache / Rate-limit | Redis 7 (ioredis) |
| Auth | JSON Web Tokens (jsonwebtoken), bcryptjs |
| API Docs | Swagger / OpenAPI 3.0 (swagger-jsdoc + swagger-ui-express) |
| Logging | Winston + daily-rotate-file |
| Testing | Jest + Supertest |
| Containerisation | Docker + Docker Compose |

---

## Quick Start (Docker)

### Prerequisites
- Docker ≥ 24 and Docker Compose ≥ 2

### 1. Clone and configure
```bash
git clone <repo-url>
cd api-management-platform

# Copy and fill in your secrets
cp .env.example .env
```

Edit `.env` — at minimum change these secrets:
```env
JWT_ACCESS_SECRET=<random 64+ chars>
JWT_REFRESH_SECRET=<random 64+ chars>
ENCRYPTION_KEY=<exactly 32 chars>
POSTGRES_PASSWORD=<strong password>
REDIS_PASSWORD=<strong password>
```

Generate secure secrets:
```bash
# JWT secrets
openssl rand -hex 64

# Encryption key (32 chars)
openssl rand -hex 16
```

### 2. Launch
```bash
docker compose up --build
```

This starts:
- **PostgreSQL** on port `5432`
- **Redis** on port `6379`
- **Backend** on port `4000`
- **Migrator** (runs Prisma migrations + seed data, then exits)
- **Frontend** on port `3000`

### 3. Access
| Service | URL |
|---|---|
| Dashboard | http://localhost:3000 |
| API | http://localhost:4000/api |
| Swagger Docs | http://localhost:4000/api/docs |
| Health Check | http://localhost:4000/api/health |

### 4. Seed Credentials
```
Admin:     admin@apiplatform.dev  /  Admin@123456
Developer: dev@apiplatform.dev    /  Dev@123456
```

---

## Local Development (without Docker)

### Prerequisites
- Node.js ≥ 20
- PostgreSQL ≥ 14 running locally
- Redis ≥ 7 running locally

### Backend
```bash
cd backend

# Install dependencies
npm install

# Copy and edit env
cp .env.example .env
# Edit DATABASE_URL, REDIS_HOST, secrets, etc.

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate:dev

# Seed database
npm run seed

# Start dev server (hot-reload)
npm run dev
```

### Frontend
```bash
cd frontend

npm install

cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:4000

npm run dev
```

---

## Running Tests

```bash
cd backend

# Ensure test DB is running (uses same DATABASE_URL)
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

Tests cover:
- **Auth** — register, login, token refresh, JWT protection, invalid credentials
- **API Keys** — creation, revocation, rotation, raw key exposure (shown once only)
- **Rate Limiting** — rule CRUD, Redis counter increment, 429 enforcement
- **Mock Server** — endpoint creation, serving, method matching, 404 for missing routes

---

## API Usage Examples

### Register & Login
```bash
# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"Pass@1234","name":"Your Name"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"Pass@1234"}'
```

### Create Project
```bash
curl -X POST http://localhost:4000/api/projects \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My API",
    "baseUrl": "https://api.example.com",
    "environment": "DEVELOPMENT",
    "description": "My backend API"
  }'
```

### Generate API Key
```bash
curl -X POST http://localhost:4000/api/api-keys \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<project_id>","name":"Production Key"}'
# Response includes the raw key — save it immediately!
```

### Call Gateway
```bash
curl http://localhost:4000/api/gateway/<project_id>/users \
  -H "X-API-Key: amp_dev_<your_raw_key>"
```

### Create Mock Endpoint
```bash
curl -X POST http://localhost:4000/api/mocks/project/<project_id> \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Get Users",
    "method": "GET",
    "path": "/users",
    "responseBody": [{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}],
    "statusCode": 200,
    "delay": 100
  }'

# Call the mock (no auth needed)
curl http://localhost:4000/api/mocks/serve/<project_id>/users
```

### Set Rate Limit
```bash
curl -X PUT http://localhost:4000/api/rate-limits/project/<project_id> \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"perMinute":60,"perHour":1000,"perDay":10000}'
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_HOST` | ✅ | Redis hostname |
| `REDIS_PORT` | ✅ | Redis port (default 6379) |
| `REDIS_PASSWORD` | | Redis auth password |
| `JWT_ACCESS_SECRET` | ✅ | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | ✅ | Secret for signing refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | | Access token TTL (default `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | | Refresh token TTL (default `7d`) |
| `ENCRYPTION_KEY` | ✅ | 32-char AES-256 key for encrypting JWT secrets |
| `BCRYPT_SALT_ROUNDS` | | bcrypt rounds (default `12`) |
| `CORS_ORIGIN` | ✅ | Allowed frontend origin(s), comma-separated |
| `PORT` | | Server port (default `4000`) |
| `NODE_ENV` | | `development` / `production` |
| `SWAGGER_ENABLED` | | Enable Swagger UI (default `true`) |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API URL (e.g. `http://localhost:4000`) |

---

## Database Schema

```
users
  └── refresh_tokens (1:N)
  └── projects (1:N)
        ├── api_keys (1:N)
        ├── request_logs (1:N)
        ├── rate_limit_rules (1:1)
        ├── jwt_configs (1:1)
        ├── oauth_clients (1:N)
        ├── mock_endpoints (1:N)
        └── webhooks (1:N)
              └── webhook_delivery_logs (1:N)
```

All foreign keys use `CASCADE` delete — removing a project removes all associated data.

---

## Security Design

| Concern | Approach |
|---|---|
| Passwords | bcrypt (cost factor 12) |
| API Keys | SHA-256 hash stored, raw key shown once |
| OAuth Client Secrets | SHA-256 hash stored, raw shown once |
| Webhook Secrets | bcrypt hash stored, raw shown once |
| JWT Signing Secrets | AES-256-CBC encrypted at rest |
| Token Rotation | Refresh tokens single-use; revoked after rotation |
| Headers | `helmet` for security headers (HSTS, X-Frame-Options, etc.) |
| Rate Limiting | Global `express-rate-limit` + per-key Redis counters |
| Input Validation | `express-validator` on all mutation endpoints |
| CORS | Strict allowlist, credentials support |

---

## Project Structure

```
api-management-platform/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Full DB schema (11 models)
│   │   └── seed/index.ts          # Seed data with test users, project, mocks
│   ├── src/
│   │   ├── app.ts                 # Express app factory (middleware, routes, swagger)
│   │   ├── server.ts              # Entry point with graceful shutdown
│   │   ├── config/                # DB, Redis, env config
│   │   ├── controllers/           # HTTP layer — 10 controllers
│   │   ├── services/              # Business logic — auth, gateway, rate limit, etc.
│   │   ├── repositories/          # Data access layer (Prisma wrappers)
│   │   ├── middleware/            # Auth, error handler, request logger, validator
│   │   ├── routes/                # Express routers with Swagger JSDoc
│   │   ├── validators/            # express-validator chains
│   │   └── utils/                 # logger, apiResponse, crypto, pagination
│   ├── tests/                     # Jest + Supertest integration tests
│   └── Dockerfile                 # Multi-stage build
├── frontend/
│   ├── src/
│   │   ├── app/                   # Next.js 14 App Router pages
│   │   │   ├── (auth)/            # Login, Register
│   │   │   └── (dashboard)/       # All dashboard pages + layout
│   │   ├── components/
│   │   │   ├── ui/                # Button, Input, Badge, Card, Modal, StatCard
│   │   │   ├── layout/            # Sidebar, Header, DashboardLayout
│   │   │   └── charts/            # RequestsChart, StatusCodeChart, MethodChart
│   │   ├── lib/                   # axios client, API functions, utils
│   │   ├── store/                 # Zustand auth store (persisted)
│   │   └── types/                 # TypeScript interfaces
│   └── Dockerfile                 # Multi-stage build with Next.js standalone
├── docker-compose.yml             # Full stack orchestration
├── .env.example                   # All required env vars documented
└── README.md
```

---

## License

MIT — free to use in your portfolio, commercial projects, or as a learning reference.
