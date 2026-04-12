"use client";

import styles from "./log.module.css";
import { useEffect, useMemo, useState } from "react";

// decode payload JWT tanpa library
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
  no: number;
  adminName: string;
  activityName: string;
  activityTime: string;
};

const activityRows: ActivityRow[] = [
  { no: 1, adminName: "Arif Samsudin", activityName: "Bojongsoang", activityTime: "2025-01-12 14:30" },
  { no: 2, adminName: "Gusti Restu", activityName: "Bojongsoang", activityTime: "2025-01-12 14:30" },
  { no: 3, adminName: "Arif Samsudin", activityName: "Bojongsoang", activityTime: "2025-01-12 14:30" },
  { no: 4, adminName: "Arif Samsudin", activityName: "Bojongsoang", activityTime: "2025-01-12 14:30" },
  { no: 5, adminName: "Arif Samsudin", activityName: "Lowokwaru", activityTime: "2025-01-12 14:30" },
  { no: 6, adminName: "Arif Samsudin", activityName: "Rampal Celaket", activityTime: "2025-01-12 14:30" },
  { no: 7, adminName: "Arif Samsudin", activityName: "Oro Oro Dowo", activityTime: "2025-01-12 14:30" },
  { no: 8, adminName: "Gusti Restu", activityName: "Samaan", activityTime: "2025-01-12 12:30" },
  { no: 9, adminName: "Gusti Restu", activityName: "Buring", activityTime: "2025-01-12 10:30" },
  { no: 10, adminName: "Gusti Restu", activityName: "Wonokoyo", activityTime: "2025-01-12 15:30" },
  { no: 11, adminName: "Gusti Restu", activityName: "Tasikmadu", activityTime: "2025-01-12 14:30" },
  { no: 12, adminName: "Gusti Restu", activityName: "Jodipan", activityTime: "2025-01-12 18:30" },
  { no: 13, adminName: "Gusti Restu", activityName: "Balearjosari", activityTime: "2025-01-12 19:30" },
  { no: 14, adminName: "Arif Samsudin", activityName: "Bojongsoang", activityTime: "2025-01-12 14:30" },
  { no: 15, adminName: "Arif Samsudin", activityName: "Bojongsoang", activityTime: "2025-01-12 14:30" },
];

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
  const [search, setSearch] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState("Semua");
  const [sortType, setSortType] = useState<SortType>("newest");
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

  const adminOptions = useMemo(() => {
    const uniqueAdmins = Array.from(new Set(activityRows.map((row) => row.adminName)));
    return ["Semua", ...uniqueAdmins];
  }, []);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const result = activityRows.filter((row) => {
      const matchSearch =
        keyword === ""
          ? true
          : [row.adminName, row.activityName, row.activityTime]
              .join(" ")
              .toLowerCase()
              .includes(keyword);

      const matchAdmin =
        selectedAdmin === "Semua" ? true : row.adminName === selectedAdmin;

      return matchSearch && matchAdmin;
    });

    return [...result].sort((a, b) => {
      const timeA = parseDate(a.activityTime);
      const timeB = parseDate(b.activityTime);
      return sortType === "newest" ? timeB - timeA : timeA - timeB;
    });
  }, [search, selectedAdmin, sortType]);

  const handleDownloadCsv = () => {
    const headers = ["No", "Nama Admin", "Nama Aktivitas", "Waktu Aktivitas"];
    const rows = filteredRows.map((row, index) => [
      String(index + 1),
      row.adminName,
      row.activityName,
      row.activityTime,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "log-aktivitas.csv";
    link.click();

    URL.revokeObjectURL(url);
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
            placeholder="Cari berdasarkan ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.actionsGroup}>
          <button
            type="button"
            className={styles.toolbarButton}
            onClick={handleDownloadCsv}
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
                <div className={styles.dropdownTitle}>Filter by Nama Admin</div>

                <div className={styles.dropdownOptionList}>
                  {adminOptions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`${styles.dropdownOption} ${
                        selectedAdmin === item ? styles.dropdownOptionActive : ""
                      }`}
                      onClick={() => {
                        setSelectedAdmin(item);
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
              <th>Nama Admin</th>
              <th>Nama Aktivitas</th>
              <th>Waktu Aktivitas</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length > 0 ? (
              filteredRows.map((row, index) => (
                <tr key={`${row.no}-${row.adminName}-${index}`}>
                  <td>{index + 1}</td>
                  <td>{row.adminName}</td>
                  <td>{row.activityName}</td>
                  <td>{row.activityTime}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className={styles.emptyState}>
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