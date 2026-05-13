'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/navbar'
import styles from './confirm.module.css'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/humint'

export default function ConfirmKirimLaporanPage() {
  const router = useRouter()
  const [draft, setDraft] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [submittedReportId, setSubmittedReportId] = useState<string>('')

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

      formData.append(
        'browser_gps_lat',
        draft.browser_gps_lat !== null && draft.browser_gps_lat !== undefined
          ? String(draft.browser_gps_lat)
          : ''
      )

      formData.append(
        'browser_gps_lng',
        draft.browser_gps_lng !== null && draft.browser_gps_lng !== undefined
          ? String(draft.browser_gps_lng)
          : ''
      )

      const korbanPayload = Array.isArray(draft.korbanPayload)
        ? draft.korbanPayload.filter((item: any) => Number(item?.jumlah || 0) > 0)
        : []

      const jumlahKorban = korbanPayload.reduce(
        (total: number, item: any) => total + Number(item?.jumlah || 0),
        0
      )

      const jenisKorban =
        korbanPayload.find((item: any) => Number(item?.jumlah || 0) > 0)
          ?.jenis_korban || 'TIDAK_ADA'

      const getJumlahByJenis = (jenis: string) => {
        const found = korbanPayload.find((item: any) => item?.jenis_korban === jenis)
        return Number(found?.jumlah || 0)
      }

      const jumlahTerdampak = getJumlahByJenis('TERDAMPAK')
      const jumlahMeninggal = getJumlahByJenis('MENINGGAL')
      const jumlahHilang = getJumlahByJenis('HILANG')
      const jumlahMengungsi = getJumlahByJenis('MENGUNGSI')
      const jumlahLukaSakit = getJumlahByJenis('LUKA_SAKIT')

      // Data korban masyarakat disimpan langsung pada tabel identifikasi.
      formData.append('jenis_korban', jenisKorban)
      formData.append('jumlah_korban_identifikasi', String(jumlahKorban))
      formData.append('total_korban', String(jumlahKorban))

      formData.append('jumlah_terdampak', String(jumlahTerdampak))
      formData.append('jumlah_meninggal', String(jumlahMeninggal))
      formData.append('jumlah_hilang', String(jumlahHilang))
      formData.append('jumlah_mengungsi', String(jumlahMengungsi))
      formData.append('jumlah_luka_sakit', String(jumlahLukaSakit))

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

      const reportId =
        data?.laporan_id ||
        data?.id_laporan ||
        data?.data?.laporan_id ||
        data?.data?.id_laporan ||
        data?.laporan?.laporan_id ||
        data?.laporan?.id_laporan ||
        ''

      setSubmittedReportId(reportId ? String(reportId) : '')
      sessionStorage.removeItem('draft_laporan_user')
      setShowSuccess(true)

      setTimeout(() => {
        router.push('/')
      }, 6000)
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
  const korbanPayload = Array.isArray(draft.korbanPayload)
    ? draft.korbanPayload.filter((item: any) => Number(item?.jumlah || 0) > 0)
    : []
  const totalKorban = korbanPayload.reduce(
    (total: number, item: any) => total + Number(item?.jumlah || 0),
    0
  )

  const getLabelJenisKorban = (value: string) => {
    const labels: Record<string, string> = {
      TIDAK_ADA: 'Tidak Ada Korban',
      TERDAMPAK: 'Terdampak',
      MENINGGAL: 'Meninggal',
      HILANG: 'Hilang',
      MENGUNGSI: 'Mengungsi',
      LUKA_SAKIT: 'Luka/Sakit',
    }

    return labels[value] || value
  }

  return (
    <main className={styles.mainWrapper}>
      <Navbar />

      {showSuccess && (
        <div className={styles.popupOverlay}>
          <div className={styles.popupCard}>
            <div className={styles.popupIcon}>✓</div>
            <h2>Laporan Berhasil Dikirim</h2>
            <p>Terima kasih. Laporan Anda sudah masuk ke sistem SENTRY.</p>

            {submittedReportId ? (
              <div
                style={{
                  marginTop: 16,
                  padding: '14px 16px',
                  borderRadius: 14,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#0f172a',
                }}
              >
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>
                  ID Laporan untuk cek status
                </div>
                <strong style={{ fontSize: 24, letterSpacing: 1 }}>
                  {submittedReportId}
                </strong>
              </div>
            ) : (
              <p style={{ marginTop: 12 }}>
                ID laporan belum terbaca dari response server. Silakan cek status melalui data laporan terbaru.
              </p>
            )}

            <p style={{ marginTop: 14, fontSize: 14 }}>
              Simpan ID laporan ini untuk mengecek status laporan Anda.
            </p>
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
                      <small>Metadata EXIF - Fallback GPS Browser Latitude</small>
                      <strong>
                        {draft.browser_gps_lat !== null &&
                        draft.browser_gps_lat !== undefined
                          ? draft.browser_gps_lat
                          : '-'}
                      </strong>
                    </div>
                    <div>
                      <small>Metadata EXIF - Fallback GPS Browser Longitude</small>
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
                      <span className={styles.label}>Jumlah Korban</span>
                      <span className={styles.value}>
                        {totalKorban} Orang
                      </span>
                    </div>

                    <div className={styles.fullInfo}>
                      <span className={styles.label}>Rincian Korban</span>
                      {korbanPayload.length > 0 ? (
                        <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                          {korbanPayload.map((item: any) => (
                            <div
                              key={item.jenis_korban}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: 12,
                                padding: '10px 12px',
                                borderRadius: 12,
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              <span>{getLabelJenisKorban(item.jenis_korban)}</span>
                              <strong>{item.jumlah} orang</strong>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>Tidak ada korban.</p>
                      )}
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