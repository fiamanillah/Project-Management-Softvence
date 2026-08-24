import { PermissionRegistry } from "../../src/core/permissions/PermissionRegistry";
import type { SeedContext } from "./types";

export async function seedRolesAndDesignations(ctx: SeedContext): Promise<void> {
  const { prisma } = ctx;

  // 1. Sync Permission Registry against declared manifests
  const registry = PermissionRegistry.getInstance();
  await registry.sync(prisma);

  // 2. Roles
  const sysDeptId = ctx.departments.get("SYS")!;
  const engDeptId = ctx.departments.get("ENG")!;
  const desDeptId = ctx.departments.get("DES")!;
  const bdDeptId = ctx.departments.get("BD")!;
  const qaDeptId = ctx.departments.get("QA")!;
  const csDeptId = ctx.departments.get("CS")!;

  const ROLES = [
    { code: "SUPER_ADMIN", name: "Super Administrator", description: "Unrestricted platform administrator", departmentId: sysDeptId, hierarchyLevel: 1, isLeadership: true },
    { code: "ENG_DIRECTOR", name: "Engineering Director", description: "Technical executive over engineering", departmentId: engDeptId, hierarchyLevel: 2, isLeadership: true },
    { code: "PROJECT_MANAGER", name: "Project Manager", description: "Manages projects, milestones and schedules", departmentId: engDeptId, hierarchyLevel: 3, isLeadership: true },
    { code: "TECH_LEAD", name: "Technical Lead", description: "Leads development squad and technical delivery", departmentId: engDeptId, hierarchyLevel: 4, isLeadership: true },
    { code: "SR_DEVELOPER", name: "Senior Developer", description: "Senior software engineer", departmentId: engDeptId, hierarchyLevel: 5, isLeadership: false },
    { code: "DEVELOPER", name: "Software Developer", description: "Core software engineer", departmentId: engDeptId, hierarchyLevel: 6, isLeadership: false },
    { code: "LEAD_DESIGNER", name: "Design Lead", description: "Leads UI/UX and product design", departmentId: desDeptId, hierarchyLevel: 4, isLeadership: true },
    { code: "DESIGNER", name: "Product Designer", description: "UI/UX and visual designer", departmentId: desDeptId, hierarchyLevel: 5, isLeadership: false },
    { code: "QA_LEAD", name: "QA Lead", description: "Leads quality assurance & test suites", departmentId: qaDeptId, hierarchyLevel: 4, isLeadership: true },
    { code: "QA_ENGINEER", name: "QA Engineer", description: "Quality assurance test engineer", departmentId: qaDeptId, hierarchyLevel: 5, isLeadership: false },
    { code: "BD_MANAGER", name: "BD Manager", description: "Leads client acquisition & bidding", departmentId: bdDeptId, hierarchyLevel: 3, isLeadership: true },
    { code: "BD_EXECUTIVE", name: "BD Executive", description: "Client outreach and proposal specialist", departmentId: bdDeptId, hierarchyLevel: 5, isLeadership: false },
    { code: "SUPPORT_SPECIALIST", name: "Support Specialist", description: "Client relations and customer success", departmentId: csDeptId, hierarchyLevel: 5, isLeadership: false },
  ];

  for (const role of ROLES) {
    let record = await prisma.role.findUnique({
      where: { code: role.code },
    });

    if (record) {
      record = await prisma.role.update({
        where: { code: role.code },
        data: {
          name: role.name,
          description: role.description,
          departmentId: role.departmentId,
          hierarchyLevel: role.hierarchyLevel,
          isLeadership: role.isLeadership,
          isActive: true,
        },
      });
    } else {
      record = await prisma.role.create({
        data: {
          code: role.code,
          name: role.name,
          description: role.description,
          departmentId: role.departmentId,
          hierarchyLevel: role.hierarchyLevel,
          isLeadership: role.isLeadership,
          isActive: true,
        },
      });
    }

    ctx.roles.set(role.code, record.id);
  }

  // 3. Designations (HR Job Titles)
  const DESIGNATIONS = [
    { code: "SUPER_ADMIN", name: "Super Administrator", departmentId: sysDeptId, hierarchyLevel: 1, isLeadership: true },
    { code: "ENG_DIRECTOR", name: "Director of Engineering", departmentId: engDeptId, hierarchyLevel: 2, isLeadership: true },
    { code: "PROJECT_MANAGER", name: "Technical Project Manager", departmentId: engDeptId, hierarchyLevel: 3, isLeadership: true },
    { code: "TECH_LEAD", name: "Engineering Team Lead", departmentId: engDeptId, hierarchyLevel: 4, isLeadership: true },
    { code: "SR_DEVELOPER", name: "Senior Fullstack Engineer", departmentId: engDeptId, hierarchyLevel: 5, isLeadership: false },
    { code: "DEVELOPER", name: "Fullstack Software Engineer", departmentId: engDeptId, hierarchyLevel: 6, isLeadership: false },
    { code: "LEAD_DESIGNER", name: "Lead Product Designer", departmentId: desDeptId, hierarchyLevel: 4, isLeadership: true },
    { code: "DESIGNER", name: "UI/UX Product Designer", departmentId: desDeptId, hierarchyLevel: 5, isLeadership: false },
    { code: "QA_LEAD", name: "QA Automation Lead", departmentId: qaDeptId, hierarchyLevel: 4, isLeadership: true },
    { code: "QA_ENGINEER", name: "QA Automation Engineer", departmentId: qaDeptId, hierarchyLevel: 5, isLeadership: false },
    { code: "BD_MANAGER", name: "Business Development Manager", departmentId: bdDeptId, hierarchyLevel: 3, isLeadership: true },
    { code: "BD_EXECUTIVE", name: "BD Executive & Bidder", departmentId: bdDeptId, hierarchyLevel: 5, isLeadership: false },
    { code: "SUPPORT_SPECIALIST", name: "Client Relations Specialist", departmentId: csDeptId, hierarchyLevel: 5, isLeadership: false },
  ];

  for (const desig of DESIGNATIONS) {
    let record = await prisma.designation.findUnique({
      where: { code: desig.code },
    });

    if (record) {
      record = await prisma.designation.update({
        where: { code: desig.code },
        data: {
          name: desig.name,
          departmentId: desig.departmentId,
          hierarchyLevel: desig.hierarchyLevel,
          isLeadership: desig.isLeadership,
          isActive: true,
        },
      });
    } else {
      record = await prisma.designation.create({
        data: {
          code: desig.code,
          name: desig.name,
          departmentId: desig.departmentId,
          hierarchyLevel: desig.hierarchyLevel,
          isLeadership: desig.isLeadership,
          isActive: true,
        },
      });
    }

    ctx.designations.set(desig.code, record.id);
  }
}
