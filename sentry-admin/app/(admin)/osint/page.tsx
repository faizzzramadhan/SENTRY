"use client";

import styles from "./osint.module.css";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

// decode payload JWT (tanpa library)
function decodeJwtPayload(token: string): any | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

type SourceType = "X" | "Facebook" | "BMKG";
type SourceFilterType = "Semua" | SourceType;
type HumintFilterType = "Semua" | "Tidak Ada" | "Ada Data HUMINT";

type BaseRow = {
  source: SourceType;
  snippet: string;
  location: string;
  humintLabel: "Tidak Ada" | "LINK TO HUMINT";
  engagementType: "social" | "bmkg";
  likes?: number;
  comments?: number;
  shares?: number;
};

type OsintRow = BaseRow & {
  id: number;
  postedAt: string;
  postedAtLabel: string;
};

const baseRows: BaseRow[] = [
  {
    source: "X",
    snippet: "Banjir",
    location: "Sawojajar",
    humintLabel: "Tidak Ada",
    engagementType: "social",
    likes: 10,
    comments: 12,
    shares: 20,
  },
  {
    source: "Facebook",
    snippet: "Longsor",
    location: "Rampal Celaket",
    humintLabel: "Tidak Ada",
    engagementType: "social",
    likes: 10,
    comments: 12,
    shares: 20,
  },
  {
    source: "Facebook",
    snippet: "Gempa",
    location: "Klojen",
    humintLabel: "LINK TO HUMINT",
    engagementType: "social",
    likes: 10,
    comments: 12,
    shares: 20,
  },
  {
    source: "Facebook",
    snippet: "BMKG",
    location: "Jodipan",
    humintLabel: "LINK TO HUMINT",
    engagementType: "social",
    likes: 10,
    comments: 12,
    shares: 20,
  },
  {
    source: "X",
    snippet: "Rampal Celaket",
    location: "Rampal Celaket",
    humintLabel: "LINK TO HUMINT",
    engagementType: "social",
    likes: 10,
    comments: 12,
    shares: 20,
  },
  {
    source: "BMKG",
    snippet: "Oro Oro Dowo",
    location: "Oro Oro Dowo",
    humintLabel: "LINK TO HUMINT",
    engagementType: "bmkg",
  },
  {
    source: "Facebook",
    snippet: "Samaan",
    location: "Samaan",
    humintLabel: "Tidak Ada",
    engagementType: "social",
    likes: 10,
    comments: 12,
    shares: 20,
  },
  {
    source: "X",
    snippet: "Wonokoyo",
    location: "Wonokoyo",
    humintLabel: "Tidak Ada",
    engagementType: "social",
    likes: 10,
    comments: 12,
    shares: 20,
  },
  {
    source: "BMKG",
    snippet: "Buring",
    location: "Buring",
    humintLabel: "Tidak Ada",
    engagementType: "bmkg",
  },
  {
    source: "Facebook",
    snippet: "Tasikmadu",
    location: "Tasikmadu",
    humintLabel: "Tidak Ada",
    engagementType: "social",
    likes: 10,
    comments: 12,
    shares: 20,
  },
  {
    source: "X",
    snippet: "Jodipan",
    location: "Jodipan",
    humintLabel: "Tidak Ada",
    engagementType: "social",
    likes: 10,
    comments: 12,
    shares: 20,
  },
  {
    source: "Facebook",
    snippet: "Balearjosari",
    location: "Balearjosari",
    humintLabel: "LINK TO HUMINT",
    engagementType: "social",
    likes: 10,
    comments: 12,
    shares: 20,
  },
  {
    source: "X",
    snippet: "Polo Wijen",
    location: "Polo Wijen",
    humintLabel: "LINK TO HUMINT",
    engagementType: "social",
    likes: 10,
    comments: 12,
    shares: 20,
  },
  {
    source: "Facebook",
    snippet: "Kauman",
    location: "Kauman",
    humintLabel: "Tidak Ada",
    engagementType: "social",
    likes: 10,
    comments: 12,
    shares: 20,
  },
  {
    source: "X",
    snippet: "Kiduldalem",
    location: "Kiduldalem",
    humintLabel: "Tidak Ada",
    engagementType: "social",
    likes: 10,
    comments: 12,
    shares: 20,
  },
];

const summaryCards = [
  { title: "TOTAL DATA OSINT", value: 123 },
  { title: "INDIKASI DARURAT", value: 5 },
  { title: "KONTEN KADALUARSA", value: 2 },
  { title: "PERLU VERIFIKASI", value: 14 },
  { title: "TERKAIT HUMINT", value: 7 },
];

function formatDateIndo(date: Date) {
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");

  return `${day} ${month} ${year} ${hour}:${minute}:${second}`;
}

