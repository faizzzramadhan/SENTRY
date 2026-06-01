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
  // RENDER
  // ======================

  return (

    <div
  style={{
    width: '100%',
    height: '700px',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
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

          reports.map((

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
  )
}