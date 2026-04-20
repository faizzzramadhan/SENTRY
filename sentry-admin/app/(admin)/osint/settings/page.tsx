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

type TextModalMode =
  | null
  | "addKelurahan"
  | "editKelurahan"
  | "addKeyword"
  | "editKeyword";

type KecamatanApiRow = {
  kecamatan_id: number;
  nama_kecamatan: string;
  geojson: string | null;
  latitude_center: string | number | null;
  longitude_center: string | number | null;
  created_by: string;
  creation_date: string;
  last_updated_by: string;
  last_update_date: string;
};

type KelurahanApiRow = {
  kelurahan_id: number;
  id_kecamatan: number | null;
  nama_kelurahan: string;
  geojson: string | null;
  latitude_center: string | number | null;
  longitude_center: string | number | null;
  created_by: string;
  creation_date: string;
  last_updated_by: string;
  last_update_date: string;
  kecamatan?: {
    kecamatan_id: number;
    nama_kecamatan: string;
  } | null;
};

type KeywordApiRow = {
  keyword_id: number;
  keyword: string;
  created_by: string;
  creation_date: string;
  last_updated_by: string;
  last_update_date: string;
};

type KpiApi = {
  osint_settings_id: number | null;
  set_jumlah_postingan: number;
  set_jumlah_like: number;
  set_jumlah_comment: number;
  set_jumlah_share: number;
  last_updated_by: string | null;
  last_update_date: string | null;
};

type FrontendSettingsResponse = {
  count_kelurahan: number;
  count_keyword: number;
  daftar_kelurahan: KelurahanApiRow[];
  daftar_keyword: KeywordApiRow[];
  nilai_kpi: KpiApi;
};

type KecamatanResponse = {
  count: number;
  data_kecamatan: KecamatanApiRow[];
};

type AreaRow = {
  id: number;
  idKecamatan: number | null;
  namaKecamatan: string;
  kelurahan: string;
  geojson: string;
  latitudeCenter: string;
  longitudeCenter: string;
  createdBy: string;
  updatedAt: string;
  updatedAtRaw: string;
};

type KeywordRow = {
  id: number;
  keyword: string;
  createdBy: string;
  updatedAt: string;
  updatedAtRaw: string;
};

type KelurahanForm = {
  id_kecamatan: string;
  nama_kelurahan: string;
  geojson: string;
  latitude_center: string;
  longitude_center: string;
};

