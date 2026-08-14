// src/Modules/Projects/projects.manifest.ts

import type { PermissionManifestItem } from "@/core/permissions/permission.types";
import { SCOPE_PRESETS } from "@/core/permissions/scopePresets";

export const projectsPermissions: PermissionManifestItem[] = [
  {
    code: "project.view",
    module: "Projects",
    description: "View project details",
    supportedScopes: SCOPE_PRESETS.PROJECT_HIERARCHICAL,
  },
  {
    code: "project.create",
    module: "Projects",
    description: "Create new projects",
    supportedScopes: SCOPE_PRESETS.PROJECT_HIERARCHICAL,
  },
  {
    code: "project.reassign",
    module: "Projects",
    description: "Reassign a project to another team",
    supportedScopes: SCOPE_PRESETS.PROJECT_HIERARCHICAL,
  },
  {
    code: "project.delete",
    module: "Projects",
    description: "Soft-delete a project",
    supportedScopes: SCOPE_PRESETS.PROJECT_HIERARCHICAL,
  },
  {
    code: "project.manage",
    module: "Projects",
    description: "Manage project settings, assignments, and budgets",
    supportedScopes: SCOPE_PRESETS.PROJECT_HIERARCHICAL,
  },
];

export default projectsPermissions;
