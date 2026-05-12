"use client";

import styles from "./log.module.css";
import { useEffect, useMemo, useState } from "react";

const RAW_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5555";

const API_BASE_URL = RAW_API_BASE_URL
  .replace(/\/$/, "")
  .replace(/\/api\/humint$/i, "/api")
  .replace(/\/api\/osint$/i, "/api")
  .replace(/\/humint$/i, "")
  .replace(/\/osint$/i, "");

function decodeJwtPayload(token: string): any | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

type SortType = "newest" | "oldest";

type ActivityRow = {
  log_id: number;
  usr_id: number;
  nama_user: string;
  role: "staff" | "admin" | string;
  nama_aktivitas: string;
  waktu_aktivitas: string;
};


function formatDateTimeIndonesia(value: string) {
  if (!value) return "-";

  const raw = String(value).trim();

  // Data dari MySQL/TiDB muncul seperti YYYY-MM-DD HH:mm:ss.
  // Pada project ini nilai tersebut terbaca sebagai UTC, lalu perlu ditampilkan sebagai WIB.
  const dbMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);

  const date = dbMatch
    ? new Date(`${dbMatch[1]}-${dbMatch[2]}-${dbMatch[3]}T${dbMatch[4]}:${dbMatch[5]}:${dbMatch[6] || "00"}Z`)
    : new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  const parts = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value || "";

  return `${getPart("day")}/${getPart("month")}/${getPart("year")} ${getPart("hour")}:${getPart("minute")}`;
}

function parseDateForSort(value: string) {
  const raw = String(value || "").trim();
  const dbMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);

  if (dbMatch) {
    return new Date(`${dbMatch[1]}-${dbMatch[2]}-${dbMatch[3]}T${dbMatch[4]}:${dbMatch[5]}:${dbMatch[6] || "00"}Z`).getTime();
  }

  return new Date(raw).getTime();
}

function formatRole(value: string) {
  const role = String(value || "").toLowerCase();

  if (role === "admin") return "Admin";
  if (role === "staff") return "Staff";

  return value || "-";
}

function escapeCsvCell(value: string | number | null | undefined) {
  const text = String(value ?? "")
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return `"${text.replace(/"/g, '""')}"`;
}

function buildCsvContent(rows: ActivityRow[]) {
  const generatedAt = formatDateTimeIndonesia(new Date().toISOString());

  const metadataRows = [
    ["LAPORAN LOG AKTIVITAS SENTRY"],
    [`Tanggal Export: ${generatedAt}`],
    [`Jumlah Data: ${rows.length}`],
    [],
  ];

  const headers = [
    "No",
    "Nama User",
    "Role",
    "Nama Aktivitas",
    "Waktu Aktivitas",
  ];

  const bodyRows = rows.map((row, index) => [
    index + 1,
    row.nama_user || "-",
    formatRole(row.role),
    cleanActivityName(row.nama_aktivitas),
    formatDateTimeIndonesia(row.waktu_aktivitas),
  ]);

  const lines = [...metadataRows, headers, ...bodyRows];

  // Baris sep=; membuat Excel/WPS langsung memisahkan kolom dengan benar.
  return "\uFEFF" + ["sep=;", ...lines.map((row) => row.map(escapeCsvCell).join(";"))].join("\r\n");
}

