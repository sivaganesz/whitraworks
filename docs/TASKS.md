# WhitraWorks Core Platform — Module-Wise Development Tasks

**Status:** APPROVED / READY FOR IMPLEMENTATION  
**Tracking Key:** `[ ]` Not Started · `[/]` In Progress · `[x]` Completed  

---

## Module 0: Monorepo Foundation & Tooling Setup

- [x] **Task 0.1: Initialize Monorepo Structure**
  * **Files**: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.gitignore`
  * **Description**: Set up `pnpm` workspaces with Turborepo pipeline caching. Configure root scripts (`build`, `dev`, `lint`, `test`, `db:generate`, `db:migrate`).
  * **Acceptance**: `pnpm install` succeeds and `pnpm build` executes via Turborepo.

- [x] **Task 0.2: Configure Shared Tooling & Linter Rules**
  * **Files**: `packages/config/eslint/`, `packages/config/typescript/`
  * **Description**: Enforce strict TypeScript rules (`strict: true`, no unused locals/parameters) and ESLint rules preventing invalid cross-package imports.
  * **Acceptance**: Linter catches cross-package import violations.

- [x] **Task 0.3: Local Infrastructure Setup via Docker Compose**
  * **Files**: `docker-compose.yml`, `.env.example`
  * **Description**: Provide PostgreSQL 16 and Redis 7 local development services with persistent volumes and health checks.
  * **Acceptance**: `docker compose up -d` brings up healthy PostgreSQL and Redis containers.

---

## Module 1: Database & Data Modeling (`packages/database`)

- [x] **Task 1.1: Prisma Schema Implementation**
  * **Files**: `packages/database/prisma/schema.prisma`
  * **Description**: Implement models: `User`, `Tenant`, `WorkspaceMember`, `Role`, `Permission`, `RolePermission`, `Invitation`, `TenantCapabilityConfig`, and `AuditLog` per `docs/DATA_MODEL.md`.
  * **Acceptance**: `pnpm --filter @whitraworks/database prisma validate` passes.

- [x] **Task 1.2: Initial Migration & Index Verification**
  * **Files**: `packages/database/prisma/migrations/`
  * **Description**: Generate initial migration SQL. Verify unique indexes on `users.email`, `tenants.slug`, and compound unique index `[tenantId, userId]`.
  * **Acceptance**: Migration applies cleanly against local PostgreSQL.

- [x] **Task 1.3: Prisma Client Extension for Tenant Isolation**
  * **Files**: `packages/database/src/tenant-extension.ts`, `packages/database/src/client.ts`
  * **Description**: Implement Prisma `$extends` query hook that injects `where: { tenantId }` automatically on tenant-scoped operations using AsyncLocalStorage.
  * **Acceptance**: Unit test confirms queries without manual `tenantId` are automatically scoped.

- [x] **Task 1.4: Database Seeder Script**
  * **Files**: `packages/database/prisma/seed.ts`
  * **Description**: Seed standard platform permissions, default system roles (`OWNER`, `ADMIN`, `STAFF`), and the initial Root Superadmin account.
  * **Acceptance**: `pnpm db:seed` populates PostgreSQL with clean baseline data.

---

## Module 2: Shared Contracts & Libraries (`packages/types`, `packages/ui`)

- [x] **Task 2.1: Shared TypeScript Interfaces & DTOs**
  * **Files**: `packages/types/src/index.ts`, `packages/types/src/user.ts`, `packages/types/src/tenant.ts`, `packages/types/src/capabilities.ts`
  * **Description**: Export all core interfaces, API response envelopes, error codes, and the Global Capability Registry.
  * **Acceptance**: Types compile cleanly and are importable by apps and backend.

- [x] **Task 2.2: Zod Validation Schemas**
  * **Files**: `packages/types/src/validators/`
  * **Description**: Export Zod schemas for public registration, login, member invitation, tenant profile update, and slug format checks.
  * **Acceptance**: Validation tests pass for valid and invalid payloads.

- [x] **Task 2.3: Shared UI Component Library Foundation**
  * **Files**: `packages/ui/src/components/`
  * **Description**: Scaffold reusable accessible components: `Button`, `Input`, `Dialog`, `DataTable`, `Badge`, `DropdownMenu`, `Toast`.
  * **Acceptance**: Storybook / smoke tests verify components render correctly with Tailwind styles.

---

## Module 3: Multi-Tenant Backend Core (`apps/api`)

- [ ] **Task 3.1: NestJS Application Scaffold**
  * **Files**: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`
  * **Description**: Initialize NestJS with CORS, cookie parser, global validation pipes (Zod), and structured JSON logging.
  * **Acceptance**: Server starts at port 4000; `GET /health` returns 200 OK.

