'use client'

import {
  useCallback,
  useEffect,
  useState
} from 'react'

import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  GeoJSON
} from 'react-leaflet'

import {
  EditControl
} from 'react-leaflet-draw'

import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'

import styles from '../geoint.module.css'

// =========================
// CONSTANT
// =========================

const API_URL =
  'http://localhost:5555/api/geoint/zona-rawan'

// =========================
// TYPES
// =========================

type ZonaRawanItem = {
  zona_id?: number
  id_zona?: number
  id?: number
  jenis_id?: number | string
  nama_zona?: string
  geojson?: string | object
  tingkat_resiko?: string
  warna?: string
  sumber_data?: string
  status?: string
}

// =========================
// COMPONENT
// =========================

export default function ZonaRawanPage() {
  // =========================
  // STATE
  // =========================

  const [
    previewPolygon,
    setPreviewPolygon
  ] = useState<any>(null)

  const [
    selectedBencana,
    setSelectedBencana
  ] = useState(60001)

  const [
    selectedResiko,
    setSelectedResiko
  ] = useState('TINGGI')

  const [
    namaZona,
    setNamaZona
  ] = useState('')

  const [
    manualZona,
    setManualZona
  ] = useState<ZonaRawanItem[]>([])

  const [
    editZonaId,
    setEditZonaId
  ] = useState<number | null>(null)

  const [
    editNamaZona,
    setEditNamaZona
  ] = useState('')

  const [
    editResiko,
    setEditResiko
  ] = useState('TINGGI')

  const [
    loading,
    setLoading
  ] = useState(false)

  // =========================
  // HELPER
  // =========================

  const getColor = (
    risiko?: string
  ) => {
    const value =
      String(risiko || '')
        .toUpperCase()

    if (
      value.includes('TINGGI')
    ) {
      return '#ef4444'
    }

    if (
      value.includes('SEDANG')
    ) {
      return '#f59e0b'
    }

    return '#22c55e'
  }

  const getBencanaLabel = (
    jenisId: number
  ) => {
    if (jenisId === 60001) {
      return 'Banjir'
    }

    if (jenisId === 60002) {
      return 'Longsor'
    }

    return '-'
  }

  const getZonaId = (
    item: ZonaRawanItem
  ) => {
    return (
      item.zona_id ||
      item.id_zona ||
      item.id ||
      0
    )
  }

  const parseGeojson = (
    value: any
  ) => {
    if (!value) {
      return null
    }

    if (
      typeof value === 'object'
    ) {
      return value
    }

    try {
      return JSON.parse(value)
    } catch (error) {
      console.error(
        'INVALID GEOJSON:',
        error
      )

      return null
    }
  }

    const getLoggedInUser = () => {
    if (typeof window === 'undefined') {
      return 'admin'
    }

    const possibleKeys = [
      'user',
      'auth',
      'admin',
      'staff',
      'sentry_user',
      'currentUser',
      'loggedInUser',
      'userData'
    ]

    for (const key of possibleKeys) {
      const raw =
        localStorage.getItem(key)

      if (!raw) {
        continue
      }

      try {
        const parsed =
          JSON.parse(raw)

        const userValue =
          parsed.usr_email ||
          parsed.email ||
          parsed.user_email ||
          parsed.usr_nama_lengkap ||
          parsed.name ||
          parsed.nama ||
          parsed.user?.usr_email ||
          parsed.user?.email ||
          parsed.user?.usr_nama_lengkap ||
          parsed.data?.usr_email ||
          parsed.data?.email ||
          parsed.data?.usr_nama_lengkap

        if (userValue) {
          return String(userValue)
        }
      } catch {
        if (raw.includes('@')) {
          return raw
        }
      }
    }

    return 'admin'
  }

  // =========================
  // FETCH MANUAL ZONA
  // =========================

  const fetchManualZona =
    useCallback(async () => {
      try {
        setLoading(true)

        const response =
          await fetch(
            `${API_URL}?jenis_id=${selectedBencana}`,
            {
              cache: 'no-store'
            }
          )

        const result =
          await response.json()

        console.log(
          'MANUAL ZONA LIST:',
          result
        )

        if (result.success) {
          const rawData =
            Array.isArray(result.data)
              ? result.data
              : []

          const filtered =
            rawData.filter(
              (item: ZonaRawanItem) => {
                const sumber =
                  String(item.sumber_data || '')
                    .toUpperCase()

                const status =
                  String(item.status || '')
                    .toUpperCase()

                return (
                  sumber === 'MANUAL' &&
                  status === 'AKTIF'
                )
              }
            )

          setManualZona(filtered)
        }
      } catch (error) {
        console.error(
          'FETCH MANUAL ZONA ERROR:',
          error
        )
      } finally {
        setLoading(false)
      }
    }, [selectedBencana])

  // =========================
  // LOAD DATA
  // =========================

  useEffect(() => {
    fetchManualZona()
  }, [fetchManualZona])

  // =========================
  // HANDLE DRAW
  // =========================

  const handleCreated = (
    e: any
  ) => {
    const layer =
      e.layer

    const geojson =
      layer.toGeoJSON()

    console.log(
      'PREVIEW POLYGON:',
      geojson
    )

    /*
      Layer hasil draw langsung dihapus dari FeatureGroup,
      lalu kita tampilkan ulang lewat state previewPolygon.
      Ini mencegah polygon dobel di map.
    */
    if (
      layer &&
      typeof layer.remove === 'function'
    ) {
      layer.remove()
    }

    setPreviewPolygon(geojson)
  }

  // =========================
  // HANDLE SAVE
  // =========================

  const handleSavePolygon =
    async () => {
      try {
        if (!namaZona.trim()) {
          alert(
            'Nama zona / lokasi wajib diisi'
          )

          return
        }

        if (!previewPolygon) {
          alert(
            'Belum ada polygon. Gambar polygon dulu di peta.'
          )

          return
        }

        const response =
          await fetch(
            API_URL,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json'
              },

              body: JSON.stringify({
                jenis_id:
                  selectedBencana,

                nama_zona:
                  namaZona,

                geojson:
                  previewPolygon,

                tingkat_resiko:
                  selectedResiko,

                warna:
                  getColor(selectedResiko),

                uploaded_by:
                  getLoggedInUser()
              })
            }
          )

        const result =
          await response.json()

        console.log(
          'SAVE RESULT:',
          result
        )

        if (result.success) {
          alert(
            'Polygon berhasil disimpan!'
          )

          setPreviewPolygon(null)
          setNamaZona('')

          fetchManualZona()
        } else {
          alert(
            result.message ||
            'Gagal simpan polygon'
          )
        }
      } catch (error) {
        console.error(
          'SAVE ERROR:',
          error
        )

        alert(
          'Terjadi error saat save polygon'
        )
      }
    }

  // =========================
  // HANDLE RESET
  // =========================

  const handleResetPolygon =
    async () => {
      try {
        const confirmReset =
          confirm(
            `Yakin ingin reset polygon manual ${getBencanaLabel(selectedBencana)} dan kembali ke default BPBD?`
          )

        if (!confirmReset) {
          return
        }

        const uploadedBy =
          encodeURIComponent(
            getLoggedInUser()
          )

        let response =
          await fetch(
            `${API_URL}/reset/${selectedBencana}?uploaded_by=${uploadedBy}`,
            {
              method: 'PATCH'
            }
          )

        if (
          response.status === 404
        ) {
          response =
            await fetch(
              `${API_URL}/reset?uploaded_by=${uploadedBy}`,
              {
                method: 'PATCH'
              }
            )
        }

        const result =
          await response.json()

        console.log(
          'RESET RESULT:',
          result
        )

        if (result.success) {
          alert(
            'Polygon manual berhasil direset ke default BPBD!'
          )

          setPreviewPolygon(null)
          setNamaZona('')
          setEditZonaId(null)
          setEditNamaZona('')
          setEditResiko('TINGGI')

          fetchManualZona()
        } else {
          alert(
            result.message ||
            'Gagal reset polygon'
          )
        }
      } catch (error) {
        console.error(
          'RESET ERROR:',
          error
        )

        alert(
          'Terjadi error saat reset polygon'
        )
      }
    }

  // =========================
  // HANDLE DELETE
  // =========================

  const handleDeletePolygon =
    async (
      zonaId: number
    ) => {
      try {
        const confirmDelete =
          confirm(
            'Yakin ingin menghapus polygon manual ini?'
          )

        if (!confirmDelete) {
          return
        }

        const response =
          await fetch(
            `${API_URL}/${zonaId}`,
            {
              method: 'DELETE'
            }
          )

        const result =
          await response.json()

        console.log(
          'DELETE RESULT:',
          result
        )

        if (result.success) {
          alert(
            'Polygon berhasil dihapus!'
          )

          fetchManualZona()
        } else {
          alert(
            result.message ||
            'Gagal menghapus polygon'
          )
        }
      } catch (error) {
        console.error(
          'DELETE ERROR:',
          error
        )

        alert(
          'Terjadi error saat menghapus polygon'
        )
      }
    }

  // =========================
  // HANDLE START EDIT
  // =========================

  const handleStartEdit =
    (item: ZonaRawanItem) => {
      setEditZonaId(
        getZonaId(item)
      )

      setEditNamaZona(
        item.nama_zona || ''
      )

      setEditResiko(
        item.tingkat_resiko || 'TINGGI'
      )
    }

  // =========================
  // HANDLE CANCEL EDIT
  // =========================

  const handleCancelEdit =
    () => {
      setEditZonaId(null)
      setEditNamaZona('')
      setEditResiko('TINGGI')
    }

  // =========================
  // HANDLE UPDATE
  // =========================

  const handleUpdatePolygon =
    async (
      zonaId: number
    ) => {
      try {
        if (!editNamaZona.trim()) {
          alert(
            'Nama zona tidak boleh kosong'
          )

          return
        }

        const response =
          await fetch(
            `${API_URL}/${zonaId}`,
            {
              method: 'PUT',

              headers: {
                'Content-Type':
                  'application/json'
              },

              body: JSON.stringify({
                nama_zona:
                  editNamaZona,

                tingkat_resiko:
                  editResiko,

                warna:
                  getColor(editResiko),
               
                uploaded_by:
                  getLoggedInUser()  
              })
            }
          )

        const result =
          await response.json()

        console.log(
          'UPDATE RESULT:',
          result
        )

        if (result.success) {
          alert(
            'Polygon berhasil diperbarui!'
          )

          handleCancelEdit()
          fetchManualZona()
        } else {
          alert(
            result.message ||
            'Gagal memperbarui polygon'
          )
        }
      } catch (error) {
        console.error(
          'UPDATE ERROR:',
          error
        )

        alert(
          'Terjadi error saat memperbarui polygon'
        )
      }
    }

  // =========================
  // RENDER
  // =========================

  return (
  <div className={styles.wrapper}>
    <style>
      {`
        .leaflet-draw-toolbar {
          margin-top: 14px !important;
          margin-right: 14px !important;
          border: none !important;
          box-shadow: none !important;
        }

        .leaflet-draw-toolbar a.leaflet-draw-draw-polygon,
        .leaflet-touch .leaflet-draw-toolbar a.leaflet-draw-draw-polygon,
        .leaflet-bar a.leaflet-draw-draw-polygon {
          width: 170px !important;
          height: 44px !important;

          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;

          border-radius: 14px !important;
          border: 1px solid #1d4ed8 !important;

          background: #2563eb !important;
          background-color: #2563eb !important;
          background-image: none !important;

          color: #ffffff !important;
          text-indent: 0 !important;
          font-size: 0 !important;
          font-weight: 800 !important;
          text-decoration: none !important;

          opacity: 1 !important;
          visibility: visible !important;

          box-shadow: 0 10px 24px rgba(37, 99, 235, 0.35) !important;
          transition: 0.2s ease !important;
        }

        .leaflet-draw-toolbar a.leaflet-draw-draw-polygon::before,
        .leaflet-touch .leaflet-draw-toolbar a.leaflet-draw-draw-polygon::before,
        .leaflet-bar a.leaflet-draw-draw-polygon::before {
          content: "⬟";
          font-size: 18px;
          line-height: 1;
          color: #ffffff;
        }

        .leaflet-draw-toolbar a.leaflet-draw-draw-polygon::after,
        .leaflet-touch .leaflet-draw-toolbar a.leaflet-draw-draw-polygon::after,
        .leaflet-bar a.leaflet-draw-draw-polygon::after {
          content: "Gambar Polygon";
          font-size: 14px;
          line-height: 1;
          color: #ffffff;
          font-weight: 800;
        }

        .leaflet-draw-toolbar a.leaflet-draw-draw-polygon:hover,
        .leaflet-touch .leaflet-draw-toolbar a.leaflet-draw-draw-polygon:hover,
        .leaflet-bar a.leaflet-draw-draw-polygon:hover {
          background: #1d4ed8 !important;
          background-color: #1d4ed8 !important;
          background-image: none !important;
          transform: translateY(-2px);
        }

        .leaflet-draw-toolbar a.leaflet-draw-draw-polygon:focus,
        .leaflet-touch .leaflet-draw-toolbar a.leaflet-draw-draw-polygon:focus,
        .leaflet-bar a.leaflet-draw-draw-polygon:focus {
          outline: 3px solid rgba(37, 99, 235, 0.35) !important;
        }

        .leaflet-draw-toolbar a.leaflet-draw-draw-polygon.leaflet-disabled {
          background: #64748b !important;
          background-color: #64748b !important;
          color: #ffffff !important;
          opacity: 0.8 !important;
        }

        .leaflet-draw-actions {
          right: 0 !important;
          left: auto !important;
          top: 52px !important;
        }

        .leaflet-draw-actions a {
          height: 32px !important;
          line-height: 32px !important;
          padding: 0 12px !important;

          background: #0f172a !important;
          color: #ffffff !important;

          border-radius: 8px !important;
          font-size: 12px !important;
          font-weight: 700 !important;
          text-decoration: none !important;
        }

        .leaflet-draw-actions a:hover {
          background: #1e293b !important;
        }
      `}
    </style>
    
      <div
        className={styles.mainContent}
        style={{
          overflowY: 'auto'
        }}
      >
        <div
          style={{
            padding: '26px',
            color: 'white'
          }}
        >
          {/* =========================
              HEADER
          ========================= */}

          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              gap: '20px',
              alignItems: 'flex-start',
              marginBottom: '22px',
              flexWrap: 'wrap'
            }}
          >
            <div>
              <small
                style={{
                  display: 'block',
                  color: '#fb923c',
                  letterSpacing: '2px',
                  fontSize: '11px',
                  fontWeight: 800,
                  marginBottom: '8px'
                }}
              >
                MONITORING SPASIAL
              </small>

              <h1
                style={{
                  fontSize: '42px',
                  fontWeight: 900,
                  margin: 0,
                  lineHeight: 1
                }}
              >
                Manajemen Zona Rawan
              </h1>

              <p
                style={{
                  marginTop: '12px',
                  marginBottom: 0,
                  color: '#b8c1d1',
                  maxWidth: '680px',
                  lineHeight: 1.6
                }}
              >
                Gambar polygon zona rawan secara manual,
                simpan ke database, ubah metadata,
                hapus polygon manual, atau reset ke
                data default BPBD.
              </p>
            </div>

            <button
              onClick={() =>
                window.location.reload()
              }
              className={styles.refreshButton}
            >
              Refresh
            </button>
          </div>

          {/* =========================
              CONTROL FORM
          ========================= */}

          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '20px',
              alignItems: 'center',
              flexWrap: 'wrap',
              padding: '16px',
              background:
                'rgba(15,23,42,0.88)',
              border:
                '1px solid rgba(255,255,255,0.08)',
              borderRadius: '18px'
            }}
          >
            <input
              value={namaZona}
              onChange={(e) =>
                setNamaZona(
                  e.target.value
                )
              }
              placeholder="Nama zona / lokasi, contoh: Zona Banjir Wonokoyo"
              style={{
                padding: '12px',
                borderRadius: '12px',
                background: '#0f172a',
                color: 'white',
                border:
                  '1px solid rgba(255,255,255,0.1)',
                outline: 'none',
                minWidth: '330px'
              }}
            />

            <select
              value={selectedBencana}
              onChange={(e) => {
                setSelectedBencana(
                  Number(e.target.value)
                )

                setPreviewPolygon(null)
                setNamaZona('')
                handleCancelEdit()
              }}
              style={{
                padding: '12px',
                borderRadius: '12px',
                background: '#0f172a',
                color: 'white',
                border:
                  '1px solid rgba(255,255,255,0.1)',
                outline: 'none'
              }}
            >
              <option value={60001}>
                Banjir
              </option>

              <option value={60002}>
                Longsor
              </option>
            </select>

            <select
              value={selectedResiko}
              onChange={(e) =>
                setSelectedResiko(
                  e.target.value
                )
              }
              style={{
                padding: '12px',
                borderRadius: '12px',
                background: '#0f172a',
                color: 'white',
                border:
                  '1px solid rgba(255,255,255,0.1)',
                outline: 'none'
              }}
            >
              <option value="RENDAH">
                Risiko Rendah
              </option>

              <option value="SEDANG">
                Risiko Sedang
              </option>

              <option value="TINGGI">
                Risiko Tinggi
              </option>
            </select>

            <button
              onClick={handleSavePolygon}
              style={{
                background: '#2563eb',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Simpan Polygon
            </button>

            <button
              onClick={() =>
                setPreviewPolygon(null)
              }
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Batal
            </button>

            <button
              onClick={handleResetPolygon}
              style={{
                background: '#7f1d1d',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Reset Default
            </button>
          </div>

          {/* =========================
              CONTENT LAYOUT
          ========================= */}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                '360px 1fr',
              gap: '20px',
              alignItems: 'stretch'
            }}
          >
            {/* =========================
                SIDEBAR LIST
            ========================= */}

            <div
              style={{
                background:
                  'rgba(15,23,42,0.9)',
                border:
                  '1px solid rgba(255,255,255,0.1)',
                borderRadius: '18px',
                padding: '16px',
                height: '72vh',
                overflowY: 'auto'
              }}
            >
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  marginBottom: '6px'
                }}
              >
                Polygon Manual Aktif
              </h2>

              <p
                style={{
                  fontSize: '13px',
                  color: '#94a3b8',
                  marginBottom: '14px'
                }}
              >
                Jenis: {getBencanaLabel(selectedBencana)}
              </p>

              {
                loading ? (
                  <p
                    style={{
                      color: '#94a3b8',
                      fontSize: '14px'
                    }}
                  >
                    Memuat data polygon...
                  </p>
                ) : manualZona.length === 0 ? (
                  <p
                    style={{
                      color: '#94a3b8',
                      margin: 0,
                      fontSize: '14px',
                      lineHeight: 1.6
                    }}
                  >
                    Belum ada polygon manual aktif
                    untuk jenis bencana ini.
                  </p>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    {
                      manualZona.map((item) => {
                        const zonaId =
                          getZonaId(item)

                        return (
                          <div
                            key={zonaId}
                            style={{
                              padding: '12px',
                              background: '#020617',
                              borderRadius: '12px',
                              border:
                                '1px solid rgba(255,255,255,0.08)'
                            }}
                          >
                            {
                              editZonaId === zonaId ? (
                                <>
                                  <input
                                    value={editNamaZona}
                                    onChange={(e) =>
                                      setEditNamaZona(
                                        e.target.value
                                      )
                                    }
                                    style={{
                                      width: '100%',
                                      padding: '10px',
                                      borderRadius: '10px',
                                      background: '#0f172a',
                                      color: 'white',
                                      border:
                                        '1px solid rgba(255,255,255,0.1)',
                                      outline: 'none',
                                      marginBottom: '10px'
                                    }}
                                  />

                                  <select
                                    value={editResiko}
                                    onChange={(e) =>
                                      setEditResiko(
                                        e.target.value
                                      )
                                    }
                                    style={{
                                      width: '100%',
                                      padding: '10px',
                                      borderRadius: '10px',
                                      background: '#0f172a',
                                      color: 'white',
                                      border:
                                        '1px solid rgba(255,255,255,0.1)',
                                      outline: 'none',
                                      marginBottom: '10px'
                                    }}
                                  >
                                    <option value="RENDAH">
                                      Risiko Rendah
                                    </option>

                                    <option value="SEDANG">
                                      Risiko Sedang
                                    </option>

                                    <option value="TINGGI">
                                      Risiko Tinggi
                                    </option>
                                  </select>

                                  <div
                                    style={{
                                      display: 'flex',
                                      gap: '8px'
                                    }}
                                  >
                                    <button
                                      onClick={() =>
                                        handleUpdatePolygon(
                                          zonaId
                                        )
                                      }
                                      style={{
                                        flex: 1,
                                        background: '#2563eb',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                      }}
                                    >
                                      Simpan
                                    </button>

                                    <button
                                      onClick={
                                        handleCancelEdit
                                      }
                                      style={{
                                        flex: 1,
                                        background: '#64748b',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                      }}
                                    >
                                      Batal
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div
                                    style={{
                                      fontWeight: 'bold',
                                      marginBottom: '6px',
                                      lineHeight: 1.4
                                    }}
                                  >
                                    {
                                      item.nama_zona ||
                                      'Zona Manual'
                                    }
                                  </div>

                                  <div
                                    style={{
                                      fontSize: '13px',
                                      color: '#94a3b8',
                                      lineHeight: 1.6,
                                      marginBottom: '12px'
                                    }}
                                  >
                                    <div>
                                      Bencana: {getBencanaLabel(Number(item.jenis_id))}
                                    </div>

                                    <div>
                                      Risiko: {item.tingkat_resiko || '-'}
                                    </div>

                                    <div>
                                      Sumber: {item.sumber_data || '-'}
                                    </div>

                                    <div>
                                      ID Zona: {zonaId}
                                    </div>
                                  </div>

                                  <div
                                    style={{
                                      display: 'flex',
                                      gap: '8px'
                                    }}
                                  >
                                    <button
                                      onClick={() =>
                                        handleStartEdit(
                                          item
                                        )
                                      }
                                      style={{
                                        flex: 1,
                                        background: '#f59e0b',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                      }}
                                    >
                                      Edit
                                    </button>

                                    <button
                                      onClick={() =>
                                        handleDeletePolygon(
                                          zonaId
                                        )
                                      }
                                      style={{
                                        flex: 1,
                                        background: '#dc2626',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                      }}
                                    >
                                      Hapus
                                    </button>
                                  </div>
                                </>
                              )
                            }
                          </div>
                        )
                      })
                    }
                  </div>
                )
              }
            </div>

            {/* =========================
                MAP
            ========================= */}

            <div
              style={{
                width: '100%',
                height: '72vh',
                borderRadius: '20px',
                overflow: 'hidden',
                border:
                  '1px solid rgba(255,255,255,0.1)',
                position: 'relative'
              }}
            >
              <MapContainer
                center={[
                  -7.98,
                  112.63
                ]}
                zoom={12}
                style={{
                  width: '100%',
                  height: '100%'
                }}
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* =========================
                    SAVED MANUAL POLYGON
                ========================= */}

                {
                  manualZona.map((item) => {
                    const geojson =
                      parseGeojson(
                        item.geojson
                      )

                    const zonaId =
                      getZonaId(item)

                    if (!geojson) {
                      return null
                    }

                    return (
                      <GeoJSON
                        key={`manual-${zonaId}-${item.tingkat_resiko}`}
                        data={geojson}
                        style={{
                          color:
                            item.warna ||
                            getColor(
                              item.tingkat_resiko
                            ),

                          fillColor:
                            item.warna ||
                            getColor(
                              item.tingkat_resiko
                            ),

                          weight: 3,
                          fillOpacity: 0.28
                        }}
                        onEachFeature={(
                          feature,
                          layer
                        ) => {
                          layer.bindPopup(`
                            <div style="
                              min-width:220px;
                              background:#071226;
                              color:white;
                              padding:10px;
                              border-radius:12px;
                              font-family:sans-serif;
                            ">
                              <h3 style="
                                margin:0 0 10px 0;
                                color:white;
                                font-size:17px;
                                font-weight:700;
                              ">
                                Zona Manual Staff
                              </h3>

                              <b>Zona:</b>
                              ${item.nama_zona || '-'}
                              <br/>

                              <b>Bencana:</b>
                              ${getBencanaLabel(Number(item.jenis_id))}
                              <br/>

                              <b>Tingkat:</b>
                              ${item.tingkat_resiko || '-'}
                              <br/>

                              <b>Sumber:</b>
                              ${item.sumber_data || '-'}
                            </div>
                          `)
                        }}
                      />
                    )
                  })
                }

                {/* =========================
                    PREVIEW POLYGON
                ========================= */}

                {
                  previewPolygon && (
                    <GeoJSON
                      key={`preview-${selectedResiko}`}
                      data={previewPolygon}
                      style={{
                        color:
                          getColor(
                            selectedResiko
                          ),

                        fillColor:
                          getColor(
                            selectedResiko
                          ),

                        weight: 3,
                        fillOpacity: 0.35,
                        dashArray: '10'
                      }}
                    />
                  )
                }

                {/* =========================
                    DRAW TOOLS
                ========================= */}

                <FeatureGroup>
                  <EditControl
                    position="topright"
                    onCreated={handleCreated}
                    draw={{
                      rectangle: false,
                      circle: false,
                      circlemarker: false,
                      marker: false,
                      polyline: false
                    }}
                    edit={{
                      edit: false,
                      remove: false
                    }}
                  />
                </FeatureGroup>
              </MapContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}