type KelurahanModalProps = {
  open: boolean;
  mode: "add" | "edit" | null;
  form: KelurahanForm;
  kecamatanOptions: KecamatanApiRow[];
  saving: boolean;
  errorMsg: string;
  onChange: (field: keyof KelurahanForm, value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

type TextEntryModalProps = {
  open: boolean;
  title: string;
  label: string;
  placeholder: string;
  value: string;
  saving: boolean;
  errorMsg: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

type MetricModalProps = {
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
};

const emptyKelurahanForm: KelurahanForm = {
  id_kecamatan: "",
  nama_kelurahan: "",
  geojson: "",
  latitude_center: "",
  longitude_center: "",
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

function getTextModalConfig(mode: TextModalMode) {
  switch (mode) {
    case "addKeyword":
      return {
        title: "Tambah data Keyword",
        label: "Tambah data Keyword",
        placeholder: "isi data keyword disini....",
      };
    case "editKeyword":
      return {
        title: "Edit data Keyword",
        label: "Edit data Keyword",
        placeholder: "isi data keyword disini....",
      };
    default:
      return {
        title: "",
        label: "",
        placeholder: "",
      };
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
      <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12h11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20L16.65 16.65" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

function KelurahanModal({
  open,
  mode,
  form,
  kecamatanOptions,
  saving,
  errorMsg,
  onChange,
  onClose,
  onSave,
}: KelurahanModalProps) {
  if (!open) return null;

  const isEdit = mode === "edit";

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className={`${styles.modalCard} ${styles.textModalCard}`}>
        <div className={styles.modalLabel}>
          Kecamatan<span className={styles.modalRequired}>*</span>
        </div>
        <select
          className={styles.modalInput}
          value={form.id_kecamatan}
          onChange={(e) => onChange("id_kecamatan", e.target.value)}
        >
          <option value="">Pilih kecamatan</option>
          {kecamatanOptions.map((item) => (
            <option key={item.kecamatan_id} value={item.kecamatan_id}>
              {item.nama_kecamatan}
            </option>
          ))}
        </select>

        <div className={styles.modalLabel}>
          Nama Kelurahan<span className={styles.modalRequired}>*</span>
        </div>
        <input
          className={styles.modalInput}
          type="text"
          placeholder="isi data kelurahan disini...."
          value={form.nama_kelurahan}
          onChange={(e) => onChange("nama_kelurahan", e.target.value)}
        />

        <div className={styles.modalLabel}>GeoJSON</div>
        <textarea
          className={styles.modalInput}
          placeholder='contoh: {"type":"Polygon","coordinates":[]}'
          value={form.geojson}
          onChange={(e) => onChange("geojson", e.target.value)}
          rows={5}
        />

        <div className={styles.modalLabel}>Latitude Center</div>
        <input
          className={styles.modalInput}
          type="text"
          placeholder="contoh: -7.9528300000000000"
          value={form.latitude_center}
          onChange={(e) => onChange("latitude_center", e.target.value)}
        />

        <div className={styles.modalLabel}>Longitude Center</div>
        <input
          className={styles.modalInput}
          type="text"
          placeholder="contoh: 112.6154300000000000"
          value={form.longitude_center}
          onChange={(e) => onChange("longitude_center", e.target.value)}
        />

        {isEdit ? null : null}

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

function TextEntryModal({
  open,
  title,
  label,
  placeholder,
  value,
  saving,
  errorMsg,
  onChange,
  onClose,
  onSave,
}: TextEntryModalProps) {
  if (!open) return null;

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className={`${styles.modalCard} ${styles.textModalCard}`}>
        <div className={styles.modalLabel}>
          {label}
          <span className={styles.modalRequired}>*</span>
        </div>

        <input
          className={styles.modalInput}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />

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
}: MetricModalProps) {
  if (!open) return null;

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className={`${styles.modalCard} ${styles.metricModalCard}`}>
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

  const [kecamatanRows, setKecamatanRows] = useState<KecamatanApiRow[]>([]);
  const [areaRows, setAreaRows] = useState<AreaRow[]>([]);
  const [keywordRows, setKeywordRows] = useState<KeywordRow[]>([]);
  const [kpiData, setKpiData] = useState<KpiApi>({
    osint_settings_id: null,
    set_jumlah_postingan: 0,
    set_jumlah_like: 0,
    set_jumlah_comment: 0,
    set_jumlah_share: 0,
    last_updated_by: null,
    last_update_date: null,
  });

  const [search, setSearch] = useState("");
  const [selectedKelurahan, setSelectedKelurahan] = useState<string>("Semua");
  const [sortType, setSortType] = useState<SortType>("newest");
  const [openFilter, setOpenFilter] = useState(false);

  const [keywordSearch, setKeywordSearch] = useState("");
  const [keywordSortType, setKeywordSortType] = useState<SortType>("newest");

  const [areaPage, setAreaPage] = useState(1);
  const [keywordPage, setKeywordPage] = useState(1);

  const [textModalMode, setTextModalMode] = useState<TextModalMode>(null);
  const [textModalValue, setTextModalValue] = useState("");
  const [activeKelurahanId, setActiveKelurahanId] = useState<number | null>(null);
  const [activeKeywordId, setActiveKeywordId] = useState<number | null>(null);

  const [kelurahanModalMode, setKelurahanModalMode] = useState<"add" | "edit" | null>(null);
  const [kelurahanForm, setKelurahanForm] = useState<KelurahanForm>(emptyKelurahanForm);

  const [metricModalField, setMetricModalField] = useState<MetricField | null>(null);
  const [metricModalValue, setMetricModalValue] = useState("0");

  const [modalSaving, setModalSaving] = useState(false);
  const [modalErrorMsg, setModalErrorMsg] = useState("");

  const token = useMemo(
    () => (typeof window !== "undefined" ? localStorage.getItem("token") : null),
    []
  );

  const textModalConfig = useMemo(() => getTextModalConfig(textModalMode), [textModalMode]);

  useEffect(() => {
    const payload = token ? decodeJwtPayload(token) : null;

    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (payload?.usr_role === "admin") {
      window.location.href = "/manage-staff";
      return;
    }

    const name =
      payload?.usr_nama_lengkap ||
      payload?.usr_email ||
      "User";

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

        const [settingsRes, kecamatanRes] = await Promise.all([
          fetch(`${API_BASE_URL}/osint/settings/frontend`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_BASE_URL}/osint/kecamatan`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        const settingsData: FrontendSettingsResponse | { message?: string } =
          await settingsRes.json();
        const kecamatanData: KecamatanResponse | { message?: string } =
          await kecamatanRes.json();

        if (!settingsRes.ok) {
          setErrorMsg((settingsData as any)?.message || "Gagal mengambil data settings OSINT");
          return;
        }

        if (!kecamatanRes.ok) {
          setErrorMsg((kecamatanData as any)?.message || "Gagal mengambil data kecamatan");
          return;
        }

        const response = settingsData as FrontendSettingsResponse;
        const responseKecamatan = kecamatanData as KecamatanResponse;

        const mappedAreaRows: AreaRow[] = (response.daftar_kelurahan || []).map((item) => ({
          id: item.kelurahan_id,
          idKecamatan: item.id_kecamatan ?? null,
          namaKecamatan: item.kecamatan?.nama_kecamatan || "-",
          kelurahan: item.nama_kelurahan,
          geojson: item.geojson || "",
          latitudeCenter:
            item.latitude_center !== null && item.latitude_center !== undefined
              ? String(item.latitude_center)
              : "",
          longitudeCenter:
            item.longitude_center !== null && item.longitude_center !== undefined
              ? String(item.longitude_center)
              : "",
          createdBy: item.created_by,
          updatedAt: formatDateTime(item.last_update_date),
          updatedAtRaw: item.last_update_date,
        }));

        const mappedKeywordRows: KeywordRow[] = (response.daftar_keyword || []).map((item) => ({
          id: item.keyword_id,
          keyword: item.keyword,
          createdBy: item.created_by,
          updatedAt: formatDateTime(item.last_update_date),
          updatedAtRaw: item.last_update_date,
        }));

        const mappedKpi: KpiApi = {
          osint_settings_id: response.nilai_kpi?.osint_settings_id ?? null,
          set_jumlah_postingan: Number(response.nilai_kpi?.set_jumlah_postingan ?? 0),
          set_jumlah_like: Number(response.nilai_kpi?.set_jumlah_like ?? 0),
          set_jumlah_comment: Number(response.nilai_kpi?.set_jumlah_comment ?? 0),
          set_jumlah_share: Number(response.nilai_kpi?.set_jumlah_share ?? 0),
          last_updated_by: response.nilai_kpi?.last_updated_by ?? null,
          last_update_date: response.nilai_kpi?.last_update_date ?? null,
        };

        setKecamatanRows(responseKecamatan.data_kecamatan || []);
        setAreaRows(mappedAreaRows);
        setKeywordRows(mappedKeywordRows);
        setKpiData(mappedKpi);
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

  const closeTextModal = () => {
    if (modalSaving) return;
    setTextModalMode(null);
    setTextModalValue("");
    setActiveKeywordId(null);
    setModalErrorMsg("");
  };

  const closeKelurahanModal = () => {
    if (modalSaving) return;
    setKelurahanModalMode(null);
    setKelurahanForm(emptyKelurahanForm);
    setActiveKelurahanId(null);
    setModalErrorMsg("");
  };

  const closeMetricModal = () => {
    if (modalSaving) return;
    setMetricModalField(null);
    setMetricModalValue("0");
    setModalErrorMsg("");
  };

  const openAddKelurahan = () => {
    setKelurahanModalMode("add");
    setKelurahanForm(emptyKelurahanForm);
    setActiveKelurahanId(null);
    setModalErrorMsg("");
  };

  const openEditKelurahan = (row: AreaRow) => {
    setKelurahanModalMode("edit");
    setKelurahanForm({
      id_kecamatan: row.idKecamatan ? String(row.idKecamatan) : "",
      nama_kelurahan: row.kelurahan,
      geojson: row.geojson || "",
      latitude_center: row.latitudeCenter || "",
      longitude_center: row.longitudeCenter || "",
    });
    setActiveKelurahanId(row.id);
    setModalErrorMsg("");
  };

  const openAddKeyword = () => {
    setTextModalMode("addKeyword");
    setTextModalValue("");
    setActiveKeywordId(null);
    setModalErrorMsg("");
  };

  const openEditKeyword = (row: KeywordRow) => {
    setTextModalMode("editKeyword");
    setTextModalValue(row.keyword);
    setActiveKeywordId(row.id);
    setModalErrorMsg("");
  };

  const openMetricModal = (field: MetricField) => {
    setMetricModalField(field);
    setMetricModalValue(String(kpiData[field] ?? 0));
    setModalErrorMsg("");
  };

  const handleKelurahanFormChange = (field: keyof KelurahanForm, value: string) => {
    setKelurahanForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveKelurahanModal = async () => {
    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (!kelurahanForm.id_kecamatan.trim()) {
      setModalErrorMsg("Kecamatan wajib dipilih.");
      return;
    }

    if (!kelurahanForm.nama_kelurahan.trim()) {
      setModalErrorMsg("Nama kelurahan wajib diisi.");
      return;
    }

    try {
      setModalSaving(true);
      setModalErrorMsg("");

      const isEdit = kelurahanModalMode === "edit";
      const url = isEdit
        ? `${API_BASE_URL}/osint/kelurahan/${activeKelurahanId}`
        : `${API_BASE_URL}/osint/kelurahan`;

      const body: Record<string, any> = {
        id_kecamatan: Number(kelurahanForm.id_kecamatan),
        nama_kelurahan: kelurahanForm.nama_kelurahan.trim(),
        geojson: kelurahanForm.geojson.trim() || null,
        latitude_center: kelurahanForm.latitude_center.trim() || null,
        longitude_center: kelurahanForm.longitude_center.trim() || null,
      };

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setModalErrorMsg(data?.message || "Gagal menyimpan data kelurahan.");
        return;
      }

      closeKelurahanModal();
      await fetchSettingsData(false);
    } catch (err: any) {
      setModalErrorMsg(err?.message || "Terjadi error saat menyimpan kelurahan.");
    } finally {
      setModalSaving(false);
    }
  };

  const saveTextModal = async () => {
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const trimmed = textModalValue.trim();
    if (!trimmed) {
      setModalErrorMsg("Field wajib diisi.");
      return;
    }

    try {
      setModalSaving(true);
      setModalErrorMsg("");

      let url = "";
      let method: "POST" | "PUT" = "POST";
      let body: Record<string, any> = {};

      if (textModalMode === "addKeyword") {
        url = `${API_BASE_URL}/osint/keyword`;
        method = "POST";
        body = { keyword: trimmed };
      } else if (textModalMode === "editKeyword") {
        if (!activeKeywordId) {
          setModalErrorMsg("ID keyword tidak valid.");
          return;
        }
        url = `${API_BASE_URL}/osint/keyword/${activeKeywordId}`;
        method = "PUT";
        body = { keyword: trimmed };
      } else {
        return;
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setModalErrorMsg(data?.message || "Gagal menyimpan data.");
        return;
      }

      closeTextModal();
      await fetchSettingsData(false);
    } catch (err: any) {
      setModalErrorMsg(err?.message || "Terjadi error saat menyimpan.");
    } finally {
      setModalSaving(false);
    }
  };

  const saveMetricModal = async () => {
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

      const isUpdate = Boolean(kpiData.osint_settings_id);
      const url = isUpdate
        ? `${API_BASE_URL}/osint/settings/${kpiData.osint_settings_id}`
        : `${API_BASE_URL}/osint/settings`;

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

  const kelurahanOptions = useMemo(() => {
    const uniqueKelurahan = Array.from(new Set(areaRows.map((row) => row.kelurahan)));
    return ["Semua", ...uniqueKelurahan];
  }, [areaRows]);

  const filteredAreaRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const result = areaRows.filter((row) => {
      const matchSearch =
        keyword === ""
          ? true
          : [
              row.kelurahan,
              row.namaKecamatan,
              row.createdBy,
              row.updatedAt,
              row.latitudeCenter,
              row.longitudeCenter,
            ]
              .join(" ")
              .toLowerCase()
              .includes(keyword);

      const matchKelurahan =
        selectedKelurahan === "Semua" ? true : row.kelurahan === selectedKelurahan;

      return matchSearch && matchKelurahan;
    });

    return [...result].sort((a, b) => {
      const timeA = parseDate(a.updatedAtRaw);
      const timeB = parseDate(b.updatedAtRaw);
      return sortType === "newest" ? timeB - timeA : timeA - timeB;
    });
  }, [areaRows, search, selectedKelurahan, sortType]);

  const filteredKeywordRows = useMemo(() => {
    const keyword = keywordSearch.trim().toLowerCase();

    const result = keywordRows.filter((row) => {
      if (!keyword) return true;

      return [row.keyword, row.createdBy]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });

    return [...result].sort((a, b) => {
      const timeA = parseDate(a.updatedAtRaw);
      const timeB = parseDate(b.updatedAtRaw);
      return keywordSortType === "newest" ? timeB - timeA : timeA - timeB;
    });
  }, [keywordRows, keywordSearch, keywordSortType]);

  const areaRowsPerPage = 15;
  const keywordRowsPerPage = 15;

  const areaTotalPages = Math.max(1, Math.ceil(filteredAreaRows.length / areaRowsPerPage));
  const keywordTotalPages = Math.max(1, Math.ceil(filteredKeywordRows.length / keywordRowsPerPage));

  const currentAreaRows = filteredAreaRows.slice(
    (areaPage - 1) * areaRowsPerPage,
    areaPage * areaRowsPerPage
  );

  const currentKeywordRows = filteredKeywordRows.slice(
    (keywordPage - 1) * keywordRowsPerPage,
    keywordPage * keywordRowsPerPage
  );

  const visibleAreaPages = getVisiblePages(areaPage, areaTotalPages);
  const visibleKeywordPages = getVisiblePages(keywordPage, keywordTotalPages);

  useEffect(() => {
    setAreaPage(1);
  }, [search, selectedKelurahan, sortType]);

  useEffect(() => {
    setKeywordPage(1);
  }, [keywordSearch, keywordSortType]);

  useEffect(() => {
    if (areaPage > areaTotalPages) setAreaPage(areaTotalPages);
  }, [areaPage, areaTotalPages]);

  useEffect(() => {
    if (keywordPage > keywordTotalPages) setKeywordPage(keywordTotalPages);
  }, [keywordPage, keywordTotalPages]);

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

            <div className={styles.tablesGrid}>
              <div className={styles.tableSection}>
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
                          <div className={styles.dropdownTitle}>Filter by Kelurahan</div>

                          <div className={styles.dropdownOptionList}>
                            {kelurahanOptions.map((item) => (
                              <button
                                key={item}
                                type="button"
                                className={`${styles.dropdownOption} ${
                                  selectedKelurahan === item ? styles.dropdownOptionActive : ""
                                }`}
                                onClick={() => {
                                  setSelectedKelurahan(item);
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

                    <button type="button" className={styles.addButton} onClick={openAddKelurahan}>
                      <PlusIcon />
                      <span>Tambah Kelurahan</span>
                    </button>
                  </div>
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Kecamatan</th>
                        <th>Kelurahan</th>
                        <th>Latitude Center</th>
                        <th>Longitude Center</th>
                        <th>Created By</th>
                        <th>Last Updated Date</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentAreaRows.length > 0 ? (
                        currentAreaRows.map((row, index) => (
                          <tr key={`kelurahan-${row.id}`}>
                            <td>{(areaPage - 1) * areaRowsPerPage + index + 1}</td>
                            <td>{row.namaKecamatan}</td>
                            <td>{row.kelurahan}</td>
                            <td>{row.latitudeCenter || "-"}</td>
                            <td>{row.longitudeCenter || "-"}</td>
                            <td>{row.createdBy}</td>
                            <td>{row.updatedAt}</td>
                            <td>
                              <button
                                type="button"
                                className={styles.actionButton}
                                aria-label="Edit kelurahan"
                                onClick={() => openEditKelurahan(row)}
                              >
                                <PencilIcon />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className={styles.emptyState}>
                            Data kelurahan tidak ditemukan.
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
                      onClick={() => setAreaPage((prev) => Math.max(1, prev - 1))}
                      disabled={areaPage === 1}
                    >
                      <ChevronLeftIcon />
                    </button>

                    <div className={styles.pageNumbers}>
                      {visibleAreaPages.map((item, index) =>
                        item === "..." ? (
                          <span key={`area-dots-${index}`} className={styles.pageDots}>
                            ...
                          </span>
                        ) : (
                          <button
                            key={`area-page-${item}`}
                            type="button"
                            className={`${styles.pageNumber} ${
                              areaPage === item ? styles.pageNumberActive : ""
                            }`}
                            onClick={() => setAreaPage(Number(item))}
                          >
                            {item}
                          </button>
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      className={styles.pageArrow}
                      onClick={() => setAreaPage((prev) => Math.min(areaTotalPages, prev + 1))}
                      disabled={areaPage === areaTotalPages}
                    >
                      <ChevronRightIcon />
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.tableSection}>
                <div className={styles.controlBar}>
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
                    <button
                      type="button"
                      className={styles.toolbarButton}
                      onClick={() =>
                        setKeywordSortType((prev) => (prev === "newest" ? "oldest" : "newest"))
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
                            <td>{(keywordPage - 1) * keywordRowsPerPage + index + 1}</td>
                            <td>{row.keyword}</td>
                            <td>{row.createdBy}</td>
                            <td>{row.updatedAt}</td>
                            <td>
                              <button
                                type="button"
                                className={styles.actionButton}
                                aria-label="Edit keyword"
                                onClick={() => openEditKeyword(row)}
                              >
                                <PencilIcon />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className={styles.emptyState}>
                            Data keyword tidak ditemukan.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className={styles.paginationWrap}>
                  <div className={`${styles.pagination} ${styles.smallPagination}`}>
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
                          <span key={`keyword-dots-${index}`} className={styles.pageDots}>
                            ...
                          </span>
                        ) : (
                          <button
                            key={`keyword-page-${item}`}
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
                      onClick={() => setKeywordPage((prev) => Math.min(keywordTotalPages, prev + 1))}
                      disabled={keywordPage === keywordTotalPages}
                    >
                      <ChevronRightIcon />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <KelurahanModal
        open={kelurahanModalMode !== null}
        mode={kelurahanModalMode}
        form={kelurahanForm}
        kecamatanOptions={kecamatanRows}
        saving={modalSaving}
        errorMsg={modalErrorMsg}
        onChange={handleKelurahanFormChange}
        onClose={closeKelurahanModal}
        onSave={saveKelurahanModal}
      />

      <TextEntryModal
        open={textModalMode !== null}
        title={textModalConfig.title}
        label={textModalConfig.label}
        placeholder={textModalConfig.placeholder}
        value={textModalValue}
        saving={modalSaving}
        errorMsg={modalErrorMsg}
        onChange={setTextModalValue}
        onClose={closeTextModal}
        onSave={saveTextModal}
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
        onSave={saveMetricModal}
      />
    </>
  );
}