# Frontend Implementation Rules

> **SCOPE**: `apps/dashboard`, `apps/web`, `packages/ui`, React components, hooks, and API client.

---

## 1. Rule Index (Frontend)

- **FE-1**: UI gating uses ONLY two primitives: Permission Map (`hasPermission` / `<PermissionGate>`) and Capabilities (`_capabilities.canX`).
- **FE-2**: Never recompute scope comparisons client-side (`row.teamId === user.teamId`).
- **FE-3**: Never check role strings (`user.systemRole === 'Admin'`) outside auth bootstrap.
- **FE-4**: All gating funnels through shared primitives (`PermissionGate`, `RouteGuard`, `hasPermission`).
- **FE-5**: Client-side gating is UX convenience, not security boundary.
- **FE-6**: 403 API responses are gracefully handled; trigger passive permission refresh.
- **FE-7**: Permission map stored in single shared `PermissionContext`.
- **FE-8**: `_capabilities` must never be stripped in mapping or transform layers.
- **FE-9**: Passive refresh on 403 via `onForbidden` listener.
- **FE-10**: Navigation is data-driven array rendered in a loop with `PermissionGate`.
- **FE-11**: Zero per-role dashboards; use dynamic `widget-registry.tsx`.
- **FE-12**: Dynamic lookup screens use parameterized generic CRUD component.
- **FE-13**: Confirm backend permission manifest before adding frontend gates.
- **FE-14**: All network calls go through shared `@/lib/api`.
- **FE-15**: Form errors map server `error.details.issues` via `handleFormApiError`.
- **FE-16**: Scoped React Query cache invalidation on mutations.
- **FE-17**: Rich modern UI aesthetics: clean typography, dark mode, smooth micro-interactions.
- **FE-18**: Interactive elements must have descriptive IDs for accessibility and testing.

---

## 2. Standard Code Patterns

### Coarse Page / Top-Level Gate
```tsx
import { PermissionGate } from "@/components/permission-gate/PermissionGate";

<PermissionGate code="project.create">
  <Button onClick={() => setOpen(true)}>Create Project</Button>
</PermissionGate>
```

### Table Row / Entity-Level Gate
```tsx
// ✅ Correct: Authoritative capability flag
<TableRow>
  <TableCell>{project.name}</TableCell>
  <TableCell>
    {project._capabilities?.canEdit && (
      <Button size="sm" onClick={() => editProject(project.id)}>Edit</Button>
    )}
    {project._capabilities?.canDelete && (
      <Button size="sm" variant="destructive" onClick={() => deleteProject(project.id)}>Delete</Button>
    )}
  </TableCell>
</TableRow>
```

### Form Submission with Structured Error Mapping
```tsx
const onSubmit = async (values: CreateProjectInput) => {
  try {
    await api.post("/projects", values);
    toast.success("Project created successfully");
  } catch (err) {
    const errorMsg = handleFormApiError(err, form.setError);
    toast.error(errorMsg);
  }
};
```
