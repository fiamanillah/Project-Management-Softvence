import { PermissionManifestItem } from "@/core/permissions/permission.types";

export const AUTH_PERMISSIONS: PermissionManifestItem[] = [
  { code: "auth.user.view", module: "Auth", description: "View user profiles and sessions" },
  { code: "auth.user.create", module: "Auth", description: "Create and register users" },
  { code: "auth.user.manage", module: "Auth", description: "Manage users and system roles" },
  { code: "auth.session.revoke", module: "Auth", description: "Revoke active user sessions" },
];
