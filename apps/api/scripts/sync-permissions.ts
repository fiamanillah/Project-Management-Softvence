import dotenv from "dotenv";
import { prisma } from "../src/lib/prisma";
import { PermissionRegistry } from "../src/core/permissions/PermissionRegistry";

dotenv.config();

async function main() {
  console.log("⚡ Starting permission registry sync CLI...");
  const registry = PermissionRegistry.getInstance();
  const result = await registry.sync(prisma);

  console.log(`\n========================================`);
  console.log(`📊 Permission Sync Summary:`);
  console.log(`  - Total Declared:  ${result.totalDeclared}`);
  console.log(`  - Inserted (+):    ${result.insertedCount}`);
  console.log(`  - Updated (~):     ${result.updatedCount}`);
  console.log(`  - Deprecated (-):  ${result.deprecatedCount}`);
  console.log(`  - Unchanged:       ${result.unchangedCount}`);
  console.log(`========================================\n`);
}

main()
  .catch((err) => {
    console.error("❌ Permission sync CLI failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
