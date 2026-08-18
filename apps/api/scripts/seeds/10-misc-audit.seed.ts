import { AuditLogModel, connectMongo } from "@workspace/db";
import { env } from "../../src/env";
import { randomUUID } from "node:crypto";
import type { SeedContext } from "./types";

export async function seedMiscAndAudit(ctx: SeedContext): Promise<void> {
  const { prisma } = ctx;

  const acmeProj = ctx.projects.get("ORD-2026-001");
  const priyaUser = ctx.users.get("dev.priya@softvence.com")!;
  const alexUser = ctx.users.get("lead.alex@softvence.com")!;
  const sarahUser = ctx.users.get("pm.sarah@softvence.com")!;
  const superAdminUser = ctx.users.get("superadmin@softvence.com")!;

  const projAssignedNotifId = ctx.notificationTypes.get("PROJECT_ASSIGNED")!;
  const msgApprovalNotifId = ctx.notificationTypes.get("MESSAGE_APPROVAL_REQUIRED")!;

  // 1. Notifications
  if (acmeProj) {
    const existingNotif1 = await prisma.notification.findFirst({
      where: { recipientId: priyaUser.id, entityId: acmeProj.id },
    });

    if (!existingNotif1) {
      await prisma.notification.create({
        data: {
          recipientId: priyaUser.id,
          notificationTypeId: projAssignedNotifId,
          title: "Assigned to Project: Acme SaaS ERP Portal",
          body: "You were added to the Acme SaaS ERP engineering squad as Frontend Engineer.",
          entityType: "project",
          entityId: acmeProj.id,
          isRead: true,
        },
      });
    }

    const existingNotif2 = await prisma.notification.findFirst({
      where: { recipientId: sarahUser.id, notificationTypeId: msgApprovalNotifId },
    });

    if (!existingNotif2) {
      await prisma.notification.create({
        data: {
          recipientId: sarahUser.id,
          notificationTypeId: msgApprovalNotifId,
          title: "Message Approval Request",
          body: "Priya submitted a Sprint 3 client update message for Acme ERP for review.",
          entityType: "project",
          entityId: acmeProj.id,
          isRead: false,
        },
      });
    }
  }

  // 2. Attachments
  if (acmeProj) {
    const existingAttachment = await prisma.attachment.findFirst({
      where: { entityType: "project", entityId: acmeProj.id },
    });

    if (!existingAttachment) {
      await prisma.attachment.create({
        data: {
          entityType: "project",
          entityId: acmeProj.id,
          fileUrl: "https://storage.softvence.com/acme-erp/specs/architecture-diagram-v2.pdf",
          fileName: "Acme_SaaS_Architecture_v2.pdf",
          mimeType: "application/pdf",
          uploadedBy: alexUser.id,
        },
      });
    }
  }

  // 3. User Absence & Delegation
  const existingAbsence = await prisma.userAbsence.findFirst({
    where: { userId: alexUser.id },
  });

  if (!existingAbsence) {
    const startAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 10);
    const endAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);

    await prisma.userAbsence.create({
      data: {
        userId: alexUser.id,
        startAt,
        endAt,
        reason: "Annual Tech Conference & Workshop Speaker",
        coveredBy: sarahUser.id,
        createdBy: alexUser.id,
      },
    });

    await prisma.delegation.create({
      data: {
        delegatorId: alexUser.id,
        delegateeId: sarahUser.id,
        scope: "projects:write,messages:approve",
        validFrom: startAt,
        validUntil: endAt,
        createdBy: alexUser.id,
      },
    });
  }

  // 4. Temporary Permission Override
  if (acmeProj) {
    const projectWritePerm = await prisma.permission.findFirst({
      where: { code: "projects:write" },
    });

    if (projectWritePerm) {
      const existingOverride = await prisma.userPermissionOverride.findFirst({
        where: { userId: priyaUser.id, permissionId: projectWritePerm.id, projectId: acmeProj.id },
      });

      if (!existingOverride) {
        await prisma.userPermissionOverride.create({
          data: {
            userId: priyaUser.id,
            permissionId: projectWritePerm.id,
            projectId: acmeProj.id,
            isDeny: false,
            grantedBy: superAdminUser.id,
            reason: "Temporary deployment approval authority for Sprint 3 release",
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          },
        });
      }
    }
  }

  // 5. MongoDB Audit Log Seed
  try {
    if (env.MONGO_URI) {
      await connectMongo(env.MONGO_URI);
      const auditCount = await AuditLogModel.countDocuments();
      if (auditCount === 0) {
        await AuditLogModel.create({
          auditId: randomUUID(),
          module: "SeedEngine",
          action: "DUMMY_DATABASE_SEEDED",
          entityTable: "system",
          entityId: "system-seed-root",
          actor: {
            id: superAdminUser.id,
            email: superAdminUser.email,
            role: "SuperAdmin",
            ipAddress: "127.0.0.1",
            userAgent: "Bun/Seeder CLI",
          },
          status: "SUCCESS",
          metadata: {
            seededAt: new Date().toISOString(),
            environment: env.NODE_ENV,
          },
        });
      }
    }
  } catch (mongoErr) {
    console.warn("  ⚠ MongoDB audit log connection skipped or unavailable:", (mongoErr as Error).message);
  }
}
