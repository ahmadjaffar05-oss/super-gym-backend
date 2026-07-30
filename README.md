# SUPER GYM — API (Phase 1: Foundation)

Enterprise gym management platform backend.
Owner / Club Manager: **Captain Mohammed Abu Husam**

## What's in Phase 1

- Full PostgreSQL data model (`prisma/schema.prisma`) covering every domain
  in the product spec: users/roles, members, coaches, membership plans,
  payments/expenses, attendance, training programs, nutrition, body
  tracking, scheduling, chat, notifications, audit log.
- Production-grade Express + TypeScript app skeleton:
  - Strict TS config, path aliases, ESLint
  - Centralized error handling with Prisma/Zod-aware mapping
  - `winston` logging + `pino-http` request logging
  - `helmet`, CORS allow-list, `hpp`, JSON body limits
  - Global + auth-specific rate limiting
  - Custom double-submit-cookie CSRF protection for cookie-based endpoints
  - Graceful shutdown, DB health check endpoint
- Fully working **authentication module**:
  - Login with bcrypt password verification (12 salt rounds)
  - Short-lived JWT access tokens (Bearer, 15m) + rotating refresh tokens
    (httpOnly cookie, 30d, hashed at rest, reuse-detection revokes the
    whole session family)
  - `/auth/me`, `/auth/logout`
  - Admin-only user provisioning (`POST /auth/users`) with RBAC — only an
    Owner can create another Owner or Head Coach
  - RBAC middleware (`authorize(...roles)`) ready to guard every future
    module's routes
- Seed script that bootstraps the Owner account and default membership plans

## Getting started

```bash
cp .env.example .env          # then edit secrets
docker compose up -d          # starts local Postgres on :5432
npm install
npx prisma migrate dev --name init
npm run seed                  # creates the Owner account
npm run dev                   # http://localhost:4000
```

Generate strong JWT secrets before running anything real:

```bash
openssl rand -hex 64
```

## Key endpoints (Phase 1)

| Method | Path                | Auth              | Description                     |
|--------|---------------------|-------------------|----------------------------------|
| GET    | /api/v1/health       | none              | DB connectivity check            |
| POST   | /api/v1/auth/login   | none (rate-limited)| Returns access token + sets refresh cookie |
| POST   | /api/v1/auth/refresh | refresh cookie + CSRF header | Rotates tokens        |
| POST   | /api/v1/auth/logout  | refresh cookie + CSRF header | Revokes session        |
| GET    | /api/v1/auth/me      | Bearer token      | Current user profile             |
| POST   | /api/v1/auth/users   | Bearer token (Owner/Head Coach/Receptionist) | Provision staff or client account |

The CSRF cookie (`super_gym_csrf`) is set automatically on any response;
the frontend must echo its value back in an `X-CSRF-Token` header on
`/auth/refresh` and `/auth/logout`.

## Next phases

Module folders for programs, nutrition, body tracking, scheduling, chat,
notifications, reports, and settings will be added in the same pattern
as `modules/auth` (`*.validation.ts` → `*.service.ts` → `*.controller.ts`
→ `*.routes.ts`), then wired into `src/routes/index.ts`.

## Phase 3 — Coaches, Payments, Attendance

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/POST | /api/v1/coaches | Owner/Head Coach/Coach/Receptionist/Accountant (write: Owner/Head Coach) | List / create coach profiles |
| GET/PATCH/DELETE | /api/v1/coaches/:id | as above (delete: Owner only) | Coach detail, update, remove |
| GET | /api/v1/payments | Owner/Head Coach/Receptionist/Accountant | List payments, search/filter by status, outstanding summary |
| POST | /api/v1/payments | as above | Record a manual payment/invoice |
| POST | /api/v1/payments/:id/mark-paid | as above | Mark a pending/overdue payment paid |
| POST | /api/v1/payments/:id/cancel | as above | Cancel a payment |
| GET | /api/v1/attendance | Owner/Head Coach/Coach/Receptionist | Today's (or a given date's) attendance log |
| POST | /api/v1/attendance/qr-check-in | as above | Toggle check-in/out by scanning a member's QR code |
| POST | /api/v1/attendance/manual-check-in | as above | Front-desk manual check-in by member ID |
| POST | /api/v1/attendance/check-out | as above | Manually close an open attendance record |

## Phase 4 — Training Programs, Nutrition, Body Tracking

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/POST | /api/v1/programs/exercises | view roles / coaching roles | Exercise library |
| DELETE | /api/v1/programs/exercises/:id | coaching roles | Remove an exercise |
| GET/POST | /api/v1/programs | view roles / coaching roles | List / create training programs (templates or member-assigned) |
| GET/PATCH/DELETE | /api/v1/programs/:id | as above | Program detail, update, remove |
| POST | /api/v1/programs/:id/duplicate | coaching roles | Duplicate a template — as a new template, or assign directly to a member |
| GET/POST | /api/v1/nutrition/meal-plans | view roles / coaching roles | Member meal plans |
| DELETE | /api/v1/nutrition/meal-plans/:id | coaching roles | Remove a meal plan |
| POST | /api/v1/nutrition/water-intake | view roles | Log water intake |
| GET | /api/v1/nutrition/water-intake/:memberId/today | view roles | Today's total |
| GET/POST | /api/v1/body-metrics | view roles / coaching roles | Body measurement readings (auto-computes BMI from the member's on-file height) |
| DELETE | /api/v1/body-metrics/:id | coaching roles | Remove a reading |
| GET/POST | /api/v1/body-metrics/photos | view roles / coaching roles | Progress photos |

"Coaching roles" = Owner, Head Coach, Coach. "View roles" additionally include Receptionist (and Accountant where relevant).