const osintRows: OsintRow[] = Array.from({ length: 3 }).flatMap((_, batchIndex) =>
  baseRows.map((row, rowIndex) => {
    const date = new Date(2026, 0, 20 - batchIndex, 12, 10, 0);
    date.setMinutes(date.getMinutes() + rowIndex);

    return {
      ...row,
      id: batchIndex * baseRows.length + rowIndex + 1,
      postedAt: date.toISOString(),
      postedAtLabel: formatDateIndo(date),
    };
  })
);

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
  if (totalPages <= 4) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 2) {
    return [1, 2, 3, "..."];
  }

  if (currentPage >= totalPages - 1) {
    return ["...", totalPages - 2, totalPages - 1, totalPages];
  }

  return [currentPage - 1, currentPage, currentPage + 1, "..."];
}

export default function MonitoringOsintPage() {
  const router = useRouter();

  const [adminName, setAdminName] = useState("Admin");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [sourceFilter, setSourceFilter] = useState<SourceFilterType>("Semua");
  const [humintFilter, setHumintFilter] = useState<HumintFilterType>("Semua");

  const [currentPage, setCurrentPage] = useState(1);
  const [openFilter, setOpenFilter] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const payload = decodeJwtPayload(token);

    const name =
      payload?.adm_nama_lengkap ||
      payload?.ADM_NAMA_LENGKAP ||
      payload?.adm_email ||
      "Admin";

    setAdminName(name);
  }, []);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const result = osintRows.filter((row) => {
      const matchKeyword =
        keyword === ""
          ? true
          : [row.source, row.snippet, row.location, row.humintLabel, row.postedAtLabel]
              .join(" ")
              .toLowerCase()
              .includes(keyword);

      const matchSource =
        sourceFilter === "Semua" ? true : row.source === sourceFilter;

      const matchHumint =
        humintFilter === "Semua"
          ? true
          : humintFilter === "Tidak Ada"
          ? row.humintLabel === "Tidak Ada"
          : row.humintLabel !== "Tidak Ada";

      return matchKeyword && matchSource && matchHumint;
    });

    result.sort((a, b) => {
      const timeA = new Date(a.postedAt).getTime();
      const timeB = new Date(b.postedAt).getTime();
      return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [search, sourceFilter, humintFilter, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sourceFilter, humintFilter, sortOrder, rowsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, currentPage, rowsPerPage]);

  const visiblePages = getVisiblePages(currentPage, totalPages);

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <h1 className={styles.pageTitle}>MONITORING OSINT</h1>
        <div className={styles.hello}>Halo, {adminName}</div>
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
          <button
            type="button"
            className={styles.toolbarButton}
            onClick={() => router.push("/osint/settings")}
          >
            <SettingsIcon />
            <span>SETTINGS</span>
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
                    {(["X", "Facebook", "BMKG"] as SourceType[]).map((value) => (
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
                  <div className={styles.dropdownTitle}>Jenis data</div>
                  <div className={styles.optionGroup}>
                    <button
                      type="button"
                      className={`${styles.dropdownOption} ${
                        humintFilter === "Tidak Ada" ? styles.dropdownOptionActive : ""
                      }`}
                      onClick={() => setHumintFilter("Tidak Ada")}
                    >
                      Tidak Ada
                    </button>
                    <button
                      type="button"
                      className={`${styles.dropdownOption} ${
                        humintFilter === "Ada Data HUMINT" ? styles.dropdownOptionActive : ""
                      }`}
                      onClick={() => setHumintFilter("Ada Data HUMINT")}
                    >
                      Ada Data HUMINT
                    </button>
                    <button
                      type="button"
                      className={`${styles.dropdownOption} ${
                        humintFilter === "Semua" ? styles.dropdownOptionActive : ""
                      }`}
                      onClick={() => setHumintFilter("Semua")}
                    >
                      Semua
                    </button>
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
            <span>{sortOrder === "newest" ? "Sort" : "Terlama"}</span>
          </button>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>No</th>
              <th>Sumber Data</th>
              <th>Konten/Snippet</th>
              <th>Lokasi Kejadian</th>
              <th>Waktu Postingan</th>
              <th>Data HUMINT</th>
              <th>Engangement</th>
              <th>Aksi</th>
            </tr>
          </thead>

          <tbody>
            {paginatedRows.length > 0 ? (
              paginatedRows.map((row, index) => (
                <tr key={row.id}>
                  <td>{(currentPage - 1) * rowsPerPage + index + 1}</td>
                  <td>{row.source}</td>
                  <td>{row.snippet}</td>
                  <td>{row.location}</td>
                  <td>{row.postedAtLabel}</td>
                  <td>
                    {row.humintLabel === "LINK TO HUMINT" ? (
                      <button type="button" className={styles.humintLink}>
                        {row.humintLabel}
                      </button>
                    ) : (
                      <span className={styles.noHumint}>{row.humintLabel}</span>
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
                      <button type="button" className={styles.actionButton}>
                        <EyeIcon />
                      </button>
                      <button type="button" className={styles.actionButton}>
                        <PencilIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className={styles.emptyState}>
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
            disabled={currentPage === 1}
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
            disabled={currentPage === totalPages}
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>
    </div>
  );
}