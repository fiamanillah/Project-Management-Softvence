# Monorepo Core Principles & System Architecture

> **SCOPE**: Applies universally across all packages, services, and applications in the Softvence monorepo.

---

## 1. Monorepo Topology

```text
/
├── apps/
│   ├── api/          # Express REST API (Modular Architecture)
│   ├── dashboard/    # Next.js 15 App Router Management Dashboard
│   ├── web/          # Vite + React Frontend SPA
│   └── worker/       # RabbitMQ Background Event Worker
├── packages/
│   ├── cache/        # Redis CacheManager & versioned TTL cache
│   ├── db/           # Prisma PostgreSQL & Mongoose MongoDB schemas
│   ├── logger/       # Winston Structured Logger
│   ├── message-broker/ # RabbitMQ Publishers, Consumers & Queues
│   ├── shared/       # Shared Zod Schemas, DTOs & Constants
│   ├── typescript-config/ # Monorepo tsconfig bases
│   └── ui/           # shadcn/ui Component Library & Tailwind tokens
```

---

## 2. Non-Negotiable System Invariants

1. **Centralized Scoped Authorization (Rule BE-1 / FE-1)**
   - Backend access is evaluated exclusively through `can(user, permissionCode, resource)`.
   - Frontend UI is gated exclusively through `hasPermission(map, code)` and `record._capabilities.canX`.
   - Role names or designation codes are **never** hardcoded outside the auth bootstrap layer.

2. **Server-Authoritative Capabilities (Rule BE-17 / FE-2)**
   - The backend resolves record-level capability booleans (`_capabilities: { canEdit: true, canDelete: false }`) and includes them on entity responses.
   - The frontend never infers or computes resource scopes (no `record.teamId === user.teamId`).

3. **Dynamic Lookups over Hardcoded Strings (Rule BE-11)**
   - Statuses, priorities, issue types, and assignment roles live in dynamic database tables.
   - Code branches only on boolean/numeric flags (`isTerminal`, `requiresAction`, `level`), never string codes (`status.code === 'COMPLETED'`).

4. **Data Integrity & Audit Significance (Rule BE-14 / BE-15)**
   - Soft-delete only (`deletedAt`, `leftAt`, `unassignedAt`, `revokedAt`).
   - The shadow inbox (`platform_thread_messages`) is strictly append-only.

5. **Type Safety & Validation Boundaries (Rule BE-19 / FE-14)**
   - Every API request body, parameter, and query string is validated with Zod.
   - All frontend network requests use the shared API client `@/lib/api`.
