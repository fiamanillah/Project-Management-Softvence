import dotenv from "dotenv";
import { createPrismaClient, type ScopeResolutionStrategy } from "@workspace/db";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/project_management";
const prisma = createPrismaClient({
  databaseUrl,
  isProduction: false,
});

const SCOPE_TYPES: { code: string; name: string; description: string; resolutionStrategy: ScopeResolutionStrategy }[] = [
  {
    code: "GLOBAL",
    name: "Global Access",
    description: "Applies system-wide with no resource boundary constraints",
    resolutionStrategy: "Global",
  },
  {
    code: "OWN_DEPARTMENT",
    name: "Own Department",
    description: "Restricted to resources belonging to the user's department",
    resolutionStrategy: "OwnDepartment",
  },
  {
    code: "OWN_TEAM",
    name: "Own Team",
    description: "Restricted to resources belonging to teams the user actively belongs to",
    resolutionStrategy: "OwnTeam",
  },
  {
    code: "OWN_PROJECT",
    name: "Own Project",
    description: "Restricted to projects where the user is directly assigned",
    resolutionStrategy: "OwnProject",
  },
  {
    code: "OWN_PROFILE",
    name: "Own Profile",
    description: "Restricted to profiles assigned to the user",
    resolutionStrategy: "OwnProfile",
  },
  {
    code: "EXPLICIT_DEPARTMENTS",
    name: "Explicit Departments",
    description: "Restricted to specifically selected department scope targets",
    resolutionStrategy: "ExplicitDepartments",
  },
  {
    code: "EXPLICIT_TEAMS",
    name: "Explicit Teams",
    description: "Restricted to specifically selected team scope targets",
    resolutionStrategy: "ExplicitTeams",
  },
  {
    code: "EXPLICIT_PROJECTS",
    name: "Explicit Projects",
    description: "Restricted to specifically selected project scope targets",
    resolutionStrategy: "ExplicitProjects",
  },
];

