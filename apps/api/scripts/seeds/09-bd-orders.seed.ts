import type { SeedContext } from "./types";

export async function seedBdOrders(ctx: SeedContext): Promise<void> {
  const { prisma } = ctx;

  const rachelUser = ctx.users.get("bd.rachel@softvence.com")!;
  const kevinUser = ctx.users.get("bd.kevin@softvence.com")!;
  const alexUser = ctx.users.get("lead.alex@softvence.com")!;

  const growthTeamId = ctx.teams.get("bd-growth-team")!;
  const leadsTeamId = ctx.teams.get("bd-leads-team")!;

  const enterpriseRfpId = ctx.bdOrderTypes.get("ENTERPRISE_RFP")!;
  const upworkProposalId = ctx.bdOrderTypes.get("UPWORK_PROPOSAL")!;
  const fiverrGigId = ctx.bdOrderTypes.get("FIVERR_GIG")!;
  const directLeadId = ctx.bdOrderTypes.get("DIRECT_LEAD") || enterpriseRfpId;

  const upworkPlatId = ctx.platforms.get("UPWORK")!;
  const fiverrPlatId = ctx.platforms.get("FIVERR")!;
  const directPlatId = ctx.platforms.get("DIRECT")!;

  const inProgressStatusId = ctx.projectStatuses.get("IN_PROGRESS")!;
  const inReviewStatusId = ctx.projectStatuses.get("IN_REVIEW")!;
  const deliveredStatusId = ctx.projectStatuses.get("DELIVERED")!;

  const teamLeadRoleId = ctx.assignmentRoles.get("TEAM_LEAD")!;
  const srDevRoleId = ctx.assignmentRoles.get("SR_DEV")!;
  const memberRoleId = ctx.assignmentRoles.get("MEMBER")!;

  const BD_ORDERS_DATA = [
    {
      title: "Enterprise Telehealth Video Platform RFP ($120k USD)",
      orderTypeId: enterpriseRfpId,
      platformId: directPlatId,
      teamId: growthTeamId,
      statusId: inProgressStatusId,
      description: "Comprehensive technical architecture RFP proposal submitted for Series-A digital health startup.",
      targetUrl: "https://rfp-portal.example.com/invitation/9921",
      createdBy: rachelUser.id,
      assignments: [
        { userId: rachelUser.id, roleId: teamLeadRoleId, note: "Proposal Lead" },
        { userId: alexUser.id, roleId: srDevRoleId, note: "Technical Solutions Architect" },
      ],
    },
    {
      title: "React Native Crypto Portfolio Tracker Proposal ($35k USD)",
      orderTypeId: upworkProposalId,
      platformId: upworkPlatId,
      teamId: growthTeamId,
      statusId: inReviewStatusId,
      description: "Direct client invite proposal with interactive Figma demo and technical milestone roadmap.",
      targetUrl: "https://www.upwork.com/jobs/~01abcde12345",
      createdBy: kevinUser.id,
      assignments: [
        { userId: kevinUser.id, roleId: memberRoleId, note: "Lead Bidder" },
      ],
    },
    {
      title: "Fiverr Pro Headless Storefront Sprint Offer ($15k USD)",
      orderTypeId: fiverrGigId,
      platformId: fiverrPlatId,
      teamId: leadsTeamId,
      statusId: deliveredStatusId,
      description: "Custom milestone contract converted to active production sprint.",
      targetUrl: "https://www.fiverr.com/conversations/inbox_99",
      createdBy: kevinUser.id,
      assignments: [
        { userId: kevinUser.id, roleId: memberRoleId, note: "Account Manager" },
      ],
    },
    {
      title: "IoT Fleet Logistics Vehicle Telematics Inquiry ($80k USD)",
      orderTypeId: directLeadId,
      platformId: directPlatId,
      teamId: growthTeamId,
      statusId: inProgressStatusId,
      description: "Inbound discovery query for 500+ commercial truck fleet telematics tracking portal.",
      targetUrl: "https://hubspot.softvence.com/deals/88219",
      createdBy: rachelUser.id,
      assignments: [
        { userId: rachelUser.id, roleId: teamLeadRoleId, note: "Closer" },
        { userId: alexUser.id, roleId: srDevRoleId, note: "Systems Architect" },
      ],
    },
  ];

  for (const bo of BD_ORDERS_DATA) {
    let record = await prisma.bdOrder.findFirst({
      where: { title: bo.title, createdBy: bo.createdBy },
    });

    if (record) {
      record = await prisma.bdOrder.update({
        where: { id: record.id },
        data: {
          orderTypeId: bo.orderTypeId,
          platformId: bo.platformId,
          teamId: bo.teamId,
          statusId: bo.statusId,
          description: bo.description,
          targetUrl: bo.targetUrl,
        },
      });
    } else {
      record = await prisma.bdOrder.create({
        data: {
          title: bo.title,
          orderTypeId: bo.orderTypeId,
          platformId: bo.platformId,
          teamId: bo.teamId,
          statusId: bo.statusId,
          description: bo.description,
          targetUrl: bo.targetUrl,
          createdBy: bo.createdBy,
        },
      });
    }

    for (const a of bo.assignments) {
      const existingAssignment = await prisma.bdOrderAssignment.findFirst({
        where: { bdOrderId: record.id, userId: a.userId, unassignedAt: null },
      });

      if (!existingAssignment) {
        await prisma.bdOrderAssignment.create({
          data: {
            bdOrderId: record.id,
            userId: a.userId,
            roleId: a.roleId,
            note: a.note,
          },
        });
      }
    }
  }
}
