'use client'

import {
  MapContainer,
  TileLayer,
  ZoomControl
} from 'react-leaflet'

import 'leaflet/dist/leaflet.css'

import L from 'leaflet'

import styles from '../../geoint.module.css'

// =========================
// FIX LEAFLET DEFAULT ICON
// =========================

delete (L.Icon.Default.prototype as any)._getIconUrl

L.Icon.Default.mergeOptions({

  iconRetinaUrl:
    'https://unpkg.com/leaflet/dist/images/marker-icon-2x.png',

  iconUrl:
    'https://unpkg.com/leaflet/dist/images/marker-icon.png',

  shadowUrl:
    'https://unpkg.com/leaflet/dist/images/marker-shadow.png',
})

// =========================
// TYPES
// =========================

type Props = {

  children?: React.ReactNode
}

// =========================
// COMPONENT
// =========================

export default function BaseMap({

  children

}: Props) {

  return (

    <div className={styles.fullMapWrapper}>

      <MapContainer

        center={[-7.98, 112.63]}

        zoom={12}

        zoomControl={false}

        scrollWheelZoom={true}

        className={styles.map}
      >

        {/* =========================
            BASE TILE
        ========================= */}

        <TileLayer

          attribution='&copy; OpenStreetMap'

          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />

        {/* =========================
            ZOOM CONTROL
        ========================= */}

        <ZoomControl position='bottomright' />

        {/* =========================
            DYNAMIC LAYER
        ========================= */}

        {children}

      </MapContainer>

    </div>
  )
}