'use client'

import styles
from '../../geoint.module.css'

// =========================
// TYPES
// =========================

type Props = {

  selectedCategory: string

  setSelectedCategory:
    (value: string) => void

  selectedStatus: string

  setSelectedStatus:
    (value: string) => void

  displayMode: string

  setDisplayMode:
    (value: string) => void

  searchQuery: string

  setSearchQuery:
    (value: string) => void

  onApply: () => void

  onClose: () => void
}

// =========================
// COMPONENT
// =========================

export default function FilterPanel({

  selectedCategory,

  setSelectedCategory,

  selectedStatus,

  setSelectedStatus,

  displayMode,

  setDisplayMode,

  searchQuery,

  setSearchQuery,

  onApply,

  onClose

}: Props) {

  // =========================
  // RESET FILTER
  // =========================

  const handleReset = () => {

    setSelectedCategory('all')

    setSelectedStatus('all')

    setDisplayMode('all')

    setSearchQuery('')
  }

  // =========================
  // RENDER
  // =========================

  return (

    <div className={styles.sidebar}>

      {/* CLOSE BUTTON */}

      <button

        className={styles.closeButton}

        onClick={onClose}
      >
        ✕
      </button>

      {/* TITLE */}

      <h3>
        Filter Laporan
      </h3>

      {/* =========================
          TAMPILKAN DATA
      ========================= */}

      <div className={styles.filterGroup}>

        <span>
          Tampilkan Data
        </span>

        <select

          value={displayMode}

          onChange={(e) =>
            setDisplayMode(
              e.target.value
            )
          }
        >

          <option value="latest">
            Laporan Terbaru
          </option>

          <option value="all">
            Semua Laporan
          </option>

        </select>

      </div>

      {/* =========================
          SEARCH
      ========================= */}

      <div className={styles.filterGroup}>

        <span>
          Cari Laporan
        </span>

        <input

          type="text"

          value={searchQuery}

          onChange={(e) =>
            setSearchQuery(
              e.target.value
            )
          }

          placeholder="
ID laporan...
          "

          className={
            styles.searchInput
          }
        />

      </div>

      {/* =========================
          PRIORITAS
      ========================= */}

      <div className={styles.filterGroup}>

        <span>
          Prioritas Laporan
        </span>

        <select

          value={selectedCategory}

          onChange={(e) =>
            setSelectedCategory(
              e.target.value
            )
          }
        >

          <option value="all">
            Semua Prioritas
          </option>

          <option value="TINGGI">
            Prioritas Tinggi
          </option>

          <option value="SEDANG">
            Prioritas Sedang
          </option>

          <option value="RENDAH">
            Prioritas Rendah
          </option>

        </select>

      </div>

      {/* =========================
          STATUS
      ========================= */}

      <div className={styles.filterGroup}>

        <span>
          Status Laporan
        </span>

        <select

          value={selectedStatus}

          onChange={(e) =>
            setSelectedStatus(
              e.target.value
            )
          }
        >

          <option value="all">
            Semua Status
          </option>

          <option value="IDENTIFIKASI">
            Identifikasi
          </option>

          <option value="TERVERIFIKASI">
            Terverifikasi
          </option>

          <option value="DITANGANI">
            Ditangani
          </option>

          <option value="SELESAI">
            Selesai
          </option>

          <option value="FIKTIF">
            Fiktif
          </option>

        </select>

      </div>

      {/* =========================
          FOOTER BUTTON
      ========================= */}

      <div className={styles.filterFooter}>

        <button

          className={styles.applyButton}

          onClick={onApply}
        >

          Terapkan Filter

        </button>

        <button

          className={styles.resetButton}

          onClick={handleReset}
        >

          Reset

        </button>

      </div>

    </div>
  )
}