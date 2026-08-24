import type { SeedContext } from "./types";

export async function seedStations(ctx: SeedContext): Promise<void> {
  const { prisma } = ctx;

  const defaultBranchId = ctx.branches.get("BET-SA")!;
  const bdDeptId = ctx.departments.get("BD")!;
  const engDeptId = ctx.departments.get("ENG")!;
  const csDeptId = ctx.departments.get("CS")!;

  const salesPrimaryTypeId = ctx.stationTypes.get("SALES_PRIMARY")!;
  const salesOutboundTypeId = ctx.stationTypes.get("SALES_OUTBOUND")!;
  const salesRotationalTypeId = ctx.stationTypes.get("SALES_ROTATIONAL")!;
  const devGeneralTypeId = ctx.stationTypes.get("DEV_GENERAL")!;
  const supportDeskTypeId = ctx.stationTypes.get("SUPPORT_DESK")!;

  const operationalStatusId = ctx.stationStatuses.get("OPERATIONAL")!;
  const occupiedStatusId = ctx.stationStatuses.get("OCCUPIED")!;
  const maintenanceStatusId = ctx.stationStatuses.get("MAINTENANCE")!;

  const stationLeadRoleId = ctx.stationRoles.get("STATION_LEAD")!;
  const salesOperatorRoleId = ctx.stationRoles.get("SALES_OPERATOR")!;
  const devOperatorRoleId = ctx.stationRoles.get("DEV_OPERATOR")!;

  const superAdmin = ctx.users.get("superadmin@softvence.com")!;
  const adminId = superAdmin?.id;

  // 1. Seed Workstations
  const STATIONS = [
    {
      code: "STN-SALES-01",
      name: "US Outbound Sales Alpha",
      description: "Primary outbound sales workstation for US client enterprise contracts & bidding",
      stationTypeId: salesPrimaryTypeId,
      statusId: occupiedStatusId,
      branchId: defaultBranchId,
      departmentId: bdDeptId,
      ipWhitelist: ["192.168.1.10", "192.168.1.15", "10.0.0.45"],
      macAddress: "00:1A:2B:3C:4D:5E",
      maxConcurrentUsers: 2,
      isActive: true,
    },
    {
      code: "STN-SALES-02",
      name: "EU Growth & Bidding Desk",
      description: "European market proposal generation and client onboarding desk",
      stationTypeId: salesOutboundTypeId,
      statusId: operationalStatusId,
      branchId: defaultBranchId,
      departmentId: bdDeptId,
      ipWhitelist: ["192.168.1.11"],
      macAddress: "00:1A:2B:3C:4D:5F",
      maxConcurrentUsers: 2,
      isActive: true,
    },
    {
      code: "STN-SALES-03",
      name: "Fiverr Pro Rapid Response",
      description: "High-frequency marketplace direct messaging and quick order conversion desk",
      stationTypeId: salesPrimaryTypeId,
      statusId: operationalStatusId,
      branchId: defaultBranchId,
      departmentId: bdDeptId,
      ipWhitelist: ["192.168.1.12"],
      macAddress: "00:1A:2B:3C:4D:60",
      maxConcurrentUsers: 1,
      isActive: true,
    },
    {
      code: "STN-DEV-01",
      name: "Fullstack Squad Workstation",
      description: "Dedicated engineering desk for core SaaS deliveries and architecture syncs",
      stationTypeId: devGeneralTypeId,
      statusId: occupiedStatusId,
      branchId: defaultBranchId,
      departmentId: engDeptId,
      ipWhitelist: [],
      macAddress: "00:1A:2B:3C:4D:61",
      maxConcurrentUsers: 4,
      isActive: true,
    },
    {
      code: "STN-ROTATIONAL-01",
      name: "Global Night Shift Desk",
      description: "24/7 rotational shift desk for international client coverage and handoffs",
      stationTypeId: salesRotationalTypeId,
      statusId: operationalStatusId,
      branchId: defaultBranchId,
      departmentId: bdDeptId,
      ipWhitelist: ["192.168.1.20"],
      macAddress: "00:1A:2B:3C:4D:62",
      maxConcurrentUsers: 3,
      isActive: true,
    },
    {
      code: "STN-SUPPORT-01",
      name: "Client Operations & Support",
      description: "Customer success desk for delivery handovers, ticket triage, and client success",
      stationTypeId: supportDeskTypeId,
      statusId: operationalStatusId,
      branchId: defaultBranchId,
      departmentId: csDeptId,
      ipWhitelist: [],
      macAddress: "00:1A:2B:3C:4D:63",
      maxConcurrentUsers: 2,
      isActive: true,
    },
    {
      code: "STN-MAINT-01",
      name: "Legacy Staging Workstation",
      description: "Hardware diagnostics and staging desk (temporarily under maintenance)",
      stationTypeId: devGeneralTypeId,
      statusId: maintenanceStatusId,
      branchId: defaultBranchId,
      departmentId: engDeptId,
      ipWhitelist: [],
      macAddress: "00:1A:2B:3C:4D:64",
      maxConcurrentUsers: 1,
      isActive: true,
    },
  ];

  for (const stn of STATIONS) {
    let record = await prisma.station.findUnique({
      where: { code: stn.code },
    });

    if (record) {
      record = await prisma.station.update({
        where: { code: stn.code },
        data: {
          name: stn.name,
          description: stn.description,
          stationTypeId: stn.stationTypeId,
          statusId: stn.statusId,
          branchId: stn.branchId,
          departmentId: stn.departmentId,
          ipWhitelist: stn.ipWhitelist,
          macAddress: stn.macAddress,
          maxConcurrentUsers: stn.maxConcurrentUsers,
          isActive: stn.isActive,
          deletedAt: null,
        },
      });
    } else {
      record = await prisma.station.create({
        data: {
          code: stn.code,
          name: stn.name,
          description: stn.description,
          stationTypeId: stn.stationTypeId,
          statusId: stn.statusId,
          branchId: stn.branchId,
          departmentId: stn.departmentId,
          ipWhitelist: stn.ipWhitelist,
          macAddress: stn.macAddress,
          maxConcurrentUsers: stn.maxConcurrentUsers,
          isActive: stn.isActive,
        },
      });
    }

    ctx.stations.set(stn.code, record.id);
  }

  // 2. Allocate Hosted Platform Profiles to Workstations
  const stnSales01Id = ctx.stations.get("STN-SALES-01")!;
  const stnSales02Id = ctx.stations.get("STN-SALES-02")!;
  const stnSales03Id = ctx.stations.get("STN-SALES-03")!;
  const stnRotational01Id = ctx.stations.get("STN-ROTATIONAL-01")!;

  const upworkAgencyProfId = ctx.profiles.get("Softvence Agency");
  const upworkEnterpriseProfId = ctx.profiles.get("Softvence Enterprise");
  const fiverrProProfId = ctx.profiles.get("softvence_pro");
  const directPortalProfId = ctx.profiles.get("Softvence Direct Portal");

  const PROFILE_ASSIGNMENTS = [
    {
      stationId: stnSales01Id,
      profileId: upworkAgencyProfId,
      shift: "Day",
      isPrimary: true,
      note: "Primary US client marketplace bidding account",
    },
    {
      stationId: stnSales01Id,
      profileId: upworkEnterpriseProfId,
      shift: "Morning",
      isPrimary: false,
      note: "Enterprise contract dispatch profile",
    },
    {
      stationId: stnSales02Id,
      profileId: directPortalProfId,
      shift: "Evening",
      isPrimary: true,
      note: "European direct client portal communications",
    },
    {
      stationId: stnSales03Id,
      profileId: fiverrProProfId,
      shift: "Day",
      isPrimary: true,
      note: "Fiverr Pro verified agency seller account",
    },
    {
      stationId: stnRotational01Id,
      profileId: upworkEnterpriseProfId,
      shift: "Night",
      isPrimary: true,
      note: "Overnight proposal coverage account",
    },
  ];

  for (const pa of PROFILE_ASSIGNMENTS) {
    if (!pa.stationId || !pa.profileId || !adminId) continue;

    const existing = await prisma.stationProfileAssignment.findFirst({
      where: {
        stationId: pa.stationId,
        profileId: pa.profileId,
        unassignedAt: null,
      },
    });

    if (!existing) {
      await prisma.stationProfileAssignment.create({
        data: {
          stationId: pa.stationId,
          profileId: pa.profileId,
          assignedById: adminId,
          shift: pa.shift,
          isPrimary: pa.isPrimary,
          note: pa.note,
        },
      });
    }
  }

  // 3. Assign Shift Operators to Workstations
  const rachelUser = ctx.users.get("bd.rachel@softvence.com");
  const kevinUser = ctx.users.get("bd.kevin@softvence.com");
  const jamesUser = ctx.users.get("dev.james@softvence.com");
  const priyaUser = ctx.users.get("dev.priya@softvence.com");
  const annaUser = ctx.users.get("support.anna@softvence.com");
  const stnDev01Id = ctx.stations.get("STN-DEV-01")!;
  const stnSupport01Id = ctx.stations.get("STN-SUPPORT-01")!;

  const OPERATOR_ASSIGNMENTS = [
    {
      stationId: stnSales01Id,
      userId: rachelUser?.id,
      roleId: stationLeadRoleId,
      shift: "Day",
      note: "Morning shift lead and account strategist",
    },
    {
      stationId: stnSales01Id,
      userId: kevinUser?.id,
      roleId: salesOperatorRoleId,
      shift: "Day",
      note: "Day proposal bidder and client communicator",
    },
    {
      stationId: stnSales02Id,
      userId: kevinUser?.id,
      roleId: salesOperatorRoleId,
      shift: "Evening",
      note: "Evening European leads rotation",
    },
    {
      stationId: stnDev01Id,
      userId: jamesUser?.id,
      roleId: stationLeadRoleId,
      shift: "Day",
      note: "Squad technical delivery lead",
    },
    {
      stationId: stnDev01Id,
      userId: priyaUser?.id,
      roleId: devOperatorRoleId,
      shift: "Day",
      note: "Frontend sprint delivery operator",
    },
    {
      stationId: stnSupport01Id,
      userId: annaUser?.id,
      roleId: stationLeadRoleId,
      shift: "Day",
      note: "Customer support & client operations coordinator",
    },
  ];

  for (const oa of OPERATOR_ASSIGNMENTS) {
    if (!oa.stationId || !oa.userId || !adminId) continue;

    const existing = await prisma.stationUserAssignment.findFirst({
      where: {
        stationId: oa.stationId,
        userId: oa.userId,
        unassignedAt: null,
      },
    });

    if (!existing) {
      await prisma.stationUserAssignment.create({
        data: {
          stationId: oa.stationId,
          userId: oa.userId,
          roleId: oa.roleId,
          assignedById: adminId,
          shift: oa.shift,
          note: oa.note,
        },
      });
    }
  }

  // 4. Seed Live Active Operator Sessions
  if (kevinUser && stnSales01Id) {
    const existingSession = await prisma.stationSession.findFirst({
      where: {
        userId: kevinUser.id,
        leftAt: null,
      },
    });

    if (!existingSession) {
      await prisma.stationSession.create({
        data: {
          stationId: stnSales01Id,
          userId: kevinUser.id,
          ipAddress: "192.168.1.10",
          deviceInfo: "Chrome 128 (macOS Sonoma) - Workstation Desk 1",
          joinedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          lastActiveAt: new Date(),
        },
      });
    }
  }

  if (priyaUser && stnDev01Id) {
    const existingSession = await prisma.stationSession.findFirst({
      where: {
        userId: priyaUser.id,
        leftAt: null,
      },
    });

    if (!existingSession) {
      await prisma.stationSession.create({
        data: {
          stationId: stnDev01Id,
          userId: priyaUser.id,
          ipAddress: "192.168.1.45",
          deviceInfo: "Firefox 130 (Ubuntu Linux) - Engineering Pod Alpha",
          joinedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          lastActiveAt: new Date(),
        },
      });
    }
  }
}
