'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/navbar'
import styles from './confirm.module.css'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/humint'

const JENIS_KORBAN_LABEL: Record<string, string> = {
  TIDAK_ADA: 'Tidak Ada Korban',
  TERDAMPAK: 'Terdampak',
  MENINGGAL: 'Meninggal',
  HILANG: 'Hilang',
  MENGUNGSI: 'Mengungsi',
  LUKA_SAKIT: 'Luka/Sakit',
}

export default function ConfirmKirimLaporanPage() {
  const router = useRouter()
  const [draft, setDraft] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successData, setSuccessData] = useState<any>(null)

  useEffect(() => {
    const saved = sessionStorage.getItem('draft_laporan_user')

    if (!saved) {
      alert('Data laporan belum ada. Silakan isi form terlebih dahulu.')
      router.push('/kirim-laporan')
      return
    }

    setDraft(JSON.parse(saved))
  }, [router])

  const base64ToFile = async (base64: string, filename: string) => {
    const res = await fetch(base64)
    const blob = await res.blob()
    return new File([blob], filename, { type: blob.type })
  }

  const handleEdit = () => {
    router.push('/kirim-laporan')
  }

  const handleKirim = async () => {
    if (!draft) return

    try {
      setLoading(true)

      const formData = new FormData()
      const form = draft.form

      Object.entries(form).forEach(([key, value]: any) => {
        if (key !== 'id_bencana') {
          formData.append(key, value || '')
        }
      })

      formData.append('jenis_laporan', draft.jenis_laporan || '')
      formData.append('latitude', String(draft.lat ?? ''))
      formData.append('longitude', String(draft.lng ?? ''))
      formData.append('foto_kejadian_source', draft.foto_kejadian_source || 'FILE_UPLOAD')
      formData.append(
        'is_camera_capture',
        draft.is_camera_capture === true ? 'true' : 'false'
      )
      formData.append('foto_captured_at', draft.foto_captured_at || '')

      const bolehKirimFallbackGps = draft.foto_kejadian_source === 'WEB_CAMERA'

      formData.append(
        'browser_gps_lat',
        bolehKirimFallbackGps &&
          draft.browser_gps_lat !== null &&
          draft.browser_gps_lat !== undefined
          ? String(draft.browser_gps_lat)
          : ''
      )

      formData.append(
        'browser_gps_lng',
        bolehKirimFallbackGps &&
          draft.browser_gps_lng !== null &&
          draft.browser_gps_lng !== undefined
          ? String(draft.browser_gps_lng)
          : ''
      )

      formData.append(
        'browser_latitude',
        bolehKirimFallbackGps &&
          draft.browser_gps_lat !== null &&
          draft.browser_gps_lat !== undefined
          ? String(draft.browser_gps_lat)
          : ''
      )

      formData.append(
        'browser_longitude',
        bolehKirimFallbackGps &&
          draft.browser_gps_lng !== null &&
          draft.browser_gps_lng !== undefined
          ? String(draft.browser_gps_lng)
          : ''
      )

      formData.append(
        'browser_accuracy',
        bolehKirimFallbackGps &&
          draft.browser_gps_accuracy !== null &&
          draft.browser_gps_accuracy !== undefined
          ? String(draft.browser_gps_accuracy)
          : ''
      )

      const jumlahKorban =
        draft.jenis_laporan === 'ASSESSMENT'
          ? Number(form.jumlah_korban_identifikasi || 0)
          : 0

      const jenisKorban =
        draft.jenis_laporan === 'ASSESSMENT'
          ? form.jenis_korban || 'TIDAK_ADA'
          : 'TIDAK_ADA'

      const korbanPayload =
        draft.jenis_laporan === 'ASSESSMENT' && jumlahKorban > 0
          ? [
              {
                jenis_korban: jenisKorban,
                jenis_kelamin: 'TIDAK_DIKETAHUI',
                kelompok_umur: 'TIDAK_DIKETAHUI',
                jumlah: jumlahKorban,
              },
            ]
          : []

      formData.append('jenis_korban', jenisKorban)
      formData.append('korban', JSON.stringify(korbanPayload))
      formData.append('detail_korban', JSON.stringify(korbanPayload))
      formData.append('total_korban', String(jumlahKorban))

      if (draft.fotoKejadianBase64) {
        const file = await base64ToFile(
          draft.fotoKejadianBase64,
          'foto-kejadian.jpg'
        )
        formData.append('foto_kejadian', file)
      }

      if (
        draft.jenis_laporan === 'ASSESSMENT' &&
        draft.fotoKerusakanBase64?.length > 0
      ) {
        for (let i = 0; i < draft.fotoKerusakanBase64.length; i++) {
          const file = await base64ToFile(
            draft.fotoKerusakanBase64[i],
            `foto-kerusakan-${i + 1}.jpg`
          )
          formData.append('foto_kerusakan', file)
        }
      }

      const res = await fetch(`${API_URL}/user/add-report`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Gagal mengirim laporan')
      }

      const laporanId = data.laporan_id
      const nomorLaporan =
        data.nomor_laporan ||
        (laporanId ? `LAP-${String(laporanId).padStart(4, '0')}` : '-')
      const cekStatusUrl = data.cek_status_url || `/cek-status?id=${laporanId}`

      sessionStorage.removeItem('draft_laporan_user')
      setSuccessData({
        laporan_id: laporanId,
        nomor_laporan: nomorLaporan,
        cek_status_url: cekStatusUrl,
      })
      setShowSuccess(true)
    } catch (error: any) {
      alert(error.message || 'Gagal mengirim laporan')
    } finally {
      setLoading(false)
    }
  }

  if (!draft) {
    return (
      <main className={styles.mainWrapper}>
        <Navbar />
        <div className={styles.container}>
          <p>Memuat data konfirmasi...</p>
        </div>
      </main>
    )
  }

  const form = draft.form

  return (
    <main className={styles.mainWrapper}>
      <Navbar />

      {showSuccess && (
        <div className={styles.popupOverlay}>
          <div className={styles.popupCard}>
            <div className={styles.popupIcon}>✓</div>
            <h2>Laporan Berhasil Dikirim</h2>
            <p>Terima kasih. Laporan Anda sudah masuk ke sistem SENTRY.</p>

            <div className={styles.reportIdBox}>
              <span>ID Laporan Anda</span>
              <strong>{successData?.nomor_laporan || successData?.laporan_id || '-'}</strong>
              <small>Gunakan ID ini untuk mengecek status laporan.</small>
            </div>

            <div className={styles.popupActions}>
              <button
                type="button"
                className={styles.btnPopupSecondary}
                onClick={() => router.push('/')}
              >
                Ke Beranda
              </button>

              <button
                type="button"
                className={styles.btnPopupPrimary}
                onClick={() =>
                  router.push(
                    successData?.cek_status_url ||
                      `/cek-status?id=${successData?.laporan_id || ''}`
                  )
                }
              >
                Cek Status
              </button>
            </div>
          </div>
        </div>
      )}

      <section className={styles.mainContent}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <button
              type="button"
              onClick={handleEdit}
              className={styles.backButton}
            >
              ← Kembali ke Form
            </button>

            <h1>Konfirmasi Pengiriman Laporan</h1>
            <p>
              Periksa kembali data laporan Anda sebelum dikirim ke sistem.
            </p>
          </div>

          <div className={styles.contentGrid}>
            <div className={styles.confirmCard}>
              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <span>Informasi Pelapor</span>
                </div>

                <div className={styles.sectionBody}>
                  <div className={styles.infoRow}>
                    <span className={styles.label}>Jenis Laporan</span>
                    <span className={styles.badge}>
                      {draft.jenis_laporan === 'ASSESSMENT'
                        ? 'Assessment'
                        : 'Non Assessment'}
                    </span>
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.label}>Nama Pelapor</span>
                    <span className={styles.value}>
                      {form.nama_pelapor || '-'}
                    </span>
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.label}>Nomor HP</span>
                    <span className={styles.value}>{form.no_hp || '-'}</span>
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.label}>Alamat Pelapor</span>
                    <span className={styles.value}>
                      {form.alamat_pelapor || '-'}
                    </span>
                  </div>
                </div>
              </section>

              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <span>Detail Kejadian</span>
                </div>

                <div className={styles.sectionBody}>
                  <div className={styles.infoRow}>
                    <span className={styles.label}>Jenis Bencana</span>
                    <span className={styles.value}>
                      {draft.selectedJenisName || '-'}
                    </span>
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.label}>Waktu Kejadian</span>
                    <span className={styles.value}>
                      {form.waktu_kejadian || '-'}
                    </span>
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.label}>Jenis Lokasi</span>
                    <span className={styles.value}>
                      {form.jenis_lokasi || '-'}
                    </span>
                  </div>

                  <div className={styles.fullInfo}>
                    <span className={styles.label}>Kronologi</span>
                    <p>{form.kronologi || '-'}</p>
                  </div>
                </div>
              </section>

              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <span>Lokasi Kejadian</span>
                </div>

                <div className={styles.sectionBody}>
                  <div className={styles.infoRow}>
                    <span className={styles.label}>Kecamatan</span>
                    <span className={styles.value}>
                      {draft.selectedKecamatanName || '-'}
                    </span>
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.label}>Kelurahan</span>
                    <span className={styles.value}>
                      {draft.selectedKelurahanName || '-'}
                    </span>
                  </div>

                  <div className={styles.fullInfo}>
                    <span className={styles.label}>Alamat Lengkap</span>
                    <p>{form.alamat_lengkap_kejadian || '-'}</p>
                  </div>

                  <div className={styles.coordBox}>
                    <div>
                      <small>Latitude Laporan</small>
                      <strong>{draft.lat ?? '-'}</strong>
                    </div>
                    <div>
                      <small>Longitude Laporan</small>
                      <strong>{draft.lng ?? '-'}</strong>
                    </div>
                  </div>

                  <div className={styles.coordBox}>
                    <div>
                      <small>Fallback GPS Kamera Web Latitude</small>
                      <strong>
                        {draft.browser_gps_lat !== null &&
                        draft.browser_gps_lat !== undefined
                          ? draft.browser_gps_lat
                          : '-'}
                      </strong>
                    </div>
                    <div>
                      <small>Fallback GPS Kamera Web Longitude</small>
                      <strong>
                        {draft.browser_gps_lng !== null &&
                        draft.browser_gps_lng !== undefined
                          ? draft.browser_gps_lng
                          : '-'}
                      </strong>
                    </div>
                  </div>
                </div>
              </section>

              {draft.jenis_laporan === 'ASSESSMENT' && (
                <section className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <span>Data Assessment</span>
                  </div>

                  <div className={styles.sectionBody}>
                    <div className={styles.infoRow}>
                      <span className={styles.label}>Jenis Korban</span>
                      <span className={styles.value}>
                        {JENIS_KORBAN_LABEL[form.jenis_korban] || '-'}
                      </span>
                    </div>

                    <div className={styles.infoRow}>
                      <span className={styles.label}>Jumlah Korban</span>
                      <span className={styles.value}>
                        {form.jumlah_korban_identifikasi || 0} Orang
                      </span>
                    </div>

                    <div className={styles.fullInfo}>
                      <span className={styles.label}>Kerusakan</span>
                      <p>{form.kerusakan_identifikasi || '-'}</p>
                    </div>

                    <div className={styles.infoRow}>
                      <span className={styles.label}>Terdampak</span>
                      <span className={styles.value}>
                        {form.terdampak_identifikasi || '-'}
                      </span>
                    </div>

                    <div className={styles.infoRow}>
                      <span className={styles.label}>Penyebab</span>
                      <span className={styles.value}>
                        {form.penyebab_identifikasi || '-'}
                      </span>
                    </div>
                  </div>
                </section>
              )}

              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <span>Dokumentasi</span>
                </div>

                <div className={styles.sectionBody}>
                  <div className={styles.photoGrid}>
                    {draft.fotoKejadianBase64 && (
                      <div className={styles.photoCard}>
                        <span>Foto Kejadian</span>
                        <img
                          src={draft.fotoKejadianBase64}
                          alt="Foto kejadian"
                        />
                      </div>
                    )}

                    {draft.jenis_laporan === 'ASSESSMENT' &&
                      draft.fotoKerusakanBase64?.map(
                        (src: string, index: number) => (
                          <div className={styles.photoCard} key={index}>
                            <span>Foto Kerusakan {index + 1}</span>
                            <img
                              src={src}
                              alt={`Foto kerusakan ${index + 1}`}
                            />
                          </div>
                        )
                      )}
                  </div>
                </div>
              </section>

              <div className={styles.footerActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={handleEdit}
                >
                  Edit Data
                </button>

                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={handleKirim}
                  disabled={loading || showSuccess}
                >
                  {loading ? 'Mengirim...' : 'Kirim Laporan'}
                </button>
              </div>
            </div>

            <aside className={styles.sideCard}>
              <h2>Pastikan Data Benar</h2>
              <p>
                Laporan akan masuk ke sistem SENTRY dan diproses oleh petugas.
              </p>

              <div className={styles.stepBox}>
                <div>
                  <span>1</span>
                  <p>Periksa data pelapor dan kejadian.</p>
                </div>
                <div>
                  <span>2</span>
                  <p>Pastikan lokasi dan foto sesuai kejadian.</p>
                </div>
                <div>
                  <span>3</span>
                  <p>Klik Kirim Laporan jika semua data sudah benar.</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        SENTRY - Sistem Pelaporan Bencana
      </footer>
    </main>
  )
}