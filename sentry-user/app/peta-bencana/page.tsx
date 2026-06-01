'use client'

import dynamic from 'next/dynamic'

import Navbar from '../components/navbar'

import styles from '../page.module.css'

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

    <>

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

        <section
          style={{
            paddingTop: '140px',
            textAlign: 'center'
          }}
        >

          <h1
            style={{
              fontSize: '72px',
              fontWeight: 800,
              color: '#1e3a8a',
              marginBottom: '20px'
            }}
          >
            Peta Sebaran Bencana
          </h1>

          <p
            style={{
              fontSize: '20px',
              color: '#334155',
              maxWidth: '900px',
              margin: '0 auto',
              lineHeight: 1.8
            }}
          >
            Monitoring lokasi laporan bencana masyarakat Kota Malang
            secara real-time berdasarkan data pelaporan HUMINT.
          </p>

        </section>

        {/* =========================
            MAP SECTION
        ========================= */}

        <section
          style={{
            width: '100%',
            maxWidth: '1400px',
            margin: '60px auto',
            paddingBottom: '80px'
          }}
        >

          <DisasterMap />

        </section>

      </main>

      {/* =========================
          FOOTER
      ========================= */}

      <footer
        style={{
          width: '100%',
          background: '#2563eb',
          color: 'white',
          textAlign: 'center',
          padding: '24px',
          fontWeight: 600
        }}
      >
        SENTRY © 2026. All rights reserved.
      </footer>

    </>
  )
}