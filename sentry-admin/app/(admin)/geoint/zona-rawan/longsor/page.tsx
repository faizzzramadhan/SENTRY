'use client'

import BaseMap
from '../../components/map/BaseMap'

import RiskLayer
from '../../components/map/RiskLayer'

import styles
from '../../geoint.module.css'

export default function Page() {

  return (

    <div className={styles.wrapper}>

      <div className={styles.mainContent}>

        {/* HEADER */}

        <div className={styles.topBar}>

          <div className={styles.headerContainer}>

            {/* TITLE */}

            <div className={styles.headerTitle}>

              <small>
                MONITORING SPASIAL
              </small>

              <h1>
                Zona Rawan Longsor
              </h1>

            </div>

            {/* ACTION */}

            <div className={styles.actionBar}>

              <div className={styles.modeBadge}>

                Mode:
                Zona Longsor

              </div>

              <button

                className={styles.refreshButton}

                onClick={() =>
                  window.location.reload()
                }
              >

                Refresh

              </button>

            </div>

          </div>

        </div>

        {/* MAP */}

        <BaseMap>

          <RiskLayer
            bencana="longsor"
          />

        </BaseMap>

        {/* LEGENDA */}

        <div className={styles.legendRisk}>

          <div className={styles.legendItem}>

            <span
              className={styles.redDot}
            />

            Risiko Tinggi

          </div>

          <div className={styles.legendItem}>

            <span
              className={styles.yellowDot}
            />

            Risiko Sedang

          </div>

          <div className={styles.legendItem}>

            <span
              className={styles.greenDot}
            />

            Risiko Rendah

          </div>

        </div>

      </div>

    </div>
  )
}