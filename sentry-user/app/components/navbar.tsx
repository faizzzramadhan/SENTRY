"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const pathname = usePathname();

  const items = [
    { label: "Beranda", href: "/" },
    { label: "Prakiraan Cuaca", href: "/prakiraan-cuaca" },
    { label: "Peta Bencana", href: "/peta-bencana" },
    { label: "Kirim Laporan", href: "/kirim-laporan" },
  ];

  return (
    <header className={styles.navbar}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <div className={styles.logoWrap}>
            <Image src="/bpbd-logo.png" alt="Logo" width={34} height={34} />
          </div>
          <span className={styles.brandText}>SENTRY</span>
        </div>

        <nav className={styles.links}>
          {items.map((it) => {
            const active = pathname === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
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