- [ ] **Task 3.2: Subdomain Resolution Middleware & AsyncLocalStorage**
  * **Files**: `apps/api/src/core/middleware/tenant-resolution.middleware.ts`, `apps/api/src/core/context/tenant-context.ts`
  * **Description**: Extract `Host` header, resolve tenant from Redis cache/PostgreSQL, validate active status, and store in AsyncLocalStorage.
  * **Acceptance**: Valid subdomains attach context; unknown or suspended subdomains return 404 / 403.

- [ ] **Task 3.3: Authentication Module & Password Hashing**
  * **Files**: `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/auth/auth.controller.ts`
  * **Description**: Implement Argon2id password hashing, credential verification, and host-scoped HttpOnly cookie issuance (`POST /auth/login`, `POST /auth/logout`).
  * **Acceptance**: Login issues correct host-scoped cookie; logout clears it.

- [ ] **Task 3.4: Public Registration with Collision Guards**
  * **Files**: `apps/api/src/modules/public/public.service.ts`, `apps/api/src/modules/public/public.controller.ts`
  * **Description**: Implement `POST /public/register`:
    * Enforce email collision rule (direct to existing workspace slug).
    * Enforce slug availability & reserved slug checks.
    * Atomic transaction: User + Tenant + Owner membership + Role permissions.
  * **Acceptance**: Existing email returns 409 Conflict with friendly message; new email creates workspace successfully.

- [ ] **Task 3.5: Workspace Memberships & Invitation Lifecycle**
  * **Files**: `apps/api/src/modules/workspace/members.service.ts`, `apps/api/src/modules/workspace/members.controller.ts`
  * **Description**: Implement member listing, invitation token creation, invitation acceptance, and member deactivation.
  * **Acceptance**: Owners/Admins can invite new staff; invites accept cleanly; owners cannot be removed.

- [ ] **Task 3.6: Multi-Workspace Switcher Endpoint**
  * **Files**: `apps/api/src/modules/auth/workspace-switch.service.ts`
  * **Description**: Implement `POST /auth/switch-workspace` verifying user has membership in target tenant and returning target redirect URL.
  * **Acceptance**: Returns valid redirect URL for permitted workspaces; rejects unauthorized targets.

- [ ] **Task 3.7: RBAC Guards & Scope Evaluator**
  * **Files**: `apps/api/src/core/guards/rbac.guard.ts`, `apps/api/src/core/decorators/require-permission.decorator.ts`
  * **Description**: Deny-by-default permission evaluator with in-memory caching for active member permissions.
  * **Acceptance**: Gated endpoints reject unauthorized members with 403 Forbidden.

- [ ] **Task 3.8: Capability Configuration Engine & Guard**
  * **Files**: `apps/api/src/core/guards/capability.guard.ts`, `apps/api/src/core/decorators/capability.decorator.ts`
  * **Description**: Decorator `@RequireCapability(code)` and guard verifying the active tenant has the required capability enabled.
  * **Acceptance**: Disabling a capability in DB immediately blocks access to that module's endpoints.

---

## Module 4: Root Parent Admin — Control Plane (`apps/ops-admin`)

- [ ] **Task 4.1: React + Vite Scaffold for Ops Admin**
  * **Files**: `apps/ops-admin/src/App.tsx`, `apps/ops-admin/vite.config.ts`
  * **Description**: Scaffold React 19 app configured for `ops.whitraworks.com` (or `ops.localhost:3001` in dev).
  * **Acceptance**: Dev server starts and renders dark-themed platform layout shell.

- [ ] **Task 4.2: Superadmin Authentication & Protected Routes**
  * **Files**: `apps/ops-admin/src/pages/Login.tsx`, `apps/ops-admin/src/components/ProtectedRoute.tsx`
  * **Description**: Login form for Root Superadmins. Protected route verifying `isPlatformSuperadmin == true`.
  * **Acceptance**: Non-superadmin accounts are rejected with unauthorized error.

