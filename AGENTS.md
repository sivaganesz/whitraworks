# WhitraWorks Core Platform — AI Agent Rules of Engagement & Standards

**Status:** ACTIVE / MANDATORY  
**Target:** AI Coding Agents & Human Developers  

---

## 0. Strict Agent Execution & Permission Protocol

This permission protocol is strict, non-negotiable, and must always be followed at all times.

### 🔴 EXPLICIT PERMISSION REQUIRED (ONLY 2 CASES)
You must **ONLY** ask for user permission before executing:
1. **`git commit` and `git push`**:
   * Never execute `git commit` or `git push` autonomously.
   * Always present the staged changes and wait for explicit approval before committing or pushing.
2. **System-Level & External Operations**:
   * Any system-level update or global machine configuration change.
   * Creating, modifying, or reading anything outside the project workspace folder (`e:\PROJECTS\whitraworks`).

---

### 🟢 PROCEED AUTONOMOUSLY (DO NOT ASK FOR PERMISSION)
For **EVERYTHING ELSE** inside the project workspace directory, proceed autonomously without asking for permission. This includes, but is not limited to:
* **All Staging & Read-Only Git Operations**: `git show`, `git diff`, `git status`, `git log`, `git add`, `git add .`, `git restore`, etc.
* **Package Management**: `pnpm add`, `pnpm install`, `pnpm remove`, updating dependencies and lockfiles.
* **Local Docker Infrastructure**: `docker compose up -d`, `docker compose down`, `docker ps`, viewing container logs, etc.
* **File & Directory Operations**: Creating, editing, renaming, moving, or deleting any project files or directories.
* **Builds, Linters, Compilers & Tests**: `pnpm build`, `turbo build`, `pnpm test`, `vitest run`, typechecks, linters, etc.
* **Database Operations**: Prisma schema migrations (`prisma migrate dev`), client generation (`prisma generate`), database seeding (`pnpm db:seed`), and schema validations.
* **Task Tracking**: Updating `TASKS.md` and `PROGRESS.md` as modules progress.

---

## 1. Golden Architectural Invariants

These rules are non-negotiable. Any pull request or generated code that violates these rules is a critical failure.

| # | Rule | Mandatory Requirement |
|---|---|---|
| **1** | **Strict TypeScript Everywhere** | `strict: true` in `tsconfig.base.json`. Zero use of `any`. Explicit return types on all services and API routes. Use `unknown` with Zod parsing at untrusted boundaries. |
| **2** | **Mandatory Tenant Context** | Never write a query against tenant-scoped tables (`workspace_members`, `roles`, `invitations`, `capabilities`, `audit_logs`) without binding to the active `tenantId`. Rely on the Prisma extension where possible; never bypass it. |
| **3** | **Zero Domain Contamination in Core** | Never write `if (businessType === 'restaurant')` inside core modules. Domain variations are governed strictly through the **Capability Engine** (`@RequireCapability('xyz')`). |
| **4** | **UUID v7 for All Identifiers** | All table primary keys use UUID v7 (time-sortable 128-bit identifiers). No auto-increment integers. No MongoDB ObjectIds. |
| **5** | **Host-Only Cookies (No Wildcards)** | Never set `domain: .whitraworks.com`. All session cookies must omit the domain attribute to lock strictly to the exact issuing host (`ops.whitraworks.com` or `<slug>.whitraworks.com`). |
| **6** | **Two-Tier Privilege Orthogonality** | `isPlatformSuperadmin` and platform scopes (`platform:*`) are completely separate from tenant roles (`OWNER`, `ADMIN`, `STAFF`). A tenant Owner must never be able to satisfy a platform operator check. |
| **7** | **Monorepo Tier Boundaries** | Frontend applications (`apps/ops-admin`, `apps/tenant-admin`) must **never** import `@whitraworks/database`, Prisma clients, or backend code. Communication is strictly over HTTP APIs using shared DTOs from `@whitraworks/types`. |
| **8** | **Class-Validator DTOs & Swagger Annotations** | All backend inputs and responses must be modeled with typed DTO classes decorated with `class-validator` rules and `@ApiProperty()` Swagger annotations. Zero raw, unvalidated payload execution. |
| **9** | **Atomic Registration & Collision Enforcement** | Public registration must enforce: (1) Email collision check directing user to their existing workspace, (2) Subdomain slug reserved check, (3) Atomic transaction creating User, Tenant, and Owner membership. |
| **10** | **Scenario A Invariant** | A user cannot independently create secondary workspaces. Access to additional workspaces is 100% invite-only. |

---

## 2. Coding Conventions & Code Style

### 2.1 File & Directory Naming
* **Files**: `kebab-case.ts` / `kebab-case.tsx` (e.g., `tenant-resolution.middleware.ts`, `workspace-switcher.tsx`).
* **Classes & Components**: `PascalCase` (e.g., `TenantResolutionMiddleware`, `WorkspaceSwitcher`).
* **Functions & Methods**: `camelCase` (e.g., `resolveTenantFromHost`, `mintSessionCookie`).
* **Constants & Enums**: `SCREAMING_SNAKE_CASE` (e.g., `DEFAULT_PAGE_SIZE`, `TENANT_STATUS`).

### 2.2 Error Handling & Responses
* Never return unhandled 500 errors to clients.
* Throw typed NestJS HTTP exceptions (`NotFoundException`, `ConflictException`, `ForbiddenException`, `BadRequestException`).
* Every error must return a structured code matching `docs/API.md`:
  ```typescript
  throw new ConflictException({
    code: 'EMAIL_ALREADY_ASSOCIATED_WITH_WORKSPACE',
    message: `This email address is already associated with a workspace: ${existingSlug}.whitraworks.com. Please sign in to your account to continue.`,
    details: { existingWorkspaceSlug: existingSlug },
  });
  ```

---

## 3. Workflow & Tracking Protocol

When implementing tasks in this codebase, AI Agents must strictly follow this cycle:

1. **Consult `TASKS.md`**: Pick the next uncompleted task in sequential order.
2. **Review Relevant Docs**: Verify requirements against `PRD.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, and `API.md`.
3. **Implement Cleanly**: Write code adhering to all Golden Rules and the permission protocol.
4. **Verify & Test**: Run linter, compiler checks, and tests.
5. **Update `TASKS.md` & `PROGRESS.md`**: Mark the completed task `[x]` and update the live status tracker.
6. **Request Commit & Push Approval**: Present completed work and ask for user permission before committing or pushing.

