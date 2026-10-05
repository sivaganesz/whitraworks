# WhitraWorks Core Platform — Product Requirements Document (PRD)

**Status:** APPROVED / READY FOR IMPLEMENTATION  
**Version:** 1.0.0  
**Target:** Core Multi-Tenant Platform Foundation & Administration  

---

## 1. Executive Summary & Vision

### 1.1 The Vision
WhitraWorks is a configurable, multi-tenant **Business Operations Platform**. Instead of building separate, siloed software systems for every commercial vertical (restaurants, grocery stores, fashion retail, furniture, etc.), WhitraWorks establishes a reusable, rock-solid **core business infrastructure**.

The customer-facing experiences (web storefronts, mobile apps, POS terminals) remain headless and decoupled, consuming platform APIs. The core platform provides the operational backbone:
* Identity & Authentication
* Multi-Tenant Isolation
* Two-Tier Administration (Root Parent Admin vs. Tenant Workspace Admin)
* Role-Based Access Control (RBAC)
* Capability Configuration Engine
* Auditability & Security

### 1.2 Phase 1 Scope: The Core Foundation
Phase 1 deliberately **excludes** business-vertical features (no restaurant menus, grocery carts, or e-commerce checkouts). Phase 1 focuses exclusively on building the **multi-tenant core platform**, including the **TenantOps Root Admin UI**, the **Tenant Workspace Admin UI**, and the **Multi-Tenant NestJS API with PostgreSQL/Prisma**.

---

## 2. Target Personas

| Persona | Role | Key Objectives & Responsibilities |
|---|---|---|
| **Root Superadmin** | Platform Operator (TenantOps) | Manages all tenants globally, provisions workspaces, activates/suspends businesses, toggles capability flags, and monitors platform-wide system health and audit logs. |
| **Tenant Owner** | Business Founder / Primary Account Holder | Creates the initial workspace via public registration, manages business profile/settings, invites managers and staff, assigns roles, and configures workspace operations. |
| **Tenant Administrator** | Business Operations Manager | Invited by the Owner. Manages day-to-day operations, invites new staff members, reviews workspace audit logs, and configures operational parameters. |
| **Tenant Staff** | Operational Employee | Invited with restricted permissions (e.g., cashier, kitchen operator, support). Operates strictly within assigned workspace modules. |

---

## 3. Core Business Invariants & Identity Rules

### 3.1 The Identity Model
* **One Global User**: An email address represents exactly one global user account in the system (`User`).
* **Tenant / Workspace**: A workspace represents one isolated business entity (`Tenant`).
* **Workspace Membership**: The association between a User and a Workspace is managed through a membership record (`WorkspaceMember`) containing the user's role and status within that specific business.

### 3.2 Public Registration Invariant
* Public registration (`whitraworks.com/register`) accepts:
  * User Details: Full Name, Email Address, Password.
  * Workspace Details: Business Name, Desired Subdomain Slug (`<slug>.whitraworks.com`).
* **Collision Rule (Email)**:
  * If the submitted email address **already exists** in the platform:
    * Workspace creation is **aborted**.
    * The platform displays a friendly, clear message directing the user to their existing workspace:
      > *"This email address is already associated with a workspace: `abchotel.whitraworks.com`. Please sign in to your account to continue."*
* **Collision Rule (Subdomain Slug)**:
  * Slug must be unique and alphanumeric (lowercase letters, digits, hyphens).
  * System prohibits **Reserved Slugs**: `ops`, `admin`, `api`, `app`, `www`, `billing`, `support`, `auth`, `mail`, `status`, `portal`.
* **Atomic Creation**: Upon successful validation, the system atomically creates:
  1. The global `User` record.
  2. The `Tenant` record.
  3. The `WorkspaceMember` record with role `OWNER`.
  4. Default workspace roles (`Owner`, `Admin`, `Staff`).

### 3.3 Multi-Workspace Rule (Scenario A: Strict Invite-Only)
* **Single Initial Workspace**: A user can only create **one** workspace (their own) during public signup.
* **No Self-Serve Secondary Workspaces**: Even after authenticating, a user **cannot** independently create additional workspaces.
* **100% Invite-Only Access**: To access additional workspaces, the user must be invited by an Owner or Admin of another workspace.
* **Multi-Workspace Switcher**: When a user belongs to multiple workspaces via invitations, they can switch between workspaces seamlessly from the navigation header. Their role and permissions adapt dynamically to the active workspace.
* **Platform Provisioning**: Only a **Root Superadmin** using the `ops-admin` console can manually provision workspaces outside of public registration.

---

## 4. Functional Requirements

### 4.1 Module: Identity & Authentication
* **FR-AUTH-01**: User registration with Name, Email, Password, and Subdomain Slug.
* **FR-AUTH-02**: Email + Password authentication using Argon2id password hashing.
* **FR-AUTH-03**: Secure session issuance using HttpOnly, host-scoped cookies.
* **FR-AUTH-04**: Session invalidation (Logout) clearing cookies.
* **FR-AUTH-05**: User profile retrieval (`/auth/me`) returning user profile and active workspace membership.
* **FR-AUTH-06**: Workspace switching for multi-workspace users (`/auth/switch-workspace`), issuing an updated tenant-scoped session.

### 4.2 Module: Root Parent Admin (Control Plane — `ops-admin`)
* **FR-OPS-01**: Dedicated Superadmin authentication gate at `ops.whitraworks.com`. Strict check ensuring `isPlatformSuperadmin == true`.
* **FR-OPS-02**: Tenant Directory: View paginated list of all tenants across WhitraWorks with filters (Status: Active, Suspended, Provisioning).
* **FR-OPS-03**: Tenant Provisioning: Ability for Root Superadmins to manually provision a new business tenant and assign an initial owner.
* **FR-OPS-04**: Tenant Lifecycle Control: Ability to activate, suspend, or reactivate any tenant. Suspended tenants immediately block all incoming API and UI requests.
* **FR-OPS-05**: Capability Management: Toggle available platform capabilities (`catalog`, `orders`, `inventory`, `kitchen`, etc.) on a per-tenant basis.
* **FR-OPS-06**: Platform Audit Logs: Cross-tenant view of critical platform administrative actions (e.g., capability toggled, tenant suspended).
* **FR-OPS-07**: Superadmin Tenant Impersonation: Secure, audit-logged ability for support staff to view a tenant workspace in read-only mode for debugging.

### 4.3 Module: Tenant Workspace Admin (Data Plane — `tenant-admin`)
* **FR-TENANT-01**: Tenant authentication on `<slug>.whitraworks.com`. Validates that the user is an active member of this resolved tenant.
* **FR-TENANT-02**: Workspace Profile Management: Update business display name, currency, timezone, contact email, and operational address.
* **FR-TENANT-03**: Member Directory: View all active and invited members of the workspace with their assigned roles.
* **FR-TENANT-04**: Member Invitation Flow:
  * Invite by email and role.
  * Generates an invitation token with expiration.
  * If the invitee already has a WhitraWorks account, they receive an in-app prompt and email invite to accept.
  * If the invitee is new, they receive an activation link to set their password.
* **FR-TENANT-05**: Member Revocation: Ability for Owners/Admins to revoke invites or deactivate members. An Owner cannot be removed.
* **FR-TENANT-06**: Dynamic Sidebar Navigation: Navigation items dynamically appear or hide based on the tenant's active capabilities enabled by Root Ops.

### 4.4 Module: Role-Based Access Control (RBAC)
* **FR-RBAC-01**: Deny-by-default permission evaluation.
* **FR-RBAC-02**: Built-in system roles per tenant:
  * `Owner`: Full administrative and billing authority.
  * `Admin`: Operational administration (manage members, settings, capabilities).
  * `Staff`: Standard operational execution.
* **FR-RBAC-03**: Custom Roles: Ability for Tenant Admins to create custom roles with specific granular permissions (e.g., `members:read`, `members:invite`, `settings:write`).

---

## 5. Non-Functional Requirements (NFR)

* **NFR-SEC-01 (Strict Tenant Isolation)**: Under no circumstances may a database query executed in a tenant context return data belonging to another tenant.
* **NFR-SEC-02 (Host-Scoped Cookies)**: Session cookies must be scoped to the exact host domain (e.g. `abchotel.whitraworks.com`), never wildcarded to `.whitraworks.com`, preventing session hijacking between tenants.
* **NFR-SEC-03 (Privilege Escalation Defense)**: Tenant-level roles cannot satisfy or elevate to `PLATFORM_ADMIN` scopes.
* **NFR-PERF-01 (Tenant Resolution Latency)**: Tenant resolution from the incoming `Host` header must execute in $< 5\text{ ms}$ (cached in memory).
* **NFR-PERF-02 (API Response Time)**: Standard CRUD operations must respond with P95 latency $< 100\text{ ms}$.
* **NFR-AUDIT-01 (Traceability)**: Every state-altering administrative action (invites, role changes, tenant suspensions, capability toggles) must generate an immutable audit log with actor ID, IP address, timestamp, and diff payload.
