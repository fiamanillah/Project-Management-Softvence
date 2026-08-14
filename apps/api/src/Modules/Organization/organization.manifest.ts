// src/Modules/Organization/organization.manifest.ts

import type { PermissionManifestItem } from "@/core/permissions/permission.types";
import { SCOPE_PRESETS } from "@/core/permissions/scopePresets";

export const organizationPermissions: PermissionManifestItem[] = [
  {
    code: "organization.department.view",
    module: "Organization",
    description: "View department structure and managers",
    supportedScopes: SCOPE_PRESETS.ORG_HIERARCHICAL,
  },
  {
    code: "organization.department.manage",
    module: "Organization",
    description: "Create, update, and manage departments and managers",
    supportedScopes: SCOPE_PRESETS.ORG_HIERARCHICAL,
  },
  {
    code: "organization.designation.view",
    module: "Organization",
    description: "View designations and permission matrices",
    supportedScopes: SCOPE_PRESETS.ORG_HIERARCHICAL,
  },
  {
    code: "organization.designation.manage",
    module: "Organization",
    description: "Create designations and manage permission matrix assignments",
    supportedScopes: SCOPE_PRESETS.ORG_HIERARCHICAL,
  },
];

export default organizationPermissions;
