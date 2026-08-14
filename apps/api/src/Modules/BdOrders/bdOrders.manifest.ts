// src/Modules/BdOrders/bdOrders.manifest.ts

import type { PermissionManifestItem } from "@/core/permissions/permission.types";
import { SCOPE_PRESETS } from "@/core/permissions/scopePresets";

export const bdOrdersPermissions: PermissionManifestItem[] = [
  {
    code: "bd_order.view",
    module: "BdOrders",
    description: "View BD sales orders and deals",
    supportedScopes: SCOPE_PRESETS.BD_SALES,
  },
  {
    code: "bd_order.create",
    module: "BdOrders",
    description: "Create new BD sales orders",
    supportedScopes: SCOPE_PRESETS.BD_SALES,
  },
];

export default bdOrdersPermissions;
