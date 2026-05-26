'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import styles from './detail.module.css'

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
)

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
)

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api/humint'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5555'

function normalizeRekomendasiToList(value: any): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(/\r?\n|•/g)
      .map((item) => item.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean)
  }

  return []
}


function parsePossibleJsonArray(value: any): any[] {
  if (Array.isArray(value)) return value

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (!trimmed) return []

    try {
      const parsed = JSON.parse(trimmed)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  return []
}

function getLabelJenisKorban(value: any) {
  const key = String(value || '').toUpperCase()

  const labels: Record<string, string> = {
    TIDAK_ADA: 'Tidak Ada Korban',
    TERDAMPAK: 'Terdampak',
    MENINGGAL: 'Meninggal',
    HILANG: 'Hilang',
    MENGUNGSI: 'Mengungsi',
    LUKA_SAKIT: 'Luka/Sakit',
  }

  return labels[key] || String(value || '-')
}

function normalizeDetailKorban(value: any): any[] {
  return parsePossibleJsonArray(value)
    .map((item) => ({
      jenis_korban: item?.jenis_korban || item?.jenisKorban || '',
      jenis_kelamin: item?.jenis_kelamin || item?.jenisKelamin || 'TIDAK_DIKETAHUI',
      kelompok_umur: item?.kelompok_umur || item?.kelompokUmur || 'TIDAK_DIKETAHUI',
      jumlah: Number(item?.jumlah || 0),
    }))
    .filter((item) => item.jumlah > 0)
}

function getPrioritasText(prioritas?: string) {
  if (prioritas === 'PRIORITAS TINGGI') return 'Prioritas Tinggi'
  if (prioritas === 'PRIORITAS SEDANG') return 'Prioritas Sedang'
  if (prioritas === 'PRIORITAS RENDAH') return 'Prioritas Rendah'
  return 'Prioritas Rendah'
}

// ─── helper badge warna korban ─────────────────────────────────────
const korbanColors: Record<string, string> = {
  MENINGGAL: '#ef4444',
  HILANG: '#f97316',
  LUKA_SAKIT: '#eab308',
  TERDAMPAK: '#3b82f6',
  MENGUNGSI: '#8b5cf6',
}

function getKorbanColor(jenis: string) {
  return korbanColors[String(jenis).toUpperCase()] || '#6b7280'
}

export default function DetailLaporanPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()

  const pathId =
    typeof params?.id === 'string'
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : ''

  const queryId = searchParams.get('id') || ''
  const laporanId = pathId || queryId

  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const [customIcon, setCustomIcon] = useState<any>(null)

  useEffect(() => {
    setIsMounted(true)

    const loadLeafletIcon = async () => {
      const L = await import('leaflet')

      const icon = new L.Icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      })

      setCustomIcon(icon)
    }

    loadLeafletIcon()
  }, [])

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        if (!laporanId || laporanId === 'undefined') {
          setErrorMsg('ID laporan tidak ditemukan di URL')
          setLoading(false)
          return
        }

        const res = await fetch(`${API_URL}/detail/${laporanId}`, {
          cache: 'no-store',
        })

        const text = await res.text()

        if (!text.trim().startsWith('{')) {
          console.error('Response bukan JSON:', text)
          throw new Error('Backend tidak mengembalikan JSON.')
        }

        const result = JSON.parse(text)

        if (!res.ok) {
          throw new Error(result.message || 'Gagal mengambil detail laporan')
        }

        setDetail(result.data || null)
      } catch (error: any) {
        console.error('Gagal mengambil detail laporan:', error)
        setErrorMsg(error.message || 'Gagal mengambil detail laporan')
        setDetail(null)
      } finally {
        setLoading(false)
      }
    }

    fetchDetail()
  }, [laporanId])

  const getFileUrl = (filename?: string | null) => {
    if (!filename) return ''
    if (filename.startsWith('http')) return filename
    return `${BASE_URL}/uploads/${filename}`
  }

  const formatDate = (value?: string) => {
    if (!value) return '-'

    return new Date(value).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusText = (status?: string) => {
    if (!status) return 'Menunggu Verifikasi'
    if (status === 'IDENTIFIKASI') return 'Menunggu Verifikasi'
    if (status === 'TERVERIFIKASI') return 'Terverifikasi'
    if (status === 'DITANGANI') return 'Sedang Ditangani'
    if (status === 'SELESAI') return 'Selesai'
    return status
  }

  const handleDownloadPDF = () => {
    if (!laporanId || laporanId === 'undefined') {
      alert('ID laporan tidak ditemukan')
      return
    }

    window.open(`${API_URL}/download/${laporanId}`, '_blank')
  }

  if (loading) {
    return (
      <main className={styles.container}>
        <div className={styles.header}>
          <h1>Memuat Detail Laporan...</h1>
        </div>
      </main>
    )
  }

  if (!detail) {
    return (
      <main className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1>Detail Laporan Tidak Ditemukan</h1>
            <p>{errorMsg || `ID laporan: ${laporanId}`}</p>
          </div>

          <div className={styles.actions}>
            <button className={styles.btnBack} onClick={() => router.back()}>
              ← Kembali
            </button>
          </div>
        </div>
      </main>
    )
  }

  const laporan = detail || {}
  const identifikasi = detail.identifikasi || {}
  const verifikasi = detail.verifikasi || {}
  const analisis = detail.analisis || {}
  const metadata = detail.metadata_foto || {}
  const osint = detail.osint
  const geoint = detail.geoint || {}
  const detailKorban = normalizeDetailKorban(
    detail.detail_korban ||
      detail.detailKorban ||
      identifikasi.detail_korban ||
      identifikasi.detailKorban ||
      laporan.detail_korban ||
      laporan.detailKorban ||
      []
  )

  const getJumlahIdentifikasi = (fieldName: string) => {
    const valueFromIdentifikasi = Number(identifikasi?.[fieldName] || 0)

    return Number.isFinite(valueFromIdentifikasi) ? valueFromIdentifikasi : 0
  }

  // ─── Data identifikasi angka korban hanya dari tabel identifikasi ───────
  // Tidak mengambil fallback dari detail_korban agar data masyarakat dan data petugas tetap terpisah.
  // Semua kategori ditampilkan, termasuk yang jumlahnya 0.
  const jumlahTerdampak = getJumlahIdentifikasi('jumlah_terdampak')
  const jumlahMeninggal = getJumlahIdentifikasi('jumlah_meninggal')
  const jumlahHilang = getJumlahIdentifikasi('jumlah_hilang')
  const jumlahMengungsi = getJumlahIdentifikasi('jumlah_mengungsi')
  const jumlahLukaSakit = getJumlahIdentifikasi('jumlah_luka_sakit')

  const totalKorbanKategoriIdentifikasi =
    jumlahTerdampak +
    jumlahMeninggal +
    jumlahHilang +
    jumlahMengungsi +
    jumlahLukaSakit

  const jumlahKorbanIdentifikasi = Number(
    identifikasi.jumlah_korban_identifikasi ||
      totalKorbanKategoriIdentifikasi ||
      0
  )

  const korbanRincianData = [
    { label: 'Terdampak', value: jumlahTerdampak, jenis: 'TERDAMPAK' },
    { label: 'Meninggal', value: jumlahMeninggal, jenis: 'MENINGGAL' },
    { label: 'Hilang', value: jumlahHilang, jenis: 'HILANG' },
    { label: 'Mengungsi', value: jumlahMengungsi, jenis: 'MENGUNGSI' },
    { label: 'Luka/Sakit', value: jumlahLukaSakit, jenis: 'LUKA_SAKIT' },
  ]

  const fotoKejadianUrl = getFileUrl(laporan.foto_kejadian)

  const fotoKerusakanList = laporan.foto_kerusakan
    ? String(laporan.foto_kerusakan)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : []

  const latitude = laporan.latitude ? Number(laporan.latitude) : null
  const longitude = laporan.longitude ? Number(laporan.longitude) : null

  const hasCoordinate =
    latitude !== null &&
    longitude !== null &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude)

  const googleMapsViewUrl = hasCoordinate
    ? `https://www.google.com/maps?q=${latitude},${longitude}`
    : ''

  const googleMapsDirectionUrl = hasCoordinate
    ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    : ''

  const catatanAlasanList = [
    analisis.alasan_kredibilitas,
    analisis.alasan_prioritas_sistem || analisis.alasan_prioritas,
    analisis.is_prioritas_manual ? analisis.alasan_prioritas_manual : null,
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean)

  const isValidGpsValue = (value: any) => {
    if (value === null || value === undefined || value === '') return false

    const numberValue = Number(value)

    return !Number.isNaN(numberValue)
  }

  const hasExifGps =
    isValidGpsValue(metadata.exif_latitude) &&
    isValidGpsValue(metadata.exif_longitude)

  const hasBrowserGps =
    isValidGpsValue(metadata.browser_latitude) &&
    isValidGpsValue(metadata.browser_longitude)

  const finalGpsSource = hasExifGps
    ? 'exif'
    : hasBrowserGps
      ? 'browser'
      : metadata.gps_source || 'none'

  const gpsSourceLabel =
    finalGpsSource === 'exif'
      ? 'EXIF Foto'
      : finalGpsSource === 'browser'
        ? 'GPS Browser'
        : 'Tidak tersedia'

  const validationLabel =
    metadata.status_validasi ||
    metadata.kategori_validasi ||
    (metadata.is_valid_location === null || metadata.is_valid_location === undefined
      ? 'Tidak tersedia'
      : metadata.is_valid_location
        ? 'Sesuai GPS'
        : 'Perlu pengecekan')

  const distanceText =
    metadata.selisih_jarak !== null && metadata.selisih_jarak !== undefined
      ? `${Number(metadata.selisih_jarak).toFixed(2)} meter`
      : 'Tidak tersedia'

  const metadataKeterangan = (() => {
    if (metadata.keterangan) {
      return metadata.keterangan
    }

    if (hasExifGps) {
      if (metadata.is_valid_location) {
        return distanceText !== 'Tidak tersedia'
          ? `Foto memiliki metadata GPS EXIF dan lokasi foto sesuai dengan lokasi laporan. Selisih jarak: ${distanceText}.`
          : 'Foto memiliki metadata GPS EXIF dan lokasi foto sesuai dengan lokasi laporan.'
      }

      return 'Foto memiliki metadata GPS EXIF, namun lokasi yang diperoleh berbeda dengan lokasi laporan sehingga diperlukan pengecekan lebih lanjut oleh petugas.'
    }

    if (hasBrowserGps) {
      if (metadata.is_valid_location) {
        return distanceText !== 'Tidak tersedia'
          ? `Foto tidak memiliki metadata GPS EXIF. Sistem menggunakan GPS browser sebagai alternatif dan lokasi yang diperoleh sesuai dengan lokasi laporan. Selisih jarak: ${distanceText}.`
          : 'Foto tidak memiliki metadata GPS EXIF. Sistem menggunakan GPS browser sebagai alternatif dan lokasi yang diperoleh sesuai dengan lokasi laporan.'
      }

      return 'Foto tidak memiliki metadata GPS EXIF. Sistem menggunakan GPS browser sebagai alternatif, namun lokasi yang diperoleh berbeda dengan lokasi laporan sehingga diperlukan pengecekan lebih lanjut oleh petugas.'
    }

    return 'Foto tidak memiliki metadata GPS EXIF dan GPS browser tidak tersedia sehingga diperlukan pengecekan manual oleh petugas.'
  })()

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <div>
          <p className={styles.pageEyebrow}>HUMINT / Detail Laporan</p>
          <h1 className={styles.pageTitle}>Detail Laporan Kejadian</h1>
        </div>

        <div className={styles.actions}>
          <button className={styles.btnAction} onClick={handleDownloadPDF}>
            Download PDF
          </button>

          <button className={styles.btnBack} onClick={() => router.back()}>
            ← Kembali
          </button>
        </div>
      </div>

      <section className={styles.summaryBar}>
        <div className={styles.summaryBlock}>
          <div className={styles.summaryMainLine}>
            <span className={styles.reportCode}>
              [LAP-{String(laporan.laporan_id || laporanId).padStart(4, '0')}]
            </span>

            <span className={styles.badge}>
              {laporan.jenis_bencana || '-'}
            </span>
          </div>

          <div className={styles.priorityLine}>
            <span className={styles.redDot}></span>
            {getPrioritasText(analisis.prioritas)}
          </div>
        </div>

        <div className={styles.summaryBlock}>
          <small>Status :</small>
          <strong className={styles.statusText}>
            {getStatusText(analisis.status_laporan)}
          </strong>
        </div>

        <div className={styles.summaryBlock}>
          <small>Waktu Laporan : {formatDate(laporan.waktu_laporan)}</small>
          <small>Waktu Kejadian : {formatDate(laporan.waktu_kejadian)}</small>
        </div>

        <div className={styles.summaryBlock}>
          <small>Skor Kredibilitas :</small>
          <strong className={styles.credibilityText}>
            {analisis.skor_kredibilitas || '-'}
          </strong>
        </div>
      </section>

      <section className={styles.grid}>
        <div>
          <div className={styles.card}>
            <h3>Informasi Pelapor</h3>

            <div className={styles.customTable}>
              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Nama</div>
                <div className={styles.tableValue}>
                  {laporan.nama_pelapor || '-'}
                </div>
              </div>

              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>No HP</div>
                <div className={styles.tableValue}>
                  {laporan.no_hp || '-'}
                </div>
              </div>

              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Alamat</div>
                <div className={styles.tableValue}>
                  {laporan.alamat_pelapor || '-'}
                </div>
              </div>

              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Jenis Laporan</div>
                <div className={styles.tableValue}>
                  {laporan.jenis_laporan || '-'}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h3>Detail Kejadian</h3>

            <div className={styles.customTable}>
              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Jenis Bencana</div>
                <div className={styles.tableValue}>
                  {laporan.jenis_bencana || '-'}
                </div>
              </div>

              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Waktu Kejadian</div>
                <div className={styles.tableValue}>
                  {formatDate(laporan.waktu_kejadian)}
                </div>
              </div>

              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Jenis Lokasi</div>
                <div className={styles.tableValue}>
                  {laporan.jenis_lokasi || '-'}
                </div>
              </div>

              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Kecamatan</div>
                <div className={styles.tableValue}>
                  {laporan.kecamatan || '-'}
                </div>
              </div>

              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Kelurahan</div>
                <div className={styles.tableValue}>
                  {laporan.kelurahan || '-'}
                </div>
              </div>
            </div>

            <span className={styles.subLabel}>Kronologi</span>
            <div className={styles.viewValue}>
              {laporan.kronologi || '-'}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════
              CARD IDENTIFIKASI KORBAN — LENGKAP
          ════════════════════════════════════════════════════════ */}
          <div className={styles.card}>
            <h3>Data Identifikasi Masyarakat</h3>

            {/* ── Total Korban ── */}
            <div className={styles.customTable}>
              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Total Korban Dilaporkan</div>
                <div className={styles.tableValue}>
                  <strong style={{ fontSize: '1.05rem' }}>
                    {jumlahKorbanIdentifikasi} Orang
                  </strong>
                </div>
              </div>
            </div>

            {/* ── Rincian korban hanya dari tabel identifikasi. Semua kategori tampil. ── */}
            <span className={styles.subLabel} style={{ display: 'block', marginBottom: 10 }}>
              Rincian Kategori Korban (Input Masyarakat)
            </span>
            <div className={styles.victimCompactList}>
              {korbanRincianData.map((item) => (
                <div
                  key={item.jenis}
                  className={styles.victimCompactItem}
                >
                  <span>{item.label}</span>
                  <strong>{Number(item.value || 0)} orang</strong>
                </div>
              ))}
            </div>

            {/* ── Narasi teks identifikasi ── */}
            <div className={styles.customTable}>
              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Kerusakan</div>
                <div className={styles.tableValue}>
                  {identifikasi.kerusakan_identifikasi || '-'}
                </div>
              </div>

              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Terdampak</div>
                <div className={styles.tableValue}>
                  {identifikasi.terdampak_identifikasi || '-'}
                </div>
              </div>

              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Penyebab</div>
                <div className={styles.tableValue}>
                  {identifikasi.penyebab_identifikasi || '-'}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h3>Analisis Sistem</h3>

            <div className={styles.customTable}>
              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Skor Kredibilitas</div>
                <div className={styles.tableValue}>
                  {analisis.skor_kredibilitas || '-'}
                </div>
              </div>

              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Prioritas Sistem</div>
                <div className={styles.tableValue}>
                  {analisis.prioritas_sistem || analisis.prioritas || '-'}
                </div>
              </div>

              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Prioritas Final</div>
                <div className={styles.tableValue}>
                  {analisis.prioritas || '-'}
                </div>
              </div>

              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Override Manual</div>
                <div className={styles.tableValue}>
                  {analisis.is_prioritas_manual ? 'Aktif' : 'Tidak Aktif'}
                </div>
              </div>

              {analisis.is_prioritas_manual && (
                <>
                  <div className={styles.tableRow}>
                    <div className={styles.tableLabel}>Prioritas Manual Staff</div>
                    <div className={styles.tableValue}>
                      {analisis.prioritas_manual || '-'}
                    </div>
                  </div>

                  <div className={styles.tableRow}>
                    <div className={styles.tableLabel}>Alasan Override</div>
                    <div className={styles.tableValue}>
                      {analisis.alasan_prioritas_manual || '-'}
                    </div>
                  </div>
                </>
              )}

              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Status Laporan</div>
                <div className={styles.tableValue}>
                  {analisis.status_laporan || '-'}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h3>Zona Rawan</h3>

            <div className={styles.customTable}>
              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Status Zona</div>
                <div className={styles.tableValue}>
                  {geoint.is_zona_rawan ? 'Masuk zona rawan' : 'Tidak masuk zona rawan'}
                </div>
              </div>

              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Tingkat Risiko</div>
                <div className={styles.tableValue}>
                  {geoint.tingkat_resiko || 'TIDAK_RAWAN'}
                </div>
              </div>

              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Keterangan</div>
                <div className={styles.tableValue}>
                  {geoint.keterangan || '-'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className={styles.card}>
            <h3>Lokasi Kejadian</h3>

            <div className={styles.customTable}>
              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Alamat Kejadian</div>
                <div className={styles.tableValue}>
                  {laporan.alamat_lengkap_kejadian || '-'}
                </div>
              </div>

              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Latitude</div>
                <div className={styles.tableValue}>
                  {laporan.latitude || '-'}
                </div>
              </div>

              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Longitude</div>
                <div className={styles.tableValue}>
                  {laporan.longitude || '-'}
                </div>
              </div>
            </div>

            <span className={styles.subLabel}>Peta Lokasi</span>

            <div className={styles.mapFrame}>
              {hasCoordinate ? (
                isMounted && customIcon ? (
                  <div
                    className={styles.mapClickable}
                    onClick={() =>
                      window.open(
                        googleMapsViewUrl,
                        '_blank',
                        'noopener,noreferrer'
                      )
                    }
                    title="Buka lokasi di Google Maps"
                  >
                    <MapContainer
                      center={[latitude as number, longitude as number]}
                      zoom={15}
                      scrollWheelZoom={false}
                      className={styles.mapContainer}
                    >
                      <TileLayer
                        attribution="&copy; OpenStreetMap contributors"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      <Marker
                        position={[latitude as number, longitude as number]}
                        icon={customIcon}
                      >
                        <Popup>
                          <strong>Lokasi Kejadian</strong>
                          <br />
                          {laporan.alamat_lengkap_kejadian || '-'}
                          <br />
                          Klik peta untuk buka Google Maps
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                ) : (
                  <div className={styles.viewValue}>Memuat peta...</div>
                )
              ) : (
                <div className={styles.viewValue}>Lokasi tidak tersedia</div>
              )}
            </div>

            {hasCoordinate && (
              <div className={styles.mapButtonGroup}>
                <a
                  href={googleMapsViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.mapButton}
                >
                  Lihat Map
                </a>

                <a
                  href={googleMapsDirectionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.navButton}
                >
                  Navigasi
                </a>
              </div>
            )}

            {hasCoordinate && (
              <div className={styles.mapHint}>
                Klik peta untuk buka Google Maps.
              </div>
            )}
          </div>

          <div className={styles.card}>
            <h3>Dokumentasi Foto</h3>

            <span className={styles.subLabel}>Foto Kejadian</span>

            <div className={styles.photoThumb}>
              {fotoKejadianUrl ? (
                <img
                  src={fotoKejadianUrl}
                  alt="Foto kejadian"
                  className={styles.thumbImage}
                />
              ) : (
                <div className={styles.viewValue}>Foto tidak tersedia</div>
              )}
            </div>

            <span className={styles.subLabel}>Metadata EXIF Foto</span>

            <table className={styles.exifTable}>
              <tbody>
                <tr>
                  <td>Sumber GPS Foto</td>
                  <td>{gpsSourceLabel}</td>
                </tr>

                <tr>
                  <td>EXIF Latitude</td>
                  <td>
                    {hasExifGps
                      ? metadata.exif_latitude
                      : 'Tidak tersedia'}
                  </td>
                </tr>

                <tr>
                  <td>EXIF Longitude</td>
                  <td>
                    {hasExifGps
                      ? metadata.exif_longitude
                      : 'Tidak tersedia'}
                  </td>
                </tr>

                <tr>
                  <td>Browser GPS Latitude</td>
                  <td>
                    {hasBrowserGps
                      ? metadata.browser_latitude
                      : 'Tidak tersedia'}
                  </td>
                </tr>

                <tr>
                  <td>Browser GPS Longitude</td>
                  <td>
                    {hasBrowserGps
                      ? metadata.browser_longitude
                      : 'Tidak tersedia'}
                  </td>
                </tr>

                <tr>
                  <td>Selisih Jarak</td>
                  <td>{distanceText}</td>
                </tr>

                <tr>
                  <td>Validasi Lokasi Foto</td>
                  <td>{validationLabel}</td>
                </tr>

                <tr>
                  <td>Keterangan</td>
                  <td>{metadataKeterangan}</td>
                </tr>
              </tbody>
            </table>

            {fotoKerusakanList.length > 0 && (
              <>
                <span className={styles.subLabel}>Foto Kerusakan</span>

                <div className={styles.photoGridSmall}>
                  {fotoKerusakanList.map((foto: string, index: number) => (
                    <div className={styles.photoThumb} key={index}>
                      <img
                        src={getFileUrl(foto)}
                        alt={`Foto kerusakan ${index + 1}`}
                        className={styles.thumbImage}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div>
          <div className={styles.card}>
            <h3>Verifikasi Staff</h3>

            <div className={styles.customTable}>
              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Kerusakan</div>
                <div className={styles.tableValue}>
                  {verifikasi.kerusakan_verifikasi || '-'}
                </div>
              </div>

              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Terdampak</div>
                <div className={styles.tableValue}>
                  {verifikasi.terdampak_verifikasi || '-'}
                </div>
              </div>

              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Penyebab</div>
                <div className={styles.tableValue}>
                  {verifikasi.penyebab_verifikasi || '-'}
                </div>
              </div>

              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Kerugian</div>
                <div className={styles.tableValue}>
                  {verifikasi.prakiraan_kerugian
                    ? `Rp ${Number(
                        verifikasi.prakiraan_kerugian
                      ).toLocaleString('id-ID')}`
                    : '-'}
                </div>
              </div>

              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Petugas TRC</div>
                <div className={styles.tableValue}>
                  {verifikasi.petugas_trc || '-'}
                </div>
              </div>

              <div className={styles.tableRow}>
                <div className={styles.tableLabel}>Staff Puskodal</div>
                <div className={styles.tableValue}>
                  {verifikasi.last_updated_by ||
                    verifikasi.petugas_nama ||
                    analisis.last_updated_by ||
                    '-'}
                </div>
              </div>
            </div>

            <span className={styles.subLabel}>Tindak Lanjut</span>

            <div className={styles.viewValue}>
              {verifikasi.tindak_lanjut || '-'}
            </div>
          </div>

          {detailKorban.length > 0 && (
            <div className={styles.card}>
              <h3>Detail Korban Final</h3>

              <div className={styles.customTable}>
                {detailKorban.map((item: any, index: number) => (
                  <div className={styles.tableRow} key={index}>
                    <div className={styles.tableLabel}>
                      {getLabelJenisKorban(item.jenis_korban)}
                    </div>

                    <div className={styles.tableValue}>
                      {item.jenis_kelamin || '-'} -{' '}
                      {item.kelompok_umur || '-'} : {item.jumlah || 0} orang
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.card}>
            <h3>Catatan Alasan</h3>

            <div className={styles.viewValue}>
              {catatanAlasanList.length > 0 ? (
                <ul className={styles.dssListPoin}>
                  {catatanAlasanList.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              ) : (
                '-'
              )}
            </div>
          </div>

          <div className={styles.card}>
            <h3>Data Pendukung OSINT</h3>

            {osint ? (
              <div className={styles.customTable}>
                <div className={styles.tableRow}>
                  <div className={styles.tableLabel}>Area</div>
                  <div className={styles.tableValue}>
                    {osint.osint_area_text || '-'}
                  </div>
                </div>

                <div className={styles.tableRow}>
                  <div className={styles.tableLabel}>Waktu Verifikasi</div>
                  <div className={styles.tableValue}>
                    {formatDate(osint.verified_at)}
                  </div>
                </div>

                <div className={styles.tableRow}>
                  <div className={styles.tableLabel}>Sumber</div>
                  <div className={styles.tableValue}>
                    {osint.osint_source || '-'}
                  </div>
                </div>

                <div className={styles.tableRow}>
                  <div className={styles.tableLabel}>Isi Konten</div>
                  <div className={styles.tableValue}>
                    {osint.osint_content || '-'}
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.viewValue}>
                Tidak ada data OSINT terkait
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
