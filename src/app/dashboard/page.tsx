import Link from "next/link";

import prisma from "@/lib/prisma";

import styles from "./dashboard.module.css";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { ButtonLink } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const statusLabels = {
  DRAFT: "Utkast",
  SENT: "Skickad",
  VIEWED: "Visad",
  QUESTIONED: "Fråga mottagen",
  APPROVED: "Godkänd",
  DECLINED: "Nekad",
  CANCELLED: "Avbruten",
  EXPIRED: "Utgången",
} as const;

const currencyFormatter = new Intl.NumberFormat("sv-SE", {
  style: "currency",
  currency: "SEK",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("sv-SE", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default async function DashboardPage() {
  const company = await prisma.company.findUnique({
    where: {
      slug: "klarorder-demo",
    },
    include: {
      memberships: {
        include: {
          user: true,
        },
        take: 1,
      },
      projects: {
        orderBy: {
          updatedAt: "desc",
        },
        include: {
          customer: true,
          changeOrders: {
            orderBy: {
              updatedAt: "desc",
            },
            include: {
              versions: {
                orderBy: {
                  versionNumber: "desc",
                },
                take: 1,
              },
            },
          },
        },
      },
      auditEvents: {
        orderBy: {
          occurredAt: "desc",
        },
        take: 5,
      },
    },
  });

  if (!company) {
    return (
      <main className={styles.missingState}>
        <div className={styles.missingCard}>
          <span className={styles.missingEyebrow}>KlarOrder</span>

          <h1>Demoföretaget hittades inte</h1>

          <p>
            Kör seed-scriptet för att lägga tillbaka testföretaget och dess
            projekt.
          </p>

          <code>npx prisma db seed</code>
        </div>
      </main>
    );
  }

  const user = company.memberships[0]?.user;

  const changeOrders = company.projects
    .flatMap((project) =>
      project.changeOrders.map((changeOrder) => ({
        ...changeOrder,
        project,
        currentVersion: changeOrder.versions[0] ?? null,
      })),
    )
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const activeProjects = company.projects.filter(
    (project) => project.status === "ACTIVE",
  );

  const waitingForCustomer = changeOrders.filter((changeOrder) =>
    ["SENT", "VIEWED", "QUESTIONED"].includes(changeOrder.status),
  );

  const approvedOrders = changeOrders.filter(
    (changeOrder) => changeOrder.status === "APPROVED",
  );

  const approvedValue = approvedOrders.reduce((total, changeOrder) => {
    const amount = changeOrder.currentVersion?.priceAmount;

    return total + (amount ? amount.toNumber() : 0);
  }, 0);

  const eventLabels: Record<string, string> = {
    PROJECT_CREATED: "Projekt skapades",
    CHANGE_ORDER_CREATED: "Ändringsorder skapades",
    CHANGE_ORDER_SENT: "Ändringsorder skickades",
    CHANGE_ORDER_APPROVED: "Ändringsorder godkändes",
  };

  return (
    <div className={styles.appShell}>
      <DashboardSidebar
        companyName={company.name}
        companyCity={company.city ?? "Sverige"}
      />

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Översikt</p>

            <h1>
              Välkommen tillbaka
              {user?.name ? `, ${user.name.split(" ")[0]}` : ""}
            </h1>

            <p className={styles.headerDescription}>
              Här ser du vad som väntar på kunden och vilka arbeten som nyligen
              har godkänts.
            </p>
          </div>

          <ButtonLink
            href="#change-orders"
            iconRight={<span>→</span>}
          >
            Visa ändringsordrar
          </ButtonLink>
        </header>

        <section className={styles.statsGrid} aria-label="Sammanfattning">
          <article className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Aktiva projekt</span>
              <span className={styles.statNumber}>01</span>
            </div>

            <strong>{activeProjects.length}</strong>
            <p>Projekt som för närvarande pågår</p>
          </article>

          <article className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Väntar på kund</span>
              <span className={styles.statNumber}>02</span>
            </div>

            <strong>{waitingForCustomer.length}</strong>
            <p>Skickade för digitalt godkännande</p>
          </article>

          <article className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Godkända</span>
              <span className={styles.statNumber}>03</span>
            </div>

            <strong>{approvedOrders.length}</strong>
            <p>Godkända ändringsordrar totalt</p>
          </article>

          <article className={`${styles.statCard} ${styles.statCardAccent}`}>
            <div className={styles.statHeader}>
              <span>Godkänt värde</span>
              <span className={styles.statNumber}>04</span>
            </div>

            <strong>{currencyFormatter.format(approvedValue)}</strong>
            <p>Värdet av godkända extraarbeten</p>
          </article>
        </section>

        <section className={styles.contentGrid}>
          <div
            className={`${styles.panel} ${styles.ordersPanel}`}
            id="change-orders"
          >
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>Senast uppdaterade</p>
                <h2>Ändringsordrar</h2>
              </div>

              <span className={styles.countBadge}>
                {changeOrders.length} totalt
              </span>
            </div>

            {changeOrders.length > 0 ? (
              <div className={styles.orderList}>
                {changeOrders.slice(0, 6).map((changeOrder) => {
                  const version = changeOrder.currentVersion;

                  return (
                    <article className={styles.orderRow} key={changeOrder.id}>
                      <div className={styles.orderIdentity}>
                        <span className={styles.orderSequence}>
                          #{changeOrder.sequenceNumber}
                        </span>

                        <div>
                          <h3>
                            {version?.title ?? "Namnlös ändringsorder"}
                          </h3>

                          <p>
                            {changeOrder.project.name}
                            <span>•</span>
                            {changeOrder.project.customer.name}
                          </p>
                        </div>
                      </div>

                      <div className={styles.orderMeta}>
                        <span
                          className={`${styles.statusBadge} ${
                            styles[
                              `status${changeOrder.status}` as keyof typeof styles
                            ]
                          }`}
                        >
                          {statusLabels[changeOrder.status]}
                        </span>

                        <strong>
                          {version?.priceAmount
                            ? currencyFormatter.format(
                                version.priceAmount.toNumber(),
                              )
                            : "Pris saknas"}
                        </strong>

                        <time dateTime={changeOrder.updatedAt.toISOString()}>
                          {dateFormatter.format(changeOrder.updatedAt)}
                        </time>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <h3>Inga ändringsordrar ännu</h3>
                <p>Den första ändringsordern kommer att visas här.</p>
              </div>
            )}
          </div>

          <aside className={styles.sideColumn}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>Pågående arbete</p>
                  <h2>Aktiva projekt</h2>
                </div>
              </div>

              <div className={styles.projectList}>
                {activeProjects.map((project) => (
                  <article className={styles.projectCard} key={project.id}>
                    <div className={styles.projectTop}>
                      <span className={styles.projectReference}>
                        {project.referenceNumber}
                      </span>

                      <span className={styles.liveBadge}>Aktivt</span>
                    </div>

                    <h3>{project.name}</h3>
                    <p>{project.customer.name}</p>

                    <div className={styles.projectFooter}>
                      <span>
                        {project.changeOrders.length} ändringsordrar
                      </span>

                      <span>{project.siteCity ?? company.city}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>Spårbar historik</p>
                  <h2>Senaste aktivitet</h2>
                </div>
              </div>

              <div className={styles.activityList}>
                {company.auditEvents.map((event) => (
                  <article className={styles.activityItem} key={event.id}>
                    <span className={styles.activityDot} />

                    <div>
                      <strong>
                        {eventLabels[event.eventType] ?? event.eventType}
                      </strong>

                      <p>{event.actorName ?? "KlarOrder"}</p>

                      <time dateTime={event.occurredAt.toISOString()}>
                        {dateFormatter.format(event.occurredAt)}
                      </time>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}