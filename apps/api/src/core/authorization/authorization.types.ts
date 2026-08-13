// src/core/authorization/authorization.types.ts

import type { ScopeResolutionStrategy } from "@workspace/db";

export interface AuthenticatedUser {
  id: string;
  systemRole: string;
  designationId: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthorizationResourceContext {
  departmentId?: string;
  teamId?: string;
  projectId?: string;
  profileId?: string;
}

export interface ScopeTargets {
  departmentIds: string[];
  teamIds: string[];
  projectIds: string[];
}

export interface ResolvedDesignationGrant {
  permissionCode: string;
  permissionId: string;
  resolutionStrategy: ScopeResolutionStrategy;
  scopeTargets: ScopeTargets;
}

export interface ResolvedDesignationGrantSet {
  designationId: string;
  version: number;
  grants: ResolvedDesignationGrant[];
}
