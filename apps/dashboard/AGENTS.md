# Dashboard Frontend (`apps/dashboard`) — AI Agent Directives

> **MANDATORY CONTEXT**: You are operating in `apps/dashboard`. All frontend code must strictly follow these rules.

---

## 🔑 Key Invariants for `apps/dashboard`

1. **The Two Gating Primitives**:
   - Coarse/Nav/Page actions: `<PermissionGate code="...">`, `<RouteGuard code="...">`, or `hasPermission(map, code)`.
   - Record-specific actions: `record._capabilities?.canX`.
2. **Zero Role Checking**: Do NOT check `user.systemRole` or `user.designation`.
3. **No Client Scope Comparisons**: Never compare `row.teamId === user.teamId`. Capabilities must come from the server.
4. **Shared API Client**: All network requests must use `@/lib/api` (`api.get`, `api.post`, `api.patch`, `api.delete`).
5. **Form Error Mapping**: Map server validation errors to `react-hook-form` via `handleFormApiError(err, form.setError)`.
6. **No Per-Role Dashboards**: Dashboards use `widget-registry.tsx` to dynamically render widgets matching user permissions.
7. **Query Cache Invalidation**: Mutations must invalidate all affected query keys explicitly.

---

## 📚 See Full Specification
- [Frontend Architecture Rules](../../FrontendArchitectureRules.md)
- [Permissions Architecture Rules](../../PermissionsArchitectureRules.md)
