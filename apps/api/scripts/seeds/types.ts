import type { PrismaClient } from "@workspace/db";

export interface SeedUserRef {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  systemRole: "SuperAdmin" | "Admin" | "Staff";
  roleId?: string;
  designationId?: string;
}

export interface SeedProjectRef {
  id: string;
  orderId: string;
  projectName: string;
  clientId: string;
  profileId: string;
  statusId: string;
}

export interface SeedComponentRef {
  id: string;
  projectId: string;
  name: string;
}

export interface SeedContext {
  prisma: PrismaClient;
  clean?: boolean;

  // Lookup IDs (Code / Slug -> UUID)
  scopeTypes: Map<string, string>;
  assignmentRoles: Map<string, string>;
  projectStatuses: Map<string, string>;
  platforms: Map<string, string>;
  serviceLines: Map<string, string>;
  priorities: Map<string, string>;
  issueTypes: Map<string, string>;
  ticketStatuses: Map<string, string>;
  messageTypes: Map<string, string>;
  notificationTypes: Map<string, string>;
  orderSources: Map<string, string>;
  bdOrderTypes: Map<string, string>;

  // Organization & Security
  departments: Map<string, string>;
  teams: Map<string, string>;
  roles: Map<string, string>;
  designations: Map<string, string>;

  // Entities
  users: Map<string, SeedUserRef>;
  profiles: Map<string, string>;
  clients: Map<string, string>;
  projects: Map<string, SeedProjectRef>;
  components: Map<string, SeedComponentRef>;
  projectGroups: Map<string, string>;
  issues: Map<string, string>;
}

export function createSeedContext(prisma: PrismaClient, clean = false): SeedContext {
  return {
    prisma,
    clean,
    scopeTypes: new Map(),
    assignmentRoles: new Map(),
    projectStatuses: new Map(),
    platforms: new Map(),
    serviceLines: new Map(),
    priorities: new Map(),
    issueTypes: new Map(),
    ticketStatuses: new Map(),
    messageTypes: new Map(),
    notificationTypes: new Map(),
    orderSources: new Map(),
    bdOrderTypes: new Map(),
    departments: new Map(),
    teams: new Map(),
    roles: new Map(),
    designations: new Map(),
    users: new Map(),
    profiles: new Map(),
    clients: new Map(),
    projects: new Map(),
    components: new Map(),
    projectGroups: new Map(),
    issues: new Map(),
  };
}
