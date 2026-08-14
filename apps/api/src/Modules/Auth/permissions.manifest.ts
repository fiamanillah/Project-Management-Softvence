import { PermissionManifestItem } from "@/core/permissions/permission.types";
import { SCOPE_PRESETS } from "@/core/permissions/scopePresets";

export const AUTH_PERMISSIONS: PermissionManifestItem[] = [
  {
    code: "auth.session.revoke",
    module: "Auth",
    description: "Revoke active user sessions",
    supportedScopes: SCOPE_PRESETS.SYSTEM_ONLY,
  },
];

