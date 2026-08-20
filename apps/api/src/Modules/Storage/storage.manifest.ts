import type { PermissionManifestItem } from "@/core/permissions/permission.types";
import { SCOPE_PRESETS } from "@/core/permissions/scopePresets";

export const storagePermissions: PermissionManifestItem[] = [
  {
    code: "storage.view",
    module: "Storage",
    description: "View, stream, and generate presigned download URLs for stored files",
    supportedScopes: SCOPE_PRESETS.PROJECT_HIERARCHICAL,
  },
  {
    code: "storage.upload",
    module: "Storage",
    description: "Upload files and generate direct S3 presigned upload URLs",
    supportedScopes: SCOPE_PRESETS.PROJECT_HIERARCHICAL,
    implies: ["storage.view"],
  },
  {
    code: "storage.delete",
    module: "Storage",
    description: "Delete files and attachments from S3 storage",
    supportedScopes: SCOPE_PRESETS.PROJECT_HIERARCHICAL,
    implies: ["storage.view"],
  },
  {
    code: "storage.manage",
    module: "Storage",
    description: "Administrative access to all storage buckets, direct health checks, and batch management",
    supportedScopes: SCOPE_PRESETS.SYSTEM_ONLY,
    implies: ["storage.view", "storage.upload", "storage.delete"],
  },
];

export default storagePermissions;
