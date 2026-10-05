# WhitraWorks Core Platform — API Specification & Contracts

**Status:** APPROVED / SPECIFICATION COMPLETE  
**Format:** RESTful JSON  
**Authentication:** HttpOnly Host-Scoped Session Cookies / Bearer fallback  

---

## 1. Global API Standards & Conventions

### 1.1 Host Routing & Base URLs
* **Control Plane API**: `api.whitraworks.com/ops/*` (or `api.localhost:4000/ops/*`)
* **Tenant Data Plane API**: `api.whitraworks.com/*` (or `api.localhost:4000/*` with `Host: <slug>.whitraworks.com`)
* **Public / Registration API**: `api.whitraworks.com/public/*`

### 1.2 Standard Response Envelope
All API endpoints return a predictable JSON envelope:

#### Successful Response (`HTTP 200 / 201`)
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-10-02T20:30:00.000Z",
    "requestId": "req_01j9a8b7c6d5e4f3"
  }
}
```

#### Error Response (`HTTP 4xx / 5xx`)
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human readable explanation.",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2026-10-02T20:30:00.000Z",
    "requestId": "req_01j9a8b7c6d5e4f3"
  }
}
```

---

## 2. Public & Onboarding Endpoints

### 2.1 Check Subdomain Slug Availability
* **`GET /public/check-slug?slug=:slug`**
* **Access**: Public
* **Query Params**: `slug` (alphanumeric string)
* **Response (Available)**:
  ```json
  {
    "success": true,
    "data": { "slug": "abchotel", "available": true }
  }
  ```
* **Response (Reserved or Taken)**:
  ```json
  {
    "success": true,
    "data": { "slug": "ops", "available": false, "reason": "RESERVED" }
  }
  ```

---

### 2.2 Public Workspace Registration
* **`POST /public/register`**
* **Access**: Public
* **Request Body**:
  ```json
  {
    "firstName": "Arjun",
    "lastName": "Kumar",
    "email": "arjun@freshbite.example",
    "password": "StrongPassword123!",
    "businessName": "FreshBite Restaurant",
    "slug": "freshbite"
  }
  ```

#### Success Response (`HTTP 201 Created`):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_01j9a11111",
      "email": "arjun@freshbite.example",
      "firstName": "Arjun",
      "lastName": "Kumar"
    },
    "tenant": {
      "id": "tnt_01j9b22222",
      "name": "FreshBite Restaurant",
      "slug": "freshbite",
      "workspaceUrl": "https://freshbite.whitraworks.com"
    }
  }
}
```
*Sets host-scoped cookie for `freshbite.whitraworks.com`.*

#### Collision Error Response (`HTTP 409 Conflict`):
*Triggered when email already exists in system (Scenario A Rule).*
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_ALREADY_ASSOCIATED_WITH_WORKSPACE",
    "message": "This email address is already associated with a workspace: freshbite.whitraworks.com. Please sign in to your account to continue.",
    "details": {
      "existingWorkspaceSlug": "freshbite",
      "signInUrl": "https://freshbite.whitraworks.com/login"
    }
  }
}
```

---

## 3. Authentication & Session Endpoints

### 3.1 Tenant User Login
* **`POST /auth/login`**
* **Host**: `<slug>.whitraworks.com`
* **Request Body**:
  ```json
  {
    "email": "arjun@freshbite.example",
    "password": "StrongPassword123!"
  }
  ```
* **Behavior**:
  1. Validates user credentials.
  2. Resolves tenant from `Host`.
  3. Verifies user has active membership in this tenant.
  4. Sets `__whitraworks_tenant_session` cookie.

### 3.2 Current Session Profile
* **`GET /auth/me`**
* **Headers**: Session Cookie
* **Response**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "usr_01j9a11111",
        "email": "arjun@freshbite.example",
        "firstName": "Arjun",
        "lastName": "Kumar"
      },
      "activeWorkspace": {
        "id": "tnt_01j9b22222",
        "slug": "freshbite",
        "name": "FreshBite Restaurant",
        "role": "OWNER",
        "permissions": ["*"]
      },
      "availableWorkspaces": [
        {
          "id": "tnt_01j9b22222",
          "slug": "freshbite",
          "name": "FreshBite Restaurant",
          "role": "OWNER"
        },
        {
          "id": "tnt_01j9c33333",
          "slug": "urbanwear",
          "name": "UrbanWear",
          "role": "STAFF"
        }
      ]
    }
  }
  ```

### 3.3 Switch Active Workspace
* **`POST /auth/switch-workspace`**
* **Request Body**: `{ "targetTenantSlug": "urbanwear" }`
* **Response**:
  ```json
  {
    "success": true,
    "data": {
      "redirectUrl": "https://urbanwear.whitraworks.com"
    }
  }
  ```

### 3.4 Logout
* **`POST /auth/logout`**
* Clears session cookies.

---

## 4. Tenant Workspace Endpoints (Data Plane)

### 4.1 Get / Update Workspace Profile
* **`GET /workspace/profile`** (`members:read`)
* **`PATCH /workspace/profile`** (`workspace:update`)
* **Request Body (Patch)**:
  ```json
  {
    "name": "FreshBite Kitchen & Grill",
    "currency": "INR",
    "timezone": "Asia/Kolkata"
  }
  ```

### 4.2 Member Management
* **`GET /workspace/members`** (`members:read`): Paginated list of members with roles.
* **`POST /workspace/members/invite`** (`members:invite`):
  ```json
  {
    "email": "rahul.chef@example.com",
    "roleId": "rol_staff_123"
  }
  ```
* **`DELETE /workspace/members/:memberId`** (`members:remove`): Deactivates member. (Owner cannot be removed).

### 4.3 Workspace Capabilities (Read-Only to Tenant)
* **`GET /workspace/capabilities`** (`capabilities:read`):
  ```json
  {
    "success": true,
    "data": [
      { "code": "catalog", "enabled": true },
      { "code": "orders", "enabled": true },
      { "code": "kitchen", "enabled": true },
      { "code": "inventory", "enabled": false }
    ]
  }
  ```

---

## 5. Root Parent Admin Endpoints (Control Plane — `/ops/*`)

### 5.1 Root Superadmin Login
* **`POST /ops/auth/login`**
* **Host**: `ops.whitraworks.com`
* Strictly validates `isPlatformSuperadmin == true`. Issues `__whitraworks_ops_session`.

### 5.2 Tenant Directory & Management
* **`GET /ops/tenants`**: List all tenants across WhitraWorks with stats, status, and filter.
* **`POST /ops/tenants`**: Manually provision a new tenant from the ops console.
* **`PATCH /ops/tenants/:id/status`**: Toggle tenant status (`ACTIVE` $\leftrightarrow$ `SUSPENDED`).
  ```json
  {
    "status": "SUSPENDED",
    "reason": "Non-payment of platform invoice."
  }
  ```

### 5.3 Configure Tenant Capabilities
* **`PUT /ops/tenants/:id/capabilities`**:
  ```json
  {
    "capabilities": {
      "catalog": true,
      "orders": true,
      "kitchen": true,
      "inventory": false
    }
  }
  ```

### 5.4 Cross-Tenant Platform Audit Logs
* **`GET /ops/audit-logs`**: Filterable logs of system alterations.
