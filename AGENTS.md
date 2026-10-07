# WhitraWorks Core Platform — AI Agent Rules of Engagement & Standards

**Status:** ACTIVE / MANDATORY  
**Target:** AI Coding Agents & Human Developers  

---

## 0. Strict Agent Execution & Permission Protocol

This permission protocol is strict, non-negotiable, and must always be followed at all times:

1. **Autonomous Git Operations (PERMITTED WITHOUT ASKING)**:
   * The user has explicitly granted full permission to autonomously stage, commit, push, and merge branches (`git add`, `git commit`, `git push`, `git merge`, `git checkout`).
   * Never prompt or ask the user for permission for Git operations inside this repository.

2. **Autonomous Project Operations (PERMITTED WITHOUT ASKING)**:
   * For ALL internal development actions inside the project directory, **proceed autonomously without asking for permission**:
     * Searching and inspecting code (`git grep`, ripgrep, find, dir).
     * Staging, committing, and pushing git changes (`git show`, `git diff`, `git status`, `git log`, `git add`, `git commit`, `git push`).
     * Running workspace and package commands (`pnpm --filter ...`, `pnpm run ...`, `npx ...`, `node ...`, `turbo ...`).
     * Creating, editing, or deleting project files and directories.
     * Installing, updating, or removing dependencies (`pnpm add`, `pnpm install`).
     * Running builds, linters, compilers, and test suites (`pnpm build`, `pnpm test`, `vitest`).
     * Executing database schema generations, Prisma migrations, and seed scripts (`pnpm db:seed`, `prisma ...`).
     * Launching or stopping local Docker services (`docker compose up -d`).
     * Running local curls, HTTP checks, or test scripts inside the workspace.
   * **Under no circumstance should the agent ask for user permission, prompt, or hesitate for any command within `e:\PROJECTS\whitraworks`.**

3. **System-Level & External Operations (Explicit Permission Required)**:
   * **Always ask for user permission first** before:
     * Any system-level update or global OS/tooling configuration change.
     * Creating, modifying, or reading anything outside the project workspace directory (`e:\PROJECTS\whitraworks`).

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

