import Link from "next/link";

import {
  ArrowDownUp,
  ClipboardCheck,
  Filter,
  Search,
} from "lucide-react";

import {
  ChangeOrderStatus,
  type Prisma,
} from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";

import styles from "./change-orders.module.css";

export const dynamic = "force-dynamic";

type ChangeOrdersPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    sort?: string | string[];
  }>;
};

type SortOption = "newest" | "oldest" | "number";

const statusLabels: Record<ChangeOrderStatus, string> = {
  DRAFT: "Utkast",
  SENT: "Skickad",
  VIEWED: "Visad",
  QUESTIONED: "Fråga mottagen",
  APPROVED: "Godkänd",
  DECLINED: "Nekad",
  CANCELLED: "Avbruten",
  EXPIRED: "Utgången",
};

const filterStatuses: Array<{
  value: ChangeOrderStatus;
  label: string;
}> = [
  {
    value: ChangeOrderStatus.DRAFT,
    label: "Utkast",
  },
  {
    value: ChangeOrderStatus.SENT,
    label: "Skickade",
  },
  {
    value: ChangeOrderStatus.VIEWED,
    label: "Visade",
  },
  {
    value: ChangeOrderStatus.QUESTIONED,
    label: "Frågor",
  },
  {
    value: ChangeOrderStatus.APPROVED,
    label: "Godkända",
  },
  {
    value: ChangeOrderStatus.DECLINED,
    label: "Nekade",
  },
];

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

function getStringParameter(
  value: string | string[] | undefined,
): string {
  return typeof value === "string" ? value : "";
}

function parseStatus(
  value: string,
): ChangeOrderStatus | undefined {
  return Object.values(ChangeOrderStatus).includes(
    value as ChangeOrderStatus,
  )
    ? (value as ChangeOrderStatus)
    : undefined;
}

function parseSort(value: string): SortOption {
  if (value === "oldest" || value === "number") {
    return value;
  }

  return "newest";
}

