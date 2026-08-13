import { PermissionManifestItem } from "@/core/permissions/permission.types";

export const BD_ORDER_PERMISSIONS: PermissionManifestItem[] = [
  { code: "bd_order.view", module: "Business Development", description: "View BD orders" },
  { code: "bd_order.create", module: "Business Development", description: "Create a BD order" },
];
