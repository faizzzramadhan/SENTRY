'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import L from 'leaflet'
import styles from './edit.module.css'

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

const customIcon = new L.Icon({
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api/humint'
const BASE_URL = 'http://localhost:5555'
const MAX_TEXT_LENGTH = 250

type JenisKorbanKey =
  | 'MENINGGAL'
  | 'HILANG'
  | 'LUKA_SAKIT'
  | 'TERDAMPAK'
  | 'MENGUNGSI'

type KorbanMatrix = {
  anakL: number
  dewasaL: number
  lansiaL: number
  anakP: number
  dewasaP: number
  lansiaP: number
}

type KorbanByJenis = Record<JenisKorbanKey, KorbanMatrix>

const emptyKorban: KorbanMatrix = {
  anakL: 0,
  dewasaL: 0,
  lansiaL: 0,
  anakP: 0,
  dewasaP: 0,
  lansiaP: 0,
}

const createDefaultKorbanByJenis = (): KorbanByJenis => ({
  MENINGGAL: { ...emptyKorban },
  HILANG: { ...emptyKorban },
  LUKA_SAKIT: { ...emptyKorban },
  TERDAMPAK: { ...emptyKorban },
  MENGUNGSI: { ...emptyKorban },
})

const jenisKorbanList: JenisKorbanKey[] = [
  'MENINGGAL',
  'HILANG',
  'LUKA_SAKIT',
  'TERDAMPAK',
  'MENGUNGSI',
]

const jenisKorbanLabel: Record<JenisKorbanKey, string> = {
  MENINGGAL: 'Meninggal',
  HILANG: 'Hilang',
  LUKA_SAKIT: 'Luka/Sakit',
  TERDAMPAK: 'Terdampak',
  MENGUNGSI: 'Mengungsi',
}


type LoginStaff = {
  usr_id?: string | number
  id?: string | number
  user_id?: string | number
  usr_nama_lengkap?: string
  usr_nama?: string
  nama_lengkap?: string
  nama?: string
  name?: string
  email?: string
  usr_email?: string
}

const safeJsonParse = (value: string | null) => {
  try {
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

const decodeJwtPayload = (token: string): any | null => {
  try {
    const payload = token.split('.')[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

const getNameFromObject = (data: LoginStaff | null | undefined) => {
  if (!data) return ''

  return (
    data.usr_nama_lengkap ||
    data.nama_lengkap ||
    data.usr_nama ||
    data.nama ||
    data.name ||
    data.usr_email ||
    data.email ||
    ''
  )
}

const getLoggedInStaff = () => {
  if (typeof window === 'undefined') return { name: '', id: '' }

  const userKeys = ['user', 'staff', 'authUser', 'currentUser', 'loginUser']
  const tokenKeys = ['token', 'accessToken', 'authToken', 'jwt']

  for (const key of userKeys) {
    const parsed = safeJsonParse(localStorage.getItem(key))
    const name = getNameFromObject(parsed)

    if (name) {
      return {
        name,
        id: parsed?.usr_id || parsed?.id || parsed?.user_id || '',
      }
    }
  }

  for (const key of tokenKeys) {
    const token = localStorage.getItem(key)
    if (!token) continue

    const payload = decodeJwtPayload(token)
    const name = getNameFromObject(payload)

    if (name) {
      return {
        name,
        id: payload?.usr_id || payload?.id || payload?.user_id || '',
      }
    }
  }

  return { name: '', id: '' }
}

export default function EditLaporanPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const laporanId = searchParams.get('id') || ''

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<any>(null)
  const [loggedStaff, setLoggedStaff] = useState({ name: '', id: '' })
  const [selectedJenisKorban, setSelectedJenisKorban] =
    useState<JenisKorbanKey>('LUKA_SAKIT')

  const [notification, setNotification] = useState<{
    show: boolean
    type: 'success' | 'error'
    message: string
  }>({
    show: false,
    type: 'success',
    message: '',
  })

  const [korbanByJenis, setKorbanByJenis] =
    useState<KorbanByJenis>(createDefaultKorbanByJenis)

  const [form, setForm] = useState({
    kerusakan_verifikasi: '',
    terdampak_verifikasi: '',
    penyebab_verifikasi: '',
    prakiraan_kerugian: '',
    tindak_lanjut: '',
    petugas_trc: '',
    staff_puskodal: '',
    skor_kredibilitas: 'RENDAH',
    prioritas: 'PRIORITAS RENDAH',
    prioritas_sistem: 'PRIORITAS RENDAH',
    prioritas_manual: '',
    is_prioritas_manual: false,
    alasan_prioritas_manual: '',
    status_laporan: 'IDENTIFIKASI',
  })

  useEffect(() => {
    const staff = getLoggedInStaff()
    setLoggedStaff(staff)

    if (staff.name) {
      setForm((prev) => ({
        ...prev,
        staff_puskodal: staff.name,
      }))
    }
  }, [])

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        if (!laporanId) {
          setLoading(false)
          return
        }

        const res = await fetch(`${API_URL}/detail/${laporanId}`, {
          cache: 'no-store',
        })

        const result = await res.json()

        if (!res.ok) {
          throw new Error(result.message || 'Gagal mengambil detail laporan')
        }

        const data = result.data || null
        setDetail(data)

        const verifikasi = data?.verifikasi || {}
        const analisis = data?.analisis || {}
        const staffLogin = getLoggedInStaff()

        setForm({
          kerusakan_verifikasi: verifikasi.kerusakan_verifikasi || '',
          terdampak_verifikasi: verifikasi.terdampak_verifikasi || '',
          penyebab_verifikasi: verifikasi.penyebab_verifikasi || '',
          prakiraan_kerugian:
            verifikasi.prakiraan_kerugian != null
              ? String(verifikasi.prakiraan_kerugian)
              : '',
          tindak_lanjut: verifikasi.tindak_lanjut || '',
          petugas_trc: verifikasi.petugas_trc || '',
          staff_puskodal:
            staffLogin.name ||
            verifikasi.last_updated_by ||
            verifikasi.petugas_nama ||
            '',
          skor_kredibilitas: analisis.skor_kredibilitas || 'RENDAH',
          prioritas: analisis.prioritas || 'PRIORITAS RENDAH',
          prioritas_sistem:
            analisis.prioritas_sistem ||
            analisis.prioritas ||
            'PRIORITAS RENDAH',
          prioritas_manual: analisis.prioritas_manual || '',
          is_prioritas_manual: Boolean(analisis.is_prioritas_manual),
          alasan_prioritas_manual: analisis.alasan_prioritas_manual || '',
          status_laporan: analisis.status_laporan || 'IDENTIFIKASI',
        })

        if (
          Array.isArray(data?.detail_korban) &&
          data.detail_korban.length > 0
        ) {
          const nextKorban = createDefaultKorbanByJenis()

          data.detail_korban.forEach((item: any) => {
            const jenis = item.jenis_korban as JenisKorbanKey
            const gender = item.jenis_kelamin
            const umur = item.kelompok_umur
            const jumlah = Number(item.jumlah || 0)

            if (!nextKorban[jenis]) return

            if (gender === 'LAKI_LAKI' && umur === 'ANAK') {
              nextKorban[jenis].anakL = jumlah
            }

            if (gender === 'LAKI_LAKI' && umur === 'DEWASA') {
              nextKorban[jenis].dewasaL = jumlah
            }

            if (gender === 'LAKI_LAKI' && umur === 'LANSIA') {
              nextKorban[jenis].lansiaL = jumlah
            }

            if (gender === 'PEREMPUAN' && umur === 'ANAK') {
              nextKorban[jenis].anakP = jumlah
            }

            if (gender === 'PEREMPUAN' && umur === 'DEWASA') {
              nextKorban[jenis].dewasaP = jumlah
            }

            if (gender === 'PEREMPUAN' && umur === 'LANSIA') {
              nextKorban[jenis].lansiaP = jumlah
            }
          })

          setKorbanByJenis(nextKorban)
        }
      } catch (error) {
        console.error('Gagal mengambil data edit:', error)
        setDetail(null)
      } finally {
        setLoading(false)
      }
    }

    fetchDetail()
  }, [laporanId])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handlePrioritasManualToggle = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const checked = e.target.checked

    setForm((prev) => ({
      ...prev,
      is_prioritas_manual: checked,
      prioritas_manual: checked
        ? prev.prioritas_manual || prev.prioritas || prev.prioritas_sistem
        : '',
      prioritas: checked
        ? prev.prioritas_manual || prev.prioritas || prev.prioritas_sistem
        : prev.prioritas_sistem || prev.prioritas,
      alasan_prioritas_manual: checked ? prev.alasan_prioritas_manual : '',
    }))
  }

  const activeKorban = korbanByJenis[selectedJenisKorban]

  const handleKorbanChange = (key: keyof KorbanMatrix, value: string) => {
    const numberValue = Number(value || 0)

    setKorbanByJenis((prev) => ({
      ...prev,
      [selectedJenisKorban]: {
        ...prev[selectedJenisKorban],
        [key]: numberValue < 0 ? 0 : numberValue,
      },
    }))
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({
      show: true,
      type,
      message,
    })

    window.setTimeout(() => {
      setNotification((prev) => ({
        ...prev,
        show: false,
      }))
    }, 1800)
  }

  const handleSelectJenisKorban = (jenis: JenisKorbanKey) => {
    setSelectedJenisKorban(jenis)
  }

  const getTotalByJenis = (data: KorbanMatrix) => {
    return (
      Number(data.anakL || 0) +
      Number(data.dewasaL || 0) +
      Number(data.lansiaL || 0) +
      Number(data.anakP || 0) +
      Number(data.dewasaP || 0) +
      Number(data.lansiaP || 0)
    )
  }

  const totalKorbanSelected = useMemo(() => {
    return getTotalByJenis(activeKorban)
  }, [activeKorban])

  const totalLakiSelected = useMemo(() => {
    return (
      Number(activeKorban.anakL || 0) +
      Number(activeKorban.dewasaL || 0) +
      Number(activeKorban.lansiaL || 0)
    )
  }, [activeKorban])

  const totalPerempuanSelected = useMemo(() => {
    return (
      Number(activeKorban.anakP || 0) +
      Number(activeKorban.dewasaP || 0) +
      Number(activeKorban.lansiaP || 0)
    )
  }, [activeKorban])

  const totalSemuaKorbanFinal = useMemo(() => {
    return Object.values(korbanByJenis).reduce(
      (total, item) => total + getTotalByJenis(item),
      0
    )
  }, [korbanByJenis])

  const korbanSummaryList = useMemo(() => {
    return jenisKorbanList
      .map((jenis) => {
        const data = korbanByJenis[jenis]
        const total = getTotalByJenis(data)
        const lakiLaki =
          Number(data.anakL || 0) +
          Number(data.dewasaL || 0) +
          Number(data.lansiaL || 0)
        const perempuan =
          Number(data.anakP || 0) +
          Number(data.dewasaP || 0) +
          Number(data.lansiaP || 0)

        return {
          jenis,
          label: jenisKorbanLabel[jenis],
          total,
          lakiLaki,
          perempuan,
        }
      })
      .filter((item) => item.total > 0 || item.jenis === selectedJenisKorban)
  }, [korbanByJenis, selectedJenisKorban])

  const totalKorbanMasyarakat = useMemo(() => {
    return Number(detail?.identifikasi?.jumlah_korban_identifikasi || 0)
  }, [detail])

  const buildDetailKorbanPayload = () => {
    const rows: {
      jenis_korban: string
      jenis_kelamin: string
      kelompok_umur: string
      jumlah: number
    }[] = []

    Object.entries(korbanByJenis).forEach(([jenis, data]) => {
      rows.push(
        {
          jenis_korban: jenis,
          jenis_kelamin: 'LAKI_LAKI',
          kelompok_umur: 'ANAK',
          jumlah: Number(data.anakL || 0),
        },
        {
          jenis_korban: jenis,
          jenis_kelamin: 'LAKI_LAKI',
          kelompok_umur: 'DEWASA',
          jumlah: Number(data.dewasaL || 0),
        },
        {
          jenis_korban: jenis,
          jenis_kelamin: 'LAKI_LAKI',
          kelompok_umur: 'LANSIA',
          jumlah: Number(data.lansiaL || 0),
        },
        {
          jenis_korban: jenis,
          jenis_kelamin: 'PEREMPUAN',
          kelompok_umur: 'ANAK',
          jumlah: Number(data.anakP || 0),
        },
        {
          jenis_korban: jenis,
          jenis_kelamin: 'PEREMPUAN',
          kelompok_umur: 'DEWASA',
          jumlah: Number(data.dewasaP || 0),
        },
        {
          jenis_korban: jenis,
          jenis_kelamin: 'PEREMPUAN',
          kelompok_umur: 'LANSIA',
          jumlah: Number(data.lansiaP || 0),
        }
      )
    })

    return rows.filter((item) => Number(item.jumlah || 0) > 0)
  }

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

  const handleSave = async () => {
    try {
      if (!laporanId) {
        showNotification('error', 'ID laporan tidak ditemukan')
        return
      }

      setSaving(true)

      const staffLogin = getLoggedInStaff()
      const staffPuskodal = staffLogin.name || form.staff_puskodal || 'staff'

      const finalPrioritas = form.is_prioritas_manual
        ? form.prioritas_manual || form.prioritas || form.prioritas_sistem
        : form.prioritas_sistem || form.prioritas

      const payload = {
        kerusakan_verifikasi: form.kerusakan_verifikasi,
        terdampak_verifikasi: form.terdampak_verifikasi,
        penyebab_verifikasi: form.penyebab_verifikasi,
        prakiraan_kerugian: form.prakiraan_kerugian,
        tindak_lanjut: form.tindak_lanjut,
        petugas_trc: form.petugas_trc,
        staff_puskodal: staffPuskodal,
        usr_id: staffLogin.id || undefined,
        skor_kredibilitas: form.skor_kredibilitas,
        prioritas: finalPrioritas,
        prioritas_sistem: form.prioritas_sistem || form.prioritas,
        prioritas_manual: form.is_prioritas_manual
          ? form.prioritas_manual || finalPrioritas
          : null,
        is_prioritas_manual: form.is_prioritas_manual,
        alasan_prioritas_manual: form.is_prioritas_manual
          ? form.alasan_prioritas_manual
          : null,
        status_laporan: form.status_laporan,
        detail_korban: buildDetailKorbanPayload(),
        last_updated_by: staffPuskodal,
      }

      const res = await fetch(`${API_URL}/edit/${laporanId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.message || 'Gagal memperbarui laporan')
      }

      showNotification('success', 'Data laporan berhasil diperbarui.')

      window.setTimeout(() => {
        router.push(`/humint/detail/${laporanId}`)
      }, 1000)
    } catch (error: any) {
      showNotification(
        'error',
        error.message || 'Gagal memperbarui data. Silakan coba lagi.'
      )
    } finally {
      setSaving(false)
    }
  }

  const fotoKejadianUrl = getFileUrl(detail?.foto_kejadian)
  const metadata = detail?.metadata_foto || {}
  const osint = detail?.osint
  const geoint = detail?.geoint || {}
  const identifikasi = detail?.identifikasi || {}

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

  const distanceText =
    metadata.selisih_jarak !== null && metadata.selisih_jarak !== undefined
      ? `${Number(metadata.selisih_jarak).toFixed(2)} meter`
      : 'Tidak tersedia'

  const metadataKeterangan = (() => {
    if (hasExifGps) {
      return metadata.is_valid_location
        ? `Foto memiliki metadata GPS EXIF dan titik foto sesuai dengan lokasi laporan. Selisih jarak: ${distanceText}.`
        : `Foto memiliki metadata GPS EXIF, tetapi titik foto berjarak ${distanceText} dari lokasi laporan sehingga perlu pengecekan manual oleh staff.`
    }

    if (hasBrowserGps) {
      return metadata.is_valid_location
        ? `Foto tidak memiliki metadata GPS EXIF. Sistem menggunakan GPS browser sebagai fallback dan titiknya sesuai dengan lokasi laporan. Selisih jarak: ${distanceText}.`
        : `Foto tidak memiliki metadata GPS EXIF. Sistem menggunakan GPS browser sebagai fallback, tetapi titiknya berjarak ${distanceText} dari lokasi laporan sehingga perlu pengecekan manual oleh staff.`
    }

    return 'Foto tidak memiliki metadata GPS EXIF dan GPS browser tidak tersedia.'
  })()

  const fotoKerusakanList = detail?.foto_kerusakan
    ? String(detail.foto_kerusakan)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : []

  const latitude = detail?.latitude ? Number(detail.latitude) : null
  const longitude = detail?.longitude ? Number(detail.longitude) : null

  const hasCoordinate =
    latitude !== null &&
    longitude !== null &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude)

  if (loading) {
    return (
      <main className={styles.container}>
        <div className={styles.header}>
          <h1>Memuat Edit Laporan...</h1>
        </div>
      </main>
    )
  }

  if (!detail) {
    return (
      <main className={styles.container}>
        <div className={styles.header}>
          <h1>Data laporan tidak ditemukan</h1>

          <div className={styles.actions}>
            <button className={styles.btnBack} onClick={() => router.back()}>
              Kembali
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.container}>
      {notification.show && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.42)',
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            style={{
              width: 'min(420px, calc(100% - 32px))',
              background: '#111827',
              borderRadius: '22px',
              padding: '26px 24px',
              textAlign: 'center',
              boxShadow: '0 24px 70px rgba(0, 0, 0, 0.55)',
              transition: 'all 0.25s ease',
            }}
          >
            <div
              style={{
                width: '58px',
                height: '58px',
                borderRadius: '50%',
                margin: '0 auto 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '30px',
                fontWeight: 900,
                color: '#ffffff',
                background:
                  notification.type === 'success' ? '#16a34a' : '#dc2626',
              }}
            >
              {notification.type === 'success' ? '✓' : '!'}
            </div>

            <div
              style={{
                fontSize: '20px',
                fontWeight: 900,
                color: '#ffffff',
                marginBottom: '8px',
              }}
            >
              {notification.type === 'success' ? 'Berhasil' : 'Gagal'}
            </div>

            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.82)',
                lineHeight: 1.5,
              }}
            >
              {notification.message}
            </div>
          </div>
        </div>
      )}

      <div className={styles.header}>
        <h1>
          Edit Verifikasi Laporan
          <span className={styles.reportId}>#{detail.laporan_id}</span>
        </h1>

        <div className={styles.actions}>
          <button className={styles.btnBack} onClick={() => router.back()}>
            Kembali
          </button>
        </div>
      </div>

      <section className={styles.mainGrid}>
        <div>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Data Laporan Masyarakat</div>

            <span className={styles.viewLabel}>Nama Pelapor</span>
            <div className={styles.viewValue}>{detail.nama_pelapor || '-'}</div>

            <span className={styles.viewLabel}>No HP</span>
            <div className={styles.viewValue}>{detail.no_hp || '-'}</div>

            <span className={styles.viewLabel}>Alamat Pelapor</span>
            <div className={styles.viewValue}>
              {detail.alamat_pelapor || '-'}
            </div>

            <span className={styles.viewLabel}>Jenis Laporan</span>
            <div className={styles.viewValue}>
              {detail.jenis_laporan || '-'}
            </div>

            <span className={styles.viewLabel}>Jenis Bencana</span>
            <div className={styles.viewValue}>
              {detail.jenis_bencana || '-'}
            </div>

            <span className={styles.viewLabel}>Waktu Kejadian</span>
            <div className={styles.viewValue}>
              {formatDate(detail.waktu_kejadian)}
            </div>

            <span className={styles.viewLabel}>Jenis Lokasi</span>
            <div className={styles.viewValue}>
              {detail.jenis_lokasi || '-'}
            </div>

            <span className={styles.viewLabel}>Kronologi</span>
            <div className={styles.viewValue}>{detail.kronologi || '-'}</div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>Data Assessment Masyarakat</div>

            <span className={styles.viewLabel}>Jumlah Korban Dilaporkan</span>
            <div className={styles.viewValue}>
              {totalKorbanMasyarakat} Orang
            </div>

            <span className={styles.viewLabel}>Kerusakan Dilaporkan</span>
            <div className={styles.viewValue}>
              {identifikasi.kerusakan_identifikasi || '-'}
            </div>

            <span className={styles.viewLabel}>Terdampak Dilaporkan</span>
            <div className={styles.viewValue}>
              {identifikasi.terdampak_identifikasi || '-'}
            </div>

            <span className={styles.viewLabel}>Penyebab Dilaporkan</span>
            <div className={styles.viewValue}>
              {identifikasi.penyebab_identifikasi || '-'}
            </div>
          </div>
        </div>

        <div>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Input Verifikasi Staff</div>

            <div className={styles.inputGroup}>
              <label>Kerusakan Verifikasi</label>
              <textarea
                name="kerusakan_verifikasi"
                value={form.kerusakan_verifikasi}
                onChange={handleChange}
                rows={4}
                placeholder="Masukkan hasil verifikasi kerusakan" maxLength={MAX_TEXT_LENGTH}
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Terdampak Verifikasi</label>
              <textarea
                name="terdampak_verifikasi"
                value={form.terdampak_verifikasi}
                onChange={handleChange}
                rows={3}
                placeholder="Masukkan data terdampak hasil verifikasi" maxLength={MAX_TEXT_LENGTH}
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Penyebab Verifikasi</label>
              <input
                name="penyebab_verifikasi"
                value={form.penyebab_verifikasi}
                onChange={handleChange}
                placeholder="Masukkan penyebab hasil verifikasi" maxLength={MAX_TEXT_LENGTH}
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Prakiraan Kerugian</label>
              <input
                type="number"
                min={0}
                step={1}
                onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                name="prakiraan_kerugian"
                value={form.prakiraan_kerugian}
                onChange={handleChange}
                placeholder="Contoh: 5000000"
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Tindak Lanjut</label>
              <textarea
                name="tindak_lanjut"
                value={form.tindak_lanjut}
                onChange={handleChange}
                rows={4}
                placeholder="Masukkan tindak lanjut penanganan" maxLength={MAX_TEXT_LENGTH}
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Nama Petugas yang Ditugaskan</label>
              <input
                name="petugas_trc"
                value={form.petugas_trc}
                onChange={handleChange}
                placeholder="Masukkan nama petugas yang ditugaskan di lapangan" maxLength={MAX_TEXT_LENGTH}
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Staff Puskodal</label>
              <input
                name="staff_puskodal"
                value={form.staff_puskodal || loggedStaff.name}
                readOnly
                placeholder="Nama staff otomatis dari akun login"
              />
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>Status & Analisis Sistem</div>

            <div className={styles.inputGroup}>
              <label>Kredibilitas Sistem</label>
              <input
                value={form.skor_kredibilitas || 'RENDAH'}
                readOnly
                title="Kredibilitas dihitung otomatis oleh sistem."
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Status Laporan</label>
              <select
                name="status_laporan"
                value={form.status_laporan}
                onChange={handleChange}
              >
                <option value="IDENTIFIKASI">IDENTIFIKASI</option>
                <option value="TERVERIFIKASI">TERVERIFIKASI</option>
                <option value="DITANGANI">DITANGANI</option>
                <option value="SELESAI">SELESAI</option>
                <option value="FIKTIF">FIKTIF</option>
              </select>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>Prioritas</div>

            <div className={styles.inputGroup}>
              <label>Prioritas Sistem</label>
              <input
                value={
                  form.prioritas_sistem ||
                  form.prioritas ||
                  'PRIORITAS RENDAH'
                }
                readOnly
                title="Prioritas dihitung otomatis oleh sistem."
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Prioritas Final</label>
              <input value={form.prioritas || 'PRIORITAS RENDAH'} readOnly />
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>Override Prioritas Manual</div>

            <div className={styles.inputGroup}>
              <label>Aktifkan Override</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.is_prioritas_manual}
                  onChange={handlePrioritasManualToggle}
                />
                <span>Ubah prioritas secara manual oleh staff</span>
              </label>
            </div>

            {form.is_prioritas_manual && (
              <>
                <div className={styles.inputGroup}>
                  <label>Prioritas Manual Staff</label>
                  <select
                    name="prioritas_manual"
                    value={
                      form.prioritas_manual ||
                      form.prioritas ||
                      form.prioritas_sistem
                    }
                    onChange={(e) => {
                      const value = e.target.value

                      setForm((prev) => ({
                        ...prev,
                        prioritas_manual: value,
                        prioritas: value,
                      }))
                    }}
                  >
                    <option value="PRIORITAS RENDAH">PRIORITAS RENDAH</option>
                    <option value="PRIORITAS SEDANG">PRIORITAS SEDANG</option>
                    <option value="PRIORITAS TINGGI">PRIORITAS TINGGI</option>
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label>Alasan Override Prioritas</label>
                  <textarea
                    name="alasan_prioritas_manual"
                    value={form.alasan_prioritas_manual}
                    onChange={handleChange}
                    placeholder="Masukkan alasan perubahan prioritas"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Dokumentasi Laporan</div>

            <span className={styles.viewLabel}>Foto Kejadian</span>
            <div className={styles.imgFrame}>
              {fotoKejadianUrl ? (
                <img src={fotoKejadianUrl} alt="Foto kejadian" />
              ) : (
                <div className={styles.viewValue}>Foto tidak tersedia</div>
              )}
            </div>

            {fotoKerusakanList.length > 0 && (
              <>
                <span className={styles.viewLabel}>Foto Kerusakan</span>

                {fotoKerusakanList.map((foto: string, index: number) => (
                  <div className={styles.imgFrame} key={index}>
                    <img
                      src={getFileUrl(foto)}
                      alt={`Foto kerusakan ${index + 1}`}
                    />
                  </div>
                ))}
              </>
            )}
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>Metadata EXIF</div>

            <table className={styles.exifTable}>
              <tbody>
                <tr>
                  <td>Sumber GPS Foto</td>
                  <td>{gpsSourceLabel}</td>
                </tr>

                <tr>
                  <td>EXIF Latitude</td>
                  <td>{hasExifGps ? metadata.exif_latitude : 'Tidak tersedia'}</td>
                </tr>

                <tr>
                  <td>EXIF Longitude</td>
                  <td>{hasExifGps ? metadata.exif_longitude : 'Tidak tersedia'}</td>
                </tr>

                <tr>
                  <td>Browser GPS Latitude</td>
                  <td>{hasBrowserGps ? metadata.browser_latitude : 'Tidak tersedia'}</td>
                </tr>

                <tr>
                  <td>Browser GPS Longitude</td>
                  <td>{hasBrowserGps ? metadata.browser_longitude : 'Tidak tersedia'}</td>
                </tr>

                <tr>
                  <td>Selisih Jarak</td>
                  <td>{distanceText}</td>
                </tr>

                <tr>
                  <td>Validasi Lokasi</td>
                  <td>
                    {metadata.is_valid_location == null
                      ? 'Tidak tersedia'
                      : metadata.is_valid_location
                        ? 'Sesuai GPS'
                        : 'Tidak sesuai GPS'}
                  </td>
                </tr>

                <tr>
                  <td>Keterangan</td>
                  <td>{metadataKeterangan}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>Data Pendukung OSINT</div>

            {osint ? (
              <div className={styles.osintTable}>
                <div className={styles.osintRow}>
                  <div className={styles.osintLabel}>Area</div>
                  <div className={styles.osintValue}>
                    {osint.osint_area_text || '-'}
                  </div>
                </div>

                <div className={styles.osintRow}>
                  <div className={styles.osintLabel}>Waktu Verifikasi</div>
                  <div className={styles.osintValue}>
                    {formatDate(osint.verified_at)}
                  </div>
                </div>

                <div className={styles.osintRow}>
                  <div className={styles.osintLabel}>Sumber</div>
                  <div className={styles.osintValue}>
                    {osint.osint_source || '-'}
                  </div>
                </div>

                <div className={styles.osintRow}>
                  <div className={styles.osintLabel}>Isi Konten</div>
                  <div className={styles.osintValue}>
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

      <section className={styles.bottomWideGrid}>
        <div className={styles.locationWideCard}>
          <div className={styles.cardTitle}>Lokasi Kejadian</div>

          <div className={styles.locationGrid}>
            <div className={styles.mapContainer}>
              {hasCoordinate ? (
                <MapContainer
                  center={[latitude as number, longitude as number]}
                  zoom={15}
                  scrollWheelZoom={false}
                  style={{ width: '100%', height: '320px' }}
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
                      {detail.alamat_lengkap_kejadian || '-'}
                    </Popup>
                  </Marker>
                </MapContainer>
              ) : (
                <div className={styles.viewValue}>Lokasi tidak tersedia</div>
              )}
            </div>

            <div className={styles.locationInfo}>
              <span className={styles.viewLabel}>Kecamatan</span>
              <div className={styles.viewValue}>{detail.kecamatan || '-'}</div>

              <span className={styles.viewLabel}>Kelurahan</span>
              <div className={styles.viewValue}>{detail.kelurahan || '-'}</div>

              <span className={styles.viewLabel}>Alamat Lengkap</span>
              <div className={styles.viewValue}>
                {detail.alamat_lengkap_kejadian || '-'}
              </div>

              <span className={styles.viewLabel}>Koordinat</span>
              <div className={styles.viewValue}>
                {detail.latitude || '-'}, {detail.longitude || '-'}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.korbanFullCard}>
          <h3 className={styles.korbanTitle}>Data Korban</h3>

          <label className={styles.korbanSelectLabel}>
            Pilih jenis korban yang ingin diisi
          </label>

          <select
            className={styles.korbanSelect}
            value={selectedJenisKorban}
            onChange={(e) =>
              handleSelectJenisKorban(e.target.value as JenisKorbanKey)
            }
          >
            {jenisKorbanList.map((jenis) => (
              <option key={jenis} value={jenis}>
                {jenisKorbanLabel[jenis]}
              </option>
            ))}
          </select>

          <div className={styles.korbanTableBox}>
            <table className={styles.korbanMatrix}>
              <thead>
                <tr>
                  <th>Gender</th>
                  <th>
                    Anak
                    <br />
                    (0-17 Tahun)
                  </th>
                  <th>
                    Dewasa
                    <br />
                    (18-59 Tahun)
                  </th>
                  <th>
                    Lansia
                    <br />
                    (≥ 60 Tahun)
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>Laki-laki</td>

                  <td>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                      value={activeKorban.anakL}
                      onChange={(e) =>
                        handleKorbanChange('anakL', e.target.value)
                      }
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                      value={activeKorban.dewasaL}
                      onChange={(e) =>
                        handleKorbanChange('dewasaL', e.target.value)
                      }
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                      value={activeKorban.lansiaL}
                      onChange={(e) =>
                        handleKorbanChange('lansiaL', e.target.value)
                      }
                    />
                  </td>
                </tr>

                <tr>
                  <td>Perempuan</td>

                  <td>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                      value={activeKorban.anakP}
                      onChange={(e) =>
                        handleKorbanChange('anakP', e.target.value)
                      }
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                      value={activeKorban.dewasaP}
                      onChange={(e) =>
                        handleKorbanChange('dewasaP', e.target.value)
                      }
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                      value={activeKorban.lansiaP}
                      onChange={(e) =>
                        handleKorbanChange('lansiaP', e.target.value)
                      }
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            <div className={styles.korbanTotal}>
              Total: {totalKorbanSelected} Orang
            </div>
          </div>

          <h3 className={styles.korbanSummaryTitleMain}>Ringkasan Korban</h3>

         <div className={styles.korbanCardGrid}>
  {korbanSummaryList.map((item) => {
    const isActive = item.jenis === selectedJenisKorban;

    return (
      <button
        key={item.jenis}
        type="button"
        onClick={() => handleSelectJenisKorban(item.jenis)}
        className={`${styles.korbanCardDark} ${
          isActive ? styles.korbanCardDarkActive : ""
        }`}
      >
        <div className={styles.korbanCardTitleDark}>{item.label}</div>

        <div className={styles.korbanCardNumberDark}>
          {item.total}
          <span className={styles.korbanCardUnitDark}>orang</span>
        </div>

        <div className={styles.korbanCardDetailDark}>
          Laki-laki: {item.lakiLaki} · Perempuan: {item.perempuan}
        </div>
      </button>
    );
  })}
</div>

<div className={styles.totalText}>
  Total seluruh korban final: <strong>{totalSemuaKorbanFinal}</strong> orang
</div>
</div>
</section>

<div className={styles.saveFooter}>
  <button className={styles.btnSave} onClick={handleSave} disabled={saving}>
    {saving ? "Menyimpan..." : "Simpan Laporan"}
  </button>
</div>
</main>
);
}