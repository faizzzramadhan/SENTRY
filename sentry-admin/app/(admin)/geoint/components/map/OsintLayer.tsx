'use client'

import {
  useEffect,
  useMemo,
  useState
} from 'react'

import {
  Marker,
  Popup
} from 'react-leaflet'

import MarkerClusterGroup
from 'react-leaflet-cluster'

import L from 'leaflet'

import OsintPopupCard
from './OsintPopupCard'

// =========================
// TYPES
// =========================

type OsintItem = {

  osint_id: number

  osint_source: string

  osint_event_type: string

  osint_area_text: string

  osint_content: string

  osint_latitude: any

  osint_longitude: any

  osint_post_time: string

  osint_event_time: string

  osint_priority_level: string

  osint_verification_status: string

  osint_weather_desc: string

  osint_temperature_c: number

  osint_humidity_percent: number

  osint_wind_speed_kmh: number

  osint_link_url: string

  osint_media_url: string

  osint_account_name: string

  osint_account_username: string
}

type Props = {

  selectedCategory: string

  selectedStatus: string

  displayMode: string

  searchQuery: string

  setLastSync: (
    value: string
  ) => void

  setSelectedReport: (
    value: any
  ) => void
}

// =========================
// ICON FACTORY
// =========================

const createIcon = (
  color: string
) => {

  return new L.Icon({

    iconUrl:
      `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,

    shadowUrl:
      'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',

    iconSize: [25, 41],

    iconAnchor: [12, 41],

    popupAnchor: [1, -34],

    shadowSize: [41, 41],
  })
}

const redIcon =
  createIcon('red')

const yellowIcon =
  createIcon('yellow')

const greenIcon =
  createIcon('green')

// =========================
// COMPONENT
// =========================

export default function OsintLayer({

  selectedCategory,

  selectedStatus,

  displayMode,

  searchQuery,

  setLastSync,

  setSelectedReport

}: Props) {

  const [

    data,

    setData

  ] = useState<OsintItem[]>([])

  const [

    loading,

    setLoading

  ] = useState(true)

  // =========================
  // FETCH DATA
  // =========================

  useEffect(() => {

    fetch(
      'http://localhost:5555/api/geoint/osint'
    )

      .then(res => res.json())

      .then(res => {

        console.log(
          'OSINT DATA:',
          res
        )

        if (
          res.success &&
          Array.isArray(res.data)
        ) {

          setData(res.data)

          // =====================
          // LAST SYNC
          // =====================

          if (
            res.data.length > 0
          ) {

            const latest =
              [...res.data]

                .sort(

                  (
                    a,
                    b
                  ) =>

                    new Date(
                      b.osint_event_time
                    ).getTime()

                    -

                    new Date(
                      a.osint_event_time
                    ).getTime()
                )[0]

            const date =
              new Date(
                latest.osint_event_time
              )

            setLastSync(

              date.toLocaleString(
                'id-ID',
                {

                  day: '2-digit',

                  month: 'long',

                  year: 'numeric',

                  hour: '2-digit',

                  minute: '2-digit'
                }
              )
            )
          }
        }

        else {

          console.warn(
            'DATA OSINT TIDAK VALID'
          )
        }
      })

      .catch(err => {

        console.error(
          'OSINT FETCH ERROR:',
          err
        )
      })

      .finally(() => {

        setLoading(false)
      })

  }, [setLastSync])

  // =========================
  // FILTER DATA
  // =========================

  const filteredData = useMemo(() => {

    let result = [...data]

    // =====================
    // MODE FILTER
    // =====================

    if (
      displayMode === 'latest'
    ) {

      result =
        result

          .sort(

            (
              a,
              b
            ) =>

              new Date(
                b.osint_event_time
              ).getTime()

              -

              new Date(
                a.osint_event_time
              ).getTime()
          )

          .slice(0, 10)
    }

    // =====================
    // SEARCH FILTER
    // =====================

    if (
      searchQuery.trim() !== ''
    ) {

      result =
        result.filter(
          item =>

            item.osint_id
              .toString()

              .includes(
                searchQuery
              )
        )
    }

    // =====================
    // PRIORITAS FILTER
    // =====================

    if (
      selectedCategory !== 'all'
    ) {

      result =
        result.filter(
          item => {

            return (
              item.osint_priority_level
                ?.toUpperCase()

                .includes(

                  selectedCategory
                    .toUpperCase()
                )
            )
          }
        )
    }

    // =====================
    // STATUS FILTER
    // =====================

    if (
      selectedStatus !== 'all'
    ) {

      result =
        result.filter(
          item => {

            return (
              item.osint_verification_status
                ?.toUpperCase()

                .includes(

                  selectedStatus
                    .toUpperCase()
                )
            )
          }
        )
    }

    // =====================
    // VALID MAP DATA ONLY
    // =====================

    const mappedData = result.filter(
      item => {

        const lat =
          parseFloat(
            item.osint_latitude
          )

        const lng =
          parseFloat(
            item.osint_longitude
          )

        return (
          !isNaN(lat)
          &&
          !isNaN(lng)
        )
      }
    )

    console.log(
      'FILTERED MAP DATA:',
      mappedData
    )

    return mappedData

  }, [

    data,

    selectedCategory,

    selectedStatus,

    displayMode,

    searchQuery
  ])

  // =========================
  // PRIORITY ICON
  // =========================

  const getPriorityIcon = (
    prioritas?: string
  ) => {

    const text =
      (prioritas || '')
        .toUpperCase()

    if (
      text.includes('TINGGI')
    ) {

      return redIcon
    }

    if (
      text.includes('SEDANG')
    ) {

      return yellowIcon
    }

    return greenIcon
  }

  // =========================
  // LOADING
  // =========================

  if (loading) {

    return null
  }

  // =========================
  // EMPTY DATA
  // =========================

  if (!filteredData.length) {

    console.warn(
      'DATA MAP OSINT KOSONG'
    )

    return null
  }

  // =========================
  // RENDER
  // =========================

  return (

    <MarkerClusterGroup>

      {filteredData.map((

        item,

        index

      ) => (

        <Marker

          key={
            `${item.osint_id}-${index}`
          }

          position={[

            parseFloat(
              item.osint_latitude
            ),

            parseFloat(
              item.osint_longitude
            )

          ]}

          icon={
            getPriorityIcon(
              item.osint_priority_level
            )
          }
        >

          <Popup>

            <OsintPopupCard

              item={item}

              onDetail={() =>
                setSelectedReport(item)
              }

            />

          </Popup>

        </Marker>

      ))}

    </MarkerClusterGroup>
  )
}