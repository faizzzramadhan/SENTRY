'use client'

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle
} from 'react-leaflet'

import 'leaflet/dist/leaflet.css'

import L from 'leaflet'

import {
  useEffect,
  useMemo,
  useState
} from 'react'

// ======================
// FIX LEAFLET ICON
// ======================

delete (L.Icon.Default.prototype as any)._getIconUrl

L.Icon.Default.mergeOptions({

  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',

  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',

  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
})

// ======================
// TYPES
// ======================

type ReportItem = {

  laporan_id: number

  latitude: number

  longitude: number

  jenis_bencana: string

  status_laporan: string

  nama_pelapor: string

  created_at: string

  prioritas?: string
}

// ======================
// GET MARKER COLOR
// ======================

function getMarkerColor(
  prioritas?: string
) {

  const level =
    (
      prioritas || ''
    ).toUpperCase()

  if (
    level.includes('TINGGI')
  ) {

    return 'red'
  }

  if (
    level.includes('SEDANG')
  ) {

    return 'orange'
  }

  return 'green'
}

// ======================
// CREATE ICON
// ======================

function createIcon(
  color: string
) {

  return new L.Icon({

    iconUrl:
      `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,

    shadowUrl:
      'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',

    iconSize: [25, 41],

    iconAnchor: [12, 41],

    popupAnchor: [1, -34],

    shadowSize: [41, 41]
  })
}

// ======================
// COMPONENT
// ======================

export default function DisasterMap() {

  // ======================
  // STATE
  // ======================

  const [

    reports,

    setReports

  ] = useState<ReportItem[]>([])

  const [

    statusFilter,

    setStatusFilter

  ] = useState('SEMUA')

  const [

    prioritasFilter,

    setPrioritasFilter

  ] = useState('SEMUA')

  const [

    waktuFilter,

    setWaktuFilter

  ] = useState('SEMUA')

  // ======================
  // FETCH DATA
  // ======================

  useEffect(() => {

    fetch(
      'http://localhost:5555/api/geoint/humint-map'
    )

      .then(async res => {

        const data =
          await res.json()

        console.log(
          'USER MAP:',
          data
        )

        if (
          Array.isArray(data.data)
        ) {

          setReports(data.data)
        }
      })

      .catch(err => {

        console.error(
          'MAP ERROR:',
          err
        )
      })

  }, [])

  // ======================
  // FILTERED REPORTS
  // ======================

  const filteredReports =
    useMemo(() => {

      return reports.filter((item) => {

        // ======================
        // FILTER STATUS
        // ======================

        const itemStatus =
          (
            item.status_laporan || ''
          ).toUpperCase()

        if (
          statusFilter !== 'SEMUA' &&
          !itemStatus.includes(
            statusFilter
          )
        ) {

          return false
        }

        // ======================
        // FILTER PRIORITAS
        // ======================

        const itemPrioritas =
          (
            item.prioritas || ''
          ).toUpperCase()

        if (
          prioritasFilter !== 'SEMUA' &&
          !itemPrioritas.includes(
            prioritasFilter
          )
        ) {

          return false
        }

        // ======================
        // FILTER WAKTU
        // ======================

        if (
          waktuFilter !== 'SEMUA'
        ) {

          const createdDate =
            new Date(
              item.created_at
            )

          const now =
            new Date()

          const diffTime =
            now.getTime() -
            createdDate.getTime()

          const diffDays =
            diffTime /
            (
              1000 *
              60 *
              60 *
              24
            )

          if (
            waktuFilter === 'HARI_INI' &&
            createdDate.toDateString() !==
              now.toDateString()
          ) {

            return false
          }

          if (
            waktuFilter === '7_HARI' &&
            diffDays > 7
          ) {

            return false
          }

          if (
            waktuFilter === '30_HARI' &&
            diffDays > 30
          ) {

            return false
          }
        }

        return true
      })

    }, [
      reports,
      statusFilter,
      prioritasFilter,
      waktuFilter
    ])

  // ======================
  // RENDER
  // ======================

  return (

    <div>

      {/* ======================
          FILTER PANEL
      ====================== */}

      <div

        style={{

          width: '100%',

          marginBottom: '20px',

          padding: '20px',

          borderRadius: '20px',

          background:
            'rgba(255,255,255,0.75)',

          border:
            '1px solid rgba(15,23,42,0.08)',

          boxShadow:
            '0 10px 30px rgba(15,23,42,0.06)',

          display: 'flex',

          gap: '14px',

          alignItems: 'center',

          flexWrap: 'wrap'
        }}
      >

        <div

          style={{

            fontWeight: 800,

            color: '#1e293b',

            marginRight: '6px'
          }}
        >

          Filter Laporan

        </div>

        {/* ======================
            FILTER STATUS
        ====================== */}

        <select

          value={
            statusFilter
          }

          onChange={(e) =>
            setStatusFilter(
              e.target.value
            )
          }

          style={{

            padding:
              '12px 14px',

            borderRadius:
              '12px',

            border:
              '1px solid rgba(15,23,42,0.12)',

            background:
              'white',

            color:
              '#0f172a',

            fontWeight:
              700,

            outline:
              'none'
          }}
        >

          <option value='SEMUA'>
            Semua Status
          </option>

          <option value='IDENTIFIKASI'>
            Identifikasi
          </option>

          <option value='TERVERIFIKASI'>
            Terverifikasi
          </option>

          <option value='DITANGANI'>
            Ditangani
          </option>

          <option value='SELESAI'>
            Selesai
          </option>

          <option value='FIKTIF'>
            Fiktif
          </option>

        </select>

        {/* ======================
            FILTER PRIORITAS
        ====================== */}

        <select

          value={
            prioritasFilter
          }

          onChange={(e) =>
            setPrioritasFilter(
              e.target.value
            )
          }

          style={{

            padding:
              '12px 14px',

            borderRadius:
              '12px',

            border:
              '1px solid rgba(15,23,42,0.12)',

            background:
              'white',

            color:
              '#0f172a',

            fontWeight:
              700,

            outline:
              'none'
          }}
        >

          <option value='SEMUA'>
            Semua Prioritas
          </option>

          <option value='TINGGI'>
            Prioritas Tinggi
          </option>

          <option value='SEDANG'>
            Prioritas Sedang
          </option>

          <option value='RENDAH'>
            Prioritas Rendah
          </option>

        </select>

        {/* ======================
            FILTER WAKTU
        ====================== */}

        <select

          value={
            waktuFilter
          }

          onChange={(e) =>
            setWaktuFilter(
              e.target.value
            )
          }

          style={{

            padding:
              '12px 14px',

            borderRadius:
              '12px',

            border:
              '1px solid rgba(15,23,42,0.12)',

            background:
              'white',

            color:
              '#0f172a',

            fontWeight:
              700,

            outline:
              'none'
          }}
        >

          <option value='SEMUA'>
            Semua Waktu
          </option>

          <option value='HARI_INI'>
            Hari Ini
          </option>

          <option value='7_HARI'>
            7 Hari Terakhir
          </option>

          <option value='30_HARI'>
            30 Hari Terakhir
          </option>

        </select>

        <div

          style={{

            marginLeft:
              'auto',

            color:
              '#475569',

            fontWeight:
              700
          }}
        >

          Total: {filteredReports.length} laporan

        </div>

      </div>

      {/* ======================
          MAP
      ====================== */}

      <div

        style={{

          width: '100%',

          height: '700px',

          borderRadius: '24px',

          overflow: 'hidden',

          boxShadow:
            '0 10px 30px rgba(0,0,0,0.08)'
        }}
      >

        <MapContainer

          center={[-7.98, 112.63]}

          zoom={12}

          style={{

            width: '100%',

            height: '100%'
          }}
        >

          {/* ======================
              MAP TILE
          ====================== */}

          <TileLayer

            attribution='&copy; OpenStreetMap'

            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          />

          {/* ======================
              MARKERS
          ====================== */}

          {

            filteredReports.map((

              item,

              index

            ) => {

              const latitude =
                Number(item.latitude)

              const longitude =
                Number(item.longitude)

              // ======================
              // VALIDATE COORDINATE
              // ======================

              if (

                isNaN(latitude)

                ||

                isNaN(longitude)

              ) {

                return null
              }

              const markerColor =
                getMarkerColor(
                  item.prioritas
                )

              const markerIcon =
                createIcon(
                  markerColor
                )

              return (

                <div
                  key={`report-${item.laporan_id}-${index}`}
                >

                  {/* ======================
                      AREA CIRCLE
                  ====================== */}

                  <Circle

                    center={[
                      latitude,
                      longitude
                    ]}

                    radius={300}

                    pathOptions={{

                      color: markerColor,

                      fillColor: markerColor,

                      fillOpacity: 0.2
                    }}
                  />

                  {/* ======================
                      MARKER
                  ====================== */}

                  <Marker

                    position={[
                      latitude,
                      longitude
                    ]}

                    icon={markerIcon}
                  >

                    <Popup>

                      <div
                        style={{
                          minWidth: '220px'
                        }}
                      >

                        <h3>

                          {
                            item.jenis_bencana
                          }

                        </h3>

                        <hr />

                        <p>

                          <strong>
                            Status:
                          </strong>

                          {' '}

                          {
                            item.status_laporan
                          }

                        </p>

                        <p>

                          <strong>
                            Prioritas:
                          </strong>

                          {' '}

                          {
                            item.prioritas
                              || '-'
                          }

                        </p>

                        <p>

                          <strong>
                            Pelapor:
                          </strong>

                          {' '}

                          {
                            item.nama_pelapor
                          }

                        </p>

                        <p>

                          <strong>
                            Waktu:
                          </strong>

                          {' '}

                          {

                            new Date(
                              item.created_at
                            )

                              .toLocaleString(
                                'id-ID'
                              )
                          }

                        </p>

                      </div>

                    </Popup>

                  </Marker>

                </div>
              )
            })
          }

        </MapContainer>

      </div>

    </div>
  )
}