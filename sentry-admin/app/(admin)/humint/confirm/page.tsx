'use client'

import React from 'react'
import styles from './confirm.module.css'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Import MapView secara dinamis untuk menghindari error SSR
const MapView = dynamic(() => import('../../../components/MapView'), { 
  ssr: false,
  loading: () => <div style={{ height: '200px', background: '#1a1a1e', borderRadius: '12px' }} /> 
});

export default function KonfirmasiLaporan() {
  return (
    <div className={styles.container}>
      {/* HEADER - Button Atas Dihapus */}
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.topNav}>
             <Link href="/humint/addreport" className={styles.backLink}>‹ Kembali ke Form Input</Link>
          </div>
          <h1>KONFIRMASI PENERBITAN LAPORAN</h1>
          <p>Tinjau kembali lokasi dan data assessment sebelum dipublikasikan.</p>
        </div>
      </header>

      <main className={styles.content}>
        
        {/* ROW 1: PELAPOR & OPERASIONAL */}
        <div className={styles.topGrid}>
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>👤 DATA PELAPOR</div>
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.infoRow}><span className={styles.label}>Nama</span><span className={styles.value}>Rifcha Sya'bani</span></div>
              <div className={styles.infoRow}><span className={styles.label}>Kontak</span><span className={styles.value}>0812 3456 7890</span></div>
              <div className={styles.infoRow}><span className={styles.label}>Alamat</span><span className={styles.value}>Lowokwaru, Kota Malang</span></div>
            </div>
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>⚙️ OPERASIONAL BPBD</div>
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.infoRow}><span className={styles.label}>Status</span><span className={styles.statusBadge}>TERVERIFIKASI</span></div>
              <div className={styles.infoRow}><span className={styles.label}>TRC</span><span className={styles.value}>Regu TRC-01 Alpha</span></div>
              <div className={styles.infoRow}><span className={styles.label}>Action</span><span className={styles.value}>Evakuasi & Monitoring</span></div>
            </div>
          </section>
        </div>

        {/* ROW 2: DETAIL KEJADIAN, MAPS & FOTO */}
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>🚨 DETAIL KEJADIAN & VERIFIKASI LOKASI</div>
          </div>
          <div className={styles.eventGrid}>
            <div className={styles.eventInfo}>
              <div className={styles.mainInfo}>
                <h2>Banjir</h2>
                <span>Banjir Genangan</span>
              </div>
              <div className={styles.subInfo}>
                <div className={styles.infoRow}><span className={styles.label}>Waktu</span><span className={styles.value}>26 Februari 2026 - 14:00</span></div>
                <div className={styles.infoRow}><span className={styles.label}>Lokasi</span><span className={styles.value}>Jl. Kalijurang, Malang</span></div>
                <div className={styles.infoRow}><span className={styles.label}>Koordinat</span><span className={styles.value}>-7.981900, 112.626500</span></div>
              </div>
              {/* MAPS DITAMBAHKAN DI SINI */}
              <div className={styles.mapWrapper}>
                <MapView />
              </div>
            </div>
            <div className={styles.eventMedia}>
              <div className={styles.photoBox}>
                <img src="https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28" alt="Evidence" />
              </div>
              <div className={styles.mediaCaption}>Foto Kejadian</div>
            </div>
          </div>
        </section>

        {/* ROW 3: ASSESSMENT & KORBAN */}
        <div className={styles.bottomGrid}>
          <div className={styles.leftCol}>
            <section className={styles.sectionCard}>
              <div className={styles.sectionHeader}><div className={styles.sectionTitle}>📝 KRONOLOGI</div></div>
              <div className={styles.sectionBody}>
                <p className={styles.longText}>Air meluap akibat hujan deras sejak pagi, menyebabkan banjir genangan setinggi lutut di Jl. Kalijurang, Malang. Beberapa warga terpaksa mengungsi karena air sudah masuk hingga ke dalam rumah.</p>
              </div>
            </section>

            <section className={styles.sectionCard}>
              <div className={styles.sectionHeader}><div className={styles.sectionTitle}>📊 ASSESSMENT DAMPAK</div></div>
              <div className={styles.sectionBody}>
                <div className={styles.infoRow}><span className={styles.label}>Kerusakan</span><span className={styles.value}>Rumah warga terendam air 1m</span></div>
                <div className={styles.infoRow}><span className={styles.label}>Terdampak</span><span className={styles.value}>15 KK / 45 Jiwa</span></div>
                <div className={styles.infoRow}><span className={styles.label}>Penyebab</span><span className={styles.value}>Drainase tersumbat</span></div>
              </div>
            </section>
          </div>

          <div className={styles.rightCol}>
            <section className={styles.sectionCard}>
              <div className={styles.sectionHeader}><div className={styles.sectionTitle}>👥 DATA KORBAN</div></div>
              <div className={styles.sectionBody}>
                <div className={styles.statLine}><span>🚑 Meninggal</span><strong>0</strong></div>
                <div className={styles.statLine}><span>🏥 Luka-luka</span><strong>5</strong></div>
                <div className={styles.statLine}><span>🔍 Hilang</span><strong>0</strong></div>
                <div className={styles.totalLine}><span>Total Korban</span><span>5 Jiwa</span></div>
              </div>
            </section>

            <div className={styles.warningCard}>
              <div className={styles.warningHeader}>⚠️ PERHATIAN</div>
              <p>Pastikan data yang diisi sudah sesuai dengan kondisi nyata dilapangan</p>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className={styles.footerActions}>
           <Link href="/humint/addreport" className={styles.btnSecondary}>Edit Kembali</Link>
           <button className={styles.btnPrimary}>Kirim Laporan</button>
        </div>
      </main>
    </div>
  )
}