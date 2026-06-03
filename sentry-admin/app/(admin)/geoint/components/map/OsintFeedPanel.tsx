'use client'

import styles
from '../../geoint.module.css'

// =========================
// TYPES
// =========================

type OsintItem = {

  osint_id: number

  osint_source: string

  osint_event_type: string

  osint_content: string

  osint_area_text: string

  osint_priority_level: string

  osint_post_time: string

  osint_link_url: string

  osint_account_name: string

  osint_account_username: string

  osint_verification_status: string

  osint_like_count?: number

  osint_share_count?: number

  osint_reply_count?: number
}

type Props = {
  data: OsintItem[]
}

// =========================
// COMPONENT
// =========================

export default function OsintFeedPanel({
  data
}: Props) {

  console.log(
    'OSINT FEED DATA:',
    data
  )

  // =========================
  // FILTER SOCIAL FEED
  // =========================

  const socialFeed =

    data

      .filter(item => {

        const source =

          item.osint_source
            ?.toString()
            ?.trim()
            ?.toUpperCase() || ''

        console.log(
          'OSINT SOURCE:',
          source
        )

        return (

          source.includes('X')

          ||

          source.includes('TWITTER')
        )
      })

      .sort(

        (
          a,
          b
        ) =>

          new Date(
            b.osint_post_time || 0
          ).getTime()

          -

          new Date(
            a.osint_post_time || 0
          ).getTime()
      )

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

  // =========================
  // EMPTY
  // =========================

  if (!socialFeed.length) {

    return (

      <div className={styles.osintFeedPanel}>

<div

  className={styles.osintFeedHeader}

  style={{
    position: 'relative'
  }}
>

  <button

    onClick={() => {

      const closeButton =

        document.getElementById(
          'close-osint-feed'
        )

      if (
        closeButton
      ) {

        closeButton.click()
      }
    }}

    style={{

      position: 'absolute',

      top: '18px',

      right: '18px',

      width: '38px',

      height: '38px',

      borderRadius: '50%',

      border: 'none',

      background:
        'rgba(255,255,255,0.08)',

      color: 'white',

      cursor: 'pointer',

      fontSize: '18px'
    }}
  >

    ✕

  </button>

          <div>

            <small>
              REALTIME STREAM
            </small>

            <h3>
              LIVE OSINT FEED
            </h3>

          </div>

          <div className={styles.osintFeedCount}>

            0

          </div>

        </div>

        <div className={styles.osintFeedLoading}>

          Belum ada data OSINT masuk...

        </div>

      </div>
    )
  }

  // =========================
  // RENDER
  // =========================

  return (

    <div className={styles.osintFeedPanel}>

      <div className={styles.osintFeedHeader}>

        <div>

          <small>
            REALTIME STREAM
          </small>

          <h3>
            LIVE OSINT FEED
          </h3>

        </div>

        <div className={styles.osintFeedCount}>

          {socialFeed.length}

        </div>

      </div>

      <div className={styles.osintFeedList}>

        {

          socialFeed.map(item => (

            <div
              key={item.osint_id}
              className={styles.osintFeedCard}
            >

              {/* =========================
                  TOP
              ========================= */}

              <div

                className={styles.osintFeedTop}

                style={{

                  display: 'flex',

                  justifyContent: 'space-between',

                  alignItems: 'flex-start',

                  gap: '14px'
                }}
              >

                <div
                  style={{
                    flex: 1,
                    minWidth: 0
                  }}
                >

                  {/* EVENT */}

                  <div

                    className={styles.osintFeedEvent}

                    style={{

                      wordBreak: 'break-word',

                      lineHeight: 1.4,

                      fontWeight: 800,

                      fontSize: '30px'
                    }}
                  >

                    ⚠️ {
                      item.osint_event_type
                    }

                  </div>

                  {/* USER */}

                  <div className={styles.osintFeedUser}>

                    {
                      item.osint_account_name
                      || 'UNKNOWN'
                    }

                    {

                      item.osint_account_username

                      &&

                      ` (@${item.osint_account_username})`
                    }

                  </div>

                </div>

                {/* PRIORITY */}

                <div

                  className={styles.osintPriorityBadge}

                  style={{

                    background:
                      getPriorityColor(
                        item.osint_priority_level
                      ),

                    flexShrink: 0,

                    whiteSpace: 'nowrap'
                  }}
                >

                  {
                    item.osint_priority_level
                    || 'RENDAH'
                  }

                </div>

              </div>

              {/* SOURCE */}

              <div
                style={{
                  marginBottom: '10px',
                  fontSize: '12px',
                  opacity: 0.7
                }}
              >

                Source:
                {' '}
                {
                  item.osint_source
                  || '-'
                }

              </div>

              {/* CONTENT */}

              <div className={styles.osintFeedContent}>

                {
                  item.osint_content
                  || 'Tidak ada konten'
                }

              </div>

              {/* AREA */}

              <div className={styles.osintFeedArea}>

                📍 {
                  item.osint_area_text
                  || '-'
                }

              </div>

              {/* STATS */}

              <div className={styles.osintFeedStats}>

                <span>
                  ❤️ {item.osint_like_count || 0}
                </span>

                <span>
                  🔁 {item.osint_share_count || 0}
                </span>

                <span>
                  💬 {item.osint_reply_count || 0}
                </span>

              </div>

              {/* FOOTER */}

              <div className={styles.osintFeedFooter}>

                <small>

                  {

                    item.osint_post_time

                      ? new Date(
                          item.osint_post_time
                        ).toLocaleString(
                          'id-ID'
                        )

                      : '-'
                  }

                </small>

                {

                  item.osint_link_url && (

                    <a

                      href={
                        item.osint_link_url
                      }

                      target="_blank"

                      rel="noreferrer"

                      className={
                        styles.osintFeedLink
                      }
                    >

                      Buka Source

                    </a>
                  )
                }

              </div>

            </div>
          ))
        }

      </div>

    </div>
  )
}