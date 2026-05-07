'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import styles from './kirim-laporan.module.css'
import Navbar from '../components/navbar'
import LocationSearch from '../components/LocationSearch'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/humint'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_FOTO_KERUSAKAN = 2

const MapPicker = dynamic(() => import('../components/MapPicker'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 350, background: '#e2e8f0', borderRadius: 12 }} />
  ),
})

type JenisLaporan = 'NON_ASSESSMENT' | 'ASSESSMENT'
type UploadTarget = 'kejadian' | 'kerusakan' | null
type FotoKejadianSource = 'FILE_UPLOAD' | 'WEB_CAMERA' | null

const JENIS_KORBAN_OPTIONS = [
  { value: 'TIDAK_ADA', label: 'Tidak Ada Korban' },
  { value: 'TERDAMPAK', label: 'Terdampak' },
  { value: 'MENINGGAL', label: 'Meninggal' },
  { value: 'HILANG', label: 'Hilang' },
  { value: 'MENGUNGSI', label: 'Mengungsi' },
  { value: 'LUKA_SAKIT', label: 'Luka/Sakit' },
]

export default function KirimLaporanPage() {
  const router = useRouter()

  const fotoKejadianUploadRef = useRef<HTMLInputElement | null>(null)
  const fotoKejadianCameraRef = useRef<HTMLInputElement | null>(null)
  const fotoKerusakanUploadRef = useRef<HTMLInputElement | null>(null)
  const fotoKerusakanCameraRef = useRef<HTMLInputElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [jenisLaporan, setJenisLaporan] =
    useState<JenisLaporan>('NON_ASSESSMENT')

  const [position, setPosition] = useState<[number, number]>([
    -7.9819,
    112.6265,
  ])

  const [lat, setLat] = useState(-7.9819)
  const [lng, setLng] = useState(112.6265)

  const [kecamatanList, setKecamatanList] = useState<any[]>([])
  const [kelurahanList, setKelurahanList] = useState<any[]>([])
  const [jenisList, setJenisList] = useState<any[]>([])

  const [selectedKec, setSelectedKec] = useState('')

  const [fotoKejadian, setFotoKejadian] = useState<File | null>(null)
  const [fotoKerusakan, setFotoKerusakan] = useState<File[]>([])
  const [previewKejadian, setPreviewKejadian] = useState<string | null>(null)
  const [previewKerusakan, setPreviewKerusakan] = useState<string[]>([])

  const [loading, setLoading] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [uploadModalTarget, setUploadModalTarget] = useState<UploadTarget>(null)
  const [browserGpsCoords, setBrowserGpsCoords] = useState<{
    lat: number
    lng: number
    accuracy?: number | null
  } | null>(null)
  const [fotoKejadianSource, setFotoKejadianSource] =
    useState<FotoKejadianSource>(null)
  const [fotoKejadianCapturedAt, setFotoKejadianCapturedAt] = useState<string | null>(null)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)

  const [form, setForm] = useState({
    nama_pelapor: '',
    no_hp: '',
    alamat_pelapor: '',
    id_jenis: '',
    id_kecamatan: '',
    id_kelurahan: '',
    waktu_kejadian: '',
    kronologi: '',
    jenis_lokasi: '',
    alamat_lengkap_kejadian: '',
    jenis_korban: '',
    jumlah_korban_identifikasi: '',
    kerusakan_identifikasi: '',
    terdampak_identifikasi: '',
    penyebab_identifikasi: '',
  })

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

  const base64ToFile = async (base64: string, filename: string) => {
    const res = await fetch(base64)
    const blob = await res.blob()
    return new File([blob], filename, { type: blob.type })
  }

  const fetchJson = async (url: string) => {
    const res = await fetch(url, { cache: 'no-store' })

    if (!res.ok) {
      throw new Error(`Gagal memuat data dari ${url}`)
    }

    return res.json()
  }

  useEffect(() => {
    const savedDraft = sessionStorage.getItem('draft_laporan_user')

    if (!savedDraft) return

    try {
      const parsed = JSON.parse(savedDraft)

      if (parsed?.jenis_laporan) {
        setJenisLaporan(parsed.jenis_laporan)
      }

      if (parsed?.form) {
        setForm((prev) => ({
          ...prev,
          ...parsed.form,
          jumlah_korban_identifikasi:
            parsed.jenis_laporan === 'ASSESSMENT'
              ? parsed.form.jumlah_korban_identifikasi || ''
              : '',
          kerusakan_identifikasi:
            parsed.jenis_laporan === 'ASSESSMENT'
              ? parsed.form.kerusakan_identifikasi || ''
              : '',
          terdampak_identifikasi:
            parsed.jenis_laporan === 'ASSESSMENT'
              ? parsed.form.terdampak_identifikasi || ''
              : '',
          penyebab_identifikasi:
            parsed.jenis_laporan === 'ASSESSMENT'
              ? parsed.form.penyebab_identifikasi || ''
              : '',
        }))

        if (parsed.form.id_kecamatan) {
          setSelectedKec(String(parsed.form.id_kecamatan))
        }
      }

      if (parsed?.lat && parsed?.lng) {
        setLat(Number(parsed.lat))
        setLng(Number(parsed.lng))
      }

      if (parsed?.position) {
        setPosition(parsed.position)
      }

      if (parsed?.foto_kejadian_source) {
        setFotoKejadianSource(parsed.foto_kejadian_source)
      }

      if (parsed?.foto_captured_at) {
        setFotoKejadianCapturedAt(parsed.foto_captured_at)
      }

      if (
        parsed?.browser_gps_lat !== null &&
        parsed?.browser_gps_lat !== undefined &&
        parsed?.browser_gps_lng !== null &&
        parsed?.browser_gps_lng !== undefined
      ) {
        setBrowserGpsCoords({
          lat: Number(parsed.browser_gps_lat),
          lng: Number(parsed.browser_gps_lng),
          accuracy:
            parsed.browser_gps_accuracy !== null &&
            parsed.browser_gps_accuracy !== undefined
              ? Number(parsed.browser_gps_accuracy)
              : null,
        })
      }

      if (parsed?.fotoKejadianBase64) {
        setPreviewKejadian(parsed.fotoKejadianBase64)

        base64ToFile(parsed.fotoKejadianBase64, 'foto-kejadian.jpg')
          .then((file) => setFotoKejadian(file))
          .catch(() => setFotoKejadian(null))
      }

      if (
        parsed?.jenis_laporan === 'ASSESSMENT' &&
        Array.isArray(parsed?.fotoKerusakanBase64)
      ) {
        setPreviewKerusakan(parsed.fotoKerusakanBase64)

        Promise.all(
          parsed.fotoKerusakanBase64.map((item: string, index: number) =>
            base64ToFile(item, `foto-kerusakan-${index + 1}.jpg`)
          )
        )
          .then((files) => setFotoKerusakan(files))
          .catch(() => setFotoKerusakan([]))
      }
    } catch (error) {
      console.error('Gagal membaca draft laporan:', error)
    }
  }, [])

  useEffect(() => {
    fetchJson(`${API_URL}/data-kecamatan`)
      .then((data) => setKecamatanList(data.data || []))
      .catch((err) => {
        console.error('Gagal ambil kecamatan:', err)
        setKecamatanList([])
      })

    fetchJson(`${API_URL}/jenis-bencana`)
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

    fetchJson(`${API_URL}/data-kelurahan?kecamatan_id=${selectedKec}`)
      .then((data) => setKelurahanList(data.data || []))
      .catch((err) => {
        console.error('Gagal ambil kelurahan:', err)
        setKelurahanList([])
      })
  }, [selectedKec])

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream
    }
  }, [cameraStream])

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop())
    }
  }, [cameraStream])

  const setSelectedLocation = (lt: number, ln: number, address?: string) => {
    setPosition([lt, ln])
    setLat(lt)
    setLng(ln)

    if (address) {
      setForm((prev) => ({
        ...prev,
        alamat_lengkap_kejadian: address,
      }))
    }
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Browser tidak mendukung GPS/geolocation')
      return
    }

    setGpsLoading(true)

    navigator.geolocation.getCurrentPosition(
      async (geoPosition) => {
        const lt = geoPosition.coords.latitude
        const ln = geoPosition.coords.longitude

        setPosition([lt, ln])
        setLat(lt)
        setLng(ln)
        setBrowserGpsCoords({
          lat: lt,
          lng: ln,
          accuracy: geoPosition.coords.accuracy ?? null,
        })

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lt}&lon=${ln}&addressdetails=1`
          )

          const data = await res.json()

          setForm((prev) => ({
            ...prev,
            alamat_lengkap_kejadian:
              data.display_name || prev.alamat_lengkap_kejadian,
          }))
        } catch (error) {
          console.error('Gagal mengambil alamat dari GPS:', error)
        } finally {
          setGpsLoading(false)
        }
      },
      () => {
        setGpsLoading(false)
        alert('Gagal mengambil lokasi. Pastikan izin lokasi/GPS sudah diaktifkan.')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  const handleChangeJenisLaporan = (type: JenisLaporan) => {
    setJenisLaporan(type)

    if (type === 'NON_ASSESSMENT') {
      setForm((prev) => ({
        ...prev,
        jenis_korban: '',
        jumlah_korban_identifikasi: '',
        kerusakan_identifikasi: '',
        terdampak_identifikasi: '',
        penyebab_identifikasi: '',
      }))

      previewKerusakan.forEach((src) => URL.revokeObjectURL(src))
      setFotoKerusakan([])
      setPreviewKerusakan([])
    }
  }

  const handleFotoKejadianFiles = (
    files: FileList | null,
    source: FotoKejadianSource = 'FILE_UPLOAD'
  ) => {
    const file = files?.[0] || null

    if (!file) return

    if (!isValidImageSize(file)) {
      alert('Ukuran foto kejadian maksimal 10MB')
      return
    }

    if (previewKejadian && previewKejadian.startsWith('blob:')) {
      URL.revokeObjectURL(previewKejadian)
    }

    setFotoKejadian(file)
    setPreviewKejadian(URL.createObjectURL(file))
    setFotoKejadianSource(source)
    setFotoKejadianCapturedAt(source === 'WEB_CAMERA' ? new Date().toISOString() : null)
    setUploadModalTarget(null)
    applyGpsToMap(file, source)
  }

  const handleFotoKerusakanFiles = (files: FileList | null) => {
    const selectedFiles = Array.from(files || [])

    if (selectedFiles.length === 0) return

    const nextFiles = [...fotoKerusakan, ...selectedFiles].slice(
      0,
      MAX_FOTO_KERUSAKAN
    )

    if (fotoKerusakan.length + selectedFiles.length > MAX_FOTO_KERUSAKAN) {
      alert('Foto kerusakan maksimal 2 foto')
      return
    }

    if (nextFiles.some((file) => !isValidImageSize(file))) {
      alert('Setiap foto kerusakan maksimal 10MB')
      return
    }

    previewKerusakan.forEach((src) => {
      if (src.startsWith('blob:')) {
        URL.revokeObjectURL(src)
      }
    })

    setFotoKerusakan(nextFiles)
    setPreviewKerusakan(nextFiles.map((file) => URL.createObjectURL(file)))
    setUploadModalTarget(null)
  }

  const stopCamera = () => {
    cameraStream?.getTracks().forEach((track) => track.stop())
    setCameraStream(null)
    setIsCameraOpen(false)
  }

  const openUploadModal = (target: UploadTarget) => {
    stopCamera()
    setUploadModalTarget(target)
  }

  const closeUploadModal = () => {
    stopCamera()
    setUploadModalTarget(null)
  }

  const openGalleryInput = () => {
    stopCamera()

    if (uploadModalTarget === 'kejadian') {
      fotoKejadianUploadRef.current?.click()
      return
    }

    if (uploadModalTarget === 'kerusakan') {
      fotoKerusakanUploadRef.current?.click()
    }
  }

  const openCameraInput = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Browser tidak mendukung kamera langsung. Silakan gunakan upload dari galeri.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })

      setCameraStream(stream)
      setIsCameraOpen(true)
    } catch (error) {
      console.error('Gagal membuka kamera:', error)
      alert('Kamera tidak bisa dibuka. Pastikan izin kamera sudah diberikan di browser.')
    }
  }

  const tryReadExifGps = (
    file: File
  ): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer
          const view = new DataView(buffer)

          if (view.getUint16(0) !== 0xffd8) {
            resolve(null)
            return
          }

          let offset = 2

          while (offset < view.byteLength - 2) {
            const marker = view.getUint16(offset)
            offset += 2

            const length = view.getUint16(offset)

            if (marker === 0xffe1) {
              const exifHeader = String.fromCharCode(
                view.getUint8(offset + 2),
                view.getUint8(offset + 3),
                view.getUint8(offset + 4),
                view.getUint8(offset + 5)
              )

              if (exifHeader !== 'Exif') {
                resolve(null)
                return
              }

              const tiffStart = offset + 8
              const littleEndian = view.getUint16(tiffStart) === 0x4949
              const ifdOffset = view.getUint32(tiffStart + 4, littleEndian)
              const ifdStart = tiffStart + ifdOffset
              const entryCount = view.getUint16(ifdStart, littleEndian)

              let gpsIfdOffset: number | null = null

              for (let i = 0; i < entryCount; i++) {
                const entryOffset = ifdStart + 2 + i * 12
                const tag = view.getUint16(entryOffset, littleEndian)

                if (tag === 0x8825) {
                  gpsIfdOffset = view.getUint32(entryOffset + 8, littleEndian)
                  break
                }
              }

              if (gpsIfdOffset === null) {
                resolve(null)
                return
              }

              const gpsStart = tiffStart + gpsIfdOffset
              const gpsEntryCount = view.getUint16(gpsStart, littleEndian)

              const readRational = (off: number) => {
                const num = view.getUint32(tiffStart + off, littleEndian)
                const den = view.getUint32(tiffStart + off + 4, littleEndian)
                return den !== 0 ? num / den : 0
              }

              let latRef = 'N'
              let lngRef = 'E'
              let latVal: number | null = null
              let lngVal: number | null = null

              for (let i = 0; i < gpsEntryCount; i++) {
                const entryOffset = gpsStart + 2 + i * 12
                const tag = view.getUint16(entryOffset, littleEndian)

                if (tag === 0x0001) {
                  latRef = String.fromCharCode(
                    view.getUint8(
                      tiffStart + view.getUint32(entryOffset + 8, littleEndian)
                    )
                  )
                } else if (tag === 0x0002) {
                  const vo = view.getUint32(entryOffset + 8, littleEndian)
                  latVal =
                    readRational(vo) +
                    readRational(vo + 8) / 60 +
                    readRational(vo + 16) / 3600
                } else if (tag === 0x0003) {
                  lngRef = String.fromCharCode(
                    view.getUint8(
                      tiffStart + view.getUint32(entryOffset + 8, littleEndian)
                    )
                  )
                } else if (tag === 0x0004) {
                  const vo = view.getUint32(entryOffset + 8, littleEndian)
                  lngVal =
                    readRational(vo) +
                    readRational(vo + 8) / 60 +
                    readRational(vo + 16) / 3600
                }
              }

              if (latVal !== null && lngVal !== null) {
                resolve({
                  lat: latRef === 'S' ? -latVal : latVal,
                  lng: lngRef === 'W' ? -lngVal : lngVal,
                })
                return
              }

              resolve(null)
              return
            }

            offset += length
          }

          resolve(null)
        } catch {
          resolve(null)
        }
      }

      reader.onerror = () => resolve(null)
      reader.readAsArrayBuffer(file)
    })
  }

  const tryBrowserGps = (): Promise<{ lat: number; lng: number; accuracy?: number | null } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? null,
          }),
        () => resolve(null),
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 0,
        }
      )
    })
  }

  const applyGpsToMap = async (file: File, source: FotoKejadianSource) => {
    const exifGps = await tryReadExifGps(file)

    if (exifGps) {
      // EXIF GPS berasal dari file foto, sehingga masih boleh dipakai
      // untuk membantu mengisi titik lokasi kejadian saat foto memiliki metadata.
      setSelectedLocation(exifGps.lat, exifGps.lng)
      setBrowserGpsCoords(null)
      return
    }

    if (source !== 'WEB_CAMERA') {
      // Upload dari galeri/folder tidak boleh memakai GPS browser sebagai fallback foto.
      setBrowserGpsCoords(null)
      return
    }

    const browserGps = await tryBrowserGps()

    if (browserGps) {
      // Fallback GPS browser hanya disimpan sebagai metadata foto kamera web.
      // Jangan mengganti latitude/longitude/alamat lokasi kejadian yang dipilih user.
      setBrowserGpsCoords(browserGps)
    } else {
      setBrowserGpsCoords(null)
    }
  }

  const captureCameraPhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas || !uploadModalTarget) return

    const width = video.videoWidth || 1280
    const height = video.videoHeight || 720

    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) return

    context.drawImage(video, 0, 0, width, height)

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          alert('Gagal mengambil foto dari kamera')
          return
        }

        const file = new File(
          [blob],
          `${uploadModalTarget}-${Date.now()}.jpg`,
          { type: 'image/jpeg' }
        )

        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)

        if (uploadModalTarget === 'kejadian') {
          handleFotoKejadianFiles(dataTransfer.files, 'WEB_CAMERA')
        }

        if (uploadModalTarget === 'kerusakan') {
          handleFotoKerusakanFiles(dataTransfer.files)
        }

        stopCamera()
      },
      'image/jpeg',
      0.92
    )
  }

  const removeFotoKejadian = () => {
    if (previewKejadian && previewKejadian.startsWith('blob:')) {
      URL.revokeObjectURL(previewKejadian)
    }

    setFotoKejadian(null)
    setPreviewKejadian(null)
    setFotoKejadianSource(null)
    setFotoKejadianCapturedAt(null)
    setBrowserGpsCoords(null)
  }

  const removeFotoKerusakan = (index: number) => {
    if (previewKerusakan[index] && previewKerusakan[index].startsWith('blob:')) {
      URL.revokeObjectURL(previewKerusakan[index])
    }

    setFotoKerusakan((prev) => prev.filter((_, i) => i !== index))
    setPreviewKerusakan((prev) => prev.filter((_, i) => i !== index))
  }

  const handleNextConfirm = async () => {
    try {
      setLoading(true)

      if (!form.nama_pelapor) {
        alert('Nama pelapor wajib diisi')
        return
      }

      if (!form.no_hp) {
        alert('Nomor HP wajib diisi')
        return
      }

      if (!form.alamat_pelapor) {
        alert('Alamat pelapor wajib diisi')
        return
      }

      if (!form.id_jenis) {
        alert('Jenis bencana wajib dipilih')
        return
      }

      if (!form.waktu_kejadian) {
        alert('Waktu kejadian wajib diisi')
        return
      }

      if (!form.jenis_lokasi) {
        alert('Jenis lokasi wajib dipilih')
        return
      }

      if (!form.kronologi) {
        alert('Kronologi wajib diisi')
        return
      }

      if (!form.id_kecamatan) {
        alert('Kecamatan wajib dipilih')
        return
      }

      if (!form.id_kelurahan) {
        alert('Kelurahan wajib dipilih')
        return
      }

      if (!form.alamat_lengkap_kejadian) {
        alert('Alamat lengkap kejadian wajib diisi')
        return
      }

      if (jenisLaporan === 'ASSESSMENT' && !form.jenis_korban) {
        alert('Jenis korban wajib dipilih')
        return
      }

      if (!fotoKejadian) {
        alert('Foto kejadian wajib diupload')
        return
      }

      const fotoKejadianBase64 = await fileToBase64(fotoKejadian)

      const fotoKerusakanBase64 =
        jenisLaporan === 'ASSESSMENT'
          ? await Promise.all(fotoKerusakan.map((file) => fileToBase64(file)))
          : []

      const selectedKecamatanName =
        kecamatanList.find(
          (item) => String(item.kecamatan_id) === String(form.id_kecamatan)
        )?.nama_kecamatan || '-'

      const selectedKelurahanName =
        kelurahanList.find(
          (item) => String(item.kelurahan_id) === String(form.id_kelurahan)
        )?.nama_kelurahan || '-'

      const selectedJenisName =
        jenisList.find((item) => String(item.jenis_id) === String(form.id_jenis))
          ?.nama_jenis || '-'

      const cleanForm = {
        ...form,
        jenis_korban:
          jenisLaporan === 'ASSESSMENT' ? form.jenis_korban : '',
        jumlah_korban_identifikasi:
          jenisLaporan === 'ASSESSMENT'
            ? form.jumlah_korban_identifikasi
            : '',
        kerusakan_identifikasi:
          jenisLaporan === 'ASSESSMENT' ? form.kerusakan_identifikasi : '',
        terdampak_identifikasi:
          jenisLaporan === 'ASSESSMENT' ? form.terdampak_identifikasi : '',
        penyebab_identifikasi:
          jenisLaporan === 'ASSESSMENT' ? form.penyebab_identifikasi : '',
      }

      const draft = {
        jenis_laporan: jenisLaporan,
        form: cleanForm,
        lat,
        lng,
        position,
        korbanPayload:
          jenisLaporan === 'ASSESSMENT' && Number(form.jumlah_korban_identifikasi || 0) > 0
            ? [
                {
                  jenis_korban: form.jenis_korban || 'TIDAK_ADA',
                  jenis_kelamin: 'TIDAK_DIKETAHUI',
                  kelompok_umur: 'TIDAK_DIKETAHUI',
                  jumlah: Number(form.jumlah_korban_identifikasi || 0),
                },
              ]
            : [],
        totalSemuaKorban:
          jenisLaporan === 'ASSESSMENT'
            ? Number(form.jumlah_korban_identifikasi || 0)
            : 0,
        fotoKejadianBase64,
        fotoKerusakanBase64,
        selectedKecamatanName,
        selectedKelurahanName,
        selectedJenisName,
        foto_kejadian_source: fotoKejadianSource || 'FILE_UPLOAD',
        is_camera_capture: fotoKejadianSource === 'WEB_CAMERA',
        foto_captured_at: fotoKejadianCapturedAt,
        browser_gps_lat:
          fotoKejadianSource === 'WEB_CAMERA' ? browserGpsCoords?.lat ?? null : null,
        browser_gps_lng:
          fotoKejadianSource === 'WEB_CAMERA' ? browserGpsCoords?.lng ?? null : null,
        browser_gps_accuracy:
          fotoKejadianSource === 'WEB_CAMERA'
            ? browserGpsCoords?.accuracy ?? null
            : null,
      }

      sessionStorage.setItem('draft_laporan_user', JSON.stringify(draft))
      router.push('/kirim-laporan/confirm')
    } catch (error: any) {
      alert(error.message || 'Gagal membuka halaman konfirmasi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.mainWrapper}>
      <Navbar />

      <input
        ref={fotoKejadianUploadRef}
        className={styles.fileInputHidden}
        type="file"
        accept="image/*"
        onChange={(e) => {
          handleFotoKejadianFiles(e.target.files, 'FILE_UPLOAD')
          e.target.value = ''
        }}
      />

      <input
        ref={fotoKejadianCameraRef}
        className={styles.fileInputHidden}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          handleFotoKejadianFiles(e.target.files, 'WEB_CAMERA')
          e.target.value = ''
        }}
      />

      <input
        ref={fotoKerusakanUploadRef}
        className={styles.fileInputHidden}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          handleFotoKerusakanFiles(e.target.files)
          e.target.value = ''
        }}
      />

      <input
        ref={fotoKerusakanCameraRef}
        className={styles.fileInputHidden}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          handleFotoKerusakanFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {uploadModalTarget && (
        <div className={styles.uploadModalOverlay} onClick={closeUploadModal}>
          <div
            className={styles.uploadModalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.uploadModalHeader}>
              <div>
                <h3>Pilih Sumber Foto</h3>
                <p>
                  {uploadModalTarget === 'kejadian'
                    ? 'Tambahkan foto kejadian dari galeri atau kamera web langsung.'
                    : 'Tambahkan foto kerusakan dari galeri atau kamera web langsung.'}
                </p>
              </div>

              <button
                type="button"
                className={styles.btnCloseModal}
                onClick={closeUploadModal}
                aria-label="Tutup modal upload"
              >
                ×
              </button>
            </div>

            {!isCameraOpen ? (
              <div className={styles.uploadChoiceGrid}>
                <button
                  type="button"
                  className={styles.uploadChoiceButton}
                  onClick={openGalleryInput}
                >
                  <span className={styles.uploadChoiceIcon}>📁</span>
                  <strong>Upload Foto</strong>
                  <span>Pilih foto dari galeri atau folder perangkat.</span>
                </button>

                <button
                  type="button"
                  className={styles.uploadChoiceButton}
                  onClick={openCameraInput}
                >
                  <span className={styles.uploadChoiceIcon}>📷</span>
                  <strong>Buka Kamera</strong>
                  <span>Ambil foto langsung dari kamera di halaman web.</span>
                </button>
              </div>
            ) : (
              <div className={styles.cameraPanel}>
                <video
                  ref={videoRef}
                  className={styles.cameraPreview}
                  autoPlay
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className={styles.hiddenCanvas} />

                <div className={styles.cameraActions}>
                  <button
                    type="button"
                    className={styles.btnSecondaryCamera}
                    onClick={stopCamera}
                  >
                    Kembali
                  </button>

                  <button
                    type="button"
                    className={styles.btnPrimaryCamera}
                    onClick={captureCameraPhoto}
                  >
                    Ambil Foto
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <section className={styles.mainContent}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <h1>Kirim Laporan Bencana</h1>
            <p>
              Laporkan kejadian bencana di sekitar Anda. Pastikan data yang diisi
              benar sebelum laporan dikirim.
            </p>
          </div>

          <div className={styles.contentGrid}>
            <div className={styles.formCard}>
              <div className={styles.tabSwitcher}>
                <button
                  type="button"
                  className={
                    jenisLaporan === 'NON_ASSESSMENT' ? styles.activeTab : ''
                  }
                  onClick={() => handleChangeJenisLaporan('NON_ASSESSMENT')}
                >
                  Non Assessment
                </button>

                <button
                  type="button"
                  className={
                    jenisLaporan === 'ASSESSMENT' ? styles.activeTab : ''
                  }
                  onClick={() => handleChangeJenisLaporan('ASSESSMENT')}
                >
                  Assessment
                </button>
              </div>

              <form className={styles.form}>
                <h3>Informasi Pelapor</h3>

                <div className={styles.formRow}>
                  <div className={styles.inputGroup}>
                    <label>Nama Pelapor *</label>
                    <input
                      name="nama_pelapor"
                      value={form.nama_pelapor}
                      onChange={handleChange}
                      placeholder="Nama lengkap"
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Nomor HP *</label>
                    <input
                      name="no_hp"
                      value={form.no_hp}
                      onChange={handleChange}
                      placeholder="08..."
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>Alamat Pelapor *</label>
                  <textarea
                    name="alamat_pelapor"
                    value={form.alamat_pelapor}
                    onChange={handleChange}
                    placeholder="Alamat rumah pelapor"
                    rows={3}
                  />
                </div>

                <h3>Detail Kejadian</h3>

                <div className={styles.formRow}>
                  <div className={styles.inputGroup}>
                    <label>Jenis Bencana *</label>
                    <select
                      name="id_jenis"
                      value={form.id_jenis}
                      onChange={(e) => {
                        const value = e.target.value

                        setForm((prev) => ({
                          ...prev,
                          id_jenis: value,
                        }))
                      }}
                    >
                      <option value="">
                        {jenisList.length === 0
                          ? 'Memuat jenis bencana...'
                          : 'Pilih jenis bencana'}
                      </option>
                      {jenisList.map((item) => (
                        <option key={item.jenis_id} value={String(item.jenis_id)}>
                          {item.nama_jenis}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Waktu Kejadian *</label>
                    <input
                      type="datetime-local"
                      name="waktu_kejadian"
                      value={form.waktu_kejadian}
                      onChange={handleChange}
                    />
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
                      <option value="">Pilih jenis lokasi</option>
                      <option value="PEMUKIMAN">Pemukiman</option>
                      <option value="JALAN_RAYA">Jalan Raya</option>
                      <option value="FASILITAS_UMUM">Fasilitas Umum</option>
                      <option value="AREA_TIDAK_PADAT">Area Tidak Padat</option>
                    </select>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>Kronologi *</label>
                  <textarea
                    name="kronologi"
                    value={form.kronologi}
                    onChange={handleChange}
                    placeholder="Ceritakan kronologi kejadian"
                    rows={4}
                  />
                </div>

                <h3>Lokasi Kejadian</h3>

                <div className={styles.formRow}>
                  <div className={styles.inputGroup}>
                    <label>Kecamatan *</label>
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
                      <option value="">
                        {kecamatanList.length === 0
                          ? 'Memuat kecamatan...'
                          : 'Pilih kecamatan'}
                      </option>
                      {kecamatanList.map((item) => (
                        <option
                          key={item.kecamatan_id}
                          value={String(item.kecamatan_id)}
                        >
                          {item.nama_kecamatan}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Kelurahan *</label>
                    <select
                      name="id_kelurahan"
                      value={form.id_kelurahan}
                      onChange={handleChange}
                    >
                      <option value="">
                        {selectedKec ? 'Pilih kelurahan' : 'Pilih kecamatan dulu'}
                      </option>
                      {kelurahanList.map((item) => (
                        <option
                          key={item.kelurahan_id}
                          value={String(item.kelurahan_id)}
                        >
                          {item.nama_kelurahan}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>Alamat Lengkap Kejadian *</label>
                  <textarea
                    name="alamat_lengkap_kejadian"
                    value={form.alamat_lengkap_kejadian}
                    onChange={handleChange}
                    placeholder="Contoh: Jl. Kembang Sepatu No.18, Jatimulyo, Lowokwaru, Kota Malang"
                    rows={3}
                  />
                </div>

                <div className={styles.mapSection}>
                  <strong>Tentukan Titik Lokasi</strong>

                  <button
                    type="button"
                    className={styles.btnGps}
                    onClick={handleUseCurrentLocation}
                    disabled={gpsLoading}
                  >
                    {gpsLoading ? 'Mengambil GPS...' : 'Gunakan GPS Saya'}
                  </button>

                  <div className={styles.inputGroup}>
                    <label>Cari Alamat Lengkap</label>
                    <LocationSearch
                      onSelect={(item: any) => {
                        const lt = parseFloat(item.lat)
                        const ln = parseFloat(item.lon)

                        const selectedAddress =
                          item.display_name || item.formatted || item.name || ''

                        setSelectedLocation(lt, ln, selectedAddress)
                      }}
                    />
                  </div>

                  <div className={styles.mapFrame}>
                    <MapPicker
                      position={position}
                      onChange={(lt, ln) => {
                        setSelectedLocation(lt, ln)
                      }}
                    />
                  </div>

                  <div className={styles.latLngDisplay}>
                    <span>Latitude: {lat.toFixed(6)}</span>
                    <span>Longitude: {lng.toFixed(6)}</span>
                  </div>
                </div>

                {jenisLaporan === 'ASSESSMENT' && (
                  <>
                    <h3>Data Assessment</h3>

                    <div className={styles.inputGroup}>
                      <label>Jenis Korban</label>
                      <select
                        name="jenis_korban"
                        value={form.jenis_korban}
                        onChange={handleChange}
                      >
                        <option value="">Pilih jenis korban</option>
                        {JENIS_KORBAN_OPTIONS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.inputGroup}>
                      <label>Jumlah Korban</label>
                      <input
                        type="number"
                        name="jumlah_korban_identifikasi"
                        value={form.jumlah_korban_identifikasi}
                        onChange={handleChange}
                        placeholder="Masukkan jumlah korban"
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label>Kerusakan</label>
                      <textarea
                        name="kerusakan_identifikasi"
                        value={form.kerusakan_identifikasi}
                        onChange={handleChange}
                        placeholder="Contoh: 2 rumah rusak ringan"
                        rows={3}
                      />
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.inputGroup}>
                        <label>Terdampak</label>
                        <input
                          name="terdampak_identifikasi"
                          value={form.terdampak_identifikasi}
                          onChange={handleChange}
                          placeholder="Contoh: 15 KK"
                        />
                      </div>

                      <div className={styles.inputGroup}>
                        <label>Penyebab</label>
                        <input
                          name="penyebab_identifikasi"
                          value={form.penyebab_identifikasi}
                          onChange={handleChange}
                          placeholder="Contoh: hujan deras"
                        />
                      </div>
                    </div>
                  </>
                )}

                <h3>Dokumentasi</h3>

                <div className={styles.mediaCardGrid}>
                  <div
                    role="button"
                    tabIndex={0}
                    className={styles.uploadPhotoCard}
                    onClick={() => openUploadModal('kejadian')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openUploadModal('kejadian')
                      }
                    }}
                  >
                    <div className={styles.uploadCardContent}>
                      <span className={styles.uploadIcon}>📷</span>
                      <strong>Foto Kejadian *</strong>
                      <span className={styles.uploadText}>
                        Upload foto atau ambil langsung lewat kamera web. Maksimal 10MB.
                      </span>

                      {previewKejadian ? (
                        <div className={styles.previewMain}>
                          <img src={previewKejadian} alt="Foto kejadian" />
                          <button
                            type="button"
                            className={styles.removePreviewBtn}
                            onClick={(e) => {
                              e.stopPropagation()
                              removeFotoKejadian()
                            }}
                            aria-label="Hapus foto kejadian"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <span className={styles.emptyPhotoText}>
                          Belum ada foto kejadian
                        </span>
                      )}
                    </div>
                  </div>

                  {jenisLaporan === 'ASSESSMENT' && (
                    <div
                      role="button"
                      tabIndex={0}
                      className={styles.uploadPhotoCard}
                      onClick={() => openUploadModal('kerusakan')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openUploadModal('kerusakan')
                        }
                      }}
                    >
                      <div className={styles.uploadCardContent}>
                        <span className={styles.uploadIcon}>🖼️</span>
                        <strong>Foto Kerusakan</strong>
                        <span className={styles.uploadText}>
                          Upload foto atau ambil langsung lewat kamera web. Maksimal 2 foto.
                        </span>

                        {previewKerusakan.length > 0 ? (
                          <div className={styles.previewDamageWrap}>
                            {previewKerusakan.map((src, index) => (
                              <div className={styles.previewDamageItem} key={index}>
                                <img src={src} alt={`Kerusakan ${index + 1}`} />
                                <button
                                  type="button"
                                  className={styles.removePreviewSmallBtn}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeFotoKerusakan(index)
                                  }}
                                  aria-label={`Hapus foto kerusakan ${index + 1}`}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className={styles.emptyPhotoText}>
                            Belum ada foto kerusakan
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className={styles.btnSubmit}
                  onClick={handleNextConfirm}
                  disabled={loading}
                >
                  {loading ? 'Memproses...' : 'Lanjutkan ke Konfirmasi'}
                </button>
              </form>
            </div>

            <aside className={styles.tutorialCard}>
              <h2 className={styles.tutorialTitle}>Tata Cara Pelaporan</h2>

              <div className={styles.typeBoxContainer}>
                <div className={`${styles.typeCard} ${styles.nonAssessCard}`}>
                  <div className={styles.typeHeader}>
                    <span className={styles.typeDot}></span>
                    <strong>Non Assessment</strong>
                  </div>
                  <p>
                    Digunakan untuk laporan awal tanpa data korban atau dampak rinci.
                  </p>
                </div>

                <div className={`${styles.typeCard} ${styles.assessCard}`}>
                  <div className={styles.typeHeader}>
                    <span className={styles.typeDot}></span>
                    <strong>Assessment</strong>
                  </div>
                  <p>
                    Digunakan jika Anda memiliki informasi korban, kerusakan, dan
                    dampak.
                  </p>
                </div>
              </div>

              <div className={styles.stepsContainer}>
                <div className={styles.step}>
                  <div className={`${styles.iconCircle} ${styles.orangeBg}`}>1</div>
                  <div className={styles.stepContent}>
                    <h4>Isi Data</h4>
                    <p>Lengkapi data pelapor dan kejadian.</p>
                  </div>
                </div>

                <div className={styles.step}>
                  <div className={`${styles.iconCircle} ${styles.yellowBg}`}>2</div>
                  <div className={styles.stepContent}>
                    <h4>Cek Konfirmasi</h4>
                    <p>Periksa kembali data sebelum dikirim.</p>
                  </div>
                </div>

                <div className={styles.step}>
                  <div className={`${styles.iconCircle} ${styles.blueBg}`}>3</div>
                  <div className={styles.stepContent}>
                    <h4>Kirim</h4>
                    <p>Laporan akan masuk ke sistem BPBD.</p>
                  </div>
                </div>
              </div>

              <div className={styles.infoBox}>
                <span className={styles.infoIcon}>i</span>
                <p>
                  Pastikan foto dan lokasi sesuai dengan kejadian agar laporan mudah
                  diverifikasi.
                </p>
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