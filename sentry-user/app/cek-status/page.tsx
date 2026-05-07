'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Navbar from '../components/navbar'
import styles from './cek-status.module.css'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/humint'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5555'

function formatDate(value?: string | null) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getFileUrl(filename?: string | null) {
  if (!filename) return ''
  if (filename.startsWith('http')) return filename
  return `${BASE_URL}/uploads/${filename}`
}

function normalizeInputId(value: string) {
  return value.trim().replace(/^LAP-/i, '').replace(/^0+/, '')
}

function getStatusLabel(status?: string) {
  if (!status) return 'Menunggu Identifikasi'
  if (status === 'IDENTIFIKASI') return 'Menunggu Identifikasi'
  if (status === 'VERIFIKASI') return 'Dalam Verifikasi'
  if (status === 'TERVERIFIKASI') return 'Terverifikasi'
  if (status === 'DITANGANI' || status === 'PENANGANAN') return 'Sedang Ditangani'
  if (status === 'SELESAI') return 'Selesai'
  return status
}

function getStatusDescription(status?: string) {
  if (status === 'IDENTIFIKASI') {
    return 'Laporan sudah diterima dan sedang menunggu proses identifikasi awal oleh petugas.'
  }

  if (status === 'VERIFIKASI' || status === 'TERVERIFIKASI') {
    return 'Laporan sedang atau sudah melalui proses verifikasi oleh petugas.'
  }

  if (status === 'DITANGANI' || status === 'PENANGANAN') {
    return 'Laporan sedang dalam proses penanganan oleh petugas terkait.'
  }

  if (status === 'SELESAI') {
    return 'Laporan sudah selesai ditangani.'
  }

  return 'Laporan sudah masuk ke sistem SENTRY.'
}

function getStatusClass(status?: string) {
  if (status === 'SELESAI') return styles.statusDone
  if (status === 'DITANGANI' || status === 'PENANGANAN') return styles.statusProcess
  if (status === 'TERVERIFIKASI' || status === 'VERIFIKASI') return styles.statusVerified
  return styles.statusWaiting
}


function mapStatusData(data: any) {
  const status = data?.status_laporan || 'IDENTIFIKASI'

  return {
    ...data,
    status_label: data?.status_label || getStatusLabel(status),
    keterangan_status: data?.keterangan_status || getStatusDescription(status),
    pelapor: data?.pelapor || {
      nama_pelapor: data?.nama_pelapor,
      no_hp: data?.no_hp,
      alamat_pelapor: data?.alamat_pelapor,
    },
    kejadian: data?.kejadian || {
      jenis_laporan: data?.jenis_laporan,
      jenis_bencana: data?.jenis_bencana,
      nama_bencana: data?.nama_bencana,
      kecamatan: data?.kecamatan,
      kelurahan: data?.kelurahan,
      jenis_lokasi: data?.jenis_lokasi,
      latitude: data?.latitude,
      longitude: data?.longitude,
      alamat_lengkap_kejadian: data?.alamat_lengkap_kejadian,
      kronologi: data?.kronologi,
      waktu_kejadian: data?.waktu_kejadian,
      waktu_laporan: data?.waktu_laporan,
    },
    lampiran: data?.lampiran || {
      foto_kejadian: data?.foto_kejadian,
      foto_kerusakan: data?.foto_kerusakan,
    },
    tindak_lanjut: data?.tindak_lanjut || null,
  }
}

