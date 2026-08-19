// src/core/permissions/scopePresets.ts

/**
 * Standard scope preset archetypes.
 * Used across module manifest declarations to maintain consistency and eliminate duplicate scope lists.
 */
export const SCOPE_PRESETS = {
  /**
   * For branch hierarchy management (Branches and Sister Companies).
   * Supports: Global, Own Branch, and Explicit Target Branches.
   */
  BRANCH_HIERARCHICAL: [
    "Global",
    "OwnBranch",
    "ExplicitBranches",
  ] as const,

  /**
   * For domain entities with a full operational hierarchy (Projects, Tasks, Issues, Components).
   * Supports: Global, Own Branch, Own Department, Own Team, Directly Assigned Project, and Explicit Target Projects.
   */
  PROJECT_HIERARCHICAL: [
    "Global",
    "OwnBranch",
    "OwnDepartment",
    "OwnTeam",
    "OwnProject",
    "ExplicitProjects",
  ] as const,

  /**
   * For organizational structure, designations, and user directory management.
   * Supports: Global, Own Branch, Own Department, Own Team, and Explicit Target Departments.
   */
  ORG_HIERARCHICAL: [
    "Global",
    "OwnBranch",
    "OwnDepartment",
    "OwnTeam",
    "ExplicitBranches",
    "ExplicitDepartments",
  ] as const,

  /**
   * For business development and sales platform operations (Upwork/Fiverr profiles & BD orders).
   * Supports: Global, Own Profile, and Own Team.
   */
  BD_SALES: [
    "Global",
    "OwnProfile",
    "OwnTeam",
  ] as const,

  /**
   * For system-wide binary permissions (Session revocation, Global audit logs, Server management).
   * Supports: Global only (binary grant/deny).
   */
  SYSTEM_ONLY: [
    "Global",
  ] as const,
} as const;

export type ScopePresetKey = keyof typeof SCOPE_PRESETS;
