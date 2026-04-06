import Image from "next/image";
import Navbar from "./components/navbar";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page} id="beranda">
      <Navbar />

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroInner}>
          <div className={styles.heroLeft}>
            <h1 className={styles.heroTitle}>
              Laporkan &amp; Monitoring Bencana Kota <br /> Malang
            </h1>

            <p className={styles.heroDesc}>
              SENTRY adalah platform pelaporan dan monitoring bencana untuk
              membantu masyarakat dan pemerintah merespon kejadian secara cepat
              dan transparan.
            </p>

            <div className={styles.heroActions}>
              <a className={styles.btnPrimary} href="#lapor">
                <span className={styles.btnIcon}>📣</span>
                Laporkan Bencana
              </a>

              <a className={styles.btnSecondary} href="#peta">
                <span className={styles.btnIcon}>🗺️</span>
                Lihat Peta Bencana
              </a>
            </div>
          </div>

          <div className={styles.heroRight}>
            <div className={styles.illustrationWrap}>
              <Image
                src="/hero-illustration.png"
                alt="Ilustrasi"
                width={520}
                height={360}
                priority
                className={styles.illustration}
              />
            </div>
          </div>
        </div>
      </section>

      {/* TENTANG */}
      <section className={styles.section} id="tentang">
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Tentang SENTRY</h2>
          <p className={styles.sectionSub}>
            Informasi terkini tentang kejadian bencana yang dilaporkan di Kota Malang
          </p>

          <div className={styles.cardGrid}>
            <div className={styles.card}>
              <div className={styles.cardIcon}>📌</div>
              <div>
                <div className={styles.cardTitle}>Pelaporan Bencana Online</div>
                <div className={styles.cardDesc}>
                  Masyarakat dapat dengan mudah melaporkan kejadian bencana yang berada disekitar
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardIcon}>🧾</div>
              <div>
                <div className={styles.cardTitle}>Monitoring Kejadian Bencana</div>
                <div className={styles.cardDesc}>
                  Menampilkan ringkasan statistik kejadian bencana di Kota Malang
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardIcon}>📍</div>
              <div>
                <div className={styles.cardTitle}>Informasi Kebencanaan Publik</div>
                <div className={styles.cardDesc}>
                  Memberikan gambaran sebaran dan kondisi bencana
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATISTIK */}
      <section className={styles.sectionAlt} id="cuaca">
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Statistik Kejadian</h2>
          <p className={styles.sectionSub}>
            Informasi terkini tentang kejadian bencana yang dilaporkan di Kota Malang
          </p>

          <div className={styles.statGrid}>
            <div className={styles.statCard}>
              <div className={styles.statTop}>
                <span className={styles.statIcon}>📄</span>
                <span className={styles.statNumber}>120</span>
              </div>
              <div className={styles.statLabel}>Total Laporan Masuk</div>
              <div className={styles.statMeta}>Terakhir update 20 Februari 2026</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statTop}>
                <span className={styles.statIcon}>👤</span>
                <span className={styles.statNumber}>120</span>
              </div>
              <div className={styles.statLabel}>Total Korban</div>
              <div className={styles.statMeta}>Terakhir update 20 Februari 2026</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statTop}>
                <span className={styles.statIcon}>📊</span>
                <span className={styles.statNumber}>120</span>
              </div>
              <div className={styles.statLabel}>Total Keseluruhan Kejadian</div>
              <div className={styles.statMeta}>Terakhir update 20 Februari 2026</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statTop}>
                <span className={styles.statIcon}>➕</span>
                <span className={styles.statNumber}>120</span>
              </div>
              <div className={styles.statLabel}>Total Sumber Daya</div>
              <div className={styles.statMeta}>Terakhir update 20 Februari 2026</div>
            </div>
          </div>
        </div>
      </section>

      {/* Placeholder sections untuk anchor navbar */}
      <section className={styles.anchor} id="peta" />
      <section className={styles.anchor} id="lapor" />

      {/* FOOTER */}
      <footer className={styles.footer}>
        SENTRY © 2026. All rights reserved.
      </footer>
    </div>
  );
}