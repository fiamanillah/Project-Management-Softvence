// src/Modules/BdOrders/bdOrders.manifest.ts

import type { PermissionManifestItem } from "@/core/permissions/permission.types";

export const bdOrdersPermissions: PermissionManifestItem[] = [
  {
    code: "bd_order.view",
    module: "BdOrders",
    description: "View BD sales orders and deals",
  },
  {
    code: "bd_order.create",
    module: "BdOrders",
    description: "Create new BD sales orders",
  },
];

export default bdOrdersPermissions;
