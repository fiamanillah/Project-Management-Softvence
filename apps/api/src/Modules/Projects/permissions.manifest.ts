import { PermissionManifestItem } from "@/core/permissions/permission.types";

export const PROJECT_PERMISSIONS: PermissionManifestItem[] = [
  { code: "project.view", module: "Projects", description: "View project details" },
  { code: "project.create", module: "Projects", description: "Create a new project" },
  { code: "project.reassign", module: "Projects", description: "Reassign a project to another team" },
  { code: "project.delete", module: "Projects", description: "Soft-delete a project" },
];
