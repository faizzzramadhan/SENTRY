'use client'

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react'

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle
} from 'react-leaflet'

import 'leaflet/dist/leaflet.css'

import L from 'leaflet'

import styles from './DisasterMap.module.css'

// ======================
// FIX LEAFLET ICON
// ======================

delete (L.Icon.Default.prototype as any)._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',

  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',

  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
})

// ======================
// TYPES
// ======================

type ReportItem = {
  laporan_id?: number | string
  id_laporan?: number | string
  id?: number | string

  latitude: number | string
  longitude: number | string

  jenis_bencana?: string
  nama_bencana?: string

  status_laporan?: string
  prioritas?: string

  created_at?: string

  kelurahan?: string
  kecamatan?: string
  nama_kelurahan?: string
  nama_kecamatan?: string
}

type FilterMode = 'SEMUA' | 'TERBARU'

type FilterState = {
  mode: FilterMode
  search: string
  prioritas: string
  status: string
}

type MarkerColor = 'red' | 'orange' | 'green'

// ======================
// CONSTANT
// ======================

const API_URL =
  'http://localhost:5555/api/geoint/humint-map'

const initialFilter: FilterState = {
  mode: 'SEMUA',
  search: '',
  prioritas: 'SEMUA',
  status: 'SEMUA'
}

// ======================
// HELPER
// ======================

function normalize(value?: string) {
  return String(value || '')
    .trim()
    .toUpperCase()
}

function getReportId(item: ReportItem) {
  const reportId =
    item.laporan_id ??
    item.id_laporan ??
    item.id

  if (
    reportId === undefined ||
    reportId === null ||
    reportId === ''
  ) {
    return '-'
  }

  return String(reportId)
}

function getReportTitle(item: ReportItem) {
  return (
    item.jenis_bencana ||
    item.nama_bencana ||
    'Laporan Bencana'
  )
}

function getLocation(item: ReportItem) {
  const kelurahan =
    item.kelurahan ||
    item.nama_kelurahan ||
    ''

  const kecamatan =
    item.kecamatan ||
    item.nama_kecamatan ||
    ''

  if (kelurahan && kecamatan) {
    return `${kelurahan}, ${kecamatan}`
  }

  return kelurahan || kecamatan || '-'
}

function formatDate(value?: string) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

function getMarkerColor(
  prioritas?: string
): MarkerColor {
  const level = normalize(prioritas)

  if (level.includes('TINGGI')) {
    return 'red'
  }

  if (level.includes('SEDANG')) {
    return 'orange'
  }

  return 'green'
}

