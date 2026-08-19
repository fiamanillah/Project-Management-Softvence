import type { SeedContext } from "./types";

export async function seedOrganization(ctx: SeedContext): Promise<void> {
  const { prisma } = ctx;

  // 1. Branches (Betopia Group Multi-Branch Tree)
  const BRANCHES = [
    { code: "BET-HQ", name: "Betopia Group (Headquarters)", parentCode: null, description: "Holding enterprise parent headquarters" },
    { code: "BET-SA", name: "Softvence Alpha", parentCode: "BET-HQ", description: "Primary software & digital solutions flagship branch" },
    { code: "BET-SA-DHAKA", name: "Softvence Alpha - Dhaka R&D Hub", parentCode: "BET-SA", description: "Core engineering, product & AI innovation center" },
    { code: "BET-SA-SYLHET", name: "Softvence Alpha - Sylhet Tech Hub", parentCode: "BET-SA", description: "Operations, client onboarding & regional delivery" },
    { code: "BET-UK", name: "Betopia Overseas (London)", parentCode: "BET-HQ", description: "European sales & enterprise client partner branch" },
    { code: "BET-MEDIA", name: "Betopia Creative & Media Lab", parentCode: "BET-HQ", description: "Sister concern for branding, video & multimedia design" },
  ];

  for (const b of BRANCHES) {
    const parentId = b.parentCode ? ctx.branches.get(b.parentCode) || null : null;
    let record = await prisma.branch.findUnique({
      where: { code: b.code },
    });

    if (record) {
      record = await prisma.branch.update({
        where: { code: b.code },
        data: {
          name: b.name,
          parentId,
          description: b.description,
          isActive: true,
          deletedAt: null,
        },
      });
    } else {
      record = await prisma.branch.create({
        data: {
          code: b.code,
          name: b.name,
          parentId,
          description: b.description,
          isActive: true,
        },
      });
    }

    ctx.branches.set(b.code, record.id);
  }

  const hqBranchId = ctx.branches.get("BET-HQ")!;
  const saBranchId = ctx.branches.get("BET-SA")!;
  const dhakaBranchId = ctx.branches.get("BET-SA-DHAKA")!;

  // 2. Departments
  const DEPARTMENTS = [
    { code: "SYS", name: "System Administration", branchId: hqBranchId },
    { code: "ENG", name: "Software Engineering & Technology", branchId: dhakaBranchId },
    { code: "DES", name: "UI/UX & Product Design", branchId: dhakaBranchId },
    { code: "BD", name: "Business Development & Sales", branchId: saBranchId },
    { code: "QA", name: "Quality Assurance & Testing", branchId: dhakaBranchId },
    { code: "CS", name: "Client Success & Account Management", branchId: saBranchId },
  ];

  for (const dept of DEPARTMENTS) {
    let record = await prisma.department.findUnique({
      where: { code: dept.code },
    });

    if (record) {
      record = await prisma.department.update({
        where: { code: dept.code },
        data: { name: dept.name, branchId: dept.branchId, isActive: true, deletedAt: null },
      });
    } else {
      record = await prisma.department.create({
        data: { code: dept.code, name: dept.name, branchId: dept.branchId, isActive: true },
      });
    }

    ctx.departments.set(dept.code, record.id);
  }

  // 2. Teams
  const engDeptId = ctx.departments.get("ENG")!;
  const desDeptId = ctx.departments.get("DES")!;
  const bdDeptId = ctx.departments.get("BD")!;
  const qaDeptId = ctx.departments.get("QA")!;
  const csDeptId = ctx.departments.get("CS")!;

  const TEAMS = [
    { name: "Fullstack Web Team", slug: "web-team", shift: "General", departmentId: engDeptId },
    { name: "Mobile Innovations Team", slug: "mobile-team", shift: "General", departmentId: engDeptId },
    { name: "Cloud & AI Solutions Team", slug: "ai-cloud-team", shift: "General", departmentId: engDeptId },
    { name: "UI/UX & Product Design Team", slug: "design-team", shift: "General", departmentId: desDeptId },
    { name: "Enterprise Growth Team", slug: "bd-growth-team", shift: "Evening", departmentId: bdDeptId },
    { name: "Inbound Leads Team", slug: "bd-leads-team", shift: "Morning", departmentId: bdDeptId },
    { name: "QA & Automation Team", slug: "qa-team", shift: "General", departmentId: qaDeptId },
    { name: "Client Success & Accounts", slug: "client-success-team", shift: "Evening", departmentId: csDeptId },
  ];

  for (const team of TEAMS) {
    let record = await prisma.team.findUnique({
      where: { slug: team.slug },
    });

    if (record) {
      record = await prisma.team.update({
        where: { slug: team.slug },
        data: {
          name: team.name,
          shift: team.shift,
          departmentId: team.departmentId,
          isActive: true,
        },
      });
    } else {
      record = await prisma.team.create({
        data: {
          name: team.name,
          slug: team.slug,
          shift: team.shift,
          departmentId: team.departmentId,
          isActive: true,
        },
      });
    }

    ctx.teams.set(team.slug, record.id);
  }
}
