# WhitraWorks Core Platform — Documentation Hub

Welcome to the central documentation repository for **WhitraWorks**, a multi-tenant business operations platform foundation.

---

## 📚 Documentation Index

| Document | Purpose | Primary Audience |
|---|---|---|
| [PRD.md](./PRD.md) | **Product Requirements Document**<br>Business vision, user personas, core functional rules (Scenario A invite-only model, collision guards), and requirements. | Product, Architecture, Engineering |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | **Technical Architecture & Operating Model**<br>Monorepo structure, control plane vs. data plane, subdomain resolution (`*.localhost`), request lifecycle, and session management. | Engineering, DevOps |
| [DATA_MODEL.md](./DATA_MODEL.md) | **Database Schema & Prisma Design**<br>Entity models (`User`, `Tenant`, `WorkspaceMember`, `Role`, `Permission`), relations, indexes, and Prisma extensions for tenant isolation. | Backend Engineering, Database |
| [API.md](./API.md) | **API Specification & Contracts**<br>RESTful endpoint definitions, headers, response envelopes, error structures, and route guards. | Backend & Frontend Engineering |
| [SECURITY.md](./SECURITY.md) | **Security & Multi-Tenant Isolation**<br>Data leakage prevention, cookie isolation, privilege escalation defense, and audit logging. | Security, Architecture, Backend |
| [CAPABILITIES.md](./CAPABILITIES.md) | **Capability Engine Blueprint**<br>Pluggable business capabilities, registry definition, backend guards, and dynamic UI rendering. | Product, Full-Stack Engineering |
| [DESIGN.md](./DESIGN.md) | **UI/UX Design System & Layouts**<br>Design tokens, layout specs for `ops-admin` and `tenant-admin`, navigation models, and component standards. | Frontend Engineering, Design |
| [AGENTS.md](../AGENTS.md) | **AI Agent Guidelines & Golden Rules**<br>Non-negotiable coding conventions, architectural invariants, strict permission protocols, and rules of engagement for AI-assisted development. | AI Coding Agents, Developers |
| [TASKS.md](./TASKS.md) | **Module-Wise Implementation Roadmap**<br>Comprehensive checklist of development tasks organized from Module 0 to Module 6 with acceptance criteria. | All Developers & Agents |
| [PROGRESS.md](./PROGRESS.md) | **Live Implementation Status Tracker**<br>Real-time status board tracking completed modules, active work, and upcoming milestones. | All Developers & Agents |

---

## 🚀 Quick Summary of Key Decisions

1. **Two-Tier Administration Structure**:
   * **Root Parent Admin (`ops-admin`)**: Hosted on `ops.whitraworks.com`. Platform operators manage all tenants, toggle business capabilities, and monitor cross-tenant health.
   * **Tenant Workspace Admin (`tenant-admin`)**: Hosted on `<slug>.whitraworks.com`. Business clients manage their staff, settings, and business operations.
2. **Identity & Workspace Invariants (Scenario A)**:
   * **1 User = 1 Global Account** (unique email).
   * **Public Registration**: Creates 1 User + 1 Workspace. If email exists, creation is blocked and directs user to their existing workspace.
   * **Multi-Workspace Access**: Strictly **invite-only**. Users cannot create secondary workspaces on their own. Workspace switching is enabled when invited to multiple businesses.
3. **Subdomain-Based Multi-Tenancy**:
   * Resolved dynamically via `Host` header (`*.localhost` in development).
   * Cookies scoped to the exact host domain to prevent cross-subdomain session leaks.
4. **Technology Stack**:
   * Monorepo managed via `pnpm` workspaces and `Turborepo`.
   * Backend: **NestJS** (Modular Monolith).
   * Frontends: **React 19 + Vite + Tailwind CSS**.
   * Database: **PostgreSQL + Prisma ORM**.
