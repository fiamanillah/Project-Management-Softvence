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

      // Assign Profile 2 to Station 1
      await stationsService.assignment.assignProfile(
        createdStation1Id,
        { profileId: testProfile2Id, isPrimary: true },
        superAdminUser,
      );

      // Assign Profile 1 to Station 2
      await stationsService.assignment.assignProfile(
        createdStation2Id,
        { profileId: testProfile1Id, isPrimary: true },
        superAdminUser,
      );

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



  describe("Multi-Workstation Profile Assignment & IP Validation", () => {
    it("should allow a single profile to be assigned to multiple workstations simultaneously", async () => {
      // Assign Profile 2 to Station 1
      await stationsService.assignment.assignProfile(
        createdStation1Id,
        { profileId: testProfile2Id, isPrimary: true },
        superAdminUser,
      );

      // Assign Profile 2 to Station 2 as well
      await stationsService.assignment.assignProfile(
        createdStation2Id,
        { profileId: testProfile2Id, isPrimary: false },
        superAdminUser,
      );

      // Both stations should report Profile 2 as active
      const station1 = await stationsService.query.getStationById(createdStation1Id, superAdminUser);
      const station2 = await stationsService.query.getStationById(createdStation2Id, superAdminUser);

      expect(station1.activeProfiles?.some((p) => p.profileId === testProfile2Id)).toBe(true);
      expect(station2.activeProfiles?.some((p) => p.profileId === testProfile2Id)).toBe(true);
    });

    it("should bypass IP validation when isIpRestricted is false", async () => {
      // Create station with isIpRestricted = false
      const openStation = await stationsService.mutation.createStation(
        {
          code: `OPEN_STN_${Date.now()}`,
          name: "Open Access Station",
          stationTypeId: testStationTypeId,
          statusId: testStationStatusId,
          isIpRestricted: false,
          ipWhitelist: ["192.168.1.100"],
        },
        superAdminUser,
      );

      // Assign Staff A to openStation
      await stationsService.assignment.assignUser(
        openStation.id,
        { userId: staffUserA.id, roleId: testStationRoleId },
        superAdminUser,
      );

      // Staff joins from an arbitrary IP (e.g. 10.50.1.25)
      const mockReq = {
        headers: { "x-forwarded-for": "10.50.1.25" },
        socket: { remoteAddress: "10.50.1.25" },
      } as any;

      const session = await stationsService.session.selectStation(
        { stationId: openStation.id },
        staffUserA,
        mockReq,
      );

      expect(session.session.stationId).toBe(openStation.id);

      // Cleanup
      await stationsService.session.leaveStation(staffUserA);
      await prisma.station.delete({ where: { id: openStation.id } });
    });

    it("should enforce IP validation and reject non-whitelisted IPs when isIpRestricted is true", async () => {
      const restrictedStation = await stationsService.mutation.createStation(
        {
          code: `RESTRICT_STN_${Date.now()}`,
          name: "Restricted IP Station",
          stationTypeId: testStationTypeId,
          statusId: testStationStatusId,
          isIpRestricted: true,
          ipWhitelist: ["192.168.1.50", "10.0.0.*"],
        },
        superAdminUser,
      );

      await stationsService.assignment.assignUser(
        restrictedStation.id,
        { userId: staffUserB.id, roleId: testStationRoleId },
        superAdminUser,
      );

      // Unauthorized IP attempt
      const unauthorizedReq = {
        headers: { "x-forwarded-for": "203.0.113.195" },
        socket: { remoteAddress: "203.0.113.195" },
      } as any;

      expect(
        stationsService.session.selectStation(
          { stationId: restrictedStation.id },
          staffUserB,
          unauthorizedReq,
        ),
      ).rejects.toThrow("Access denied: Your IP address is not authorized for this workstation.");

      // Authorized IP attempt (exact match)
      const authorizedReq = {
        headers: { "x-forwarded-for": "192.168.1.50" },
        socket: { remoteAddress: "192.168.1.50" },
      } as any;

      const session = await stationsService.session.selectStation(
        { stationId: restrictedStation.id },
        staffUserB,
        authorizedReq,
      );

      expect(session.session.stationId).toBe(restrictedStation.id);

      // Cleanup
      await stationsService.session.leaveStation(staffUserB);
      await prisma.station.delete({ where: { id: restrictedStation.id } });
    });

    it("should bypass MAC validation when isMacRestricted is false", async () => {
      const openMacStation = await stationsService.mutation.createStation(
        {
          code: `OPEN_MAC_${Date.now()}`,
          name: "Open MAC Station",
          stationTypeId: testStationTypeId,
          statusId: testStationStatusId,
          isMacRestricted: false,
          macWhitelist: ["00:1A:2B:3C:4D:5E"],
        },
        superAdminUser,
      );

      await stationsService.assignment.assignUser(
        openMacStation.id,
        { userId: staffUserA.id, roleId: testStationRoleId },
        superAdminUser,
      );

      // Join with arbitrary MAC address
      const session = await stationsService.session.selectStation(
        { stationId: openMacStation.id, macAddress: "FF:FF:FF:FF:FF:FF" },
        staffUserA,
      );

      expect(session.session.stationId).toBe(openMacStation.id);

      // Cleanup
      await stationsService.session.leaveStation(staffUserA);
      await prisma.station.delete({ where: { id: openMacStation.id } });
    });

    it("should enforce MAC validation and accept normalized MAC entries when isMacRestricted is true", async () => {
      const restrictedMacStation = await stationsService.mutation.createStation(
        {
          code: `RESTR_MAC_${Date.now()}`,
          name: "Restricted MAC Station",
          stationTypeId: testStationTypeId,
          statusId: testStationStatusId,
          isMacRestricted: true,
          macWhitelist: ["00:1A:2B:3C:4D:5E", "A1-B2-C3-D4-E5-F6"],
        },
        superAdminUser,
      );

      await stationsService.assignment.assignUser(
        restrictedMacStation.id,
        { userId: staffUserB.id, roleId: testStationRoleId },
        superAdminUser,
      );

      // 1. Missing MAC / unauthorized MAC
      expect(
        stationsService.session.selectStation(
          { stationId: restrictedMacStation.id, macAddress: "00:00:00:00:00:00" },
          staffUserB,
        ),
      ).rejects.toThrow("Access denied: Your MAC address is not authorized for this workstation.");

      // 2. Authorized MAC via header or DTO with different casing/delimiters
      // '00-1a-2b-3c-4d-5e' should normalize and match '00:1A:2B:3C:4D:5E'
      const session = await stationsService.session.selectStation(
        { stationId: restrictedMacStation.id, macAddress: "00-1a-2b-3c-4d-5e" },
        staffUserB,
      );

      expect(session.session.stationId).toBe(restrictedMacStation.id);

      // Cleanup
      await stationsService.session.leaveStation(staffUserB);
      await prisma.station.delete({ where: { id: restrictedMacStation.id } });
    });

    it("should accurately validate IP addresses against RFC-compliant CIDR subnet masks", async () => {
      const cidrStation = await stationsService.mutation.createStation(
        {
          code: `CIDR_STN_${Date.now()}`,
          name: "CIDR Whitelist Station",
          stationTypeId: testStationTypeId,
          statusId: testStationStatusId,
          isIpRestricted: true,
          ipWhitelist: ["192.168.1.0/24", "10.0.0.0/8"],
        },
        superAdminUser,
      );

      await stationsService.assignment.assignUser(
        cidrStation.id,
        { userId: staffUserA.id, roleId: testStationRoleId },
        superAdminUser,
      );

      // 1. Within 192.168.1.0/24
      const session1 = await stationsService.session.selectStation(
        { stationId: cidrStation.id },
        staffUserA,
        { headers: { "x-forwarded-for": "192.168.1.75" } } as any,
      );
      expect(session1.session.stationId).toBe(cidrStation.id);
      await stationsService.session.leaveStation(staffUserA);

      // 2. Within 10.0.0.0/8
      const session2 = await stationsService.session.selectStation(
        { stationId: cidrStation.id },
        staffUserA,
        { headers: { "x-forwarded-for": "10.250.33.19" } } as any,
      );
      expect(session2.session.stationId).toBe(cidrStation.id);
      await stationsService.session.leaveStation(staffUserA);

      // 3. Outside both CIDRs (192.168.2.1) -> should reject
      expect(
        stationsService.session.selectStation(
          { stationId: cidrStation.id },
          staffUserA,
          { headers: { "x-forwarded-for": "192.168.2.1" } } as any,
        ),
      ).rejects.toThrow("Access denied: Your IP address is not authorized for this workstation.");

      // Cleanup
      await prisma.station.delete({ where: { id: cidrStation.id } });
    });

    it("should terminate active operator sessions and invalidate cache when station is deactivated", async () => {
      const activeStation = await stationsService.mutation.createStation(
        {
          code: `DEACT_STN_${Date.now()}`,
          name: "Active Test Station",
          stationTypeId: testStationTypeId,
          statusId: testStationStatusId,
          isActive: true,
        },
        superAdminUser,
      );

      await stationsService.assignment.assignUser(
        activeStation.id,
        { userId: staffUserA.id, roleId: testStationRoleId },
        superAdminUser,
      );

      // User joins station
      await stationsService.session.selectStation(
        { stationId: activeStation.id },
        staffUserA,
      );

      const activeContextBefore = await stationsService.session.getActiveSession(staffUserA);
      expect(activeContextBefore).not.toBeNull();
      expect(activeContextBefore?.station.id).toBe(activeStation.id);

      // Admin deactivates station
      await stationsService.mutation.updateStation(
        activeStation.id,
        { isActive: false },
        superAdminUser,
      );

      // Active session in DB must be terminated
      const sessionsInDb = await prisma.stationSession.findMany({
        where: { stationId: activeStation.id, userId: staffUserA.id, isCurrent: true },
      });
      expect(sessionsInDb.length).toBe(0);

      // Session context should now be null
      const activeContextAfter = await stationsService.session.getActiveSession(staffUserA);
      expect(activeContextAfter).toBeNull();

      // Cleanup
      await prisma.station.delete({ where: { id: activeStation.id } });
    });

    it("should allow a single operator to join multiple stations simultaneously and switch between them", async () => {
      // 1. Assign staffUserA to both createdStation1Id and createdStation2Id
      await stationsService.assignment.assignUser(
        createdStation1Id,
        { userId: staffUserA.id, roleId: testStationRoleId },
        superAdminUser,
      );
      await stationsService.assignment.assignUser(
        createdStation2Id,
        { userId: staffUserA.id, roleId: testStationRoleId },
        superAdminUser,
      );

      // 2. Join Station 1
      const context1 = await stationsService.session.selectStation(
        { stationId: createdStation1Id },
        staffUserA,
      );
      expect(context1.station.id).toBe(createdStation1Id);

      // 3. Join Station 2 (Station 1 should NOT be disconnected)
      const context2 = await stationsService.session.selectStation(
        { stationId: createdStation2Id },
        staffUserA,
      );
      expect(context2.station.id).toBe(createdStation2Id);

      // 4. Check getActiveSessions: both should be active
      const multiState = await stationsService.session.getActiveSessions(staffUserA);
      expect(multiState.activeSessions.length).toBe(2);
      expect(multiState.activeStationIds).toContain(createdStation1Id);
      expect(multiState.activeStationIds).toContain(createdStation2Id);

      // 5. Joining Station 1 again should not create duplicate sessions
      await stationsService.session.selectStation(
        { stationId: createdStation1Id },
        staffUserA,
      );
      const multiStateAfterRejoin = await stationsService.session.getActiveSessions(staffUserA);
      expect(multiStateAfterRejoin.activeSessions.length).toBe(2);

      // 6. Leave only Station 1
      const leaveRes1 = await stationsService.session.leaveStation(staffUserA, createdStation1Id);
      expect(leaveRes1.remainingActiveStationIds).toContain(createdStation2Id);
      expect(leaveRes1.remainingActiveStationIds).not.toContain(createdStation1Id);

      // Verify Station 2 is still active
      const multiStateAfterLeave1 = await stationsService.session.getActiveSessions(staffUserA);
      expect(multiStateAfterLeave1.activeSessions.length).toBe(1);
      expect(multiStateAfterLeave1.activeStationIds).toEqual([createdStation2Id]);

      // 7. Leave all remaining stations
      await stationsService.session.leaveStation(staffUserA);
      const multiStateFinal = await stationsService.session.getActiveSessions(staffUserA);
      expect(multiStateFinal.activeSessions.length).toBe(0);
    });
  });

  describe("Platform Profiles Management Service", () => {
    let createdProfileId: string;

    it("should create a new platform profile linked to multiple stations", async () => {
      const newProfile = await stationsService.profile.createProfile(
        {
          username: `multi_stn_profile_${Date.now()}`,
          platformId: testPlatformId,
          isActive: true,
          stationIds: [createdStation1Id, createdStation2Id],
        },
        superAdminUser,
      );

      createdProfileId = newProfile.id;
      expect(newProfile.id).toBeDefined();
      expect(newProfile.stationIds.length).toBe(2);
      expect(newProfile.assignedStations.map((s) => s.stationId)).toContain(createdStation1Id);
      expect(newProfile.assignedStations.map((s) => s.stationId)).toContain(createdStation2Id);
    });

    it("should list platform profiles with assigned workstations", async () => {
      const result = await stationsService.profile.getProfiles({
        platformId: testPlatformId,
      });

      expect(result.items.length).toBeGreaterThan(0);
      const found = result.items.find((p) => p.id === createdProfileId);
      expect(found).toBeDefined();
      expect(found?.assignedStations.length).toBe(2);
    });

    it("should update profile and sync station memberships", async () => {
      // Remove from Station 1, keep Station 2
      const updated = await stationsService.profile.updateProfile(
        createdProfileId,
        {
          stationIds: [createdStation2Id],
        },
        superAdminUser,
      );

      expect(updated.stationIds).toEqual([createdStation2Id]);
      expect(updated.assignedStations.length).toBe(1);
      expect(updated.assignedStations[0]?.stationId).toBe(createdStation2Id);
    });

    it("should deactivate profile and clean up active station assignments", async () => {
      const deleteResult = await stationsService.profile.deleteProfile(
        createdProfileId,
        superAdminUser,
      );

      expect(deleteResult.message).toContain("deactivated");

      const profile = await stationsService.profile.getProfileById(createdProfileId);
      expect(profile.isActive).toBe(false);
      expect(profile.assignedStations.length).toBe(0);
    });
  });

  describe("Permission-Aware Branch & Department Scope Context", () => {
    it("should return full branch & department access for SuperAdmin", async () => {
      const context = await stationsService.lookup.getStationScopeContext(superAdminUser);

      expect(context.canSelectBranch).toBe(true);
      expect(context.canSelectDepartment).toBe(true);
      expect(context.isBranchRestricted).toBe(false);
      expect(context.isDepartmentRestricted).toBe(false);
      expect(Array.isArray(context.authorizedBranches)).toBe(true);
      expect(Array.isArray(context.authorizedDepartments)).toBe(true);
    });

    it("should reject station creation if selected department does not belong to the selected branch", async () => {
      // Create a test branch and an unrelated department
      const branchA = await prisma.branch.create({
        data: {
          code: `BR_A_${Date.now()}`,
          name: "Branch A",
        },
      });
      const branchB = await prisma.branch.create({
        data: {
          code: `BR_B_${Date.now()}`,
          name: "Branch B",
        },
      });
      const deptB = await prisma.department.create({
        data: {
          code: `DEP_B_${Date.now()}`,
          name: "Department in Branch B",
          branchId: branchB.id,
        },
      });

      // Try creating station with Branch A but Department in Branch B -> should throw BadRequestError
      await expect(
        stationsService.mutation.createStation(
          {
            code: `MISMATCH_STN_${Date.now()}`,
            name: "Mismatched Station",
            stationTypeId: testStationTypeId,
            statusId: testStationStatusId,
            branchId: branchA.id,
            departmentId: deptB.id,
          },
          superAdminUser,
        ),
      ).rejects.toThrow("Selected department does not belong to the specified branch");

      // Cleanup
      await prisma.department.delete({ where: { id: deptB.id } });
      await prisma.branch.delete({ where: { id: branchA.id } });
      await prisma.branch.delete({ where: { id: branchB.id } });
    });
  });
});
