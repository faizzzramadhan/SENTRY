'use client'

import {
  Circle,
  Marker,
  Popup
} from 'react-leaflet'

import L from 'leaflet'

// =========================
// TYPES
// =========================

type FusionItem = {

  latitude: number

  longitude: number

  humintTitle?: string

  osintTitle?: string
}

type Props = {

  humintData: any[]

  osintData: any[]
}

// =========================
// FUSION ICON
// =========================

const fusionIcon = new L.Icon({

  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png',

  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',

  iconSize: [30, 45],

  iconAnchor: [15, 45],

  popupAnchor: [1, -34],

  shadowSize: [41, 41]
})

// =========================
// COMPONENT
// =========================

export default function FusionLayer({

  humintData,

  osintData

}: Props) {

  const fusionData: FusionItem[] = []

  humintData.forEach(humint => {

    osintData.forEach(osint => {

      const humintLat =
        Number(humint.latitude)

      const humintLng =
        Number(humint.longitude)

      const osintLat =
        Number(osint.osint_latitude)

      const osintLng =
        Number(osint.osint_longitude)

      // =====================
      // VALIDATE COORDINATE
      // =====================

      if (

        isNaN(humintLat)

        ||

        isNaN(humintLng)

        ||

        isNaN(osintLat)

        ||

        isNaN(osintLng)

      ) {

        return
      }

      // =====================
      // DISTANCE CHECK
      // =====================

      const latDiff =

        Math.abs(
          humintLat - osintLat
        )

      const lngDiff =

        Math.abs(
          humintLng - osintLng
        )

      // =====================
      // NORMALIZE EVENT
      // =====================

      const humintEvent =

        (
          humint.jenis_bencana
          || ''
        )

        .toUpperCase()

        .replaceAll('_', ' ')

      const osintEvent =

        (
          osint.osint_event_type
          || ''
        )

        .toUpperCase()

        .replaceAll('_', ' ')

      // =====================
      // EVENT MATCH
      // =====================

      const eventMatched =

        (

          humintEvent.includes('BANJIR')

          &&

          osintEvent.includes('BANJIR')

        )

        ||

        (

          humintEvent.includes('LONGSOR')

          &&

          osintEvent.includes('LONGSOR')

        )

        ||

        (

          humintEvent.includes('ANGIN')

          &&

          osintEvent.includes('ANGIN')

        )

        ||

        (

          humintEvent.includes('GEMPA')

          &&

          osintEvent.includes('GEMPA')

        )

      // =====================
      // DEBUG
      // =====================

      console.log({

        humintEvent,

        osintEvent,

        latDiff,

        lngDiff,

        eventMatched
      })

      // =====================
      // FUSION DETECTED
      // =====================

      if (

        latDiff < 1

        &&

        lngDiff < 1

        &&

        eventMatched

      ) {

        console.log(

          '🔥 FUSION MATCH:',

          humintEvent,

          osintEvent

        )

        fusionData.push({

          latitude:

            (
              humintLat + osintLat
            ) / 2,

          longitude:

            (
              humintLng + osintLng
            ) / 2,

          humintTitle:

            humint.judul_laporan

            ||

            humint.jenis_bencana

            ||

            'HUMINT',

          osintTitle:

            osint.osint_event_type

            ||

            'OSINT'
        })
      }
    })
  })

  console.log(
    'TOTAL FUSION:',
    fusionData.length
  )

  // =========================
  // RENDER
  // =========================

  return (

    <>

      {

        fusionData.map((

          item,

          index

        ) => (

          <div
            key={index}
          >

            {/* =====================
                FUSION ZONE
            ===================== */}

            <Circle

              center={[

                item.latitude,

                item.longitude

              ]}

              radius={900}

              pathOptions={{

                color: '#a855f7',

                fillColor: '#a855f7',

                fillOpacity: 0.25
              }}
            />

            {/* =====================
                FUSION MARKER
            ===================== */}

            <Marker

              position={[

                item.latitude,

                item.longitude

              ]}

              icon={fusionIcon}
            >

              <Popup>

                <div
                  style={{
                    minWidth: '240px'
                  }}
                >

                  <h3>
                    🔥 Fusion Correlation
                  </h3>

                  <hr />

                  <p>

                    <strong>
                      HUMINT:
                    </strong>

                    {' '}

                    {
                      item.humintTitle
                    }

                  </p>

                  <p>

                    <strong>
                      OSINT:
                    </strong>

                    {' '}

                    {
                      item.osintTitle
                    }

                  </p>

                  <p
                    style={{
                      color: '#a855f7',
                      fontWeight: 'bold',
                      marginTop: '10px'
                    }}
                  >

                    Korelasi Multi-Sumber
                    Terdeteksi

                  </p>

                </div>

              </Popup>

            </Marker>

          </div>
        ))
      }

    </>
  )
}