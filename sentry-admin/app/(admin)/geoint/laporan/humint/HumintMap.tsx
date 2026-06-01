'use client'

import {
  useState
} from 'react'

import BaseMap from '../../components/map/BaseMap'

import HumintLayer from '../../components/map/HumintLayer'

import AnalyticsBar from '../../components/map/HumintAnalyticsBar'

import FilterPanel from '../../components/map/FilterPanel'

import MapLegend from '../../components/map/MapLegend'

import DetailPanel from '../../components/map/DetailPanel'

import styles from '../../geoint.module.css'

export default function HumintMap() {

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

  
  const [
    analyticsData,
    setAnalyticsData
  ] = useState<any[]>([])

  // =========================
  // DISPLAY MODE
  // =========================

  const [
    displayMode,
    setDisplayMode
  ] = useState('all')

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
                Peta Sebaran Laporan
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
                    : ' Semua Laporan'
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


          {/* ANALYTICS */}

          <AnalyticsBar 
          data={analyticsData}/>

        </div>

        {/* =========================
            MAP
        ========================= */}

        <BaseMap>

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
              setAnalyticsData
            }

             onDetailClick={(
                item: any
            ) => {

              setSelectedReport(item)
           }}

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
            LEGEND
        ========================= */}

        <MapLegend />

      </div>

    </div>
  )
}