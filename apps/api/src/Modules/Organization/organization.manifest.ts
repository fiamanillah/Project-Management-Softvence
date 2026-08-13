// src/Modules/Organization/organization.manifest.ts

import type { PermissionManifestItem } from "@/core/permissions/permission.types";

export const organizationPermissions: PermissionManifestItem[] = [
  {
    code: "organization.department.view",
    module: "Organization",
    description: "View department structure and managers",
  },
  {
    code: "organization.department.manage",
    module: "Organization",
    description: "Create, update, and manage departments and managers",
  },
  {
    code: "organization.designation.view",
    module: "Organization",
    description: "View designations and permission matrices",
  },
  {
    code: "organization.designation.manage",
    module: "Organization",
    description: "Create designations and manage permission matrix assignments",
  },
];

export default organizationPermissions;
