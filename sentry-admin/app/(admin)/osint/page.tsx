"use client";

import styles from "./osint.module.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5555").replace(/\/$/, "");

function decodeJwtPayload(token: string): any | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

type SourceType = "X" | "BMKG" | "X_BMKG";
type SourceFilterType = "Semua" | SourceType;
type HumintFilterType = "Semua" | "Tidak Ada" | "Ada Data HUMINT";

type OsintScoreApi = {
  osint_data_score_id?: number;
  osint_id?: number;
  keyword_score?: number;
  location_score?: number;
  time_score?: number;
  engagement_score?: number;
  total_score?: number;
  max_score?: number;
  score_percentage?: string | number;
  score_level?: "TIDAK_VALID" | "RENDAH" | "SEDANG" | "TINGGI";
  score_status?: "VALID" | "NEED_REVIEW" | "LOW_CONFIDENCE" | "REJECTED";
};

type LaporanApi = {
  laporan_id?: number;
  nama_pelapor?: string | null;
  kronologi?: string | null;
  waktu_kejadian?: string | null;
  alamat_lengkap_kejadian?: string | null;
};

type OsintReferenceApi = {
  osint_reference_id: number;
  laporan_id: number;
  osint_id: number;
  reference_status?: "MATCHED" | "REVIEW" | "REJECTED" | string;
  reference_source?: string | null;
  reference_method?: string | null;
  matched_keywords?: string | null;
  keyword_match_status?: string | null;
  event_match_status?: string | null;
  location_match_status?: string | null;
  time_match_status?: string | null;
  reference_reason?: string | null;
  laporan?: LaporanApi | null;
};

type OsintApiRow = {
  osint_id: number;
  osint_source: SourceType;
  osint_event_type?: string | null;
  osint_area_text?: string | null;
  osint_account_name?: string | null;
  osint_account_username?: string | null;
  osint_content?: string | null;
  osint_post_time?: string | null;
  osint_event_time?: string | null;
  osint_link_url?: string | null;
  osint_like_count?: number | null;
  osint_share_count?: number | null;
  osint_reply_count?: number | null;
  osint_view_count?: number | null;
  osint_bmkg_source_type?: string | null;
  osint_weather_desc?: string | null;
  osint_warning_event?: string | null;
  osint_match_status?: string | null;
  osint_verification_status?: string | null;
  osint_priority_level?: "RENDAH" | "SEDANG" | "TINGGI" | "KRITIS" | null;
  creation_date?: string | null;
  last_update_date?: string | null;
  osint_score?: OsintScoreApi | null;

  osint_reference_count?: number;
  humint_related?: boolean;
  humint_label?: string;
  osint_references?: OsintReferenceApi[];
};

type OsintListResponse = {
  count: number;
  limit: number;
  offset: number;
  summary?: {
    total_data_osint?: number;
    indikasi_darurat?: number;
    konten_kadaluarsa?: number;
    perlu_verifikasi?: number;
    terkait_humint?: number;
  };
  osint_data: OsintApiRow[];
};

type OsintRow = {
  id: number;
  source: SourceType;
  snippet: string;
  location: string;
  postedAt: string;
  postedAtLabel: string;
  humintLabel: "Tidak Ada" | "Ada Data HUMINT";
  humintReferenceCount: number;
  humintReferences: OsintReferenceApi[];
  primaryLaporanId: number | null;
  engagementType: "social" | "bmkg";
  likes: number;
  comments: number;
  shares: number;
  priority: string;
  verificationStatus: string;
  scoreLabel: string;
};

function formatDateIndo(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const formatter = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return formatter.format(date).replace(/\./g, ":");
}

