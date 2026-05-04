"use client";

import styles from "./settings.module.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5555";

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
type MetricField =
  | "set_jumlah_postingan"
  | "set_jumlah_like"
  | "set_jumlah_comment"
  | "set_jumlah_share";

type KeywordApiRow = {
  keyword_id: number;
  keyword: string;
  created_by: string;
  creation_date: string;
  last_updated_by: string;
  last_update_date: string;
};

type KpiApi = {
  osint_kpi_id: number | null;
  set_jumlah_postingan: number;
  set_jumlah_like: number;
  set_jumlah_comment: number;
  set_jumlah_share: number;
  last_updated_by: string | null;
  last_update_date: string | null;
};

type FrontendSettingsResponse = {
  count_keyword: number;
  daftar_keyword: KeywordApiRow[];
  nilai_kpi: KpiApi;
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

function getMetricTitle(field: MetricField | null) {
  switch (field) {
    case "set_jumlah_postingan":
      return "SET JUMLAH POSTINGAN";
    case "set_jumlah_like":
      return "SET JUMLAH LIKE";
    case "set_jumlah_comment":
      return "SET JUMLAH COMMENT";
    case "set_jumlah_share":
      return "SET JUMLAH SHARE";
    default:
      return "";
  }
}

function parseMetricInput(value: string) {
  if (value.trim() === "") return 0;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
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

function PostIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.metricIcon} aria-hidden="true">
      <path d="M4 18a10 10 0 0 0-2-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M8 18a14 14 0 0 0-4-10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 18A18 18 0 0 0 6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="5" cy="18" r="1.6" fill="currentColor" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.metricIcon} aria-hidden="true">
      <path
        d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.4A4 4 0 0 1 19 10c0 5.65-7 10-7 10Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.metricIcon} aria-hidden="true">
      <path
        d="M20 11.5A7.5 7.5 0 0 1 12.5 19H8l-4 3v-5A7.5 7.5 0 1 1 20 11.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.metricIcon} aria-hidden="true">
      <circle cx="18" cy="5" r="2.4" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="6" cy="12" r="2.4" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="19" r="2.4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8.3 11l7.2-4.2M8.3 13l7.2 4.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