async function main() {
  console.log("⚡ Seeding PermissionScopeType lookup records...");

  for (const st of SCOPE_TYPES) {
    const existing = await prisma.permissionScopeType.findUnique({
      where: { code: st.code },
    });

    if (existing) {
      await prisma.permissionScopeType.update({
        where: { code: st.code },
        data: {
          name: st.name,
          description: st.description,
          resolutionStrategy: st.resolutionStrategy,
          isActive: true,
        },
      });
      console.log(`  ~ Updated scope type: ${st.code}`);
    } else {
      await prisma.permissionScopeType.create({
        data: {
          code: st.code,
          name: st.name,
          description: st.description,
          resolutionStrategy: st.resolutionStrategy,
          isActive: true,
        },
      });
      console.log(`  + Created scope type: ${st.code}`);
    }
  }

  console.log("✔ PermissionScopeType lookup records seeded successfully!");

  console.log("⚡ Seeding AssignmentRole lookup records...");
  const ASSIGNMENT_ROLES = [
    { code: "TEAM_LEAD", name: "Team Lead", qualifiesForTeamScope: true },
    { code: "SR_DEV", name: "Senior Developer", qualifiesForTeamScope: false },
    { code: "DEV", name: "Developer", qualifiesForTeamScope: false },
    { code: "DESIGNER", name: "UI/UX Designer", qualifiesForTeamScope: false },
    { code: "QA", name: "QA Engineer", qualifiesForTeamScope: false },
    { code: "MEMBER", name: "Team Member", qualifiesForTeamScope: false },
  ];

  for (const role of ASSIGNMENT_ROLES) {
    const existing = await prisma.assignmentRole.findUnique({
      where: { code: role.code },
    });

    if (existing) {
      await prisma.assignmentRole.update({
        where: { code: role.code },
        data: {
          name: role.name,
          qualifiesForTeamScope: role.qualifiesForTeamScope,
          isActive: true,
        },
      });
      console.log(`  ~ Updated assignment role: ${role.code}`);
    } else {
      await prisma.assignmentRole.create({
        data: {
          code: role.code,
          name: role.name,
          qualifiesForTeamScope: role.qualifiesForTeamScope,
          isActive: true,
        },
      });
      console.log(`  + Created assignment role: ${role.code}`);
    }
  }

  console.log("✔ AssignmentRole lookup records seeded successfully!");

  console.log("⚡ Seeding ProjectStatus lookup records...");
  const PROJECT_STATUSES = [
    { code: "NOT_STARTED", name: "Not Started", requiresAction: false, isTerminal: false, sortOrder: 1, color: "#64748b" },
    { code: "IN_PROGRESS", name: "In Progress", requiresAction: true, isTerminal: false, sortOrder: 2, color: "#3b82f6" },
    { code: "IN_REVIEW", name: "In Review", requiresAction: true, isTerminal: false, sortOrder: 3, color: "#8b5cf6" },
    { code: "ON_HOLD", name: "On Hold", requiresAction: false, isTerminal: false, sortOrder: 4, color: "#f59e0b" },
    { code: "DELIVERED", name: "Delivered", requiresAction: false, isTerminal: true, sortOrder: 5, color: "#10b981" },
    { code: "CANCELLED", name: "Cancelled", requiresAction: false, isTerminal: true, sortOrder: 6, color: "#ef4444" },
  ];

  for (const status of PROJECT_STATUSES) {
    const existing = await prisma.projectStatus.findUnique({
      where: { code: status.code },
    });

    if (existing) {
      await prisma.projectStatus.update({
        where: { code: status.code },
        data: {
          name: status.name,
          requiresAction: status.requiresAction,
          isTerminal: status.isTerminal,
          sortOrder: status.sortOrder,
          color: status.color,
          isActive: true,
        },
      });
      console.log(`  ~ Updated project status: ${status.code}`);
    } else {
      await prisma.projectStatus.create({
        data: {
          code: status.code,
          name: status.name,
          requiresAction: status.requiresAction,
          isTerminal: status.isTerminal,
          sortOrder: status.sortOrder,
          color: status.color,
          isActive: true,
        },
      });
      console.log(`  + Created project status: ${status.code}`);
    }
  }

  console.log("⚡ Seeding Platform lookup records...");
  const PLATFORMS = [
    { code: "UPWORK", name: "Upwork" },
    { code: "FIVERR", name: "Fiverr" },
    { code: "DIRECT", name: "Direct Client" },
    { code: "FREELANCER", name: "Freelancer.com" },
  ];

  const platformMap = new Map<string, string>();
  for (const plat of PLATFORMS) {
    const existing = await prisma.platform.findUnique({
      where: { code: plat.code },
    });

    if (existing) {
      await prisma.platform.update({
        where: { code: plat.code },
        data: { name: plat.name, isActive: true },
      });
      platformMap.set(plat.code, existing.id);
      console.log(`  ~ Updated platform: ${plat.code}`);
    } else {
      const created = await prisma.platform.create({
        data: { code: plat.code, name: plat.name, isActive: true },
      });
      platformMap.set(plat.code, created.id);
      console.log(`  + Created platform: ${plat.code}`);
    }
  }

  console.log("⚡ Seeding ServiceLine lookup records...");
  const SERVICE_LINES = [
    { name: "Web Application Development", slug: "web-app-dev" },
    { name: "Mobile App Development", slug: "mobile-app-dev" },
    { name: "UI/UX & Product Design", slug: "ui-ux-design" },
    { name: "AI & Machine Learning Engineering", slug: "ai-ml-engineering" },
    { name: "DevOps & Cloud Infrastructure", slug: "devops-cloud" },
  ];

  for (const sl of SERVICE_LINES) {
    const existing = await prisma.serviceLine.findUnique({
      where: { slug: sl.slug },
    });

    if (existing) {
      await prisma.serviceLine.update({
        where: { slug: sl.slug },
        data: { name: sl.name, isActive: true },
      });
      console.log(`  ~ Updated service line: ${sl.slug}`);
    } else {
      await prisma.serviceLine.create({
        data: { name: sl.name, slug: sl.slug, isActive: true },
      });
      console.log(`  + Created service line: ${sl.slug}`);
    }
  }

  // Seed default primary profiles if needed
  const upworkPlatformId = platformMap.get("UPWORK");
  if (upworkPlatformId) {
    const existingProfile = await prisma.profile.findFirst({
      where: { platformId: upworkPlatformId, username: "Softvence Agency" },
    });
    if (!existingProfile) {
      await prisma.profile.create({
        data: {
          platformId: upworkPlatformId,
          username: "Softvence Agency",
          isActive: true,
        },
      });
      console.log(`  + Created default agency profile on Upwork`);
    }
  }

  // Seed sample client if none exists
  if (upworkPlatformId) {
    const clientCount = await prisma.client.count();
    if (clientCount === 0) {
      await prisma.client.create({
        data: {
          name: "Acme Global Technologies",
          platformId: upworkPlatformId,
          contactNotes: "Primary point of contact: Sarah Jenkins (VP of Engineering)",
        },
      });
      console.log(`  + Created sample client: Acme Global Technologies`);
    }
  }

  // Seed OrderSource lookup records
  console.log("⚡ Seeding OrderSource lookup records...");
  const ORDER_SOURCES = [
    { code: "BID_PROPOSAL_ORDER", name: "Bid/Proposal Order" },
    { code: "BRIEF_INVITATION", name: "Brief/Invitation" },
    { code: "CONVERSION_QUERY", name: "Conversion/Query" },
    { code: "FIXED_CLIENT", name: "Fixed Client" },
    { code: "ORDER_SOURCE", name: "Order Source" },
    { code: "PLATFORM_STATUS", name: "Platform Status" },
    { code: "REPEAT_ORDER", name: "Repeat Order" },
    { code: "SPECIAL_ORDER", name: "Special_Order" },
    { code: "SVA_A_OLD_ORDER", name: "SVA_A Old Order" },
    { code: "SVA_A_OTHERS", name: "SVA_A Others" },
    { code: "SVA_A_PROFILE", name: "SVA_A Profile" },
    { code: "SVA_A_SPECIAL", name: "SVA_A Special" },
    { code: "SVA_DIRECT_PROJECT", name: "SVA_Direct Project" },
    { code: "TIP", name: "Tip" },
    { code: "B2B", name: "B2B" },
    { code: "CONSULTATION", name: "Consultation" },
    { code: "COMPENSATION", name: "Compensation" },
  ];

  for (const os of ORDER_SOURCES) {
    const existing = await prisma.orderSource.findUnique({
      where: { code: os.code },
    });
    if (existing) {
      await prisma.orderSource.update({
        where: { code: os.code },
        data: { name: os.name, isActive: true },
      });
    } else {
      await prisma.orderSource.create({
        data: {
          code: os.code,
          name: os.name,
          isActive: true,
        },
      });
      console.log(`  + Created order source: ${os.name}`);
    }
  }

  console.log("✔ All project lookups seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Failed to seed lookup tables:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
