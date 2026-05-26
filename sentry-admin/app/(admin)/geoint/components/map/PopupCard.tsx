'use client'

// =========================
// TYPES
// =========================

type HumintItem = {

  id: number

  title: string

  kecamatan: string

  kelurahan: string

  status_laporan: string

  prioritas: string

  waktu_kejadian: string
}

type Props = {

  item: HumintItem

  onDetail: () => void
}

// =========================
// COMPONENT
// =========================

export default function PopupCard({

  item,

  onDetail

}: Props) {

  // =========================
  // PRIORITAS COLOR
  // =========================

  const getPriorityColor = (
    prioritas: string
  ) => {

    const text =
      prioritas
        ?.toUpperCase?.() || ''

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
  // RENDER
  // =========================

  return (

    <div
      style={{

        width: '320px',

        background:
          'linear-gradient(180deg, #071226 0%, #08152d 100%)',

        borderRadius: '26px',

        padding: '22px',

        color: '#e2e8f0',

        fontFamily: 'sans-serif',

        position: 'relative',

        boxShadow:
          '0 10px 30px rgba(0,0,0,0.45)'
      }}
    >

      {/* =========================
          PRIORITAS BADGE
      ========================= */}

      <div
        style={{

          display: 'flex',

          justifyContent: 'flex-end',

          paddingRight: '16px',

          marginBottom: '26px'
        }}
      >

        <div
          style={{

            background:
              getPriorityColor(
                item.prioritas
              ),

            color: 'white',

            padding: '10px 18px',

            borderRadius: '999px',

            fontSize: '13px',

            fontWeight: 700,

            letterSpacing: '0.3px',

            boxShadow:
              '0 4px 14px rgba(0,0,0,0.25)'
          }}
        >

          {
            item.prioritas
            || 'PRIORITAS RENDAH'
          }

        </div>

      </div>

      {/* =========================
          CONTENT
      ========================= */}

      <div
        style={{

          display: 'flex',

          flexDirection: 'column',

          gap: '24px',

          fontSize: '16px',

          lineHeight: 1.5
        }}
      >

        <div>

          <strong
            style={{
              color: 'white'
            }}
          >
            Jenis:
          </strong>

          {' '}

          {
            item.title
            || 'Tidak diketahui'
          }

        </div>

        <div>

          <strong
            style={{
              color: 'white'
            }}
          >
            Kecamatan:
          </strong>

          {' '}

          {
            item.kecamatan
            || '-'
          }

        </div>

        <div>

          <strong
            style={{
              color: 'white'
            }}
          >
            Kelurahan:
          </strong>

          {' '}

          {
            item.kelurahan
            || '-'
          }

        </div>

        <div>

          <strong
            style={{
              color: 'white'
            }}
          >
            Status:
          </strong>

          {' '}

          {
            item.status_laporan
            || '-'
          }

        </div>

        <div>

          <strong
            style={{
              color: 'white'
            }}
          >
            Waktu:
          </strong>

          {' '}

          {

            item.waktu_kejadian

              ? new Date(
                  item.waktu_kejadian
                ).toLocaleString(
                  'id-ID'
                )

              : '-'
          }

        </div>

      </div>

      {/* =========================
          BUTTON
      ========================= */}

      <div
        style={{
          marginTop: '30px'
        }}
      >

        <button

          onClick={onDetail}

          style={{

            width: '100%',

            height: '54px',

            border: 'none',

            borderRadius: '18px',

            background:
              'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',

            color: 'white',

            fontWeight: 700,

            fontSize: '17px',

            cursor: 'pointer',

            transition: '0.2s ease',

            boxShadow:
              '0 8px 20px rgba(37,99,235,0.35)'
          }}
        >

          Detail Laporan

        </button>

      </div>

    </div>
  )
}