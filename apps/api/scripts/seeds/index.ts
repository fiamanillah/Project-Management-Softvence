import { createPrismaClient } from "@workspace/db";
import { env } from "@workspace/env/api";
import { createSeedContext, type SeedContext } from "./types";
import { seedLookups } from "./01-lookups.seed";
import { seedOrganization } from "./02-organization.seed";
import { seedRolesAndDesignations } from "./03-roles-permissions.seed";
import { seedUsersAndProfiles } from "./04-users-profiles.seed";
import { seedClients } from "./05-clients.seed";
import { seedProjects } from "./06-projects.seed";
import { seedChatsAndMessages } from "./07-chats-messages.seed";
import { seedIssuesAndTickets } from "./08-issues-tickets.seed";
import { seedBdOrders } from "./09-bd-orders.seed";
import { seedMiscAndAudit } from "./10-misc-audit.seed";

const prisma = createPrismaClient({
  databaseUrl: env.DATABASE_URL,
  isProduction: env.NODE_ENV === "production",
});

async function main() {
  const startTime = Date.now();
  const isClean = process.argv.includes("--clean");

  console.log("\n============================================================");
  console.log("🌱  SOFTVENCE MONOREPO — DATABASE SEED ENGINE");
  console.log("============================================================");
  if (isClean) {
    console.log("🧹  Mode: Clean Re-seed requested (--clean)");
  }

  const ctx: SeedContext = createSeedContext(prisma, isClean);

  const steps: { name: string; fn: (ctx: SeedContext) => Promise<void> }[] = [
    { name: "01. Dynamic Lookups & Scope Types", fn: seedLookups },
    { name: "02. Departments & Teams Structure", fn: seedOrganization },
    { name: "03. Permissions, Roles & Designations", fn: seedRolesAndDesignations },
    { name: "04. Users, Passwords & Scoped Grants", fn: seedUsersAndProfiles },
    { name: "05. Clients & Platform Profiles", fn: seedClients },
    { name: "06. Projects, Components & Assignments", fn: seedProjects },
    { name: "07. Project Chat & Message Approvals", fn: seedChatsAndMessages },
    { name: "08. Issues, Comments & Support Tickets", fn: seedIssuesAndTickets },
    { name: "09. Business Development Orders", fn: seedBdOrders },
    { name: "10. Notifications, Overrides & Audit Log", fn: seedMiscAndAudit },
  ];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepStart = Date.now();
    process.stdout.write(`⚡ [${i + 1}/${steps.length}] Seeding ${step.name}... `);
    try {
      await step.fn(ctx);
      const duration = Date.now() - stepStart;
      console.log(`✔ (${duration}ms)`);
    } catch (err) {
      console.log(`❌ FAILED`);
      console.error(`\nError in step "${step.name}":`, err);
      throw err;
    }
  }

  // Count database summary stats
  const [
    userCount,
    deptCount,
    teamCount,
    clientCount,
    projectCount,
    componentCount,
    milestoneCount,
    linkCount,
    projectMessageCount,
    workflowCount,
    issueCount,
    bdOrderCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.department.count(),
    prisma.team.count(),
    prisma.client.count(),
    prisma.project.count(),
    prisma.projectComponent.count(),
    prisma.projectMilestone.count(),
    prisma.projectLink.count(),
    prisma.projectMessage.count(),
    prisma.messageApprovalWorkflow.count(),
    prisma.issue.count(),
    prisma.bdOrder.count(),
  ]);

  // Invalidate Redis authorization cache & bump permission version on seed completion (Rule BE-10)
  try {
    const { AuthorizationEngine } = await import("../../src/core/authorization/AuthorizationEngine");
    await AuthorizationEngine.getInstance().invalidateCache();
  } catch (err) {
    console.warn("Failed to invalidate authorization cache after seed:", err);
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  const envAdminEmail = (env.ADMIN_EMAIL || env.DEFAULT_ADMIN_EMAIL || "admin@example.com").toLowerCase().trim();
  const envAdminPassword = env.ADMIN_PASSWORD || env.DEFAULT_ADMIN_PASSWORD || "adminpassword123";

  console.log("\n============================================================");
  console.log("🎉  DATABASE SEEDING COMPLETED SUCCESSFULLY!");
  console.log(`⏱   Total execution time: ${totalTime}s`);
  console.log("------------------------------------------------------------");
  console.log("📊  Database Entity Summary:");
  console.log(`    • Users:                ${userCount}`);
  console.log(`    • Departments:          ${deptCount}`);
  console.log(`    • Teams:                ${teamCount}`);
  console.log(`    • Clients:              ${clientCount}`);
  console.log(`    • Projects:             ${projectCount}`);
  console.log(`    • Project Components:   ${componentCount}`);
  console.log(`    • Project Milestones:   ${milestoneCount}`);
  console.log(`    • Project Resource Links:${linkCount}`);
  console.log(`    • Project Messages:     ${projectMessageCount}`);
  console.log(`    • Approval Workflows:   ${workflowCount}`);
  console.log(`    • Issues & Defects:     ${issueCount}`);
  console.log(`    • BD Orders & Deals:    ${bdOrderCount}`);
  console.log("------------------------------------------------------------");
  console.log("🔑  Persona Test Accounts (Password: Password123!):");
  console.log(`    • SuperAdmin (Env):     ${envAdminEmail} (Password: ${envAdminPassword})`);
  if (envAdminEmail !== "superadmin@softvence.com") {
    console.log("    • SuperAdmin (Demo):    superadmin@softvence.com");
  }
  console.log("    • Engineering Director: director.tech@softvence.com");
  console.log("    • Project Manager:      pm.sarah@softvence.com");
  console.log("    • Project Manager #2:   pm.david@softvence.com");
  console.log("    • Squad Tech Lead:      lead.alex@softvence.com");
  console.log("    • Lead UI/UX Designer:  lead.elena@softvence.com");
  console.log("    • Senior Backend Dev:   dev.james@softvence.com");
  console.log("    • Frontend React Dev:   dev.priya@softvence.com");
  console.log("    • Mobile Lead:          dev.marcus@softvence.com");
  console.log("    • UI/UX Designer:       designer.lisa@softvence.com");
  console.log("    • QA Automation Lead:   qa.tom@softvence.com");
  console.log("    • QA Test Engineer:     qa.emily@softvence.com");
  console.log("    • BD Growth Manager:    bd.rachel@softvence.com");
  console.log("    • BD Bidder / Account:  bd.kevin@softvence.com");
  console.log("    • Support Specialist:   support.anna@softvence.com");
  console.log("============================================================\n");
}

main()
  .catch((e) => {
    console.error("\n❌ Database seed fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
