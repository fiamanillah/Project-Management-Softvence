import type { SeedContext } from "./types";

export async function seedClients(ctx: SeedContext): Promise<void> {
  const { prisma } = ctx;

  const upworkPlatId = ctx.platforms.get("UPWORK")!;
  const fiverrPlatId = ctx.platforms.get("FIVERR")!;
  const directPlatId = ctx.platforms.get("DIRECT")!;
  const freelancerPlatId = ctx.platforms.get("FREELANCER")!;

  const CLIENTS = [
    {
      name: "Acme Global Technologies",
      platformId: upworkPlatId,
      email: "sarah.j@acmetech.io",
      company: "Acme Corp (San Francisco, CA)",
      phone: "+1-415-555-0192",
      country: "United States",
      website: "https://acmetech.io",
      contactNotes: "Primary POC: Sarah Jenkins (VP Engineering). Tier-1 Enterprise client on Upwork Enterprise. Multi-phase SaaS ERP contract.",
    },
    {
      name: "FinTech NextGen Ltd",
      platformId: upworkPlatId,
      email: "liam.stewart@nextgenfin.co.uk",
      company: "NextGen Financials UK",
      phone: "+44-20-7946-0912",
      country: "United Kingdom",
      website: "https://nextgenfin.co.uk",
      contactNotes: "Open banking integration, biometric security, and merchant settlement mobile application.",
    },
    {
      name: "HealthPulse AI Corp",
      platformId: directPlatId,
      email: "dr.chen@healthpulse.ai",
      company: "HealthPulse Diagnostics Inc",
      phone: "+1-604-555-0144",
      country: "Canada",
      website: "https://healthpulse.ai",
      contactNotes: "Direct agency client. Telemedicine video portal with HIPAA compliance and AI real-time transcription.",
    },
    {
      name: "RetailCloud E-Commerce",
      platformId: fiverrPlatId,
      email: "contact@retailcloud.de",
      company: "RetailCloud Solutions GmbH",
      phone: "+49-30-123456",
      country: "Germany",
      website: "https://retailcloud.de",
      contactNotes: "Custom headless e-commerce store with Shopify, Stripe, and high-performance design system.",
    },
    {
      name: "EduStream Global Academy",
      platformId: freelancerPlatId,
      email: "support@edustream.org",
      company: "EduStream Foundation",
      phone: "+61-2-9876-5432",
      country: "Australia",
      website: "https://edustream.org",
      contactNotes: "Real-time interactive classroom portal with video streaming and collaborative canvas.",
    },
    {
      name: "Apex Fleet Logistics LLC",
      platformId: upworkPlatId,
      email: "operations@apexfleet.com",
      company: "Apex Global Logistics",
      phone: "+1-312-555-8821",
      country: "United States",
      website: "https://apexfleet.com",
      contactNotes: "Fleet telematics, GPS vehicle live tracking, route optimization, and maintenance dispatcher portal.",
    },
  ];

  for (const c of CLIENTS) {
    let record = await prisma.client.findFirst({
      where: { name: c.name },
    });

    if (record) {
      record = await prisma.client.update({
        where: { id: record.id },
        data: {
          platformId: c.platformId,
          email: c.email,
          company: c.company,
          phone: c.phone,
          country: c.country,
          website: c.website,
          contactNotes: c.contactNotes,
        },
      });
    } else {
      record = await prisma.client.create({
        data: {
          name: c.name,
          platformId: c.platformId,
          email: c.email,
          company: c.company,
          phone: c.phone,
          country: c.country,
          website: c.website,
          contactNotes: c.contactNotes,
        },
      });
    }

    ctx.clients.set(c.name, record.id);
  }
}
