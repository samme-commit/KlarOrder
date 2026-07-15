"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  CircleHelp,
  ClipboardCheck,
  FolderKanban,
  History,
  LayoutDashboard,
  Search,
  Settings,
  UsersRound,
  X,
} from "lucide-react";

import styles from "./sidebar.module.css";

type DashboardSidebarProps = {
  companyName: string;
  companyCity: string;
  isMobileOpen: boolean;
  onClose: () => void;
};

const primaryNavigation = [
  {
    label: "Översikt",
    href: "/dashboard",
    icon: LayoutDashboard,
    enabled: true,
  },
  {
    label: "Projekt",
    href: "/dashboard/projects",
    icon: FolderKanban,
    enabled: false,
  },
  {
    label: "Ändringsordrar",
    href: "/dashboard/change-orders",
    icon: ClipboardCheck,
    enabled: true,
  },
  {
    label: "Kunder",
    href: "/dashboard/customers",
    icon: UsersRound,
    enabled: false,
  },
  {
    label: "Händelselogg",
    href: "/dashboard/activity",
    icon: History,
    enabled: false,
  },
];

const secondaryNavigation = [
  {
    label: "Inställningar",
    icon: Settings,
  },
  {
    label: "Hjälp och support",
    icon: CircleHelp,
  },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function DashboardSidebar({
  companyName,
  companyCity,
  isMobileOpen,
  onClose,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`${styles.sidebar} ${
        isMobileOpen ? styles.sidebarOpen : ""
      }`}
    >
      <div className={styles.sidebarTop}>
        <div className={styles.brandRow}>
          <Link
            className={styles.brand}
            href="/dashboard"
            aria-label="KlarOrder – Översikt"
            onClick={onClose}
          >
            <Image
              className={styles.brandLogo}
              src="/brand/klarorder-main-logo.svg"
              alt="KlarOrder"
              width={158}
              height={38}
              priority
            />
          </Link>

          <button
            className={styles.mobileCloseButton}
            type="button"
            aria-label="Stäng sidomenyn"
            onClick={onClose}
          >
            <X aria-hidden="true" size={18} strokeWidth={1.8} />
          </button>
        </div>

        <div className={styles.searchControl}>
          <Search aria-hidden="true" size={15} strokeWidth={1.8} />

          <span>Sök</span>

          <kbd>Ctrl K</kbd>
        </div>

        <nav className={styles.navigation} aria-label="Huvudmeny">
          <p className={styles.navigationLabel}>Arbetsyta</p>

          <div className={styles.navigationList}>
            {primaryNavigation.map((item) => {
              const Icon = item.icon;

              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(`${item.href}/`));

              if (!item.enabled) {
                return (
                  <div
                    className={`${styles.navigationItem} ${styles.navigationItemDisabled}`}
                    aria-disabled="true"
                    key={item.label}
                  >
                    <Icon
                      className={styles.navigationIcon}
                      aria-hidden="true"
                      size={17}
                      strokeWidth={1.8}
                    />

                    <span>{item.label}</span>
                    <small>Snart</small>
                  </div>
                );
              }

              return (
                <Link
                  className={`${styles.navigationItem} ${
                    isActive ? styles.navigationItemActive : ""
                  }`}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  key={item.label}
                  onClick={onClose}
                >
                  <Icon
                    className={styles.navigationIcon}
                    aria-hidden="true"
                    size={17}
                    strokeWidth={1.8}
                  />

                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      <div className={styles.sidebarBottom}>
        <nav
          className={styles.secondaryNavigation}
          aria-label="Kontoinställningar"
        >
          {secondaryNavigation.map((item) => {
            const Icon = item.icon;

            return (
              <div
                className={`${styles.navigationItem} ${styles.secondaryItem}`}
                aria-disabled="true"
                key={item.label}
              >
                <Icon
                  className={styles.navigationIcon}
                  aria-hidden="true"
                  size={17}
                  strokeWidth={1.8}
                />

                <span>{item.label}</span>
              </div>
            );
          })}
        </nav>

        <div className={styles.companyCard}>
          <span className={styles.companyAvatar}>
            {getInitials(companyName)}
          </span>

          <span className={styles.companyInformation}>
            <strong>{companyName}</strong>
            <small>{companyCity}</small>
          </span>

          <span className={styles.companyMenu} aria-hidden="true">
            •••
          </span>
        </div>
      </div>
    </aside>
  );
}