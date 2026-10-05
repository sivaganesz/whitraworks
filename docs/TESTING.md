# WhitraWorks Core Platform — Automated Testing Strategy & Standards

**Status:** APPROVED / SPECIFICATION COMPLETE  
**Primary Frameworks:** Vitest (Unit & Integration) + Supertest (HTTP) + Playwright (Multi-Subdomain E2E)  

---

## 1. The WhitraWorks Testing Pyramid

Automated testing in WhitraWorks is engineered to provide fast feedback while guaranteeing zero cross-tenant security regressions.

```text
               ▲
              / \
             /   \      E2E Browser Tests (Playwright)
            / E2E \     • Multi-subdomain registration & login
           /───────\    • Root Ops tenant suspension & capability toggles
          /         \
         /  INTEG    \  Integration & Security Tests (Supertest + Test DB)
        /─────────────\ • Subdomain resolution & AsyncLocalStorage context
       /               \• Multi-tenant negative security tests (Cross-tenant attacks)
      /      UNIT       \• Atomic public registration transaction
     /───────────────────\• RBAC permission & capability guard evaluation
    /                     \
   /       UNIT (FAST)     \ Unit Tests (Vitest)
  /─────────────────────────\• Argon2id password hashing, DTO validations,
                             • Capability dependency resolution, utility functions
```

---

## 2. Test Layer Definitions

### 2.1 Unit Tests (Vitest)
* **Scope**: Isolated functions, validation schemas, utility helpers, and capability dependency checks.
* **Execution**: In-memory, zero database dependencies, $< 50\text{ ms}$ per suite.
* **Key Test Cases**:
  * DTO validation rules (`InviteMemberDto`, `RegisterWorkspaceDto`).
  * Subdomain slug format validation & reserved slug detection.
  * Capability dependency graph resolution (e.g. `kitchen` requires `orders`).
  * Password hashing and timing-safe verification.

### 2.2 Integration Tests (NestJS TestingModule + Supertest + PostgreSQL)
* **Scope**: Controllers, Services, Guards, and Prisma Client Extensions working together against a local test PostgreSQL database.
* **Execution**: Runs against a dedicated `whitraworks_test` database (spun up via `docker-compose.yml`).
* **Key Test Cases**:
  * **Public Registration**:
    * Successful registration creates `User`, `Tenant`, and `WorkspaceMember(OWNER)` in a single transaction.
    * Registration with an existing email returns `409 Conflict` with the friendly redirect message.
    * Registration with reserved slug (`ops`, `api`, `admin`) is blocked.
  * **Subdomain Resolution**:
    * Request with `Host: abchotel.localhost:4000` binds `tenantId` of `abchotel`.
    * Request for suspended tenant immediately returns `403 Forbidden`.
    * Request for unknown slug returns `404 Not Found`.
  * **RBAC & Capabilities**:
    * Member with `STAFF` role attempting to invite members returns `403 Forbidden`.
    * Invoking endpoint requiring disabled capability returns `403 CAPABILITY_DISABLED`.

### 2.3 Dedicated Multi-Tenant Negative Security Tests
Every release must pass explicit security penetration tests:
1. **Cross-Tenant Read Attack**: An authenticated user in Tenant A sends an HTTP request to read data with `Host: tenant-b.localhost:4000`. Expectation: **`403 Forbidden`** (User is not a member of Tenant B).
2. **Cross-Tenant ID Injection Attack**: A user in Tenant A passes `tenantId: 'tenant-b'` inside a request payload or query parameter. Expectation: **Prisma Extension forces `tenantId` to Tenant A**, preventing Tenant B access.
3. **Privilege Escalation Attack**: An `OWNER` of Tenant A sends a request to `/ops/tenants`. Expectation: **`403 Forbidden`** (Platform Superadmin required).

### 2.4 End-to-End (E2E) Browser Tests (Playwright)
* **Scope**: True multi-subdomain browser interactions using Chromium, Firefox, and WebKit.
* **Test Flow 1: Public Signup & Onboarding**:
  * Navigate to `localhost:3000/register`.
  * Fill in form (Business Name: "GreenMart", Slug: "greenmart").
  * Submit $\rightarrow$ Verify redirection to `greenmart.localhost:3000/dashboard`.
  * Verify session cookie is scoped to `greenmart.localhost`.
* **Test Flow 2: Root Ops Governance**:
  * Navigate to `ops.localhost:3001/login` as Superadmin.
  * Locate "GreenMart" in tenant table $\rightarrow$ Click Suspend.
  * Switch to `greenmart.localhost:3000` $\rightarrow$ Refresh page $\rightarrow$ Verify "Workspace Suspended" barrier screen appears.

---

## 3. Test Database Environment Strategy

### 3.1 Isolated Test Database
* A separate PostgreSQL database is defined in `docker-compose.yml`:
  ```text
  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/whitraworks_dev"
  TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/whitraworks_test"
  ```
* Tests **never** run against the development database.

### 3.2 Database Reset / Transaction Isolation
* Before each test suite runs:
  * Prisma migrations apply cleanly: `prisma migrate deploy`.
  * Global seed data (permissions, superadmin) is inserted.
* Between individual integration tests:
  * Truncate tenant-scoped tables or execute operations within rolled-back Prisma transactions.

---

## 4. Test Directory Structure

```text
whitraworks/
├── apps/
│   ├── api/
│   │   ├── src/**/*.spec.ts         # Unit tests alongside code
│   │   └── test/
│   │       ├── integration/         # Supertest integration tests
│   │       │   ├── auth.e2e-spec.ts
│   │       │   ├── public-register.e2e-spec.ts
│   │       │   ├── rbac.e2e-spec.ts
│   │       │   └── multi-tenant-security.e2e-spec.ts
│   │       └── test-setup.ts
│   │
│   ├── ops-admin/
│   │   └── src/**/*.test.tsx        # React component unit tests (Vitest + Testing Library)
│   │
│   └── tenant-admin/
│       └── src/**/*.test.tsx        # React component unit tests
│
└── e2e/                             # Playwright browser end-to-end tests
    ├── playwright.config.ts
    ├── specs/
    │   ├── public-signup.spec.ts
    │   ├── multi-workspace-switching.spec.ts
    │   └── ops-tenant-lifecycle.spec.ts
    └── fixtures/
```

---

## 5. Standard Test Commands

| Command | Action |
|---|---|
| `pnpm test` | Runs all fast unit tests across the monorepo via Turborepo caching. |
| `pnpm test:int` | Runs backend integration tests against `TEST_DATABASE_URL`. |
| `pnpm test:security` | Runs multi-tenant negative security tests. |
| `pnpm test:e2e` | Runs Playwright browser tests across all subdomains. |
| `pnpm test:coverage` | Generates combined unit and integration coverage reports (Target: $\ge 80\%$). |

---

## 6. Golden Rules for Testing (for AI Agents & Developers)

1. **Never mock the database in integration tests**: Test actual SQL queries and Prisma extensions against real PostgreSQL to guarantee tenant scoping works.
2. **Always include negative test cases**: For every positive test (e.g., "can invite member"), there must be a negative test (e.g., "cannot invite without `members:invite` permission").
3. **Never hardcode ports in tests**: Use dynamic test server port allocation or relative paths in Supertest.
4. **Clean up after yourself**: Tests must not leave dirty data that causes subsequent tests to flake.

