# Core Platform — Architecture, Operating Model, and Long-Term Vision

## 1. Architectural Direction

The intended foundation is:

**Monorepo + Modular Monolith + Multi-Tenancy + PostgreSQL/Prisma + NestJS + React/Vite**

The architecture is deliberately designed to be business-agnostic during the foundation phase.

The core platform should provide reusable infrastructure and platform capabilities first. Future business domains should be implemented as capabilities on top of that foundation.

---

## 2. Monorepo Structure

The project uses a monorepo so related applications, shared packages, infrastructure, and documentation can be maintained together.

```text
business-platform/
│
├── apps/
│   ├── api/                    # NestJS modular monolith
│   └── admin/                  # React + Vite administration UI
│
├── packages/
│   ├── database/               # Prisma schema/client/migrations
│   ├── auth/                   # Authentication utilities
│   ├── authorization/          # RBAC and permission utilities
│   ├── validation/             # Shared validation
│   ├── types/                  # Shared TypeScript contracts
│   ├── api-client/             # Frontend API client
│   ├── ui/                     # Reusable UI components
│   ├── config/                 # Shared configuration
│   └── utils/                  # Truly generic utilities
│
├── docs/
├── infrastructure/
├── scripts/
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

A monorepo does **not** mean the system must use microservices.

The initial backend remains a modular monolith.

---

## 3. Modular Monolith

The API should be one deployable application initially, but internally divided into clear modules.

```text
apps/api
   │
   └── src/modules/
       ├── identity/
       ├── tenants/
       ├── users/
       ├── roles/
       ├── permissions/
       ├── configuration/
       ├── audit/
       └── platform/
```

Each module should have clear responsibilities and dependency boundaries.

The goal is to avoid both a large unstructured monolith and unnecessary microservice complexity.

A future module should only become an independent service if there is a real operational, scaling, ownership, or deployment reason.

---

## 4. Multi-Tenant Operating Model

The platform supports multiple independent tenant environments.

```text
Platform
│
├── Tenant A
│   ├── Users
│   ├── Roles
│   ├── Configuration
│   └── Data
│
├── Tenant B
│   ├── Users
│   ├── Roles
│   ├── Configuration
│   └── Data
│
└── Tenant C
    ├── Users
    ├── Roles
    ├── Configuration
    └── Data
```

Tenant context must be established and validated consistently throughout the request lifecycle.

Tenant isolation must be considered in database queries, caches, background processing, audit records, logs, APIs, and administration.

---

## 5. High-Level Request Flow

```text
Client Application
       │
       ▼
API Request
       │
       ▼
Authentication
       │
       ▼
Tenant Resolution
       │
       ▼
Authorization / RBAC
       │
       ▼
Validation
       │
       ▼
Domain / Module Logic
       │
       ▼
Database / External Services
       │
       ▼
Audit + Observability
       │
       ▼
API Response
```

This flow establishes the platform responsibilities before business-specific logic is executed.

---

## 6. Configuration Model

Configuration is a major mechanism for keeping the platform reusable.

The general model is:

```text
Tenant
   ↓
Business Type
   ↓
Enabled Capabilities
   ↓
Capability Configuration
   ↓
Admin Modules + API Behavior
```

Configuration should be explicit, validated, versionable where appropriate, and safe to change.

Business-specific rules should not be scattered through the codebase as arbitrary conditionals.

---

## 7. API and Client Separation

The backend should expose stable APIs independent of the admin frontend.

```text
                   Platform API
                 /      |       \
                /       |        \
           Admin UI   Web App   Mobile App
```

The admin application is one consumer of the API, not the API itself.

This separation allows future clients to use the same platform services.

---

## 8. Data Foundation

The current database direction is PostgreSQL with Prisma.

The database should provide:

* Strong relationships
* Transactions
* Referential integrity
* Tenant-aware data modeling
* Clear migrations
* Predictable query behavior
* Appropriate indexes
* Audit support

The database design should remain generic at the foundation stage and avoid prematurely modeling restaurant, grocery, clothing, or other domain-specific structures.

---

## 9. Security Model

Security is a cross-cutting foundation concern.

The platform should establish:

```text
Identity
   ↓
Authentication
   ↓
Tenant Context
   ↓
Role / Permission Evaluation
   ↓
Resource Authorization
   ↓
Business Operation
```

Security controls should be consistently applied across APIs, admin operations, background jobs, and future integrations.

---

## 10. Future Business-Domain Model

Once the foundation is stable, business domains can be added without changing the fundamental platform model.

Conceptually:

```text
                    Core Platform
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   Restaurant        Grocery            Clothing
   capabilities      capabilities       capabilities
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                 Tenant-specific setup
                          │
                    Admin + APIs
                          │
                    Client Apps
```

The first domain implementation should act as an architectural validation exercise.

If the first domain repeatedly requires modifications to supposedly universal concepts, those concepts should be reconsidered before adding more domains.

---

## 11. Long-Term Vision

The platform should evolve toward a reusable business operating foundation.

```text
                        BUSINESS PLATFORM
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
         Platform Core    Business Capabilities  Infrastructure
             │                 │                 │
             └─────────────────┼─────────────────┘
                               │
                         Tenant Environment
                               │
                    ┌──────────┴──────────┐
                    │                     │
                Admin Platform          APIs
                                          │
                              ┌───────────┼───────────┐
                              │           │           │
                            Web        Mobile       Custom
                            App         App          App
```

The platform should make it progressively easier to introduce new business domains without duplicating the underlying platform.

---

## 12. Architectural Success Criteria

The foundation should be considered healthy when:

1. A tenant can be created and isolated correctly.
2. Users can authenticate securely.
3. Roles and permissions can be managed consistently.
4. APIs can resolve tenant context safely.
5. The admin platform can consume the same APIs as other clients.
6. Shared packages have clear ownership and do not become dumping grounds.
7. Business-specific concepts can be added without rewriting platform fundamentals.
8. Database changes are managed through controlled migrations.
9. Audit and observability provide enough information to understand important operations.
10. The monorepo remains easy for both developers and AI coding agents to understand.

---

## 13. The Core Architectural Rule

The most important dependency rule is:

```text
Business Domain
      ↓
Business Capability
      ↓
Core Platform
      ↓
Infrastructure
```

The dependency should not become:

```text
Core Platform
      ↓
Restaurant-specific assumptions
```

The foundation must remain useful even before any specific business domain exists.

That is the architectural test for the entire project.
