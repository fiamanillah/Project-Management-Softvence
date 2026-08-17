# Backend Implementation Rules

> **SCOPE**: `apps/api`, `apps/worker`, backend middleware, services, controllers, and workers.

---

## 1. Rule Index (Backend)

- **BE-1**: All authorization goes through `can()`.
- **BE-2**: Never hardcode role or designation strings outside auth bootstrap.
- **BE-3**: Scope resolution logic lives exclusively in `ScopeEvaluator`.
- **BE-4**: Explicit deny overrides always win and short-circuit.
- **BE-5**: Delegations only expand access within time windows.
- **BE-6**: SuperAdmin bypass is logged for sensitive operations.
- **BE-7**: Permissions declared only in `<module>.manifest.ts`.
- **BE-8**: Never hard-delete rows in `permissions`.
- **BE-9**: Grants and overrides are runtime database edits, not code migrations.
- **BE-10**: Grant/override writes must bump `permission_version` via `invalidateCache()`.
- **BE-11**: Dynamic lookups use behavioral flags (`isTerminal`, `requiresAction`, `level`), never string codes.
- **BE-12**: Enums reserved for immutable engine mechanisms.
- **BE-13**: Dynamic lookup tables follow standard schema (`id`, `code`, `name`, `isActive`, `createdAt`, flags).
- **BE-14**: Soft delete only (`deletedAt`, `leftAt`, `unassignedAt`, `revokedAt`).
- **BE-15**: Shadow inbox (`platform_thread_messages`) is strictly append-only.
- **BE-16**: Load resources from DB before evaluating scope; never trust client-supplied scope IDs.
- **BE-17**: List/detail responses must include server-computed `_capabilities`.
- **BE-18**: 403 responses return generic error messages (no org structure disclosure).
- **BE-19**: Request inputs validated with Zod schemas.
- **BE-20**: Standardized JSON envelope (`status`, `message`, `data` / `error`).

---

## 2. Standard Route Pattern with `requirePermission`

```ts
import { Router } from "express";
import { requirePermission } from "@/middleware/requirePermission";
import { authenticate } from "@/middleware/auth.middleware";

const router = Router();
router.use(authenticate);

// Top-level action
router.post(
  "/",
  requirePermission("project.create"),
  projectController.create
);

// Scoped action with database-verified resource loader
router.patch(
  "/:id/reassign",
  requirePermission("project.reassign", async (req) => {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      select: { departmentId: true, teamId: true, id: true },
    });
    return project ? {
      departmentId: project.departmentId,
      teamId: project.teamId,
      projectId: project.id,
    } : undefined;
  }),
  projectController.reassign
);
```
