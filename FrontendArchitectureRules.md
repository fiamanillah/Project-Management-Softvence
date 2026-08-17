# Frontend Architecture Rules

Non-negotiable architectural rules for anyone (human or AI agent) writing frontend code (`apps/dashboard`, `apps/web`, `packages/ui`) in this repository. Each rule has a unique ID for reference in code review, PR descriptions, and commit messages (e.g. `Fixes FE-3`).

> **CONCURRENCY & PRECEDENCE DIRECTIVE:**
> If a rule and a UI feature request conflict, the rule **ALWAYS** wins. Flag the architectural conflict rather than quietly breaking the rule.

---

## 🚪 The Two Gating Primitives — No Third Way Allowed

### FE-1. UI Gating uses ONLY two primitives:
1. **Permission Map (`hasPermission` / `<PermissionGate>` / `<RouteGuard>`)**: For top-level navigation items, entire page routes, and coarse actions not bound to a specific record (e.g. "Create Project", "Export CSV").
2. **Capability Annotations (`record._capabilities.canX`)**: For any action bound to a specific record on screen (e.g. Table row "Approve" button, card "Delete" button, detail page "Reassign" action).

If a gating requirement does not fit either primitive, the solution is to extend the backend response with the missing capability flag — never invent client-side logic to bridge the gap.

### FE-2. Never recompute scope logic client-side.
Never write `if (row.teamId === user.teamId)` or `if (user.hierarchyLevel <= 2)`. Record-level eligibility is evaluated exclusively by the backend resolver and returned as `_capabilities.canX`.
```tsx
// ❌ VIOLATION — Client-side scope guessing
{project.teamId === user.teamId && hasPermission(permissions, 'project.delete') && (
  <Button onClick={handleDelete}>Delete</Button>
)}

// ✅ CORRECT — Server-authoritative capability read
{project._capabilities?.canDelete && (
  <Button onClick={handleDelete}>Delete</Button>
)}
```

### FE-3. Never check `user.systemRole`, `user.designation`, or any role string outside auth bootstrap.
Do not check `user.systemRole === 'Admin'` or `user.designation === 'Lead'` in components, hooks, or pages. Every role check creates a vulnerability that breaks when an administrator creates a new designation with identical responsibilities.

### FE-4. Gating must funnel through shared primitives.
Always use [PermissionGate](./apps/dashboard/components/permission-gate/PermissionGate.tsx), [RouteGuard](./apps/dashboard/components/permission-gate/RouteGuard.tsx), or `hasPermission()`. Never write custom ad-hoc conditional logic that duplicates what these components already provide.

---

## 🔒 Trust Boundaries & Error Handling

### FE-5. Client-side gating is a UX convenience, never a security boundary.
Client-side gates exist solely to give users a clean experience and prevent displaying buttons that would result in a 403 error. Never assume client-side hiding makes an operation secure.

### FE-6. A `403 Forbidden` response is an expected, gracefully handled event.
A 403 API response must never crash the UI, dump unhandled exceptions, or trigger a blank screen. It is handled by the central API client (`/lib/api.ts`), which emits an `onForbidden()` event to passively refetch the latest permission map. The UI should display a calm "Access Restricted" state.

---

## 🔄 Data Freshness & State Management

### FE-7. Permission map is stored in a single shared React Context.
The user permission map is fetched at login and held in [PermissionContext](./apps/dashboard/lib/permissions/PermissionContext.tsx). Never duplicate permission state into local component state, Redux slices, or deep prop drilling.

### FE-8. `_capabilities` fields must never be stripped or altered in mapping layers.
`_capabilities` is a first-class citizen on every entity. If API responses are transformed or mapped into view models, `_capabilities` must be passed through untouched.

### FE-9. Passive and active permission map refresh.
The frontend refreshes the permission map automatically on `403` responses via the `onForbidden` listener. Full page reload or manual re-login must never be required for a user to see newly granted permissions.

---

## 🧱 Component Composition & Dynamic Rendering

### FE-10. Navigation is a data-driven array rendered through `PermissionGate`.
Navigation items are defined as plain data objects (`{ title, href, icon, permissionCode }`) rendered generically in a loop with `<PermissionGate>`. Never write separate conditional JSX navigation trees per user role.

### FE-11. Zero per-role page or dashboard variants.
Never create `AdminDashboard.tsx`, `TeamLeadDashboard.tsx`, or `ManagerView.tsx`. The dashboard uses a single Dynamic Widget Registry (`widget-registry.tsx`), where each widget declares its required permission code. The dashboard renders widgets matching the user's active permission map.

### FE-12. Dynamic lookup tables use a single parameterized CRUD component.
Dynamic lookup tables (statuses, priorities, roles, types) must use generic, parameterized table and modal components rather than separate duplicate screens per lookup table.

### FE-13. Confirm backend permission manifest before gating frontend features.
Never invent placeholder permission code strings on the frontend. A frontend route or button may only gate on permission codes that exist in the backend module manifest.

---

## 🌐 API Client, Forms & Query Invalidation

### FE-14. All network calls must use the shared API client (`@/lib/api`).
Never call native `fetch()` or `axios` directly inside components. Use `api.get`, `api.post`, `api.patch`, `api.delete` from `@/lib/api`. The shared client handles:
- In-memory JWT access token management
- Automatic 401 token refresh queue with pending request retry
- Centralized 403 `onForbidden` notifications
- Standardized `ApiError` throwing

### FE-15. Form validation errors must use `handleFormApiError`.
API validation errors returned in the standard format (`error.details.issues`) must be mapped to `react-hook-form` via `handleFormApiError(err, form.setError)`.
```tsx
try {
  await api.post("/projects", values);
} catch (err) {
  const generalMsg = handleFormApiError(err, form.setError);
  toast.error(generalMsg);
}
```

### FE-16. Scoped query cache invalidation on mutations.
Mutations must explicitly invalidate all affected React Query / SWR cache keys. For example, updating a project status must invalidate:
1. `["project", projectId]`
2. `["projects", "list"]`
3. `["dashboard", "metrics"]`
4. `["notifications"]`

---

## 📋 Frontend Review Checklist (Mandatory for every PR)

1. [ ] No `user.systemRole` or `user.designation` checks outside auth bootstrap.
2. [ ] No client-side scope comparisons (`row.teamId === user.teamId`).
3. [ ] Coarse gates use `<PermissionGate code="...">` or `<RouteGuard code="...">`.
4. [ ] Row-level and record-level actions use `record._capabilities.canX`.
5. [ ] Navigation and dashboards use data-driven registries, not per-role templates.
6. [ ] Network requests go strictly through `@/lib/api`.
7. [ ] Form errors map server validation issues using `handleFormApiError`.
8. [ ] Mutations invalidate all dependent query caches.