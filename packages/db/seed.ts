import { PrismaClient, Department, SystemRole } from "./src/generated/client/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import argon2 from "argon2";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || "postgresql://fiamanillah:fiamanillah@localhost:5439/manage_project?schema=public";
const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const hashPassword = async (password: string): Promise<string> => {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
};

async function main() {
  console.log("🌱 Starting seeding...");

  // 1. Permissions
  const permissionsData = [
    { code: "user.create", description: "Create new user accounts" },
    { code: "user.deactivate", description: "Deactivate existing user accounts" },
    { code: "user.manage", description: "Manage all user accounts and assignments" },
  ];

  const permissionsMap = new Map<string, string>();
  for (const perm of permissionsData) {
    const created = await prisma.permission.upsert({
      where: { code: perm.code },
      update: { description: perm.description },
      create: perm,
    });
    permissionsMap.set(perm.code, created.id);
  }

  // 2. Designations
  const designationsData = [
    // Operations
    { code: "GM", name: "General Manager", department: Department.Operations, hierarchy_level: 1, is_leadership: true },
    { code: "ACM", name: "Assistant Chief Manager", department: Department.Operations, hierarchy_level: 2, is_leadership: true },
    { code: "OPS_MANAGER", name: "Operations Manager", department: Department.Operations, hierarchy_level: 3, is_leadership: true },
    { code: "ASST_MANAGER", name: "Assistant Manager", department: Department.Operations, hierarchy_level: 4, is_leadership: false },
    { code: "TEAM_LEADER", name: "Team Leader", department: Department.Operations, hierarchy_level: 5, is_leadership: false },
    { code: "CO_LEADER", name: "Co-Leader", department: Department.Operations, hierarchy_level: 6, is_leadership: false },
    { code: "MEMBER", name: "Member", department: Department.Operations, hierarchy_level: 7, is_leadership: false },
    // Sales
    { code: "SALES_MANAGER", name: "Sales Manager", department: Department.Sales, hierarchy_level: 3, is_leadership: true },
    { code: "SALES_TEAM_LEADER", name: "Sales Team Leader", department: Department.Sales, hierarchy_level: 5, is_leadership: false },
    { code: "SALES_MEMBER", name: "Sales Member", department: Department.Sales, hierarchy_level: 7, is_leadership: false },
  ];

  const designationsMap = new Map<string, string>();
  for (const desig of designationsData) {
    const created = await prisma.designation.upsert({
      where: { code: desig.code },
      update: {
        name: desig.name,
        department: desig.department,
        hierarchy_level: desig.hierarchy_level,
        is_leadership: desig.is_leadership,
      },
      create: desig,
    });
    designationsMap.set(desig.code, created.id);
  }

  // 3. Designation Permissions
  // GM, ACM, OPS_MANAGER get user.manage, user.create, user.deactivate
  const leadershipCodes = ["GM", "ACM", "OPS_MANAGER"];
  const adminPermissions = ["user.manage", "user.create", "user.deactivate"];

  for (const code of leadershipCodes) {
    const designationId = designationsMap.get(code);
    if (!designationId) continue;

    for (const permCode of adminPermissions) {
      const permId = permissionsMap.get(permCode);
      if (!permId) continue;

      await prisma.designationPermission.upsert({
        where: {
          designation_id_permission_id: {
            designation_id: designationId,
            permission_id: permId,
          },
        },
        update: {},
        create: {
          designation_id: designationId,
          permission_id: permId,
        },
      });
    }
  }

  // 4. Seeded Users
  const superAdminPassword = "SuperSecretDevPassword123!";
  const opsManagerPassword = "OpsManagerDevPassword123!";
  const teamLeaderPassword = "TeamLeaderDevPassword123!";
  const memberPassword = "MemberDevPassword123!";
  const salesMemberPassword = "SalesMemberDevPassword123!";

  const usersData = [
    {
      employee_id: "EMP-001",
      email: "superadmin@agency.local",
      first_name: "Super",
      last_name: "Admin",
      system_role: SystemRole.SuperAdmin,
      designation_id: designationsMap.get("GM")!,
      is_active: true,
      plainPassword: superAdminPassword,
    },
    {
      employee_id: "EMP-002",
      email: "opsmanager@agency.local",
      first_name: "Ops",
      last_name: "Manager",
      system_role: SystemRole.Admin,
      designation_id: designationsMap.get("OPS_MANAGER")!,
      is_active: true,
      plainPassword: opsManagerPassword,
    },
    {
      employee_id: "EMP-003",
      email: "teamleader@agency.local",
      first_name: "Team",
      last_name: "Leader",
      system_role: SystemRole.Staff,
      designation_id: designationsMap.get("TEAM_LEADER")!,
      is_active: true,
      plainPassword: teamLeaderPassword,
    },
    {
      employee_id: "EMP-004",
      email: "member@agency.local",
      first_name: "Staff",
      last_name: "Member",
      system_role: SystemRole.Staff,
      designation_id: designationsMap.get("MEMBER")!,
      is_active: true,
      plainPassword: memberPassword,
    },
    {
      employee_id: "EMP-005",
      email: "salesmember@agency.local",
      first_name: "Sales",
      last_name: "Executive",
      system_role: SystemRole.Staff,
      designation_id: designationsMap.get("SALES_MEMBER")!,
      is_active: true,
      plainPassword: salesMemberPassword,
    },
  ];

  for (const u of usersData) {
    const password_hash = await hashPassword(u.plainPassword);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        first_name: u.first_name,
        last_name: u.last_name,
        system_role: u.system_role,
        designation_id: u.designation_id,
        is_active: u.is_active,
        password_hash,
      },
      create: {
        employee_id: u.employee_id,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        system_role: u.system_role,
        designation_id: u.designation_id,
        is_active: u.is_active,
        password_hash,
      },
    });
  }

  // 5. Generate .SEED_CREDENTIALS.md
  const credsContent = `# Local Development Seed Credentials

> [!WARNING]
> DO NOT COMMIT THIS FILE OR USE THESE CREDENTIALS IN PRODUCTION.

| Role | Email | Password | Employee ID | Designation |
| --- | --- | --- | --- | --- |
| SuperAdmin | superadmin@agency.local | \`${superAdminPassword}\` | EMP-001 | GM |
| Ops Manager | opsmanager@agency.local | \`${opsManagerPassword}\` | EMP-002 | OPS_MANAGER |
| Team Leader | teamleader@agency.local | \`${teamLeaderPassword}\` | EMP-003 | TEAM_LEADER |
| Member | member@agency.local | \`${memberPassword}\` | EMP-004 | MEMBER |
| Sales Member | salesmember@agency.local | \`${salesMemberPassword}\` | EMP-005 | SALES_MEMBER |
`;

  const rootCredsPath = path.resolve(__dirname, "../../.SEED_CREDENTIALS.md");
  fs.writeFileSync(rootCredsPath, credsContent, "utf-8");

  console.log("✔ Seeding completed successfully!");
  console.log("📄 Seed credentials written to .SEED_CREDENTIALS.md");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
