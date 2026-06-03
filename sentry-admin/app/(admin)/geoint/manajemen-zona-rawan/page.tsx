'use client'

import {
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

  ] = useState<any[]>([])

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

  // =========================
  // GET COLOR
  // =========================

  const getColor = (
    risiko: string
  ) => {

    if (risiko === 'TINGGI') {

      return '#ef4444'
    }

    if (risiko === 'SEDANG') {

      return '#f59e0b'
    }

    return '#22c55e'
  }

  // =========================
  // GET BENCANA LABEL
  // =========================

  const getBencanaLabel = (
    jenisId: number
  ) => {

    if (jenisId === 60001) {

      return 'Banjir'
    }

    if (jenisId === 60002) {

      return 'Longsor'
    }

    if (jenisId === 60007) {

      return 'Gempa'
    }

    return '-'
  }

  // =========================
  // FETCH MANUAL ZONA
  // =========================

  const fetchManualZona =
    async () => {

      try {

        const response =
          await fetch(

            `http://localhost:5555/api/geoint/zona-rawan?jenis_id=${selectedBencana}`

          )

        const result =
          await response.json()

        console.log(
          'MANUAL ZONA LIST:',
          result
        )

        if (result.success) {

          const filtered =
            result.data.filter(

              (item: any) =>

                item.sumber_data ===
                  'MANUAL'

                &&

                item.status ===
                  'AKTIF'
            )

          setManualZona(
            filtered
          )
        }

      } catch (error) {

        console.error(
          'FETCH MANUAL ZONA ERROR:',
          error
        )
      }
    }

  // =========================
  // LOAD MANUAL ZONA
  // =========================

  useEffect(() => {

    fetchManualZona()

  }, [selectedBencana])

  // =========================
  // HANDLE DRAW
  // =========================

  const handleCreated = (

    e: any

  ) => {

    const layer = e.layer

    const geojson =
      layer.toGeoJSON()

    console.log(
      'PREVIEW POLYGON:',
      geojson
    )

    setPreviewPolygon(
      geojson
    )
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
            'Belum ada polygon'
          )

          return
        }

        const response =
          await fetch(

            'http://localhost:5555/api/geoint/zona-rawan',

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
                  getColor(
                    selectedResiko
                  ),

                uploaded_by:
                  'admin'
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

          setPreviewPolygon(
            null
          )

          setNamaZona(
            ''
          )

          fetchManualZona()

        } else {

          alert(
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
            'Yakin ingin reset semua polygon manual dan kembali ke peta default BPBD?'
          )

        if (!confirmReset) {

          return
        }

        const response =
          await fetch(

            'http://localhost:5555/api/geoint/zona-rawan/reset',

            {

              method: 'PATCH'
            }
          )

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

          setPreviewPolygon(
            null
          )

          setNamaZona(
            ''
          )

          fetchManualZona()

        } else {

          alert(
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

            `http://localhost:5555/api/geoint/zona-rawan/${zonaId}`,

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
    (item: any) => {

      setEditZonaId(
        item.zona_id
      )

      setEditNamaZona(
        item.nama_zona
      )

      setEditResiko(
        item.tingkat_resiko
      )
    }

  // =========================
  // HANDLE CANCEL EDIT
  // =========================

  const handleCancelEdit =
    () => {

      setEditZonaId(
        null
      )

      setEditNamaZona(
        ''
      )

      setEditResiko(
        'TINGGI'
      )
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

            `http://localhost:5555/api/geoint/zona-rawan/${zonaId}`,

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
                  getColor(
                    editResiko
                  )
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

  return (

    <div

      style={{

        width: '100%',

        minHeight: '100vh',

        padding: '20px',

        background:
          'linear-gradient(180deg,#071226,#0b1730)',

        color:
          'white'
      }}
    >

      {/* =========================
          HEADER
      ========================= */}

      <h1

        style={{

          fontSize: '42px',

          fontWeight: 'bold',

          marginBottom: '10px'
        }}
      >

        Manajemen Zona Rawan

      </h1>

      <p

        style={{

          marginBottom: '20px',

          color:
            '#b8c1d1'
        }}
      >

        Gambar polygon zona rawan secara manual
        lalu simpan ke database.

      </p>

      {/* =========================
          CONTROL FORM
      ========================= */}

      <div

        style={{

          display: 'flex',

          gap: '12px',

          marginBottom: '20px',

          alignItems: 'center',

          flexWrap: 'wrap'
        }}
      >

        <input

          value={
            namaZona
          }

          onChange={(e) =>

            setNamaZona(
              e.target.value
            )
          }

          placeholder='Nama zona / lokasi, contoh: Zona Banjir Wonokoyo'

          style={{

            padding: '12px',

            borderRadius: '12px',

            background:
              '#0f172a',

            color: 'white',

            border:
              '1px solid rgba(255,255,255,0.1)',

            outline: 'none',

            minWidth:
              '330px'
          }}
        />

        <select

          value={selectedBencana}

          onChange={(e) =>

            setSelectedBencana(
              Number(
                e.target.value
              )
            )
          }

          style={{

            padding: '12px',

            borderRadius: '12px',

            background:
              '#0f172a',

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

          <option value={60007}>
            Gempa
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

            background:
              '#0f172a',

            color: 'white',

            border:
              '1px solid rgba(255,255,255,0.1)',

            outline: 'none'
          }}
        >

          <option value='RENDAH'>
            Risiko Rendah
          </option>

          <option value='SEDANG'>
            Risiko Sedang
          </option>

          <option value='TINGGI'>
            Risiko Tinggi
          </option>

        </select>

        <button

          onClick={
            handleSavePolygon
          }

          style={{

            background:
              '#2563eb',

            color: 'white',

            border: 'none',

            padding:
              '12px 20px',

            borderRadius: '12px',

            cursor: 'pointer',

            fontWeight: 'bold'
          }}
        >

          Simpan Polygon

        </button>

        <button

          onClick={() =>

            setPreviewPolygon(
              null
            )
          }

          style={{

            background:
              '#ef4444',

            color: 'white',

            border: 'none',

            padding:
              '12px 20px',

            borderRadius: '12px',

            cursor: 'pointer',

            fontWeight: 'bold'
          }}
        >

          Batal

        </button>

        <button

          onClick={
            handleResetPolygon
          }

          style={{

            background:
              '#7f1d1d',

            color: 'white',

            border: 'none',

            padding:
              '12px 20px',

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

          display:
            'grid',

          gridTemplateColumns:
            '360px 1fr',

          gap:
            '20px',

          alignItems:
            'stretch'
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

            borderRadius:
              '16px',

            padding:
              '16px',

            height:
              '80vh',

            overflowY:
              'auto'
          }}
        >

          <h2

            style={{

              fontSize:
                '20px',

              fontWeight:
                'bold',

              marginBottom:
                '6px'
            }}
          >

            Polygon Manual Aktif

          </h2>

          <p

            style={{

              fontSize:
                '13px',

              color:
                '#94a3b8',

              marginBottom:
                '14px'
            }}
          >

            Jenis: {getBencanaLabel(selectedBencana)}

          </p>

          {

            manualZona.length === 0 ? (

              <p

                style={{

                  color:
                    '#94a3b8',

                  margin:
                    0,

                  fontSize:
                    '14px'
                }}
              >

                Belum ada polygon manual aktif untuk jenis bencana ini.

              </p>

            ) : (

              <div

                style={{

                  display:
                    'flex',

                  flexDirection:
                    'column',

                  gap:
                    '10px'
                }}
              >

                {

                  manualZona.map((item) => (

                    <div

                      key={
                        item.zona_id
                      }

                      style={{

                        padding:
                          '12px',

                        background:
                          '#020617',

                        borderRadius:
                          '12px',

                        border:
                          '1px solid rgba(255,255,255,0.08)'
                      }}
                    >

                      {

                        editZonaId === item.zona_id ? (

                          <>

                            <input

                              value={
                                editNamaZona
                              }

                              onChange={(e) =>

                                setEditNamaZona(
                                  e.target.value
                                )
                              }

                              style={{

                                width:
                                  '100%',

                                padding:
                                  '10px',

                                borderRadius:
                                  '10px',

                                background:
                                  '#0f172a',

                                color:
                                  'white',

                                border:
                                  '1px solid rgba(255,255,255,0.1)',

                                outline:
                                  'none',

                                marginBottom:
                                  '10px'
                              }}
                            />

                            <select

                              value={
                                editResiko
                              }

                              onChange={(e) =>

                                setEditResiko(
                                  e.target.value
                                )
                              }

                              style={{

                                width:
                                  '100%',

                                padding:
                                  '10px',

                                borderRadius:
                                  '10px',

                                background:
                                  '#0f172a',

                                color:
                                  'white',

                                border:
                                  '1px solid rgba(255,255,255,0.1)',

                                outline:
                                  'none',

                                marginBottom:
                                  '10px'
                              }}
                            >

                              <option value='RENDAH'>
                                Risiko Rendah
                              </option>

                              <option value='SEDANG'>
                                Risiko Sedang
                              </option>

                              <option value='TINGGI'>
                                Risiko Tinggi
                              </option>

                            </select>

                            <div

                              style={{

                                display:
                                  'flex',

                                gap:
                                  '8px'
                              }}
                            >

                              <button

                                onClick={() =>

                                  handleUpdatePolygon(
                                    item.zona_id
                                  )
                                }

                                style={{

                                  flex:
                                    1,

                                  background:
                                    '#2563eb',

                                  color:
                                    'white',

                                  border:
                                    'none',

                                  padding:
                                    '10px',

                                  borderRadius:
                                    '10px',

                                  cursor:
                                    'pointer',

                                  fontWeight:
                                    'bold'
                                }}
                              >

                                Simpan

                              </button>

                              <button

                                onClick={
                                  handleCancelEdit
                                }

                                style={{

                                  flex:
                                    1,

                                  background:
                                    '#64748b',

                                  color:
                                    'white',

                                  border:
                                    'none',

                                  padding:
                                    '10px',

                                  borderRadius:
                                    '10px',

                                  cursor:
                                    'pointer',

                                  fontWeight:
                                    'bold'
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

                                fontWeight:
                                  'bold',

                                marginBottom:
                                  '6px',

                                lineHeight:
                                  1.4
                              }}
                            >

                              {item.nama_zona}

                            </div>

                            <div

                              style={{

                                fontSize:
                                  '13px',

                                color:
                                  '#94a3b8',

                                lineHeight:
                                  1.6,

                                marginBottom:
                                  '12px'
                              }}
                            >

                              <div>
                                Bencana: {getBencanaLabel(Number(item.jenis_id))}
                              </div>

                              <div>
                                Risiko: {item.tingkat_resiko}
                              </div>

                              <div>
                                Sumber: {item.sumber_data}
                              </div>

                              <div>
                                ID Zona: {item.zona_id}
                              </div>

                            </div>

                            <div

                              style={{

                                display:
                                  'flex',

                                gap:
                                  '8px'
                              }}
                            >

                              <button

                                onClick={() =>

                                  handleStartEdit(
                                    item
                                  )
                                }

                                style={{

                                  flex:
                                    1,

                                  background:
                                    '#f59e0b',

                                  color:
                                    'white',

                                  border:
                                    'none',

                                  padding:
                                    '10px',

                                  borderRadius:
                                    '10px',

                                  cursor:
                                    'pointer',

                                  fontWeight:
                                    'bold'
                                }}
                              >

                                Edit

                              </button>

                              <button

                                onClick={() =>

                                  handleDeletePolygon(
                                    item.zona_id
                                  )
                                }

                                style={{

                                  flex:
                                    1,

                                  background:
                                    '#dc2626',

                                  color:
                                    'white',

                                  border:
                                    'none',

                                  padding:
                                    '10px',

                                  borderRadius:
                                    '10px',

                                  cursor:
                                    'pointer',

                                  fontWeight:
                                    'bold'
                                }}
                              >

                                Hapus

                              </button>

                            </div>

                          </>

                        )
                      }

                    </div>
                  ))
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

            height: '80vh',

            borderRadius: '20px',

            overflow: 'hidden',

            border:
              '1px solid rgba(255,255,255,0.1)'
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

              attribution='&copy; OpenStreetMap'

              url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            />

            {

              previewPolygon && (

                <GeoJSON

                  data={
                    previewPolygon
                  }

                  style={{

                    color:
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

            <FeatureGroup>

              <EditControl

                position='topright'

                onCreated={
                  handleCreated
                }

                draw={{

                  rectangle:
                    false,

                  circle:
                    false,

                  circlemarker:
                    false,

                  marker:
                    false,

                  polyline:
                    false
                }}

              />

            </FeatureGroup>

          </MapContainer>

        </div>

      </div>

    </div>
  )
}