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

  /**
   * For workstation/station administration and hierarchy management.
   * Supports: Global, Own Branch, Own Department, Own Team, and Explicit Target Stations.
   */
  STATION_HIERARCHICAL: [
    "Global",
    "OwnBranch",
    "OwnDepartment",
    "OwnTeam",
    "OwnStation",
    "ExplicitStations",
  ] as const,

  /**
   * For workstation operational tasks (joining stations, operating station profiles).
   * Supports: Global, Own Station, Own Department, and Own Team.
   */
  STATION_OPERATIONAL: [
    "Global",
    "OwnStation",
    "OwnDepartment",
    "OwnTeam",
  ] as const,
} as const;

export type ScopePresetKey = keyof typeof SCOPE_PRESETS;

export const SCOPE_WEIGHTS: Record<string, number> = {
  Global: 50,
  GLOBAL: 50,
  ExplicitBranches: 40,
  EXPLICIT_BRANCHES: 40,
  OwnBranch: 40,
  OWN_BRANCH: 40,
  ExplicitDepartments: 30,
  EXPLICIT_DEPARTMENTS: 30,
  OwnDepartment: 30,
  OWN_DEPARTMENT: 30,
  ExplicitTeams: 20,
  EXPLICIT_TEAMS: 20,
  OwnTeam: 20,
  OWN_TEAM: 20,
  ExplicitStations: 15,
  EXPLICIT_STATIONS: 15,
  OwnStation: 15,
  OWN_STATION: 15,
  ExplicitProjects: 10,
  EXPLICIT_PROJECTS: 10,
  OwnProject: 10,
  OWN_PROJECT: 10,
  OwnProfile: 10,
  OWN_PROFILE: 10,
  None: 0,
  NONE: 0,
};

export function getScopeWeight(strategyOrCode?: string | null): number {
  if (!strategyOrCode) return 0;
  return SCOPE_WEIGHTS[strategyOrCode] ?? 0;
}
