import { Prisma } from "@workspace/db";
import type { SeedComponentRef, SeedContext, SeedProjectRef } from "./types";

export async function seedProjects(ctx: SeedContext): Promise<void> {
  const { prisma } = ctx;

  const agencyProfId = ctx.profiles.get("Softvence Agency")!;
  const fiverrProfId = ctx.profiles.get("softvence_pro")!;
  const directProfId = ctx.profiles.get("Softvence Direct Portal")!;

  const acmeClientId = ctx.clients.get("Acme Global Technologies")!;
  const finTechClientId = ctx.clients.get("FinTech NextGen Ltd")!;
  const healthPulseClientId = ctx.clients.get("HealthPulse AI Corp")!;
  const retailCloudClientId = ctx.clients.get("RetailCloud E-Commerce")!;
  const eduStreamClientId = ctx.clients.get("EduStream Global Academy")!;

  const webAppDevId = ctx.serviceLines.get("web-app-dev");
  const mobileAppDevId = ctx.serviceLines.get("mobile-app-dev");
  const uiUxDesignId = ctx.serviceLines.get("ui-ux-design");
  const aiMlId = ctx.serviceLines.get("ai-ml-engineering");
  const devopsId = ctx.serviceLines.get("devops-cloud");

  const inProgressStatusId = ctx.projectStatuses.get("IN_PROGRESS")!;
  const inReviewStatusId = ctx.projectStatuses.get("IN_REVIEW")!;
  const notStartedStatusId = ctx.projectStatuses.get("NOT_STARTED")!;
  const deliveredStatusId = ctx.projectStatuses.get("DELIVERED")!;

  const bidProposalOrderId = ctx.orderSources.get("BID_PROPOSAL_ORDER");
  const fixedClientId = ctx.orderSources.get("FIXED_CLIENT");
  const svaDirectId = ctx.orderSources.get("SVA_DIRECT_PROJECT");
  const specialOrderId = ctx.orderSources.get("SPECIAL_ORDER");
  const briefInviteId = ctx.orderSources.get("BRIEF_INVITATION");

  const PROJECTS_DATA = [
    {
      orderId: "ORD-2026-001",
      projectName: "Acme SaaS Enterprise ERP Portal",
      clientId: acmeClientId,
      profileId: agencyProfId,
      serviceLineId: webAppDevId,
      statusId: inProgressStatusId,
      orderSourceId: bidProposalOrderId,
      service: "Fullstack Web & Cloud Engineering",
      email: "billing@acmetech.io",
      orderLink: "https://www.upwork.com/contracts/~0123456789abcdef",
      orderSheetUrl: "https://docs.google.com/spreadsheets/d/acme-erp-spec",
      value: new Prisma.Decimal(45000),
      amount: new Prisma.Decimal(45000),
      percentage: new Prisma.Decimal(100),
      remarks: "High priority Q3 delivery. Phase 1 auth & dashboard milestone.",
      startDate: new Date("2026-06-01"),
      deliveryDate: new Date("2026-10-31"),
      teams: ["web-team"],
      users: [
        { email: "pm.sarah@softvence.com", roleCode: "TEAM_LEAD", note: "Project Director" },
        { email: "lead.alex@softvence.com", roleCode: "TEAM_LEAD", note: "Lead Architect" },
        { email: "dev.james@softvence.com", roleCode: "SR_DEV", note: "API Lead" },
        { email: "dev.priya@softvence.com", roleCode: "DEV", note: "React Dev" },
        { email: "designer.lisa@softvence.com", roleCode: "DESIGNER", note: "Product Designer" },
        { email: "qa.tom@softvence.com", roleCode: "QA", note: "Test Lead" },
      ],
      components: [
        { name: "Next.js Dashboard & Data Grid", statusId: inProgressStatusId },
        { name: "Express REST API & Auth Subsystem", statusId: deliveredStatusId },
        { name: "PostgreSQL & Database Migrations", statusId: deliveredStatusId },
        { name: "Stripe Billing & Subscription Sync", statusId: notStartedStatusId },
      ],
    },
    {
      orderId: "ORD-2026-002",
      projectName: "FinTech Merchant Mobile Wallet",
      clientId: finTechClientId,
      profileId: agencyProfId,
      serviceLineId: mobileAppDevId,
      statusId: inReviewStatusId,
      orderSourceId: fixedClientId,
      service: "Cross-Platform Mobile Application",
      email: "merchant-ops@nextgenfin.co.uk",
      orderLink: "https://www.upwork.com/contracts/~01987654321fedcba",
      orderSheetUrl: "https://docs.google.com/spreadsheets/d/fintech-mobile-spec",
      value: new Prisma.Decimal(28000),
      amount: new Prisma.Decimal(28000),
      percentage: new Prisma.Decimal(100),
      remarks: "App Store & Google Play submission build pending approval.",
      startDate: new Date("2026-05-15"),
      deliveryDate: new Date("2026-08-30"),
      teams: ["mobile-team"],
      users: [
        { email: "pm.david@softvence.com", roleCode: "TEAM_LEAD", note: "Mobile PM" },
        { email: "dev.marcus@softvence.com", roleCode: "SR_DEV", note: "Mobile Tech Lead" },
        { email: "dev.priya@softvence.com", roleCode: "DEV", note: "Mobile UI Dev" },
        { email: "qa.emily@softvence.com", roleCode: "QA", note: "Mobile QA" },
      ],
      components: [
        { name: "React Native iOS & Android Client", statusId: inReviewStatusId },
        { name: "Biometric Auth & Token Vault", statusId: deliveredStatusId },
        { name: "Push Notification Dispatcher", statusId: inProgressStatusId },
      ],
    },
    {
      orderId: "ORD-2026-003",
      projectName: "HealthPulse AI Telemedicine Hub",
      clientId: healthPulseClientId,
      profileId: directProfId,
      serviceLineId: aiMlId,
      statusId: inProgressStatusId,
      orderSourceId: svaDirectId,
      service: "HIPAA Compliant Video & AI Consultation",
      email: "contact@healthpulse.ai",
      orderLink: "https://internal.softvence.com/contracts/hp-telemed-2026",
      orderSheetUrl: "https://docs.google.com/spreadsheets/d/healthpulse-spec",
      value: new Prisma.Decimal(62000),
      amount: new Prisma.Decimal(62000),
      percentage: new Prisma.Decimal(100),
      remarks: "Direct contract with ongoing SLA & HIPAA security audit requirements.",
      startDate: new Date("2026-07-01"),
      deliveryDate: new Date("2026-12-15"),
      teams: ["web-team", "ai-cloud-team"],
      users: [
        { email: "pm.sarah@softvence.com", roleCode: "TEAM_LEAD", note: "Principal PM" },
        { email: "lead.alex@softvence.com", roleCode: "TEAM_LEAD", note: "Security & WebRTC Lead" },
        { email: "dev.james@softvence.com", roleCode: "SR_DEV", note: "Backend Lead" },
        { email: "dev.marcus@softvence.com", roleCode: "DEV", note: "Video Streaming Engineer" },
        { email: "qa.tom@softvence.com", roleCode: "QA", note: "Compliance & Security QA" },
      ],
      components: [
        { name: "WebRTC Video Consultation Room", statusId: inProgressStatusId },
        { name: "AI Diagnostic Transcription Engine", statusId: inProgressStatusId },
        { name: "HIPAA Audit Trail & Encrypted Storage", statusId: deliveredStatusId },
      ],
    },
    {
      orderId: "ORD-2026-004",
      projectName: "RetailCloud Headless Storefront",
      clientId: retailCloudClientId,
      profileId: fiverrProfId,
      serviceLineId: uiUxDesignId,
      statusId: deliveredStatusId,
      orderSourceId: specialOrderId,
      service: "E-Commerce Design System & Storefront",
      email: "shop@retailcloud.de",
      orderLink: "https://www.fiverr.com/orders/FO1234567890",
      orderSheetUrl: "https://docs.google.com/spreadsheets/d/retailcloud-spec",
      value: new Prisma.Decimal(18500),
      amount: new Prisma.Decimal(18500),
      percentage: new Prisma.Decimal(100),
      remarks: "Completed and delivered on schedule with 5-star review.",
      startDate: new Date("2026-04-01"),
      deliveryDate: new Date("2026-06-30"),
      teams: ["design-team", "web-team"],
      users: [
        { email: "pm.david@softvence.com", roleCode: "TEAM_LEAD", note: "Delivery PM" },
        { email: "lead.elena@softvence.com", roleCode: "DESIGNER", note: "Lead Designer" },
        { email: "dev.priya@softvence.com", roleCode: "DEV", note: "Storefront Dev" },
      ],
      components: [
        { name: "Figma Design System & Component Library", statusId: deliveredStatusId },
        { name: "Storefront UI & Cart Checkout Flow", statusId: deliveredStatusId },
      ],
    },
    {
      orderId: "ORD-2026-005",
      projectName: "EduStream Live Streaming Classroom",
      clientId: eduStreamClientId,
      profileId: agencyProfId,
      serviceLineId: devopsId,
      statusId: notStartedStatusId,
      orderSourceId: briefInviteId,
      service: "Cloud Infrastructure & Video Ingestion",
      email: "director@edustream.org",
      orderLink: "https://www.freelancer.com/projects/edustream-streaming",
      orderSheetUrl: "https://docs.google.com/spreadsheets/d/edustream-spec",
      value: new Prisma.Decimal(35000),
      amount: new Prisma.Decimal(35000),
      percentage: new Prisma.Decimal(100),
      remarks: "Architecture discovery phase initiated. Kickoff call next week.",
      startDate: new Date("2026-09-01"),
      deliveryDate: new Date("2027-01-30"),
      teams: ["web-team"],
      users: [
        { email: "pm.sarah@softvence.com", roleCode: "TEAM_LEAD", note: "Engagement Manager" },
        { email: "lead.alex@softvence.com", roleCode: "TEAM_LEAD", note: "Cloud Architect" },
      ],
      components: [
        { name: "Kubernetes Cluster & RTMP Ingestion Pipeline", statusId: notStartedStatusId },
        { name: "Interactive Whiteboard Canvas Engine", statusId: notStartedStatusId },
      ],
    },
  ];

  for (const p of PROJECTS_DATA) {
    let projectRecord = await prisma.project.findUnique({
      where: { orderId: p.orderId },
    });

    const defaultBranchId = ctx.branches.get("BET-SA") || null;

    if (projectRecord) {
      projectRecord = await prisma.project.update({
        where: { orderId: p.orderId },
        data: {
          projectName: p.projectName,
          branchId: defaultBranchId,
          clientId: p.clientId,
          profileId: p.profileId,
          serviceLineId: p.serviceLineId,
          statusId: p.statusId,
          orderSourceId: p.orderSourceId,
          service: p.service,
          email: p.email,
          orderLink: p.orderLink,
          orderSheetUrl: p.orderSheetUrl,
          value: p.value,
          amount: p.amount,
          percentage: p.percentage,
          remarks: p.remarks,
          startDate: p.startDate,
          deliveryDate: p.deliveryDate,
        },
      });
    } else {
      projectRecord = await prisma.project.create({
        data: {
          orderId: p.orderId,
          projectName: p.projectName,
          branchId: defaultBranchId,
          clientId: p.clientId,
          profileId: p.profileId,
          serviceLineId: p.serviceLineId,
          statusId: p.statusId,
          orderSourceId: p.orderSourceId,
          service: p.service,
          email: p.email,
          orderLink: p.orderLink,
          orderSheetUrl: p.orderSheetUrl,
          value: p.value,
          amount: p.amount,
          percentage: p.percentage,
          remarks: p.remarks,
          startDate: p.startDate,
          deliveryDate: p.deliveryDate,
        },
      });
    }

    const ref: SeedProjectRef = {
      id: projectRecord.id,
      orderId: projectRecord.orderId,
      projectName: projectRecord.projectName,
      clientId: projectRecord.clientId,
      profileId: projectRecord.profileId,
      statusId: projectRecord.statusId,
    };
    ctx.projects.set(p.orderId, ref);

    // 1. Team Assignments
    for (const teamSlug of p.teams) {
      const teamId = ctx.teams.get(teamSlug);
      if (!teamId) continue;

      const existingAssignment = await prisma.projectTeamAssignment.findFirst({
        where: { projectId: projectRecord.id, teamId, unassignedAt: null },
      });

      if (!existingAssignment) {
        await prisma.projectTeamAssignment.create({
          data: {
            projectId: projectRecord.id,
            teamId,
          },
        });
      }
    }

    // 2. User Assignments
    for (const u of p.users) {
      const user = ctx.users.get(u.email);
      const roleId = ctx.assignmentRoles.get(u.roleCode);
      if (!user || !roleId) continue;

      const existingAssignment = await prisma.projectAssignment.findFirst({
        where: { projectId: projectRecord.id, userId: user.id, unassignedAt: null },
      });

      if (existingAssignment) {
        await prisma.projectAssignment.update({
          where: { id: existingAssignment.id },
          data: { roleId, note: u.note },
        });
      } else {
        await prisma.projectAssignment.create({
          data: {
            projectId: projectRecord.id,
            userId: user.id,
            roleId,
            note: u.note,
          },
        });
      }
    }

    // 3. Components
    for (const comp of p.components) {
      let compRecord = await prisma.projectComponent.findFirst({
        where: { projectId: projectRecord.id, name: comp.name },
      });

      if (compRecord) {
        compRecord = await prisma.projectComponent.update({
          where: { id: compRecord.id },
          data: { statusId: comp.statusId },
        });
      } else {
        compRecord = await prisma.projectComponent.create({
          data: {
            projectId: projectRecord.id,
            name: comp.name,
            statusId: comp.statusId,
          },
        });
      }

      const compRef: SeedComponentRef = {
        id: compRecord.id,
        projectId: projectRecord.id,
        name: compRecord.name,
      };
      ctx.components.set(`${p.orderId}:${comp.name}`, compRef);
    }
  }
}