function truncateText(value?: string | null, maxLength = 80) {
  const text = String(value || "").replace(/\s+/g, " ").trim();

  if (!text) return "-";
  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength)}...`;
}

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function fetchJson<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(`Response bukan JSON. Status ${response.status}. ${text.slice(0, 120)}`);
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Request gagal");
  }

  return data;
}

function mapApiRow(row: OsintApiRow): OsintRow {
  const postedAt =
    row.osint_post_time ||
    row.osint_event_time ||
    row.last_update_date ||
    row.creation_date ||
    "";

  const snippetSource =
    row.osint_content ||
    row.osint_warning_event ||
    row.osint_weather_desc ||
    row.osint_event_type ||
    row.osint_bmkg_source_type ||
    "-";

  const isBmkgOnly = row.osint_source === "BMKG";

  const score = row.osint_score;
  const scoreLabel = score
    ? `${score.total_score ?? 0}/${score.max_score ?? 100} (${score.score_level || "-"})`
    : "-";

  const references = Array.isArray(row.osint_references)
    ? row.osint_references
    : [];

  const referenceCount = Number(row.osint_reference_count || references.length || 0);
  const humintRelated = Boolean(row.humint_related || referenceCount > 0);

  const primaryReference = references[0] || null;
  const primaryLaporanId = primaryReference?.laporan_id
    ? Number(primaryReference.laporan_id)
    : null;

  return {
    id: row.osint_id,
    source: row.osint_source,
    snippet: truncateText(snippetSource, 85),
    location: row.osint_area_text || "-",
    postedAt,
    postedAtLabel: formatDateIndo(postedAt),
    humintLabel: humintRelated ? "Ada Data HUMINT" : "Tidak Ada",
    humintReferenceCount: referenceCount,
    humintReferences: references,
    primaryLaporanId,
    engagementType: isBmkgOnly ? "bmkg" : "social",
    likes: Number(row.osint_like_count || 0),
    comments: Number(row.osint_reply_count || 0),
    shares: Number(row.osint_share_count || 0),
    priority: row.osint_priority_level || "-",
    verificationStatus: row.osint_verification_status || "-",
    scoreLabel,
  };
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20L16.65 16.65" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <path
        d="M12 8.6A3.4 3.4 0 1 0 12 15.4A3.4 3.4 0 1 0 12 8.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.2 1.2 0 0 1 0 1.7l-1 1a1.2 1.2 0 0 1-1.7 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9v.3A1.2 1.2 0 0 1 14 22h-2a1.2 1.2 0 0 1-1.2-1.2v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.2 1.2 0 0 1-1.7 0l-1-1a1.2 1.2 0 0 1 0-1.7l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6h-.3A1.2 1.2 0 0 1 4 14v-2a1.2 1.2 0 0 1 1.2-1.2h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1L6 9a1.2 1.2 0 0 1 0-1.7l1-1a1.2 1.2 0 0 1 1.7 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V5.2A1.2 1.2 0 0 1 12 4h2a1.2 1.2 0 0 1 1.2 1.2v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.2 1.2 0 0 1 1.7 0l1 1a1.2 1.2 0 0 1 0 1.7l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.3A1.2 1.2 0 0 1 20 12v2a1.2 1.2 0 0 1-1.2 1.2h-.2a1 1 0 0 0-.9.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <path d="M4 6h16M7 12h10M10 18h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <path
        d="M8 5v14M8 19l-3-3M8 19l3-3M16 19V5M16 5l-3 3M16 5l3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.actionIcon} aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.actionIcon} aria-hidden="true">
      <path
        d="M4 20l4.5-1 9-9a2.12 2.12 0 0 0-3-3l-9 9L4 20z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M13.5 7.5l3 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.actionIcon} aria-hidden="true">
      <path d="M4 7h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 3h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M8 7v12m8-12v12M6 7l1 13a1 1 0 0 0 1 .93h8a1 1 0 0 0 1-.93L18 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.pageArrowIcon} aria-hidden="true">
      <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.pageArrowIcon} aria-hidden="true">
      <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 4) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 2) return [1, 2, 3, "..."];
  if (currentPage >= totalPages - 1) return ["...", totalPages - 2, totalPages - 1, totalPages];
  return [currentPage - 1, currentPage, currentPage + 1, "..."];
}

export default function MonitoringOsintPage() {
  const router = useRouter();

  const [userName, setUserName] = useState("User");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [sourceFilter, setSourceFilter] = useState<SourceFilterType>("Semua");
  const [humintFilter, setHumintFilter] = useState<HumintFilterType>("Semua");

  const [currentPage, setCurrentPage] = useState(1);
  const [openFilter, setOpenFilter] = useState(false);

  const [rows, setRows] = useState<OsintRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<OsintListResponse["summary"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    const payload = decodeJwtPayload(token);

    if (payload?.usr_role === "admin") {
      window.location.href = "/manage-staff";
      return;
    }

    setUserName(payload?.usr_nama_lengkap || payload?.usr_email || "User");
  }, []);

  const fetchRows = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      setLoading(true);
      setErrorMessage("");

      const params = new URLSearchParams();
      params.set("limit", String(rowsPerPage));
      params.set("offset", String((currentPage - 1) * rowsPerPage));
      params.set("sort", sortOrder);

      if (search.trim()) params.set("search", search.trim());
      if (sourceFilter !== "Semua") params.set("source", sourceFilter);

      if (humintFilter === "Ada Data HUMINT") {
        params.set("humint_related", "true");
      }

      if (humintFilter === "Tidak Ada") {
        params.set("humint_related", "false");
      }

      const data = await fetchJson<OsintListResponse>(
        `${API_BASE_URL}/osint/data?${params.toString()}`,
        token
      );

      const mappedRows = data.osint_data.map(mapApiRow);

      setRows(mappedRows);
      setTotalCount(data.count || 0);
      setSummary(data.summary || null);


    } catch (error: any) {
      setErrorMessage(error?.message || "Gagal mengambil data OSINT");
      setRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [rowsPerPage, currentPage, sortOrder, search, sourceFilter, humintFilter]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [search, sourceFilter, humintFilter, sortOrder, rowsPerPage]);

  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
  const visiblePages = getVisiblePages(currentPage, totalPages);

  const summaryCards = useMemo(
    () => [
      { title: "TOTAL DATA OSINT", value: summary?.total_data_osint ?? totalCount },
      { title: "INDIKASI DARURAT", value: summary?.indikasi_darurat ?? 0 },
      { title: "KONTEN KADALUARSA", value: summary?.konten_kadaluarsa ?? 0 },
      { title: "PERLU VERIFIKASI", value: summary?.perlu_verifikasi ?? 0 },
      { title: "TERKAIT HUMINT", value: summary?.terkait_humint ?? 0 },
    ],
    [summary, totalCount]
  );

  const currentRowIds = useMemo(() => rows.map((row) => row.id), [rows]);

  const selectedCount = useMemo(
    () => [...selectedIds].filter((id) => selectedIds.has(id)).length,
    [selectedIds]
  );

  const isAllCurrentRowsSelected =
    currentRowIds.length > 0 && currentRowIds.every((id) => selectedIds.has(id));

  const toggleRowSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const toggleSelectAllCurrentRows = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (isAllCurrentRowsSelected) {
        currentRowIds.forEach((id) => next.delete(id));
      } else {
        currentRowIds.forEach((id) => next.add(id));
      }

      return next;
    });
  };

  const handleDeleteSelected = () => {
    const idsToDelete = [...selectedIds];

    if (!idsToDelete.length) return;

    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (deleteLoading) return;
    setDeleteModalOpen(false);
  };

  const confirmDeleteSelected = async () => {
    const token = getToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    const idsToDelete = [...selectedIds];

    if (!idsToDelete.length) {
      setDeleteModalOpen(false);
      return;
    }

    try {
      setDeleteLoading(true);
      setLoading(true);
      setErrorMessage("");

      const res = await fetch(`${API_BASE_URL}/osint/data/bulk`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          ids: idsToDelete,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.message || data?.error || "Gagal menghapus data OSINT."
        );
      }

      setSelectedIds(new Set());
      setDeleteModalOpen(false);
      await fetchRows();
    } catch (error: any) {
      setErrorMessage(
        error?.message || "Terjadi error saat menghapus data OSINT."
      );
    } finally {
      setDeleteLoading(false);
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <h1 className={styles.pageTitle}>MONITORING OSINT</h1>
        <div className={styles.hello}>Halo, {userName}</div>
      </div>

      <div className={styles.kpiRow}>
        {summaryCards.map((card) => (
          <div key={card.title} className={styles.kpiCard}>
            <div className={styles.kpiTitle}>{card.title}</div>
            <div className={styles.kpiValue}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className={styles.controlRow}>
        <div className={styles.searchBox}>
          <span className={styles.searchIconWrap}>
            <SearchIcon />
          </span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Cari berdasarkan ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.toolbar}>
          {selectedCount > 0 ? (
            <button
              type="button"
              className={`${styles.toolbarButton} ${styles.deleteSelectedButton}`}
              onClick={handleDeleteSelected}
            >
              <TrashIcon />
              <span>Hapus Terpilih ({selectedCount})</span>
            </button>
          ) : null}
          <button
            type="button"
            className={styles.toolbarButton}
            onClick={() => router.push("/osint/settings")}
          >
            <SettingsIcon />
            <span>Settings</span>
          </button>

          <div className={styles.dropdownWrap}>
            <button
              type="button"
              className={styles.toolbarButton}
              onClick={() => setOpenFilter((prev) => !prev)}
            >
              <FilterIcon />
              <span>Filter</span>
            </button>

            {openFilter && (
              <div className={styles.dropdownMenuLarge}>
                <div className={styles.filterSection}>
                  <div className={styles.dropdownTitle}>Baris per halaman</div>
                  <div className={styles.optionGroup}>
                    {[10, 15, 20].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`${styles.dropdownOption} ${
                          rowsPerPage === value ? styles.dropdownOptionActive : ""
                        }`}
                        onClick={() => setRowsPerPage(value)}
                      >
                        {value} halaman
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.filterSection}>
                  <div className={styles.dropdownTitle}>Sumber data</div>
                  <div className={styles.optionGroup}>
                    {(["X", "BMKG", "X_BMKG"] as SourceType[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`${styles.dropdownOption} ${
                          sourceFilter === value ? styles.dropdownOptionActive : ""
                        }`}
                        onClick={() => setSourceFilter(value)}
                      >
                        {value}
                      </button>
                    ))}

                    <button
                      type="button"
                      className={`${styles.dropdownOption} ${
                        sourceFilter === "Semua" ? styles.dropdownOptionActive : ""
                      }`}
                      onClick={() => setSourceFilter("Semua")}
                    >
                      Semua
                    </button>
                  </div>
                </div>

                <div className={styles.filterSection}>
                  <div className={styles.dropdownTitle}>Data HUMINT</div>
                  <div className={styles.optionGroup}>
                    {(["Tidak Ada", "Ada Data HUMINT", "Semua"] as HumintFilterType[]).map(
                      (value) => (
                        <button
                          key={value}
                          type="button"
                          className={`${styles.dropdownOption} ${
                            humintFilter === value ? styles.dropdownOptionActive : ""
                          }`}
                          onClick={() => setHumintFilter(value)}
                        >
                          {value}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className={styles.filterFooter}>
                  <button
                    type="button"
                    className={styles.resetButton}
                    onClick={() => {
                      setRowsPerPage(15);
                      setSourceFilter("Semua");
                      setHumintFilter("Semua");
                    }}
                  >
                    Reset Filter
                  </button>

                  <button
                    type="button"
                    className={styles.applyButton}
                    onClick={() => setOpenFilter(false)}
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className={styles.toolbarButton}
            onClick={() =>
              setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))
            }
          >
            <SortIcon />
            <span>{sortOrder === "newest" ? "Terbaru" : "Terlama"}</span>
          </button>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkboxTh}>
                <input
                  type="checkbox"
                  className={styles.rowCheckbox}
                  checked={isAllCurrentRowsSelected}
                  onChange={toggleSelectAllCurrentRows}
                  aria-label="Pilih semua data OSINT pada halaman ini"
                  disabled={rows.length === 0 || loading}
                />
              </th>
              <th>No</th>
              <th>Sumber Data</th>
              <th>Konten/Snippet</th>
              <th>Lokasi Kejadian</th>
              <th>Waktu</th>
              <th>Prioritas</th>
              <th>Score</th>
              <th>Data HUMINT</th>
              <th>Engagement</th>
              <th>Aksi</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className={styles.emptyState}>
                  Memuat data OSINT...
                </td>
              </tr>
            ) : errorMessage ? (
              <tr>
                <td colSpan={11} className={styles.emptyState}>
                  {errorMessage}
                </td>
              </tr>
            ) : rows.length > 0 ? (
              rows.map((row, index) => (
                <tr key={row.id}>
                   <td className={styles.checkboxCell}>
                    <input
                      type="checkbox"
                      className={styles.rowCheckbox}
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleRowSelection(row.id)}
                      aria-label={`Pilih data OSINT ${row.id}`}
                      disabled={loading}
                    />
                  </td>

                  <td>{(currentPage - 1) * rowsPerPage + index + 1}</td>
                  <td>{row.source}</td>
                  <td>{row.snippet}</td>
                  <td>{row.location}</td>
                  <td>{row.postedAtLabel}</td>
                  <td>{row.priority}</td>
                  <td>{row.scoreLabel}</td>
                  <td>
                    {row.humintLabel === "Ada Data HUMINT" ? (
                      <button
                        type="button"
                        className={styles.humintLink}
                        title={
                          row.humintReferences[0]?.reference_reason ||
                          "Lihat data HUMINT yang berkorelasi"
                        }
                        onClick={() => {
                          if (row.primaryLaporanId) {
                            router.push(`/humint/detail/${row.primaryLaporanId}`);
                          }
                        }}
                      >
                        {row.humintReferenceCount > 1
                          ? `Ada (${row.humintReferenceCount})`
                          : "Ada Data HUMINT"}
                      </button>
                    ) : (
                      <span className={styles.noHumint}>Tidak Ada</span>
                    )}
                  </td>
                  <td>
                    {row.engagementType === "bmkg" ? (
                      <span className={styles.bmkgText}>Data BMKG</span>
                    ) : (
                      <span className={styles.engagementText}>
                        Like: {row.likes} Comment: {row.comments} Share: {row.shares}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className={styles.actionGroup}>
                      <button
                        type="button"
                        className={styles.actionButton}
                        aria-label="Lihat detail OSINT"
                        onClick={() => router.push(`/osint/detail/${row.id}`)}
                      >
                        <EyeIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} className={styles.emptyState}>
                  Data OSINT tidak ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.paginationWrap}>
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageArrow}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1 || loading}
          >
            <ChevronLeftIcon />
          </button>

          <div className={styles.pageNumbers}>
            {visiblePages.map((item, index) =>
              item === "..." ? (
                <span key={`dots-${index}`} className={styles.pageDots}>
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  className={`${styles.pageNumber} ${
                    currentPage === item ? styles.pageNumberActive : ""
                  }`}
                  onClick={() => setCurrentPage(Number(item))}
                  disabled={loading}
                >
                  {item}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            className={styles.pageArrow}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || loading}
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>
      {deleteModalOpen && (
      <div
        className={styles.deleteModalOverlay}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeDeleteModal();
          }
        }}
      >
        <div className={styles.deleteModalCard}>
          <h2 id="delete-modal-title" className={styles.deleteModalTitle}>
            Apakah anda
            <br />
            yakin Menghapus data ini?
          </h2>

          <div className={styles.deleteModalActions}>
            <button
              type="button"
              className={styles.deleteCancelButton}
              onClick={closeDeleteModal}
              disabled={deleteLoading}
            >
              Batal
            </button>

            <button
              type="button"
              className={styles.deleteConfirmButton}
              onClick={confirmDeleteSelected}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Menghapus..." : "Iya"}
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}