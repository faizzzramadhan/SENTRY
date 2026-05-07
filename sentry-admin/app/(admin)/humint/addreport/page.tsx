'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import styles from './addreport.module.css'
import LocationSearch from './LocationSearch'
import Link from 'next/link'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api/humint'

const MAX_FILE_SIZE = 3 * 1024 * 1024
const MAX_FOTO_KERUSAKAN = 2
const DRAFT_STORAGE_KEY = 'draft_laporan_admin'

const MapPicker = dynamic(() => import('./MapPicker'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '450px', background: '#111', borderRadius: '12px' }} />
  ),
})

const emptyKorban = {
  anakL: 0,
  dewasaL: 0,
  lansiaL: 0,
  anakP: 0,
  dewasaP: 0,
  lansiaP: 0,
}

type KorbanData = typeof emptyKorban

type JenisKorban =
  | 'LUKA_SAKIT'
  | 'MENINGGAL'
  | 'HILANG'
  | 'TERDAMPAK'
  | 'MENGUNGSI'

type KorbanByJenis = Record<JenisKorban, KorbanData>

type FotoSource = 'FILE_UPLOAD' | 'WEB_CAMERA'

const createEmptyKorbanByJenis = (): KorbanByJenis => ({
  LUKA_SAKIT: { ...emptyKorban },
  MENINGGAL: { ...emptyKorban },
  HILANG: { ...emptyKorban },
  TERDAMPAK: { ...emptyKorban },
  MENGUNGSI: { ...emptyKorban },
})

const isJenisKorban = (value: unknown): value is JenisKorban => {
  return (
    value === 'LUKA_SAKIT' ||
    value === 'MENINGGAL' ||
    value === 'HILANG' ||
    value === 'TERDAMPAK' ||
    value === 'MENGUNGSI'
  )
}

