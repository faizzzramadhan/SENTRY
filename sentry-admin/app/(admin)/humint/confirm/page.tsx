'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from './confirm.module.css'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/humint'

export default function ConfirmReportPage() {
  const router = useRouter()
  const [draft, setDraft] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const saved = sessionStorage.getItem('draft_laporan_admin')

    if (!saved) {
      alert('Data laporan belum ada. Silakan isi form terlebih dahulu.')
      router.push('/humint/addreport')
      return
    }

    setDraft(JSON.parse(saved))
  }, [router])

  const base64ToFile = async (base64: string, filename: string) => {
    const res = await fetch(base64)
    const blob = await res.blob()
    return new File([blob], filename, { type: blob.type })
  }

  const getBrowserGpsLat = () => {
    return draft?.browser_gps_lat ?? draft?.browser_latitude ?? ''
  }

  const getBrowserGpsLng = () => {
    return draft?.browser_gps_lng ?? draft?.browser_longitude ?? ''
  }

  const handleKirimLaporan = async () => {
    if (!draft) return

    try {
      setLoading(true)

      const formData = new FormData()
      const form = draft.form

      Object.entries(form).forEach(([key, value]: any) => {
        formData.append(key, value || '')
      })

      formData.append('latitude', String(draft.lat ?? ''))
      formData.append('longitude', String(draft.lng ?? ''))

      const browserLat = getBrowserGpsLat()
      const browserLng = getBrowserGpsLng()

      formData.append('browser_latitude', browserLat !== '' ? String(browserLat) : '')
      formData.append('browser_longitude', browserLng !== '' ? String(browserLng) : '')

      formData.append('browser_gps_lat', browserLat !== '' ? String(browserLat) : '')
      formData.append('browser_gps_lng', browserLng !== '' ? String(browserLng) : '')

      formData.append('total_korban', String(draft.totalSemuaKorban || 0))
      formData.append('korban', JSON.stringify(draft.korbanPayload || []))
      formData.append('created_by', draft.created_by || 'staff')

      if (draft.fotoKejadianBase64) {
        const file = await base64ToFile(
          draft.fotoKejadianBase64,
          'foto-kejadian.jpg'
        )
        formData.append('foto_kejadian', file)
      }

      if (draft.fotoKerusakanBase64?.length > 0) {
        for (let i = 0; i < draft.fotoKerusakanBase64.length; i++) {
          const file = await base64ToFile(
            draft.fotoKerusakanBase64[i],
            `foto-kerusakan-${i + 1}.jpg`
          )
          formData.append('foto_kerusakan', file)
        }
      }

      const res = await fetch(`${API_URL}/admin/add-report`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Gagal mengirim laporan')
      }

      sessionStorage.removeItem('draft_laporan_admin')

      alert('Laporan berhasil dikirim')
      router.push('/humint')
    } catch (error: any) {
      alert(error.message || 'Gagal mengirim laporan')
    } finally {
      setLoading(false)
    }
  }

  if (!draft) {
    return (
      <div className={styles.container}>
        <p>Memuat data konfirmasi...</p>
      </div>
    )
  }

  const form = draft.form
  const browserLat = getBrowserGpsLat()
  const browserLng = getBrowserGpsLng()
  const hasBrowserGps = browserLat !== '' && browserLng !== ''

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/humint/addreport" className={styles.backLink}>
          ← Kembali ke Form
        </Link>
        <h1>Konfirmasi Pengiriman Laporan</h1>
        <p>Periksa kembali data laporan sebelum dikirim ke database.</p>
      </header>

      <div className={styles.topGrid}>
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>INFORMASI PELAPOR</span>
          </div>
          <div className={styles.sectionBody}>
            <div className={styles.infoRow}>
              <span className={styles.label}>Nama Pelapor</span>
              <span className={styles.value}>{form.nama_pelapor || '-'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Nomor HP</span>
              <span className={styles.value}>{form.no_hp || '-'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Alamat Pelapor</span>
              <span className={styles.value}>{form.alamat_pelapor || '-'}</span>
            </div>
          </div>
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>OPERASIONAL BPBD</span>
          </div>
          <div className={styles.sectionBody}>
            <div className={styles.infoRow}>
              <span className={styles.label}>Status Laporan</span>
              <span className={styles.statusBadge}>{form.status_laporan || '-'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Petugas TRC</span>
              <span className={styles.value}>{form.petugas_trc || '-'}</span>
            </div>
          </div>
        </section>
      </div>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>DETAIL KEJADIAN</span>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.infoRow}>
            <span className={styles.label}>Jenis Bencana</span>
            <span className={styles.value}>{draft.selectedJenisName || '-'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Nama Kejadian</span>
            <span className={styles.value}>{draft.selectedBencanaName || '-'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Waktu Kejadian</span>
            <span className={styles.value}>{form.waktu_kejadian || '-'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Kronologi</span>
            <span className={styles.value}>{form.kronologi || '-'}</span>
          </div>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>LOKASI KEJADIAN</span>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.infoRow}>
            <span className={styles.label}>Kecamatan</span>
            <span className={styles.value}>{draft.selectedKecamatanName || '-'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Kelurahan</span>
            <span className={styles.value}>{draft.selectedKelurahanName || '-'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Jenis Lokasi</span>
            <span className={styles.value}>{form.jenis_lokasi || '-'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Alamat Lengkap</span>
            <span className={styles.value}>{form.alamat_lengkap_kejadian || '-'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Koordinat Lokasi Kejadian</span>
            <span className={styles.value}>
              {draft.lat ?? '-'}, {draft.lng ?? '-'}
            </span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.label}>Metadata EXIF - Fallback GPS Browser</span>
            <span className={styles.value} style={{ color: hasBrowserGps ? '#facc15' : undefined }}>
              {hasBrowserGps ? `${browserLat}, ${browserLng}` : '-'}
            </span>
          </div>
        </div>
      </section>

      <div className={styles.bottomGrid}>
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>ASSESSMENT DAMPAK</span>
          </div>
          <div className={styles.sectionBody}>
            <div className={styles.infoRow}>
              <span className={styles.label}>Kerusakan</span>
              <span className={styles.value}>{form.kerusakan_identifikasi || '-'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Terdampak</span>
              <span className={styles.value}>{form.terdampak_identifikasi || '-'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Penyebab</span>
              <span className={styles.value}>{form.penyebab_identifikasi || '-'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Tindak Lanjut</span>
              <span className={styles.value}>{form.tindak_lanjut || '-'}</span>
            </div>
          </div>
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>DATA KORBAN</span>
          </div>
          <div className={styles.sectionBody}>
            {(draft.korbanPayload || []).length === 0 ? (
              <p>Tidak ada data korban.</p>
            ) : (
              draft.korbanPayload.map((item: any, index: number) => (
                <div key={index} className={styles.statLine}>
                  <span>
                    {item.jenis_korban} - {item.jenis_kelamin} - {item.kelompok_umur}
                  </span>
                  <strong>{item.jumlah}</strong>
                </div>
              ))
            )}

            <div className={styles.totalLine}>
              <span>Total Korban</span>
              <strong>{draft.totalSemuaKorban || 0} Orang</strong>
            </div>
          </div>
        </section>
      </div>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>DOKUMENTASI</span>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.eventGrid}>
            <div>
              <p className={styles.label}>Foto Kejadian Utama</p>
              {draft.fotoKejadianBase64 ? (
                <div className={styles.photoBox}>
                  <img src={draft.fotoKejadianBase64} alt="Foto kejadian" />
                </div>
              ) : (
                <p>-</p>
              )}
            </div>

            <div>
              <p className={styles.label}>Foto Kerusakan</p>
              {draft.fotoKerusakanBase64?.length > 0 ? (
                draft.fotoKerusakanBase64.map((src: string, index: number) => (
                  <div className={styles.photoBox} key={index} style={{ marginBottom: 12 }}>
                    <img src={src} alt={`Foto kerusakan ${index + 1}`} />
                  </div>
                ))
              ) : (
                <p>-</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className={styles.warningCard}>
        <div className={styles.warningHeader}>PERIKSA DATA SEBELUM DIKIRIM</div>
        <p>
          Setelah tombol Kirim Laporan ditekan, data akan disimpan ke database dan
          tampil di Dashboard HUMINT.
        </p>
      </div>

      <div className={styles.footerActions}>
        <Link href="/humint/addreport" className={styles.btnSecondary}>
          Edit Data
        </Link>

        <button
          className={styles.btnPrimary}
          onClick={handleKirimLaporan}
          disabled={loading}
        >
          {loading ? 'Mengirim...' : 'Kirim Laporan'}
        </button>
      </div>
    </div>
  )
}