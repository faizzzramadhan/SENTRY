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

  onClose: () => void
}

// =========================
// COMPONENT
// =========================

export default function OsintFeedPanel({

  data,

  onClose

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
  // PRIORITY LABEL
  // =========================

  const getPriorityLabel = (
    priority: string
  ) => {

    const text =
      (priority || '')
        .toUpperCase()

    if (
      text.includes('TINGGI')
    ) {

      return 'TINGGI'
    }

    if (
      text.includes('SEDANG')
    ) {

      return 'SEDANG'
    }

    return 'RENDAH'
  }

  // =========================
  // FORMAT DATE
  // =========================

  const formatDate = (
    value: string
  ) => {

    if (!value) {

      return '-'
    }

    return new Date(
      value
    ).toLocaleString(
      'id-ID'
    )
  }

  // =========================
  // PANEL STYLE
  // =========================

  const panelStyle = {

    position: 'relative' as const,

    height: '100%',

    maxHeight: 'calc(100vh - 40px)',

    overflow: 'hidden',

    display: 'flex',

    flexDirection: 'column' as const
  }

  // =========================
  // HEADER
  // =========================

  const renderHeader = () => (

    <div

      className={styles.osintFeedHeader}

      style={{

        position: 'relative',

        paddingRight: '54px'
      }}
    >

      <button

        onClick={
          onClose
        }

        title='Tutup feed'

        style={{

          position: 'absolute',

          top: '0',

          right: '0',

          width: '38px',

          height: '38px',

          borderRadius: '50%',

          border:
            '1px solid rgba(255,255,255,0.12)',

          background:
            'rgba(255,255,255,0.08)',

          color:
            'white',

          cursor:
            'pointer',

          fontSize:
            '18px',

          fontWeight:
            800,

          display:
            'flex',

          alignItems:
            'center',

          justifyContent:
            'center'
        }}
      >

        ×

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

        {socialFeed.length}

      </div>

    </div>
  )

  // =========================
  // EMPTY
  // =========================

  if (!socialFeed.length) {

    return (

      <div

        className={styles.osintFeedPanel}

        style={panelStyle}
      >

        {renderHeader()}

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

    <div

      className={styles.osintFeedPanel}

      style={panelStyle}
    >

      {renderHeader()}

      <div

        className={styles.osintFeedList}

        style={{

          overflowY: 'auto',

          paddingRight: '4px'
        }}
      >

        {

          socialFeed.map(item => (

            <div

              key={item.osint_id}

              className={styles.osintFeedCard}

              style={{

                padding: '22px',

                borderRadius: '20px',

                marginBottom: '18px'
              }}
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

                  gap: '14px',

                  marginBottom: '14px'
                }}
              >

                <div
                  style={{
                    flex: 1,
                    minWidth: 0
                  }}
                >

                  <div

                    style={{

                      display: 'flex',

                      alignItems: 'center',

                      gap: '10px',

                      marginBottom: '12px'
                    }}
                  >

                    <span
                      style={{
                        fontSize: '26px'
                      }}
                    >
                      ⚠️
                    </span>

                    <div

                      className={styles.osintFeedUser}

                      style={{

                        fontSize: '13px',

                        color: '#9ca3af',

                        lineHeight: 1.4
                      }}
                    >

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

                  {/* EVENT */}

                  <div

                    className={styles.osintFeedEvent}

                    style={{

                      wordBreak: 'break-word',

                      lineHeight: 1.25,

                      fontWeight: 900,

                      fontSize: '24px',

                      letterSpacing: '1px',

                      textTransform: 'uppercase'
                    }}
                  >

                    {
                      item.osint_event_type
                      || 'OSINT EVENT'
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

                    whiteSpace: 'nowrap',

                    fontSize: '12px',

                    padding: '9px 18px',

                    borderRadius: '999px',

                    fontWeight: 800
                  }}
                >

                  {
                    getPriorityLabel(
                      item.osint_priority_level
                    )
                  }

                </div>

              </div>

              {/* SOURCE */}

              <div

                style={{

                  marginBottom: '12px',

                  fontSize: '13px',

                  color: '#94a3b8'
                }}
              >

                Source:
                {' '}
                <strong>
                  {
                    item.osint_source
                    || '-'
                  }
                </strong>

              </div>

              {/* CONTENT */}

              <div

                className={styles.osintFeedContent}

                style={{

                  fontSize: '15px',

                  lineHeight: 1.8,

                  color: '#e5e7eb',

                  marginBottom: '14px'
                }}
              >

                {
                  item.osint_content
                  || 'Tidak ada konten'
                }

              </div>

              {/* AREA */}

              <div

                className={styles.osintFeedArea}

                style={{

                  fontSize: '14px',

                  color: '#cbd5e1',

                  marginBottom: '14px'
                }}
              >

                📍 {
                  item.osint_area_text
                  || '-'
                }

              </div>

              {/* STATS */}

              <div

                className={styles.osintFeedStats}

                style={{

                  display: 'flex',

                  gap: '14px',

                  flexWrap: 'wrap',

                  marginBottom: '14px',

                  color: '#cbd5e1'
                }}
              >

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

              <div

                className={styles.osintFeedFooter}

                style={{

                  display: 'flex',

                  justifyContent: 'space-between',

                  alignItems: 'center',

                  gap: '12px',

                  borderTop:
                    '1px solid rgba(255,255,255,0.08)',

                  paddingTop: '12px'
                }}
              >

                <small

                  style={{

                    color: '#94a3b8'
                  }}
                >

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

                      style={{

                        fontWeight: 800
                      }}
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