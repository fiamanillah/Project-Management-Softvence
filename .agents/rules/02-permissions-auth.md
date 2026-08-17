# Centralized Scoped Permissions & Authorization

> **SCOPE**: Authorization Engine, Middleware, Scope Evaluator, Caching, and UI Gating.

---

## 1. Resolution Order in `can()`

All authorization evaluates through `AuthorizationEngine.getInstance().can(user, permissionCode, resourceContext)`.

1. **Step 1: SuperAdmin Fast-Path**
   - Returns `true` immediately.
   - If permission is sensitive (`billing.*`, `*.manage`, `*.delete`, `*.revoke`, `*.reassign`, `auth.user.*`, `organization.*`), writes an audit log to RabbitMQ -> MongoDB via `AuditLogService.log()`.
2. **Step 2: Explicit User Overrides (`user_permission_overrides`)**
   - Deny overrides (`isDeny: true`) **always take precedence and short-circuit to false**.
   - Grant overrides (`isDeny: false`) match on global or matching `departmentId`/`teamId`/`projectId`.
3. **Step 3: Designation Grants & Scope Evaluation**
   - Resolves active `designation_permissions` for the user's `designationId`.
   - Delegates to `ScopeEvaluator.evaluate(user, grant, resource, prisma)`.
4. **Step 4: Active Delegations (`delegations`)**
   - Checks active delegations where `delegateeId === user.id` within `validFrom`–`validUntil`.
   - Re-evaluates permissions acting as the delegator.
5. **Step 5: Fallback Deny**
   - Returns `false`.

---

## 2. Scope Strategies Supported by `ScopeEvaluator`

- `Global`: Always returns `true`.
- `OwnDepartment`: Resource department matches user's department, any descendant department in the hierarchy, or team department.
- `OwnTeam`: User is active member of `resource.teamId` or user's team is assigned to `resource.projectId`.
- `OwnProject`: User has direct `projectAssignment` or `componentAssignment` under `resource.projectId`.
- `OwnProfile`: User is assigned to `resource.profileId` in `profileSellers`.
- `ExplicitDepartments`: Resource department ID matches `designation_permission_scope_targets`.
- `ExplicitTeams`: Resource team ID matches `designation_permission_scope_targets`.
- `ExplicitProjects`: Resource project ID matches `designation_permission_scope_targets`.

---

## 3. Cache Versioning Invariant

- Permissions, designation grants, and user maps are cached in Redis with keys containing `:v{permission_version}`.
- Any mutation to grants, overrides, or delegations must invoke:
  ```ts
  await AuthorizationEngine.getInstance().invalidateCache();
  ```
- This single call increments `permission_version`, invalidating stale caches instantly across all cluster replicas.
