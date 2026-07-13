'use client'

import {
  useEffect,
  useMemo,
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

type FeatureCollection = {
  type: 'FeatureCollection'
  features: any[]
}

// =========================
// HELPER
// =========================

function isValidGeometry(geometry: any) {
  return (
    geometry &&
    typeof geometry === 'object' &&
    typeof geometry.type === 'string' &&
    Array.isArray(geometry.coordinates) &&
    geometry.coordinates.length > 0
  )
}

function parseGeometry(geometry: any) {
  if (!geometry) {
    return null
  }

  if (typeof geometry === 'string') {
    try {
      return JSON.parse(geometry)
    } catch {
      return null
    }
  }

  return geometry
}

function normalizeFeature(feature: any) {
  if (!feature) {
    return null
  }

  const geometry =
    parseGeometry(
      feature.geometry ||
        feature.geom ||
        feature.geom_zona_rawan
    )

  if (!isValidGeometry(geometry)) {
    return null
  }

  return {
    type: 'Feature',
    properties: {
      ...(feature.properties || {}),

      id:
        feature.properties?.id ||
        feature.id_zona ||
        feature.zona_id ||
        feature.id ||
        '-',

      kelurahan:
        feature.properties?.kelurahan ||
        feature.kelurahan ||
        feature.nama_kelurahan ||
        feature.nama_zona ||
        '-',

      bencana:
        feature.properties?.bencana ||
        feature.bencana ||
        feature.nama_bencana ||
        '-',

      tingkat:
        feature.properties?.tingkat ||
        feature.tingkat ||
        feature.tingkat_resiko ||
        feature.tingkat_risiko ||
        feature.prioritas ||
        'SEDANG'
    },
    geometry
  }
}

function normalizeGeoJson(
  response: any
): FeatureCollection | null {
  const rawData =
    response?.data ||
    response?.geojson ||
    response

  if (
    rawData?.type === 'FeatureCollection' &&
    Array.isArray(rawData.features)
  ) {
    const features =
      rawData.features
        .map(normalizeFeature)
        .filter(Boolean)

    return {
      type: 'FeatureCollection',
      features
    }
  }

  if (Array.isArray(rawData)) {
    const features =
      rawData
        .map(normalizeFeature)
        .filter(Boolean)

    return {
      type: 'FeatureCollection',
      features
    }
  }

  return null
}

function getSafeText(value: any) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return '-'
  }

  return String(value)
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
  ] = useState<FeatureCollection | null>(null)

  const [
    error,
    setError
  ] = useState('')

  // =========================
  // FETCH
  // =========================

  useEffect(() => {
    if (!bencana) {
      setGeoData(null)
      setError('Parameter bencana tidak ditemukan.')
      return
    }

    setGeoData(null)
    setError('')

    fetch(
      `http://localhost:5555/api/geoint/risk?bencana=${encodeURIComponent(
        bencana
      )}`,
      {
        cache: 'no-store'
      }
    )
      .then(res => res.json())

      .then(res => {
        console.log(
          'RISK DATA:',
          res
        )

        const normalized =
          normalizeGeoJson(res)

        if (
          !normalized ||
          !Array.isArray(normalized.features)
        ) {
          setGeoData(null)
          setError('Format GeoJSON tidak valid.')
          return
        }

        setGeoData(normalized)
      })

      .catch(err => {
        console.error(
          'RISK FETCH ERROR:',
          err
        )

        setGeoData(null)
        setError('Data zona rawan gagal dimuat.')
      })
  }, [bencana])

  // =========================
  // FINAL DATA
  // =========================

  const finalGeoData = useMemo(() => {
    if (!geoData) {
      return null
    }

    const features =
      geoData.features.map((feature) => {
        const properties =
          feature.properties || {}

        const isGempa =
          bencana
            .toLowerCase()
            .includes('gempa')

        return {
          ...feature,
          properties: {
            ...properties,

            tingkat:
              isGempa
                ? 'SEDANG'
                : properties.tingkat || 'SEDANG',

            bencana:
              properties.bencana ||
              bencana
          }
        }
      })

    return {
      type: 'FeatureCollection',
      features
    } as FeatureCollection
  }, [geoData, bencana])

  // =========================
  // COLOR
  // =========================

  const getColor = (
    tingkat?: string
  ) => {
    const text =
      String(tingkat || 'SEDANG')
        .toUpperCase()

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
    const tingkat =
      feature?.properties?.tingkat ||
      'SEDANG'

    return {
      fillColor:
        getColor(tingkat),

      weight: 2,

      opacity: 1,

      color: '#ffffff',

      dashArray: '4',

      fillOpacity: 0.35
    }
  }

  // =========================
  // LOADING / EMPTY
  // =========================

  if (error) {
    console.warn(
      'RISK LAYER WARNING:',
      error
    )

    return null
  }

  if (
    !finalGeoData ||
    !finalGeoData.features.length
  ) {
    return null
  }

  // =========================
  // RENDER
  // =========================

  return (
    <GeoJSON
      key={`${bencana}-${finalGeoData.features.length}`}
      data={finalGeoData as any}
      style={polygonStyle}
      onEachFeature={(
        feature,
        layer
      ) => {
        const properties =
          feature.properties || {}

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
            ${getSafeText(properties.kelurahan)}
            <br/>

            <b>Bencana:</b>
            ${getSafeText(properties.bencana)}
            <br/>

            <b>Tingkat:</b>
            ${getSafeText(properties.tingkat)}

          </div>
        `)
      }}
    />
  )
}