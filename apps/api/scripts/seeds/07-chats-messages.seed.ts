import type { SeedContext } from "./types";

export async function seedChatsAndMessages(ctx: SeedContext): Promise<void> {
  const { prisma } = ctx;

  const acmeProj = ctx.projects.get("PRJ-1048") || ctx.projects.get("ORD-2026-001");
  const finTechProj = ctx.projects.get("PRJ-1049") || ctx.projects.get("ORD-2026-002");
  const healthPulseProj = ctx.projects.get("PRJ-1050") || ctx.projects.get("ORD-2026-003");
  const apexProj = ctx.projects.get("PRJ-1053") || ctx.projects.get("ORD-2026-006");

  const sarahUser = ctx.users.get("pm.sarah@softvence.com")!;
  const alexUser = ctx.users.get("lead.alex@softvence.com")!;
  const jamesUser = ctx.users.get("dev.james@softvence.com")!;
  const priyaUser = ctx.users.get("dev.priya@softvence.com")!;
  const lisaUser = ctx.users.get("designer.lisa@softvence.com")!;
  const tomUser = ctx.users.get("qa.tom@softvence.com")!;
  const davidUser = ctx.users.get("pm.david@softvence.com")!;
  const marcusUser = ctx.users.get("dev.marcus@softvence.com")!;
  const emilyUser = ctx.users.get("qa.emily@softvence.com")!;
  const rachelUser = ctx.users.get("bd.rachel@softvence.com")!;
  const kevinUser = ctx.users.get("bd.kevin@softvence.com")!;

  const internalNoteTypeId = ctx.messageTypes.get("INTERNAL_NOTE");
  const techUpdateTypeId = ctx.messageTypes.get("TECH_UPDATE") || internalNoteTypeId;
  const statusUpdateTypeId = ctx.messageTypes.get("STATUS_UPDATE") || ctx.messageTypes.get("CLIENT_UPDATE");
  const deliveryTypeId = ctx.messageTypes.get("DELIVERY") || ctx.messageTypes.get("DELIVERY_NOTICE");
  const generalNoticeTypeId = ctx.messageTypes.get("GENERAL_NOTICE") || statusUpdateTypeId;
  const clientReplyTypeId = ctx.messageTypes.get("CLIENT_REPLY") || statusUpdateTypeId;
  const clientInboundTypeId = ctx.messageTypes.get("CLIENT_INBOUND") || internalNoteTypeId;
  const extensionRequestTypeId = ctx.messageTypes.get("EXTENSION_REQUEST") || statusUpdateTypeId;

  const inReviewApprovalStatusId = ctx.approvalStatuses.get("IN_REVIEW")!;
  const pendingSalesApprovalStatusId = ctx.approvalStatuses.get("PENDING_SALES")!;
  const dispatchedApprovalStatusId = ctx.approvalStatuses.get("DISPATCHED")!;
  const revisionApprovalStatusId = ctx.approvalStatuses.get("REVISION_REQUESTED")!;

  // =========================================================================
  // 1. UNIFIED PROJECT CONVERSATION & APPROVAL STATE MACHINE FOR ACME ERP
  // =========================================================================
  if (acmeProj) {
    // 1.1 Pinned Kickoff Announcement
    let msgPinned = await prisma.projectMessage.findFirst({
      where: { projectId: acmeProj.id, isPinned: true },
    });

    if (!msgPinned) {
      msgPinned = await prisma.projectMessage.create({
        data: {
          projectId: acmeProj.id,
          senderId: sarahUser.id,
          messageTypeId: generalNoticeTypeId,
          purpose: "INTERNAL_DISCUSSION",
          text: "🚀 Welcome to the Acme SaaS ERP Sprint Squad! Phase 1 deliveries are on track. Daily async standups in this channel at 10:00 AM.",
          isPinned: true,
          pinnedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
          pinnedById: sarahUser.id,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
        },
      });
    }

    // 1.2 Technical Architecture Message
    let msgTech = await prisma.projectMessage.findFirst({
      where: { projectId: acmeProj.id, text: { contains: "Backend auth and multi-tenant DB" } },
    });

    if (!msgTech) {
      msgTech = await prisma.projectMessage.create({
        data: {
          projectId: acmeProj.id,
          senderId: alexUser.id,
          messageTypeId: techUpdateTypeId,
          purpose: "INTERNAL_DISCUSSION",
          text: "Backend auth and multi-tenant DB migrations have been deployed to staging. JWT session cookies with Redis revocation are active.",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18),
        },
      });

      // Reactions
      await prisma.projectMessageReaction.createMany({
        data: [
          { messageId: msgTech.id, userId: jamesUser.id, emoji: "👍" },
          { messageId: msgTech.id, userId: priyaUser.id, emoji: "🔥" },
          { messageId: msgTech.id, userId: sarahUser.id, emoji: "🚀" },
        ],
        skipDuplicates: true,
      });

      // Attachments
      await prisma.projectMessageAttachment.create({
        data: {
          messageId: msgTech.id,
          name: "Acme_SaaS_Architecture_v2.pdf",
          type: "file",
          url: "https://storage.softvence.com/acme-erp/specs/architecture-diagram-v2.pdf",
          fileSizeBytes: 2450000,
          extension: "pdf",
          mimeType: "application/pdf",
        },
      });
    }

    // 1.3 UI Design Token Share
    let msgDesign = await prisma.projectMessage.findFirst({
      where: { projectId: acmeProj.id, text: { contains: "High-Fidelity Figma design tokens" } },
    });

    if (!msgDesign) {
      msgDesign = await prisma.projectMessage.create({
        data: {
          projectId: acmeProj.id,
          senderId: lisaUser.id,
          messageTypeId: internalNoteTypeId,
          purpose: "INTERNAL_DISCUSSION",
          text: "🎨 The finalized High-Fidelity Figma design tokens and interactive component library have been published for the Data Grid view.",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 14),
        },
      });

      await prisma.projectMessageAttachment.create({
        data: {
          messageId: msgDesign.id,
          name: "DataGrid_UI_Figma_Mockup.png",
          type: "image",
          url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200",
          thumbnailUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=300",
          fileSizeBytes: 1150000,
          extension: "png",
          mimeType: "image/png",
        },
      });

      await prisma.projectMessageReaction.createMany({
        data: [
          { messageId: msgDesign.id, userId: priyaUser.id, emoji: "❤️" },
          { messageId: msgDesign.id, userId: sarahUser.id, emoji: "🙌" },
        ],
        skipDuplicates: true,
      });
    }

    // 1.4 Frontend Integration Reply
    let msgFrontend = await prisma.projectMessage.findFirst({
      where: { projectId: acmeProj.id, text: { contains: "Integrating server-side pagination" } },
    });

    if (!msgFrontend) {
      msgFrontend = await prisma.projectMessage.create({
        data: {
          projectId: acmeProj.id,
          senderId: priyaUser.id,
          messageTypeId: internalNoteTypeId,
          purpose: "INTERNAL_DISCUSSION",
          replyToMessageId: msgDesign?.id || null,
          text: "Awesome! Integrating server-side pagination, sorting, and dynamic column visibility filters now.",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10),
        },
      });
    }

    // 1.5 QA Greenlight
    let msgQA = await prisma.projectMessage.findFirst({
      where: { projectId: acmeProj.id, text: { contains: "Automated integration suite is 100% green" } },
    });

    if (!msgQA) {
      msgQA = await prisma.projectMessage.create({
        data: {
          projectId: acmeProj.id,
          senderId: tomUser.id,
          messageTypeId: techUpdateTypeId,
          purpose: "INTERNAL_DISCUSSION",
          text: "🧪 Automated integration test suite is 100% green. 45 unit tests and 12 E2E Playwright workflows passed.",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
        },
      });

      await prisma.projectMessageReaction.createMany({
        data: [
          { messageId: msgQA.id, userId: alexUser.id, emoji: "🎉" },
          { messageId: msgQA.id, userId: sarahUser.id, emoji: "👏" },
        ],
        skipDuplicates: true,
      });
    }

    // 1.6 Approval Workflow 1: DELIVERED / DISPATCHED
    let msgDelivered = await prisma.projectMessage.findFirst({
      where: { projectId: acmeProj.id, text: { contains: "Sprint 2 Deliverable: Next.js 15 Data Grid" } },
    });

    if (!msgDelivered) {
      msgDelivered = await prisma.projectMessage.create({
        data: {
          projectId: acmeProj.id,
          senderId: priyaUser.id,
          messageTypeId: deliveryTypeId,
          purpose: "CLIENT_COMMUNICATION",
          clientDirection: "OUTBOUND",
          text: "Sprint 2 Deliverable: Next.js 15 Data Grid & Multi-Tenant PostgreSQL subsystem is officially DELIVERED on staging with full test documentation.",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
        },
      });

      const wf1 = await prisma.messageApprovalWorkflow.create({
        data: {
          messageId: msgDelivered.id,
          statusId: dispatchedApprovalStatusId,
          requestedById: priyaUser.id,
          targetClientName: "Sarah Jenkins (Acme Corp)",
          slaTargetMinutes: 30,
          slaStatus: "ON_TRACK",
          leadApprovedById: alexUser.id,
          leadApprovedAt: new Date(Date.now() - 1000 * 60 * 60 * 47),
          salesDispatchedById: rachelUser.id,
          salesDispatchedAt: new Date(Date.now() - 1000 * 60 * 60 * 46),
          dispatchPlatform: "Upwork",
          dispatchReferenceId: "UPW-MS-2026-8812",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
        },
      });

      // Audit Trail
      await prisma.approvalStageAudit.createMany({
        data: [
          {
            workflowId: wf1.id,
            stageKey: "DRAFTED",
            stageName: "Draft Created",
            actorId: priyaUser.id,
            actorRole: "Author",
            durationMinutes: null,
            notes: "Drafted Sprint 2 deliverable notice",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
          },
          {
            workflowId: wf1.id,
            stageKey: "LEAD_REVIEW",
            stageName: "Lead Approved",
            actorId: alexUser.id,
            actorRole: "Tech Lead",
            durationMinutes: 12,
            notes: "Approved: staging build verified and QA test report attached",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 47),
          },
          {
            workflowId: wf1.id,
            stageKey: "SALES_DISPATCH",
            stageName: "Dispatched to Client",
            actorId: rachelUser.id,
            actorRole: "Sales Dispatcher",
            durationMinutes: 18,
            notes: "Dispatched via Upwork Contract Milestone #2",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 46),
          },
        ],
      });
    }

    // 1.7 Inbound Client Message Relay
    let msgInbound = await prisma.projectMessage.findFirst({
      where: { projectId: acmeProj.id, text: { contains: "The Data Grid speed on staging is exceptional" } },
    });

    if (!msgInbound) {
      msgInbound = await prisma.projectMessage.create({
        data: {
          projectId: acmeProj.id,
          senderId: rachelUser.id,
          messageTypeId: clientInboundTypeId,
          purpose: "CLIENT_COMMUNICATION",
          clientDirection: "INBOUND",
          isFromClient: true,
          text: "Hi Softvence team! The Data Grid speed on staging is exceptional. Could we please add Excel/CSV export with multi-column sorting for the Q3 audit?",
          metadata: {
            clientName: "Sarah Jenkins",
            clientCompany: "Acme Global Technologies",
            platform: "Upwork",
            channel: "Upwork Direct Messages",
          },
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        },
      });
    }

    // 1.8 Approval Workflow 2: PENDING_SALES (Lead approved, awaiting sales dispatch)
    let msgPendingSales = await prisma.projectMessage.findFirst({
      where: { projectId: acmeProj.id, text: { contains: "We have scheduled the Excel/CSV export engine" } },
    });

    if (!msgPendingSales) {
      msgPendingSales = await prisma.projectMessage.create({
        data: {
          projectId: acmeProj.id,
          senderId: priyaUser.id,
          messageTypeId: clientReplyTypeId,
          purpose: "CLIENT_COMMUNICATION",
          clientDirection: "OUTBOUND",
          text: "Hi Sarah, thank you for the feedback! We have scheduled the Excel/CSV export engine for deployment on Wednesday along with the user role filter.",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
        },
      });

      const wf2 = await prisma.messageApprovalWorkflow.create({
        data: {
          messageId: msgPendingSales.id,
          statusId: pendingSalesApprovalStatusId,
          requestedById: priyaUser.id,
          targetClientName: "Sarah Jenkins (Acme Corp)",
          slaTargetMinutes: 30,
          slaStatus: "ON_TRACK",
          leadApprovedById: alexUser.id,
          leadApprovedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
        },
      });

      await prisma.approvalStageAudit.createMany({
        data: [
          {
            workflowId: wf2.id,
            stageKey: "DRAFTED",
            stageName: "Draft Created",
            actorId: priyaUser.id,
            actorRole: "Author",
            durationMinutes: null,
            notes: "Drafted response to client CSV export inquiry",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
          },
          {
            workflowId: wf2.id,
            stageKey: "LEAD_REVIEW",
            stageName: "Lead Approved",
            actorId: alexUser.id,
            actorRole: "Tech Lead",
            durationMinutes: 8,
            notes: "Approved: accurate timeline and scope estimate for Wednesday release",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
          },
        ],
      });
    }

    // 1.9 Approval Workflow 3: IN_REVIEW (Awaiting Tech Lead review)
    let msgInReview = await prisma.projectMessage.findFirst({
      where: { projectId: acmeProj.id, text: { contains: "Sprint 3 Milestone Status Update" } },
    });

    if (!msgInReview) {
      msgInReview = await prisma.projectMessage.create({
        data: {
          projectId: acmeProj.id,
          senderId: jamesUser.id,
          messageTypeId: statusUpdateTypeId,
          purpose: "CLIENT_COMMUNICATION",
          clientDirection: "OUTBOUND",
          text: "Sprint 3 Milestone Status Update: Stripe Webhook integration and multi-currency billing testing in progress. ETA for UAT deployment is Friday.",
          createdAt: new Date(Date.now() - 1000 * 60 * 45),
        },
      });

      const wf3 = await prisma.messageApprovalWorkflow.create({
        data: {
          messageId: msgInReview.id,
          statusId: inReviewApprovalStatusId,
          requestedById: jamesUser.id,
          targetClientName: "Sarah Jenkins (Acme Corp)",
          slaTargetMinutes: 30,
          slaStatus: "ON_TRACK",
          createdAt: new Date(Date.now() - 1000 * 60 * 45),
        },
      });

      await prisma.approvalStageAudit.create({
        data: {
          workflowId: wf3.id,
          stageKey: "DRAFTED",
          stageName: "Draft Created",
          actorId: jamesUser.id,
          actorRole: "Author",
          durationMinutes: null,
          notes: "Drafted Sprint 3 progress update",
          createdAt: new Date(Date.now() - 1000 * 60 * 45),
        },
      });
    }

    // 1.10 Approval Workflow 4: REVISION_REQUESTED
    let msgRevision = await prisma.projectMessage.findFirst({
      where: { projectId: acmeProj.id, text: { contains: "Notice regarding custom webhook endpoint SSL" } },
    });

    if (!msgRevision) {
      msgRevision = await prisma.projectMessage.create({
        data: {
          projectId: acmeProj.id,
          senderId: priyaUser.id,
          messageTypeId: generalNoticeTypeId,
          purpose: "CLIENT_COMMUNICATION",
          clientDirection: "OUTBOUND",
          text: "Notice regarding custom webhook endpoint SSL certificate configuration on the staging cluster.",
          isEdited: true,
          editedAt: new Date(Date.now() - 1000 * 60 * 30),
          createdAt: new Date(Date.now() - 1000 * 60 * 120),
        },
      });

      const wf4 = await prisma.messageApprovalWorkflow.create({
        data: {
          messageId: msgRevision.id,
          statusId: revisionApprovalStatusId,
          requestedById: priyaUser.id,
          targetClientName: "Sarah Jenkins (Acme Corp)",
          slaTargetMinutes: 30,
          slaStatus: "AT_RISK",
          rejectedById: alexUser.id,
          rejectedAt: new Date(Date.now() - 1000 * 60 * 90),
          rejectionReason: "Please include the staging cert fingerprint and domain verification steps before sending to client.",
          createdAt: new Date(Date.now() - 1000 * 60 * 120),
        },
      });

      await prisma.approvalStageAudit.createMany({
        data: [
          {
            workflowId: wf4.id,
            stageKey: "DRAFTED",
            stageName: "Draft Created",
            actorId: priyaUser.id,
            actorRole: "Author",
            durationMinutes: null,
            notes: "Drafted SSL certificate notice",
            createdAt: new Date(Date.now() - 1000 * 60 * 120),
          },
          {
            workflowId: wf4.id,
            stageKey: "REVISION_REQUESTED",
            stageName: "Revision Requested",
            actorId: alexUser.id,
            actorRole: "Tech Lead",
            durationMinutes: 15,
            notes: "Needs staging cert fingerprint and domain verification steps",
            createdAt: new Date(Date.now() - 1000 * 60 * 90),
          },
        ],
      });

      await prisma.projectMessageRevision.create({
        data: {
          messageId: msgRevision.id,
          content: "Initial draft: Notice regarding custom webhook SSL cert.",
          editedById: priyaUser.id,
          reason: "Updated with staging cert fingerprint",
          createdAt: new Date(Date.now() - 1000 * 60 * 30),
        },
      });
    }

    // Read Receipts
    const allAcmeMessages = await prisma.projectMessage.findMany({
      where: { projectId: acmeProj.id },
      select: { id: true, createdAt: true },
    });

    for (const msg of allAcmeMessages) {
      for (const reader of [sarahUser, alexUser, jamesUser, priyaUser]) {
        await prisma.projectMessageReadReceipt.upsert({
          where: {
            messageId_userId: {
              messageId: msg.id,
              userId: reader.id,
            },
          },
          update: { seenAt: new Date() },
          create: {
            messageId: msg.id,
            userId: reader.id,
            seenAt: new Date(),
          },
        });
      }
    }

    // 1.11 Backwards-compatible Legacy ProjectGroup and Messages
    let legacyGroup = await prisma.projectGroup.findUnique({
      where: { projectId: acmeProj.id },
    });

    if (!legacyGroup) {
      legacyGroup = await prisma.projectGroup.create({
        data: {
          projectId: acmeProj.id,
          name: "Acme SaaS ERP Dev Squad",
        },
      });
    }

    ctx.projectGroups.set(acmeProj.id, legacyGroup.id);

    const members = [
      { user: sarahUser, source: "AutoManagement" as const },
      { user: alexUser, source: "AutoManagement" as const },
      { user: jamesUser, source: "AutoAssignment" as const },
      { user: priyaUser, source: "AutoAssignment" as const },
      { user: lisaUser, source: "AutoAssignment" as const },
      { user: tomUser, source: "AutoAssignment" as const },
    ];

    for (const m of members) {
      const existingMember = await prisma.projectGroupMember.findFirst({
        where: { groupId: legacyGroup.id, userId: m.user.id, leftAt: null },
      });

      if (!existingMember) {
        await prisma.projectGroupMember.create({
          data: {
            groupId: legacyGroup.id,
            userId: m.user.id,
            source: m.source,
            addedBy: sarahUser.id,
          },
        });
      }
    }
  }

  // =========================================================================
  // 2. UNIFIED PROJECT CONVERSATION FOR FINTECH MOBILE (PRJ-1049)
  // =========================================================================
  if (finTechProj) {
    let mobileMsg1 = await prisma.projectMessage.findFirst({
      where: { projectId: finTechProj.id, text: { contains: "iOS TestFlight Build v1.2.0" } },
    });

    if (!mobileMsg1) {
      mobileMsg1 = await prisma.projectMessage.create({
        data: {
          projectId: finTechProj.id,
          senderId: marcusUser.id,
          messageTypeId: techUpdateTypeId,
          purpose: "INTERNAL_DISCUSSION",
          text: "📲 iOS TestFlight Build v1.2.0 uploaded and distributed to internal testers. Biometric FaceID login and QR settlement verified.",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
        },
      });

      await prisma.projectMessageReaction.createMany({
        data: [
          { messageId: mobileMsg1.id, userId: davidUser.id, emoji: "👍" },
          { messageId: mobileMsg1.id, userId: emilyUser.id, emoji: "🚀" },
        ],
        skipDuplicates: true,
      });
    }

    let mobileMsg2 = await prisma.projectMessage.findFirst({
      where: { projectId: finTechProj.id, text: { contains: "App Store & Google Play Release Candidate" } },
    });

    if (!mobileMsg2) {
      mobileMsg2 = await prisma.projectMessage.create({
        data: {
          projectId: finTechProj.id,
          senderId: davidUser.id,
          messageTypeId: statusUpdateTypeId,
          purpose: "CLIENT_COMMUNICATION",
          clientDirection: "OUTBOUND",
          text: "Milestone 3 Update: App Store & Google Play Release Candidate is compiled and undergoing compliance verification before final store submission.",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        },
      });

      await prisma.messageApprovalWorkflow.create({
        data: {
          messageId: mobileMsg2.id,
          statusId: inReviewApprovalStatusId,
          requestedById: davidUser.id,
          targetClientName: "Liam Stewart (NextGen Financials)",
          slaTargetMinutes: 30,
          slaStatus: "ON_TRACK",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        },
      });
    }
  }

  // =========================================================================
  // 3. UNIFIED PROJECT CONVERSATION FOR APEX LOGISTICS (PRJ-1053)
  // =========================================================================
  if (apexProj) {
    let apexMsg1 = await prisma.projectMessage.findFirst({
      where: { projectId: apexProj.id, text: { contains: "MQTT Telematics broker" } },
    });

    if (!apexMsg1) {
      apexMsg1 = await prisma.projectMessage.create({
        data: {
          projectId: apexProj.id,
          senderId: jamesUser.id,
          messageTypeId: techUpdateTypeId,
          purpose: "INTERNAL_DISCUSSION",
          text: "📡 MQTT Telematics broker benchmarks completed: Successfully processed 50,000 GPS telemetry events/sec with < 8ms latency.",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8),
        },
      });

      await prisma.projectMessageReaction.createMany({
        data: [
          { messageId: apexMsg1.id, userId: alexUser.id, emoji: "⚡" },
          { messageId: apexMsg1.id, userId: sarahUser.id, emoji: "👏" },
        ],
        skipDuplicates: true,
      });
    }
  }
}
