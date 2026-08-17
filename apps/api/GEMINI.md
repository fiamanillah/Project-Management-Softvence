# Backend API (`apps/api`) — Gemini Directives

> **MANDATORY CONTEXT**: You are operating in `apps/api`. All backend code must strictly follow these rules.

---

## 🔑 Key Invariants for `apps/api`

1. **Authorization**: Every route and mutation must use `requirePermission(code, resourceLoader)` or `can(user, code, context)`.
2. **Zero Role Checking**: Do NOT branch on `user.systemRole` or `user.designation`.
3. **Capabilities**: Every list/detail endpoint must decorate records with `_capabilities: { canEdit, canDelete, ... }` resolved via `can()`.
4. **Cache Invalidation**: Every write to `designation_permissions`, `user_permission_overrides`, or `delegations` must call `await AuthorizationEngine.getInstance().invalidateCache()`.
5. **Generic 403**: Never disclose org hierarchy in 403 responses. Return `"You don't have access to this resource"`.
6. **Lookup Tables**: Never branch on lookup string codes (e.g. `status.code === 'DONE'`). Use boolean flags like `status.isTerminal`.
7. **Soft Delete**: Use `deletedAt`, `leftAt`, `unassignedAt`. Never execute hard `DELETE`.

---

## 📚 See Full Specification
- [Backend Architecture Rules](../../BackendArchitectureRules.md)
- [Permissions Architecture Rules](../../PermissionsArchitectureRules.md)