- [ ] **Task 4.3: Tenant Directory & Status Lifecycle Management**
  * **Files**: `apps/ops-admin/src/pages/TenantsList.tsx`, `apps/ops-admin/src/components/TenantStatusModal.tsx`
  * **Description**: Paginated table of all tenants. Actions to activate, suspend, or reactivate with audit note prompt.
  * **Acceptance**: Toggling status sends API request, updates table, and creates audit log.

- [ ] **Task 4.4: Tenant Capability Management Drawer**
  * **Files**: `apps/ops-admin/src/components/CapabilityManagerDrawer.tsx`
  * **Description**: Slide-out drawer with toggles for each capability in the registry, enforcing dependency validation.
  * **Acceptance**: Toggling capability writes to backend and live updates tenant configuration.

- [ ] **Task 4.5: Platform Audit Logs & Health Dashboard**
  * **Files**: `apps/ops-admin/src/pages/AuditLogs.tsx`, `apps/ops-admin/src/pages/Overview.tsx`
  * **Description**: Display platform metrics (total tenants, active, suspended) and searchable audit logs.
  * **Acceptance**: Audit events render accurately with actor and timestamp details.

---

## Module 5: Tenant Workspace Admin — Data Plane (`apps/tenant-admin`)

- [ ] **Task 5.1: React + Vite Scaffold for Tenant Admin**
  * **Files**: `apps/tenant-admin/src/App.tsx`, `apps/tenant-admin/vite.config.ts`
  * **Description**: Scaffold React 19 app configured for `<slug>.whitraworks.com` (or `<slug>.localhost:3000` in dev).
  * **Acceptance**: App renders workspace layout shell and detects current subdomain.

- [ ] **Task 5.2: Tenant Authentication & Workspace Switcher**
  * **Files**: `apps/tenant-admin/src/pages/Login.tsx`, `apps/tenant-admin/src/components/WorkspaceSwitcher.tsx`
  * **Description**: Login page and top-header workspace switcher displaying user's available business workspaces.
  * **Acceptance**: Selecting another workspace navigates to the target subdomain.

- [ ] **Task 5.3: Workspace Profile & Settings View**
  * **Files**: `apps/tenant-admin/src/pages/Settings.tsx`
  * **Description**: Forms to view and edit business name, currency, timezone, and operational addresses.
  * **Acceptance**: Saves settings successfully; updates workspace header.

- [ ] **Task 5.4: Staff Members & Invitations Management**
  * **Files**: `apps/tenant-admin/src/pages/Members.tsx`, `apps/tenant-admin/src/components/InviteMemberModal.tsx`
  * **Description**: Table of members with roles and statuses. Modal to send email invitations with role selection.
  * **Acceptance**: Inviting a member sends API request, renders in pending list, and displays shareable link.

- [ ] **Task 5.5: Dynamic Capability-Based Navigation**
  * **Files**: `apps/tenant-admin/src/components/Sidebar.tsx`
  * **Description**: Sidebar that fetches enabled capabilities for the active workspace and conditionally renders module tabs.
  * **Acceptance**: Modules disabled in Ops Admin disappear from the Tenant Admin navigation menu.

---

## Module 6: End-to-End Verification & Integration Testing

- [ ] **Task 6.1: Local Subdomain End-to-End Verification**
  * **Description**: Verify complete flow in local browser using `*.localhost`:
    1. Register `abchotel` via public signup $\rightarrow$ Owner lands in `abchotel.localhost:3000`.
    2. Try registering again with same email $\rightarrow$ Collision error directing to `abchotel`.
    3. Log in to `ops.localhost:3001` as Superadmin $\rightarrow$ Suspend `abchotel` $\rightarrow$ Verify `abchotel` is locked.
    4. Reactivate `abchotel` and toggle `kitchen` capability $\rightarrow$ Verify `kitchen` tab appears in `abchotel`.
  * **Acceptance**: All steps pass without manual database intervention.

- [ ] **Task 6.2: Multi-Tenant Negative Security Tests**
  * **Description**: Automated tests attempting cross-tenant data access:
    * Tenant A user sending request to Tenant B endpoint.
    * Tenant Owner attempting to access `/ops/*` routes.
  * **Acceptance**: All cross-tenant attacks return 403 Forbidden or 404 Not Found.
