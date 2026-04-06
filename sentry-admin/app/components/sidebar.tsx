"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./sidebar.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

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

export default function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const isActive = (href: string) => pathname === href;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 980px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const nav: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: <IconBox /> },
    { label: "Laporan HUMINT", href: "/humint", icon: <IconStack /> },
    { label: "Monitoring OSINT", href: "/osint", icon: <IconGlobe /> },
    { label: "Monitoring Spasial", href: "/geoint", icon: <IconMap /> },
    { label: "Log Aktivitas", href: "/log", icon: <IconList /> },
  ];

  const logout = () => {
    localStorage.removeItem("token");
    router.replace("/login");
  };

  const handleNavClick = () => {
    if (isMobile) onClose(); // auto close on mobile after navigate
  };

  return (
    <>
      {/* overlay (muncul hanya di mobile ketika open) */}
      <div
        className={`${styles.overlay} ${open ? styles.overlayShow : ""}`}
        onClick={onClose}
      />

      <aside className={`${styles.sidebar} ${open ? styles.open : styles.closed}`}>
        <div className={styles.brandRow}>
          <div className={styles.brand}>
            <div className={styles.brandIcon}>
              <Image src="/bpbd-logo.png" alt="BPBD" width={26} height={26} />
            </div>
            <div className={styles.brandText}>SENTRY</div>
          </div>

          {/* close button (hanya mobile) */}
          <button className={styles.closeBtn} type="button" onClick={onClose} aria-label="Close sidebar">
            <IconClose />
          </button>
        </div>

        <nav className={styles.nav}>
          {nav.map((item) => {
            const active = pathname === item.href;
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
          <Link
            href="/profile"
            onClick={handleNavClick}
            className={`${styles.profileBtn} ${isActive("/profile") ? styles.profileActive : ""}`}
            >
            <span className={styles.profileIcon}>
                <IconUser />
            </span>
            <span>Profile</span>
          </Link>

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