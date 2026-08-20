// src/Modules/Users/users.manifest.ts

import type { PermissionManifestItem } from "@/core/permissions/permission.types";
import { SCOPE_PRESETS } from "@/core/permissions/scopePresets";

export const usersPermissions: PermissionManifestItem[] = [
  {
    code: "auth.user.view",
    module: "Users",
    description: "View user accounts and details",
    supportedScopes: SCOPE_PRESETS.ORG_HIERARCHICAL,
  },
  {
    code: "auth.user.create",
    module: "Users",
    description: "Create new employee and administrative user accounts",
    supportedScopes: SCOPE_PRESETS.ORG_HIERARCHICAL,
    implies: ["auth.user.view"],
    dependsOn: ["organization.designation.view", "organization.department.view"],
  },
  {
    code: "auth.user.manage",
    module: "Users",
    description: "Update user accounts, manage security overrides and delegations",
    supportedScopes: SCOPE_PRESETS.ORG_HIERARCHICAL,
    implies: ["auth.user.view"],
    dependsOn: ["storage.upload", "storage.view"],
  },
];

export default usersPermissions;
