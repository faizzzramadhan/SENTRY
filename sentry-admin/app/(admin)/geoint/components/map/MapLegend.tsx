'use client'

import styles from '../../geoint.module.css'

export default function MapLegend() {

  return (

    <div className={styles.legend}>

      <div>

        <span
          className={styles.red}
        ></span>

        Prioritas Tinggi

      </div>

      <div>

        <span
          className={styles.yellow}
        ></span>

        Prioritas Sedang

      </div>

      <div>

        <span
          className={styles.green}
        ></span>

        Prioritas Rendah

      </div>

    </div>
  )
}