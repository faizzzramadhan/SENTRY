'use client'

import dynamic from 'next/dynamic'

import Navbar from '../components/navbar'

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

      <main

        style={{

          minHeight:
            '100vh',

          background:
            '#eef2ff',

          color:
            '#1e293b',

          paddingTop:
            '120px',

          paddingBottom:
            '80px'
        }}
      >

        {/* =========================
            HERO
        ========================= */}

        <section

          style={{

            textAlign:
              'center',

            marginBottom:
              '60px',

            padding:
              '0 20px'
          }}
        >

          <h1

            style={{

              fontSize:
                '72px',

              fontWeight:
                900,

              color:
                '#1f2a52',

              margin:
                '0 0 24px 0',

              letterSpacing:
                '1px',

              lineHeight:
                1.1
            }}
          >

            Peta Sebaran Bencana

          </h1>

          <p

            style={{

              fontSize:
                '20px',

              fontWeight:
                600,

              color:
                '#475569',

              maxWidth:
                '920px',

              margin:
                '0 auto',

              lineHeight:
                1.8
            }}
          >

            Monitoring lokasi laporan bencana masyarakat Kota Malang
            berdasarkan data pelaporan HUMINT.

          </p>

        </section>

        {/* =========================
            MAP SECTION
        ========================= */}

        <section

          style={{

            width:
              '100%',

            maxWidth:
              '1500px',

            margin:
              '0 auto',

            padding:
              '0 32px'
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

          width:
            '100%',

          background:
            '#2563eb',

          color:
            'white',

          textAlign:
            'center',

          padding:
            '24px',

          fontWeight:
            600
        }}
      >

        SENTRY © 2026. All rights reserved.

      </footer>

    </>
  )
}