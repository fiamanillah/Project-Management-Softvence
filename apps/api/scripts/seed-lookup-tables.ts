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
}

main()
  .catch((e) => {
    console.error("❌ Failed to seed lookup tables:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