export default function CekStatusPage() {
  const searchParams = useSearchParams()
  const queryId = searchParams.get('id') || ''

  const [inputId, setInputId] = useState(queryId)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [detail, setDetail] = useState<any>(null)

  const fotoKerusakanList = useMemo(() => {
    const value = detail?.lampiran?.foto_kerusakan

    if (!value) return []

    return String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }, [detail])

  const fetchStatus = async (id: string) => {
    const cleanedId = normalizeInputId(id)

    if (!cleanedId) {
      setErrorMsg('Masukkan ID laporan terlebih dahulu.')
      setDetail(null)
      return
    }

    try {
      setLoading(true)
      setErrorMsg('')
      setDetail(null)

      const res = await fetch(`${API_BASE_URL}/user/status/${cleanedId}`, {
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
      })

      const text = await res.text()

      if (!text.trim().startsWith('{')) {
        console.error('Response cek status bukan JSON:', text)
        throw new Error('Endpoint cek status tidak mengembalikan JSON. Periksa NEXT_PUBLIC_API_URL.')
      }

      const result = JSON.parse(text)

      if (!res.ok) {
        throw new Error(result.message || 'Status laporan tidak ditemukan')
      }

      setDetail(result.data ? mapStatusData(result.data) : null)
    } catch (error: any) {
      setErrorMsg(error.message || 'Gagal mengambil status laporan')
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (queryId) {
      setInputId(queryId)
      fetchStatus(queryId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryId])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    fetchStatus(inputId)
  }

  return (
    <div className={styles.mainWrapper}>
      <Navbar />

      <main className={styles.mainContent}>
        <div className={styles.container}>
          <section className={styles.pageHeader}>
            <span className={styles.eyebrow}>SENTRY / Cek Status</span>
            <h1>Cek Status Laporan</h1>
            <p>
              Masukkan ID laporan yang kamu dapat setelah berhasil mengirim laporan.
              Contoh format: <strong>LAP-0001</strong> atau cukup angka ID laporannya.
            </p>
          </section>

          <section className={styles.contentGrid}>
            <div className={styles.formCard}>
              <form className={styles.searchForm} onSubmit={handleSubmit}>
                <div className={styles.inputGroup}>
                  <label htmlFor="laporanId">ID Laporan</label>
                  <input
                    id="laporanId"
                    value={inputId}
                    onChange={(event) => setInputId(event.target.value)}
                    placeholder="Contoh: LAP-0001"
                  />
                </div>

                <button className={styles.btnSubmit} type="submit" disabled={loading}>
                  {loading ? 'Mengecek...' : 'Cek Status'}
                </button>
              </form>

              {errorMsg ? <div className={styles.errorBox}>{errorMsg}</div> : null}

              {detail ? (
                <div className={styles.resultWrap}>
                  <div className={styles.statusHero}>
                    <div>
                      <span className={styles.reportCode}>{detail.nomor_laporan}</span>
                      <h2>{detail.status_label}</h2>
                      <p>{detail.keterangan_status}</p>
                    </div>
                    <span className={`${styles.statusBadge} ${getStatusClass(detail.status_laporan)}`}>
                      {detail.status_label}
                    </span>
                  </div>

                  <div className={styles.infoGrid}>
                    <InfoCard label="Waktu Laporan" value={formatDate(detail.waktu_laporan)} />
                    <InfoCard label="Waktu Kejadian" value={formatDate(detail.waktu_kejadian)} />
                    <InfoCard label="Jenis Laporan" value={detail.kejadian?.jenis_laporan || '-'} />
                  </div>

                  <DetailSection title="Data Pelapor">
                    <InfoRow label="Nama" value={detail.pelapor?.nama_pelapor} />
                    <InfoRow label="No HP" value={detail.pelapor?.no_hp} />
                    <InfoRow label="Alamat" value={detail.pelapor?.alamat_pelapor} />
                  </DetailSection>

                  <DetailSection title="Detail Kejadian">
                    <InfoRow label="Jenis Bencana" value={detail.kejadian?.nama_bencana || detail.kejadian?.jenis_bencana} />
                    <InfoRow label="Kecamatan" value={detail.kejadian?.kecamatan} />
                    <InfoRow label="Kelurahan" value={detail.kejadian?.kelurahan} />
                    <InfoRow label="Jenis Lokasi" value={detail.kejadian?.jenis_lokasi} />
                    <InfoRow label="Alamat Kejadian" value={detail.kejadian?.alamat_lengkap_kejadian} />
                    <InfoRow
                      label="Koordinat"
                      value={
                        detail.kejadian?.latitude && detail.kejadian?.longitude
                          ? `${detail.kejadian.latitude}, ${detail.kejadian.longitude}`
                          : '-'
                      }
                    />
                    <InfoRow label="Kronologi" value={detail.kejadian?.kronologi} />
                  </DetailSection>

                  <DetailSection title="Data Identifikasi">
                    <InfoRow label="Jenis Korban" value={detail.identifikasi?.jenis_korban} />
                    <InfoRow
                      label="Jumlah Korban"
                      value={`${detail.identifikasi?.jumlah_korban_identifikasi ?? 0} orang`}
                    />
                    <InfoRow label="Kerusakan" value={detail.identifikasi?.kerusakan_identifikasi} />
                    <InfoRow label="Terdampak" value={detail.identifikasi?.terdampak_identifikasi} />
                    <InfoRow label="Penyebab" value={detail.identifikasi?.penyebab_identifikasi} />
                  </DetailSection>

                  {(detail.tindak_lanjut?.rekomendasi_tindak_lanjut || detail.tindak_lanjut?.tindak_lanjut) ? (
                    <DetailSection title="Informasi Penanganan">
                      <InfoRow label="Rekomendasi" value={detail.tindak_lanjut?.rekomendasi_tindak_lanjut} />
                      <InfoRow label="Tindak Lanjut" value={detail.tindak_lanjut?.tindak_lanjut} />
                      <InfoRow label="Update Terakhir" value={formatDate(detail.tindak_lanjut?.verifikasi_terakhir)} />
                    </DetailSection>
                  ) : null}

                  <DetailSection title="Lampiran Foto">
                    <div className={styles.photoGrid}>
                      {detail.lampiran?.foto_kejadian ? (
                        <a
                          href={getFileUrl(detail.lampiran.foto_kejadian)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.photoCard}
                        >
                          <img src={getFileUrl(detail.lampiran.foto_kejadian)} alt="Foto kejadian" />
                          <span>Foto Kejadian</span>
                        </a>
                      ) : null}

                      {fotoKerusakanList.map((foto: string, index: number) => (
                        <a
                          key={`${foto}-${index}`}
                          href={getFileUrl(foto)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.photoCard}
                        >
                          <img src={getFileUrl(foto)} alt={`Foto kerusakan ${index + 1}`} />
                          <span>Foto Kerusakan {index + 1}</span>
                        </a>
                      ))}

                      {!detail.lampiran?.foto_kejadian && fotoKerusakanList.length === 0 ? (
                        <p className={styles.emptyText}>Tidak ada lampiran foto.</p>
                      ) : null}
                    </div>
                  </DetailSection>
                </div>
              ) : null}
            </div>

            <aside className={styles.tutorialCard}>
              <h2 className={styles.tutorialTitle}>Cara Cek Status</h2>
              <div className={styles.stepsContainer}>
                <div className={styles.step}>
                  <div className={`${styles.iconCircle} ${styles.blueBg}`}>1</div>
                  <div className={styles.stepContent}>
                    <h4>Simpan ID laporan</h4>
                    <p>ID laporan muncul setelah kamu berhasil mengirim laporan.</p>
                  </div>
                </div>
                <div className={styles.step}>
                  <div className={`${styles.iconCircle} ${styles.orangeBg}`}>2</div>
                  <div className={styles.stepContent}>
                    <h4>Masukkan ID</h4>
                    <p>Ketik ID laporan di kolom cek status, lalu klik tombol cek.</p>
                  </div>
                </div>
                <div className={styles.step}>
                  <div className={`${styles.iconCircle} ${styles.yellowBg}`}>3</div>
                  <div className={styles.stepContent}>
                    <h4>Lihat perkembangan</h4>
                    <p>Status dan data laporan yang pernah kamu input akan tampil di halaman ini.</p>
                  </div>
                </div>
              </div>

              <div className={styles.infoBox}>
                <div className={styles.infoIcon}>i</div>
                <p>
                  Data yang tampil hanya informasi yang perlu diketahui pelapor, bukan seluruh data analisis internal admin.
                </p>
              </div>
            </aside>
          </section>
        </div>
      </main>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className={styles.infoCard}>
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  )
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.detailSection}>
      <h3>{title}</h3>
      <div className={styles.customTable}>{children}</div>
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className={styles.tableRow}>
      <div className={styles.tableLabel}>{label}</div>
      <div className={styles.tableValue}>{value || '-'}</div>
    </div>
  )
}
