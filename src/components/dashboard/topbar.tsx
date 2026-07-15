"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Bell,
  ChevronRight,
  ClipboardCheck,
  LayoutDashboard,
  Menu,
  Search,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type AnimationEvent,
  type ComponentType,
} from "react";

import styles from "./topbar.module.css";

type DashboardTopbarProps = {
  companyName: string;
  userName: string;
  onMenuClick: () => void;
};

type SearchItem = {
  label: string;
  description: string;
  href: string;
  icon: ComponentType<{
    size?: number;
    strokeWidth?: number;
    "aria-hidden"?: boolean | "true" | "false";
  }>;
};

const searchItems: SearchItem[] = [
  {
    label: "Översikt",
    description: "Gå tillbaka till KlarOrders dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Ändringsordrar",
    description: "Visa de senaste ändringsordrarna",
    href: "/dashboard/change-orders",
    icon: ClipboardCheck,
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

function getCurrentPage(pathname: string): string {
  if (pathname.startsWith("/dashboard/projects")) {
    return "Projekt";
  }

  if (pathname.startsWith("/dashboard/change-orders")) {
    return "Ändringsordrar";
  }

  if (pathname.startsWith("/dashboard/customers")) {
    return "Kunder";
  }

  if (pathname.startsWith("/dashboard/activity")) {
    return "Händelselogg";
  }

  return "Översikt";
}

export function DashboardTopbar({
  companyName,
  userName,
  onMenuClick,
}: DashboardTopbarProps) {
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchClosing, setIsSearchClosing] = useState(false);
  const [query, setQuery] = useState("");

  const openSearch = useCallback(() => {
    setIsSearchClosing(false);
    setIsSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsSearchClosing(true);
  }, []);

  const handleSearchAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLDivElement>) => {
      if (event.currentTarget !== event.target || !isSearchClosing) {
        return;
      }

      setIsSearchOpen(false);
      setIsSearchClosing(false);
      setQuery("");
    },
    [isSearchClosing],
  );

  const currentPage = getCurrentPage(pathname);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("sv-SE");

    if (!normalizedQuery) {
      return searchItems;
    }

    return searchItems.filter((item) =>
      `${item.label} ${item.description}`
        .toLocaleLowerCase("sv-SE")
        .includes(normalizedQuery),
    );
  }, [query]);

  useEffect(() => {
    function handleKeyboardShortcut(event: KeyboardEvent) {
      const isSearchShortcut =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLocaleLowerCase() === "k";

      if (isSearchShortcut) {
        event.preventDefault();
        openSearch();
      }

      if (event.key === "Escape") {
        closeSearch();
      }
    }

    window.addEventListener("keydown", handleKeyboardShortcut);

    return () => {
      window.removeEventListener("keydown", handleKeyboardShortcut);
    };
  }, [closeSearch, openSearch]);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [isSearchOpen]);

  return (
    <>
      <header className={styles.topbar}>
        <div className={styles.leftSection}>
          <button
            className={styles.mobileMenuButton}
            type="button"
            aria-label="Öppna sidomenyn"
            onClick={onMenuClick}
          >
            <Menu aria-hidden="true" size={19} strokeWidth={1.8} />
          </button>

          <nav className={styles.breadcrumbs} aria-label="Brödsmulor">
            <Link href="/dashboard">KlarOrder</Link>

            <ChevronRight
              aria-hidden="true"
              size={14}
              strokeWidth={1.8}
            />

            <span>{currentPage}</span>
          </nav>
        </div>

        <div className={styles.rightSection}>
          <button
            className={styles.searchButton}
            type="button"
            onClick={openSearch}
          >
            <Search aria-hidden="true" size={15} strokeWidth={1.8} />

            <span>Sök i KlarOrder</span>

            <kbd>Ctrl K</kbd>
          </button>

          <button
            className={styles.iconButton}
            type="button"
            aria-label="Aviseringar"
          >
            <Bell aria-hidden="true" size={18} strokeWidth={1.8} />
            <span className={styles.notificationDot} />
          </button>

          <button
            className={styles.profileButton}
            type="button"
            aria-label="Öppna profilmenyn"
          >
            <span className={styles.profileAvatar}>
              {getInitials(userName)}
            </span>

            <span className={styles.profileInformation}>
              <strong>{userName}</strong>
              <small>{companyName}</small>
            </span>
          </button>
        </div>
      </header>

      {isSearchOpen ? (
        <div
          className={`${styles.searchOverlay} ${
            isSearchClosing ? styles.searchOverlayClosing : ""
          }`}
          role="presentation"
          onMouseDown={closeSearch}
          onAnimationEnd={handleSearchAnimationEnd}
        >
          <section
            className={`${styles.searchDialog} ${
              isSearchClosing ? styles.searchDialogClosing : ""
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Sök i KlarOrder"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.searchInputWrapper}>
              <Search aria-hidden="true" size={18} strokeWidth={1.8} />

              <input
                ref={inputRef}
                value={query}
                type="search"
                placeholder="Sök efter sidor och funktioner..."
                aria-label="Sök"
                onChange={(event) => setQuery(event.target.value)}
              />

              <button
                type="button"
                aria-label="Stäng sökningen"
                onClick={closeSearch}
              >
                <X aria-hidden="true" size={17} strokeWidth={1.8} />
              </button>
            </div>

            <div className={styles.searchResults}>
              <p className={styles.searchSectionLabel}>Snabblänkar</p>

              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      className={styles.searchResult}
                      href={item.href}
                      key={item.href}
                      onClick={closeSearch}
                    >
                      <span className={styles.searchResultIcon}>
                        <Icon
                          aria-hidden="true"
                          size={17}
                          strokeWidth={1.8}
                        />
                      </span>

                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.description}</small>
                      </span>

                      <ChevronRight
                        className={styles.resultArrow}
                        aria-hidden="true"
                        size={16}
                        strokeWidth={1.8}
                      />
                    </Link>
                  );
                })
              ) : (
                <div className={styles.noResults}>
                  <strong>Inga resultat</strong>
                  <p>Prova att söka efter något annat.</p>
                </div>
              )}
            </div>

            <footer className={styles.searchFooter}>
              <span>
                <kbd>Esc</kbd>
                Stäng
              </span>

              <span>
                <kbd>↵</kbd>
                Öppna
              </span>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}