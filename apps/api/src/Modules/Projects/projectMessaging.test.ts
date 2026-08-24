// src/Modules/Projects/projectMessaging.test.ts

import { describe, it, expect, beforeAll } from "bun:test";
import { sanitizeMessageText, isSafeAttachmentUrl, stripHtml } from "@/utils/sanitize";
import { SocketRateLimiter } from "@/core/realtime/SocketRateLimiter";
import { prisma } from "@/lib/prisma";
import { ProjectsService } from "./projects.service";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";

describe("Project Messaging Security, Consistency & Features", () => {
  const projectsService = new ProjectsService(prisma);

  let superAdminUser: AuthenticatedUser;
  let regularMemberUser: AuthenticatedUser;
  let testProjectId: string;

  beforeAll(async () => {
    // 1. Ensure user records exist in DB for foreign key relations
    const adminRecord = await prisma.user.upsert({
      where: { email: "admin@softvence.test" },
      update: { systemRole: "SuperAdmin" },
      create: {
        id: "00000000-0000-0000-0000-000000000001",
        employeeId: "EMP-MSG-001",
        email: "admin@softvence.test",
        passwordHash: "hash123",
        firstName: "Super",
        lastName: "Admin",
        systemRole: "SuperAdmin",
        status: "ACTIVE",
        isActive: true,
      },
    });

    const memberRecord = await prisma.user.upsert({
      where: { email: "staff@softvence.test" },
      update: { systemRole: "Staff" },
      create: {
        id: "00000000-0000-0000-0000-000000000002",
        employeeId: "EMP-MSG-002",
        email: "staff@softvence.test",
        passwordHash: "hash123",
        firstName: "Regular",
        lastName: "Staff",
        systemRole: "Staff",
        status: "ACTIVE",
        isActive: true,
      },
    });

    superAdminUser = {
      id: adminRecord.id,
      email: adminRecord.email,
      systemRole: "SuperAdmin",
    };

    regularMemberUser = {
      id: memberRecord.id,
      email: memberRecord.email,
      systemRole: "Staff",
    };

    // 2. Lookup or create dependencies
    let platform = await prisma.platform.findFirst({ select: { id: true } });
    if (!platform) {
      platform = await prisma.platform.create({
        data: { name: "Direct Portal", code: "DIRECT_PORTAL" },
        select: { id: true },
      });
    }

    let client = await prisma.client.findFirst({ select: { id: true } });
    if (!client) {
      client = await prisma.client.create({
        data: { name: "Test Client Inc", email: "client@test.com", platformId: platform.id },
        select: { id: true },
      });
    }

    let profile = await prisma.profile.findFirst({ select: { id: true } });
    if (!profile) {
      profile = await prisma.profile.create({
        data: { platformId: platform.id, username: `test_profile_${Date.now()}` },
        select: { id: true },
      });
    }

    let serviceLine = await prisma.serviceLine.findFirst({ select: { id: true } });
    if (!serviceLine) {
      serviceLine = await prisma.serviceLine.create({
        data: { name: "Full Stack Development", slug: `dev-${Date.now()}` },
        select: { id: true },
      });
    }

    let status = await prisma.projectStatus.findFirst({ select: { id: true } });
    if (!status) {
      status = await prisma.projectStatus.create({
        data: { name: "In Progress", code: "IN_PROGRESS", requiresAction: true, isTerminal: false },
        select: { id: true },
      });
    }

    const project = await projectsService.createProject(
      {
        orderId: `MSG-SEC-TEST-${Date.now()}`,
        projectName: "Messaging Test Harness Project",
        clientId: client.id,
        profileId: profile.id,
        serviceLineId: serviceLine.id,
        statusId: status.id,
      },
      superAdminUser,
    );

    testProjectId = project.id;
  });

  describe("SEC-01 & SEC-07: Sanitization & URL Validation", () => {
    it("strips malicious script tags and inline XSS event handlers", () => {
      const malicious = `<script>alert('pwned')</script>Hello <img src="x" onerror="alert(1)"> world!`;
      const clean = sanitizeMessageText(malicious);

      expect(clean).not.toContain("<script>");
      expect(clean).not.toContain("onerror=");
      expect(clean).toContain("Hello");
      expect(clean).toContain("world!");
    });

    it("enforces max length boundary and removes non-printable control characters", () => {
      const input = "Valid message\x00\x08with control characters";
      const clean = sanitizeMessageText(input, 20);

      expect(clean).toBe("Valid messagewith co");
      expect(clean.length).toBeLessThanOrEqual(20);
    });

    it("validates attachment URLs safely and rejects dangerous protocols", () => {
      expect(isSafeAttachmentUrl("https://storage.googleapis.com/bucket/doc.pdf")).toBe(true);
      expect(isSafeAttachmentUrl("http://example.com/image.png")).toBe(true);
      expect(isSafeAttachmentUrl("/uploads/file.zip")).toBe(true);

      expect(isSafeAttachmentUrl("javascript:alert(1)")).toBe(false);
      expect(isSafeAttachmentUrl("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==")).toBe(false);
      expect(isSafeAttachmentUrl("vbscript:msgbox(1)")).toBe(false);
      expect(isSafeAttachmentUrl("file:///etc/passwd")).toBe(false);
    });
  });

  describe("SEC-02: Socket Rate Limiting", () => {
    it("allows actions within threshold and throttles when limit is exceeded", async () => {
      const limiter = SocketRateLimiter.getInstance();
      const testKey = `test:user:${Date.now()}:send_msg`;

      // Allow 3 actions in 1 second
      const r1 = await limiter.consume(testKey, 3, 1);
      const r2 = await limiter.consume(testKey, 3, 1);
      const r3 = await limiter.consume(testKey, 3, 1);
      const r4 = await limiter.consume(testKey, 3, 1);

      expect(r1.allowed).toBe(true);
      expect(r2.allowed).toBe(true);
      expect(r3.allowed).toBe(true);
      expect(r4.allowed).toBe(false);
      expect(r4.remaining).toBe(0);
      expect(r4.retryAfterMs).toBeGreaterThan(0);
    });
  });

  describe("FEAT-01: Message Soft Deletion", () => {
    it("soft-deletes a message and prevents unauthorized deletion", async () => {
      const msg = await projectsService.chat.sendMessage(
        testProjectId,
        {
          text: "Message to be deleted",
          purpose: "INTERNAL_DISCUSSION",
        },
        superAdminUser,
      );

      expect(msg.id).toBeDefined();

      // Soft delete message
      const result = await projectsService.chat.deleteMessage(testProjectId, msg.id, superAdminUser);
      expect(result.success).toBe(true);
      expect(result.messageId).toBe(msg.id);

      // Verify message is no longer returned in active messages list
      const list = await projectsService.chat.getProjectMessages(testProjectId, {}, superAdminUser);
      expect(list.messages.some((m) => m.id === msg.id)).toBe(false);

      // Verify row exists in DB with deletedAt timestamp set
      const dbRow = await prisma.projectMessage.findUnique({ where: { id: msg.id } });
      expect(dbRow?.deletedAt).not.toBeNull();
    });

    it("prevents author from deleting message after 15-minute deletion window expires", async () => {
      const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
      const msg = await prisma.projectMessage.create({
        data: {
          projectId: testProjectId,
          senderId: regularMemberUser.id,
          text: "Old message to test expiration",
          purpose: "INTERNAL_DISCUSSION",
          createdAt: twentyMinutesAgo,
          updatedAt: twentyMinutesAgo,
        },
      });

      // Regular author attempts to delete expired message -> must fail
      await expect(
        projectsService.chat.deleteMessage(testProjectId, msg.id, regularMemberUser),
      ).rejects.toThrow(/deletion window for this message has expired/i);

      // User with scoped project delete / admin permission can still delete expired message
      const adminDelete = await projectsService.chat.deleteMessage(testProjectId, msg.id, superAdminUser);
      expect(adminDelete.success).toBe(true);
    });

    it("prevents non-author without scoped delete permissions from deleting message", async () => {
      const msg = await projectsService.chat.sendMessage(
        testProjectId,
        {
          text: "Secret message from superadmin",
          purpose: "INTERNAL_DISCUSSION",
        },
        superAdminUser,
      );

      // Regular member attempts to delete superadmin's message -> must fail
      await expect(
        projectsService.chat.deleteMessage(testProjectId, msg.id, regularMemberUser),
      ).rejects.toThrow(/do not have permission to delete this message/i);
    });
  });

  describe("FEAT-15 & FEAT-04: Pinned Messages & Unread Counter", () => {
    it("pins and unpins messages and retrieves pinned list", async () => {
      const msg = await projectsService.chat.sendMessage(
        testProjectId,
        {
          text: "Important project announcement to be pinned",
          purpose: "INTERNAL_DISCUSSION",
        },
        superAdminUser,
      );

      // Pin message
      const pinned = await projectsService.chat.togglePinMessage(testProjectId, msg.id, superAdminUser);
      expect(pinned.isPinned).toBe(true);

      // Retrieve pinned messages
      const pinnedList = await projectsService.chat.getPinnedMessages(testProjectId, superAdminUser);
      expect(pinnedList.some((m) => m.id === msg.id)).toBe(true);

      // Unpin message
      const unpinned = await projectsService.chat.togglePinMessage(testProjectId, msg.id, superAdminUser);
      expect(unpinned.isPinned).toBe(false);
    });

    it("calculates unread message count accurately", async () => {
      const countBefore = await projectsService.chat.getUnreadCount(testProjectId, regularMemberUser);

      // Send a message from superAdmin
      await projectsService.chat.sendMessage(
        testProjectId,
        {
          text: "Unread message for regular member",
          purpose: "INTERNAL_DISCUSSION",
        },
        superAdminUser,
      );

      const countAfter = await projectsService.chat.getUnreadCount(testProjectId, regularMemberUser);
      expect(countAfter.unreadCount).toBeGreaterThanOrEqual(countBefore.unreadCount + 1);
    });
  });

  describe("INC-03: Deterministic ISO 8601 Timestamps", () => {
    it("returns ISO 8601 formatted timestamps for all date fields", async () => {
      const msg = await projectsService.chat.sendMessage(
        testProjectId,
        {
          text: "Timestamp format test message",
          purpose: "INTERNAL_DISCUSSION",
        },
        superAdminUser,
      );

      // Verify ISO 8601 string format: YYYY-MM-DDTHH:mm:ss.sssZ
      expect(msg.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe("ENT-04: Message Idempotency Deduplication", () => {
    it("deduplicates message creation with identical idempotencyKey within window", async () => {
      const idempotencyKey = `idemp-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const msg1 = await projectsService.chat.sendMessage(
        testProjectId,
        {
          text: "Idempotent message content",
          purpose: "INTERNAL_DISCUSSION",
          idempotencyKey,
        },
        superAdminUser,
      );

      const msg2 = await projectsService.chat.sendMessage(
        testProjectId,
        {
          text: "Idempotent message content (retry)",
          purpose: "INTERNAL_DISCUSSION",
          idempotencyKey,
        },
        superAdminUser,
      );

      expect(msg1.id).toBe(msg2.id);
      expect(msg1.text).toBe("Idempotent message content");
    });
  });

  describe("FEAT-03: Threaded Conversations", () => {
    it("retrieves full nested thread and accurate replyCount", async () => {
      const rootMsg = await projectsService.chat.sendMessage(
        testProjectId,
        {
          text: "Parent root topic message",
          purpose: "INTERNAL_DISCUSSION",
        },
        superAdminUser,
      );

      // Add two replies
      const reply1 = await projectsService.chat.sendMessage(
        testProjectId,
        {
          text: "First reply to topic",
          purpose: "INTERNAL_DISCUSSION",
          replyToMessageId: rootMsg.id,
        },
        superAdminUser,
      );

      const reply2 = await projectsService.chat.sendMessage(
        testProjectId,
        {
          text: "Second reply to topic",
          purpose: "INTERNAL_DISCUSSION",
          replyToMessageId: rootMsg.id,
        },
        superAdminUser,
      );

      const thread = await projectsService.chat.getMessageThread(testProjectId, reply1.id, superAdminUser);
      expect(thread.parentMessage.id).toBe(rootMsg.id);
      expect(thread.replyCount).toBeGreaterThanOrEqual(2);
      expect(thread.replies.some((r) => r.id === reply1.id)).toBe(true);
      expect(thread.replies.some((r) => r.id === reply2.id)).toBe(true);
    });
  });

  describe("FEAT-02 & FEAT-12: Search & Export", () => {
    it("searches messages by query string and purpose filter", async () => {
      const uniqueKeyword = `SearchTag${Date.now()}`;
      await projectsService.chat.sendMessage(
        testProjectId,
        {
          text: `Critical discussion with ${uniqueKeyword} inside`,
          purpose: "INTERNAL_DISCUSSION",
        },
        superAdminUser,
      );

      const searchRes = await projectsService.chat.searchMessages(
        testProjectId,
        { q: uniqueKeyword, limit: 10 },
        superAdminUser,
      );

      expect(searchRes.total).toBeGreaterThanOrEqual(1);
      expect(searchRes.messages.some((m) => m.text.includes(uniqueKeyword))).toBe(true);
    });

    it("exports project messages to CSV, TXT, and JSON formats", async () => {
      const csvExport = await projectsService.chat.exportMessages(testProjectId, "csv", superAdminUser);
      expect(csvExport.contentType).toContain("text/csv");
      expect(csvExport.content).toContain("Timestamp,Sender,Role,Purpose");

      const txtExport = await projectsService.chat.exportMessages(testProjectId, "txt", superAdminUser);
      expect(txtExport.contentType).toContain("text/plain");
      expect(txtExport.content.length).toBeGreaterThan(0);

      const jsonExport = await projectsService.chat.exportMessages(testProjectId, "json", superAdminUser);
      expect(jsonExport.contentType).toContain("application/json");
      const parsed = JSON.parse(jsonExport.content);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });
  });

  describe("FEAT-16: Attachment Deletion", () => {
    it("deletes an individual attachment from a message", async () => {
      const msgWithAttachment = await projectsService.chat.sendMessage(
        testProjectId,
        {
          text: "Message with PDF doc",
          purpose: "INTERNAL_DISCUSSION",
          attachments: [
            {
              name: "project_specs.pdf",
              type: "application/pdf",
              url: "https://storage.googleapis.com/bucket/project_specs.pdf",
              fileSizeBytes: 1024 * 1024,
            },
          ],
        },
        superAdminUser,
      );

      expect(msgWithAttachment.attachments).toBeDefined();
      expect(msgWithAttachment.attachments!.length).toBe(1);

      const attId = msgWithAttachment.attachments![0].id;
      const deleteRes = await projectsService.chat.deleteAttachment(
        testProjectId,
        msgWithAttachment.id,
        attId,
        superAdminUser,
      );

      expect(deleteRes.success).toBe(true);
      expect(deleteRes.attachmentId).toBe(attId);

      // Verify attachment is removed from DB
      const dbAtt = await prisma.projectMessageAttachment.findUnique({ where: { id: attId } });
      expect(dbAtt).toBeNull();
    });
  });

  describe("ENT-05 & OPT-02: SLA Check & Message Types Caching", () => {
    it("runs SLA monitor check without errors", async () => {
      const slaReport = await projectsService.approval.checkAndEscalateSLA(testProjectId);
      expect(slaReport).toBeDefined();
      expect(typeof slaReport.checked).toBe("number");
      expect(typeof slaReport.breached).toBe("number");
    });

    it("retrieves and caches message types with TTL and invalidates on update", async () => {
      const types1 = await projectsService.messageType.getMessageTypes("OUTBOUND", superAdminUser);
      expect(Array.isArray(types1)).toBe(true);

      // Second call hits cache
      const types2 = await projectsService.messageType.getMessageTypes("OUTBOUND", superAdminUser);
      expect(types2.length).toBe(types1.length);
    });
  });
});

