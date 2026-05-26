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

import PopupCard
from './PopupCard'

// =========================
// TYPES
// =========================

type HumintItem = {

  id: number

  source: string

  title: string

  category: string

  kelurahan: string

  kecamatan: string

  latitude: number

  longitude: number

  waktu_kejadian: string

  waktu_laporan: string

  created_at: string

  status_laporan: string

  prioritas: string
}

type Props = {

  selectedCategory: string

  selectedStatus: string

  displayMode: string

  searchQuery: string

  setLastSync: (
    value: string
  ) => void

  //setSelectedReport: (
    //value: any
  //) => void

  onDetailClick?: (
    item: HumintItem
  ) => void

  setAnalyticsData?: (
    data: HumintItem[]
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

export default function HumintLayer({

  selectedCategory,

  selectedStatus,

  displayMode,

  searchQuery,

  setLastSync,

  onDetailClick,

  setAnalyticsData

}: Props) {

  const [

    data,

    setData

  ] = useState<HumintItem[]>([])

  const [

    loading,

    setLoading

  ] = useState(true)

  // =========================
  // FETCH DATA
  // =========================

  useEffect(() => {

    fetch(
      'http://localhost:5555/api/geoint/humint'
    )

      .then(res => res.json())

      .then(res => {

        if (
          res.success &&
          Array.isArray(res.data)
        ) {

          setData(res.data)

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
                      b.created_at
                    ).getTime()

                    -

                    new Date(
                      a.created_at
                    ).getTime()
                )[0]

            const date =
              new Date(
                latest.created_at
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
      })

      .catch(err => {

        console.error(
          'HUMINT FETCH ERROR:',
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
                b.created_at
              ).getTime()

              -

              new Date(
                a.created_at
              ).getTime()
          )

          .slice(0, 10)
    }

    if (
      searchQuery.trim() !== ''
    ) {

      result =
        result.filter(
          item =>

            item.id
              .toString()

              .includes(
                searchQuery
              )
        )
    }

    if (
      selectedCategory !== 'all'
    ) {

      result =
        result.filter(
          item =>

            item.prioritas
              ?.toUpperCase()

              .includes(

                selectedCategory
                  .toUpperCase()
              )
        )
    }

    if (
      selectedStatus !== 'all'
    ) {

      result =
        result.filter(
          item =>

            item.status_laporan
              ?.toUpperCase()

              .includes(

                selectedStatus
                  .toUpperCase()
              )
        )
    }

    return result

  }, [

    data,

    selectedCategory,

    selectedStatus,

    displayMode,

    searchQuery
  ])
  
useEffect(() => {

  setAnalyticsData?.(
    filteredData
  )

}, [filteredData])

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
  // RENDER
  // =========================

  return (

    <MarkerClusterGroup>

      {

        filteredData.map((

          item,

          index

        ) => (

          <Marker

            key={
              `${item.id}-${index}`
            }

            position={[
              item.latitude,
              item.longitude
            ]}

            icon={
              getPriorityIcon(
                item.prioritas
              )
            }
          >

            <Popup
              closeButton={false}
            >

              <PopupCard

                item={item}

                onDetail={() => {

                  if (
                    onDetailClick
                  ) {

                    onDetailClick(item)
                  }
                }}

              />

            </Popup>

          </Marker>
        ))
      }

    </MarkerClusterGroup>
  )
}