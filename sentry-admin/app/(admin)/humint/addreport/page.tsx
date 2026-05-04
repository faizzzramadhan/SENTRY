'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import styles from './addreport.module.css'
import LocationSearch from './LocationSearch'
import Link from 'next/link'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/humint'

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

const isJenisKorban = (value: unknown): value is JenisKorban => {
  return (
    value === 'LUKA_SAKIT' ||
    value === 'MENINGGAL' ||
    value === 'HILANG' ||
    value === 'TERDAMPAK' ||
    value === 'MENGUNGSI'
  )
}

const createEmptyKorbanByJenis = (): KorbanByJenis => ({
  LUKA_SAKIT: { ...emptyKorban },
  MENINGGAL: { ...emptyKorban },
  HILANG: { ...emptyKorban },
  TERDAMPAK: { ...emptyKorban },
  MENGUNGSI: { ...emptyKorban },
})

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
    const mobileRegex =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
    const isIpadOs =
      navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
    const hasTouch =
      'ontouchstart' in window || navigator.maxTouchPoints > 1

    return mobileRegex.test(userAgent) || isIpadOs || hasTouch
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const isValidImageSize = (file: File) => {
    return file.size <= MAX_FILE_SIZE
  }

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

    window.setTimeout(() => {
      setToast(null)
    }, 3200)
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
        () => {
          resolve(null)
        },
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

    if (!hasValidMapCoordinate) {
      missingFields.push('Titik Koordinat Maps')
    }

    if (!fotoKejadian) {
      missingFields.push('Foto Kejadian Utama')
    }

    if (missingFields.length > 0) {
      const visibleFields = missingFields.slice(0, 4).join(', ')
      const extraText =
        missingFields.length > 4 ? ` dan ${missingFields.length - 4} field lainnya` : ''

      showToast('error', `Lengkapi dulu: ${visibleFields}${extraText}`)
      return false
    }

    return true
  }

  const openFotoKejadianUpload = () => {
    fotoKejadianUploadRef.current?.click()
  }

  const openFotoKerusakanUpload = () => {
    fotoKerusakanUploadRef.current?.click()
  }

  const openSmartCamera = (target: 'kejadian' | 'kerusakan') => {
    if (isMobileOrTablet()) {
      if (target === 'kejadian') {
        fotoKejadianCameraRef.current?.click()
      }

      if (target === 'kerusakan') {
        fotoKerusakanCameraRef.current?.click()
      }

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
        video: {
          facingMode: 'user',
        },
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
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
    }

    setCameraStream(null)
    setCameraTarget(null)

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const captureLaptopCamera = () => {
    if (!videoRef.current || !canvasRef.current || !cameraTarget) return

    const video = videoRef.current
    const canvas = canvasRef.current

    const videoWidth = video.videoWidth || 1280
    const videoHeight = video.videoHeight || 720

    canvas.width = videoWidth
    canvas.height = videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          showToast('error', 'Gagal mengambil foto dari kamera')
          return
        }

        const file = new File([blob], `kamera-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        })

        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)

        if (cameraTarget === 'kejadian') {
          handleFotoKejadianChange(dataTransfer.files)
        }

        if (cameraTarget === 'kerusakan') {
          handleFotoKerusakanChange(dataTransfer.files)
        }

        closeLaptopCamera()
      },
      'image/jpeg',
      0.92
    )
  }

  const handleFotoKejadianChange = async (files: FileList | null) => {
    const file = files?.[0] || null

    if (!file) return

    if (!isValidImageSize(file)) {
      showToast('error', 'Ukuran foto kejadian maksimal 3MB')
      setFotoKejadian(null)
      setPreviewKejadian(null)
      setBrowserGpsCoords(null)
      return
    }

    if (previewKejadian) {
      URL.revokeObjectURL(previewKejadian)
    }

    setFotoKejadian(file)
    setPreviewKejadian(URL.createObjectURL(file))

    const gps = await getCurrentBrowserGps()

    if (gps) {
      setBrowserGpsCoords(gps)
      showToast(
        'success',
        `Foto kejadian berhasil dipilih. GPS browser terbaca: ${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}`
      )
    } else {
      setBrowserGpsCoords(null)
      showToast(
        'success',
        'Foto kejadian berhasil dipilih, tetapi GPS browser tidak tersedia. Pastikan izin lokasi browser aktif.'
      )
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
        setForm((prev) => ({
          ...prev,
          ...draft.form,
        }))

        setSelectedKec(draft.form.id_kecamatan || '')
        setSelectedJenis(draft.form.id_jenis || '')
      }

      if (Array.isArray(draft.position)) {
        setPosition(draft.position)
      }

      if (draft.lat !== undefined && draft.lat !== null) {
        setLat(Number(draft.lat))
      }

      if (draft.lng !== undefined && draft.lng !== null) {
        setLng(Number(draft.lng))
      }

      const draftBrowserLat =
        draft.browser_gps_lat ??
        draft.browser_latitude ??
        draft.browserGpsLat ??
        draft.gps_browser_lat ??
        null

      const draftBrowserLng =
        draft.browser_gps_lng ??
        draft.browser_longitude ??
        draft.browserGpsLng ??
        draft.gps_browser_lng ??
        null

      if (
        draftBrowserLat !== undefined &&
        draftBrowserLat !== null &&
        draftBrowserLat !== '' &&
        draftBrowserLng !== undefined &&
        draftBrowserLng !== null &&
        draftBrowserLng !== ''
      ) {
        setBrowserGpsCoords({
          lat: Number(draftBrowserLat),
          lng: Number(draftBrowserLng),
        })
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

      let restoredKorbanByJenis: KorbanByJenis = createEmptyKorbanByJenis()

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

      if (draft.korban) {
        setKorban(draft.korban)
      } else {
        setKorban(restoredKorbanByJenis[restoredJenis] || emptyKorban)
      }

      if (draft.fotoKejadianBase64) {
        const restoredFile = dataUrlToFile(
          draft.fotoKejadianBase64,
          'foto-kejadian-tersimpan.jpg'
        )

        setFotoKejadian(restoredFile)
        setPreviewKejadian(draft.fotoKejadianBase64)
      }

      if (
        Array.isArray(draft.fotoKerusakanBase64) &&
        draft.fotoKerusakanBase64.length > 0
      ) {
        const restoredFiles = draft.fotoKerusakanBase64.map(
          (item: string, index: number) =>
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
      .catch((err) => {
        console.error('Gagal ambil kecamatan:', err)
        setKecamatanList([])
      })

    fetch(`${API_URL}/jenis-bencana`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => setJenisList(data.data || []))
      .catch((err) => {
        console.error('Gagal ambil jenis bencana:', err)
        setJenisList([])
      })
  }, [])

  useEffect(() => {
    if (!selectedKec) {
      setKelurahanList([])
      return
    }

    fetch(`${API_URL}/data-kelurahan?kecamatan_id=${selectedKec}`, {
      cache: 'no-store',
    })
      .then((res) => res.json())
      .then((data) => setKelurahanList(data.data || []))
      .catch((err) => {
        console.error('Gagal ambil kelurahan:', err)
        setKelurahanList([])
      })
  }, [selectedKec])

  useEffect(() => {
    if (!selectedJenis) {
      setBencanaList([])
      return
    }

    fetch(`${API_URL}/nama-bencana?jenis_id=${selectedJenis}`, {
      cache: 'no-store',
    })
      .then((res) => res.json())
      .then((data) => setBencanaList(data.data || []))
      .catch((err) => {
        console.error('Gagal ambil nama bencana:', err)
        setBencanaList([])
      })
  }, [selectedJenis])

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop())
      }

      if (previewKejadian) {
        URL.revokeObjectURL(previewKejadian)
      }

      previewKerusakan.forEach((src) => URL.revokeObjectURL(src))
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
        {
          jenis_korban: jenis,
          jenis_kelamin: 'LAKI_LAKI',
          kelompok_umur: 'ANAK',
          jumlah: data.anakL,
        },
        {
          jenis_korban: jenis,
          jenis_kelamin: 'LAKI_LAKI',
          kelompok_umur: 'DEWASA',
          jumlah: data.dewasaL,
        },
        {
          jenis_korban: jenis,
          jenis_kelamin: 'LAKI_LAKI',
          kelompok_umur: 'LANSIA',
          jumlah: data.lansiaL,
        },
        {
          jenis_korban: jenis,
          jenis_kelamin: 'PEREMPUAN',
          kelompok_umur: 'ANAK',
          jumlah: data.anakP,
        },
        {
          jenis_korban: jenis,
          jenis_kelamin: 'PEREMPUAN',
          kelompok_umur: 'DEWASA',
          jumlah: data.dewasaP,
        },
        {
          jenis_korban: jenis,
          jenis_kelamin: 'PEREMPUAN',
          kelompok_umur: 'LANSIA',
          jumlah: data.lansiaP,
        }
      )
    })

    return rows.filter((item) => Number(item.jumlah) > 0)
  }

  const removeFotoKejadian = () => {
    if (previewKejadian) {
      URL.revokeObjectURL(previewKejadian)
    }

    setFotoKejadian(null)
    setPreviewKejadian(null)
    setBrowserGpsCoords(null)
    showToast('success', 'Foto kejadian dihapus')
  }

  const removeFotoKerusakan = (index: number) => {
    if (previewKerusakan[index]) {
      URL.revokeObjectURL(previewKerusakan[index])
    }

    setFotoKerusakan((prev) => prev.filter((_, i) => i !== index))
    setPreviewKerusakan((prev) => prev.filter((_, i) => i !== index))
    showToast('success', 'Foto kerusakan dihapus')
  }

  const handleSubmit = async () => {
    if (!validateBeforeConfirm()) {
      return
    }

    try {
      setLoading(true)

      const korbanPayload = buildKorbanPayload()
      const totalSemuaKorban = korbanPayload.reduce(
        (total, item) => total + Number(item.jumlah || 0),
        0
      )

      const fotoKejadianBase64 = fotoKejadian
        ? await fileToBase64(fotoKejadian)
        : null

      const fotoKerusakanBase64 = await Promise.all(
        fotoKerusakan.map((file) => fileToBase64(file))
      )

      const selectedKecamatanName =
        kecamatanList.find((item) => String(item.kecamatan_id) === String(form.id_kecamatan))
          ?.nama_kecamatan || '-'

      const selectedKelurahanName =
        kelurahanList.find((item) => String(item.kelurahan_id) === String(form.id_kelurahan))
          ?.nama_kelurahan || '-'

      const selectedJenisName =
        jenisList.find((item) => String(item.jenis_id) === String(form.id_jenis))
          ?.nama_jenis || '-'

      const selectedBencanaName =
        bencanaList.find((item) => String(item.bencana_id) === String(form.id_bencana))
          ?.nama_bencana || '-'

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
        korbanByJenis: {
          ...korbanByJenis,
          [jenisKorban]: korban,
        },
        browser_gps_lat: browserGpsCoords?.lat ?? null,
        browser_gps_lng: browserGpsCoords?.lng ?? null,
        browser_latitude: browserGpsCoords?.lat ?? null,
        browser_longitude: browserGpsCoords?.lng ?? null,
        created_by: 'staff',
      }

      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
      showToast('success', 'Laporan berhasil diproses. Membuka halaman konfirmasi...')

      window.setTimeout(() => {
        router.push('/humint/confirm')
      }, 750)
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

      <div className={styles.topGrid}>
        <div className={styles.column}>
          <div className={styles.card}>
            <h3>Informasi Pelapor</h3>
            <div className={styles.rowFields}>
              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>Nama Pelapor</label>
                <input
                  name="nama_pelapor"
                  value={form.nama_pelapor}
                  onChange={handleChange}
                  type="text"
                  placeholder="Nama asli pelapor"
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>Nomor HP</label>
                <input
                  name="no_hp"
                  value={form.no_hp}
                  onChange={handleChange}
                  type="tel"
                  placeholder="08..."
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Alamat Rumah Pelapor</label>
              <textarea
                name="alamat_pelapor"
                value={form.alamat_pelapor}
                onChange={handleChange}
                placeholder="Alamat lengkap pelapor..."
                rows={3}
              />
            </div>
          </div>

          <div className={styles.card}>
            <h3>Operasional BPBD</h3>

            <div className={styles.fieldGroup}>
              <div className={styles.inputGroupVertical}>
                <label className={styles.fieldLabel}>Status Laporan</label>
                <select
                  name="status_laporan"
                  value={form.status_laporan}
                  onChange={handleChange}
                  className={styles.selectField}
                >
                  <option value="IDENTIFIKASI">Identifikasi</option>
                  <option value="TERVERIFIKASI">Terverifikasi</option>
                  <option value="DITANGANI">Ditangani</option>
                  <option value="SELESAI">Selesai</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>Penugasan Petugas</label>
                <input
                  name="petugas_trc"
                  value={form.petugas_trc}
                  onChange={handleChange}
                  type="text"
                  placeholder="Nama regu..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.column}>
          <div
            className={styles.card}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
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
                    setForm((prev) => ({
                      ...prev,
                      id_jenis: value,
                      id_bencana: '',
                    }))
                  }}
                >
                  <option value="">Pilih jenis bencana...</option>
                  {jenisList.map((item) => (
                    <option key={item.jenis_id} value={String(item.jenis_id)}>
                      {item.nama_jenis}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>Waktu Kejadian</label>
                <input
                  name="waktu_kejadian"
                  value={form.waktu_kejadian}
                  onChange={handleChange}
                  type="datetime-local"
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Nama Kejadian Spesifik</label>
              <select
                name="id_bencana"
                value={form.id_bencana}
                onChange={handleChange}
              >
                <option value="">
                  {selectedJenis ? 'Pilih kejadian...' : 'Pilih jenis bencana dulu'}
                </option>
                {bencanaList.map((item) => (
                  <option key={item.bencana_id} value={String(item.bencana_id)}>
                    {item.nama_bencana}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.inputGroup} style={{ flexGrow: 1 }}>
              <label className={styles.fieldLabel}>Kronologi Kejadian</label>
              <textarea
                name="kronologi"
                value={form.kronologi}
                onChange={handleChange}
                className={styles.textAreaFull}
                placeholder="Uraikan laporan lengkap masyarakat secara detail di sini..."
              />
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
                    setForm((prev) => ({
                      ...prev,
                      id_kecamatan: value,
                      id_kelurahan: '',
                    }))
                  }}
                >
                  <option value="">Pilih...</option>
                  {kecamatanList.map((item) => (
                    <option key={item.kecamatan_id} value={String(item.kecamatan_id)}>
                      {item.nama_kecamatan}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>Kelurahan</label>
                <select
                  name="id_kelurahan"
                  value={form.id_kelurahan}
                  onChange={handleChange}
                >
                  <option value="">
                    {selectedKec ? 'Pilih Kelurahan...' : 'Pilih kecamatan dulu'}
                  </option>
                  {kelurahanList.map((item) => (
                    <option key={item.kelurahan_id} value={String(item.kelurahan_id)}>
                      {item.nama_kelurahan}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.inputGroup}>
                <label>Jenis Lokasi *</label>
                <select
                  name="jenis_lokasi"
                  value={form.jenis_lokasi}
                  onChange={handleChange}
                >
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
                  if (e.target.value !== selectedMapAddress) {
                    setIsMapLocationSelected(false)
                  }
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
              <textarea
                name="kerusakan_identifikasi"
                value={form.kerusakan_identifikasi}
                onChange={handleChange}
                placeholder="Deskripsi kerusakan..."
                rows={2}
              />
            </div>

            <div className={styles.rowFields}>
              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>Terdampak</label>
                <input
                  name="terdampak_identifikasi"
                  value={form.terdampak_identifikasi}
                  onChange={handleChange}
                  type="text"
                  placeholder="Contoh: 15 KK"
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>Penyebab</label>
                <input
                  name="penyebab_identifikasi"
                  value={form.penyebab_identifikasi}
                  onChange={handleChange}
                  type="text"
                  placeholder="Faktor penyebab..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.card} style={{ marginTop: '20px' }}>
        <h3>Data Korban</h3>

        <div className={styles.inputGroup}>
          <label>Pilih jenis korban yang ingin diisi</label>
          <select
            value={jenisKorban}
            onChange={(e) => handleChangeJenisKorban(e.target.value as JenisKorban)}
          >
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

        <div style={{ marginTop: '18px' }}>
          <h4 style={{ marginBottom: '10px' }}>Ringkasan Korban</h4>

          {Object.entries({
            ...korbanByJenis,
            [jenisKorban]: korban,
          }).map(([jenis, data]: any) => {
            const total = getTotalByJenis(data)

            if (total === 0) return null

            return (
              <div
                key={jenis}
                style={{
                  padding: '12px',
                  border: '1px solid #333',
                  borderRadius: '10px',
                  marginBottom: '10px',
                  background: '#111',
                }}
              >
                <strong>{getLabelJenisKorban(jenis)}</strong>
                <p style={{ margin: '6px 0 0', color: '#ccc' }}>
                  Total: {total} orang — Laki-laki:{' '}
                  {data.anakL + data.dewasaL + data.lansiaL}, Perempuan:{' '}
                  {data.anakP + data.dewasaP + data.lansiaP}
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
            <textarea
              name="tindak_lanjut"
              value={form.tindak_lanjut}
              onChange={handleChange}
              className={styles.textAreaAction}
              placeholder="Jelaskan tindakan yang telah diambil oleh tim di lapangan secara detail..."
            />
          </div>
        </div>
      </div>

      <div className={styles.bottomSection}>
        <div className={styles.card}>
          <div className={styles.mapHeader}>
            <h3>Verifikasi Geospasial & Dokumentasi</h3>
          </div>

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
                    setForm((prev) => ({
                      ...prev,
                      alamat_lengkap_kejadian: fullAddress,
                    }))
                  }}
                />
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
              <input
                ref={fotoKejadianUploadRef}
                type="file"
                accept="image/*"
                className={styles.hiddenInput}
                onChange={(e) => {
                  handleFotoKejadianChange(e.target.files)
                  e.target.value = ''
                }}
              />
              <input
                ref={fotoKejadianCameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className={styles.hiddenInput}
                onChange={(e) => {
                  handleFotoKejadianChange(e.target.files)
                  e.target.value = ''
                }}
              />
              <input
                ref={fotoKerusakanUploadRef}
                type="file"
                accept="image/*"
                multiple
                className={styles.hiddenInput}
                onChange={(e) => {
                  handleFotoKerusakanChange(e.target.files)
                  e.target.value = ''
                }}
              />
              <input
                ref={fotoKerusakanCameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className={styles.hiddenInput}
                onChange={(e) => {
                  handleFotoKerusakanChange(e.target.files)
                  e.target.value = ''
                }}
              />

              <div className={styles.uploadVertical}>
                <div className={`${styles.uploadBox} ${styles.uploadCardCustom}`}>
                  <div className={styles.boxContent}>
                    <span className={styles.boxIcon}></span>
                    <label className={`${styles.fieldLabel} ${styles.uploadCardLabel}`}>
                      FOTO KEJADIAN UTAMA
                    </label>
                    <p>Pilih foto dari file atau ambil langsung dari kamera.</p>

                    <div className={styles.uploadActionGrid}>
                      <button
                        type="button"
                        onClick={openFotoKejadianUpload}
                        className={styles.uploadActionBtn}
                      >
                        🖼️ Upload File
                      </button>

                      <button
                        type="button"
                        onClick={() => openSmartCamera('kejadian')}
                        className={styles.uploadActionBtn}
                      >
                        📷 Ambil Kamera
                      </button>
                    </div>

                    {previewKejadian ? (
                      <div className={styles.previewMain}>
                        <img src={previewKejadian} alt="Preview kejadian" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeFotoKejadian()
                          }}
                          className={styles.removePreviewBtn}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <span className={styles.emptyPhotoText}>
                        Belum ada foto dipilih
                      </span>
                    )}

                    <span className={styles.emptyPhotoText}>
                      GPS Browser:{' '}
                      {browserGpsCoords
                        ? `${browserGpsCoords.lat.toFixed(6)}, ${browserGpsCoords.lng.toFixed(6)}`
                        : '-'}
                    </span>
                  </div>
                </div>

                <div className={`${styles.uploadBox} ${styles.uploadCardCustom}`}>
                  <div className={styles.boxContent}>
                    <span className={styles.boxIcon}></span>
                    <label className={`${styles.fieldLabel} ${styles.uploadCardLabel}`}>
                      FOTO BUKTI KERUSAKAN
                    </label>
                    <p>Pilih foto dari file atau ambil langsung dari kamera.</p>

                    <div className={styles.uploadActionGrid}>
                      <button
                        type="button"
                        onClick={openFotoKerusakanUpload}
                        className={styles.uploadActionBtn}
                      >
                        🖼️ Upload File
                      </button>

                      <button
                        type="button"
                        onClick={() => openSmartCamera('kerusakan')}
                        className={styles.uploadActionBtn}
                      >
                        📷 Ambil Kamera
                      </button>
                    </div>

                    {previewKerusakan.length > 0 ? (
                      <div className={styles.previewDamageWrap}>
                        {previewKerusakan.map((src, index) => (
                          <div key={index} className={styles.previewDamageItem}>
                            <img src={src} alt={`Preview kerusakan ${index + 1}`} />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeFotoKerusakan(index)
                              }}
                              className={styles.removePreviewSmallBtn}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className={styles.emptyPhotoText}>
                        Maksimal 2 foto, masing-masing 3MB
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                className={styles.btnConfirm}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'MEMPROSES...' : 'LANJUTKAN KE KONFIRMASI'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {cameraTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0,0,0,0.78)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              background: '#141417',
              border: '1px solid #333',
              borderRadius: '20px',
              padding: '18px',
              boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
            }}
          >
            <h3 style={{ margin: '0 0 12px', color: '#fff' }}>
              Ambil Foto dari Kamera Laptop
            </h3>

            <p
              style={{
                margin: '0 0 14px',
                color: '#aaa',
                fontSize: '13px',
                lineHeight: 1.5,
              }}
            >
              Pastikan akses kamera sudah diizinkan di browser.
            </p>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                borderRadius: '14px',
                background: '#000',
                maxHeight: '420px',
                objectFit: 'cover',
              }}
            />

            <canvas ref={canvasRef} className={styles.hiddenInput} />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginTop: '14px',
              }}
            >
              <button
                type="button"
                onClick={closeLaptopCamera}
                style={{
                  border: '1px solid #333',
                  background: '#1a1a1e',
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '12px',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={captureLaptopCamera}
                style={{
                  border: 'none',
                  background: '#fff',
                  color: '#000',
                  borderRadius: '12px',
                  padding: '12px',
                  cursor: 'pointer',
                  fontWeight: 800,
                }}
              >
                Ambil Foto
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          style={{
            position: 'fixed',
            right: '24px',
            bottom: '24px',
            zIndex: 100000,
            maxWidth: '360px',
            width: 'calc(100% - 48px)',
            borderRadius: '18px',
            border:
              toast.type === 'success'
                ? '1px solid rgba(34, 197, 94, 0.35)'
                : '1px solid rgba(239, 68, 68, 0.35)',
            background:
              toast.type === 'success'
                ? 'linear-gradient(135deg, rgba(22, 101, 52, 0.96), rgba(15, 23, 42, 0.98))'
                : 'linear-gradient(135deg, rgba(127, 29, 29, 0.96), rgba(15, 23, 42, 0.98))',
            boxShadow: '0 18px 55px rgba(0,0,0,0.42)',
            color: '#fff',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'toastSlide 260ms ease',
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.14)',
              flexShrink: 0,
              fontWeight: 800,
            }}
          >
            {toast.type === 'success' ? '✓' : '!'}
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: '14px' }}>
              {toast.type === 'success' ? 'Berhasil' : 'Gagal'}
            </strong>
            <span
              style={{
                display: 'block',
                marginTop: '3px',
                color: 'rgba(255,255,255,0.82)',
                fontSize: '13px',
                lineHeight: 1.35,
              }}
            >
              {toast.message}
            </span>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes popIn {
          from { opacity: 0; transform: translateY(10px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes toastSlide {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}