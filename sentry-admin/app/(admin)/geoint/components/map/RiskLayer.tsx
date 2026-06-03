'use client'

import {
  useEffect,
  useState
} from 'react'

import {
  GeoJSON
} from 'react-leaflet'

// =========================
// TYPES
// =========================

type Props = {

  bencana: string
}

// =========================
// COMPONENT
// =========================

export default function RiskLayer({

  bencana

}: Props) {

  const [

    geoData,

    setGeoData

  ] = useState<any>(null)

  // =========================
  // FETCH
  // =========================

  useEffect(() => {

    fetch(

      `http://localhost:5555/api/geoint/risk?bencana=${bencana}`

    )

      .then(res => res.json())

      .then(res => {

        console.log(
          'RISK DATA:',
          res
        )

        setGeoData(res)
      })

      .catch(err => {

        console.error(
          'RISK FETCH ERROR:',
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
      tingkat.toUpperCase()

    if (
      text.includes('TINGGI')
    ) {
      return '#ef4444'
    }

    if (
      text.includes('SEDANG')
    ) {
      return '#f59e0b'
    }

    return '#22c55e'
  }

  // =========================
  // STYLE
  // =========================

  const polygonStyle = (
    feature: any
  ) => {

    return {

      fillColor:
        getColor(
          feature.properties
            .tingkat
        ),

      weight: 2,

      opacity: 1,

      color: '#ffffff',

      dashArray: '4',

      fillOpacity: 0.35,
    }
  }

  // =========================
  // LOADING
  // =========================

  if (!geoData) {

    return null
  }

  // =========================
  // RENDER
  // =========================

  return (

    <GeoJSON

      data={geoData}

      style={polygonStyle}

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
                  Keterangan Zona :
            </h3>

            <b>Kelurahan:</b>
            ${feature.properties.kelurahan}
            <br/>

            <b>Bencana:</b>
            ${feature.properties.bencana}
            <br/>

            <b>Tingkat:</b>
            ${feature.properties.tingkat}

          </div>
        `)
      }}
    />
  )
}