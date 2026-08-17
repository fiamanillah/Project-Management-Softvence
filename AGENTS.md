# Softvence Monorepo — AI Pair Programming & Architecture Guidelines

> **CRITICAL DIRECTIVE FOR ALL AI CODING AGENTS & PROMPTS:**
> This repository enforces strict architectural boundaries. The single most important subsystem is the **Centralized Scoped Permission Engine**. Every authorization decision, backend route, frontend gating check, API contract, and database migration must strictly adhere to the non-negotiable rules defined here and in the linked architecture documents.

---

## 🏛️ Monorepo Structure & Stack

- **Package Manager & Runtime**: Bun (`>=1.0.0`), Turborepo
- **Backend API (`apps/api`)**: Express.js, TypeScript, Prisma (PostgreSQL), Mongoose (MongoDB audit pipeline), Redis (Cache), RabbitMQ (Event broker)
- **Frontend Dashboard (`apps/dashboard`)**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Shared Packages (`packages/*`)**:
  - `packages/db`: Prisma schema & client (PostgreSQL), MongoDB connection & models
  - `packages/cache`: Redis CacheManager with versioned TTL caching
  - `packages/message-broker`: RabbitMQ publisher & consumers
  - `packages/shared`: Shared Zod schemas, TypeScript types, and constants
  - `packages/ui`: shadcn/ui components & Tailwind styling

---

## 🛡️ The 5 Golden Invariants of Scoped Permissions

1. **Backend Access Goes Strictly Through `can()` (Rule BE-1)**
   - No route, controller, service, or job may branch on `user.systemRole`, `user.designation`, or custom `if` conditions.
   - Access is evaluated via `can(user, permissionCode, resourceContext)`.
2. **Never Check Role / Designation Strings on Frontend (Rule FE-3)**
   - The frontend NEVER checks `user.systemRole === 'Admin'` or `user.designation === 'Lead'`.
   - UI gating uses ONLY two primitives: `hasPermission(permissionMap, code)` / `<PermissionGate>` (for coarse/route actions) and `record._capabilities.canX` (for record-specific actions).
3. **Frontend Never Recomputes Scope Logic (Rule FE-2)**
   - No client-side `record.teamId === user.teamId` or hierarchy comparisons.
   - Record-level capabilities MUST be computed server-side via `can()` and returned as `_capabilities: { canEdit: boolean, canDelete: boolean, ... }`.
4. **Dynamic Lookup Tables Use Behavioral Flags, Never Hardcoded String Codes (Rule BE-11)**
   - Never write `if (status.code === 'DELIVERED')` or `if (priority.name === 'High')`.
   - Use dynamic boolean/numeric flags: `status.isTerminal`, `status.requiresAction`, `priority.level`, `role.qualifiesForTeamScope`.
5. **Cache Invalidation & Versioning on Every Grant Mutation (Rule BE-10)**
   - Any mutation to permissions, designation grants, overrides, or delegations must bump the Redis `permission_version` counter via `AuthorizationEngine.getInstance().invalidateCache()`.

---

## 📚 Architectural Rules Navigation

Detailed, authoritative specifications are organized into the following rule files:

| Rule Specification | Scope | Purpose |
| :--- | :--- | :--- |
| [Permissions Architecture Rules](./PermissionsArchitectureRules.md) | Universal | Full specification of multi-tier authorization, scope strategies, and cache versioning |
| [Backend Architecture Rules](./BackendArchitectureRules.md) | Backend (`apps/api`, `apps/worker`) | Rules `BE-1` through `BE-20` for controllers, services, middleware, and database |
| [Frontend Architecture Rules](./FrontendArchitectureRules.md) | Frontend (`apps/dashboard`, `apps/web`) | Rules `FE-1` through `FE-18` for UI gating, widget registry, API client, and error handling |

### Hierarchical Rule Modules (`.agents/rules/`)
- [01-core-principles.md](./.agents/rules/01-core-principles.md) — System topology, security invariants, and coding conventions
- [02-permissions-auth.md](./.agents/rules/02-permissions-auth.md) — The Centralized Scoped Permissions engine and resolution pipeline
- [03-backend-rules.md](./.agents/rules/03-backend-rules.md) — Express, Prisma, Redis caching, RabbitMQ, and response contracts
- [04-frontend-rules.md](./.agents/rules/04-frontend-rules.md) — Next.js 15, React 19, API client, token refresh queue, and UI gates
- [05-database-models.md](./.agents/rules/05-database-models.md) — Prisma modeling, soft-deletion discipline, and lookup tables

---

## ⚡ Quick Rule Reference Checklist

### When Writing Backend Code:
- [ ] Is access validated with `requirePermission(code, resourceLoader)` middleware or `can(user, code, context)`?
- [ ] Are all record list & detail responses decorated with `_capabilities`?
- [ ] Did you avoid hardcoding role/designation names?
- [ ] Did you avoid branching on lookup code strings (use flags like `isTerminal`)?
- [ ] Does any mutation to user permissions/roles trigger cache version bump?
- [ ] Is 403 returned as a generic message (no org structure disclosure)?
- [ ] Are audit logs recorded for sensitive SuperAdmin bypasses and denied requests?

### When Writing Frontend Code:
- [ ] Is coarse UI gating handled via `<PermissionGate code="...">` or `<RouteGuard code="...">`?
- [ ] Are row/record actions gated strictly by `record._capabilities.canX`?
- [ ] Did you avoid client-side role/designation checks?
- [ ] Are all API requests routed through `@/lib/api` (`api.get`, `api.post`, `api.patch`, `api.delete`)?
- [ ] Does form error handling use `handleFormApiError` to map structured `issues` to fields?
- [ ] Are dashboard pages dynamic widgets via `widget-registry.tsx` instead of per-role files?
