"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = [
    { label: "Beranda", href: "/" },
    { label: "Prakiraan Cuaca", href: "/prakiraan-cuaca" },
    { label: "Peta Bencana", href: "/peta-bencana" },
    { label: "Kirim Laporan", href: "/kirim-laporan" },
    { label: "Cek Status", href: "/cek-status" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className={styles.navbar}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} onClick={() => setOpen(false)}>
          <div className={styles.logoWrap}>
            <Image src="/logo.png" alt="Logo SENTRY" width={34} height={34} priority />
          </div>
          <span className={styles.brandText}>SENTRY</span>
        </Link>

        <button
          type="button"
          className={`${styles.menuButton} ${open ? styles.menuButtonActive : ""}`}
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Buka menu"
          aria-expanded={open}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`${styles.links} ${open ? styles.linksOpen : ""}`}>
          {items.map((it) => {
            const active = isActive(it.href);

            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className={`${styles.link} ${active ? styles.active : ""}`}
              >
                {it.label}
                {active ? <span className={styles.activeMarker} /> : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}