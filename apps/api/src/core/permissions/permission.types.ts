// src/core/permissions/permission.types.ts

export interface PermissionManifestItem {
  code: string;
  module: string;
  description?: string;
  supportedScopes?: string[] | readonly string[];
  implies?: string[] | readonly string[];
  dependsOn?: string[] | readonly string[];
}

export interface PermissionSyncDiff {
  inserted: PermissionManifestItem[];
  updated: PermissionManifestItem[];
  deprecated: { code: string; module: string | null; description: string | null }[];
  unchanged: number;
}

export interface PermissionSyncResult {
  totalDeclared: number;
  insertedCount: number;
  updatedCount: number;
  deprecatedCount: number;
  unchangedCount: number;
  diff: PermissionSyncDiff;
}
