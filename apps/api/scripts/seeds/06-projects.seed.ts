import { Prisma } from "@workspace/db";
import type { SeedComponentRef, SeedContext, SeedProjectRef } from "./types";

export async function seedProjects(ctx: SeedContext): Promise<void> {
  const { prisma } = ctx;

  const agencyProfId = ctx.profiles.get("Softvence Agency")!;
  const enterpriseProfId = ctx.profiles.get("Softvence Enterprise") || agencyProfId;
  const fiverrProfId = ctx.profiles.get("softvence_pro")!;
  const directProfId = ctx.profiles.get("Softvence Direct Portal")!;

  const acmeClientId = ctx.clients.get("Acme Global Technologies")!;
  const finTechClientId = ctx.clients.get("FinTech NextGen Ltd")!;
  const healthPulseClientId = ctx.clients.get("HealthPulse AI Corp")!;
  const retailCloudClientId = ctx.clients.get("RetailCloud E-Commerce")!;
  const eduStreamClientId = ctx.clients.get("EduStream Global Academy")!;
  const apexClientId = ctx.clients.get("Apex Fleet Logistics LLC")!;

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
  const b2bOrderId = ctx.orderSources.get("B2B");

  const defaultBranchId = ctx.branches.get("BET-SA") || null;

  const PROJECTS_DATA = [
    {
      orderId: "PRJ-1048",
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
      budget: new Prisma.Decimal(45000),
      percentage: new Prisma.Decimal(100),
      progress: 68,
      isPinned: true,
      deadline: new Date("2026-10-31"),
      startDate: new Date("2026-06-01"),
      deliveryDate: new Date("2026-10-31"),
      remarks: "High priority Q3 enterprise delivery. Phase 1 auth & dashboard milestone delivered successfully.",
      teams: ["web-team"],
      users: [
        { email: "pm.sarah@softvence.com", roleCode: "TEAM_LEAD", note: "Principal Project Manager" },
        { email: "lead.alex@softvence.com", roleCode: "TEAM_LEAD", note: "Lead Systems Architect" },
        { email: "dev.james@softvence.com", roleCode: "SR_DEV", note: "Backend & Database Architect" },
        { email: "dev.priya@softvence.com", roleCode: "DEV", note: "Frontend Next.js Lead" },
        { email: "designer.lisa@softvence.com", roleCode: "DESIGNER", note: "Product UI/UX Designer" },
        { email: "qa.tom@softvence.com", roleCode: "QA", note: "QA Automation Lead" },
      ],
      components: [
        { name: "Next.js 15 Data Grid & Analytics Dashboard", statusId: inProgressStatusId },
        { name: "Express REST API & Centralized Auth Subsystem", statusId: deliveredStatusId },
        { name: "PostgreSQL Schema Migrations & Multi-Tenancy", statusId: deliveredStatusId },
        { name: "Stripe Billing & Subscription Webhooks Sync", statusId: notStartedStatusId },
      ],
      milestones: [
        {
          title: "Sprint 1: Auth, Roles & DB Migrations",
          dueDate: new Date("2026-07-15"),
          isCompleted: true,
          completedAt: new Date("2026-07-14"),
          deliverableCount: 4,
          assignedUserEmail: "lead.alex@softvence.com",
        },
        {
          title: "Sprint 2: Data Grid & Multi-Filter Query Engine",
          dueDate: new Date("2026-08-15"),
          isCompleted: true,
          completedAt: new Date("2026-08-14"),
          deliverableCount: 6,
          assignedUserEmail: "dev.priya@softvence.com",
        },
        {
          title: "Sprint 3: Stripe Billing & Team Permissions",
          dueDate: new Date("2026-09-15"),
          isCompleted: false,
          deliverableCount: 5,
          assignedUserEmail: "dev.james@softvence.com",
        },
        {
          title: "Sprint 4: Enterprise SSO (Okta/SAML) & Audit Logs",
          dueDate: new Date("2026-10-15"),
          isCompleted: false,
          deliverableCount: 3,
          assignedUserEmail: "pm.sarah@softvence.com",
        },
      ],
      links: [
        {
          title: "Figma Design System",
          url: "https://figma.com/file/acme-erp-v2",
          category: "Figma",
          description: "Design tokens and interactive component library",
          addedByUserEmail: "designer.lisa@softvence.com",
        },
        {
          title: "GitHub Monorepo",
          url: "https://github.com/softvence/acme-erp",
          category: "GitHub",
          description: "Core monorepo repository with CI/CD actions",
          addedByUserEmail: "lead.alex@softvence.com",
        },
        {
          title: "Jira Sprint Board",
          url: "https://acme-softvence.atlassian.net/jira/software/c/projects/ERP",
          category: "Jira",
          description: "Active sprint kanban board",
          addedByUserEmail: "pm.sarah@softvence.com",
        },
        {
          title: "Swagger API Docs",
          url: "https://staging-api.acmetech.io/docs",
          category: "Docs",
          description: "OpenAPI 3.1 REST documentation",
          addedByUserEmail: "dev.james@softvence.com",
        },
        {
          title: "Staging App URL",
          url: "https://staging.acmetech.io",
          category: "Staging",
          description: "Live staging deployment on AWS ECS",
          addedByUserEmail: "dev.priya@softvence.com",
        },
      ],
    },
    {
      orderId: "PRJ-1049",
      projectName: "FinTech NextGen Mobile Wallet",
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
      budget: new Prisma.Decimal(28000),
      percentage: new Prisma.Decimal(100),
      progress: 85,
      isPinned: false,
      deadline: new Date("2026-08-30"),
      startDate: new Date("2026-05-15"),
      deliveryDate: new Date("2026-08-30"),
      remarks: "App Store & Google Play submission build v1.2.0 RC currently undergoing final security review.",
      teams: ["mobile-team"],
      users: [
        { email: "pm.david@softvence.com", roleCode: "TEAM_LEAD", note: "Mobile Delivery PM" },
        { email: "dev.marcus@softvence.com", roleCode: "SR_DEV", note: "Mobile Tech Lead" },
        { email: "dev.priya@softvence.com", roleCode: "DEV", note: "React Native UI Developer" },
        { email: "qa.emily@softvence.com", roleCode: "QA", note: "Mobile QA Test Engineer" },
      ],
      components: [
        { name: "React Native iOS & Android Client", statusId: inReviewStatusId },
        { name: "Biometric Auth & Token Vault", statusId: deliveredStatusId },
        { name: "Push Notification Dispatcher", statusId: inProgressStatusId },
      ],
      milestones: [
        {
          title: "Milestone 1: Biometric FaceID & Vault Integration",
          dueDate: new Date("2026-06-30"),
          isCompleted: true,
          completedAt: new Date("2026-06-28"),
          deliverableCount: 3,
          assignedUserEmail: "dev.marcus@softvence.com",
        },
        {
          title: "Milestone 2: Merchant QR Code Settlement & Transfer",
          dueDate: new Date("2026-07-31"),
          isCompleted: true,
          completedAt: new Date("2026-07-30"),
          deliverableCount: 5,
          assignedUserEmail: "dev.priya@softvence.com",
        },
        {
          title: "Milestone 3: App Store & Google Play Release Candidate",
          dueDate: new Date("2026-08-30"),
          isCompleted: false,
          deliverableCount: 4,
          assignedUserEmail: "pm.david@softvence.com",
        },
      ],
      links: [
        {
          title: "TestFlight Build v1.2.0",
          url: "https://testflight.apple.com/join/fintech-wallet",
          category: "Other",
          description: "iOS TestFlight internal distribution link",
          addedByUserEmail: "dev.marcus@softvence.com",
        },
        {
          title: "Figma Mobile Wireframes",
          url: "https://figma.com/file/fintech-wallet-v1",
          category: "Figma",
          description: "Mobile UX screens and transaction flows",
          addedByUserEmail: "lead.elena@softvence.com",
        },
        {
          title: "Banking API Specification",
          url: "https://docs.nextgenfin.co.uk/wallet-api",
          category: "Docs",
          description: "Open banking transaction endpoints",
          addedByUserEmail: "dev.marcus@softvence.com",
        },
      ],
    },
    {
      orderId: "PRJ-1050",
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
      budget: new Prisma.Decimal(62000),
      percentage: new Prisma.Decimal(100),
      progress: 40,
      isPinned: true,
      deadline: new Date("2026-12-15"),
      startDate: new Date("2026-07-01"),
      deliveryDate: new Date("2026-12-15"),
      remarks: "Direct enterprise contract with strict HIPAA audit compliance and Whisper AI transcription integration.",
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
      milestones: [
        {
          title: "Phase 1: HIPAA Security Architecture & BAA Signoff",
          dueDate: new Date("2026-08-01"),
          isCompleted: true,
          completedAt: new Date("2026-07-28"),
          deliverableCount: 2,
          assignedUserEmail: "lead.alex@softvence.com",
        },
        {
          title: "Phase 2: WebRTC Peer-to-Peer Encrypted Mesh",
          dueDate: new Date("2026-09-30"),
          isCompleted: false,
          deliverableCount: 4,
          assignedUserEmail: "dev.marcus@softvence.com",
        },
        {
          title: "Phase 3: Whisper AI Real-Time Clinical Notes",
          dueDate: new Date("2026-11-15"),
          isCompleted: false,
          deliverableCount: 3,
          assignedUserEmail: "dev.james@softvence.com",
        },
      ],
      links: [
        {
          title: "HIPAA Security BAA Execution",
          url: "https://healthpulse.ai/legal/baa-softvence",
          category: "Docs",
          description: "Executed BAA compliance certificate",
          addedByUserEmail: "pm.sarah@softvence.com",
        },
        {
          title: "WebRTC Staging Video Portal",
          url: "https://staging-telemed.healthpulse.ai",
          category: "Staging",
          description: "Live WebRTC staging test room",
          addedByUserEmail: "lead.alex@softvence.com",
        },
      ],
    },
    {
      orderId: "PRJ-1051",
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
      budget: new Prisma.Decimal(18500),
      percentage: new Prisma.Decimal(100),
      progress: 100,
      isPinned: false,
      deadline: new Date("2026-06-30"),
      startDate: new Date("2026-04-01"),
      deliveryDate: new Date("2026-06-30"),
      remarks: "Delivered on schedule with 5-star review. Retainer maintenance contract discussion in progress.",
      teams: ["design-team", "web-team"],
      users: [
        { email: "pm.david@softvence.com", roleCode: "TEAM_LEAD", note: "Delivery PM" },
        { email: "lead.elena@softvence.com", roleCode: "DESIGNER", note: "Lead Product Designer" },
        { email: "dev.priya@softvence.com", roleCode: "DEV", note: "Storefront UI Developer" },
      ],
      components: [
        { name: "Figma Design System & Component Library", statusId: deliveredStatusId },
        { name: "Storefront UI & Cart Checkout Flow", statusId: deliveredStatusId },
      ],
      milestones: [
        {
          title: "Design Tokens & Storefront Prototype",
          dueDate: new Date("2026-05-15"),
          isCompleted: true,
          completedAt: new Date("2026-05-12"),
          deliverableCount: 8,
          assignedUserEmail: "lead.elena@softvence.com",
        },
        {
          title: "Storefront Codebase Handover & Live Launch",
          dueDate: new Date("2026-06-30"),
          isCompleted: true,
          completedAt: new Date("2026-06-25"),
          deliverableCount: 5,
          assignedUserEmail: "dev.priya@softvence.com",
        },
      ],
      links: [
        {
          title: "Live Production Storefront",
          url: "https://retailcloud.de",
          category: "Other",
          description: "Live headless e-commerce store",
          addedByUserEmail: "pm.david@softvence.com",
        },
        {
          title: "Figma Design Tokens Library",
          url: "https://figma.com/file/retailcloud-system",
          category: "Figma",
          description: "Final UI Design System components",
          addedByUserEmail: "lead.elena@softvence.com",
        },
      ],
    },
    {
      orderId: "PRJ-1052",
      projectName: "EduStream Live Classroom Engine",
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
      budget: new Prisma.Decimal(35000),
      percentage: new Prisma.Decimal(100),
      progress: 15,
      isPinned: false,
      deadline: new Date("2027-01-30"),
      startDate: new Date("2026-09-01"),
      deliveryDate: new Date("2027-01-30"),
      remarks: "Architecture discovery phase initiated. Technical kickoff call scheduled.",
      teams: ["web-team", "ai-cloud-team"],
      users: [
        { email: "pm.sarah@softvence.com", roleCode: "TEAM_LEAD", note: "Engagement Manager" },
        { email: "lead.alex@softvence.com", roleCode: "TEAM_LEAD", note: "Cloud Architect" },
      ],
      components: [
        { name: "Kubernetes Cluster & RTMP Ingestion Pipeline", statusId: notStartedStatusId },
        { name: "Interactive Whiteboard Canvas Engine", statusId: notStartedStatusId },
      ],
      milestones: [
        {
          title: "Discovery: RTMP Low-Latency Benchmark Report",
          dueDate: new Date("2026-09-30"),
          isCompleted: false,
          deliverableCount: 2,
          assignedUserEmail: "lead.alex@softvence.com",
        },
      ],
      links: [
        {
          title: "Cloud Scalability Whitepaper",
          url: "https://edustream.org/docs/arch-v1",
          category: "Docs",
          description: "Technical specs for 100k concurrent live video streams",
          addedByUserEmail: "lead.alex@softvence.com",
        },
      ],
    },
    {
      orderId: "PRJ-1053",
      projectName: "Apex Logistics Fleet GPS Tracking",
      clientId: apexClientId,
      profileId: enterpriseProfId,
      serviceLineId: webAppDevId,
      statusId: inProgressStatusId,
      orderSourceId: b2bOrderId,
      service: "Fleet Telematics & Live Map Engine",
      email: "operations@apexfleet.com",
      orderLink: "https://www.upwork.com/contracts/~01fleetenterprise8899",
      orderSheetUrl: "https://docs.google.com/spreadsheets/d/apex-fleet-spec",
      value: new Prisma.Decimal(52000),
      amount: new Prisma.Decimal(52000),
      budget: new Prisma.Decimal(52000),
      percentage: new Prisma.Decimal(100),
      progress: 55,
      isPinned: false,
      deadline: new Date("2026-11-30"),
      startDate: new Date("2026-06-15"),
      deliveryDate: new Date("2026-11-30"),
      remarks: "Enterprise B2B fleet logistics management portal with OBD-II telematics streaming and Mapbox GPS rendering.",
      teams: ["web-team", "mobile-team"],
      users: [
        { email: "pm.sarah@softvence.com", roleCode: "TEAM_LEAD", note: "Enterprise PM" },
        { email: "lead.alex@softvence.com", roleCode: "TEAM_LEAD", note: "Realtime Map Architect" },
        { email: "dev.james@softvence.com", roleCode: "SR_DEV", note: "MQTT Telemetry Backend" },
        { email: "dev.marcus@softvence.com", roleCode: "DEV", note: "Driver Mobile App Dev" },
        { email: "qa.tom@softvence.com", roleCode: "QA", note: "Telemetry Protocol QA" },
      ],
      components: [
        { name: "Real-Time WebSocket Vehicle Geolocation Map", statusId: inProgressStatusId },
        { name: "OBD-II Telematics Data Ingestion & Alerts", statusId: deliveredStatusId },
        { name: "Driver Dispatching & Fuel Optimization Engine", statusId: notStartedStatusId },
      ],
      milestones: [
        {
          title: "Milestone 1: Telematics MQTT Broker & Geofencing",
          dueDate: new Date("2026-08-01"),
          isCompleted: true,
          completedAt: new Date("2026-07-29"),
          deliverableCount: 4,
          assignedUserEmail: "dev.james@softvence.com",
        },
        {
          title: "Milestone 2: Mapbox Live Fleet Visualization Dashboard",
          dueDate: new Date("2026-09-30"),
          isCompleted: false,
          deliverableCount: 5,
          assignedUserEmail: "dev.marcus@softvence.com",
        },
        {
          title: "Milestone 3: Route Optimization & Maintenance Scheduler",
          dueDate: new Date("2026-11-30"),
          isCompleted: false,
          deliverableCount: 3,
          assignedUserEmail: "lead.alex@softvence.com",
        },
      ],
      links: [
        {
          title: "Mapbox Fleet Simulator Staging",
          url: "https://staging-fleet.apexfleet.com",
          category: "Staging",
          description: "Live GPS vehicle simulator on Mapbox GL",
          addedByUserEmail: "dev.marcus@softvence.com",
        },
        {
          title: "Telematics API Swagger Spec",
          url: "https://api.apexfleet.com/swagger",
          category: "Docs",
          description: "OBD-II telemetry parser API documentation",
          addedByUserEmail: "dev.james@softvence.com",
        },
      ],
    },
  ];

  for (const p of PROJECTS_DATA) {
    let projectRecord = await prisma.project.findUnique({
      where: { orderId: p.orderId },
    });

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
          budget: p.budget,
          percentage: p.percentage,
          progress: p.progress,
          isPinned: p.isPinned,
          deadline: p.deadline,
          startDate: p.startDate,
          deliveryDate: p.deliveryDate,
          remarks: p.remarks,
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
          budget: p.budget,
          percentage: p.percentage,
          progress: p.progress,
          isPinned: p.isPinned,
          deadline: p.deadline,
          startDate: p.startDate,
          deliveryDate: p.deliveryDate,
          remarks: p.remarks,
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

    // Also support backwards compatibility with ORD-2026-xxx codes
    if (p.orderId === "PRJ-1048") ctx.projects.set("ORD-2026-001", ref);
    if (p.orderId === "PRJ-1049") ctx.projects.set("ORD-2026-002", ref);
    if (p.orderId === "PRJ-1050") ctx.projects.set("ORD-2026-003", ref);
    if (p.orderId === "PRJ-1051") ctx.projects.set("ORD-2026-004", ref);
    if (p.orderId === "PRJ-1052") ctx.projects.set("ORD-2026-005", ref);
    if (p.orderId === "PRJ-1053") ctx.projects.set("ORD-2026-006", ref);

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
      ctx.components.set(`${projectRecord.id}:${comp.name}`, compRef);
    }

    // 4. Milestones
    if (p.milestones) {
      for (const m of p.milestones) {
        const assignedUser = m.assignedUserEmail ? ctx.users.get(m.assignedUserEmail) : null;
        let milestoneRecord = await prisma.projectMilestone.findFirst({
          where: { projectId: projectRecord.id, title: m.title },
        });

        if (milestoneRecord) {
          await prisma.projectMilestone.update({
            where: { id: milestoneRecord.id },
            data: {
              dueDate: m.dueDate,
              isCompleted: m.isCompleted,
              completedAt: m.completedAt || null,
              deliverableCount: m.deliverableCount,
              assignedToUserId: assignedUser?.id || null,
            },
          });
        } else {
          await prisma.projectMilestone.create({
            data: {
              projectId: projectRecord.id,
              title: m.title,
              dueDate: m.dueDate,
              isCompleted: m.isCompleted,
              completedAt: m.completedAt || null,
              deliverableCount: m.deliverableCount,
              assignedToUserId: assignedUser?.id || null,
            },
          });
        }
      }
    }

    // 5. Links
    if (p.links) {
      for (const l of p.links) {
        const addedByUser = ctx.users.get(l.addedByUserEmail);
        let linkRecord = await prisma.projectLink.findFirst({
          where: { projectId: projectRecord.id, title: l.title },
        });

        if (linkRecord) {
          await prisma.projectLink.update({
            where: { id: linkRecord.id },
            data: {
              url: l.url,
              category: l.category,
              description: l.description,
              addedById: addedByUser?.id || projectRecord.id,
            },
          });
        } else {
          await prisma.projectLink.create({
            data: {
              projectId: projectRecord.id,
              title: l.title,
              url: l.url,
              category: l.category,
              description: l.description,
              addedById: addedByUser?.id || projectRecord.id,
            },
          });
        }
      }
    }
  }
}
