"use client";

import { useEffect, useState } from "react";
import Navbar from "./components/navbar";
import styles from "./page.module.css";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5555";

type HomeStats = {
  total_laporan_masuk: number;
  total_korban: number;
  total_kejadian: number;
  last_update: string | null;
};

const defaultStats: HomeStats = {
  total_laporan_masuk: 0,
  total_korban: 0,
  total_kejadian: 0,
  last_update: null,
};

function formatDate(value: string | null) {
  if (!value) return "Belum ada data";

  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function Home() {
  const [stats, setStats] = useState<HomeStats>(defaultStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);

        const response = await fetch(`${API_BASE_URL}/humint/home-stats`, {
          method: "GET",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result?.message || "Gagal mengambil statistik halaman utama"
          );
        }

        setStats({
          total_laporan_masuk: Number(result?.data?.total_laporan_masuk) || 0,
          total_korban: Number(result?.data?.total_korban) || 0,
          total_kejadian: Number(result?.data?.total_kejadian) || 0,
          last_update: result?.data?.last_update || null,
        });
      } catch (error) {
        console.error(error);
        setStats(defaultStats);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <main className={styles.page}>
      <Navbar />

      <section className={styles.hero}>
        <div className={styles.heroBg} />

        <div className={styles.heroInner}>
          <div>
            <h1 className={styles.heroTitle}>
              Laporkan & Monitoring Bencana Kota Malang
            </h1>

            <p className={styles.heroDesc}>
              SENTRY adalah platform pelaporan dan monitoring bencana untuk
              membantu masyarakat dan pemerintah merespon kejadian secara cepat
              dan transparan.
            </p>

            <div className={styles.heroActions}>
              <a className={styles.btnPrimary} href="/kirim-laporan">
                <span className={styles.btnIcon}>📣</span>
                Laporkan Bencana
              </a>

              <a className={styles.btnSecondary} href="/prakiraan-cuaca">
                <span className={styles.btnIcon}>🌦️</span>
                Prakiraan Cuaca
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Tentang SENTRY</h2>

          <p className={styles.sectionSub}>
            Sistem pelaporan dan monitoring bencana yang membantu masyarakat
            menyampaikan informasi kejadian secara cepat.
          </p>

          <div className={styles.cardGrid}>
            <div className={styles.card}>
              <div className={styles.cardIcon}>📌</div>

              <div>
                <div className={styles.cardTitle}>Pelaporan Bencana Online</div>
                <div className={styles.cardDesc}>
                  Masyarakat dapat melaporkan kejadian bencana dengan data
                  lokasi, kronologi, dan foto kejadian.
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardIcon}>🧾</div>

              <div>
                <div className={styles.cardTitle}>
                  Monitoring Kejadian Bencana
                </div>
                <div className={styles.cardDesc}>
                  Data laporan dapat dipantau untuk membantu proses identifikasi
                  dan penanganan.
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardIcon}>📍</div>

              <div>
                <div className={styles.cardTitle}>
                  Informasi Kebencanaan Publik
                </div>
                <div className={styles.cardDesc}>
                  Menyediakan informasi kebencanaan agar masyarakat lebih siap
                  dan waspada.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.sectionAlt}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Statistik Kejadian</h2>

          <p className={styles.sectionSub}>
            Informasi terkini tentang kejadian bencana yang dilaporkan di Kota
            Malang.
          </p>

          <div className={styles.statGrid}>
            <div className={styles.statCard}>
              <div className={styles.statTop}>
                <span className={styles.statIcon}>📄</span>
                <span className={styles.statNumber}>
                  {loading ? "..." : stats.total_laporan_masuk}
                </span>
              </div>

              <div className={styles.statLabel}>Total Laporan Masuk</div>

              <div className={styles.statMeta}>
                Terakhir update {formatDate(stats.last_update)}
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statTop}>
                <span className={styles.statIcon}>👤</span>
                <span className={styles.statNumber}>
                  {loading ? "..." : stats.total_korban}
                </span>
              </div>

              <div className={styles.statLabel}>Total Korban</div>

              <div className={styles.statMeta}>
                Terakhir update {formatDate(stats.last_update)}
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statTop}>
                <span className={styles.statIcon}>📊</span>
                <span className={styles.statNumber}>
                  {loading ? "..." : stats.total_kejadian}
                </span>
              </div>

              <div className={styles.statLabel}>Total Keseluruhan Kejadian</div>

              <div className={styles.statMeta}>
                Terakhir update {formatDate(stats.last_update)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        SENTRY © 2026. All rights reserved.
      </footer>
    </main>
  );
}