function cleanActivityName(value: string) {
  const raw = String(value || "").trim();

  if (!raw) return "-";

  return raw
    .replace(/\s*\[[A-Z]+\s+[^\]]+\]/g, "")
    .replace(/\s+status\s+\d{3,4}\b/gi, "")
    .replace(/\b(GET|POST|PUT|PATCH|DELETE)\s+\/[^\s]+/gi, "")
    .replace(/\blocalhost:\d+\b/gi, "")
    .replace(/\bstatus\s+\d{3,4}\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function shouldShowActivity(row: ActivityRow) {
  const activity = cleanActivityName(row.nama_aktivitas).toLowerCase();

  if (!activity || activity === "-") return false;

  // Log page sering melakukan request GET ke dirinya sendiri.
  // Baris seperti ini tidak perlu ditampilkan karena bukan aksi bisnis utama.
  if (activity === "melihat log aktivitas") return false;

  return true;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20L16.65 16.65" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <path d="M12 4v10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 10l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

function getVisiblePages(currentPage: number, totalPages: number): Array<number | "..."> {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 3) return [1, 2, 3, 4, "..."];
  if (currentPage >= totalPages - 2) return ["...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}

export default function LogAktivitasPage() {
  const [adminName, setAdminName] = useState("Admin");
  const [activityRows, setActivityRows] = useState<ActivityRow[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState("Semua");
  const [sortType, setSortType] = useState<SortType>("newest");
  const [openFilter, setOpenFilter] = useState(false);
  const [page, setPage] = useState(1);
  const rowsPerPage = 15;
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      const payload = decodeJwtPayload(token);

      const name =
        payload?.usr_nama_lengkap ||
        payload?.adm_nama_lengkap ||
        payload?.usr_email ||
        payload?.adm_email ||
        "Admin";

      setAdminName(name);
    }

    fetchLogAktivitas();
  }, []);

  const fetchLogAktivitas = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const token = localStorage.getItem("token");

      const response = await fetch(`${API_BASE_URL}/log-aktivitas`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || "Gagal mengambil log aktivitas");
      }

      const rows = Array.isArray(result.data) ? result.data : [];

      setActivityRows(
        rows.map((row: ActivityRow) => ({
          ...row,
          nama_aktivitas: cleanActivityName(row.nama_aktivitas),
        }))
      );
    } catch (error: any) {
      console.error("Gagal mengambil log aktivitas:", error);
      setErrorMsg(error.message || "Gagal mengambil log aktivitas");
      setActivityRows([]);
    } finally {
      setLoading(false);
    }
  };

  const visibleRows = useMemo(
    () => activityRows.filter((row) => shouldShowActivity(row)),
    [activityRows]
  );

  const userOptions = useMemo(() => {
    const uniqueUsers = Array.from(
      new Set(visibleRows.map((row) => row.nama_user).filter(Boolean))
    );

    return ["Semua", ...uniqueUsers];
  }, [visibleRows]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const result = visibleRows.filter((row) => {
      const activityName = cleanActivityName(row.nama_aktivitas);

      const matchSearch =
        keyword === ""
          ? true
          : [row.nama_user, row.role, activityName, row.waktu_aktivitas]
              .join(" ")
              .toLowerCase()
              .includes(keyword);

      const matchUser =
        selectedUser === "Semua" ? true : row.nama_user === selectedUser;

      return matchSearch && matchUser;
    });

    return [...result].sort((a, b) => {
      const timeA = parseDateForSort(a.waktu_aktivitas);
      const timeB = parseDateForSort(b.waktu_aktivitas);

      return sortType === "newest" ? timeB - timeA : timeA - timeB;
    });
  }, [visibleRows, search, selectedUser, sortType]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const currentRows = filteredRows.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );
  const visiblePages = getVisiblePages(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [search, selectedUser, sortType]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleDownloadCsv = async () => {
    const csvContent = buildCsvContent(filteredRows);

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const now = new Date();
    const pad = (num: number) => String(num).padStart(2, "0");
    const fileDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `log-aktivitas-sentry_${fileDate}.csv`;
    link.click();

    URL.revokeObjectURL(url);

    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_BASE_URL}/log-aktivitas/catat-download-csv`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
    } catch {
      // Jika gagal mencatat log, download tetap berhasil.
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <h1 className={styles.pageTitle}>LOG AKTIVITAS</h1>
        <div className={styles.hello}>Halo, {adminName}</div>
      </div>

      <div className={styles.controlBar}>
        <div className={styles.searchBox}>
          <span className={styles.searchIconWrap}>
            <SearchIcon />
          </span>

          <input
            type="text"
            className={styles.searchInput}
            placeholder="Cari aktivitas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.actionsGroup}>
          <button
            type="button"
            className={styles.toolbarButton}
            onClick={handleDownloadCsv}
            disabled={filteredRows.length === 0}
          >
            <DownloadIcon />
            <span>Download CSV</span>
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
              <div className={styles.dropdownMenu}>
                <div className={styles.dropdownTitle}>Filter berdasarkan Nama User</div>

                <div className={styles.dropdownOptionList}>
                  {userOptions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`${styles.dropdownOption} ${
                        selectedUser === item ? styles.dropdownOptionActive : ""
                      }`}
                      onClick={() => {
                        setSelectedUser(item);
                        setOpenFilter(false);
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className={styles.toolbarButton}
            onClick={() =>
              setSortType((prev) => (prev === "newest" ? "oldest" : "newest"))
            }
          >
            <SortIcon />
            <span>Sort</span>
          </button>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>No</th>
              <th>Nama User</th>
              <th>Role</th>
              <th>Nama Aktivitas</th>
              <th>Waktu Aktivitas</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className={styles.emptyState}>
                  Memuat log aktivitas...
                </td>
              </tr>
            ) : errorMsg ? (
              <tr>
                <td colSpan={5} className={styles.emptyState}>
                  {errorMsg}
                </td>
              </tr>
            ) : filteredRows.length > 0 ? (
              currentRows.map((row, index) => (
                <tr key={row.log_id}>
                  <td>{(page - 1) * rowsPerPage + index + 1}</td>
                  <td>{row.nama_user}</td>
                  <td>{formatRole(row.role)}</td>
                  <td>{cleanActivityName(row.nama_aktivitas)}</td>
                  <td>{formatDateTimeIndonesia(row.waktu_aktivitas)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className={styles.emptyState}>
                  Data log aktivitas tidak ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.paginationWrap}>
        <div className={styles.paginationInfo}>
          Menampilkan {filteredRows.length === 0 ? 0 : (page - 1) * rowsPerPage + 1}
          {" - "}
          {Math.min(page * rowsPerPage, filteredRows.length)}
          {" dari "}
          {filteredRows.length}
          {" data"}
        </div>

        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageArrow}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
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
                    page === item ? styles.pageNumberActive : ""
                  }`}
                  onClick={() => setPage(Number(item))}
                >
                  {item}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            className={styles.pageArrow}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages}
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
