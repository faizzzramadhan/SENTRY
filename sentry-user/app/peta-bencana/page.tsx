'use client'

import dynamic from 'next/dynamic'

import Navbar from '../components/navbar'

import styles from './page.module.css'

// =========================
// DYNAMIC IMPORT
// =========================

const DisasterMap = dynamic(
  () => import('../components/DisasterMap'),
  {
    ssr: false
  }
)

// =========================
// PAGE
// =========================

export default function Page() {
  return (
    <div className={styles.page}>

      {/* =========================
          NAVBAR
      ========================= */}

      <Navbar />

      {/* =========================
          MAIN PAGE
      ========================= */}

      <main className={styles.main}>

        {/* =========================
            HERO
        ========================= */}

        <section className={styles.hero}>

          <h1 className={styles.title}>
            Peta Sebaran Bencana
          </h1>

          <p className={styles.description}>
            Monitoring lokasi laporan bencana masyarakat Kota Malang
            berdasarkan data pelaporan HUMINT.
          </p>

        </section>

        {/* =========================
            MAP SECTION
        ========================= */}

        <section className={styles.mapSection}>

          <DisasterMap />

        </section>

      </main>

      {/* =========================
          FOOTER
      ========================= */}

      <footer className={styles.footer}>
        SENTRY © 2026. All rights reserved.
      </footer>

    </div>
  )
}
