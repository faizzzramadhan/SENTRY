'use client'

import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import styles from '../geoint.module.css'

// Fix icon bug
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet/dist/images/marker-shadow.png',
})

export default function MapView() {

  // 🔥 DATA EVENT
  const events = [
    {
      id: 1,
      title: "Gempa",
      lokasi: "Malang",
      lat: -7.98,
      lng: 112.63,
      desc: "Gempa bumi 2.3 SR"
    },
    {
      id: 2,
      title: "Banjir",
      lokasi: "Lowokwaru",
      lat: -7.95,
      lng: 112.61,
      desc: "Banjir akibat hujan deras"
    }
  ]

  // 🔥 FIX GEOJSON (pakai as const)
  const wilayahGeoJSON = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          nama: "Lowokwaru",
          risk: "tinggi"
        },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [112.60, -7.96],
              [112.62, -7.96],
              [112.62, -7.98],
              [112.60, -7.98],
              [112.60, -7.96]
            ]
          ]
        }
      },
      {
        type: "Feature",
        properties: {
          nama: "Sukun",
          risk: "sedang"
        },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [112.63, -7.97],
              [112.65, -7.97],
              [112.65, -7.99],
              [112.63, -7.99],
              [112.63, -7.97]
            ]
          ]
        }
      }
    ]
  } as const // 🔥 INI KUNCI

  // 🎨 Warna DSS
  const getColor = (risk: string) => {
    switch (risk) {
      case 'tinggi': return '#ff4d4f'
      case 'sedang': return '#faad14'
      case 'rendah': return '#52c41a'
      default: return '#ccc'
    }
  }

  const style = (feature: any) => ({
    fillColor: getColor(feature.properties.risk),
    weight: 1,
    color: '#fff',
    fillOpacity: 0.6
  })

  return (
    <MapContainer
      center={[-7.98, 112.63]}
      zoom={12}
      className={styles.map}
    >

      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* MARKER */}
      {events.map((item) => (
        <Marker key={item.id} position={[item.lat, item.lng]}>
          <Popup>
            <strong>{item.title}</strong><br />
            {item.desc}
          </Popup>
        </Marker>
      ))}

      {/* 🔥 FIX DI SINI */}
      <GeoJSON data={wilayahGeoJSON as any} style={style} />

    </MapContainer>
  )
}