'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import styles from './addreport.module.css'
import LocationSearch from './LocationSearch'
import Link from 'next/link'

const MapPicker = dynamic(() => import('./MapPicker'), { 
  ssr: false,
  loading: () => <div style={{ height: '450px', background: '#111', borderRadius: '12px' }} />
})

export default function AddReportAdmin() {
  const router = useRouter()

  const [position, setPosition] = useState<any>([-7.9819, 112.6265])
  const [lat, setLat] = useState<number>(-7.9819)
  const [lng, setLng] = useState<number>(112.6265)
  const [selectedKec, setSelectedKec] = useState('')

  /* ✅ DATA KORBAN */
  const [korban, setKorban] = useState({
    anakL: 0,
    dewasaL: 0,
    lansiaL: 0,
    anakP: 0,
    dewasaP: 0,
    lansiaP: 0
  })

  const totalKorban =
    korban.anakL + korban.dewasaL + korban.lansiaL +
    korban.anakP + korban.dewasaP + korban.lansiaP

  const handleConfirmNavigate = () => {
    router.push('/humint/confirm')
  }

  return (
    <div className={styles.container}>

      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <h1>TAMBAH LAPORAN HUMINT</h1>
          <p>Portal Admin: Input & Assessment Data Kejadian Bencana</p>
        </div>
        <Link href="/humint">
          <button className={styles.btnBack}>← Kembali</button>
        </Link>
      </header>

      {/* GRID ATAS: 3 KOLOM SEJAJAR TINGGI */}
      <div className={styles.topGrid}>
        
        {/* KOLOM 1: PELAPOR & OPERASIONAL */}
        <div className={styles.column}>
          <div className={styles.card}>
            <h3>Informasi Pelapor</h3>
            <div className={styles.rowFields}>
              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>Nama Pelapor</label>
                <input type="text" placeholder="Nama asli pelapor" />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>Nomor HP</label>
                <input type="tel" placeholder="08..." />
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Alamat Rumah Pelapor</label>
              <textarea placeholder="Alamat lengkap pelapor..." rows={3} />
            </div>
          </div>

          <div className={styles.card}>
  <h3>Operasional BPBD</h3>

        <div className={styles.fieldGroup}>
          <div className={styles.inputGroupVertical}>
            <label className={styles.fieldLabel}>Status Laporan</label>
            <select className={styles.selectField}>
              <option>Menunggu Verifikasi</option>
              <option>Terverifikasi</option>
              <option>Sedang Ditangani</option>
            </select>
          </div>

              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>Penugasan Petugas</label>
                <input type="text" placeholder="Nama regu..." />
              </div>
            </div>
          </div>
        </div>

        {/* KOLOM 2: DETAIL KEJADIAN (FULL HEIGHT) */}
        <div className={styles.column}>
          <div className={styles.card} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3>Detail Kejadian Bencana</h3>
            <div className={styles.rowFields}>
              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>Jenis Bencana</label>
                <select>
                  <option>Banjir</option>
                  <option>Tanah Longsor</option>
                  <option>Cuaca Ekstrem</option>
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>Waktu Kejadian</label>
                <input type="datetime-local" />
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Nama Kejadian Spesifik</label>
              <select>
                <option>Pilih kejadian...</option>
                <option>Banjir Bandang</option>
                <option>Tanah Longsor</option>
              </select>
            </div>
            <div className={styles.inputGroup} style={{ flexGrow: 1 }}>
              <label className={styles.fieldLabel}>Kronologi Kejadian</label>
              <textarea 
                className={styles.textAreaFull}
                placeholder="Uraikan laporan lengkap masyarakat secara detail di sini..." 
              />
            </div>
          </div>
        </div>

        {/* KOLOM 3: WILAYAH & ASSESSMENT */}
        <div className={styles.column}>
          <div className={styles.card}>
            <h3>Administrasi Wilayah</h3>
            <div className={styles.rowFields}>
              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>Kecamatan</label>
                <select onChange={(e) => setSelectedKec(e.target.value)}>
                  <option value="">Pilih...</option>
                  <option value="1">Lowokwaru</option>
                  <option value="2">Klojen</option>
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>Kelurahan</label>
                <select disabled={!selectedKec}>
                  <option>Pilih Kelurahan...</option>
                </select>
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Kategori Lokasi</label>
              <select>
                <option>Pemukiman Warga</option>
                <option>Jalan Raya</option>
                <option>Fasilitas Umum</option>
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Alamat Lengkap Kejadian</label>
              <textarea placeholder="Detail lokasi (Jl, RT/RW)..." rows={2} />
            </div>
          </div>

          <div className={styles.card}>
            <h3>Assessment Dampak</h3>
            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Kerusakan Bangunan</label>
              <textarea placeholder="Deskripsi kerusakan..." rows={2} />
            </div>
            <div className={styles.rowFields}>
              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>Terdampak</label>
                <input type="text" placeholder="Contoh: 15 KK" />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>Penyebab</label>
                <input type="text" placeholder="Faktor penyebab..." />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DATA KORBAN */}
<div className={styles.card} style={{ marginTop: '20px' }}>
  <h3>Data Korban</h3>

  <div className={styles.inputGroup}>
    <label>Pilih jenis korban yang ingin diisi</label>
    <select>
      <option>Luka/Sakit</option>
      <option>Meninggal</option>
      <option>Mengungsi</option>
      <option>Hilang</option>
    </select>
  </div>

  <div className={styles.korbanTable}>
    <div className={styles.korbanHead}>
      <div>Gender</div>
      <div>Anak (0-17 tahun)</div>
      <div>Dewasa (18-59 tahun)</div>
      <div>Lansia (≥ 60 tahun)</div>
    </div>

    <div className={styles.korbanRow}>
      <div className={styles.korbanLabel}>Laki-laki</div>
      <input
        type="number"
        value={korban.anakL}
        onChange={(e) => setKorban({ ...korban, anakL: +e.target.value })}
      />
      <input
        type="number"
        value={korban.dewasaL}
        onChange={(e) => setKorban({ ...korban, dewasaL: +e.target.value })}
      />
      <input
        type="number"
        value={korban.lansiaL}
        onChange={(e) => setKorban({ ...korban, lansiaL: +e.target.value })}
      />
    </div>

    <div className={styles.korbanRow}>
      <div className={styles.korbanLabel}>Perempuan</div>
      <input
        type="number"
        value={korban.anakP}
        onChange={(e) => setKorban({ ...korban, anakP: +e.target.value })}
      />
      <input
        type="number"
        value={korban.dewasaP}
        onChange={(e) => setKorban({ ...korban, dewasaP: +e.target.value })}
      />
      <input
        type="number"
        value={korban.lansiaP}
        onChange={(e) => setKorban({ ...korban, lansiaP: +e.target.value })}
      />
    </div>

    <div className={styles.totalText}>
      Total: <strong>{totalKorban} Orang</strong>
    </div>
  </div>
</div>

<div className={styles.fullWidthCard}>
  <div className={styles.card}>
    <h2 className={styles.cardTitle}>Tindakan Nyata (Real Action)</h2>
    <div className={styles.actionGroup}>
      <label className={styles.fieldLabel}>TINDAK LANJUT PETUGAS</label>
      <textarea 
        className={styles.textAreaAction}
        placeholder="Jelaskan tindakan yang telah diambil oleh tim di lapangan secara detail..."
      ></textarea>
    </div>
  </div>
</div>

      {/* SECTION BAWAH: MAPS & MEDIA (SEJAJAR) */}
      <div className={styles.bottomSection}>
        <div className={styles.card}>
          <div className={styles.mapHeader}>
            <h3>Verifikasi Geospasial & Dokumentasi</h3>
          </div>
          
          <div className={styles.mapContentGrid}>
            <div className={styles.mapWrapper}>
              <div className={styles.searchInside}>
                <label className={styles.fieldLabel}>Cari Lokasi Spesifik</label>
                <LocationSearch onSelect={(item: any) => {
                  const lt = parseFloat(item.lat); const ln = parseFloat(item.lon)
                  setPosition([lt, ln]); setLat(lt); setLng(ln)
                }} />
              </div>

              <div className={styles.mapFrame}>
                <MapPicker position={position} />
                <div className={styles.floatingCoords}>
                  <div className={styles.coordItem}>
                    <small>LATITUDE</small>
                    <span>{lat.toFixed(6)}</span>
                  </div>
                  <div className={styles.coordDivider} />
                  <div className={styles.coordItem}>
                    <small>LONGITUDE</small>
                    <span>{lng.toFixed(6)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.mediaSide}>
              <div className={styles.uploadVertical}>
                <div className={styles.uploadBox}>
                  <div className={styles.boxContent}>
                    <span className={styles.boxIcon}></span>
                    <label className={styles.fieldLabel} style={{color: '#3b82f6'}}>FOTO KEJADIAN UTAMA</label>
                    <p>Klik atau Seret Foto ke Sini</p>
                  </div>
                  <input type="file" accept="image/*" />
                </div>
                <div className={styles.uploadBox}>
                  <div className={styles.boxContent}>
                    <span className={styles.boxIcon}></span>
                    <label className={styles.fieldLabel} style={{color: '#3b82f6'}}>FOTO BUKTI KERUSAKAN</label>
                    <p>Klik atau Seret Foto ke Sini</p>
                  </div>
                  <input type="file" multiple accept="image/*" />
                </div>
              </div>
              <button className={styles.btnConfirm} onClick={handleConfirmNavigate}>
                LANJUTKAN KE KONFIRMASI
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}