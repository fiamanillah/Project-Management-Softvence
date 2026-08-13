import { AuditLogModel, connectMongo } from "@workspace/db";
import { env } from "../src/env";
import { randomUUID } from "node:crypto";

async function seedAuditLogs() {
  console.log("🌱 Connecting to MongoDB to seed audit log events...");
  await connectMongo(env.MONGO_URI);

  const existingCount = await AuditLogModel.countDocuments();
  console.log(`Current audit logs count: ${existingCount}`);

  if (existingCount >= 25) {
    console.log("✅ Audit log collection already has sufficient entries (>= 25). Skipping seed.");
    process.exit(0);
  }

  const sampleLogs = [
    {
      auditId: randomUUID(),
      module: "Auth",
      action: "USER_LOGIN_SUCCESS",
      entityTable: "users",
      entityId: "1a7359dd-9c94-4cd8-8c46-45ef113c8908",
      actor: {
        id: "1a7359dd-9c94-4cd8-8c46-45ef113c8908",
        email: "superadmin@softvence.com",
        role: "SuperAdmin",
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/127.0.0.0 Safari/537.36",
      },
      httpContext: {
        method: "POST",
        path: "/api/v1/auth/login",
        statusCode: 200,
        durationMs: 145,
        requestId: randomUUID(),
      },
      status: "SUCCESS",
      createdAt: new Date(Date.now() - 1000 * 60 * 10), // 10 mins ago
    },
    {
      auditId: randomUUID(),
      module: "Auth",
      action: "SUPER_ADMIN_BOOTSTRAP",
      entityTable: "users",
      entityId: "1a7359dd-9c94-4cd8-8c46-45ef113c8908",
      actor: {
        id: "1a7359dd-9c94-4cd8-8c46-45ef113c8908",
        email: "superadmin@softvence.com",
        role: "SuperAdmin",
        ipAddress: "127.0.0.1",
        userAgent: "Bun/1.3.14 CLI",
      },
      changes: {
        before: null,
        after: { email: "superadmin@softvence.com", role: "SuperAdmin", isSuperAdmin: true },
        diff: { created: true },
      },
      metadata: { source: "CLI_BOOTSTRAP", permissionsSynced: 10 },
      status: "SUCCESS",
      createdAt: new Date(Date.now() - 1000 * 60 * 45), // 45 mins ago
    },
    {
      auditId: randomUUID(),
      module: "Authorization",
      action: "PERMISSION_DENIED",
      entityTable: "projects",
      entityId: "prj-secret-999",
      actor: {
        id: "usr-staff-002",
        email: "alex.dev@softvence.com",
        role: "Staff",
        ipAddress: "203.0.113.45",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/128.0",
      },
      httpContext: {
        method: "DELETE",
        path: "/api/v1/projects/prj-secret-999",
        statusCode: 403,
        durationMs: 32,
        requestId: randomUUID(),
      },
      status: "FAILED",
      errorMessage: "Access Denied: Missing 'projects:delete' permission scope",
      metadata: { requiredPermission: "projects:delete", userScopes: ["projects:read"] },
      createdAt: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
    },
    {
      auditId: randomUUID(),
      module: "Admin",
      action: "USER_ROLE_UPDATED",
      entityTable: "users",
      entityId: "usr-staff-003",
      actor: {
        id: "1a7359dd-9c94-4cd8-8c46-45ef113c8908",
        email: "superadmin@softvence.com",
        role: "SuperAdmin",
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      },
      changes: {
        before: { id: "usr-staff-003", email: "sarah.lead@softvence.com", designation: "Staff Developer" },
        after: { id: "usr-staff-003", email: "sarah.lead@softvence.com", designation: "Project Manager" },
        diff: { designation: { from: "Staff Developer", to: "Project Manager" } },
      },
      status: "SUCCESS",
      createdAt: new Date(Date.now() - 1000 * 60 * 300), // 5 hours ago
    },
    {
      auditId: randomUUID(),
      module: "Projects",
      action: "PROJECT_CREATED",
      entityTable: "projects",
      entityId: "prj-alpha-001",
      actor: {
        id: "usr-pm-001",
        email: "sarah.lead@softvence.com",
        role: "Admin",
        ipAddress: "198.51.100.12",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      },
      changes: {
        before: null,
        after: { title: "Softvence ERP Portal", status: "ACTIVE", budget: 45000 },
        diff: { title: "Softvence ERP Portal" },
      },
      status: "SUCCESS",
      createdAt: new Date(Date.now() - 1000 * 60 * 600), // 10 hours ago
    },
    {
      auditId: randomUUID(),
      module: "Auth",
      action: "FAILED_LOGIN_ATTEMPT",
      entityTable: "users",
      entityId: "unknown-account",
      actor: {
        email: "hacker@unknown.org",
        ipAddress: "185.220.101.5",
        userAgent: "python-requests/2.31.0",
      },
      httpContext: {
        method: "POST",
        path: "/api/v1/auth/login",
        statusCode: 401,
        durationMs: 280,
        requestId: randomUUID(),
      },
      status: "FAILED",
      errorMessage: "Invalid credentials for account hacker@unknown.org",
      metadata: { attemptCount: 3, flag: "SUSPICIOUS_IP" },
      createdAt: new Date(Date.now() - 1000 * 60 * 1400), // 23 hours ago
    },
    {
      auditId: randomUUID(),
      module: "Authorization",
      action: "PERMISSION_OVERRIDE_GRANTED",
      entityTable: "user_permission_overrides",
      entityId: "ovr-88231",
      actor: {
        id: "1a7359dd-9c94-4cd8-8c46-45ef113c8908",
        email: "superadmin@softvence.com",
        role: "SuperAdmin",
        ipAddress: "192.168.1.100",
      },
      changes: {
        before: { isAllowed: false },
        after: { isAllowed: true, reason: "Emergency release approval", scope: "billing:write" },
        diff: { isAllowed: { from: false, to: true } },
      },
      status: "SUCCESS",
      createdAt: new Date(Date.now() - 1000 * 60 * 2000), // 33 hours ago
    },
    {
      auditId: randomUUID(),
      module: "BdOrders",
      action: "BD_ORDER_STATUS_CHANGED",
      entityTable: "bd_orders",
      entityId: "order-9941",
      actor: {
        id: "usr-bd-01",
        email: "sales.lead@softvence.com",
        role: "Staff",
        ipAddress: "10.0.0.50",
      },
      changes: {
        before: { status: "PENDING_REVIEW", totalValue: 12000 },
        after: { status: "APPROVED", totalValue: 12000 },
        diff: { status: { from: "PENDING_REVIEW", to: "APPROVED" } },
      },
      status: "SUCCESS",
      createdAt: new Date(Date.now() - 1000 * 60 * 3500), // 2.4 days ago
    },
  ];

  // Generate 20 additional historical logs to demonstrate multi-page pagination
  for (let i = 1; i <= 20; i++) {
    const isSuccess = i % 4 !== 0;
    const modules = ["Auth", "Admin", "Projects", "Authorization", "Billing"];
    const mod = modules[i % modules.length];
    sampleLogs.push({
      auditId: randomUUID(),
      module: mod,
      action: `${mod.toUpperCase()}_HISTORICAL_EVENT_${i}`,
      entityTable: `${mod.toLowerCase()}_table`,
      entityId: `ent-id-${1000 + i}`,
      actor: {
        id: `usr-hist-${i}`,
        email: `staff${i}@softvence.com`,
        role: i % 3 === 0 ? "Admin" : "Staff",
        ipAddress: `192.168.1.${10 + i}`,
        userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0.0.0",
      },
      httpContext: {
        method: i % 2 === 0 ? "POST" : "GET",
        path: `/api/v1/${mod.toLowerCase()}/${1000 + i}`,
        statusCode: isSuccess ? 200 : 403,
        durationMs: 20 + i * 5,
        requestId: randomUUID(),
      },
      changes: {
        before: { version: i },
        after: { version: i + 1 },
        diff: { version: { from: i, to: i + 1 } },
      },
      status: isSuccess ? "SUCCESS" : "FAILED",
      errorMessage: isSuccess ? undefined : `Error processing event #${i}: Policy restriction`,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * (i * 3 + 5)),
    });
  }

  await AuditLogModel.insertMany(sampleLogs);
  console.log(`✅ Successfully seeded ${sampleLogs.length} audit logs into MongoDB!`);
  process.exit(0);
}

seedAuditLogs().catch((err) => {
  console.error("❌ Failed to seed audit logs:", err);
  process.exit(1);
});
