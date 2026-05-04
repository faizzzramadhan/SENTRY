"use client";

import styles from "./log.module.css";
import { useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5555";

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

function parseDate(dateString: string) {
  return new Date(dateString.replace(" ", "T")).getTime();
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

export default function LogAktivitasPage() {
  const [adminName, setAdminName] = useState("Admin");
  const [activityRows, setActivityRows] = useState<ActivityRow[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState("Semua");
  const [sortType, setSortType] = useState<SortType>("newest");
  const [openFilter, setOpenFilter] = useState(false);
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

      setActivityRows(result.data || []);
    } catch (error: any) {
      console.error("Gagal mengambil log aktivitas:", error);
      setErrorMsg(error.message || "Gagal mengambil log aktivitas");
      setActivityRows([]);
    } finally {
      setLoading(false);
    }
  };

  const userOptions = useMemo(() => {
    const uniqueUsers = Array.from(
      new Set(activityRows.map((row) => row.nama_user).filter(Boolean))
    );

    return ["Semua", ...uniqueUsers];
  }, [activityRows]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const result = activityRows.filter((row) => {
      const matchSearch =
        keyword === ""
          ? true
          : [
              row.nama_user,
              row.role,
              row.nama_aktivitas,
              row.waktu_aktivitas,
            ]
              .join(" ")
              .toLowerCase()
              .includes(keyword);

      const matchUser =
        selectedUser === "Semua" ? true : row.nama_user === selectedUser;

      return matchSearch && matchUser;
    });

    return [...result].sort((a, b) => {
      const timeA = parseDate(a.waktu_aktivitas);
      const timeB = parseDate(b.waktu_aktivitas);

      return sortType === "newest" ? timeB - timeA : timeA - timeB;
    });
  }, [activityRows, search, selectedUser, sortType]);

  const handleDownloadCsv = async () => {
    const headers = ["No", "Nama User", "Role", "Nama Aktivitas", "Waktu Aktivitas"];

    const rows = filteredRows.map((row, index) => [
      String(index + 1),
      row.nama_user,
      row.role,
      row.nama_aktivitas,
      row.waktu_aktivitas,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "log-aktivitas.csv";
    link.click();

    URL.revokeObjectURL(url);

    // Catat aktivitas download CSV ke backend
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
      // Jika gagal mencatat log, tidak perlu throw — download tetap berhasil
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
            <span>Download</span>
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
                <div className={styles.dropdownTitle}>Filter by Nama User</div>

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
              filteredRows.map((row, index) => (
                <tr key={row.log_id}>
                  <td>{index + 1}</td>
                  <td>{row.nama_user}</td>
                  <td>{row.role}</td>
                  <td>{row.nama_aktivitas}</td>
                  <td>{row.waktu_aktivitas}</td>
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
    </div>
  );
}