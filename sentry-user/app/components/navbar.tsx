import Image from "next/image";
import Link from "next/link";
import styles from "./Navbar.module.css";

export default function Navbar() {
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
          <Link className={styles.link} href="#beranda">Beranda</Link>
          <Link className={styles.link} href="#cuaca">Prakiraan Cuaca</Link>
          <Link className={styles.link} href="#peta">Peta Bencana</Link>
          <Link className={styles.link} href="#lapor">Kirim Laporan</Link>
        </nav>
      </div>
    </header>
  );
}