"use client";

import { useEffect, useState, type ReactNode } from "react";

import { DashboardSidebar } from "./sidebar";
import { DashboardTopbar } from "./topbar";

import styles from "./dashboard-shell.module.css";

type DashboardShellProps = {
  children: ReactNode;
  companyName: string;
  companyCity: string;
  userName: string;
};

export function DashboardShell({
  children,
  companyName,
  companyCity,
  userName,
}: DashboardShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  return (
    <div className={styles.shell}>
      <DashboardSidebar
        companyName={companyName}
        companyCity={companyCity}
        isMobileOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <button
        className={`${styles.backdrop} ${
          isMobileMenuOpen ? styles.backdropVisible : ""
        }`}
        type="button"
        aria-label="Stäng sidomenyn"
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <div className={styles.content}>
        <DashboardTopbar
          companyName={companyName}
          userName={userName}
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />

        {children}
      </div>
    </div>
  );
}