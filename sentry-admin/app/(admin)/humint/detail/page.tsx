'use client'

import styles from './detail.module.css'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const MapView = dynamic(() => import('../../../components/MapView'), { 
  ssr: false,
  loading: () => <div style={{ height: '240px', background: '#111', borderRadius: '12px' }} />
})

export default function DetailPage() {
  return (
    <div className={styles.container}>

      {/* HEADER */}
      <div className={styles.header}>
        <h1>DETAIL LAPORAN</h1>

        <div className={styles.actions}>
          <Link href="/humint"><button className={styles.btnBack}>← Kembali</button></Link>
          <button className={styles.btnAction}>⬇ Download</button>
          <Link href="/humint/edit">
            <button className={styles.btnAction} style={{background: '#fff', color: '#000'}}>✏️ Pergi ke Halaman Update</button>
          </Link>
        </div>
      </div>

      {/* TOP INFO BAR */}
      <div className={styles.topInfo}>
        <div className={styles.infoBox}>
          <strong>[LAP-0021]</strong>
          <span className={styles.badge}>Banjir</span>
          <span className={styles.priority}>● Prioritas Tinggi</span>
        </div>

        <div className={styles.infoBox}>
          <label>Status : </label>
          <span className={styles.warning}>Menunggu Verifikasi</span>
        </div>

        <div className={styles.infoBox}>
          <small>Waktu Laporan : 12 Februari 2026 - 14.22</small><br/>
          <small>Waktu Kejadian : 12 Februari 2026 - 14.00</small>
        </div>

        <div className={styles.infoBox}>
          <label>Skor Kredibilitas : </label>
          <span className={styles.success}>Tinggi</span>
        </div>
      </div>

      <div className={styles.grid}>

        {/* KOLOM 1: PELAPOR, KRONOLOGI, DAMPAK */}
        <div className={styles.column}>
          <div className={styles.card}>
            <h3>👤 Informasi Pelapor</h3>
            <div className={styles.customTable}>
              <div className={styles.tableRow}><div className={styles.tableLabel}>Nama Pelapor</div><div className={styles.tableValue}>Arif Samsudin</div></div>
              <div className={styles.tableRow}><div className={styles.tableLabel}>Nomor Telepon</div><div className={styles.tableValue}>081234567890</div></div>
              <div className={styles.tableRow}><div className={styles.tableLabel}>Kecamatan</div><div className={styles.tableValue}>Lowokwaru</div></div>
              <div className={styles.tableRow}><div className={styles.tableLabel}>Kelurahan</div><div className={styles.tableValue}>Tlogomas</div></div>
              <div className={styles.tableRow}><div className={styles.tableLabel}>Jenis Lokasi</div><div className={styles.tableValue}>Pemukiman Warga</div></div>
            </div>
          </div>

          <div className={styles.card}>
            <h3>🕒 Kronologi Kejadian</h3>
            <div className={styles.viewValue}>
              Hujan deras mengguyur wilayah Malang sejak pukul 01.00 WIB. Pukul 02.15 WIB, drainase di Jl. Soekarno Hatta meluap dan mulai masuk ke pemukiman warga di RW 05 dengan ketinggian mencapai 1,5 meter. Warga membutuhkan evakuasi segera karena arus air cukup deras.
            </div>
          </div>

          <div className={styles.card}>
            <h3>📊 Detail Dampak (Identified)</h3>
            <div className={styles.customTable}>
              <div className={styles.tableRow}><div className={styles.tableLabel}>Jumlah Korban</div><div className={styles.tableValue}>12 Orang (Luka Ringan)</div></div>
              <div className={styles.tableRow}><div className={styles.tableLabel}>Kerusakan</div><div className={styles.tableValue}>15 Rumah terendam air dan lumpur</div></div>
              <div className={styles.tableRow}><div className={styles.tableLabel}>Terdampak</div><div className={styles.tableValue}>45 Jiwa / 15 Kartu Keluarga</div></div>
              <div className={styles.tableRow}><div className={styles.tableLabel}>Prakiraan Kerugian</div><div className={styles.tableValue}>Rp 85.000.000</div></div>
              <div className={styles.tableRow}><div className={styles.tableLabel}>Penyebab</div><div className={styles.tableValue}>Curah hujan ekstrem & drainase tersumbat</div></div>
            </div>
          </div>
        </div>

        {/* KOLOM 2: PETA, PETUGAS, DSS */}
        <div className={styles.column}>
          <div className={styles.card}>
            <h3>🗺️ Peta Lokasi</h3>
            <div className={styles.mapFrame}><MapView /></div>
            
            <label className={styles.subLabel}>Administrasi Wilayah</label>
            <div className={styles.viewValue} style={{marginBottom: '10px', background: '#1a1a1e', border: '1px solid #333'}}>
              <strong>Kec. Lowokwaru, Kel. Tlogomas</strong>
            </div>

            <label className={styles.subLabel}>Alamat Lengkap</label>
            <div className={styles.viewValue}>Jl. Soekarno Hatta No.15, Mojolangu, Kota Malang</div>
          </div>

          <div className={styles.card}>
            <h3>👷 Petugas</h3>
            <div className={styles.customTable}>
              <div className={styles.tableRow}><div className={styles.tableLabel}>Puskodal</div><div className={styles.tableValue}>Rifcha Sya'bani F.</div></div>
              <div className={styles.tableRow}><div className={styles.tableLabel}>Tim TRC</div><div className={styles.tableValue}>Regu TRC-01 Alpha</div></div>
            </div>
          </div>

          <div className={styles.card}>
            <h3>⚙️ Tindakan Rekomendasi (DSS)</h3>
            <ul className={styles.dssListPoin}>
              <li>Kirim Tim Reaksi Cepat (TRC) ke lokasi kejadian.</li>
              <li>Prioritaskan evakuasi kelompok rentan (Lansia & Anak).</li>
              <li>Koordinasi lintas sektor dengan Dinas PU Malang.</li>
              <li>Monitoring lanjutan kondisi cuaca radar 24 jam.</li>
            </ul>
          </div>
        </div>

        {/* KOLOM 3: MEDIA, EXIF, OSINT */}
        <div className={styles.column}>
          <div className={styles.card}>
            <h3>📷 Foto Kejadian</h3>
            <div className={styles.imgFrame}>
              <img src="https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28" className={styles.image} alt="Banjir" />
            </div>
            <label className={styles.subLabel}>Metadata EXIF</label>
            <table className={styles.exifTable}>
              <tbody>
                <tr><td>Latitude</td><td>-7.942432</td></tr>
                <tr><td>Longitude</td><td>112.613123</td></tr>
                <tr><td>Validasi Lokasi</td><td style={{color: '#22c55e', fontWeight: 'bold'}}>Cocok dengan GPS</td></tr>
              </tbody>
            </table>
          </div>

          <div className={styles.card}>
            <h3>🌐 Data Pendukung (OSINT)</h3>
            <div className={styles.customTable}>
              <div className={styles.tableRow}><div className={styles.tableLabel}>Sumber</div><div className={styles.tableValue}>X (Twitter)</div></div>
              <div className={styles.tableRow}><div className={styles.tableLabel}>Waktu Unggah</div><div className={styles.tableValue}>12 Feb 2026 – 13:32</div></div>
              <div className={styles.tableRow}><div className={styles.tableLabel}>Isi Konten</div><div className={styles.tableValue}>"Banjir Soehat makin tinggi guys, hati-hati yang lewat sini!"</div></div>
              <div className={styles.tableRow}><div className={styles.tableLabel}>Status Sync</div><div className={styles.tableValue} style={{color: '#22c55e'}}>✓ Terverifikasi</div></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}