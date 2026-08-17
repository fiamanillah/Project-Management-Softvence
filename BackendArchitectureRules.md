# Backend Architecture Rules

Non-negotiable architectural rules for anyone (human or AI agent) writing backend code (`apps/api`, `apps/worker`, `packages/db`, `packages/cache`) in this repository. Each rule has a unique ID for reference in code review, PR descriptions, and commit messages (e.g. `Fixes BE-3`). 

> **CONCURRENCY & PRECEDENCE DIRECTIVE:**
> If a rule and a feature request conflict, the rule **ALWAYS** wins. Flag the architectural conflict rather than quietly breaking the rule.

---

## 🔐 Authorization & Scopes

### BE-1. Every authorization decision goes through `can()`. No exceptions.
No route handler, controller, service function, repository method, or background worker job may determine authorization by any other means — not by checking `user.designation`, not by checking `user.systemRole === 'Admin'`, not by custom inline `if` blocks. If `can()` cannot currently express what you need, extend the resolver (new `ScopeResolutionStrategy` or new permission code) — never route around it.
```ts
// ❌ VIOLATION
if (user.designation.code === 'TEAM_LEADER' || user.systemRole === 'Admin') {
  allowReassign = true;
}

// ✅ CORRECT
const allowed = await can(user, 'project.reassign', {
  departmentId: project.departmentId,
  teamId: project.teamId,
  projectId: project.id,
});
if (!allowed) {
  throw new AuthorizationError("You don't have access to this resource");
}
```

### BE-2. Never hardcode a designation code, department code, or system role name outside the auth/session bootstrap layer.
The only legitimate `systemRole === 'SuperAdmin'` check in the entire backend codebase exists inside `can()` itself (step 1 of resolution) and the login/session authentication bootstrap. Anywhere else, it is an architectural defect.

### BE-3. Scope resolution logic lives in exactly one place: `ScopeEvaluator`.
`Global`, `OwnDepartment`, `OwnTeam`, `OwnProject`, `OwnProfile`, and `Explicit*` strategies are interpreted strictly inside [ScopeEvaluator.ts](./apps/api/src/core/authorization/ScopeEvaluator.ts). Do not reimplement department ancestor tree traversal, team membership checks, or assignment queries anywhere else.

### BE-4. Explicit `user_permission_overrides` with `isDeny = true` always short-circuits.
A deny override is an intentional exception set by a super administrator. It must always be evaluated before designation grants and immediately short-circuits evaluation to `false`, regardless of user seniority.

### BE-5. Delegations only expand access and are strictly bounded by time.
Active delegations (`delegations`) evaluate within `valid_from` <= `now` <= `valid_until`. Delegations re-evaluate permissions acting as the delegator, scoped down. A delegation can never grant more permissions than the delegator holds.

### BE-6. SuperAdmin bypass is logged for sensitive actions.
Every SuperAdmin operation against permissions classified as sensitive (`billing.*`, `*.manage`, `*.delete`, `*.revoke`, `*.reassign`, `auth.user.create`, `organization.*`) writes an audit log to RabbitMQ -> MongoDB via `AuditLogService.log()`. "SuperAdmin can do anything" is never an excuse to bypass the audit trail.

---

## 📦 Permissions & The Registry

### BE-7. Permissions may only be introduced via module manifests.
Never manually execute `INSERT INTO permissions`. Permissions must be declared in `<module>.manifest.ts` using `PermissionManifestItem` and `SCOPE_PRESETS`, then synced via the registry runner.

### BE-8. Never hard-delete a row from `permissions`.
When an action is decommissioned, mark `isActive: false` and set `deprecatedAt: new Date()`. Any `designation_permissions` pointing to deprecated permissions must be evaluated as always-deny.

### BE-9. Grants and overrides are runtime database configuration, never code changes.
Nothing about *which designation possesses which permission* should ever require a code change or database schema migration. Designation grants, scope targets, and user overrides are managed at runtime via the Admin UI.

### BE-10. Every grant/override mutation MUST bump `permission_version`.
Any write to `designation_permissions`, `designation_permission_scope_targets`, `user_permission_overrides`, or `delegations` must call:
```ts
await AuthorizationEngine.getInstance().invalidateCache();
```
This increments the Redis `permission_version` counter, instantaneously invalidating stale cached permissions across all API replicas.

---

## 🗃️ Dynamic Lookup Tables & Enums

### BE-11. Never branch code on lookup string `code` or `name` — use behavioral flags.
Lookup tables (`project_statuses`, `priorities`, `issue_types`, `assignment_roles`, `support_ticket_statuses`) are dynamic so admins can add new rows without code deploys. Never write `if (status.code === 'DELIVERED')` or `if (role.name === 'Lead')`. Always branch on boolean/numeric behavioral flags.
```ts
// ❌ VIOLATION — Breaks when a new terminal status is added next week
if (project.status.code === 'DELIVERED' || project.status.code === 'CANCELLED') {
  archiveProject();
}

// ✅ CORRECT — Dynamic flag handles all present and future terminal statuses
if (project.status.isTerminal) {
  archiveProject();
}
```

### BE-12. Enums are strictly reserved for immutable engine mechanisms.
Prisma enums (`SystemRole`, `ScopeResolutionStrategy`, `MessageStatus`, `AttachmentEntity`, `ThreadDirection`) may only grow via migration with explicit architecture sign-off. Business categories belong in dynamic lookup tables.

### BE-13. New lookup tables follow the standard lookup schema.
All dynamic lookup tables must include: `id` (UUID), `code` (unique string), `name` (string), `isActive` (boolean default true), `createdAt` (datetime), and any functional boolean/numeric behavior flags (e.g. `isTerminal`, `requiresAction`, `qualifiesForTeamScope`, `level`).

---

## 🛡️ Data Model Discipline & Security

### BE-14. Soft delete only for historical/audit-significant entities.
Never use `DELETE FROM` on users, projects, messages, team memberships, or assignments. Use `deletedAt`, `leftAt`, `unassignedAt`, or `revokedAt`. Hard deletions destroy audit logs and invalidate historical authorization state.

### BE-15. The shadow inbox (`platform_thread_messages`) is strictly append-only.
No `UPDATE` or `DELETE` queries are ever permitted on `platform_thread_messages`. Corrections must be logged as new thread entries to preserve an unimpeachable audit record.

### BE-16. Never trust client-asserted scope IDs for authorization.
A `teamId` or `departmentId` in a request body is untrusted user input. Always load the entity from the database first, take its verified `departmentId`, `teamId`, and `projectId`, and pass those into `can()` or `requirePermission`.
```ts
// ❌ VIOLATION — Client can spoof teamId to bypass scope
const allowed = await can(user, 'project.edit', { teamId: req.body.teamId });

// ✅ CORRECT — Verified from database
const project = await prisma.project.findUniqueOrThrow({ where: { id: req.params.id } });
const allowed = await can(user, 'project.edit', {
  departmentId: project.departmentId,
  teamId: project.teamId,
  projectId: project.id,
});
```

---

## 📡 API Responses & Middleware

### BE-17. List and detail responses must return `_capabilities`.
Every API endpoint returning permission-gated entities must attach a `_capabilities` object computed server-side via `can()`. The frontend must never derive record-level access.
```ts
// ✅ CORRECT — Computed once on the backend per record
return {
  ...project,
  _capabilities: {
    canEdit: await can(user, 'project.edit', context),
    canReassign: await can(user, 'project.reassign', context),
    canDelete: await can(user, 'project.delete', context),
  },
};
```

### BE-18. A `403 Forbidden` response never discloses org structure.
When access is denied, return a generic message: `"You don't have access to this resource"`. Detailed reasons (e.g. "User is not a member of team X under department Y") are logged to server Winston logs and RabbitMQ audit events only.

### BE-19. Input validation must use shared Zod schemas.
All controller endpoints must validate request parameters, query strings, and request bodies using Zod schemas from `packages/shared` or module-level validator schemas before executing business logic.

### BE-20. Standardized JSON response envelope.
All REST endpoints must adhere to the standard envelope format:
```ts
// Success:
res.status(200).json({
  status: "success",
  message: "Resource fetched successfully",
  data: result,
});

// Error (Handled via AppError & Global Error Handler):
res.status(statusCode).json({
  status: "error",
  message: "Error description",
  error: {
    code: "ERROR_CODE",
    details: { issues: [{ path: "email", message: "Invalid email" }] },
  },
});
```

---

## 📋 New Module Checklist (Mandatory for every new feature)

1. [ ] Permissions declared in `<module>.manifest.ts` using `SCOPE_PRESETS`.
2. [ ] Database migrations follow `BE-13` (lookups) and `BE-14` (soft deletes).
3. [ ] Seed scripts updated for any new lookup table default rows.
4. [ ] All routes wired with `requirePermission(code, resourceLoader)`.
5. [ ] List and detail queries decorate records with `_capabilities`.
6. [ ] Grant/override mutations call `invalidateCache()`.
7. [ ] Sensitive actions emit asynchronous audit logs via `AuditLogService.log()`.
8. [ ] Zero role strings hardcoded anywhere in the module.