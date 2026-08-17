// src/Modules/Projects/projects.manifest.ts

import type { PermissionManifestItem } from "@/core/permissions/permission.types";
import { SCOPE_PRESETS } from "@/core/permissions/scopePresets";

export const projectsPermissions: PermissionManifestItem[] = [
  {
    code: "project.view",
    module: "Projects",
    description: "View project details, milestones, and assigned rosters",
    supportedScopes: SCOPE_PRESETS.PROJECT_HIERARCHICAL,
  },
  {
    code: "project.create",
    module: "Projects",
    description: "Create new projects and allocate initial teams",
    supportedScopes: SCOPE_PRESETS.PROJECT_HIERARCHICAL,
  },
  {
    code: "project.edit",
    module: "Projects",
    description: "Edit project general details, status, and deadlines",
    supportedScopes: SCOPE_PRESETS.PROJECT_HIERARCHICAL,
  },
  {
    code: "project.delete",
    module: "Projects",
    description: "Soft-delete projects from active records",
    supportedScopes: SCOPE_PRESETS.PROJECT_HIERARCHICAL,
  },
  {
    code: "project.reassign",
    module: "Projects",
    description: "Reassign project primary and secondary team allocations",
    supportedScopes: SCOPE_PRESETS.PROJECT_HIERARCHICAL,
  },
  {
    code: "project.manage_members",
    module: "Projects",
    description: "Assign and unassign individual members and roles to projects",
    supportedScopes: SCOPE_PRESETS.PROJECT_HIERARCHICAL,
  },
  {
    code: "project.component.manage",
    module: "Projects",
    description: "Create, modify, and assign project components and sub-tasks",
    supportedScopes: SCOPE_PRESETS.PROJECT_HIERARCHICAL,
  },
  {
    code: "project.client.view",
    module: "Projects",
    description: "View sensitive project client identity, company names, and contact information",
    supportedScopes: SCOPE_PRESETS.PROJECT_HIERARCHICAL,
  },
  {
    code: "project.financial.view",
    module: "Projects",
    description: "View sensitive project contract values, billing milestones, and order sheets",
    supportedScopes: SCOPE_PRESETS.PROJECT_HIERARCHICAL,
  },
  {
    code: "project.financial.edit",
    module: "Projects",
    description: "Modify project contract values and internal order sheet URLs",
    supportedScopes: SCOPE_PRESETS.PROJECT_HIERARCHICAL,
  },
];

export default projectsPermissions;
