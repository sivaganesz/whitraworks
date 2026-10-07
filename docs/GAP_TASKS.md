# WhitraWorks Platform — Foundation Gaps & Production Readiness Tasks

**Branch:** `feature/foundation-readiness`  
**Status:** IN PROGRESS  
**Target:** Production Readiness, Complete User Journeys, and Infrastructure Hardening  

---

## 📋 Task Matrix & Implementation Plan

### Category A: Frontend User Flows (Data Plane UI)
- [x] **Task 1: Public Self-Serve Registration Page (`/register`)** *(Priority 1 - COMPLETED)*
  - Create `/register` route in `apps/tenant-admin`.
  - Live subdomain slug availability check (`GET /public/check-slug`) with debounce.
  - Multi-field atomic registration form (Business Name, Subdomain Slug, Owner Full Name, Email, Password).
  - Handles 409 collision errors gracefully (directing to existing workspace).
  - Automatically redirects to the newly registered workspace upon success.
- [x] **Task 2: Invitation Acceptance Screen (`/invite/accept?token=...`)** *(Priority 2 - COMPLETED)*
  - Create `/invite/accept` route in `apps/tenant-admin`.
  - Inspect public invitation details (`GET /workspace/invitations/:token`).
  - Set password, confirm names, and accept invitation (`POST /workspace/invitations/accept`).
  - Mints host-scoped session cookie and redirects user directly into the workspace dashboard.
- [ ] **Task 3: Domain Capability Interactive Views**
  - Implement functional views for enabled capabilities (`catalog`, `orders`, `kitchen`, `inventory`) instead of generic placeholders.

---

### Category B: Backend Services & Infrastructure
- [x] **Task 4: Redis Caching & Distributed Rate Limiting** *(Priority 3 - COMPLETED)*
  - Wire Redis client into `apps/api` (`RedisModule` / `RedisService`).
  - Cache subdomain tenant resolution lookups (`slug -> tenantId, status`) with automatic cache invalidation on status/profile updates.
  - Implement distributed rate limiting using `@nestjs/throttler` with Redis store on sensitive public endpoints (`/auth/login`, `/public/register`).
- [x] **Task 5: Transactional Email Notification Service (Resend)** *(COMPLETED)*
  - Wire transactional email dispatch via Resend REST API for member invitations, welcome emails, and password resets.
  - Implements responsive, branded HTML templates with fallback dry-run logging mode when unconfigured.
- [x] **Task 6: Distributed Session Invalidation & Token Blocklist (Redis)** *(COMPLETED)*
  - Redis token blocklist to invalidate active sessions instantaneously upon logout (`POST /auth/logout`).
  - Real-time workspace member deactivation session revocation (`session:user_invalidated:<userId>`).
  - Real-time workspace suspension session revocation (`session:tenant_invalidated:<tenantId>`).

---

### Category C: Production Operations & Deployment
- [ ] **Task 7: Production Multi-Stage Containerization**
  - Optimized production `Dockerfile` for `apps/api` (Node.js Alpine dist build).
  - Multi-stage `Dockerfile` and NGINX configs for frontends (`apps/ops-admin`, `apps/tenant-admin`).
  - Production `docker-compose.prod.yml` with host-based reverse proxy routing.
- [ ] **Task 8: GitHub Actions CI/CD Pipeline**
  - `.github/workflows/ci.yml` running linting, TypeScript compilation, Vitest test suites, and Turborepo caching on PRs to `main`/`master`.

---

## 🎯 Initial Sprint: The 3 Recommended Core Tasks
1. **Task 1**: Public Self-Serve Registration Page (`/register`).
2. **Task 2**: Invitation Acceptance Page (`/invite/accept?token=...`).
3. **Task 4**: Redis Caching for Subdomains & Distributed Rate Limiting.
