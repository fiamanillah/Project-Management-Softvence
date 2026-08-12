import { describe, it, expect, beforeEach } from "bun:test";
import { RbacService, ResourceScope } from "../rbac.service";

describe("RbacService Unit Tests", () => {
  let mockPrisma: any;
  let directScopeMock: (userId: string, scope: ResourceScope) => Promise<boolean>;
  let delegationScopeMock: (userId: string, scope: ResourceScope) => Promise<boolean>;
  let rbacService: RbacService;

  const mockDesignationId = "desig-123";
  const mockUserId = "user-123";

  beforeEach(() => {
    directScopeMock = async () => false;
    delegationScopeMock = async () => false;

    mockPrisma = {
      user: {
        findUnique: async ({ where }: any) => {
          if (where.id === "superadmin-id") {
            return {
              id: "superadmin-id",
              is_active: true,
              system_role: "SuperAdmin",
              designation_id: mockDesignationId,
              deleted_at: null,
            };
          }
          if (where.id === "inactive-id") {
            return {
              id: "inactive-id",
              is_active: false,
              system_role: "Staff",
              designation_id: mockDesignationId,
              deleted_at: null,
            };
          }
          if (where.id === mockUserId) {
            return {
              id: mockUserId,
              is_active: true,
              system_role: "Staff",
              designation_id: mockDesignationId,
              deleted_at: null,
            };
          }
          return null;
        },
      },
      designationPermission: {
        findMany: async ({ where }: any) => {
          if (where.designation_id === mockDesignationId) {
            return [
              {
                id: "dp-1",
                designation_id: mockDesignationId,
                permission: { code: "project.read", description: "Read project" },
              },
            ];
          }
          return [];
        },
      },
      userPermissionOverride: {
        findMany: async ({ where }: any) => {
          if (where.user_id === "user-with-grant") {
            return [
              {
                id: "override-1",
                user_id: "user-with-grant",
                effect: "GRANT",
                permission: { code: "project.delete" },
              },
            ];
          }
          if (where.user_id === "user-with-revoke") {
            return [
              {
                id: "override-2",
                user_id: "user-with-revoke",
                effect: "REVOKE",
                permission: { code: "project.read" },
              },
            ];
          }
          return [];
        },
      },
      permission: {
        findMany: async () => [
          { code: "project.read" },
          { code: "project.delete" },
        ],
      },
    };

    rbacService = new RbacService(
      mockPrisma as any,
      (u, s) => directScopeMock(u, s),
      (u, s) => delegationScopeMock(u, s)
    );
  });

  it("1. SuperAdmin bypasses everything", async () => {
    const result = await rbacService.can("superadmin-id", "any.random.permission");
    expect(result).toBe(true);
  });

  it("2. Inactive user denied regardless of permissions", async () => {
    const result = await rbacService.can("inactive-id", "project.read");
    expect(result).toBe(false);
  });

  it("3. Base designation permission allows", async () => {
    const result = await rbacService.can(mockUserId, "project.read");
    expect(result).toBe(true);
  });

  it("4. Override GRANT allows what base denies", async () => {
    mockPrisma.user.findUnique = async () => ({
      id: "user-with-grant",
      is_active: true,
      system_role: "Staff",
      designation_id: mockDesignationId,
      deleted_at: null,
    });

    const result = await rbacService.can("user-with-grant", "project.delete");
    expect(result).toBe(true);
  });

  it("5. Override REVOKE denies what base allows", async () => {
    mockPrisma.user.findUnique = async () => ({
      id: "user-with-revoke",
      is_active: true,
      system_role: "Staff",
      designation_id: mockDesignationId,
      deleted_at: null,
    });

    const result = await rbacService.can("user-with-revoke", "project.read");
    expect(result).toBe(false);
  });

  it("6. Unscoped permission check requires no resource check", async () => {
    let directCalled = false;
    directScopeMock = async () => {
      directCalled = true;
      return true;
    };

    const result = await rbacService.can(mockUserId, "project.read");
    expect(result).toBe(true);
    expect(directCalled).toBe(false);
  });

  it("7. Scoped check denied without assignment and without delegation", async () => {
    directScopeMock = async () => false;
    delegationScopeMock = async () => false;

    const scope: ResourceScope = { type: "project", id: "proj-100" };
    const result = await rbacService.can(mockUserId, "project.read", scope);
    expect(result).toBe(false);
  });

  it("8. Scoped check allowed with direct assignment", async () => {
    directScopeMock = async () => true;
    delegationScopeMock = async () => false;

    const scope: ResourceScope = { type: "project", id: "proj-100" };
    const result = await rbacService.can(mockUserId, "project.read", scope);
    expect(result).toBe(true);
  });

  it("9. Scoped check allowed with active delegation", async () => {
    directScopeMock = async () => false;
    delegationScopeMock = async () => true;

    const scope: ResourceScope = { type: "project", id: "proj-100" };
    const result = await rbacService.can(mockUserId, "project.read", scope);
    expect(result).toBe(true);
  });

  it("10. Scoped check denied with an expired delegation", async () => {
    directScopeMock = async () => false;
    // Expired delegation evaluates to false
    delegationScopeMock = async () => false;

    const scope: ResourceScope = { type: "project", id: "proj-100" };
    const result = await rbacService.can(mockUserId, "project.read", scope);
    expect(result).toBe(false);
  });
});