export default async function ChangeOrdersPage({
  searchParams,
}: ChangeOrdersPageProps) {
  const parameters = await searchParams;

  const query = getStringParameter(parameters.q).trim();
  const selectedStatus = parseStatus(
    getStringParameter(parameters.status),
  );
  const selectedSort = parseSort(
    getStringParameter(parameters.sort),
  );

  const company = await prisma.company.findUnique({
    where: {
      slug: "klarorder-demo",
    },
    select: {
      id: true,
      name: true,
      city: true,
      memberships: {
        take: 1,
        select: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!company) {
    return (
      <main className={styles.missingState}>
        <div className={styles.missingCard}>
          <span>KlarOrder</span>
          <h1>Demoföretaget hittades inte</h1>

          <p>
            Kör seed-scriptet för att återställa KlarOrders testdata.
          </p>

          <code>npx prisma db seed</code>
        </div>
      </main>
    );
  }

  const companyFilter: Prisma.ChangeOrderWhereInput = {
    project: {
      is: {
        companyId: company.id,
      },
    },
  };

  const searchFilter: Prisma.ChangeOrderWhereInput | undefined =
    query.length > 0
      ? {
          OR: [
            {
              versions: {
                some: {
                  title: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              versions: {
                some: {
                  description: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              project: {
                is: {
                  name: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              project: {
                is: {
                  referenceNumber: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              project: {
                is: {
                  customer: {
                    is: {
                      name: {
                        contains: query,
                        mode: "insensitive",
                      },
                    },
                  },
                },
              },
            },
          ],
        }
      : undefined;

  const where: Prisma.ChangeOrderWhereInput = {
    AND: [
      companyFilter,
      ...(selectedStatus
        ? [
            {
              status: selectedStatus,
            },
          ]
        : []),
      ...(searchFilter ? [searchFilter] : []),
    ],
  };

  const orderBy: Prisma.ChangeOrderOrderByWithRelationInput =
    selectedSort === "oldest"
      ? {
          updatedAt: "asc",
        }
      : selectedSort === "number"
        ? {
            sequenceNumber: "desc",
          }
        : {
            updatedAt: "desc",
          };

  const [changeOrders, statusGroups, totalCount] =
    await Promise.all([
      prisma.changeOrder.findMany({
        where,
        orderBy,
        include: {
          project: {
            include: {
              customer: true,
            },
          },
          versions: {
            orderBy: {
              versionNumber: "desc",
            },
            take: 1,
          },
        },
      }),

      prisma.changeOrder.groupBy({
        by: ["status"],
        where: companyFilter,
        _count: {
          _all: true,
        },
      }),

      prisma.changeOrder.count({
        where: companyFilter,
      }),
    ]);

  const statusCounts = new Map(
    statusGroups.map((group) => [
      group.status,
      group._count._all,
    ]),
  );

  const userName =
    company.memberships[0]?.user.name ?? "KlarOrder-användare";

  const hasActiveFilters =
    Boolean(query) ||
    Boolean(selectedStatus) ||
    selectedSort !== "newest";

  return (
    <DashboardShell
      companyName={company.name}
      companyCity={company.city ?? "Sverige"}
      userName={userName}
    >
      <main className={styles.main}>
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Arbetsyta</p>
            <h1>Ändringsordrar</h1>

            <p className={styles.description}>
              Sök, filtrera och följ alla ändrings- och
              tilläggsarbeten från utkast till kundbeslut.
            </p>
          </div>

          <Button
            size="small"
            disabled
            title="Formuläret bygger vi i nästa steg"
          >
            Ny ändringsorder
          </Button>
        </header>

        <section
          className={styles.statusNavigation}
          aria-label="Filtrera efter status"
        >
          <Link
            className={`${styles.statusTab} ${
              !selectedStatus ? styles.statusTabActive : ""
            }`}
            href="/dashboard/change-orders"
          >
            <span>Alla</span>
            <strong>{totalCount}</strong>
          </Link>

          {filterStatuses.map((status) => {
            const isActive = selectedStatus === status.value;
            const count = statusCounts.get(status.value) ?? 0;

            return (
              <Link
                className={`${styles.statusTab} ${
                  isActive ? styles.statusTabActive : ""
                }`}
                href={`/dashboard/change-orders?status=${status.value}`}
                key={status.value}
              >
                <span>{status.label}</span>
                <strong>{count}</strong>
              </Link>
            );
          })}
        </section>

        <section className={styles.panel}>
          <form
            className={styles.toolbar}
            action="/dashboard/change-orders"
            method="get"
          >
            <label className={styles.searchField}>
              <Search
                aria-hidden="true"
                size={16}
                strokeWidth={1.8}
              />

              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Sök efter order, projekt eller kund..."
                aria-label="Sök ändringsordrar"
              />
            </label>

            <label className={styles.selectField}>
              <Filter
                aria-hidden="true"
                size={15}
                strokeWidth={1.8}
              />

              <select
                name="status"
                defaultValue={selectedStatus ?? ""}
                aria-label="Filtrera efter status"
              >
                <option value="">Alla statusar</option>

                {filterStatuses.map((status) => (
                  <option
                    value={status.value}
                    key={status.value}
                  >
                    {status.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.selectField}>
              <ArrowDownUp
                aria-hidden="true"
                size={15}
                strokeWidth={1.8}
              />

              <select
                name="sort"
                defaultValue={selectedSort}
                aria-label="Sortera ändringsordrar"
              >
                <option value="newest">
                  Senast uppdaterade
                </option>

                <option value="oldest">
                  Äldst uppdaterade
                </option>

                <option value="number">
                  Högsta ordernummer
                </option>
              </select>
            </label>

            <Button
              type="submit"
              size="small"
              variant="secondary"
            >
              Filtrera
            </Button>

            {hasActiveFilters ? (
              <Link
                className={styles.clearButton}
                href="/dashboard/change-orders"
              >
                Rensa
              </Link>
            ) : null}
          </form>

          <div className={styles.resultHeader}>
            <div>
              <strong>
                {changeOrders.length}{" "}
                {changeOrders.length === 1
                  ? "ändringsorder"
                  : "ändringsordrar"}
              </strong>

              <span>
                {hasActiveFilters
                  ? "Matchar dina valda filter"
                  : "Alla ändringsordrar i företaget"}
              </span>
            </div>
          </div>

          {changeOrders.length > 0 ? (
            <div
              className={styles.orderTable}
              role="table"
              aria-label="Ändringsordrar"
            >
              <div
                className={styles.tableHeader}
                role="row"
              >
                <span role="columnheader">Ändringsorder</span>
                <span role="columnheader">Projekt</span>
                <span role="columnheader">Kund</span>
                <span role="columnheader">Status</span>
                <span role="columnheader">Belopp</span>
                <span role="columnheader">Uppdaterad</span>
              </div>

              <div role="rowgroup">
                {changeOrders.map((changeOrder) => {
                  const version = changeOrder.versions[0];

                  return (
                    <article
                      className={styles.tableRow}
                      role="row"
                      key={changeOrder.id}
                    >
                      <div
                        className={styles.orderCell}
                        role="cell"
                      >
                        <span className={styles.orderNumber}>
                          #{changeOrder.sequenceNumber}
                        </span>

                        <div>
                          <strong>
                            {version?.title ??
                              "Namnlös ändringsorder"}
                          </strong>

                          <small>
                            Version{" "}
                            {changeOrder.currentVersionNumber}
                          </small>
                        </div>
                      </div>

                      <div
                        className={styles.textCell}
                        role="cell"
                        data-label="Projekt"
                      >
                        <strong>
                          {changeOrder.project.name}
                        </strong>

                        <small>
                          {
                            changeOrder.project
                              .referenceNumber
                          }
                        </small>
                      </div>

                      <div
                        className={styles.textCell}
                        role="cell"
                        data-label="Kund"
                      >
                        <strong>
                          {changeOrder.project.customer.name}
                        </strong>

                        <small>
                          {changeOrder.project.customer.email ??
                            "Ingen e-post"}
                        </small>
                      </div>

                      <div
                        className={styles.statusCell}
                        role="cell"
                        data-label="Status"
                      >
                        <span
                          className={`${styles.statusBadge} ${
                            styles[
                              `status${changeOrder.status}` as keyof typeof styles
                            ]
                          }`}
                        >
                          <span aria-hidden="true" />
                          {statusLabels[changeOrder.status]}
                        </span>
                      </div>

                      <div
                        className={styles.amountCell}
                        role="cell"
                        data-label="Belopp"
                      >
                        {version?.priceAmount
                          ? currencyFormatter.format(
                              version.priceAmount.toNumber(),
                            )
                          : "Saknas"}
                      </div>

                      <div
                        className={styles.dateCell}
                        role="cell"
                        data-label="Uppdaterad"
                      >
                        <time
                          dateTime={changeOrder.updatedAt.toISOString()}
                        >
                          {dateFormatter.format(
                            changeOrder.updatedAt,
                          )}
                        </time>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>
                <ClipboardCheck
                  aria-hidden="true"
                  size={22}
                  strokeWidth={1.7}
                />
              </span>

              <h2>Inga ändringsordrar hittades</h2>

              <p>
                Prova att ändra sökningen eller rensa dina
                filter.
              </p>

              <Link
                className={styles.emptyLink}
                href="/dashboard/change-orders"
              >
                Visa alla ändringsordrar
              </Link>
            </div>
          )}
        </section>
      </main>
    </DashboardShell>
  );
}