import type { SeedContext } from "./types";

export async function seedChatsAndMessages(ctx: SeedContext): Promise<void> {
  const { prisma } = ctx;

  const acmeProj = ctx.projects.get("ORD-2026-001");
  const finTechProj = ctx.projects.get("ORD-2026-002");
  const healthPulseProj = ctx.projects.get("ORD-2026-003");

  const sarahUser = ctx.users.get("pm.sarah@softvence.com")!;
  const alexUser = ctx.users.get("lead.alex@softvence.com")!;
  const jamesUser = ctx.users.get("dev.james@softvence.com")!;
  const priyaUser = ctx.users.get("dev.priya@softvence.com")!;
  const lisaUser = ctx.users.get("designer.lisa@softvence.com")!;
  const tomUser = ctx.users.get("qa.tom@softvence.com")!;
  const davidUser = ctx.users.get("pm.david@softvence.com")!;
  const marcusUser = ctx.users.get("dev.marcus@softvence.com")!;
  const rachelUser = ctx.users.get("bd.rachel@softvence.com")!;

  const clientUpdateTypeId = ctx.messageTypes.get("CLIENT_UPDATE")!;
  const deliveryNoticeTypeId = ctx.messageTypes.get("DELIVERY_NOTICE")!;
  const internalNoteTypeId = ctx.messageTypes.get("INTERNAL_NOTE")!;

  // 1. Internal Project Groups & Chat Messages for Acme ERP
  if (acmeProj) {
    let group = await prisma.projectGroup.findUnique({
      where: { projectId: acmeProj.id },
    });

    if (!group) {
      group = await prisma.projectGroup.create({
        data: {
          projectId: acmeProj.id,
          name: "Acme SaaS ERP Dev Squad",
        },
      });
    }

    ctx.projectGroups.set(acmeProj.id, group.id);

    // Group Members
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
        where: { groupId: group.id, userId: m.user.id, leftAt: null },
      });

      if (!existingMember) {
        await prisma.projectGroupMember.create({
          data: {
            groupId: group.id,
            userId: m.user.id,
            source: m.source,
            addedBy: sarahUser.id,
          },
        });
      }
    }

    // Chat Messages
    const CHAT_LOGS = [
      { user: alexUser, content: "🚀 Backend auth and multi-tenant DB migrations have been deployed to staging.", minsAgo: 180 },
      { user: lisaUser, content: "🎨 The finalized High-Fidelity Figma design tokens have been published for the Data Grid view.", minsAgo: 140 },
      { user: priyaUser, content: "💻 Awesome! Integrating the server-side pagination and column filtering now.", minsAgo: 100 },
      { user: tomUser, content: "🧪 Automated integration suite is 100% green. 45 unit tests passed.", minsAgo: 60 },
      { user: sarahUser, content: "👏 Excellent work squad! I will draft the weekly progress demo update for Sarah at Acme.", minsAgo: 20 },
    ];

    for (const c of CHAT_LOGS) {
      const createdAt = new Date(Date.now() - 1000 * 60 * c.minsAgo);
      const existingMsg = await prisma.chatMessage.findFirst({
        where: { groupId: group.id, senderId: c.user.id, content: c.content },
      });

      if (!existingMsg) {
        const msg = await prisma.chatMessage.create({
          data: {
            groupId: group.id,
            senderId: c.user.id,
            content: c.content,
            createdAt,
          },
        });

        // Mark as read by PM
        await prisma.chatMessageRead.create({
          data: {
            chatMessageId: msg.id,
            userId: sarahUser.id,
            readAt: new Date(createdAt.getTime() + 1000 * 30),
          },
        });
      }
    }

    // 2. Official Messages & Approvals State Machine
    const messageContent1 =
      "Hello Sarah, We are pleased to share our Sprint 3 milestone update. The Next.js dashboard grid and Postgres multi-tenant schema are operational on the staging server for your team's review.";

    let message1 = await prisma.message.findFirst({
      where: { projectId: acmeProj.id, messageTypeId: clientUpdateTypeId, status: "Approved" },
    });

    if (!message1) {
      message1 = await prisma.message.create({
        data: {
          projectId: acmeProj.id,
          authorId: priyaUser.id,
          messageTypeId: clientUpdateTypeId,
          status: "Approved",
          currentContent: messageContent1,
          pointValue: 5,
        },
      });

      // Revision
      await prisma.messageRevision.create({
        data: {
          messageId: message1.id,
          content: messageContent1,
          editedBy: priyaUser.id,
        },
      });

      // Approval
      await prisma.messageApproval.create({
        data: {
          messageId: message1.id,
          approverId: sarahUser.id,
          decision: "Approved",
          notes: "Clear, concise, and professional. Approved for client dispatch.",
        },
      });
    }

    const messageContent2 =
      "Sprint 2 Authentication & Role-Based Permissions Subsystem is officially DELIVERED. Attached is the test validation report and API documentation link.";

    let message2 = await prisma.message.findFirst({
      where: { projectId: acmeProj.id, messageTypeId: deliveryNoticeTypeId, status: "Delivered" },
    });

    if (!message2) {
      message2 = await prisma.message.create({
        data: {
          projectId: acmeProj.id,
          authorId: alexUser.id,
          messageTypeId: deliveryNoticeTypeId,
          status: "Delivered",
          currentContent: messageContent2,
          pointValue: 8,
        },
      });

      await prisma.messageApproval.create({
        data: {
          messageId: message2.id,
          approverId: sarahUser.id,
          decision: "Delivered",
          notes: "Delivered on Upwork milestone #2.",
        },
      });
    }

    // 3. Shadow Inbox (PlatformThreadMessages)
    const threadLogs = [
      {
        direction: "Inbound" as const,
        content: "Hi Softvence team, we noticed the staging update. The dashboard speed is great! When will CSV export be available?",
        loggedBy: rachelUser.id,
        hoursAgo: 48,
        sourceMessageId: null,
      },
      {
        direction: "Outbound" as const,
        content: "Hi Sarah, thank you! The CSV & Excel export engine is scheduled for deployment on Wednesday along with the user role filter.",
        loggedBy: sarahUser.id,
        hoursAgo: 45,
        sourceMessageId: message1?.id || null,
      },
      {
        direction: "Inbound" as const,
        content: "Sounds wonderful! Looking forward to reviewing the export feature on Wednesday.",
        loggedBy: rachelUser.id,
        hoursAgo: 24,
        sourceMessageId: null,
      },
    ];

    for (const t of threadLogs) {
      const platformTimestamp = new Date(Date.now() - 1000 * 60 * 60 * t.hoursAgo);
      const existingThread = await prisma.platformThreadMessage.findFirst({
        where: { projectId: acmeProj.id, content: t.content },
      });

      if (!existingThread) {
        await prisma.platformThreadMessage.create({
          data: {
            projectId: acmeProj.id,
            profileId: acmeProj.profileId,
            direction: t.direction,
            sourceMessageId: t.sourceMessageId,
            content: t.content,
            loggedBy: t.loggedBy,
            platformTimestamp,
          },
        });
      }
    }
  }

  // 2. Chat group for FinTech Mobile
  if (finTechProj) {
    let mobileGroup = await prisma.projectGroup.findUnique({
      where: { projectId: finTechProj.id },
    });

    if (!mobileGroup) {
      mobileGroup = await prisma.projectGroup.create({
        data: {
          projectId: finTechProj.id,
          name: "FinTech Mobile Engineering",
        },
      });

      await prisma.chatMessage.create({
        data: {
          groupId: mobileGroup.id,
          senderId: marcusUser.id,
          content: "📲 iOS TestFlight Build v1.2.0 uploaded and distributed to internal testers.",
        },
      });

      await prisma.chatMessage.create({
        data: {
          groupId: mobileGroup.id,
          senderId: davidUser.id,
          content: "👍 Tested on iPhone 15 Pro, biometric FaceID login is smooth.",
        },
      });
    }
  }
}
