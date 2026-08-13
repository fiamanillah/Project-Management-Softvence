// src/Modules/Projects/projects.manifest.ts

import type { PermissionManifestItem } from "@/core/permissions/permission.types";

export const projectsPermissions: PermissionManifestItem[] = [
  {
    code: "project.view",
    module: "Projects",
    description: "View project details",
  },
  {
    code: "project.create",
    module: "Projects",
    description: "Create new projects",
  },
  {
    code: "project.manage",
    module: "Projects",
    description: "Manage project settings, assignments, and budgets",
  },
];

export default projectsPermissions;
