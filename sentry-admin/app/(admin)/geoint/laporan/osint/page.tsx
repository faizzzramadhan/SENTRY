'use client'

import {
  useEffect,
  useState
} from 'react'

import BaseMap from '../../components/map/BaseMap'

import OsintLayer from '../../components/map/OsintLayer'

import AnalyticsBar from '../../components/map/OsintAnalyticsBar'

import FilterPanel from '../../components/map/FilterPanel'

import MapLegend from '../../components/map/MapLegend'

import DetailPanel from '../../components/map/OsintDetailPanel'

import OsintFeedPanel from '../../components/map/OsintFeedPanel'

import styles from '../../geoint.module.css'

export default function OsintPage() {

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
  // OSINT FEED PANEL
  // =========================

  const [

    showFeed,

    setShowFeed

  ] = useState(true)

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
  // FETCH OSINT DATA
  // =========================

  useEffect(() => {

    fetch(
      'http://localhost:5555/api/geoint/osint'
    )

      .then(res => res.json())

      .then(res => {

        console.log(
          'OSINT PAGE DATA:',
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
          'FETCH OSINT PAGE ERROR:',
          err
        )
      })

  }, [])

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
                Peta Sebaran OSINT
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
                  lastSync || ' -'
                }

              </div>

              {/* FEED BUTTON */}

              <button

                className={styles.filterButton}

                onClick={() =>
                  setShowFeed(
                    !showFeed
                  )
                }
              >

                {
                  showFeed
                    ? 'Tutup Feed'
                    : 'Live Feed'
                }

              </button>

              {/* FILTER BUTTON */}

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

            data={osintData}

          />

        </div>

        {/* =========================
            MAP
        ========================= */}

        <BaseMap>

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
            OSINT FEED
        ========================= */}

        {

          showFeed && (

            <div className={styles.feedDrawer}>

              <OsintFeedPanel

                data={
                  osintData
                }

                onClose={() =>
                  setShowFeed(false)
                }

              />

            </div>
          )
        }

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

            <DetailPanel

              data={
                selectedReport
              }

              onClose={() =>
                setSelectedReport(null)
              }

            />

          )
        }

        {/* =========================
            MAP LEGEND
        ========================= */}

        <MapLegend />

      </div>

    </div>
  )
}