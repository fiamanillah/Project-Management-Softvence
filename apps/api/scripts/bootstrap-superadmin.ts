import dotenv from "dotenv";
import { createPrismaClient } from "@workspace/db";
import { hashPassword } from "../src/utils/crypto";
import { PermissionRegistry } from "../src/core/permissions/PermissionRegistry";
import { AuditLogService } from "../src/core/audit/audit.service";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/project_management";
const prisma = createPrismaClient({
  databaseUrl,
  isProduction: false,
});

async function main() {
  const email = process.env.ADMIN_EMAIL || process.env.DEFAULT_ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD || process.env.DEFAULT_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.");
    console.error("Usage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=supersecret bun scripts/bootstrap-superadmin.ts");
    process.exit(1);
  }

  // Step 0: Ensure Scope Types are seeded
  console.log("⚡ Seeding PermissionScopeType lookup records...");
  const SCOPE_TYPES = [
    { code: "GLOBAL", name: "Global Access", description: "Applies system-wide with no resource boundary constraints", resolutionStrategy: "Global" as const },
    { code: "OWN_DEPARTMENT", name: "Own Department", description: "Restricted to resources belonging to the user's department", resolutionStrategy: "OwnDepartment" as const },
    { code: "OWN_TEAM", name: "Own Team", description: "Restricted to resources belonging to teams the user actively belongs to", resolutionStrategy: "OwnTeam" as const },
    { code: "OWN_PROJECT", name: "Own Project", description: "Restricted to projects where the user is directly assigned", resolutionStrategy: "OwnProject" as const },
    { code: "OWN_PROFILE", name: "Own Profile", description: "Restricted to profiles assigned to the user", resolutionStrategy: "OwnProfile" as const },
    { code: "EXPLICIT_DEPARTMENTS", name: "Explicit Departments", description: "Restricted to specifically selected department scope targets", resolutionStrategy: "ExplicitDepartments" as const },
    { code: "EXPLICIT_TEAMS", name: "Explicit Teams", description: "Restricted to specifically selected team scope targets", resolutionStrategy: "ExplicitTeams" as const },
    { code: "EXPLICIT_PROJECTS", name: "Explicit Projects", description: "Restricted to specifically selected project scope targets", resolutionStrategy: "ExplicitProjects" as const },
  ];

  for (const st of SCOPE_TYPES) {
    await prisma.permissionScopeType.upsert({
      where: { code: st.code },
      update: { name: st.name, description: st.description, resolutionStrategy: st.resolutionStrategy, isActive: true },
      create: { code: st.code, name: st.name, description: st.description, resolutionStrategy: st.resolutionStrategy, isActive: true },
    });
  }
  console.log("✔ PermissionScopeType lookup records synced!");

  // Step 1: Ensure Permission Registry is synced
  console.log("⚡ Syncing Permission Registry...");
  const syncResult = await PermissionRegistry.getInstance().sync(prisma as any);
  console.log(`✔ Permissions synced: +${syncResult.insertedCount} new, ~${syncResult.updatedCount} changed, -${syncResult.deprecatedCount} deprecated`);

  // Step 2: Ensure default system department and designation exist
  let dept = await prisma.department.findFirst({
    where: { code: "SYS" },
  });

  if (!dept) {
    dept = await prisma.department.create({
      data: {
        code: "SYS",
        name: "System Administration",
      },
    });
    console.log("📁 Created default System Administration department");
  }

  let designation = await prisma.designation.findFirst({
    where: { code: "SUPER_ADMIN" },
  });

  if (!designation) {
    designation = await prisma.designation.create({
      data: {
        code: "SUPER_ADMIN",
        name: "Super Administrator",
        departmentId: dept.id,
        hierarchyLevel: 1,
        isLeadership: true,
      },
    });
    console.log("🎖️ Created default Super Administrator designation");
  }

  const hashedPassword = await hashPassword(password);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  let userId: string;

  if (existingUser) {
    const updatedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        passwordHash: hashedPassword,
        systemRole: "SuperAdmin",
        isActive: true,
      },
    });
    userId = updatedUser.id;
    console.log(`✅ SuperAdmin user updated successfully! User ID: ${updatedUser.id}`);
  } else {
    const newUser = await prisma.user.create({
      data: {
        email,
        employeeId: `ADM-${Date.now().toString().slice(-6)}`,
        passwordHash: hashedPassword,
        firstName: "Super",
        lastName: "Admin",
        systemRole: "SuperAdmin",
        designationId: designation.id,
        isActive: true,
      },
    });
    userId = newUser.id;
    console.log(`✅ SuperAdmin user created successfully! User ID: ${newUser.id}`);
  }

  // Dispatch audit log event
  AuditLogService.log({
    module: "Auth",
    action: "SUPER_ADMIN_BOOTSTRAP",
    entityTable: "users",
    entityId: userId,
    actor: {
      id: userId,
      email,
      role: "SuperAdmin",
    },
    metadata: {
      email,
      bootstrappedAt: new Date().toISOString(),
    },
    status: "SUCCESS",
  });
}

main()
  .catch((e) => {
    console.error("❌ Failed to bootstrap SuperAdmin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
