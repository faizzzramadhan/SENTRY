"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import styles from "./sidebar.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

type NavChildItem = {
  label: string;
  href: string;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: NavChildItem[];
};

type UserRole = "staff" | "admin" | null;

function decodeJwtPayload(token: string): any | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function IconBox() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function IconStack() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 2 3 7l9 5 9-5-9-5Z" stroke="currentColor" strokeWidth="2" />
      <path d="M3 12l9 5 9-5" stroke="currentColor" strokeWidth="2" />
      <path d="M3 17l9 5 9-5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M2 12h20" stroke="currentColor" strokeWidth="2" />
      <path d="M12 2c3 3.5 3 16.5 0 20" stroke="currentColor" strokeWidth="2" />
      <path d="M12 2c-3 3.5-3 16.5 0 20" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconMap() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M9 18 3 21V6l6-3 6 3 6-3v15l-6 3-6-3Z" stroke="currentColor" strokeWidth="2" />
      <path d="M9 3v15" stroke="currentColor" strokeWidth="2" />
      <path d="M15 6v15" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconList() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M8 6h13M8 12h13M8 18h13" stroke="currentColor" strokeWidth="2" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconManageStaff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 3 4 7l8 4 8-4-8-4Z" stroke="currentColor" strokeWidth="2" />
      <path d="M4 12l8 4 8-4" stroke="currentColor" strokeWidth="2" />
      <path d="M4 17l8 4 8-4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconMaster() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M3 12h18" stroke="currentColor" strokeWidth="2" />
      <path d="M12 3c3 3.2 3 14.8 0 18" stroke="currentColor" strokeWidth="2" />
      <path d="M12 3c-3 3.2-3 14.8 0 18" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M20 21a8 8 0 1 0-16 0" stroke="currentColor" strokeWidth="2" />
      <path d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M10 17 15 12 10 7" stroke="currentColor" strokeWidth="2" />
      <path d="M15 12H3" stroke="currentColor" strokeWidth="2" />
      <path d="M21 3v18" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M18 6 6 18" stroke="currentColor" strokeWidth="2" />
      <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const [isMobile, setIsMobile] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 980px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUserRole(null);
      return;
    }

    const payload = decodeJwtPayload(token);
    const role = payload?.usr_role || payload?.adm_role;

    if (role === "staff" || role === "admin") {
      setUserRole(role);
    } else {
      setUserRole(null);
    }
  }, [pathname]);

  const staffNav: NavItem[] = useMemo(
    () => [
      { label: "Dashboard", href: "/dashboard", icon: <IconBox /> },
      { label: "Laporan HUMINT", href: "/humint", icon: <IconStack /> },
      { label: "Monitoring OSINT", href: "/osint", icon: <IconGlobe /> },
      {
        label: "Monitoring Spasial",
        href: "/geoint",
        icon: <IconMap />,
        children: [
          { label: "Peta Sebaran Laporan", href: "/geoint/peta-sebaran-laporan" },
          { label: "Peta Sebaran OSINT", href: "/geoint/peta-sebaran-osint" },
        ],
      },
      { label: "Pengaturan Master", href: "/master-data", icon: <IconMaster /> },
    ],
    []
  );

  const adminNav: NavItem[] = useMemo(
    () => [
      { label: "Manage User", href: "/manage-staff", icon: <IconManageStaff /> },
      { label: "Log Aktivitas", href: "/log", icon: <IconList /> },
    ],
    []
  );

  const nav = useMemo(() => {
    if (userRole === "admin") return adminNav;
    return staffNav;
  }, [adminNav, staffNav, userRole]);

  useEffect(() => {
    const activeDropdown = nav.find((item) => item.children?.some((child) => pathname === child.href));

    if (activeDropdown) {
      setOpenDropdown(activeDropdown.href);
    }
  }, [pathname, nav]);

  useEffect(() => {
    if (!userRole) return;

    const staffOnlyPaths = [
      "/dashboard",
      "/humint",
      "/osint",
      "/geoint",
      "/geoint/peta-sebaran-laporan",
      "/geoint/peta-sebaran-osint",
      "/master-data",
    ];
    const adminOnlyPaths = ["/manage-staff", "/log", "/profile"];

    const isStaffOnlyPath = staffOnlyPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
    const isAdminOnlyPath = adminOnlyPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

    if (userRole === "staff" && isAdminOnlyPath) {
      router.replace("/dashboard");
      return;
    }

    if (userRole === "admin" && isStaffOnlyPath) {
      router.replace("/manage-staff");
    }
  }, [pathname, router, userRole]);

  const logout = () => {
    localStorage.removeItem("token");
    router.replace("/login");
  };

  const handleNavClick = () => {
    if (isMobile) onClose();
  };

  return (
    <>
      <div className={`${styles.overlay} ${open ? styles.overlayShow : ""}`} onClick={onClose} />

      <aside className={`${styles.sidebar} ${open ? styles.open : styles.closed}`}>
        <div className={styles.brandRow}>
          <div className={styles.brand}>
            <div className={styles.brandIcon}>
              <Image src="/bpbd-logo.png" alt="BPBD" width={26} height={26} />
            </div>
            <div className={styles.brandText}>SENTRY</div>
          </div>

          <button className={styles.closeBtn} type="button" onClick={onClose} aria-label="Close sidebar">
            <IconClose />
          </button>
        </div>

        <nav className={styles.nav}>
          {nav.map((item) => {
            const hasChildren = Boolean(item.children?.length);
            const active = isActive(item.href);
            const dropdownOpen = openDropdown === item.href;

            if (hasChildren) {
              return (
                <div key={item.href} className={styles.navGroup}>
                  <button
                    type="button"
                    onClick={() => setOpenDropdown((current) => (current === item.href ? null : item.href))}
                    className={`${styles.navItem} ${active ? styles.active : ""}`}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    <span className={styles.navLabel}>{item.label}</span>
                    <span className={`${styles.chevron} ${dropdownOpen ? styles.chevronOpen : ""}`}>
                      <IconChevronDown />
                    </span>
                  </button>

                  <div className={`${styles.childMenu} ${dropdownOpen ? styles.childMenuOpen : ""}`}>
                    {item.children?.map((child) => {
                      const childActive = pathname === child.href;

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={handleNavClick}
                          className={`${styles.childItem} ${childActive ? styles.childActive : ""}`}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={`${styles.navItem} ${active ? styles.active : ""}`}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.bottom}>
          {userRole === "admin" ? (
            <Link
              href="/profile"
              onClick={handleNavClick}
              className={`${styles.profileBtn} ${
                isActive("/profile") ? styles.profileActive : ""
              }`}
            >
              <span className={styles.profileIcon}>
                <IconUser />
              </span>
              <span>Profile</span>
            </Link>
          ) : null}

          <button className={styles.logoutBtn} type="button" onClick={logout}>
            <span className={styles.logoutIcon}>
              <IconLogout />
            </span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
