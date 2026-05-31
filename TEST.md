# Unit Test Documentation

This document describes the unit test suite for the Demo Credit Wallet API. The tests satisfy the Lendsqr assessment requirement for **positive and negative test scenarios** across core wallet functionality.

## Running Tests

From the `backend/` directory:

```bash
pnpm test              # run all tests once
pnpm test:watch        # re-run on file changes
pnpm test:coverage     # run with coverage report
```

**Current status:** 5 test suites, 53 tests — all passing.

No MySQL instance or live Adjutor API key is required. Tests use mocks for the database and external HTTP calls.

---

## Test Stack

| Tool | Role |
| ---- | ---- |
| **Jest** | Test runner and assertion library |
| **ts-jest** | TypeScript compilation during tests |
| **supertest** | HTTP assertions against the Express app |

Configuration lives in `jest.config.ts`. Environment variables for tests are set in `src/__tests__/setup.ts`.

---

## Directory Structure

```
src/__tests__/
├── setup.ts                          # Test env vars (JWT, Adjutor key, NODE_ENV)
├── mocks/
│   └── uuid.ts                       # Deterministic UUID mock (uuid v14 is ESM-only)
├── helpers/
│   └── mockDb.ts                     # Knex query-builder mock for controller tests
├── utils/
│   └── helpers.test.ts               # Pure utility function tests
├── services/
│   ├── bank.service.test.ts          # Bank lookup & NUBAN validation
│   └── karma.service.test.ts         # Adjutor Karma blacklist logic
└── controllers/
    ├── auth.controller.test.ts       # Register, login, refresh routes
    └── wallet.controller.test.ts     # Balance, fund, send, withdraw, banks routes
```

---

## Testing Strategy

Tests are split into two layers:

### 1. Unit tests (services & utilities)

Functions with little or no I/O are tested directly. Inputs and outputs are asserted without mocking Express or the database.

### 2. Route tests (controllers)

HTTP endpoints are exercised with **supertest** against the real Express app (`src/app.ts`). External dependencies are mocked:

| Dependency | Mock approach |
| ---------- | ------------- |
| **MySQL / Knex** | `mockDb.ts` — a chainable query builder that mimics Knex's `.where()`, `.first()`, `.transaction()`, etc. |
| **Adjutor Karma** | `jest.mock` on `isRegistrationBlocked` in auth tests; `global.fetch` mock in karma service tests |
| **Auth middleware** | Stubbed in wallet tests to inject a fake authenticated user (`userId: "user-1"`) |
| **uuid** | Mapped to a test double via `moduleNameMapper` in Jest config |

This keeps tests fast, isolated, and runnable in CI without infrastructure.

---

## Test Suites

### `helpers.test.ts` — Utility functions

Tests `src/utils/helpers.ts`.

| Function | Positive | Negative |
| -------- | -------- | -------- |
| `generateId` | Returns valid UUID v4 format; values are unique | — |
| `generateReference` | Prefixes with `TXN-` | — |
| `generateRefreshToken` | Returns 64-char hex string | — |
| `hashToken` | Deterministic SHA-256; different tokens → different hashes | — |
| `parseDurationToMs` | Parses `s`, `m`, `h`, `d` suffixes | Invalid format defaults to 7 days |
| `expiresAtFromDuration` | Returns a future date | — |
| `toKarmaPhone` | Converts `080…` → `+234…`; handles `234…` prefix; strips formatting | Returns original string when no digits |
| `formatNaira` | Formats with NGN symbol and thousands separator | — |

---

### `bank.service.test.ts` — Withdrawal bank logic

Tests `src/services/bank.service.ts`.

| Function | Positive | Negative |
| -------- | -------- | -------- |
| `getEligibleBanks` | Returns UBA, OPay, PalmPay | — |
| `findEligibleBank` | Finds bank by code (`033`), slug (`opay`), or name (`palmpay`), case-insensitive | Returns `undefined` for GTBank / unsupported codes |
| `isValidNuban` | Accepts 10-digit account numbers (with optional whitespace) | Rejects too short, too long, non-numeric, or empty strings |

---

### `karma.service.test.ts` — Adjutor Karma blacklist

Tests `src/services/karma.service.ts`. Uses a mocked `fetch`.

| Function | Positive | Negative |
| -------- | -------- | -------- |
| `isKarmaHit` | `true` when `status: success`, `message: Successful`, and `data` present | `false` for error responses, missing data, or partial matches |
| `lookupKarmaIdentity` | Returns parsed JSON; sends Bearer token to Adjutor URL | Throws on 401/403, network failure, and unexpected HTTP errors (500) |
| `isRegistrationBlocked` | `true` when email **or** phone is blacklisted | `false` when neither identity is on Karma |

