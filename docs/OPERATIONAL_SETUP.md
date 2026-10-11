# WhitraWorks Platform — Production Operational Setup & Deployment Guide

**Target Domain:** `whitraworks.online`  
**Transactional Mail Provider:** [Resend](https://resend.com)  
**Branch:** `configuration`  
**Status:** DRAFT / STEP-BY-STEP IMPLEMENTATION  

---

## 📋 Executive Overview

This document serves as the complete operational guide to transition the WhitraWorks multi-tenant platform from local development into live production on **`whitraworks.online`**.

The implementation is executed **one step at a time** according to the roadmap below:

```mermaid
flowchart LR
    Step1["Step 1: Resend Domain Verification & Transactional Email"]
    Step2["Step 2: DNS & Wildcard Subdomain Routing (*.whitraworks.online)"]
    Step3["Step 3: Cryptographic Secrets & Production Environment (.env)"]
    Step4["Step 4: Codebase Domain Configurations (Nginx, SPA, Docker)"]

    Step1 --> Step2 --> Step3 --> Step4
```

---

## 🛠️ Step-by-Step Implementation Roadmap

### Step 1: Resend Domain Verification & Email Service

#### 1.1 Objective
Verify the custom domain `whitraworks.online` within Resend so transactional emails (workspace invitations, welcome emails, and password resets) are delivered reliably without landing in spam filters.

#### 1.2 DNS Records Required by Resend
1. Navigate to the **[Resend Domains Dashboard](https://resend.com/domains)**.
2. Click **Add Domain** and enter `whitraworks.online`.
3. Resend provides the following DNS records to add at your domain registrar / DNS manager:

| Record Type | Host / Name | Value / Target | Priority | Purpose |
|---|---|---|:---:|---|
| **TXT / CNAME** | `resend._domainkey` | *(Provided by Resend)* | — | **DKIM** (Cryptographic sender authentication) |
| **MX** | `bounces` (or feedback host) | `feedback-smtp.us-east-1.amazonses.com` *(or Resend host)* | 10 | **Return-Path / Bounce Handling** |
| **TXT** | `bounces` | `v=spf1 include:amazonses.com ~all` | — | **SPF** (Sender Policy Framework validation) |
| **TXT** *(Recommended)* | `_dmarc` | `v=DMARC1; p=none;` | — | **DMARC** (Domain-based Message Authentication) |

#### 1.3 Testing Modes
* **Pre-Verification Testing (Development / Sandbox Mode)**:
  * While domain verification is in progress or pending, Resend allows sending test emails from `onboarding@resend.dev` directly to the email address registered with your Resend account.
* **Production Live Mode (Post-Verification)**:
  * Once the domain turns green in Resend, you can send to any recipient using:
    ```bash
    RESEND_FROM_EMAIL="WhitraWorks <notifications@whitraworks.online>"
    ```

---

### Step 2: DNS & Wildcard Subdomain Routing (`whitraworks.online`)

#### 2.1 Objective
Enable host-based routing across all platform tiers:
1. Root public landing & registration (`whitraworks.online`)
2. Control Plane for platform superadmins (`ops.whitraworks.online`)
3. Dedicated API gateway (`api.whitraworks.online`)
4. Dynamic tenant workspaces (`<slug>.whitraworks.online`, e.g., `freshbite.whitraworks.online`, `abchotel.whitraworks.online`)

#### 2.2 Server DNS Records Setup
Add the following 4 records in your DNS manager pointing to your public server IP:

| Record Type | Host / Name | Target / IP | Purpose |
|---|---|---|---|
| **A** | `@` | `<SERVER_IP>` | Root domain (`https://whitraworks.online`) |
| **A** | `ops` | `<SERVER_IP>` | Operator Control Plane (`https://ops.whitraworks.online`) |
| **A** | `api` | `<SERVER_IP>` | API Gateway (`https://api.whitraworks.online`) |
| **A** | `*` (Wildcard) | `<SERVER_IP>` | All dynamic tenant workspaces (`https://<slug>.whitraworks.online`) |

#### 2.3 Cloudflare Recommendation (Zero-Cost Wildcard SSL)
Managing wildcard SSL certificates (`*.whitraworks.online`) on a raw VPS requires DNS validation scripts with Certbot. 

**Recommended Alternative:** Point your domain's nameservers to **Cloudflare (Free Tier)**:
* **Instant Wildcard SSL**: Cloudflare automatically provisions and auto-renews Universal SSL covering `whitraworks.online` and `*.whitraworks.online`.
* **SSL/TLS Encryption Mode**: Set to **"Full (Strict)"** in the Cloudflare dashboard.
* **DDoS & Web Protection**: Built-in layer 7 DDoS mitigation and caching.

---

### Step 3: Production Environment Variables & Cryptographic Secrets

#### 3.1 Objective
Ensure production environment variables (`.env` and `.env.production`) contain cryptographically secure, random secrets and point to the live domain.

#### 3.2 Required Environment Variables

```bash
# =======================================================
# WhitraWorks Platform — Production Environment
# =======================================================

# 1. Environment & Network
NODE_ENV=production
PORT=4000
PLATFORM_DOMAIN=whitraworks.online

# 2. Base URLs & Frontend Hosts
API_BASE_URL=https://api.whitraworks.online
OPS_ADMIN_URL=https://ops.whitraworks.online
TENANT_ADMIN_BASE_DOMAIN=whitraworks.online

# 3. Database & Redis Connection
# Note: Used by docker-compose.prod.yml or cloud-managed instances
DATABASE_URL="postgresql://postgres:REPLACE_WITH_STRONG_DB_PASSWORD@postgres:5432/whitraworks_prod?schema=public"
REDIS_HOST=redis
REDIS_PORT=6379

# 4. Cryptographic Security Secrets (Minimum 32 random characters each)
# Can be generated using: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET="REPLACE_WITH_CRYPTOGRAPHICALLY_SECURE_RANDOM_SECRET_MIN_32_CHARS"
COOKIE_SECRET="REPLACE_WITH_CRYPTOGRAPHICALLY_SECURE_RANDOM_SECRET_MIN_32_CHARS"
JWT_SECRET="REPLACE_WITH_CRYPTOGRAPHICALLY_SECURE_RANDOM_SECRET_MIN_32_CHARS"

# 5. Transactional Email Service (Resend)
RESEND_API_KEY="re_your_api_key_here"
RESEND_FROM_EMAIL="WhitraWorks <notifications@whitraworks.online>"

# 6. Initial Platform Superadmin Seed
INITIAL_SUPERADMIN_EMAIL="superadmin@whitraworks.online"
INITIAL_SUPERADMIN_PASSWORD="REPLACE_WITH_STRONG_SUPERADMIN_PASSWORD"
INITIAL_SUPERADMIN_FIRST_NAME="Root"
INITIAL_SUPERADMIN_LAST_NAME="Superadmin"
```

---

### Step 4: Codebase Domain Adaptations for `whitraworks.online`

#### 4.1 Objective
Update existing production templates, SPA redirect handlers, and NGINX gateway configurations to seamlessly recognize `whitraworks.online` while maintaining local development compatibility (`*.localhost`).

#### 4.2 Key File Updates
1. **NGINX Reverse Proxy Gateway** (`infrastructure/docker/nginx-gateway.conf`):
   * Add `ops.whitraworks.online` to Control Plane server block.
   * Add `api.whitraworks.online` to API server block.
   * Update regex to match `~^(?<tenant_slug>.+)\.whitraworks\.(online|com)$` for dynamic tenant workspaces.
2. **Registration Redirection** (`apps/tenant-admin/src/pages/Register.tsx`):
   * Dynamically redirect new tenant owners to their newly created workspace on `https://${res.tenant.slug}.whitraworks.online/`.
3. **Subdomain Resolution** (`apps/tenant-admin/src/lib/subdomain.ts`):
   * Ensure error notices and helper messages reference `whitraworks.online`.
4. **Production Compose & Template Defaults** (`docker-compose.prod.yml`, `.env.example`):
   * Default `PLATFORM_DOMAIN` to `whitraworks.online`.
   * Include `RESEND_API_KEY` and `RESEND_FROM_EMAIL` placeholders.

---

---

## 🧪 Azure Staging Environment (`stage.whitraworks.online`)

**Server IP:** `172.198.152.230` (Azure Ubuntu 24.04 LTS — Standard_B2ats_v2: 2 vCPU, 1 GiB RAM)  
**Hostinger DNS Status:** ✅ Live and propagated for `stage`, `ops.stage`, `api.stage`, and `*.stage`.

### 1. 1 GiB RAM Optimization & 2 GB Swap Buffer (Run on VM)
To prevent the Linux OOM (Out Of Memory) killer on the 1 GiB Azure VM:
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 2. Pre-Built GHCR Images & Authentication
Images are built in GitHub Actions (16 GB cloud runners) and pulled to the VM to eliminate build memory on the server:
- `ghcr.io/sivaganesz/whitraworks-api:stage`
- `ghcr.io/sivaganesz/whitraworks-ops-admin:stage`
- `ghcr.io/sivaganesz/whitraworks-tenant-admin:stage`

**VM Authentication to GHCR (if packages are private):**
1. Generate a GitHub Personal Access Token (Classic) with `read:packages` scope at:  
   *GitHub &rarr; Settings &rarr; Developer Settings &rarr; Personal Access Tokens (Tokens classic)*
2. Log in on the Azure VM:
   ```bash
   echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u sivaganesz --password-stdin
   ```

### 3. Database Password Guideline (URL Parsing Safety)
`DATABASE_URL` formats connection strings as `postgresql://user:password@host:port/dbname`.  
To prevent URL encoding syntax issues with `@`, `#`, or `/`:
* Generate an alphanumeric password using:
  ```bash
  openssl rand -hex 16
  ```
  *(e.g., `a7c390ef10842e88a381cd09b78291f0`)*

### 4. Database Migrations & Initial Superadmin Seeding (Run Before Starting Full Stack)
To ensure the API container starts against a fully prepared database without startup crashes:

1. **Start only PostgreSQL and Redis first:**
   ```bash
   docker compose --env-file .env.stage -f docker-compose.stage.yml up -d postgres redis
   ```

2. **Push database schema using the pinned Prisma CLI (One-off ephemeral container):**
   ```bash
   docker compose --env-file .env.stage -f docker-compose.stage.yml run --rm api pnpm db:push
   ```

3. **Seed initial permissions, default roles, and Platform Superadmin account:**
   ```bash
   docker compose --env-file .env.stage -f docker-compose.stage.yml run --rm api pnpm db:seed
   ```

4. **Start the complete platform stack:**
   ```bash
   docker compose --env-file .env.stage -f docker-compose.stage.yml up -d
   ```
   *Superadmin is now ready to log in at `http://ops.stage.whitraworks.online` using credentials configured in `.env.stage`.*

### 5. Staging HTTPS Gateway & Operations Dashboard CORS Resolution

#### 5.1 Issue & Root Cause
During post-HTTPS verification, attempting to log in to the Operations Dashboard at `https://ops.stage.whitraworks.online` resulted in an `INTERNAL_SERVER_ERROR` (HTTP 500). The API's bootstrap CORS configuration previously only permitted `localhost` and `whitraworks.com` domains; incoming requests bearing `Origin: https://ops.stage.whitraworks.online` were rejected by the callback, throwing an uncaught Error in the NestJS HTTP pipeline.

#### 5.2 Resolution & Code Changes (Commit `00db329`)
* **Commit:** `00db329` (`00db3299252a71f5a9e8e730e2a3c1d4bebfc8f3`) on branch `configuration`.
* **Centralized Configuration (`apps/api/src/common/config/cors.config.ts`):** Added explicit support for `stage.whitraworks.online` and `whitraworks.online` using anchored regular expressions that strictly disallow nested subdomains.
* **Non-Throwing Rejection:** Updated the CORS callback to invoke `callback(null, false)` instead of throwing an Error for disallowed origins, preserving clean server logs and preventing false 500 alarms while ensuring the browser omits `Access-Control-Allow-Origin`.
* **Test Coverage (`apps/api/test/cors.spec.ts`):** 37 tests validating origin allowlists, deceptive suffix rejections, preflight handling, and authentication/authorization invariance.

#### 5.3 Staging Rollout & Deployment Details
* **Repository Path on VM:** `/home/azureuser/whitraworks`
* **Compose File:** `docker-compose.stage.yml`
* **Environment File:** `.env.stage`
* **Retained Rollback Image ID:** `sha256:36ae63442937862a87e4c4a0d51fa89962f4c2b49cf9741ef75ded18d1019293`
* **Deployed API Image ID:** `sha256:b702d0b5dd3c2c4ce6657c02d0ad14cc0c1d88f55b8ad41f0c348ef44f39b304` (`ghcr.io/sivaganesz/whitraworks-api:stage`)
* **Container Recreated:** Recreated using `docker compose --env-file .env.stage -f docker-compose.stage.yml up -d --no-deps api` without intentionally restarting PostgreSQL, Redis, or Nginx.

#### 5.4 Verification Results
1. **Internal Container Health:**
   ```bash
   sudo docker exec whitraworks-stage-api wget -qO- http://localhost:4000/health
   ```
   *Result:* Status `healthy`, Database `connected` (`{"success":true,"data":{"status":"healthy","database":"connected",...}}`).
2. **Public Gateway HTTPS Health:**
   ```bash
   curl -fsS --max-time 10 https://api.stage.whitraworks.online/health
   ```
   *Result:* Status `healthy`, Database `connected`. TLS certificate and proxy pass-through confirmed.
3. **Operations Dashboard Login:**
   *Result:* Confirmed successful login at `https://ops.stage.whitraworks.online`. The dashboard rendered with zero CORS errors.

---

## 🚦 Execution Checklist & Current Status

| Step | Task | Status | Notes |
|:---:|---|:---:|---|
| **1.1** | Add `whitraworks.online` in Resend Dashboard | ✅ Completed | Domain registered and configured |
| **1.2** | Add DKIM & SPF DNS records at registrar | ✅ Completed | Added in Hostinger DNS |
| **1.3** | Verify domain status turns green in Resend | ✅ Completed | Verified on Resend (Tokyo region) |
| **1.4** | Configure `RESEND_FROM_EMAIL` in `.env` | ✅ Completed | Configured `notifications@whitraworks.online` |
| **2.1** | Provision Azure VM (`172.198.152.230`) & NSG | ✅ Completed | Inbound ports 22, 80, 443 opened |
| **2.2** | Add Staging A records (`stage`, `ops.stage`, `api.stage`, `*.stage`) | ✅ Completed | Verified live on Hostinger DNS |
| **2.3** | Configure Nginx Staging Routing (`nginx-gateway.conf`) | ✅ Prepared | Staging hostnames added (HTTP port 80) |
| **2.4** | Create Staging Docker Compose (`docker-compose.stage.yml`) | ✅ Prepared | Strict memory limits for 1 GiB RAM |
| **2.5** | Create Staging Environment Template (`.env.stage.example`) | ✅ Prepared | Staging environment placeholders |
| **3.1** | GHCR Automated Image Publishing Workflow | ✅ Completed | Builds and pushes `:stage` images |
| **3.2** | VM 2GB Swap buffer & Docker daemon setup | ⏳ In Progress | Azure VM environment preparation |
| **3.3** | Deploy Staging Stack on Azure VM | ✅ Completed | Stack deployed and running via `docker-compose.stage.yml` |
| **3.4** | Provision Wildcard HTTPS (`*.stage.whitraworks.online`) | ✅ Completed | TLS certificates mounted and verified via HTTPS gateway |
| **3.5** | Operations Dashboard CORS Fix & Login Verification | ✅ Completed | Commit `00db329`; image `sha256:b702d0...` |

---

## 📌 Implementation Agreement
As requested, we proceed **one step at a time**, and **no commits, pushes, or deployments will be made without explicit user permission**.


