// src/Modules/Stations/stations.test.ts

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { prisma } from "@/lib/prisma";
import { StationsService } from "./stations.service";
import { ProjectsService } from "../Projects/projects.service";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";

describe("Stations & Dynamic Profile Management Subsystem", () => {
  let stationsService: StationsService;
  let projectsService: ProjectsService;

  let superAdminUser: AuthenticatedUser;
  let staffUserA: AuthenticatedUser;
  let staffUserB: AuthenticatedUser;

  let testStationTypeId: string;
  let testStationStatusId: string;
  let testStationRoleId: string;

  let testPlatformId: string;
  let testProfile1Id: string;
  let testProfile2Id: string;

  let createdStation1Id: string;
  let createdStation2Id: string;

  beforeAll(async () => {
    stationsService = new StationsService(prisma);
    projectsService = new ProjectsService(prisma);

    const timestamp = Date.now();

    // 1. Create Dynamic Lookups
    const stationType = await stationsService.lookup.createStationType({
      code: `SALES_TYPE_${timestamp}`,
      name: "Dedicated Sales Workstation",
      description: "Equipped for outbound client communication and profile management",
      isSales: true,
      sortOrder: 1,
    });
    testStationTypeId = stationType.id;

    const stationStatus = await stationsService.lookup.createStationStatus({
      code: `OPERATIONAL_${timestamp}`,
      name: "Fully Operational",
      isOperational: true,
      isMaintenance: false,
      color: "#10b981",
    });
    testStationStatusId = stationStatus.id;

    const stationRole = await stationsService.lookup.createStationRole({
      code: `SALES_OPERATOR_${timestamp}`,
      name: "Sales Shift Operator",
      canManageProfiles: true,
      canOperate: true,
    });
    testStationRoleId = stationRole.id;

    // 2. Create Platform & Profiles
    let platform = await prisma.platform.findFirst({ where: { code: "UPWORK" } });
    if (!platform) {
      platform = await prisma.platform.create({
        data: { code: `UPWORK_${timestamp}`, name: "Upwork Global", isActive: true },
      });
    }
    testPlatformId = platform.id;

    const profile1 = await prisma.profile.create({
      data: {
        platformId: testPlatformId,
        username: `sales_agent_alpha_${timestamp}`,
        isActive: true,
      },
    });
    testProfile1Id = profile1.id;

    const profile2 = await prisma.profile.create({
      data: {
        platformId: testPlatformId,
        username: `sales_agent_beta_${timestamp}`,
        isActive: true,
      },
    });
    testProfile2Id = profile2.id;

    // 3. Create Test Users
    const adminDbUser = await prisma.user.create({
      data: {
        employeeId: `ADM-${timestamp}`,
        email: `admin_${timestamp}@softvence.agency`,
        firstName: "Super",
        lastName: "Admin",
        passwordHash: "dummyhash",
        systemRole: "SuperAdmin",
        isActive: true,
      },
    });
    superAdminUser = {
      id: adminDbUser.id,
      systemRole: "SuperAdmin",
      email: adminDbUser.email,
    };

    const staffDbUserA = await prisma.user.create({
      data: {
        employeeId: `STF-A-${timestamp}`,
        email: `staff_a_${timestamp}@softvence.agency`,
        firstName: "Staff",
        lastName: "Alpha",
        passwordHash: "dummyhash",
        systemRole: "Staff",
        isActive: true,
      },
    });
    staffUserA = {
      id: staffDbUserA.id,
      systemRole: "Staff",
      email: staffDbUserA.email,
    };

    const staffDbUserB = await prisma.user.create({
      data: {
        employeeId: `STF-B-${timestamp}`,
        email: `staff_b_${timestamp}@softvence.agency`,
        firstName: "Staff",
        lastName: "Beta",
        passwordHash: "dummyhash",
        systemRole: "Staff",
        isActive: true,
      },
    });
    staffUserB = {
      id: staffDbUserB.id,
      systemRole: "Staff",
      email: staffDbUserB.email,
    };
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.stationSession.deleteMany({
      where: { userId: { in: [superAdminUser?.id, staffUserA?.id, staffUserB?.id].filter(Boolean) } },
    });
    await prisma.stationProfileAssignment.deleteMany({
      where: { profileId: { in: [testProfile1Id, testProfile2Id].filter(Boolean) } },
    });
    await prisma.stationUserAssignment.deleteMany({
      where: { userId: { in: [staffUserA?.id, staffUserB?.id].filter(Boolean) } },
    });
    if (createdStation1Id || createdStation2Id) {
      await prisma.station.deleteMany({
        where: { id: { in: [createdStation1Id, createdStation2Id].filter(Boolean) } },
      });
    }
  });

  describe("Dynamic Lookup Tables (Rule BE-11)", () => {
    it("should fetch active station types, statuses, and roles", async () => {
      const types = await stationsService.lookup.getStationTypes();
      const statuses = await stationsService.lookup.getStationStatuses();
      const roles = await stationsService.lookup.getStationRoles();

      expect(types.length).toBeGreaterThan(0);
      expect(statuses.length).toBeGreaterThan(0);
      expect(roles.length).toBeGreaterThan(0);

      const createdType = types.find((t) => t.id === testStationTypeId);
      expect(createdType).toBeDefined();
      expect(createdType?.isSales).toBe(true);

      const createdStatus = statuses.find((s) => s.id === testStationStatusId);
      expect(createdStatus).toBeDefined();
      expect(createdStatus?.isOperational).toBe(true);
    });
  });

  describe("Station Lifecycle & Capabilities Decoration", () => {
    it("should create Station 1 and Station 2 with server-computed _capabilities", async () => {
      const timestamp = Date.now();

      const station1 = await stationsService.mutation.createStation(
        {
          code: `STN_SALES_01_${timestamp}`,
          name: "Sales Station Alpha - US West",
          description: "Primary sales desk for US West operations",
          stationTypeId: testStationTypeId,
          statusId: testStationStatusId,
          maxConcurrentUsers: 2,
        },
        superAdminUser,
      );

      createdStation1Id = station1.id;
      expect(station1.code).toBe(`STN_SALES_01_${timestamp}`);
      expect(station1._capabilities?.canEdit).toBe(true);
      expect(station1._capabilities?.canDelete).toBe(true);
      expect(station1._capabilities?.canAssignProfile).toBe(true);
      expect(station1._capabilities?.canJoin).toBe(true);

      const station2 = await stationsService.mutation.createStation(
        {
          code: `STN_SALES_02_${timestamp}`,
          name: "Sales Station Beta - EU Central",
          description: "Secondary sales desk for European accounts",
          stationTypeId: testStationTypeId,
          statusId: testStationStatusId,
          maxConcurrentUsers: 2,
        },
        superAdminUser,
      );

      createdStation2Id = station2.id;
      expect(station2.code).toBe(`STN_SALES_02_${timestamp}`);
    });

    it("should retrieve station list with pagination and stats", async () => {
      const result = await stationsService.query.getStations(
        { page: 1, limit: 10, isSales: true },
        superAdminUser,
      );

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.pagination.total).toBeGreaterThan(0);

      const stats = await stationsService.query.getStationStats(superAdminUser);
      expect(stats.totalStations).toBeGreaterThan(0);
      expect(stats.salesStations).toBeGreaterThan(0);
    });
  });

  describe("User & Profile Assignments & Atomic Reassignments", () => {
    it("should assign Staff User A to Station 1", async () => {
      const userAssignment = await stationsService.assignment.assignUser(
        createdStation1Id,
        {
          userId: staffUserA.id,
          roleId: testStationRoleId,
          shift: "Morning",
          note: "Assigned as lead operator for morning rotation",
        },
        superAdminUser,
      );

      expect(userAssignment.stationId).toBe(createdStation1Id);
      expect(userAssignment.userId).toBe(staffUserA.id);
      expect(userAssignment.role?.canOperate).toBe(true);
    });

    it("should assign Profile 1 to Station 1", async () => {
      const profileAssignment = await stationsService.assignment.assignProfile(
        createdStation1Id,
        {
          profileId: testProfile1Id,
          shift: "Morning",
          isPrimary: true,
        },
        superAdminUser,
      );

      expect(profileAssignment.stationId).toBe(createdStation1Id);
      expect(profileAssignment.profileId).toBe(testProfile1Id);
      expect(profileAssignment.isPrimary).toBe(true);

      const station = await stationsService.query.getStationById(
        createdStation1Id,
        superAdminUser,
      );
      expect(station.activeProfilesCount).toBe(1);
      expect(station.activeProfiles?.[0]?.profileId).toBe(testProfile1Id);
    });

    it("should atomically reassign Profile 1 from Station 1 to Station 2", async () => {
      const reassignResult = await stationsService.assignment.reassignProfile(
        {
          profileId: testProfile1Id,
          fromStationId: createdStation1Id,
          toStationId: createdStation2Id,
          shift: "Night",
          note: "Shift handoff to Station 2 for night coverage",
        },
        superAdminUser,
      );

      expect(reassignResult.assignment.stationId).toBe(createdStation2Id);
      expect(reassignResult.assignment.profileId).toBe(testProfile1Id);

      // Verify Station 1 now has 0 active profiles
      const station1 = await stationsService.query.getStationById(
        createdStation1Id,
        superAdminUser,
      );
      expect(station1.activeProfilesCount).toBe(0);

      // Verify Station 2 now has 1 active profile
      const station2 = await stationsService.query.getStationById(
        createdStation2Id,
        superAdminUser,
      );
      expect(station2.activeProfilesCount).toBe(1);
      expect(station2.activeProfiles?.[0]?.profileId).toBe(testProfile1Id);

      // Verify historic assignment record in database has unassignedAt timestamp
      const historicalRecords = await prisma.stationProfileAssignment.findMany({
        where: { profileId: testProfile1Id, stationId: createdStation1Id },
      });
      expect(historicalRecords.length).toBeGreaterThan(0);
      expect(historicalRecords.every((r) => r.unassignedAt !== null)).toBe(true);
    });
  });

  describe("Session Lifecycle & Station Context", () => {
    it("should allow Staff User A to select and join Station 1", async () => {
      // First reassign Profile 2 to Station 1 so it has an active profile
      await stationsService.assignment.assignProfile(
        createdStation1Id,
        { profileId: testProfile2Id, isPrimary: true },
        superAdminUser,
      );

      const activeContext = await stationsService.session.selectStation(
        { stationId: createdStation1Id },
        staffUserA,
      );

      expect(activeContext.station.id).toBe(createdStation1Id);
      expect(activeContext.session.isCurrent).toBe(true);
      expect(activeContext.activeProfileIds).toContain(testProfile2Id);

      // Verify getActiveSession returns active session
      const current = await stationsService.session.getActiveSession(staffUserA);
      expect(current).not.toBeNull();
      expect(current?.station.id).toBe(createdStation1Id);
    });

    it("should allow Staff User A to leave station and clear session context", async () => {
      const leaveResult = await stationsService.session.leaveStation(staffUserA);
      expect(leaveResult.message).toBe("Left station successfully");

      const current = await stationsService.session.getActiveSession(staffUserA);
      expect(current).toBeNull();
    });
  });

  describe("Project Scoped Visibility Integration", () => {
    let projectUnderStation1: any;
    let projectUnderStation2: any;
    let sampleStatusId: string;
    let sampleClientId: string;

    beforeAll(async () => {
      const timestamp = Date.now();

      // Ensure status
      let status = await prisma.projectStatus.findFirst({ where: { code: "IN_PROGRESS" } });
      if (!status) {
        status = await prisma.projectStatus.create({
          data: { code: `STATUS_${timestamp}`, name: "In Progress", isTerminal: false },
        });
      }
      sampleStatusId = status.id;

      // Ensure client
      const client = await prisma.client.create({
        data: {
          name: `Client Station Test ${timestamp}`,
          platformId: testPlatformId,
        },
      });
      sampleClientId = client.id;

      // Project 1 under Profile 2 (Station 1)
      projectUnderStation1 = await prisma.project.create({
        data: {
          orderId: `ORD-STN1-${timestamp}`,
          projectName: `Station 1 Project ${timestamp}`,
          clientId: sampleClientId,
          profileId: testProfile2Id,
          statusId: sampleStatusId,
          value: 2500,
        },
      });

      // Project 2 under Profile 1 (Station 2)
      projectUnderStation2 = await prisma.project.create({
        data: {
          orderId: `ORD-STN2-${timestamp}`,
          projectName: `Station 2 Project ${timestamp}`,
          clientId: sampleClientId,
          profileId: testProfile1Id,
          statusId: sampleStatusId,
          value: 5000,
        },
      });
    });

    afterAll(async () => {
      if (projectUnderStation1) {
        await prisma.project.deleteMany({ where: { id: projectUnderStation1.id } });
      }
      if (projectUnderStation2) {
        await prisma.project.deleteMany({ where: { id: projectUnderStation2.id } });
      }
    });

    it("should filter projects by active station profile context when user is in active session", async () => {
      // Staff User A joins Station 1 (hosts Profile 2)
      await stationsService.session.selectStation(
        { stationId: createdStation1Id },
        staffUserA,
      );

      const projects = await projectsService.getProjects({}, staffUserA);
      const projectIds = projects.items.map((p) => p.id);

      // Staff User A on Station 1 should see projectUnderStation1 (Profile 2)
      expect(projectIds).toContain(projectUnderStation1.id);

      // Staff User A on Station 1 should NOT see projectUnderStation2 (Profile 1 on Station 2)
      expect(projectIds).not.toContain(projectUnderStation2.id);
    });

    it("should support filtering projects explicitly by stationId query param", async () => {
      const station2Projects = await projectsService.getProjects(
        { stationId: createdStation2Id },
        superAdminUser,
      );

      const projectIds = station2Projects.items.map((p) => p.id);
      expect(projectIds).toContain(projectUnderStation2.id);
      expect(projectIds).not.toContain(projectUnderStation1.id);
    });
  });
});
