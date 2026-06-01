'use client'

import {
  useEffect,
  useState
} from 'react'

import BaseMap
from '../../components/map/BaseMap'

import HumintLayer
from '../../components/map/HumintLayer'

import OsintLayer
from '../../components/map/OsintLayer'

import AnalyticsBar
from '../../components/map/HumintAnalyticsBar'

import FilterPanel
from '../../components/map/FilterPanel'

import MapLegend
from '../../components/map/MapLegend'

import DetailPanel
from '../../components/map/DetailPanel'

import OsintDetailPanel
from '../../components/map/OsintDetailPanel'

import styles
from '../../geoint.module.css'

export default function FusionPage() {

  // =========================
  // HUMINT ANALYTICS
  // =========================

  const [

    humintAnalytics,

    setHumintAnalytics

  ] = useState<any[]>([])

  // =========================
  // OSINT DATA
  // =========================

  const [

    osintData,

    setOsintData

  ] = useState<any[]>([])

  // =========================
  // FILTER STATE
  // =========================

  const [

    selectedCategory,

    setSelectedCategory

  ] = useState('all')

  const [

    selectedStatus,

    setSelectedStatus

  ] = useState('all')

  const [

    searchQuery,

    setSearchQuery

  ] = useState('')

  // =========================
  // APPLIED FILTER
  // =========================

  const [

    appliedCategory,

    setAppliedCategory

  ] = useState('all')

  const [

    appliedStatus,

    setAppliedStatus

  ] = useState('all')

  const [

    appliedSearch,

    setAppliedSearch

  ] = useState('')

  // =========================
  // DETAIL PANEL
  // =========================

  const [

    selectedReport,

    setSelectedReport

  ] = useState<any>(null)

  // =========================
  // FILTER PANEL
  // =========================

  const [

    showFilter,

    setShowFilter

  ] = useState(false)

  // =========================
  // LAST SYNC
  // =========================

  const [

    lastSync,

    setLastSync

  ] = useState('')

  // =========================
  // DISPLAY MODE
  // =========================

  const [

    displayMode,

    setDisplayMode

  ] = useState('all')

  // =========================
  // FETCH OSINT
  // =========================

  useEffect(() => {

    fetch(
      'http://localhost:5555/api/geoint/osint'
    )

      .then(res => res.json())

      .then(res => {

        console.log(
          'FUSION OSINT:',
          res
        )

        if (
          res.success &&
          Array.isArray(res.data)
        ) {

          setOsintData(res.data)
        }
      })

      .catch(err => {

        console.error(
          'FUSION FETCH ERROR:',
          err
        )
      })

  }, [])

  // =========================
  // COMBINE ANALYTICS
  // =========================

  const fusionAnalytics = [

    ...humintAnalytics,

    ...osintData

  ]

  // =========================
  // APPLY FILTER
  // =========================

  const handleApplyFilter = () => {

    setAppliedCategory(
      selectedCategory
    )

    setAppliedStatus(
      selectedStatus
    )

    setAppliedSearch(
      searchQuery
    )

    setShowFilter(false)
  }

  // =========================
  // CHECK DATA TYPE
  // =========================

  const isOsintData = (
    data: any
  ) => {

    return (

      data?.osint_id

      ||

      data?.osint_source

      ||

      data?.osint_event_type
    )
  }

  // =========================
  // RENDER
  // =========================

  return (

    <div className={styles.wrapper}>

      <div className={styles.mainContent}>

        {/* =========================
            TOPBAR
        ========================= */}

        <div className={styles.topBar}>

          <div className={styles.headerContainer}>

            {/* TITLE */}

            <div className={styles.headerTitle}>

              <small>
                MONITORING SPASIAL
              </small>

              <h1>
                Peta Fusion HUMINT & OSINT
              </h1>

            </div>

            {/* ACTION BAR */}

            <div className={styles.actionBar}>

              {/* MODE */}

              <div className={styles.modeBadge}>

                Mode:

                {

                  displayMode === 'latest'

                    ? ' Data Terbaru'

                    : ' Semua Data'
                }

              </div>

              {/* SYNC */}

              <div className={styles.syncBadge}>

                Sinkron:

                {

                  lastSync || '-'
                }

              </div>

              {/* FILTER */}

              <button

                className={styles.filterButton}

                onClick={() =>

                  setShowFilter(
                    !showFilter
                  )
                }
              >

                {

                  showFilter

                    ? 'Tutup Filter'

                    : 'Filter'
                }

              </button>

              {/* REFRESH */}

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

          {/* =========================
              ANALYTICS
          ========================= */}

          <AnalyticsBar

            data={fusionAnalytics}

          />

        </div>

        {/* =========================
            MAP
        ========================= */}

        <BaseMap>

          {/* =========================
              HUMINT
          ========================= */}

          <HumintLayer

            selectedCategory={
              appliedCategory
            }

            selectedStatus={
              appliedStatus
            }

            displayMode={
              displayMode
            }

            searchQuery={
              appliedSearch
            }

            setLastSync={
              setLastSync
            }

            setAnalyticsData={
              setHumintAnalytics
            }

            onDetailClick={(
              item: any
            ) => {

              setSelectedReport(item)
            }}

          />

          {/* =========================
              OSINT
          ========================= */}

          <OsintLayer

            selectedCategory={
              appliedCategory
            }

            selectedStatus={
              appliedStatus
            }

            displayMode={
              displayMode
            }

            searchQuery={
              appliedSearch
            }

            setLastSync={
              setLastSync
            }

            setSelectedReport={
              setSelectedReport
            }

          />

        </BaseMap>

        {/* =========================
            FILTER PANEL
        ========================= */}

        {

          showFilter && (

            <FilterPanel

              selectedCategory={
                selectedCategory
              }

              setSelectedCategory={
                setSelectedCategory
              }

              selectedStatus={
                selectedStatus
              }

              setSelectedStatus={
                setSelectedStatus
              }

              displayMode={
                displayMode
              }

              setDisplayMode={
                setDisplayMode
              }

              searchQuery={
                searchQuery
              }

              setSearchQuery={
                setSearchQuery
              }

              onApply={
                handleApplyFilter
              }

              onClose={() =>
                setShowFilter(false)
              }

            />

          )
        }

        {/* =========================
            DETAIL PANEL
        ========================= */}

        {

          selectedReport && (

            isOsintData(
              selectedReport
            )

              ? (

                <OsintDetailPanel

                  data={
                    selectedReport
                  }

                  onClose={() =>
                    setSelectedReport(null)
                  }

                />

              )

              : (

                <DetailPanel

                  data={
                    selectedReport
                  }

                  onClose={() =>
                    setSelectedReport(null)
                  }

                />

              )

          )
        }

        {/* =========================
            LEGEND
        ========================= */}

        <MapLegend />

      </div>

    </div>
  )
}