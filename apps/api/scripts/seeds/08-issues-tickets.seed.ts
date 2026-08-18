import type { SeedContext } from "./types";

export async function seedIssuesAndTickets(ctx: SeedContext): Promise<void> {
  const { prisma } = ctx;

  const acmeProj = ctx.projects.get("ORD-2026-001");
  const finTechProj = ctx.projects.get("ORD-2026-002");
  const healthPulseProj = ctx.projects.get("ORD-2026-003");

  const bugTypeId = ctx.issueTypes.get("BUG")!;
  const uiGlitchTypeId = ctx.issueTypes.get("UI_GLITCH")!;
  const securityTypeId = ctx.issueTypes.get("SECURITY")!;
  const featureTypeId = ctx.issueTypes.get("FEATURE")!;

  const lowPrioId = ctx.priorities.get("LOW")!;
  const medPrioId = ctx.priorities.get("MEDIUM")!;
  const highPrioId = ctx.priorities.get("HIGH")!;
  const urgentPrioId = ctx.priorities.get("URGENT")!;
  const criticalPrioId = ctx.priorities.get("CRITICAL")!;

  const openTicketStatusId = ctx.ticketStatuses.get("OPEN")!;
  const inProgressTicketStatusId = ctx.ticketStatuses.get("IN_PROGRESS")!;
  const resolvedTicketStatusId = ctx.ticketStatuses.get("RESOLVED")!;

  const alexUser = ctx.users.get("lead.alex@softvence.com")!;
  const jamesUser = ctx.users.get("dev.james@softvence.com")!;
  const priyaUser = ctx.users.get("dev.priya@softvence.com")!;
  const tomUser = ctx.users.get("qa.tom@softvence.com")!;
  const emilyUser = ctx.users.get("qa.emily@softvence.com")!;
  const marcusUser = ctx.users.get("dev.marcus@softvence.com")!;
  const sarahUser = ctx.users.get("pm.sarah@softvence.com")!;
  const annaUser = ctx.users.get("support.anna@softvence.com")!;

  // 1. Issues for Acme ERP
  if (acmeProj) {
    const apiComp = ctx.components.get("ORD-2026-001:Express REST API & Auth Subsystem");
    const gridComp = ctx.components.get("ORD-2026-001:Next.js Dashboard & Data Grid");

    // Issue 1: Solved Bug
    const issue1Title = "Stripe Webhook Signature Verification failing on clock drift";
    let issue1 = await prisma.issue.findFirst({
      where: { projectId: acmeProj.id, title: issue1Title },
    });

    if (!issue1) {
      issue1 = await prisma.issue.create({
        data: {
          projectId: acmeProj.id,
          componentId: apiComp?.id,
          authorId: tomUser.id,
          title: issue1Title,
          content: "When test events arrive with a timestamp delta > 30s, the webhook handler rejects valid payload signatures with HTTP 400.",
          status: "Solve",
          priorityId: highPrioId,
          issueTypeId: bugTypeId,
          resolvedBy: jamesUser.id,
          resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
        },
      });

      await prisma.issueComment.create({
        data: {
          issueId: issue1.id,
          authorId: alexUser.id,
          content: "Let's increase the tolerance timestamp window from 30s to 120s and add logging on signature mismatch.",
        },
      });

      await prisma.issueComment.create({
        data: {
          issueId: issue1.id,
          authorId: jamesUser.id,
          content: "Implemented in PR #42 with comprehensive clock drift test cases. Deployed and verified on staging.",
        },
      });
    }
    ctx.issues.set(issue1Title, issue1.id);

    // Issue 2: WIP UI Glitch
    const issue2Title = "Data Grid column resizing causes horizontal layout jitter on Safari WebKit";
    let issue2 = await prisma.issue.findFirst({
      where: { projectId: acmeProj.id, title: issue2Title },
    });

    if (!issue2) {
      issue2 = await prisma.issue.create({
        data: {
          projectId: acmeProj.id,
          componentId: gridComp?.id,
          authorId: tomUser.id,
          title: issue2Title,
          content: "Dragging column divider on Safari macOS causes parent scroll container to flicker horizontally due to subpixel calculations.",
          status: "WIP",
          priorityId: medPrioId,
          issueTypeId: uiGlitchTypeId,
        },
      });

      await prisma.issueComment.create({
        data: {
          issueId: issue2.id,
          authorId: priyaUser.id,
          content: "I have reproduced this on Safari 17.4. Applying `contain: layout` and integer rounding to the column drag calculations.",
        },
      });
    }
    ctx.issues.set(issue2Title, issue2.id);

    // Support Tickets for Acme ERP
    const ticketRef1 = "TIK-2026-001";
    let ticket1 = await prisma.supportTicket.findUnique({
      where: { ticketRef: ticketRef1 },
    });

    if (!ticket1) {
      ticket1 = await prisma.supportTicket.create({
        data: {
          projectId: acmeProj.id,
          ticketRef: ticketRef1,
          authorId: sarahUser.id,
          statusId: inProgressTicketStatusId,
          subject: "Acme Staging SSO Integration: Okta SAML XML Metadata Configuration",
        },
      });
    }
  }

  // 2. Issues for FinTech Mobile
  if (finTechProj) {
    const mobileComp = ctx.components.get("ORD-2026-002:React Native iOS & Android Client");

    const issue3Title = "Biometric FaceID fallback passcode prompt doesn't trigger on iOS 18 beta";
    let issue3 = await prisma.issue.findFirst({
      where: { projectId: finTechProj.id, title: issue3Title },
    });

    if (!issue3) {
      issue3 = await prisma.issue.create({
        data: {
          projectId: finTechProj.id,
          componentId: mobileComp?.id,
          authorId: emilyUser.id,
          title: issue3Title,
          content: "When cancelling FaceID 3 times, fallback to custom 6-digit MPIN view fails to mount.",
          status: "NRI",
          priorityId: urgentPrioId,
          issueTypeId: bugTypeId,
        },
      });

      await prisma.issueComment.create({
        data: {
          issueId: issue3.id,
          authorId: marcusUser.id,
          content: "Checking the native LocalAuthentication module callback handler in iOS bridge.",
        },
      });
    }
    ctx.issues.set(issue3Title, issue3.id);
  }

  // 3. Support Tickets for HealthPulse AI
  if (healthPulseProj) {
    const ticketRef2 = "TIK-2026-002";
    let ticket2 = await prisma.supportTicket.findUnique({
      where: { ticketRef: ticketRef2 },
    });

    if (!ticket2) {
      ticket2 = await prisma.supportTicket.create({
        data: {
          projectId: healthPulseProj.id,
          ticketRef: ticketRef2,
          authorId: annaUser.id,
          statusId: resolvedTicketStatusId,
          subject: "HIPAA Business Associate Agreement (BAA) Signed Copy Counter-Execution",
        },
      });
    }
  }
}
