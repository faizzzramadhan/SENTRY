'use client'

import styles
from '../../geoint.module.css'

type Props = {

  data: any

  onClose: () => void
}

export default function DetailPanel({

  data,

  onClose

}: Props) {

  const getPriorityColor = (
    prioritas: string
  ) => {

    if (
      prioritas?.includes('TINGGI')
    ) {
      return '#ef4444'
    }

    if (
      prioritas?.includes('SEDANG')
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
              DETAIL LAPORAN
            </small>

            <h2>
              {data.title}
            </h2>

          </div>

          <button
            className={styles.closeDetail}
            onClick={onClose}
          >
            ✕
          </button>

        </div>

        {/* =========================
            PRIORITAS
        ========================= */}

        <div
          style={{
            marginBottom: '18px'
          }}
        >

          <span
            style={{

              background:
                getPriorityColor(
                  data.prioritas
                ),

              padding:
                '8px 16px',

              borderRadius:
                '999px',

              color: 'white',

              fontWeight: 700,

              fontSize: '13px'
            }}
          >

            {data.prioritas}

          </span>

        </div>

        {/* =========================
            GRID
        ========================= */}

        <div className={styles.detailGrid}>

          <div className={styles.detailItem}>

            <span>
              ID Laporan
            </span>

            <strong>
              #{data.id}
            </strong>

          </div>

          <div className={styles.detailItem}>

            <span>
              Jenis Bencana
            </span>

            <strong>
              {data.category}
            </strong>

          </div>

          <div className={styles.detailItem}>

            <span>
              Nama Pelapor
            </span>

            <strong>
              {data.nama_pelapor || '-'}
            </strong>

          </div>

          <div className={styles.detailItem}>

            <span>
              No HP
            </span>

            <strong>
              {data.no_hp || '-'}
            </strong>

          </div>

          <div className={styles.detailItem}>

            <span>
              Kecamatan
            </span>

            <strong>
              {data.kecamatan}
            </strong>

          </div>

          <div className={styles.detailItem}>

            <span>
              Kelurahan
            </span>

            <strong>
              {data.kelurahan}
            </strong>

          </div>

          <div className={styles.detailItem}>

            <span>
              Jenis Lokasi
            </span>

            <strong>
              {data.jenis_lokasi || '-'}
            </strong>

          </div>

          <div className={styles.detailItem}>

            <span>
              Status
            </span>

            <strong>
              {data.status_laporan}
            </strong>

          </div>

          <div className={styles.detailItem}>

            <span>
              Waktu Kejadian
            </span>

            <strong>

              {
                new Date(
                  data.waktu_kejadian
                ).toLocaleString(
                  'id-ID'
                )
              }

            </strong>

          </div>

          <div className={styles.detailItem}>

            <span>
              Latitude
            </span>

            <strong>
              {data.latitude}
            </strong>

          </div>

          <div className={styles.detailItem}>

            <span>
              Longitude
            </span>

            <strong>
              {data.longitude}
            </strong>

          </div>

        </div>

        {/* =========================
            ALAMAT
        ========================= */}

        <div className={styles.kronologiBox}>

          <h4>
            Alamat Lengkap
          </h4>

          <p>
            {
              data.alamat_lengkap
              || '-'
            }
          </p>

        </div>

        {/* =========================
            KRONOLOGI
        ========================= */}

        <div className={styles.kronologiBox}>

          <h4>
            Kronologi Kejadian
          </h4>

          <p>
            {
              data.kronologi
              || '-'
            }
          </p>

        </div>

        {/* =========================
            FOTO
        ========================= */}

        <div className={styles.photoGrid}>

          {/* FOTO KEJADIAN */}

          {
            data.foto_kejadian && (

              <div className={styles.photoCard}>

                <span>
                  Foto Kejadian
                </span>

                <img

                  src={
                    `http://localhost:5555/uploads/${data.foto_kejadian}`
                  }

                  alt="foto-kejadian"
                />

              </div>
            )
          }

          {/* FOTO KERUSAKAN */}

          {
            data.foto_kerusakan && (

              <div className={styles.photoCard}>

                <span>
                  Foto Kerusakan
                </span>

                <img

                  src={
                    `http://localhost:5555/uploads/${data.foto_kerusakan}`
                  }

                  alt="foto-kerusakan"
                />

              </div>
            )
          }

        </div>

      </div>

    </div>
  )
}