'use client'

import styles
from '../../geoint.module.css'

// =========================
// TYPES
// =========================

type Props = {
  data?: any[]
}

// =========================
// COMPONENT
// =========================

export default function AnalyticsBar({
  data = []
}: Props) {

  // =========================
  // STATS
  // =========================

  const tinggi = data.filter(
    (item: any) =>

      (
        item.osint_priority_level
        ||
        item.prioritas
        ||
        ''
      )

        .toUpperCase()

        .includes('TINGGI')
  ).length

  const sedang = data.filter(
    (item: any) =>

      (
        item.osint_priority_level
        ||
        item.prioritas
        ||
        ''
      )

        .toUpperCase()

        .includes('SEDANG')
  ).length

  const rendah = data.filter(
    (item: any) =>

      (
        item.osint_priority_level
        ||
        item.prioritas
        ||
        ''
      )

        .toUpperCase()

        .includes('RENDAH')
  ).length

  // =========================
  // RENDER
  // =========================

  return (

    <div className={styles.analytics}>

      <div className={styles.analyticsCard}>

        <span>
          Total Laporan
        </span>

        <h2>
          {data.length}
        </h2>

      </div>

      <div className={styles.analyticsCard}>

        <span>
          Prioritas Tinggi
        </span>

        <h2>
          {tinggi}
        </h2>

      </div>

      <div className={styles.analyticsCard}>

        <span>
          Prioritas Sedang
        </span>

        <h2>
          {sedang}
        </h2>

      </div>

      <div className={styles.analyticsCard}>

        <span>
          Prioritas Rendah
        </span>

        <h2>
          {rendah}
        </h2>

      </div>

    </div>
  )
}