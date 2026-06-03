'use client'

import {
  useEffect,
  useState
} from 'react'

import {
  GeoJSON,
  Pane
} from 'react-leaflet'

// =========================
// TYPES
// =========================

type Props = {

  bencana: string
}

// =========================
// MAPPING JENIS
// =========================

const jenisMap: any = {

  banjir: 60001,

  longsor: 60002,

  gempa: 60007
}

// =========================
// VALID GEOJSON CHECK
// =========================

const isValidGeoJSON = (
  data: any
) => {

  if (!data) {

    return false
  }

  if (
    data.type === 'FeatureCollection' &&
    Array.isArray(data.features)
  ) {

    return true
  }

  if (
    data.type === 'Feature' &&
    data.geometry
  ) {

    return true
  }

  if (
    [
      'Polygon',
      'MultiPolygon',
      'Point',
      'MultiPoint',
      'LineString',
      'MultiLineString',
      'GeometryCollection'
    ].includes(data.type)
  ) {

    return true
  }

  return false
}

// =========================
// COMPONENT
// =========================

export default function RiskLayer({

  bencana

}: Props) {

  // =========================
  // STATE
  // =========================

  const [

    geoData,

    setGeoData

  ] = useState<any>(null)

  const [

    manualZona,

    setManualZona

  ] = useState<any[]>([])

  // =========================
  // FETCH DEFAULT BPBD
  // =========================

  useEffect(() => {

    if (!bencana) {

      return
    }

    fetch(

      `http://localhost:5555/api/geoint/risk?bencana=${bencana}`

    )

      .then(res => res.json())

      .then(res => {

        console.log(
          'DEFAULT RISK:',
          res
        )

        if (
          isValidGeoJSON(res)
        ) {

          setGeoData(res)

        } else {

          console.error(
            'INVALID DEFAULT GEOJSON:',
            res
          )

          setGeoData(null)
        }
      })

      .catch(err => {

        console.error(
          'DEFAULT FETCH ERROR:',
          err
        )

        setGeoData(null)
      })

  }, [bencana])

  // =========================
  // FETCH MANUAL DATABASE
  // =========================

  useEffect(() => {

    if (!bencana) {

      return
    }

    fetch(

      'http://localhost:5555/api/geoint/zona-rawan'

    )

      .then(res => res.json())

      .then(res => {

        console.log(
          'MANUAL ZONA:',
          res
        )

        if (res.success) {

          const filtered =
            res.data.filter(

              (item: any) =>

                Number(item.jenis_id) ===
                  Number(jenisMap[bencana])

                &&

                item.status ===
                  'AKTIF'
            )

          setManualZona(
            filtered
          )
        }
      })

      .catch(err => {

        console.error(
          'MANUAL FETCH ERROR:',
          err
        )
      })

  }, [bencana])

  // =========================
  // COLOR
  // =========================

  const getColor = (
    tingkat: string
  ) => {

    const text =
      tingkat?.toUpperCase()

    if (
      text?.includes('TINGGI')
    ) {

      return '#ef4444'
    }

    if (
      text?.includes('SEDANG')
    ) {

      return '#f59e0b'
    }

    return '#22c55e'
  }

  // =========================
  // GET TINGKAT
  // =========================

  const getTingkat = (
    tingkat: string
  ) => {

    if (
      tingkat &&
      tingkat.trim() !== ''
    ) {

      return tingkat
    }

    if (
      bencana === 'gempa'
    ) {

      return 'SEDANG'
    }

    return 'RENDAH'
  }

  // =========================
  // GET BENCANA LABEL
  // =========================

  const getBencanaLabel = (
    text: string
  ) => {

    if (text === 'banjir') {

      return 'Banjir'
    }

    if (text === 'longsor') {

      return 'Tanah Longsor'
    }

    if (text === 'gempa') {

      return 'Gempa Bumi'
    }

    return text
  }

  // =========================
  // STYLE DEFAULT
  // =========================

  const polygonStyle = (
    feature: any
  ) => {

    const tingkat =
      getTingkat(
        feature?.properties?.tingkat
      )

    return {

      fillColor:
        getColor(
          tingkat
        ),

      weight: 2,

      opacity: 1,

      color: '#ffffff',

      dashArray: '4',

      fillOpacity: 0.35,
    }
  }

  // =========================
  // RENDER
  // =========================

  return (

    <>

      {/* =========================
          DEFAULT BPBD
      ========================= */}

      {

        geoData &&
        isValidGeoJSON(geoData) && (

          <Pane

            name='defaultPane'

            style={{
              zIndex: 400
            }}
          >

            <GeoJSON

              key={
                `default-${bencana}`
              }

              data={geoData}

              style={polygonStyle}

              onEachFeature={(

                feature,
                layer

              ) => {

                const tingkat =
                  getTingkat(
                    feature?.properties?.tingkat
                  )

                layer.bindPopup(`

                  <div style="
                    min-width:230px;
                    background:#071226;
                    color:white;
                    padding:8px;
                    border-radius:12px;
                    font-family:sans-serif;
                  ">

                    <h3 style="
                      margin:0 0 14px 0;
                      color:white;
                      font-size:18px;
                      font-weight:700;
                    ">
                      Zona Default BPBD
                    </h3>

                    <b>Kelurahan:</b>
                    ${feature?.properties?.kelurahan || '-'}
                    <br/>

                    <b>Bencana:</b>
                    ${feature?.properties?.bencana || getBencanaLabel(bencana)}
                    <br/>

                    <b>Tingkat:</b>
                    ${tingkat}

                  </div>
                `)
              }}
            />

          </Pane>
        )
      }

      {/* =========================
          POLYGON MANUAL
      ========================= */}

      <Pane

        name='manualPane'

        style={{
          zIndex: 650
        }}
      >

        {

          manualZona.map(

            (item) => {

              let geojson = null

              try {

                geojson =
                  typeof item.geojson === 'string'
                    ? JSON.parse(item.geojson)
                    : item.geojson

              } catch (error) {

                console.error(
                  'INVALID MANUAL GEOJSON:',
                  item
                )

                return null
              }

              if (
                !isValidGeoJSON(geojson)
              ) {

                console.error(
                  'SKIP INVALID MANUAL GEOJSON:',
                  item
                )

                return null
              }

              const tingkat =
                getTingkat(
                  item.tingkat_resiko
                )

              return (

                <GeoJSON

                  key={
                    item.zona_id
                  }

                  data={geojson}

                  style={{

                    fillColor:
                      getColor(
                        tingkat
                      ),

                    weight: 5,

                    opacity: 1,

                    color:
                      getColor(
                        tingkat
                      ),

                    fillOpacity: 0.75,

                    dashArray: '',
                  }}

                  onEachFeature={(

                    feature,
                    layer

                  ) => {

                    layer.bindPopup(`

                      <div style="
                        min-width:230px;
                        background:#071226;
                        color:white;
                        padding:8px;
                        border-radius:12px;
                        font-family:sans-serif;
                      ">

                        <h3 style="
                          margin:0 0 14px 0;
                          color:white;
                          font-size:18px;
                          font-weight:700;
                        ">
                          Zona Manual Staff
                        </h3>

                        <b>Lokasi/Zona:</b>
                        ${item.nama_zona || '-'}
                        <br/>

                        <b>Bencana:</b>
                        ${getBencanaLabel(bencana)}
                        <br/>

                        <b>Tingkat:</b>
                        ${tingkat}
                        <br/>

                        <b>Sumber:</b>
                        ${item.sumber_data || 'MANUAL'}

                      </div>
                    `)
                  }}
                />
              )
            }
          )
        }

      </Pane>

    </>
  )
}