These tests directly support the assessment rule: *"A user with records in the Lendsqr Adjutor Karma blacklist should never be onboarded."*

---

### `auth.controller.test.ts` — Authentication routes

Tests auth endpoints via HTTP. Database and Karma are mocked.

#### `POST /api/auth/register`

| Scenario | Expected |
| -------- | -------- |
| Valid payload, Karma clear | `201` — account and wallet created (transaction called) |
| Missing required fields | `400` — validation error |
| Duplicate email or phone | `409` — conflict |
| Karma blacklist hit | `403` — registration denied |
| Karma service unavailable | `503` — identity verification failed |

#### `POST /api/auth/login`

| Scenario | Expected |
| -------- | -------- |
| Valid email + password | `200` — returns `token`, `refreshToken`, and user object |
| Missing credentials | `400` |
| Unknown user | `401` — invalid email or password |

#### `POST /api/auth/refresh`

| Scenario | Expected |
| -------- | -------- |
| Missing refresh token | `400` |
| Invalid refresh token | `401` |

---

### `wallet.controller.test.ts` — Wallet routes

Tests wallet endpoints via HTTP. Auth middleware is stubbed; database is mocked.

#### `GET /api/wallet/balance`

| Scenario | Expected |
| -------- | -------- |
| Wallet exists | `200` — numeric balance and formatted Naira string |
| Wallet missing | `404` |

#### `POST /api/wallet/fund`

| Scenario | Expected |
| -------- | -------- |
| Valid amount | `201` — success message and `TXN-` reference; DB transaction called |
| Zero or invalid amount | `400` |

#### `POST /api/wallet/send`

| Scenario | Expected |
| -------- | -------- |
| Valid recipient and sufficient balance | `201` — transfer success; DB transaction called |
| Sender phone equals recipient | `400` — cannot send to yourself |
| Recipient not found | `404` |
| Insufficient balance | `400` |

#### `POST /api/wallet/withdraw`

| Scenario | Expected |
| -------- | -------- |
| Valid amount, eligible bank, sufficient balance | `201` — UBA withdrawal, updated balance |
| Invalid NUBAN (< 10 digits) | `400` |
| Unsupported bank code | `400` — lists eligible banks |
| Insufficient balance | `400` |

#### `GET /api/wallet/banks`

| Scenario | Expected |
| -------- | -------- |
| Default request | `200` — returns UBA, OPay, PalmPay |

---

## Mock Helpers

### `mockDb.ts`

Simulates Knex query chains used by controllers:

- **Table routing** — `mockDb.mockTable("users")` returns a dedicated chain per table name.
- **Thenable chains** — awaiting a query (e.g. duplicate check) resolves via `.resolveWith([])`.
- **`.first()`** — resolves to a single row or `undefined` (login, balance lookup).
- **`.transaction()`** — invokes the callback with the same mock db, verifying transactional writes.

Reset between tests with `mockDb.reset()` in `beforeEach`.

### `setup.ts`

Sets isolated test environment variables so JWT signing and Karma authorization work without a real `.env` file:

```
JWT_SECRET, JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN, ADJUTOR_API_KEY, NODE_ENV=test
```

---

## Assessment Coverage Map

| Assessment requirement | Test coverage |
| ---------------------- | ------------- |
| User can create an account | Register success + duplicate/missing-field negatives |
| User can fund their account | Fund success + invalid amount negative |
| User can transfer funds | Send success + self-transfer, missing recipient, insufficient balance |
| User can withdraw funds | Withdraw success + invalid NUBAN, unsupported bank, insufficient balance |
| Karma blacklist blocks onboarding | Karma service tests + register `403` + Karma outage `503` |

---

## What Is Not Covered (by design)

These are intentionally out of scope for the current unit test suite:

- **Integration tests** against a real MySQL database
- **End-to-end tests** with live Adjutor API calls
- **Transaction history** (`GET /api/transactions`) — pagination and filtering
- **Logout** and full refresh-token rotation happy paths
- **Auth middleware** token blacklist verification in isolation

These can be added later as integration or E2E tests if a test database and CI pipeline are set up.

---

## Adding New Tests

1. Place test files under `src/__tests__/` matching the pattern `**/*.test.ts`.
2. For new routes, follow the controller test pattern: mock `db`, use `supertest(app)`, assert status code and response body.
3. For new pure functions, add a dedicated service/util test file without HTTP mocks.
4. Run `pnpm test` before committing to confirm all suites pass.
