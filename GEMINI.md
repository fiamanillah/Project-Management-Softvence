# Softvence Monorepo — Antigravity & Gemini Project Rules

> **AUTHORITATIVE DIRECTIVE:**
> This repository is governed by strict architectural rules centered around the **Centralized Scoped Permission Architecture**. Every AI assistant, prompt, or subagent must adhere to these directives with zero exceptions.

---

## 🧭 Core Architectural Pillars

### 1. Centralized Scoped Permissions
- **Single Point of Decision**: All authorization queries must resolve through `can(user, permissionCode, resource)` in `apps/api/src/core/authorization/AuthorizationEngine.ts`.
- **Zero Role Hardcoding**: No component or service may hardcode roles (`SuperAdmin`, `Admin`, `TEAM_LEADER`, etc.) outside the auth bootstrap layer.
- **Server-Resolved Capabilities**: The frontend receives pre-computed capability flags on entities (`_capabilities: { canEdit: true, canDelete: false }`). The frontend **NEVER** re-evaluates scope comparisons (`record.teamId === user.teamId`).
- **Cache Invalidation**: Any grant mutation (`designation_permissions`, `user_permission_overrides`, `delegations`) must bump the Redis `permission_version`.

### 2. Dynamic Lookup Tables vs Enums
- Enums are reserved strictly for fixed engine mechanisms (`SystemRole`, `ScopeResolutionStrategy`, `MessageStatus`).
- Dynamic business values (statuses, priorities, issue types, assignment roles) live in database lookup tables.
- **Code must NEVER branch on lookup codes or names** (e.g. `status.code === 'COMPLETED'`). Always branch on boolean/numeric behavioral flags (e.g. `status.isTerminal`, `status.requiresAction`, `priority.level`).

### 3. Data Integrity & Auditability
- **Soft Deletion Only**: Tables with audit significance use `deletedAt`, `leftAt`, or `unassignedAt`. Hard `DELETE` is prohibited.
- **Shadow Inbox**: `platform_thread_messages` is strictly append-only.
- **Generic 403 Responses**: Denials must never disclose org structure (e.g. "requires OwnTeam scope").

---

## 📑 Authoritative Rule Documents

- [Backend Architecture Rules](./BackendArchitectureRules.md) (Rules `BE-1` to `BE-20`)
- [Frontend Architecture Rules](./FrontendArchitectureRules.md) (Rules `FE-1` to `FE-18`)
- [Permissions Architecture Rules](./PermissionsArchitectureRules.md) (Detailed authorization engine specification)

### Modular Rules Directory (`.agents/rules/`)
- [01-core-principles.md](./.agents/rules/01-core-principles.md)
- [02-permissions-auth.md](./.agents/rules/02-permissions-auth.md)
- [03-backend-rules.md](./.agents/rules/03-backend-rules.md)
- [04-frontend-rules.md](./.agents/rules/04-frontend-rules.md)
- [05-database-models.md](./.agents/rules/05-database-models.md)
