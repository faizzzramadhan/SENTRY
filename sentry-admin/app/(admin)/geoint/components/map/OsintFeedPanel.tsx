'use client'

import styles from '../../geoint.module.css'

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

  onClose: () => void
}

// =========================
// COMPONENT
// =========================

export default function OsintFeedPanel({
  data,
  onClose
}: Props) {
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

        return (
          source === 'X' ||
          source.includes('TWITTER') ||
          source.includes('X ')
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
  // FORMAT TEXT
  // =========================

  const formatEventType = (
    value: string
  ) => {
    if (!value) {
      return 'UNKNOWN EVENT'
    }

    return value
      .replaceAll('_', ' ')
      .trim()
  }

  const formatPriority = (
    value: string
  ) => {
    if (!value) {
      return 'RENDAH'
    }

    return value
      .replace('PRIORITAS ', '')
      .trim()
  }

  const formatDate = (
    value: string
  ) => {
    if (!value) {
      return '-'
    }

    const date =
      new Date(value)

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '-'
    }

    return date.toLocaleString(
      'id-ID'
    )
  }

  // =========================
  // HEADER
  // =========================

  const renderHeader = (
    count: number
  ) => (
    <div className={styles.osintFeedHeader}>
      <div className={styles.osintFeedHeaderText}>
        <small>
          REALTIME STREAM
        </small>

        <h3>
          LIVE OSINT FEED
        </h3>
      </div>

      <div className={styles.osintFeedHeaderRight}>
        <div className={styles.osintFeedCount}>
          {count}
        </div>

        <button
          type="button"
          className={styles.osintFeedClose}
          onClick={onClose}
          aria-label="Tutup Live OSINT Feed"
        >
          ✕
        </button>
      </div>
    </div>
  )

  // =========================
  // EMPTY
  // =========================

  if (!socialFeed.length) {
    return (
      <div className={styles.osintFeedPanel}>
        {renderHeader(0)}

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
      {renderHeader(socialFeed.length)}

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

              <div className={styles.osintFeedTop}>
                <div className={styles.osintFeedMain}>
                  {/* EVENT */}

                  <div className={styles.osintFeedEvent}>
                    ⚠️ {formatEventType(
                      item.osint_event_type
                    )}
                  </div>

                  {/* USER */}

                  <div className={styles.osintFeedUser}>
                    {
                      item.osint_account_name
                      || 'UNKNOWN'
                    }

                    {
                      item.osint_account_username
                        ? ` (@${item.osint_account_username})`
                        : ''
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
                      )
                  }}
                >
                  {
                    formatPriority(
                      item.osint_priority_level
                    )
                  }
                </div>
              </div>

              {/* SOURCE */}

              <div className={styles.osintFeedSource}>
                Source:{' '}
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
                    formatDate(
                      item.osint_post_time
                    )
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