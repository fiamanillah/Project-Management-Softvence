// apps/dashboard/app/dashboard/overrides/types.ts

export interface UserSummary {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  designation?: {
    name: string;
    department?: {
      name: string;
    };
  };
}

export interface PermissionSummary {
  id: string;
  code: string;
  module: string;
  description?: string;
}

export interface DepartmentSummary {
  id: string;
  name: string;
  code: string;
}

export interface TeamSummary {
  id: string;
  name: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
}

export interface OverrideItem {
  id: string;
  userId: string;
  permissionId: string;
  isDeny: boolean;
  reason?: string | null;
  expiresAt?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  projectId?: string | null;
  createdAt: string;
  user: UserSummary;
  permission: PermissionSummary;
  granter: UserSummary;
  department?: DepartmentSummary | null;
  team?: TeamSummary | null;
  project?: ProjectSummary | null;
}

export interface DelegationItem {
  id: string;
  delegatorId: string;
  delegateeId: string;
  scope: string;
  validFrom: string;
  validUntil: string;
  createdBy: string;
  createdAt: string;
  delegator: UserSummary;
  delegatee: UserSummary;
  creator: UserSummary;
}

export type DelegationStatus = "ACTIVE" | "UPCOMING" | "EXPIRED";
