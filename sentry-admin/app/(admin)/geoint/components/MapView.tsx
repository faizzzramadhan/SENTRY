'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
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

  const data = [
    {
      id: 1,
      title: "BMKG",
      lokasi: "Malang - Suhat",
      lat: -7.98,
      lng: 112.63,
      desc: "Gempa bumi berkekuatan 2.3 SR terjadi di Kota Malang."
    }
  ]

  return (
    <MapContainer center={[-7.98, 112.63]} zoom={13} className={styles.map}>
      
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {data.map((item) => (
        <Marker key={item.id} position={[item.lat, item.lng]}>
          <Popup>
            <div className={styles.popupCard}>
              <div className={styles.tag}>BMKG</div>
              <b>{item.lokasi}</b>
              <p style={{ fontSize: '12px' }}>{item.desc}</p>
            </div>
          </Popup>
        </Marker>
      ))}

    </MapContainer>
  )
}