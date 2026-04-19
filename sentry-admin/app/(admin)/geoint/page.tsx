'use client'

import styles from './geoint.module.css'
import dynamic from 'next/dynamic'

// biar gak error SSR (Leaflet aman)
const MapView = dynamic(() => import('./components/MapView'), {
  ssr: false
})

export default function GeoIntPage() {
  return (
    <div className={styles.container}>
      
      {/* Header */}
      <div className={styles.header}>
        <span>Monitoring Spasial</span>
        <span className={styles.badge}>Halo, Admin</span>
      </div>

      {/* Map */}
      <div className={styles.mapWrapper}>
        <MapView />
      </div>

    </div>
  )
}