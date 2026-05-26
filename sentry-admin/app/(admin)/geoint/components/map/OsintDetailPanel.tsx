'use client'

import styles
from '../../geoint.module.css'

type Props = {

  data: any

  onClose: () => void
}

export default function OsintDetailPanel({

  data,

  onClose

}: Props) {

  // =========================
  // PRIORITY COLOR
  // =========================

  const getPriorityColor = (
    priority: string
  ) => {

    const text =
      (priority || '')
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

  return (

    <div className={styles.detailOverlay}>

      <div className={styles.detailPanel}>

        {/* =========================
            HEADER
        ========================= */}

        <div className={styles.detailHeader}>

          <div>

            <small>
              DETAIL OSINT
            </small>

            <h2>

              {
                data.osint_event_type
                ||
                'Tidak diketahui'
              }

            </h2>

          </div>

          <button

            className={
              styles.detailClose
            }

            onClick={onClose}
          >

            ✕

          </button>

        </div>

        {/* =========================
            PRIORITY
        ========================= */}

        <div

          className={
            styles.detailPriority
          }

          style={{

            background:
              getPriorityColor(
                data.osint_priority_level
              )
          }}
        >

          {
            data.osint_priority_level
          }

        </div>

        {/* =========================
            CONTENT
        ========================= */}

        <div className={styles.detailContent}>

          {/* SOURCE */}

          <div className={styles.detailItem}>

            <span>
              Source
            </span>

            <strong>
              {
                data.osint_source
              }
            </strong>

          </div>

          {/* STATUS */}

          <div className={styles.detailItem}>

            <span>
              Verification Status
            </span>

            <strong>
              {
                data.osint_verification_status
              }
            </strong>

          </div>

          {/* AREA */}

          <div className={styles.detailItem}>

            <span>
              Area
            </span>

            <strong>
              {
                data.osint_area_text
                ||
                '-'
              }
            </strong>

          </div>

          {/* CONTENT */}

          <div className={styles.detailItem}>

            <span>
              Konten
            </span>

            <strong
              style={{
                lineHeight: 1.6
              }}
            >

              {
                data.osint_content
                ||
                '-'
              }

            </strong>

          </div>

          {/* ACCOUNT */}

          {

            data.osint_account_name && (

              <div className={styles.detailItem}>

                <span>
                  Account
                </span>

                <strong>

                  {
                    data.osint_account_name
                  }

                  {

                    data.osint_account_username &&
                    ` (@${data.osint_account_username})`
                  }

                </strong>

              </div>
            )
          }

          {/* ENGAGEMENT */}

          {

            data.osint_source === 'X'
            && (

              <div className={styles.detailItem}>

                <span>
                  Engagement
                </span>

                <strong>

                  ❤️ {
                    data.osint_like_count || 0
                  }

                  {' | '}

                  🔁 {
                    data.osint_share_count || 0
                  }

                  {' | '}

                  💬 {
                    data.osint_reply_count || 0
                  }

                </strong>

              </div>
            )
          }

          {/* WEATHER */}

          {

            data.osint_source === 'BMKG'
            && (

              <>

                <div className={styles.detailItem}>

                  <span>
                    Cuaca
                  </span>

                  <strong>

                    {
                      data.osint_weather_desc
                      ||
                      '-'
                    }

                  </strong>

                </div>

                <div className={styles.detailItem}>

                  <span>
                    Suhu
                  </span>

                  <strong>

                    {
                      data.osint_temperature_c
                    }°C

                  </strong>

                </div>

                <div className={styles.detailItem}>

                  <span>
                    Kelembapan
                  </span>

                  <strong>

                    {
                      data.osint_humidity_percent
                    }%

                  </strong>

                </div>

                <div className={styles.detailItem}>

                  <span>
                    Kecepatan Angin
                  </span>

                  <strong>

                    {
                      data.osint_wind_speed_kmh
                    } km/h

                  </strong>

                </div>

              </>
            )
          }

          {/* KOORDINAT */}

          <div className={styles.detailItem}>

            <span>
              Latitude
            </span>

            <strong>

              {
                data.osint_latitude
              }

            </strong>

          </div>

          <div className={styles.detailItem}>

            <span>
              Longitude
            </span>

            <strong>

              {
                data.osint_longitude
              }

            </strong>

          </div>

          {/* WAKTU */}

          <div className={styles.detailItem}>

            <span>
              Event Time
            </span>

            <strong>

              {

                data.osint_event_time

                  ? new Date(
                      data.osint_event_time
                    ).toLocaleString(
                      'id-ID'
                    )

                  : '-'
              }

            </strong>

          </div>

          {/* MEDIA */}

          {

            data.osint_media_url && (

              <div className={styles.detailItem}>

                <span>
                  Media
                </span>

                <img

                  src={
                    data.osint_media_url
                  }

                  alt="OSINT Media"

                  style={{

                    width: '100%',

                    borderRadius: '14px',

                    marginTop: '10px',

                    objectFit: 'cover'
                  }}
                />

              </div>
            )
          }

          {/* LINK */}

          {

            data.osint_link_url && (

              <div className={styles.detailItem}>

                <span>
                  Link Source
                </span>

                <a

                  href={
                    data.osint_link_url
                  }

                  target="_blank"

                  rel="noreferrer"

                  style={{

                    color: '#60a5fa',

                    wordBreak: 'break-all',

                    lineHeight: 1.5
                  }}
                >

                  {
                    data.osint_link_url
                  }

                </a>

              </div>
            )
          }

        </div>

      </div>

    </div>
  )
}