function MetricModal({
  open,
  title,
  value,
  saving,
  errorMsg,
  onChange,
  onDecrease,
  onIncrease,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  value: string;
  saving: boolean;
  errorMsg: string;
  onChange: (value: string) => void;
  onDecrease: () => void;
  onIncrease: () => void;
  onClose: () => void;
  onSave: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className={styles.metricModalCard}>
        <div className={styles.metricModalTitle}>{title}</div>

        <div className={styles.metricEditorRow}>
          <button
            type="button"
            className={styles.metricStepButton}
            onClick={onDecrease}
            disabled={saving}
            aria-label="Kurangi"
          >
            −
          </button>

          <input
            className={styles.metricNumberInput}
            type="number"
            min="0"
            inputMode="numeric"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
          />

          <button
            type="button"
            className={styles.metricStepButton}
            onClick={onIncrease}
            disabled={saving}
            aria-label="Tambah"
          >
            +
          </button>
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
  const [kpiData, setKpiData] = useState<KpiApi>({
    osint_kpi_id: null,
    set_jumlah_postingan: 0,
    set_jumlah_like: 0,
    set_jumlah_comment: 0,
    set_jumlah_share: 0,
    last_updated_by: null,
    last_update_date: null,
  });

  const [keywordSearch, setKeywordSearch] = useState("");
  const [keywordSort, setKeywordSort] = useState<SortType>("newest");
  const [keywordPage, setKeywordPage] = useState(1);

  const [selectedKeywordIds, setSelectedKeywordIds] = useState<Set<number>>(new Set());

  const [keywordModalOpen, setKeywordModalOpen] = useState(false);
  const [keywordModalValue, setKeywordModalValue] = useState("");
  const [activeKeywordId, setActiveKeywordId] = useState<number | null>(null);

  const [metricModalField, setMetricModalField] = useState<MetricField | null>(null);
  const [metricModalValue, setMetricModalValue] = useState("0");

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

        const res = await fetch(`${API_BASE_URL}/osint/kpi/frontend`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data: FrontendSettingsResponse | { message?: string } = await res.json();

        if (!res.ok) {
          setErrorMsg((data as any)?.message || "Gagal mengambil data settings OSINT");
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
        setKpiData({
          osint_kpi_id: response.nilai_kpi?.osint_kpi_id ?? null,
          set_jumlah_postingan: Number(response.nilai_kpi?.set_jumlah_postingan ?? 0),
          set_jumlah_like: Number(response.nilai_kpi?.set_jumlah_like ?? 0),
          set_jumlah_comment: Number(response.nilai_kpi?.set_jumlah_comment ?? 0),
          set_jumlah_share: Number(response.nilai_kpi?.set_jumlah_share ?? 0),
          last_updated_by: response.nilai_kpi?.last_updated_by ?? null,
          last_update_date: response.nilai_kpi?.last_update_date ?? null,
        });
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

  const openMetricModal = (field: MetricField) => {
    setMetricModalField(field);
    setMetricModalValue(String(kpiData[field] ?? 0));
    setModalErrorMsg("");
  };

  const closeMetricModal = () => {
    if (modalSaving) return;
    setMetricModalField(null);
    setMetricModalValue("0");
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
        ? `${API_BASE_URL}/osint/keyword/${activeKeywordId}`
        : `${API_BASE_URL}/osint/keyword`;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ keyword: trimmed }),
      });

      const data = await res.json();

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

      const res = await fetch(`${API_BASE_URL}/osint/keyword/bulk-delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids }),
      });

      const data = await res.json();

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

  const saveMetric = async () => {
    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (!metricModalField) return;

    const parsedValue = parseMetricInput(metricModalValue);
    if (parsedValue === null) {
      setModalErrorMsg("Nilai harus berupa angka bulat 0 atau lebih.");
      return;
    }

    try {
      setModalSaving(true);
      setModalErrorMsg("");

      const isUpdate = Boolean(kpiData.osint_kpi_id);
      const url = isUpdate
        ? `${API_BASE_URL}/osint/kpi/${kpiData.osint_kpi_id}`
        : `${API_BASE_URL}/osint/kpi`;

      const body = isUpdate
        ? { [metricModalField]: parsedValue }
        : {
            set_jumlah_postingan:
              metricModalField === "set_jumlah_postingan"
                ? parsedValue
                : kpiData.set_jumlah_postingan,
            set_jumlah_like:
              metricModalField === "set_jumlah_like"
                ? parsedValue
                : kpiData.set_jumlah_like,
            set_jumlah_comment:
              metricModalField === "set_jumlah_comment"
                ? parsedValue
                : kpiData.set_jumlah_comment,
            set_jumlah_share:
              metricModalField === "set_jumlah_share"
                ? parsedValue
                : kpiData.set_jumlah_share,
          };

      const res = await fetch(url, {
        method: isUpdate ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setModalErrorMsg(data?.message || "Gagal menyimpan KPI.");
        return;
      }

      closeMetricModal();
      await fetchSettingsData(false);
    } catch (err: any) {
      setModalErrorMsg(err?.message || "Terjadi error saat menyimpan KPI.");
    } finally {
      setModalSaving(false);
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

            <h1 className={styles.pageTitle}>SETTINGS OSINT</h1>
          </div>

          <div className={styles.hello}>Halo, {userName}</div>
        </div>

        {errorMsg ? (
          <div className={`${styles.dataState} ${styles.errorState}`}>{errorMsg}</div>
        ) : null}

        {loading ? (
          <div className={styles.dataState}>Memuat data settings OSINT...</div>
        ) : (
          <>
            <div className={styles.metricGrid}>
              <div className={styles.metricCard}>
                <div className={styles.metricTitle}>SET JUMLAH POSTINGAN</div>
                <div className={styles.metricContent}>
                  <div className={styles.metricValueWrap}>
                    <PostIcon />
                    <span className={styles.metricValue}>{kpiData.set_jumlah_postingan ?? 0}</span>
                  </div>
                  <button
                    type="button"
                    className={styles.editMiniButton}
                    onClick={() => openMetricModal("set_jumlah_postingan")}
                  >
                    <span>Edit</span>
                    <span className={styles.arrowMini}>→</span>
                  </button>
                </div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricTitle}>SET JUMLAH LIKE</div>
                <div className={styles.metricContent}>
                  <div className={styles.metricValueWrap}>
                    <HeartIcon />
                    <span className={styles.metricValue}>{kpiData.set_jumlah_like ?? 0}</span>
                  </div>
                  <button
                    type="button"
                    className={styles.editMiniButton}
                    onClick={() => openMetricModal("set_jumlah_like")}
                  >
                    <span>Edit</span>
                    <span className={styles.arrowMini}>→</span>
                  </button>
                </div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricTitle}>SET JUMLAH COMMENT</div>
                <div className={styles.metricContent}>
                  <div className={styles.metricValueWrap}>
                    <CommentIcon />
                    <span className={styles.metricValue}>{kpiData.set_jumlah_comment ?? 0}</span>
                  </div>
                  <button
                    type="button"
                    className={styles.editMiniButton}
                    onClick={() => openMetricModal("set_jumlah_comment")}
                  >
                    <span>Edit</span>
                    <span className={styles.arrowMini}>→</span>
                  </button>
                </div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricTitle}>SET JUMLAH SHARE</div>
                <div className={styles.metricContent}>
                  <div className={styles.metricValueWrap}>
                    <ShareIcon />
                    <span className={styles.metricValue}>{kpiData.set_jumlah_share ?? 0}</span>
                  </div>
                  <button
                    type="button"
                    className={styles.editMiniButton}
                    onClick={() => openMetricModal("set_jumlah_share")}
                  >
                    <span>Edit</span>
                    <span className={styles.arrowMini}>→</span>
                  </button>
                </div>
              </div>
            </div>

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

      <MetricModal
        open={metricModalField !== null}
        title={getMetricTitle(metricModalField)}
        value={metricModalValue}
        saving={modalSaving}
        errorMsg={modalErrorMsg}
        onChange={(value) => {
          if (value === "") {
            setMetricModalValue("");
            return;
          }

          if (/^\d+$/.test(value)) {
            setMetricModalValue(value);
          }
        }}
        onDecrease={() => {
          const current = parseMetricInput(metricModalValue) ?? 0;
          setMetricModalValue(String(Math.max(0, current - 1)));
        }}
        onIncrease={() => {
          const current = parseMetricInput(metricModalValue) ?? 0;
          setMetricModalValue(String(current + 1));
        }}
        onClose={closeMetricModal}
        onSave={saveMetric}
      />
    </>
  );
}