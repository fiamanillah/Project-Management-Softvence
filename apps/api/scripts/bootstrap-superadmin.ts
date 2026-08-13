import dotenv from "dotenv";
import { createPrismaClient } from "@workspace/db";
import { hashPassword } from "../src/utils/crypto";

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

  console.log(`🔐 Bootstrapping SuperAdmin user: ${email}...`);

  // Ensure a default system department and designation exist
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

  if (existingUser) {
    const updatedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        passwordHash: hashedPassword,
        systemRole: "SuperAdmin",
        isActive: true,
      },
    });
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
    console.log(`✅ SuperAdmin user created successfully! User ID: ${newUser.id}`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Failed to bootstrap SuperAdmin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
