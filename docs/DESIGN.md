# WhitraWorks Core Platform — UI/UX Design System & Layouts

**Status:** APPROVED / SPECIFICATION COMPLETE  
**Design Aesthetic:** Modern Enterprise SaaS (Linear / Stripe / Vercel style)  
**CSS Framework:** Tailwind CSS v3 / v4  
**Component Primitives:** Radix UI / Lucide Icons  

---

## 1. Design System Foundations

WhitraWorks utilizes a refined, high-density, accessible design system engineered for fast daily business operations.

### 1.1 Typography
* **Primary Font Family**: Inter (`font-sans`), system fallback.
* **Monospace Font Family**: JetBrains Mono (`font-mono`) for slugs, UUIDs, code, tokens.
* **Hierarchy**:
  * Page Title: `text-2xl font-semibold tracking-tight text-slate-900 dark:text-white`
  * Section Heading: `text-lg font-medium text-slate-800 dark:text-slate-100`
  * Body Text: `text-sm font-normal text-slate-600 dark:text-slate-300`
  * Caption / Metadata: `text-xs text-slate-400 dark:text-slate-500`

### 1.2 Color Palette (Slate & Brand Indigo)
* **Canvas Background**: `bg-slate-50 dark:bg-slate-950`
* **Card Surface**: `bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800`
* **Brand Primary**: `indigo-600 hover:bg-indigo-700 text-white`
* **Status Badges**:
  * Active / Healthy: `bg-emerald-50 text-emerald-700 border-emerald-200`
  * Suspended / Error: `bg-rose-50 text-rose-700 border-rose-200`
  * Provisioning / Warning: `bg-amber-50 text-amber-700 border-amber-200`
  * Invited / Neutral: `bg-slate-100 text-slate-700 border-slate-200`

---

## 2. Layout Architecture

### 2.1 Root Parent Admin Layout (`apps/ops-admin`)
The Control Plane features a prominent **Platform Operator Dark Sidebar** to visually distinguish it from tenant environments.

```text
┌────────────────────────────────────────────────────────────────────────┐
│ WhitraWorks Ops  [Platform Status: Healthy]             [Admin Avatar] │
├──────────────┬─────────────────────────────────────────────────────────┤
│              │ Tenants Directory                                       │
│ 📊 Overview  │ Search: [ Filter by slug or name...   ]  [+ Provision]  │
│ 🏢 Tenants   ├─────────────────────────────────────────────────────────┤
│ ⚙️ Config    │ SLUG      BUSINESS NAME      STATUS    CAPS   ACTIONS    │
│ 📜 Audit     │ abchotel  ABC Hotel & Suites ACTIVE    4      [Config]   │
│ 📈 Telemetry │ freshbite FreshBite Kitchen  ACTIVE    3      [Config]   │
│              │ urbanwear UrbanWear Retail   SUSPENDED 2      [Config]   │
│              │                                                         │
└──────────────┴─────────────────────────────────────────────────────────┘
```

#### Key Components:
1. **Tenant Provisioning Modal**: Allows Superadmins to manually create a tenant, set the slug, and assign the initial owner.
2. **Capability Toggle Drawer**: Slide-out panel for enabling/disabling capabilities on the selected tenant with live dependency feedback.
3. **Tenant Lifecycle Control**: One-click suspend/reactivate with mandatory audit reason modal.

---

### 2.2 Tenant Workspace Admin Layout (`apps/tenant-admin`)
The Data Plane features a **Workspace-Centric Top Header** with the multi-workspace switcher.

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [🏢 FreshBite Kitchen ▼]                        [Notifications] [User] │
├──────────────┬─────────────────────────────────────────────────────────┤
│              │ Workspace Members & Roles                               │
│ 📊 Dashboard │ Manage staff access and invite colleagues. [+ Invite]   │
│ 📖 Catalog*  ├─────────────────────────────────────────────────────────┤
│ 🛍️ Orders*   │ NAME          EMAIL              ROLE     STATUS       │
│ 🍳 Kitchen*  │ Arjun Kumar   arjun@freshbite    OWNER    Active       │
│ 👥 Members   │ Rahul Sharma  rahul@freshbite    STAFF    Active       │
│ ⚙️ Settings  │ Priya Patel   priya@example.com  ADMIN    Invited      │
│              │                                                         │
└──────────────┴─────────────────────────────────────────────────────────┘
* Dynamic nav item (only rendered if capability is enabled by Root Ops)
```

#### Key Components:
1. **Workspace Switcher Dropdown**:
   * Displays the current active workspace.
   * Lists all other workspaces the user has been invited to.
   * Clicking a workspace navigates to `<other-slug>.whitraworks.com`.
2. **Member Invitation Modal**:
   * Email input + Role selector (Owner, Admin, Staff, Custom).
   * Automatically displays warning if the user cannot be invited.
3. **Dynamic Sidebar Navigation**:
   * Uses React Query to subscribe to `/workspace/capabilities`.
   * Hides or shows modules dynamically without requiring a page refresh.

---

## 3. Shared UI Component Library (`packages/ui`)

Built on top of Radix UI primitives for maximum keyboard accessibility (WAI-ARIA compliance):

* **`Button`**: Primary, Secondary, Outline, Destructive, Ghost variants with loading spinners.
* **`Input` & `FormField`**: Accessible inputs with integrated Zod validation error messages.
* **`Modal` / `Dialog`**: Accessible overlay dialogs with smooth transitions.
* **`DataTable`**: Reusable data grid supporting pagination, search filtering, and column sorting.
* **`Badge`**: Semantic status tags for roles and lifecycle states.
* **`DropdownMenu`**: Used for workspace switcher and member actions.
* **`Toast`**: Non-blocking toast notifications for action confirmations and errors.

---

## 4. Frontend State & Data Fetching

* **Data Fetching & Cache**: `@tanstack/react-query` (automatic re-fetching, optimistic updates, query invalidation).
* **Form Management**: `react-hook-form` integrated with `@hookform/resolvers/zod`.
* **Routing**: `react-router-dom` v6 / v7 with protected route layouts and role checks.
