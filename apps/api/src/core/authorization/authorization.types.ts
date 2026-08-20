// src/core/authorization/authorization.types.ts

import type { ScopeResolutionStrategy } from "@workspace/db";

export interface AuthenticatedUser {
  id: string;
  systemRole: string;
  roleId?: string | null;
  branchId?: string | null;
  designationId?: string | null;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthorizationResourceContext {
  branchId?: string;
  departmentId?: string;
  teamId?: string;
  projectId?: string;
  profileId?: string;
}

export interface ScopeTargets {
  branchIds?: string[];
  departmentIds?: string[];
  teamIds?: string[];
  projectIds?: string[];
}

export interface ResolvedRoleGrant {
  permissionCode: string;
  permissionId: string;
  resolutionStrategy: ScopeResolutionStrategy;
  scopeTargets: ScopeTargets;
  implies?: string[];
  dependsOn?: string[];
}

export interface ResolvedRoleGrantSet {
  roleId: string;
  version: number;
  grants: ResolvedRoleGrant[];
}
