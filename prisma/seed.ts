import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import {
  AuditActorType,
  ChangeOrderStatus,
  DecisionType,
  MembershipRole,
  PricingType,
  PrismaClient,
  ProjectStatus,
} from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const pool = new Pool({
  connectionString,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);

  return date;
}

async function main() {
  console.log("Seeding KlarOrder development database...");

  const result = await prisma.$transaction(async (tx) => {
    /*
     * Seedningen återställer bara KlarOrders demoföretag.
     * Övriga företag och användare lämnas orörda.
     */
    const existingDemoCompany = await tx.company.findUnique({
      where: {
        slug: "klarorder-demo",
      },
      select: {
        id: true,
      },
    });

    if (existingDemoCompany) {
      const companyId = existingDemoCompany.id;

      /*
      * Decision använder onDelete: Restrict och måste därför
      * tas bort innan dess ChangeOrderVersion kan raderas.
      */
      await tx.decision.deleteMany({
        where: {
          version: {
            changeOrder: {
              project: {
                companyId,
              },
            },
          },
        },
      });

      /*
      * AuditEvent innehåller historik som hör till demoföretaget.
      */
      await tx.auditEvent.deleteMany({
        where: {
          companyId,
        },
      });

      /*
      * Detta raderar även versioner och bilagor genom Cascade.
      */
      await tx.changeOrder.deleteMany({
        where: {
          project: {
            companyId,
          },
        },
      });

      /*
      * Projekten måste tas bort innan kunderna eftersom
      * Project.customer använder onDelete: Restrict.
      */
      await tx.project.deleteMany({
        where: {
          companyId,
        },
      });

      await tx.customer.deleteMany({
        where: {
          companyId,
        },
      });

      await tx.membership.deleteMany({
        where: {
          companyId,
        },
      });

      await tx.company.delete({
        where: {
          id: companyId,
        },
      });
    }

    const user = await tx.user.upsert({
      where: {
        email: "samuel@klarorder.se",
      },
      update: {
        name: "Samuel Oxenby",
      },
      create: {
        email: "samuel@klarorder.se",
        name: "Samuel Oxenby",
        emailVerified: new Date(),
      },
    });

    const company = await tx.company.create({
      data: {
        name: "KlarOrder Demo AB",
        slug: "klarorder-demo",
        organizationNumber: "559999-9999",
        email: "kontakt@klarorder.se",
        phone: "0911-12 34 56",
        website: "https://klarorder.se",
        addressLine1: "Storgatan 10",
        postalCode: "941 32",
        city: "Piteå",
        countryCode: "SE",
        memberships: {
          create: {
            userId: user.id,
            role: MembershipRole.OWNER,
          },
        },
      },
    });

    const customer = await tx.customer.create({
      data: {
        companyId: company.id,
        name: "Anna Andersson",
        email: "anna.andersson@example.com",
        phone: "070-123 45 67",
        addressLine1: "Björkvägen 14",
        postalCode: "941 41",
        city: "Piteå",
        countryCode: "SE",
      },
    });

    const project = await tx.project.create({
      data: {
        companyId: company.id,
        customerId: customer.id,
        createdById: user.id,
        referenceNumber: "P-2026-001",
        name: "Renovering av kök",
        description:
          "Renovering av kök med nytt golv, skåpinredning, el och målning.",
        status: ProjectStatus.ACTIVE,
        siteAddressLine1: "Björkvägen 14",
        sitePostalCode: "941 41",
        siteCity: "Piteå",
        siteCountryCode: "SE",
        startsAt: daysFromNow(-14),
      },
    });

    /*
     * Ändringsorder 1: Utkast
     */
    const draftOrder = await tx.changeOrder.create({
      data: {
        projectId: project.id,
        createdById: user.id,
        sequenceNumber: 1,
        status: ChangeOrderStatus.DRAFT,
        currentVersionNumber: 1,
        versions: {
          create: {
            createdById: user.id,
            versionNumber: 1,
            title: "Flytt av eluttag",
            description:
              "Flytt av två befintliga eluttag för att passa den nya köksinredningen.",
            pricingType: PricingType.FIXED_PRICE,
            priceAmount: "2400.00",
            currency: "SEK",
            vatIncluded: true,
            vatRate: "25.00",
            timeImpactDays: 0,
            customerName: customer.name,
            customerEmail: customer.email,
            customerPhone: customer.phone,
            customerMessage:
              "Arbetet behöver utföras innan de nya köksskåpen monteras.",
          },
        },
      },
      include: {
        versions: true,
      },
    });

    /*
     * Ändringsorder 2: Skickad och väntar på kunden
     */
    const sentOrder = await tx.changeOrder.create({
      data: {
        projectId: project.id,
        createdById: user.id,
        sequenceNumber: 2,
        status: ChangeOrderStatus.SENT,
        currentVersionNumber: 1,
        accessTokenHash: "a".repeat(64),
        sentAt: daysFromNow(-1),
        expiresAt: daysFromNow(13),
        versions: {
          create: {
            createdById: user.id,
            versionNumber: 1,
            title: "Byte till premiumbänkskiva",
            description:
              "Byte från standardlaminat till en måttanpassad bänkskiva i kvartskomposit.",
            pricingType: PricingType.FIXED_PRICE,
            priceAmount: "12800.00",
            currency: "SEK",
            vatIncluded: true,
            vatRate: "25.00",
            timeImpactDays: 3,
            customerName: customer.name,
            customerEmail: customer.email,
            customerPhone: customer.phone,
            customerMessage:
              "Leveransen innebär cirka tre extra arbetsdagar.",
            validUntil: daysFromNow(13),
            sentAt: daysFromNow(-1),
          },
        },
      },
      include: {
        versions: true,
      },
    });

    /*
     * Ändringsorder 3: Godkänd
     */
    const approvedOrder = await tx.changeOrder.create({
      data: {
        projectId: project.id,
        createdById: user.id,
        sequenceNumber: 3,
        status: ChangeOrderStatus.APPROVED,
        currentVersionNumber: 1,
        accessTokenHash: "b".repeat(64),
        sentAt: daysFromNow(-8),
        resolvedAt: daysFromNow(-6),
        versions: {
          create: {
            createdById: user.id,
            versionNumber: 1,
            title: "Spackling och målning efter rivning",
            description:
              "Återställning, spackling och målning av väggytor som blev synliga efter rivningen.",
            pricingType: PricingType.ESTIMATE,
            priceAmount: "5600.00",
            currency: "SEK",
            vatIncluded: true,
            vatRate: "25.00",
            timeImpactDays: 1,
            customerName: customer.name,
            customerEmail: customer.email,
            customerPhone: customer.phone,
            customerMessage:
              "Priset är en uppskattning baserad på nu synliga ytor.",
            validUntil: daysFromNow(6),
            sentAt: daysFromNow(-8),
          },
        },
      },
      include: {
        versions: true,
      },
    });

    const approvedVersion = approvedOrder.versions[0];

    if (!approvedVersion) {
      throw new Error("Approved change-order version was not created.");
    }

    await tx.decision.create({
      data: {
        versionId: approvedVersion.id,
        type: DecisionType.APPROVED,
        customerName: customer.name,
        customerEmail: customer.email,
        comment: "Det ser bra ut. Ni kan fortsätta med arbetet.",
        confirmationText:
          "Jag godkänner ovanstående extraarbete, pris och eventuell tidspåverkan.",
        ipAddressHash: "demo-ip-address-hash",
        userAgent: "KlarOrder development seed",
        createdAt: daysFromNow(-6),
      },
    });

    const draftVersion = draftOrder.versions[0];
    const sentVersion = sentOrder.versions[0];

    if (!draftVersion || !sentVersion) {
      throw new Error("Change-order versions were not created.");
    }

    await tx.auditEvent.createMany({
      data: [
        {
          companyId: company.id,
          projectId: project.id,
          actorUserId: user.id,
          actorType: AuditActorType.USER,
          eventType: "PROJECT_CREATED",
          actorName: user.name,
          actorEmail: user.email,
          occurredAt: daysFromNow(-14),
        },
        {
          companyId: company.id,
          projectId: project.id,
          changeOrderId: draftOrder.id,
          versionId: draftVersion.id,
          actorUserId: user.id,
          actorType: AuditActorType.USER,
          eventType: "CHANGE_ORDER_CREATED",
          actorName: user.name,
          actorEmail: user.email,
          metadata: {
            sequenceNumber: draftOrder.sequenceNumber,
            versionNumber: draftVersion.versionNumber,
          },
          occurredAt: daysFromNow(-2),
        },
        {
          companyId: company.id,
          projectId: project.id,
          changeOrderId: sentOrder.id,
          versionId: sentVersion.id,
          actorUserId: user.id,
          actorType: AuditActorType.USER,
          eventType: "CHANGE_ORDER_SENT",
          actorName: user.name,
          actorEmail: user.email,
          metadata: {
            sequenceNumber: sentOrder.sequenceNumber,
            recipient: customer.email,
          },
          occurredAt: daysFromNow(-1),
        },
        {
          companyId: company.id,
          projectId: project.id,
          changeOrderId: approvedOrder.id,
          versionId: approvedVersion.id,
          actorType: AuditActorType.CUSTOMER,
          eventType: "CHANGE_ORDER_APPROVED",
          actorName: customer.name,
          actorEmail: customer.email,
          metadata: {
            sequenceNumber: approvedOrder.sequenceNumber,
            versionNumber: approvedVersion.versionNumber,
          },
          occurredAt: daysFromNow(-6),
        },
      ],
    });

    return {
      user,
      company,
      customer,
      project,
      changeOrders: {
        draft: draftOrder,
        sent: sentOrder,
        approved: approvedOrder,
      },
    };
  });

  console.log("KlarOrder seed completed.");
  console.log({
    user: result.user.email,
    company: result.company.name,
    customer: result.customer.name,
    project: result.project.referenceNumber,
    changeOrders: 3,
  });
}

main()
  .catch((error: unknown) => {
    console.error("KlarOrder seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });