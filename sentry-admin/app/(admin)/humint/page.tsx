"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./humint.module.css";
import Link from "next/link";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5555/api/humint";

const ITEMS_PER_PAGE = 10;

type HumintRow = {
  no: number;
  laporan_id: number;
  nama_pelapor: string;
  jenis_bencana: string;
  lokasi: string;
  prioritas: string;
  status: string;
};

const MONTH_OPTIONS = [
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

function decodeJwtPayload(token: string): any | null {
  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalizedPayload);

    return JSON.parse(json);
  } catch (error) {
    console.error("Gagal decode token:", error);
    return null;
  }
}

function getCurrentYearOptions() {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];

  for (let year = currentYear - 3; year <= currentYear + 2; year++) {
    years.push(String(year));
  }

  return years;
}

export default function HumintPage() {
  const [data, setData] = useState<HumintRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortMode, setSortMode] = useState<
    "latest" | "priority" | "status" | "name"
  >("latest");

  const latestReportIdRef = useRef<number | null>(null);
  const hasLoadedInitialDataRef = useRef(false);

  const [namaUser, setNamaUser] = useState("User");
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(
    String(new Date().getMonth() + 1)
  );
  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear())
  );

  const yearOptions = useMemo(() => getCurrentYearOptions(), []);

  const getLoggedInUserName = () => {
    try {
      const possibleUserKeys = [
        "user",
        "authUser",
        "currentUser",
        "sentry_user",
        "loggedInUser",
        "staff",
      ];

      for (const key of possibleUserKeys) {
        const savedUser = localStorage.getItem(key);

        if (savedUser) {
          const parsed = JSON.parse(savedUser);

          const name =
            parsed.usr_nama_lengkap ||
            parsed.nama_lengkap ||
            parsed.nama ||
            parsed.name ||
            parsed.username ||
            parsed.usr_email ||
            parsed.email;

          if (name) {
            return name;
          }
        }
      }

      const possibleTokenKeys = [
        "token",
        "access_token",
        "authToken",
        "sentry_token",
      ];

      for (const key of possibleTokenKeys) {
        const token = localStorage.getItem(key);

        if (token) {
          const payload = decodeJwtPayload(token);

          const name =
            payload?.usr_nama_lengkap ||
            payload?.nama_lengkap ||
            payload?.nama ||
            payload?.name ||
            payload?.username ||
            payload?.usr_email ||
            payload?.email;

          if (name) {
            return name;
          }
        }
      }

      return "User";
    } catch (error) {
      console.error("Gagal membaca data user login:", error);
      return "User";
    }
  };

  const notifyNewReport = (latestReport: HumintRow) => {
    const message = `Laporan baru masuk dari ${
      latestReport.nama_pelapor || "pelapor"
    } dengan ID ${latestReport.laporan_id}.`;

    if (typeof window === "undefined") {
      return;
    }

    if (!("Notification" in window)) {
      globalThis.alert(message);
      return;
    }

    if (Notification.permission === "granted") {
      new Notification("Laporan HUMINT Baru", {
        body: message,
      });
      return;
    }

    if (Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          new Notification("Laporan HUMINT Baru", {
            body: message,
          });
        } else {
          globalThis.alert(message);
        }
      });
      return;
    }

    globalThis.alert(message);
  };

  const fetchHumint = async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;

    try {
      if (!silent) {
        setLoading(true);
      }

      const res = await fetch(`${API_URL}/list`, {
        cache: "no-store",
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Gagal mengambil data HUMINT");
      }

      const nextData: HumintRow[] = result.data || [];
      const latestReport = nextData.reduce<HumintRow | null>((latest, item) => {
        if (!latest) return item;
        return Number(item.laporan_id || 0) > Number(latest.laporan_id || 0)
          ? item
          : latest;
      }, null);

      const latestId = latestReport ? Number(latestReport.laporan_id || 0) : null;

      if (
        hasLoadedInitialDataRef.current &&
        latestId !== null &&
        latestReportIdRef.current !== null &&
        latestId > latestReportIdRef.current &&
        latestReport
      ) {
        notifyNewReport(latestReport);
      }

      latestReportIdRef.current = latestId;
      hasLoadedInitialDataRef.current = true;

      setData(nextData);

      if (!silent) {
        setCurrentPage(1);
      }
    } catch (error) {
      console.error(error);

      if (!silent) {
        setData([]);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    setNamaUser(getLoggedInUserName());
    fetchHumint();

    const intervalId = window.setInterval(() => {
      fetchHumint({ silent: true });
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const filteredAndSortedData = useMemo(() => {
    const keyword = search.toLowerCase();

    let result = data.filter((item) => {
      return (
        String(item.laporan_id || "").includes(keyword) ||
        String(item.nama_pelapor || "").toLowerCase().includes(keyword) ||
        String(item.jenis_bencana || "").toLowerCase().includes(keyword) ||
        String(item.lokasi || "").toLowerCase().includes(keyword) ||
        String(item.prioritas || "").toLowerCase().includes(keyword) ||
        String(item.status || "").toLowerCase().includes(keyword)
      );
    });

    if (sortMode === "latest") {
      result = [...result].sort(
        (a, b) => Number(b.laporan_id || 0) - Number(a.laporan_id || 0)
      );
    }

    if (sortMode === "priority") {
      const priorityOrder: Record<string, number> = {
        "prioritas tinggi": 1,
        tinggi: 1,
        high: 1,
        "prioritas rendah": 2,
        normal: 2,
        sedang: 2,
        rendah: 3,
        low: 3,
      };

      result = [...result].sort((a, b) => {
        const pa = priorityOrder[String(a.prioritas || "").toLowerCase()] || 99;
        const pb = priorityOrder[String(b.prioritas || "").toLowerCase()] || 99;

        return pa - pb;
      });
    }

    if (sortMode === "status") {
      result = [...result].sort((a, b) =>
        String(a.status || "").localeCompare(String(b.status || ""))
      );
    }

    if (sortMode === "name") {
      result = [...result].sort((a, b) =>
        String(a.nama_pelapor || "").localeCompare(
          String(b.nama_pelapor || "")
        )
      );
    }

    return result;
  }, [data, search, sortMode]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedData.length / ITEMS_PER_PAGE)
  );

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;

    return filteredAndSortedData.slice(startIndex, endIndex);
  }, [filteredAndSortedData, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortMode]);

  const getStatusClass = (status: string) => {
    const normalized = String(status || "").toLowerCase();

    if (
      normalized.includes("selesai") ||
      normalized.includes("terverifikasi") ||
      normalized.includes("ditangani")
    ) {
      return "done";
    }

    return "pending";
  };

  const handleSort = () => {
    if (sortMode === "latest") {
      setSortMode("priority");
    } else if (sortMode === "priority") {
      setSortMode("status");
    } else if (sortMode === "status") {
      setSortMode("name");
    } else {
      setSortMode("latest");
    }
  };

  const getSortLabel = () => {
    if (sortMode === "latest") return "Sort";
    if (sortMode === "priority") return "Sort: Prioritas";
    if (sortMode === "status") return "Sort: Status";
    return "Sort: Nama";
  };

  const openDownloadModal = () => {
    setShowDownloadModal(true);
  };

  const closeDownloadModal = () => {
    setShowDownloadModal(false);
  };

  const handleDownloadRekapBulanan = () => {
    const url = `${API_URL}/rekap-bulanan/download?year=${selectedYear}&month=${selectedMonth}`;
    window.open(url, "_blank");
    setShowDownloadModal(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerTop}>
        <h1 className={styles.title}>DASHBOARD HUMINT</h1>
        <div className={styles.hello}>Halo, {namaUser}</div>
      </div>

      <div className={styles.actionBar}>
        <div className={styles.search}>
          <input
            type="text"
            placeholder="Cari berdasarkan ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.buttons}>
          <button type="button" onClick={openDownloadModal}>
            Download
          </button>

          <button type="button" onClick={() => fetchHumint()}>
            Refresh
          </button>

          <button type="button" onClick={handleSort}>
            {getSortLabel()}
          </button>

          <Link href="/humint/addreport">
            <button type="button" className={styles.add}>
              ＋ Tambah Laporan
            </button>
          </Link>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Pelapor</th>
              <th>Jenis Bencana</th>
              <th>Lokasi</th>
              <th>Prioritas</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>Memuat data...</td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={7}>Belum ada data laporan</td>
              </tr>
            ) : (
              paginatedData.map((item, index) => (
                <tr key={item.laporan_id}>
                  <td>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                  <td>{item.nama_pelapor || "-"}</td>
                  <td>{item.jenis_bencana || "-"}</td>
                  <td>{item.lokasi || "-"}</td>
                  <td>{item.prioritas || "-"}</td>
                  <td>
                    <span
                      className={`${styles.statusSpan} ${
                        styles[getStatusClass(item.status)]
                      }`}
                    >
                      {item.status || "IDENTIFIKASI"}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actionCell}>
                      <Link href={`/humint/detail/${item.laporan_id}`}>
                        <button
                          type="button"
                          className={styles.simpleIcon}
                          title="Lihat"
                        >
                          👁
                        </button>
                      </Link>

                      <Link href={`/humint/edit?id=${item.laporan_id}`}>
                        <button
                          type="button"
                          className={styles.simpleIcon}
                          title="Edit"
                        >
                          ✏️
                        </button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.paginationWrap}>
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageArrow}
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          >
            {"<"}
          </button>

          <div className={styles.pageNumbers}>
            {Array.from({ length: totalPages }).map((_, index) => {
              const page = index + 1;

              return (
                <button
                  type="button"
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`${styles.pageNumber} ${
                    currentPage === page ? styles.pageNumberActive : ""
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className={styles.pageArrow}
            disabled={currentPage === totalPages}
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
          >
            {">"}
          </button>
        </div>
      </div>

      {showDownloadModal && (
        <div className={styles.modalOverlay} onClick={closeDownloadModal}>
          <div
            className={styles.downloadModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>Download Rekap Bulanan</h2>
                <p className={styles.modalDescription}>
                  Pilih bulan dan tahun laporan yang ingin diunduh dalam format
                  PDF.
                </p>
              </div>

              <button
                type="button"
                onClick={closeDownloadModal}
                className={styles.modalClose}
                aria-label="Tutup popup"
              >
                ×
              </button>
            </div>

            <div className={styles.modalForm}>
              <div className={styles.modalField}>
                <label htmlFor="download-month">Bulan</label>

                <select
                  id="download-month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {MONTH_OPTIONS.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.modalField}>
                <label htmlFor="download-year">Tahun</label>

                <select
                  id="download-year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={closeDownloadModal}
                className={styles.modalCancel}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleDownloadRekapBulanan}
                className={styles.modalDownload}
              >
                Download PDF Rekap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}