const dataUrlToFile = (dataUrl: string, filename: string) => {
  const arr = dataUrl.split(',')
  const mimeMatch = arr[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
  const binaryString = atob(arr[1])
  const length = binaryString.length
  const bytes = new Uint8Array(length)

  for (let i = 0; i < length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return new File([bytes], filename, { type: mime })
}

const rebuildKorbanByJenisFromPayload = (payload: any[]): KorbanByJenis => {
  const rebuilt = createEmptyKorbanByJenis()

  payload.forEach((item) => {
    const jenis = item.jenis_korban
    const gender = item.jenis_kelamin
    const umur = item.kelompok_umur
    const jumlah = Number(item.jumlah || 0)

    if (!isJenisKorban(jenis)) return

    if (gender === 'LAKI_LAKI' && umur === 'ANAK') rebuilt[jenis].anakL = jumlah
    if (gender === 'LAKI_LAKI' && umur === 'DEWASA') rebuilt[jenis].dewasaL = jumlah
    if (gender === 'LAKI_LAKI' && umur === 'LANSIA') rebuilt[jenis].lansiaL = jumlah
    if (gender === 'PEREMPUAN' && umur === 'ANAK') rebuilt[jenis].anakP = jumlah
    if (gender === 'PEREMPUAN' && umur === 'DEWASA') rebuilt[jenis].dewasaP = jumlah
    if (gender === 'PEREMPUAN' && umur === 'LANSIA') rebuilt[jenis].lansiaP = jumlah
  })

  return rebuilt
}

export default function AddReportAdmin() {
  const router = useRouter()

  const [position, setPosition] = useState<any>([-7.9819, 112.6265])
  const [lat, setLat] = useState<number>(-7.9819)
  const [lng, setLng] = useState<number>(112.6265)
  const [selectedMapAddress, setSelectedMapAddress] = useState('')
  const [isMapLocationSelected, setIsMapLocationSelected] = useState(false)

  const [selectedKec, setSelectedKec] = useState('')
  const [selectedJenis, setSelectedJenis] = useState('')

  const [kecamatanList, setKecamatanList] = useState<any[]>([])
  const [kelurahanList, setKelurahanList] = useState<any[]>([])
  const [jenisList, setJenisList] = useState<any[]>([])
  const [bencanaList, setBencanaList] = useState<any[]>([])

  const [fotoKejadian, setFotoKejadian] = useState<File | null>(null)
  const [fotoKejadianSource, setFotoKejadianSource] = useState<FotoSource>('FILE_UPLOAD')
  const [fotoKerusakan, setFotoKerusakan] = useState<File[]>([])
  const [previewKejadian, setPreviewKejadian] = useState<string | null>(null)
  const [previewKerusakan, setPreviewKerusakan] = useState<string[]>([])
  const [browserGpsCoords, setBrowserGpsCoords] = useState<{ lat: number; lng: number } | null>(null)

  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [cameraTarget, setCameraTarget] = useState<'kejadian' | 'kerusakan' | null>(null)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const fotoKejadianUploadRef = useRef<HTMLInputElement | null>(null)
  const fotoKejadianCameraRef = useRef<HTMLInputElement | null>(null)
  const fotoKerusakanUploadRef = useRef<HTMLInputElement | null>(null)
  const fotoKerusakanCameraRef = useRef<HTMLInputElement | null>(null)

  const [jenisKorban, setJenisKorban] = useState<JenisKorban>('LUKA_SAKIT')
  const [korban, setKorban] = useState(emptyKorban)
  const [korbanByJenis, setKorbanByJenis] = useState<KorbanByJenis>(createEmptyKorbanByJenis())

  const [form, setForm] = useState({
    nama_pelapor: '',
    no_hp: '',
    alamat_pelapor: '',
    status_laporan: 'IDENTIFIKASI',
    petugas_trc: '',
    id_jenis: '',
    id_bencana: '',
    id_kecamatan: '',
    id_kelurahan: '',
    waktu_kejadian: '',
    kronologi: '',
    jenis_lokasi: '',
    alamat_lengkap_kejadian: '',
    kerusakan_identifikasi: '',
    terdampak_identifikasi: '',
    penyebab_identifikasi: '',
    tindak_lanjut: '',
  })

  const totalKorban =
    korban.anakL +
    korban.dewasaL +
    korban.lansiaL +
    korban.anakP +
    korban.dewasaP +
    korban.lansiaP

  const isMobileOrTablet = () => {
    if (typeof window === 'undefined') return false

    const userAgent = navigator.userAgent || ''
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
    const isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 1

    return mobileRegex.test(userAgent) || isIpadOs || hasTouch
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const isValidImageSize = (file: File) => file.size <= MAX_FILE_SIZE

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    window.setTimeout(() => setToast(null), 3200)
  }

  const getCurrentBrowserGps = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        resolve(null)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        () => resolve(null),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      )
    })
  }

  const validateBeforeConfirm = () => {
    const requiredFields: Array<{ key: keyof typeof form; label: string }> = [
      { key: 'nama_pelapor', label: 'Nama Pelapor' },
      { key: 'no_hp', label: 'Nomor HP' },
      { key: 'alamat_pelapor', label: 'Alamat Rumah Pelapor' },
      { key: 'petugas_trc', label: 'Penugasan Petugas' },
      { key: 'id_jenis', label: 'Jenis Bencana' },
      { key: 'id_bencana', label: 'Nama Kejadian Spesifik' },
      { key: 'waktu_kejadian', label: 'Waktu Kejadian' },
      { key: 'kronologi', label: 'Kronologi Kejadian' },
      { key: 'id_kecamatan', label: 'Kecamatan' },
      { key: 'id_kelurahan', label: 'Kelurahan' },
      { key: 'jenis_lokasi', label: 'Jenis Lokasi' },
      { key: 'alamat_lengkap_kejadian', label: 'Alamat Lengkap Kejadian' },
      { key: 'kerusakan_identifikasi', label: 'Kerusakan Bangunan' },
      { key: 'terdampak_identifikasi', label: 'Terdampak' },
      { key: 'penyebab_identifikasi', label: 'Penyebab' },
      { key: 'tindak_lanjut', label: 'Tindak Lanjut Petugas' },
    ]

    const missingFields = requiredFields
      .filter((item) => !String(form[item.key] || '').trim())
      .map((item) => item.label)

    const hasValidMapCoordinate =
      isMapLocationSelected &&
      Number.isFinite(Number(lat)) &&
      Number.isFinite(Number(lng)) &&
      selectedMapAddress.trim().length > 0

    if (!hasValidMapCoordinate) missingFields.push('Titik Koordinat Maps')
    if (!fotoKejadian) missingFields.push('Foto Kejadian Utama')

    if (missingFields.length > 0) {
      const visibleFields = missingFields.slice(0, 4).join(', ')
      const extraText = missingFields.length > 4 ? ` dan ${missingFields.length - 4} field lainnya` : ''
      showToast('error', `Lengkapi dulu: ${visibleFields}${extraText}`)
      return false
    }

    return true
  }

  const openFotoKejadianUpload = () => fotoKejadianUploadRef.current?.click()
  const openFotoKerusakanUpload = () => fotoKerusakanUploadRef.current?.click()

  const openSmartCamera = (target: 'kejadian' | 'kerusakan') => {
    if (isMobileOrTablet()) {
      if (target === 'kejadian') fotoKejadianCameraRef.current?.click()
      if (target === 'kerusakan') fotoKerusakanCameraRef.current?.click()
      return
    }

    openLaptopCamera(target)
  }

  const openLaptopCamera = async (target: 'kejadian' | 'kerusakan') => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('error', 'Browser tidak mendukung akses kamera langsung')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })

      setCameraTarget(target)
      setCameraStream(stream)

      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {
            showToast('error', 'Preview kamera gagal diputar')
          })
        }
      }, 100)
    } catch (error) {
      showToast('error', 'Kamera tidak bisa dibuka. Izinkan akses kamera di browser.')
    }
  }

  const closeLaptopCamera = () => {
    if (cameraStream) cameraStream.getTracks().forEach((track) => track.stop())

    setCameraStream(null)
    setCameraTarget(null)

    if (videoRef.current) videoRef.current.srcObject = null
  }

  const captureLaptopCamera = () => {
    if (!videoRef.current || !canvasRef.current || !cameraTarget) return

    const video = videoRef.current
    const canvas = canvasRef.current

    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          showToast('error', 'Gagal mengambil foto dari kamera')
          return
        }

        const file = new File([blob], `kamera-${Date.now()}.jpg`, { type: 'image/jpeg' })
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)

        if (cameraTarget === 'kejadian') handleFotoKejadianChange(dataTransfer.files, 'WEB_CAMERA')
        if (cameraTarget === 'kerusakan') handleFotoKerusakanChange(dataTransfer.files)

        closeLaptopCamera()
      },
      'image/jpeg',
      0.92
    )
  }

  const handleFotoKejadianChange = async (
    files: FileList | null,
    source: FotoSource = 'FILE_UPLOAD'
  ) => {
    const file = files?.[0] || null
    if (!file) return

    if (!isValidImageSize(file)) {
      showToast('error', 'Ukuran foto kejadian maksimal 3MB')
      setFotoKejadian(null)
      setPreviewKejadian(null)
      setFotoKejadianSource('FILE_UPLOAD')
      setBrowserGpsCoords(null)
      return
    }

    if (previewKejadian) URL.revokeObjectURL(previewKejadian)

    setFotoKejadian(file)
    setFotoKejadianSource(source)
    setPreviewKejadian(URL.createObjectURL(file))

    if (source === 'WEB_CAMERA') {
      const gps = await getCurrentBrowserGps()

      if (gps) {
        setBrowserGpsCoords(gps)
        showToast('success', `Foto kamera berhasil dipilih. GPS browser terbaca: ${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}`)
      } else {
        setBrowserGpsCoords(null)
        showToast('success', 'Foto kamera berhasil dipilih, tetapi GPS browser tidak tersedia.')
      }
    } else {
      setBrowserGpsCoords(null)
      showToast('success', 'Foto kejadian berhasil dipilih dari file. Fallback GPS browser tidak dipakai untuk upload file.')
    }
  }

  const handleFotoKerusakanChange = (files: FileList | null) => {
    const selectedFiles = Array.from(files || [])
    if (selectedFiles.length === 0) return

    if (fotoKerusakan.length + selectedFiles.length > MAX_FOTO_KERUSAKAN) {
      showToast('error', 'Foto kerusakan maksimal 2 foto')
      return
    }

    const combinedFiles = [...fotoKerusakan, ...selectedFiles]
    const oversizedFile = combinedFiles.find((file) => !isValidImageSize(file))

    if (oversizedFile) {
      showToast('error', 'Setiap foto kerusakan maksimal 3MB')
      return
    }

    previewKerusakan.forEach((src) => URL.revokeObjectURL(src))
    setFotoKerusakan(combinedFiles)
    setPreviewKerusakan(combinedFiles.map((file) => URL.createObjectURL(file)))
    showToast('success', 'Foto kerusakan berhasil dipilih')
  }

  useEffect(() => {
    const savedDraft = sessionStorage.getItem(DRAFT_STORAGE_KEY)
    if (!savedDraft) return

    try {
      const draft = JSON.parse(savedDraft)

      if (draft.form) {
        setForm((prev) => ({ ...prev, ...draft.form }))
        setSelectedKec(draft.form.id_kecamatan || '')
        setSelectedJenis(draft.form.id_jenis || '')
      }

      if (Array.isArray(draft.position)) setPosition(draft.position)
      if (draft.lat !== undefined && draft.lat !== null) setLat(Number(draft.lat))
      if (draft.lng !== undefined && draft.lng !== null) setLng(Number(draft.lng))

      if (draft.browser_latitude && draft.browser_longitude) {
        setBrowserGpsCoords({ lat: Number(draft.browser_latitude), lng: Number(draft.browser_longitude) })
      }

      if (typeof draft.selectedMapAddress === 'string') {
        setSelectedMapAddress(draft.selectedMapAddress)
      } else if (draft.form?.alamat_lengkap_kejadian) {
        setSelectedMapAddress(draft.form.alamat_lengkap_kejadian)
      }

      if (draft.isMapLocationSelected === true) {
        setIsMapLocationSelected(true)
      } else if (draft.form?.alamat_lengkap_kejadian && draft.lat && draft.lng) {
        setIsMapLocationSelected(true)
      }

      const restoredJenis: JenisKorban = isJenisKorban(draft.jenisKorban)
        ? draft.jenisKorban
        : 'LUKA_SAKIT'

      setJenisKorban(restoredJenis)

      let restoredKorbanByJenis = createEmptyKorbanByJenis()

      if (draft.korbanByJenis) {
        restoredKorbanByJenis = {
          ...createEmptyKorbanByJenis(),
          ...(draft.korbanByJenis as Partial<KorbanByJenis>),
        }
        setKorbanByJenis(restoredKorbanByJenis)
      } else if (Array.isArray(draft.korbanPayload)) {
        restoredKorbanByJenis = rebuildKorbanByJenisFromPayload(draft.korbanPayload)
        setKorbanByJenis(restoredKorbanByJenis)
      }

      if (draft.korban) setKorban(draft.korban)
      else setKorban(restoredKorbanByJenis[restoredJenis] || emptyKorban)

      if (draft.fotoKejadianBase64) {
        const restoredFile = dataUrlToFile(draft.fotoKejadianBase64, 'foto-kejadian-tersimpan.jpg')
        setFotoKejadian(restoredFile)
        setPreviewKejadian(draft.fotoKejadianBase64)
        setFotoKejadianSource(draft.foto_kejadian_source || 'FILE_UPLOAD')
      }

      if (Array.isArray(draft.fotoKerusakanBase64) && draft.fotoKerusakanBase64.length > 0) {
        const restoredFiles = draft.fotoKerusakanBase64.map((item: string, index: number) =>
          dataUrlToFile(item, `foto-kerusakan-tersimpan-${index + 1}.jpg`)
        )
        setFotoKerusakan(restoredFiles)
        setPreviewKerusakan(draft.fotoKerusakanBase64)
      }
    } catch (error) {
      console.error('Gagal restore draft laporan:', error)
    }
  }, [])

  useEffect(() => {
    fetch(`${API_URL}/data-kecamatan`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => setKecamatanList(data.data || []))
      .catch(() => setKecamatanList([]))

    fetch(`${API_URL}/jenis-bencana`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => setJenisList(data.data || []))
      .catch(() => setJenisList([]))
  }, [])

  useEffect(() => {
    if (!selectedKec) {
      setKelurahanList([])
      return
    }

    fetch(`${API_URL}/data-kelurahan?kecamatan_id=${selectedKec}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => setKelurahanList(data.data || []))
      .catch(() => setKelurahanList([]))
  }, [selectedKec])

  useEffect(() => {
    if (!selectedJenis) {
      setBencanaList([])
      return
    }

    fetch(`${API_URL}/nama-bencana?jenis_id=${selectedJenis}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => setBencanaList(data.data || []))
      .catch(() => setBencanaList([]))
  }, [selectedJenis])

  useEffect(() => {
    return () => {
      if (cameraStream) cameraStream.getTracks().forEach((track) => track.stop())
      if (previewKejadian && !previewKejadian.startsWith('data:')) URL.revokeObjectURL(previewKejadian)
      previewKerusakan.forEach((src) => {
        if (!src.startsWith('data:')) URL.revokeObjectURL(src)
      })
    }
  }, [cameraStream, previewKejadian, previewKerusakan])

  const handleChangeJenisKorban = (newJenis: JenisKorban) => {
    const updated: KorbanByJenis = {
      ...korbanByJenis,
      [jenisKorban]: korban,
    }

    setKorbanByJenis(updated)
    setJenisKorban(newJenis)
    setKorban(updated[newJenis] || emptyKorban)
  }

  const getTotalByJenis = (data: any) => {
    return (
      Number(data.anakL || 0) +
      Number(data.dewasaL || 0) +
      Number(data.lansiaL || 0) +
      Number(data.anakP || 0) +
      Number(data.dewasaP || 0) +
      Number(data.lansiaP || 0)
    )
  }

  const getLabelJenisKorban = (jenis: string) => {
    const labels: any = {
      LUKA_SAKIT: 'Luka/Sakit',
      MENINGGAL: 'Meninggal',
      HILANG: 'Hilang',
      TERDAMPAK: 'Terdampak',
      MENGUNGSI: 'Mengungsi',
    }

    return labels[jenis] || jenis
  }

  const buildKorbanPayload = () => {
    const merged: KorbanByJenis = {
      ...korbanByJenis,
      [jenisKorban]: korban,
    }

    const rows: any[] = []

    Object.entries(merged).forEach(([jenis, data]) => {
      rows.push(
        { jenis_korban: jenis, jenis_kelamin: 'LAKI_LAKI', kelompok_umur: 'ANAK', jumlah: data.anakL },
        { jenis_korban: jenis, jenis_kelamin: 'LAKI_LAKI', kelompok_umur: 'DEWASA', jumlah: data.dewasaL },
        { jenis_korban: jenis, jenis_kelamin: 'LAKI_LAKI', kelompok_umur: 'LANSIA', jumlah: data.lansiaL },
        { jenis_korban: jenis, jenis_kelamin: 'PEREMPUAN', kelompok_umur: 'ANAK', jumlah: data.anakP },
        { jenis_korban: jenis, jenis_kelamin: 'PEREMPUAN', kelompok_umur: 'DEWASA', jumlah: data.dewasaP },
        { jenis_korban: jenis, jenis_kelamin: 'PEREMPUAN', kelompok_umur: 'LANSIA', jumlah: data.lansiaP }
      )
    })

    return rows.filter((item) => Number(item.jumlah) > 0)
  }

  const removeFotoKejadian = () => {
    if (previewKejadian && !previewKejadian.startsWith('data:')) URL.revokeObjectURL(previewKejadian)

    setFotoKejadian(null)
    setPreviewKejadian(null)
    setFotoKejadianSource('FILE_UPLOAD')
    setBrowserGpsCoords(null)
    showToast('success', 'Foto kejadian dihapus')
  }

  const removeFotoKerusakan = (index: number) => {
    if (previewKerusakan[index] && !previewKerusakan[index].startsWith('data:')) {
      URL.revokeObjectURL(previewKerusakan[index])
    }

    setFotoKerusakan((prev) => prev.filter((_, i) => i !== index))
    setPreviewKerusakan((prev) => prev.filter((_, i) => i !== index))
    showToast('success', 'Foto kerusakan dihapus')
  }

  const handleSubmit = async () => {
    if (!validateBeforeConfirm()) return

    try {
      setLoading(true)

      const korbanPayload = buildKorbanPayload()
      const totalSemuaKorban = korbanPayload.reduce((total, item) => total + Number(item.jumlah || 0), 0)
      const fotoKejadianBase64 = fotoKejadian ? await fileToBase64(fotoKejadian) : null
      const fotoKerusakanBase64 = await Promise.all(fotoKerusakan.map((file) => fileToBase64(file)))

      const selectedKecamatanName =
        kecamatanList.find((item) => String(item.kecamatan_id) === String(form.id_kecamatan))?.nama_kecamatan || '-'
      const selectedKelurahanName =
        kelurahanList.find((item) => String(item.kelurahan_id) === String(form.id_kelurahan))?.nama_kelurahan || '-'
      const selectedJenisName =
        jenisList.find((item) => String(item.jenis_id) === String(form.id_jenis))?.nama_jenis || '-'
      const selectedBencanaName =
        bencanaList.find((item) => String(item.bencana_id) === String(form.id_bencana))?.nama_bencana || '-'

      const draft = {
        form,
        lat,
        lng,
        position,
        korbanPayload,
        totalSemuaKorban,
        fotoKejadianBase64,
        fotoKerusakanBase64,
        selectedKecamatanName,
        selectedKelurahanName,
        selectedJenisName,
        selectedBencanaName,
        selectedMapAddress,
        isMapLocationSelected,
        jenisKorban,
        korban,
        korbanByJenis: { ...korbanByJenis, [jenisKorban]: korban },
        foto_kejadian_source: fotoKejadianSource,
        is_camera_capture: fotoKejadianSource === 'WEB_CAMERA',
        browser_gps_lat: fotoKejadianSource === 'WEB_CAMERA' ? browserGpsCoords?.lat ?? null : null,
        browser_gps_lng: fotoKejadianSource === 'WEB_CAMERA' ? browserGpsCoords?.lng ?? null : null,
        browser_latitude: fotoKejadianSource === 'WEB_CAMERA' ? browserGpsCoords?.lat ?? null : null,
        browser_longitude: fotoKejadianSource === 'WEB_CAMERA' ? browserGpsCoords?.lng ?? null : null,
        created_by: 'staff',
      }

      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
      showToast('success', 'Laporan berhasil diproses. Membuka halaman konfirmasi...')
      window.setTimeout(() => router.push('/humint/confirm'), 750)
    } catch (error: any) {
      showToast('error', error.message || 'Gagal mengirim laporan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <h1>TAMBAH LAPORAN HUMINT</h1>
          <p>Portal Admin: Input & Assessment Data Kejadian Bencana</p>
        </div>
        <Link href="/humint">
          <button className={styles.btnBack}>← Kembali</button>
        </Link>
      </header>

      {toast && (
        <div className={toast.type === 'success' ? styles.toastSuccess : styles.toastError}>
          {toast.message}
        </div>
      )}

      <div className={styles.topGrid}>
        <div className={styles.column}>
          <div className={styles.card}>
            <h3>Informasi Pelapor</h3>
            <div className={styles.rowFields}>
              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>Nama Pelapor</label>
                <input name="nama_pelapor" value={form.nama_pelapor} onChange={handleChange} type="text" placeholder="Nama asli pelapor" />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>Nomor HP</label>
                <input name="no_hp" value={form.no_hp} onChange={handleChange} type="tel" placeholder="08..." />
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Alamat Rumah Pelapor</label>
              <textarea name="alamat_pelapor" value={form.alamat_pelapor} onChange={handleChange} placeholder="Alamat lengkap pelapor..." rows={3} />
            </div>
          </div>

          <div className={styles.card}>
            <h3>Operasional BPBD</h3>
            <div className={styles.fieldGroup}>
              <div className={styles.inputGroupVertical}>
                <label className={styles.fieldLabel}>Status Laporan</label>
                <select name="status_laporan" value={form.status_laporan} onChange={handleChange} className={styles.selectField}>
                  <option value="IDENTIFIKASI">Identifikasi</option>
                  <option value="TERVERIFIKASI">Terverifikasi</option>
                  <option value="DITANGANI">Ditangani</option>
                  <option value="SELESAI">Selesai</option>
                  <option value="FIKTIF">Fiktif</option>
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>Penugasan Petugas</label>
                <input name="petugas_trc" value={form.petugas_trc} onChange={handleChange} type="text" placeholder="Nama regu..." />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.column}>
          <div className={styles.card} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3>Detail Kejadian Bencana</h3>
            <div className={styles.rowFields}>
              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>Jenis Bencana</label>
                <select
                  name="id_jenis"
                  value={form.id_jenis}
                  onChange={(e) => {
                    const value = e.target.value
                    setSelectedJenis(value)
                    setForm((prev) => ({ ...prev, id_jenis: value, id_bencana: '' }))
                  }}
                >
                  <option value="">Pilih jenis bencana...</option>
                  {jenisList.map((item) => (
                    <option key={item.jenis_id} value={String(item.jenis_id)}>{item.nama_jenis}</option>
                  ))}
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>Waktu Kejadian</label>
                <input name="waktu_kejadian" value={form.waktu_kejadian} onChange={handleChange} type="datetime-local" />
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Nama Kejadian Spesifik</label>
              <select name="id_bencana" value={form.id_bencana} onChange={handleChange}>
                <option value="">{selectedJenis ? 'Pilih kejadian...' : 'Pilih jenis bencana dulu'}</option>
                {bencanaList.map((item) => (
                  <option key={item.bencana_id} value={String(item.bencana_id)}>{item.nama_bencana}</option>
                ))}
              </select>
            </div>
            <div className={styles.inputGroup} style={{ flexGrow: 1 }}>
              <label className={styles.fieldLabel}>Kronologi Kejadian</label>
              <textarea name="kronologi" value={form.kronologi} onChange={handleChange} className={styles.textAreaFull} placeholder="Uraikan laporan lengkap masyarakat secara detail di sini..." />
            </div>
          </div>
        </div>

        <div className={styles.column}>
          <div className={styles.card}>
            <h3>Administrasi Wilayah</h3>
            <div className={styles.rowFields}>
              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>Kecamatan</label>
                <select
                  name="id_kecamatan"
                  value={form.id_kecamatan}
                  onChange={(e) => {
                    const value = e.target.value
                    setSelectedKec(value)
                    setForm((prev) => ({ ...prev, id_kecamatan: value, id_kelurahan: '' }))
                  }}
                >
                  <option value="">Pilih...</option>
                  {kecamatanList.map((item) => (
                    <option key={item.kecamatan_id} value={String(item.kecamatan_id)}>{item.nama_kecamatan}</option>
                  ))}
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>Kelurahan</label>
                <select name="id_kelurahan" value={form.id_kelurahan} onChange={handleChange}>
                  <option value="">{selectedKec ? 'Pilih Kelurahan...' : 'Pilih kecamatan dulu'}</option>
                  {kelurahanList.map((item) => (
                    <option key={item.kelurahan_id} value={String(item.kelurahan_id)}>{item.nama_kelurahan}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.inputGroup}>
                <label>Jenis Lokasi *</label>
                <select name="jenis_lokasi" value={form.jenis_lokasi} onChange={handleChange}>
                  <option value="">Pilih Jenis Lokasi</option>
                  <option value="PEMUKIMAN">Pemukiman</option>
                  <option value="JALAN_RAYA">Jalan Raya</option>
                  <option value="FASILITAS_UMUM">Fasilitas Umum</option>
                  <option value="AREA_TIDAK_PADAT">Area Tidak Padat</option>
                </select>
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Alamat Lengkap Kejadian</label>
              <textarea
                name="alamat_lengkap_kejadian"
                value={form.alamat_lengkap_kejadian}
                onChange={(e) => {
                  handleChange(e)
                  if (e.target.value !== selectedMapAddress) setIsMapLocationSelected(false)
                }}
                placeholder="Detail lokasi (Jl, RT/RW)..."
                rows={2}
              />
            </div>
          </div>

          <div className={styles.card}>
            <h3>Assessment Dampak</h3>
            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Kerusakan Bangunan</label>
              <textarea name="kerusakan_identifikasi" value={form.kerusakan_identifikasi} onChange={handleChange} placeholder="Deskripsi kerusakan..." rows={2} />
            </div>
            <div className={styles.rowFields}>
              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>Terdampak</label>
                <input name="terdampak_identifikasi" value={form.terdampak_identifikasi} onChange={handleChange} type="text" placeholder="Contoh: 15 KK" />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>Penyebab</label>
                <input name="penyebab_identifikasi" value={form.penyebab_identifikasi} onChange={handleChange} type="text" placeholder="Faktor penyebab..." />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.card} style={{ marginTop: '20px' }}>
        <h3>Data Korban</h3>
        <div className={styles.inputGroup}>
          <label>Pilih jenis korban yang ingin diisi</label>
          <select value={jenisKorban} onChange={(e) => handleChangeJenisKorban(e.target.value as JenisKorban)}>
            <option value="LUKA_SAKIT">Luka/Sakit</option>
            <option value="MENINGGAL">Meninggal</option>
            <option value="HILANG">Hilang</option>
            <option value="TERDAMPAK">Terdampak</option>
            <option value="MENGUNGSI">Mengungsi</option>
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
            <input type="number" value={korban.anakL} onChange={(e) => setKorban({ ...korban, anakL: +e.target.value })} />
            <input type="number" value={korban.dewasaL} onChange={(e) => setKorban({ ...korban, dewasaL: +e.target.value })} />
            <input type="number" value={korban.lansiaL} onChange={(e) => setKorban({ ...korban, lansiaL: +e.target.value })} />
          </div>
          <div className={styles.korbanRow}>
            <div className={styles.korbanLabel}>Perempuan</div>
            <input type="number" value={korban.anakP} onChange={(e) => setKorban({ ...korban, anakP: +e.target.value })} />
            <input type="number" value={korban.dewasaP} onChange={(e) => setKorban({ ...korban, dewasaP: +e.target.value })} />
            <input type="number" value={korban.lansiaP} onChange={(e) => setKorban({ ...korban, lansiaP: +e.target.value })} />
          </div>
          <div className={styles.totalText}>Total: <strong>{totalKorban} Orang</strong></div>
        </div>

        <div style={{ marginTop: '18px' }}>
          <h4 style={{ marginBottom: '10px' }}>Ringkasan Korban</h4>
          {Object.entries({ ...korbanByJenis, [jenisKorban]: korban }).map(([jenis, data]: any) => {
            const total = getTotalByJenis(data)
            if (total === 0) return null

            return (
              <div key={jenis} style={{ padding: '12px', border: '1px solid #333', borderRadius: '10px', marginBottom: '10px', background: '#111' }}>
                <strong>{getLabelJenisKorban(jenis)}</strong>
                <p style={{ margin: '6px 0 0', color: '#ccc' }}>
                  Total: {total} orang — Laki-laki: {data.anakL + data.dewasaL + data.lansiaL}, Perempuan: {data.anakP + data.dewasaP + data.lansiaP}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      <div className={styles.fullWidthCard}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Tindakan Nyata (Real Action)</h2>
          <div className={styles.actionGroup}>
            <label className={styles.fieldLabel}>TINDAK LANJUT PETUGAS</label>
            <textarea name="tindak_lanjut" value={form.tindak_lanjut} onChange={handleChange} className={styles.textAreaAction} placeholder="Jelaskan tindakan yang telah diambil oleh tim di lapangan secara detail..." />
          </div>
        </div>
      </div>

      <div className={styles.bottomSection}>
        <div className={styles.card}>
          <div className={styles.mapHeader}><h3>Verifikasi Geospasial & Dokumentasi</h3></div>
          <div className={styles.mapContentGrid}>
            <div className={styles.mapWrapper}>
              <div className={styles.searchInside}>
                <label className={styles.fieldLabel}>Cari Lokasi Spesifik</label>
                <LocationSearch
                  value={selectedMapAddress}
                  onSelect={(item: any) => {
                    const lt = parseFloat(item.lat)
                    const ln = parseFloat(item.lon)
                    const fullAddress = item.display_name || ''

                    setPosition([lt, ln])
                    setLat(lt)
                    setLng(ln)
                    setSelectedMapAddress(fullAddress)
                    setIsMapLocationSelected(true)
                    setForm((prev) => ({ ...prev, alamat_lengkap_kejadian: fullAddress }))
                  }}
                />
              </div>
              <div className={styles.mapFrame}>
                <MapPicker position={position} />
                <div className={styles.floatingCoords}>
                  <div className={styles.coordItem}><small>LATITUDE</small><span>{lat.toFixed(6)}</span></div>
                  <div className={styles.coordDivider} />
                  <div className={styles.coordItem}><small>LONGITUDE</small><span>{lng.toFixed(6)}</span></div>
                </div>
              </div>
            </div>

            <div className={styles.uploadArea}>
              <input ref={fotoKejadianUploadRef} type="file" accept="image/jpeg,image/jpg" style={{ display: 'none' }} onChange={(e) => handleFotoKejadianChange(e.target.files, 'FILE_UPLOAD')} />
              <input ref={fotoKejadianCameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => handleFotoKejadianChange(e.target.files, 'WEB_CAMERA')} />
              <input ref={fotoKerusakanUploadRef} type="file" accept="image/jpeg,image/jpg" multiple style={{ display: 'none' }} onChange={(e) => handleFotoKerusakanChange(e.target.files)} />
              <input ref={fotoKerusakanCameraRef} type="file" accept="image/*" capture="environment" multiple style={{ display: 'none' }} onChange={(e) => handleFotoKerusakanChange(e.target.files)} />

              <div className={`${styles.uploadBox} ${styles.uploadCardCustom}`}>
                <div className={styles.boxContent}>
                  <span className={styles.boxIcon}></span>
                  <label className={`${styles.fieldLabel} ${styles.uploadCardLabel}`}>FOTO KEJADIAN UTAMA</label>
                  <p>Pilih file biasa atau ambil langsung dari kamera. Fallback GPS hanya aktif untuk kamera langsung.</p>
                  <div className={styles.uploadActionGrid}>
                    <button type="button" onClick={openFotoKejadianUpload} className={styles.uploadActionBtn}>🖼️ Upload File</button>
                    <button type="button" onClick={() => openSmartCamera('kejadian')} className={styles.uploadActionBtn}>📷 Ambil Kamera</button>
                  </div>
                  {previewKejadian ? (
                    <div className={styles.previewMain}>
                      <img src={previewKejadian} alt="Preview kejadian" />
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeFotoKejadian() }} className={styles.removePreviewBtn}>×</button>
                    </div>
                  ) : (
                    <span className={styles.emptyPhotoText}>Belum ada foto dipilih</span>
                  )}
                  <span className={styles.emptyPhotoText}>Sumber Foto: {fotoKejadianSource === 'WEB_CAMERA' ? 'Kamera Web' : 'Upload File'}</span>
                  <span className={styles.emptyPhotoText}>GPS Browser: {fotoKejadianSource === 'WEB_CAMERA' && browserGpsCoords ? `${browserGpsCoords.lat.toFixed(6)}, ${browserGpsCoords.lng.toFixed(6)}` : '-'}</span>
                </div>
              </div>

              <div className={`${styles.uploadBox} ${styles.uploadCardCustom}`}>
                <div className={styles.boxContent}>
                  <span className={styles.boxIcon}></span>
                  <label className={`${styles.fieldLabel} ${styles.uploadCardLabel}`}>FOTO BUKTI KERUSAKAN</label>
                  <p>Pilih foto dari file atau ambil langsung dari kamera.</p>
                  <div className={styles.uploadActionGrid}>
                    <button type="button" onClick={openFotoKerusakanUpload} className={styles.uploadActionBtn}>🖼️ Upload File</button>
                    <button type="button" onClick={() => openSmartCamera('kerusakan')} className={styles.uploadActionBtn}>📷 Ambil Kamera</button>
                  </div>
                  {previewKerusakan.length > 0 ? (
                    <div className={styles.previewDamageWrap}>
                      {previewKerusakan.map((src, index) => (
                        <div key={index} className={styles.previewDamageItem}>
                          <img src={src} alt={`Preview kerusakan ${index + 1}`} />
                          <button type="button" onClick={(e) => { e.stopPropagation(); removeFotoKerusakan(index) }} className={styles.removePreviewSmallBtn}>×</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className={styles.emptyPhotoText}>Maksimal 2 foto, masing-masing 3MB</span>
                  )}
                </div>
              </div>

              <button className={styles.btnConfirm} onClick={handleSubmit} disabled={loading}>
                {loading ? 'MEMPROSES...' : 'LANJUTKAN KE KONFIRMASI'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {cameraTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: 'min(720px, 100%)', background: '#111', borderRadius: '16px', padding: '18px', border: '1px solid #333' }}>
            <video ref={videoRef} style={{ width: '100%', borderRadius: '12px', background: '#000' }} playsInline muted />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '14px' }}>
              <button type="button" onClick={closeLaptopCamera} className={styles.uploadActionBtn}>Batal</button>
              <button type="button" onClick={captureLaptopCamera} className={styles.btnConfirm}>Ambil Foto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
