import type { SeedContext } from "./types";

export async function seedOrganization(ctx: SeedContext): Promise<void> {
  const { prisma } = ctx;

  // 1. Departments
  const DEPARTMENTS = [
    { code: "SYS", name: "System Administration" },
    { code: "ENG", name: "Software Engineering & Technology" },
    { code: "DES", name: "UI/UX & Product Design" },
    { code: "BD", name: "Business Development & Sales" },
    { code: "QA", name: "Quality Assurance & Testing" },
    { code: "CS", name: "Client Success & Account Management" },
  ];

  for (const dept of DEPARTMENTS) {
    let record = await prisma.department.findUnique({
      where: { code: dept.code },
    });

    if (record) {
      record = await prisma.department.update({
        where: { code: dept.code },
        data: { name: dept.name, isActive: true },
      });
    } else {
      record = await prisma.department.create({
        data: { code: dept.code, name: dept.name, isActive: true },
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