function createIcon(color: MarkerColor) {
  return new L.Icon({
    iconUrl:
      `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,

    shadowUrl:
      'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',

    iconSize: [25, 41],

    iconAnchor: [12, 41],

    popupAnchor: [1, -34],

    shadowSize: [41, 41]
  })
}

const markerIcons: Record<MarkerColor, L.Icon> = {
  red: createIcon('red'),
  orange: createIcon('orange'),
  green: createIcon('green')
}

// ======================
// COMPONENT
// ======================

export default function DisasterMap() {
  const [reports, setReports] =
    useState<ReportItem[]>([])

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState('')

  const [showFilter, setShowFilter] =
    useState(false)

  const [lastSync, setLastSync] =
    useState<Date | null>(null)

  const [draftFilter, setDraftFilter] =
    useState<FilterState>(initialFilter)

  const [activeFilter, setActiveFilter] =
    useState<FilterState>(initialFilter)

  // ======================
  // FETCH DATA
  // ======================

  const loadReports = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(API_URL, {
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error(
          `Gagal memuat data. Status ${response.status}`
        )
      }

      const result = await response.json()

      if (Array.isArray(result.data)) {
        setReports(result.data)
      } else if (Array.isArray(result)) {
        setReports(result)
      } else {
        setReports([])
      }

      setLastSync(new Date())
    } catch (err) {
      console.error('MAP ERROR:', err)

      setError(
        'Data laporan gagal dimuat. Pastikan backend berjalan di localhost:5555.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  // ======================
  // FILTER DATA
  // ======================

  const filteredReports = useMemo(() => {
    let result = reports.filter((item) => {
      const id =
        normalize(getReportId(item))

      const title =
        normalize(getReportTitle(item))

      const location =
        normalize(getLocation(item))

      const priority =
        normalize(item.prioritas)

      const status =
        normalize(item.status_laporan)

      const search =
        normalize(activeFilter.search)

      const searchTarget =
        `${id} ${title} ${location}`

      if (
        search &&
        !searchTarget.includes(search)
      ) {
        return false
      }

      if (
        activeFilter.prioritas !== 'SEMUA' &&
        !priority.includes(activeFilter.prioritas)
      ) {
        return false
      }

      if (
        activeFilter.status !== 'SEMUA' &&
        !status.includes(activeFilter.status)
      ) {
        return false
      }

      return true
    })

    result = [...result].sort((a, b) => {
      const dateA =
        new Date(a.created_at || 0).getTime()

      const dateB =
        new Date(b.created_at || 0).getTime()

      return dateB - dateA
    })

    if (activeFilter.mode === 'TERBARU') {
      result = result.slice(0, 10)
    }

    return result
  }, [reports, activeFilter])

  // ======================
  // SUMMARY
  // ======================

  const summary = useMemo(() => {
    const countPriority = (value: string) =>
      filteredReports.filter((item) =>
        normalize(item.prioritas).includes(value)
      ).length

    return {
      total: filteredReports.length,
      tinggi: countPriority('TINGGI'),
      sedang: countPriority('SEDANG'),
      rendah: countPriority('RENDAH')
    }
  }, [filteredReports])

  // ======================
  // ACTIONS
  // ======================

  function applyFilter() {
    setActiveFilter(draftFilter)
    setShowFilter(false)
  }

  function resetFilter() {
    setDraftFilter(initialFilter)
    setActiveFilter(initialFilter)
    setShowFilter(false)
  }

  // ======================
  // RENDER
  // ======================

  return (
    <div className={styles.wrapper}>
      <section className={styles.infoBar}>
        <div className={styles.infoHeader}>
          <div>
            <span className={styles.label}>
              INFORMASI LAPORAN
            </span>

            <h2>
              Peta Sebaran Laporan
            </h2>

            <p>
              Menampilkan persebaran laporan
              bencana berdasarkan lokasi,
              status, dan prioritas.
            </p>
          </div>

          <div className={styles.actions}>
            <div className={styles.modeBadge}>
              <span>Mode</span>

              <strong>
                {activeFilter.mode === 'TERBARU'
                  ? '10 Laporan Terbaru'
                  : 'Semua Laporan'}
              </strong>
            </div>

            <div className={styles.modeBadge}>
              <span>Sinkron</span>

              <strong>
                {lastSync
                  ? lastSync.toLocaleTimeString(
                      'id-ID',
                      {
                        hour: '2-digit',
                        minute: '2-digit'
                      }
                    )
                  : '-'}
              </strong>
            </div>

            <button
              type="button"
              className={styles.filterButton}
              onClick={() =>
                setShowFilter((prev) => !prev)
              }
            >
              {showFilter ? 'Tutup Filter' : 'Filter'}
            </button>

            <button
              type="button"
              className={styles.refreshButton}
              onClick={loadReports}
              disabled={loading}
            >
              {loading ? 'Memuat...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span>Total Laporan</span>
            <strong>{summary.total}</strong>
          </div>

          <div className={styles.summaryCard}>
            <span>Prioritas Tinggi</span>
            <strong>{summary.tinggi}</strong>
          </div>

          <div className={styles.summaryCard}>
            <span>Prioritas Sedang</span>
            <strong>{summary.sedang}</strong>
          </div>

          <div className={styles.summaryCard}>
            <span>Prioritas Rendah</span>
            <strong>{summary.rendah}</strong>
          </div>
        </div>
      </section>

      {showFilter && (
        <section className={styles.filterPanel}>
          <div className={styles.filterHeader}>
            <h3>Filter Laporan</h3>

            <button
              type="button"
              onClick={() => setShowFilter(false)}
            >
              ×
            </button>
          </div>

          <div className={styles.filterGrid}>
            <label>
              <span>Tampilkan Data</span>

              <select
                value={draftFilter.mode}
                onChange={(event) =>
                  setDraftFilter((prev) => ({
                    ...prev,
                    mode:
                      event.target.value as FilterMode
                  }))
                }
              >
                <option value="SEMUA">
                  Semua Laporan
                </option>

                <option value="TERBARU">
                  10 Laporan Terbaru
                </option>
              </select>
            </label>

            <label>
              <span>Cari Laporan</span>

              <input
                type="text"
                placeholder="ID, jenis, atau lokasi..."
                value={draftFilter.search}
                onChange={(event) =>
                  setDraftFilter((prev) => ({
                    ...prev,
                    search: event.target.value
                  }))
                }
              />
            </label>

            <label>
              <span>Prioritas</span>

              <select
                value={draftFilter.prioritas}
                onChange={(event) =>
                  setDraftFilter((prev) => ({
                    ...prev,
                    prioritas: event.target.value
                  }))
                }
              >
                <option value="SEMUA">
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
            </label>

            <label>
              <span>Status</span>

              <select
                value={draftFilter.status}
                onChange={(event) =>
                  setDraftFilter((prev) => ({
                    ...prev,
                    status: event.target.value
                  }))
                }
              >
                <option value="SEMUA">
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
            </label>
          </div>

          <div className={styles.filterFooter}>
            <span>
              Menampilkan{' '}
              <strong>{filteredReports.length}</strong>{' '}
              dari <strong>{reports.length}</strong>{' '}
              laporan
            </span>

            <div>
              <button
                type="button"
                className={styles.resetButton}
                onClick={resetFilter}
              >
                Reset
              </button>

              <button
                type="button"
                className={styles.applyButton}
                onClick={applyFilter}
              >
                Terapkan Filter
              </button>
            </div>
          </div>
        </section>
      )}

      {error && (
        <div className={styles.errorBox}>
          {error}
        </div>
      )}

      <div className={styles.mapBox}>
        <MapContainer
          center={[-7.98, 112.63]}
          zoom={12}
          style={{
            width: '100%',
            height: '100%'
          }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {filteredReports.map((item, index) => {
            const latitude =
              Number(item.latitude)

            const longitude =
              Number(item.longitude)

            if (
              !Number.isFinite(latitude) ||
              !Number.isFinite(longitude)
            ) {
              return null
            }

            const reportId =
              getReportId(item)

            const markerColor =
              getMarkerColor(item.prioritas)

            return (
              <Fragment
                key={`report-${reportId}-${index}`}
              >
                <Circle
                  center={[latitude, longitude]}
                  radius={300}
                  pathOptions={{
                    color: markerColor,
                    fillColor: markerColor,
                    fillOpacity: 0.18,
                    weight: 2
                  }}
                />

                <Marker
                  position={[latitude, longitude]}
                  icon={markerIcons[markerColor]}
                >
                  <Popup>
                    <div className={styles.popup}>
                      <span>LAPORAN BENCANA</span>

                      <h3>
                        {getReportTitle(item)}
                      </h3>

                      <p>
                        <strong>ID:</strong>
                        <span>
                          {reportId !== '-'
                            ? `#${reportId}`
                            : '-'}
                        </span>
                      </p>

                      <p>
                        <strong>Lokasi:</strong>
                        <span>
                          {getLocation(item)}
                        </span>
                      </p>

                      <p>
                        <strong>Status:</strong>
                        <span>
                          {item.status_laporan || '-'}
                        </span>
                      </p>

                      <p>
                        <strong>Prioritas:</strong>
                        <span>
                          {item.prioritas || '-'}
                        </span>
                      </p>

                      <p>
                        <strong>Waktu:</strong>
                        <span>
                          {formatDate(item.created_at)}
                        </span>
                      </p>
                    </div>
                  </Popup>
                </Marker>
              </Fragment>
            )
          })}
        </MapContainer>

        <div className={styles.legend}>
          <span>
            <i className={styles.redDot} />
            Prioritas Tinggi
          </span>

          <span>
            <i className={styles.orangeDot} />
            Prioritas Sedang
          </span>

          <span>
            <i className={styles.greenDot} />
            Prioritas Rendah
          </span>
        </div>

        {!loading &&
          !error &&
          filteredReports.length === 0 && (
            <div className={styles.emptyState}>
              <strong>Data tidak ditemukan</strong>
              <span>
                Coba ubah filter atau tekan reset.
              </span>
            </div>
          )}
      </div>
    </div>
  )
}