// src/Modules/Users/users.manifest.ts

import type { PermissionManifestItem } from "@/core/permissions/permission.types";

export const usersPermissions: PermissionManifestItem[] = [
  {
    code: "auth.user.view",
    module: "Users",
    description: "View user accounts and details",
  },
  {
    code: "auth.user.create",
    module: "Users",
    description: "Create new employee and administrative user accounts",
  },
  {
    code: "auth.user.manage",
    module: "Users",
    description: "Update user accounts, manage security overrides and delegations",
  },
];

export default usersPermissions;
