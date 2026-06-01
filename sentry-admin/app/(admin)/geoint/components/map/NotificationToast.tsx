'use client'

import {
  useEffect,
  useState
}

from 'react'

import styles
from '../../geoint.module.css'

// =========================
// TYPES
// =========================

type AlertItem = {

  nama_bencana: string

  nama_kecamatan: string

  prioritas: string
}

// =========================
// COMPONENT
// =========================

export default function NotificationToast() {

  const [
    alertData,
    setAlertData
  ] = useState<AlertItem | null>(
    null
  )

  // =========================
  // FETCH
  // =========================

  useEffect(() => {

    fetch(
      'http://localhost:5555/api/geoint/humint'
    )

      .then(res => res.json())

      .then(res => {

        const data =
          res.data || []

        // AMBIL PRIORITAS TINGGI
        const highPriority =

          data.find(
            (item: any) =>

              item.prioritas
                ?.toUpperCase()
                .includes('TINGGI')
          )

        if (highPriority) {

          setAlertData({
            nama_bencana:
              highPriority.nama_bencana,

            nama_kecamatan:
              highPriority.nama_kecamatan,

            prioritas:
              highPriority.prioritas
          })
        }
      })

      .catch(err => {

        console.error(
          'NOTIFICATION ERROR:',
          err
        )
      })

  }, [])

  // =========================
  // EMPTY
  // =========================

  if (!alertData) {

    return null
  }

  // =========================
  // RENDER
  // =========================

  return (

    <div className={styles.alert}>

      <strong>

        ⚠️ PRIORITAS TINGGI

      </strong>

      <small>

        {alertData.nama_bencana}

        di wilayah

        {alertData.nama_kecamatan}

      </small>

    </div>
  )
}