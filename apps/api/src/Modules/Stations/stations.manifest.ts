// src/Modules/Stations/stations.manifest.ts

import type { PermissionManifestItem } from "@/core/permissions/permission.types";
import { SCOPE_PRESETS } from "@/core/permissions/scopePresets";

export const stationsPermissions: PermissionManifestItem[] = [
  {
    code: "station.view",
    module: "Stations",
    description: "View sales stations, active operators, and assigned platform profiles",
    supportedScopes: SCOPE_PRESETS.STATION_HIERARCHICAL,
  },
  {
    code: "station.manage",
    module: "Stations",
    description: "Create, configure, and update workstations and hardware bindings",
    supportedScopes: SCOPE_PRESETS.STATION_HIERARCHICAL,
    implies: ["station.view"],
  },
  {
    code: "station.delete",
    module: "Stations",
    description: "Soft-delete sales stations",
    supportedScopes: SCOPE_PRESETS.BRANCH_HIERARCHICAL,
    implies: ["station.view"],
  },
  {
    code: "station.assign_user",
    module: "Stations",
    description: "Assign or unassign operators and sales staff to stations",
    supportedScopes: SCOPE_PRESETS.STATION_HIERARCHICAL,
    implies: ["station.view"],
  },
  {
    code: "station.assign_profile",
    module: "Stations",
    description: "Assign, unassign, and reassign platform profiles across stations",
    supportedScopes: SCOPE_PRESETS.STATION_HIERARCHICAL,
    implies: ["station.view"],
  },
  {
    code: "station.join",
    module: "Stations",
    description: "Join or switch active work station during shift login",
    supportedScopes: SCOPE_PRESETS.STATION_OPERATIONAL,
    implies: ["station.view"],
  },
  {
    code: "station.manage_lookups",
    module: "Stations",
    description: "Manage dynamic station types, operational statuses, and assignment roles",
    supportedScopes: SCOPE_PRESETS.SYSTEM_ONLY,
    implies: ["station.view"],
  },
];

export default stationsPermissions;
