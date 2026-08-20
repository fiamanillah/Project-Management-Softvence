// src/Modules/Teams/teams.manifest.ts

import type { PermissionManifestItem } from "@/core/permissions/permission.types";
import { SCOPE_PRESETS } from "@/core/permissions/scopePresets";

export const teamsPermissions: PermissionManifestItem[] = [
  {
    code: "organization.team.view",
    module: "Teams",
    description: "View teams, rosters, and operational units",
    supportedScopes: SCOPE_PRESETS.ORG_HIERARCHICAL,
  },
  {
    code: "organization.team.create",
    module: "Teams",
    description: "Create new operational teams",
    supportedScopes: SCOPE_PRESETS.ORG_HIERARCHICAL,
    implies: ["organization.team.view"],
    dependsOn: ["organization.department.view"],
  },
  {
    code: "organization.team.edit",
    module: "Teams",
    description: "Update team details, shifts, and department affiliations",
    supportedScopes: SCOPE_PRESETS.ORG_HIERARCHICAL,
    implies: ["organization.team.view"],
    dependsOn: ["storage.upload", "storage.view"],
  },
  {
    code: "organization.team.delete",
    module: "Teams",
    description: "Deactivate or delete teams",
    supportedScopes: SCOPE_PRESETS.ORG_HIERARCHICAL,
    implies: ["organization.team.view"],
  },
  {
    code: "organization.team.manage_members",
    module: "Teams",
    description: "Add, update roles, and remove team members",
    supportedScopes: SCOPE_PRESETS.ORG_HIERARCHICAL,
    implies: ["organization.team.view"],
    dependsOn: ["auth.user.view"],
  },
];

export default teamsPermissions;
