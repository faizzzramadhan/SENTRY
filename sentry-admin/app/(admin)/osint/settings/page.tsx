"use client";

import styles from "./settings.module.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5555";

const API_ROOT_URL = RAW_API_BASE_URL
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api\/humint$/i, "")
  .replace(/\/humint$/i, "")
  .replace(/\/api$/i, "");

function apiUrl(path: string) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_ROOT_URL}${cleanPath}`;
}

type ApiMessage = { message?: string };

async function readApiJson<T>(res: Response): Promise<T & ApiMessage> {
  const contentType = res.headers.get("content-type") || "";
  const rawText = await res.text();

  if (!contentType.includes("application/json")) {
    const preview = rawText.trim().slice(0, 160);
    throw new Error(
      `Endpoint tidak mengembalikan JSON. Periksa route backend. Response awal: ${
        preview || "kosong"
      }`
    );
  }

  try {
    return JSON.parse(rawText) as T & ApiMessage;
  } catch {
    throw new Error("Response API bukan JSON yang valid.");
  }
}

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
type KeywordApiRow = {
  keyword_id: number;
  keyword: string;
  created_by: string;
  creation_date: string;
  last_updated_by: string;
  last_update_date: string;
};

type FrontendSettingsResponse = {
  count_keyword: number;
  daftar_keyword: KeywordApiRow[];
  nilai_kpi?: unknown;
};

type KeywordRow = {
  id: number;
  keyword: string;
  createdBy: string;
  updatedAt: string;
  updatedAtRaw: string;
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function parseDate(dateString: string) {
  return new Date(dateString).getTime();
}

function getVisiblePages(currentPage: number, totalPages: number): Array<number | "..."> {
  if (totalPages <= 4) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 2) return [1, 2, 3, "..."];
  if (currentPage >= totalPages - 1) return ["...", totalPages - 2, totalPages - 1, totalPages];
  return [currentPage - 1, currentPage, currentPage + 1, "..."];
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.backIcon} aria-hidden="true">
      <path
        d="M15 5l-7 7 7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 12h11"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M20 20L16.65 16.65"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
      <path
        d="M15 5l-7 7 7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.pageArrowIcon} aria-hidden="true">
      <path
        d="M9 5l7 7-7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KeywordModal({
  open,
  value,
  saving,
  errorMsg,
  onChange,
  onClose,
  onSave,
  isEdit,
}: {
  open: boolean;
  value: string;
  saving: boolean;
  errorMsg: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  isEdit: boolean;
}) {
  if (!open) return null;

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className={styles.formModalCard}>
        <div className={styles.formField}>
          <label className={styles.modalLabel}>
            {isEdit ? "Edit data Keyword" : "Tambah data Keyword"}
            <span className={styles.modalRequired}>*</span>
          </label>
          <input
            className={styles.modalInput}
            type="text"
            placeholder="isi data keyword disini...."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
          />
        </div>

        {errorMsg ? <div className={styles.modalError}>{errorMsg}</div> : null}

        <button
          type="button"
          className={styles.modalSaveButton}
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

export default function SettingsOsintPage() {
  const router = useRouter();

  const [userName, setUserName] = useState("User");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [keywordRows, setKeywordRows] = useState<KeywordRow[]>([]);

  const [keywordSearch, setKeywordSearch] = useState("");
  const [keywordSort, setKeywordSort] = useState<SortType>("newest");
  const [keywordPage, setKeywordPage] = useState(1);

  const [selectedKeywordIds, setSelectedKeywordIds] = useState<Set<number>>(new Set());

  const [keywordModalOpen, setKeywordModalOpen] = useState(false);
  const [keywordModalValue, setKeywordModalValue] = useState("");
  const [activeKeywordId, setActiveKeywordId] = useState<number | null>(null);


  const [modalSaving, setModalSaving] = useState(false);
  const [modalErrorMsg, setModalErrorMsg] = useState("");

  const token = useMemo(
    () => (typeof window !== "undefined" ? localStorage.getItem("token") : null),
    []
  );

  useEffect(() => {
    const payload = token ? decodeJwtPayload(token) : null;

    if (!token) {
      window.location.href = "/login";
      return;
    }

    const name = payload?.usr_nama_lengkap || payload?.usr_email || "User";
    setUserName(name);
  }, [token]);

  const fetchSettingsData = useCallback(
    async (withLoading = true) => {
      setErrorMsg("");

      if (!token) {
        window.location.href = "/login";
        return;
      }

      try {
        if (withLoading) setLoading(true);

        const res = await fetch(apiUrl("/osint/kpi/frontend"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await readApiJson<FrontendSettingsResponse>(res);

        if (!res.ok) {
          setErrorMsg((data as any)?.message || "Gagal mengambil data pengaturan OSINT");
          return;
        }

        const response = data as FrontendSettingsResponse;

        const mappedKeywordRows: KeywordRow[] = (response.daftar_keyword || []).map((item) => ({
          id: item.keyword_id,
          keyword: item.keyword,
          createdBy: item.created_by,
          updatedAt: formatDateTime(item.last_update_date),
          updatedAtRaw: item.last_update_date,
        }));

        setKeywordRows(mappedKeywordRows);
      } catch (err: any) {
        setErrorMsg(err?.message || "Terjadi error saat mengambil data");
      } finally {
        if (withLoading) setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchSettingsData(true);
  }, [fetchSettingsData]);

  const filteredKeywordRows = useMemo(() => {
    const keyword = keywordSearch.trim().toLowerCase();

    const rows = keywordRows.filter((row) =>
      [row.keyword, row.createdBy, row.updatedAt].join(" ").toLowerCase().includes(keyword)
    );

    return [...rows].sort((a, b) => {
      const ta = parseDate(a.updatedAtRaw);
      const tb = parseDate(b.updatedAtRaw);
      return keywordSort === "newest" ? tb - ta : ta - tb;
    });
  }, [keywordRows, keywordSearch, keywordSort]);

  const rowsPerPage = 15;
  const keywordTotalPages = Math.max(1, Math.ceil(filteredKeywordRows.length / rowsPerPage));

  const currentKeywordRows = filteredKeywordRows.slice(
    (keywordPage - 1) * rowsPerPage,
    keywordPage * rowsPerPage
  );

  useEffect(() => {
    setKeywordPage(1);
  }, [keywordSearch, keywordSort]);

  useEffect(() => {
    if (keywordPage > keywordTotalPages) {
      setKeywordPage(keywordTotalPages);
    }
  }, [keywordPage, keywordTotalPages]);

  const toggleKeywordRow = (id: number) => {
    setSelectedKeywordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allKeywordChecked =
    currentKeywordRows.length > 0 &&
    currentKeywordRows.every((row) => selectedKeywordIds.has(row.id));

  const toggleAllKeyword = () => {
    setSelectedKeywordIds((prev) => {
      const next = new Set(prev);
      if (allKeywordChecked) {
        currentKeywordRows.forEach((row) => next.delete(row.id));
      } else {
        currentKeywordRows.forEach((row) => next.add(row.id));
      }
      return next;
    });
  };

  const openAddKeyword = () => {
    setKeywordModalOpen(true);
    setKeywordModalValue("");
    setActiveKeywordId(null);
    setModalErrorMsg("");
  };

  const openEditKeyword = (row: KeywordRow) => {
    setKeywordModalOpen(true);
    setKeywordModalValue(row.keyword);
    setActiveKeywordId(row.id);
    setModalErrorMsg("");
  };

  const closeKeywordModal = () => {
    if (modalSaving) return;
    setKeywordModalOpen(false);
    setKeywordModalValue("");
    setActiveKeywordId(null);
    setModalErrorMsg("");
  };


  const saveKeyword = async () => {
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const trimmed = keywordModalValue.trim();
    if (!trimmed) {
      setModalErrorMsg("Keyword wajib diisi.");
      return;
    }

    try {
      setModalSaving(true);
      setModalErrorMsg("");

      const isEdit = Boolean(activeKeywordId);
      const url = isEdit
        ? apiUrl(`/osint/keyword/${activeKeywordId}`)
        : apiUrl("/osint/keyword");

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ keyword: trimmed }),
      });

      const data = await readApiJson<ApiMessage>(res);

      if (!res.ok) {
        setModalErrorMsg(data?.message || "Gagal menyimpan data keyword.");
        return;
      }

      closeKeywordModal();
      await fetchSettingsData(false);
    } catch (err: any) {
      setModalErrorMsg(err?.message || "Terjadi error saat menyimpan keyword.");
    } finally {
      setModalSaving(false);
    }
  };

  const bulkDeleteKeyword = async () => {
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const ids = Array.from(selectedKeywordIds);
    if (ids.length === 0) return;

    const confirmed = window.confirm(`Hapus ${ids.length} data keyword terpilih?`);
    if (!confirmed) return;

    try {
      setLoading(true);
      setErrorMsg("");

      const res = await fetch(apiUrl("/osint/keyword/bulk-delete"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids }),
      });

      const data = await readApiJson<ApiMessage>(res);

      if (!res.ok) {
        setErrorMsg(data?.message || "Gagal menghapus data keyword.");
        return;
      }

      setSelectedKeywordIds(new Set());
      await fetchSettingsData(false);
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi error saat menghapus data keyword.");
    } finally {
      setLoading(false);
    }
  };

  const visibleKeywordPages = getVisiblePages(keywordPage, keywordTotalPages);

  return (
    <>
      <div className={styles.page}>
        <div className={styles.topRow}>
          <div className={styles.titleWrap}>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => router.push("/osint")}
              aria-label="Kembali"
            >
              <BackIcon />
            </button>

            <h1 className={styles.pageTitle}>PENGATURAN OSINT</h1>
          </div>

          <div className={styles.hello}>Halo, {userName}</div>
        </div>

        {errorMsg ? (
          <div className={`${styles.dataState} ${styles.errorState}`}>{errorMsg}</div>
        ) : null}

        {loading ? (
          <div className={styles.dataState}>Memuat data pengaturan OSINT...</div>
        ) : (
          <>
            <section className={styles.keywordOnlySection}>
              <div className={styles.panelToolbar}>
                <div className={styles.searchBox}>
                  <span className={styles.searchIconWrap}>
                    <SearchIcon />
                  </span>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Cari berdasarkan ..."
                    value={keywordSearch}
                    onChange={(e) => setKeywordSearch(e.target.value)}
                  />
                </div>

                <div className={styles.actionsGroup}>
                  {selectedKeywordIds.size > 0 ? (
                    <button
                      type="button"
                      className={styles.dangerButton}
                      onClick={bulkDeleteKeyword}
                    >
                      Hapus Terpilih ({selectedKeywordIds.size})
                    </button>
                  ) : null}

                  <button
                    type="button"
                    className={styles.toolbarButton}
                    onClick={() =>
                      setKeywordSort((prev) => (prev === "newest" ? "oldest" : "newest"))
                    }
                  >
                    <SortIcon />
                    <span>Sort</span>
                  </button>

                  <button type="button" className={styles.addButton} onClick={openAddKeyword}>
                    <PlusIcon />
                    <span>Tambah Keyword</span>
                  </button>
                </div>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.checkboxCol}>
                        <input
                          type="checkbox"
                          className={styles.checkInput}
                          checked={allKeywordChecked}
                          onChange={toggleAllKeyword}
                        />
                      </th>
                      <th>No</th>
                      <th>Keyword</th>
                      <th>Created By</th>
                      <th>Last Updated Date</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentKeywordRows.length > 0 ? (
                      currentKeywordRows.map((row, index) => (
                        <tr key={`keyword-${row.id}`}>
                          <td className={styles.checkboxCol}>
                            <input
                              type="checkbox"
                              className={styles.checkInput}
                              checked={selectedKeywordIds.has(row.id)}
                              onChange={() => toggleKeywordRow(row.id)}
                            />
                          </td>
                          <td>{(keywordPage - 1) * rowsPerPage + index + 1}</td>
                          <td>{row.keyword}</td>
                          <td>{row.createdBy}</td>
                          <td>{row.updatedAt}</td>
                          <td>
                            <button
                              type="button"
                              className={styles.actionButton}
                              onClick={() => openEditKeyword(row)}
                            >
                              <PencilIcon />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className={styles.emptyState}>
                          Data keyword tidak ditemukan.
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
                    onClick={() => setKeywordPage((prev) => Math.max(1, prev - 1))}
                    disabled={keywordPage === 1}
                  >
                    <ChevronLeftIcon />
                  </button>

                  <div className={styles.pageNumbers}>
                    {visibleKeywordPages.map((item, index) =>
                      item === "..." ? (
                        <span key={`dots-${index}`} className={styles.pageDots}>
                          ...
                        </span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          className={`${styles.pageNumber} ${
                            keywordPage === item ? styles.pageNumberActive : ""
                          }`}
                          onClick={() => setKeywordPage(Number(item))}
                        >
                          {item}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    className={styles.pageArrow}
                    onClick={() =>
                      setKeywordPage((prev) => Math.min(keywordTotalPages, prev + 1))
                    }
                    disabled={keywordPage === keywordTotalPages}
                  >
                    <ChevronRightIcon />
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      <KeywordModal
        open={keywordModalOpen}
        value={keywordModalValue}
        saving={modalSaving}
        errorMsg={modalErrorMsg}
        onChange={setKeywordModalValue}
        onClose={closeKeywordModal}
        onSave={saveKeyword}
        isEdit={Boolean(activeKeywordId)}
      />
    </>
  );
}