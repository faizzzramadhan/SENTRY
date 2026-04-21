'use client'

import MapView from './components/MapView'
import styles from './geoint.module.css'

export default function GeoIntPage() {
  return (
    <div className={styles.wrapper}>

      {/* MAP */}
      <MapView />

      {/* 🔥 SIDEBAR */}
      <div className={styles.sidebar}>
        <h3>Tingkat Risiko</h3>

        <label><input type="checkbox" /> Banjir</label>
        <label><input type="checkbox" /> Longsor</label>
        <label><input type="checkbox" /> Gempa</label>

        <div className={styles.dropdown}>
          <select>
            <option>Semua Tingkat</option>
          </select>
        </div>

        <div className={styles.dropdown}>
          <select>
            <option>Semua Kecamatan</option>
          </select>
        </div>
      </div>

      {/* 🔥 ALERT */}
      <div className={styles.alert}>
        ⚠️ Laporan dalam Zona Risiko Tinggi
        <br />
        <small>Spatial Score: 3 | Priority: Tinggi</small>
      </div>

      {/* 🔥 INFO CARD */}
      <div className={styles.infoCard}>
        <div className={styles.badge}>BMKG</div>
        <p>Gempa bumi berkekuatan 5.3 SR terjadi di Malang.</p>
        <small>24 menit lalu</small>
      </div>

      {/* 🔥 LEGEND */}
      <div className={styles.legend}>
        <div><span className={styles.red}></span> Tinggi</div>
        <div><span className={styles.yellow}></span> Sedang</div>
        <div><span className={styles.green}></span> Rendah</div>
      </div>

    </div>
  )
}