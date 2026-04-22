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

type TabKey = "kelurahan" | "kecamatan" | "keyword";
type SortType = "newest" | "oldest";
type MetricField =
  | "set_jumlah_postingan"
  | "set_jumlah_like"
  | "set_jumlah_comment"
  | "set_jumlah_share";

type KeywordModalMode = "add" | "edit" | null;
type KelurahanModalMode = "add" | "edit" | null;
type KecamatanModalMode = "add" | "edit" | null;

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
  created_by: string;
  creation_date: string;
  last_updated_by: string;
  last_update_date: string;
  kecamatan?: {
    kecamatan_id: number;
    nama_kecamatan: string;
    latitude_center: string | number | null;
    longitude_center: string | number | null;
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

type KelurahanRow = {
  id: number;
  idKecamatan: number | null;
  namaKecamatan: string;
  kelurahan: string;
  latitudeCenter: string;
  longitudeCenter: string;
  createdBy: string;
  updatedAt: string;
  updatedAtRaw: string;
};

type KecamatanRow = {
  id: number;
  kecamatan: string;
  latitudeCenter: string;
  longitudeCenter: string;
  hasGeojson: boolean;
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
};

type KecamatanForm = {
  nama_kecamatan: string;
  latitude_center: string;
  longitude_center: string;
  geojson_file: File | null;
  geojson_file_name: string;
};

const emptyKelurahanForm: KelurahanForm = {
  id_kecamatan: "",
  nama_kelurahan: "",
};

const emptyKecamatanForm: KecamatanForm = {
  nama_kecamatan: "",
  latitude_center: "",
  longitude_center: "",
  geojson_file: null,
  geojson_file_name: "",
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

function normalizeCoord(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
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

type KeywordModalProps = {
  open: boolean;
  mode: KeywordModalMode;
  value: string;
  saving: boolean;
  errorMsg: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

function KeywordModal({
  open,
  mode,
  value,
  saving,
  errorMsg,
  onChange,
  onClose,
  onSave,
}: KeywordModalProps) {
  if (!open) return null;

  const isEdit = mode === "edit";

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

type KelurahanModalProps = {
  open: boolean;
  mode: KelurahanModalMode;
  form: KelurahanForm;
  kecamatanOptions: KecamatanApiRow[];
  saving: boolean;
  errorMsg: string;
  onChange: (field: keyof KelurahanForm, value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

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
      <div className={styles.formModalCard}>
        <div className={styles.formField}>
          <label className={styles.modalLabel}>
            Kecamatan<span className={styles.modalRequired}>*</span>
          </label>
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
        </div>

        <div className={styles.formField}>
          <label className={styles.modalLabel}>
            {isEdit ? "Edit data Kelurahan" : "Tambah data Kelurahan"}
            <span className={styles.modalRequired}>*</span>
          </label>
          <input
            className={styles.modalInput}
            type="text"
            placeholder="isi data kelurahan disini...."
            value={form.nama_kelurahan}
            onChange={(e) => onChange("nama_kelurahan", e.target.value)}
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

type KecamatanModalProps = {
  open: boolean;
  mode: KecamatanModalMode;
  form: KecamatanForm;
  saving: boolean;
  errorMsg: string;
  onChange: (field: keyof KecamatanForm, value: string | File | null) => void;
  onClose: () => void;
  onSave: () => void;
};

function KecamatanModal({
  open,
  mode,
  form,
  saving,
  errorMsg,
  onChange,
  onClose,
  onSave,
}: KecamatanModalProps) {
  if (!open) return null;

  const isEdit = mode === "edit";

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
            {isEdit ? "Edit data Kecamatan" : "Tambah data Kecamatan"}
            <span className={styles.modalRequired}>*</span>
          </label>
          <input
            className={styles.modalInput}
            type="text"
            placeholder="isi data kecamatan disini...."
            value={form.nama_kecamatan}
            onChange={(e) => onChange("nama_kecamatan", e.target.value)}
          />
        </div>

        <div className={styles.formField}>
          <label className={styles.modalLabel}>
            File GeoJSON<span className={styles.modalRequired}>*</span>
          </label>
          <input
            className={styles.fileInput}
            type="file"
            accept=".json,.geojson,application/json"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              onChange("geojson_file", file);
              onChange("geojson_file_name", file?.name || "");
            }}
          />
          <div className={styles.fileHint}>
            {form.geojson_file_name
              ? `File dipilih: ${form.geojson_file_name}`
              : isEdit
              ? "Kosongkan jika tidak ingin mengganti file geojson."
              : "Upload file .json atau .geojson"}
          </div>
        </div>

        <div className={styles.formField}>
          <label className={styles.modalLabel}>Latitude Center</label>
          <input
            className={styles.modalInput}
            type="text"
            placeholder="contoh: -7.8028333"
            value={form.latitude_center}
            onChange={(e) => onChange("latitude_center", e.target.value)}
          />
        </div>

        <div className={styles.formField}>
          <label className={styles.modalLabel}>Longitude Center</label>
          <input
            className={styles.modalInput}
            type="text"
            placeholder="contoh: 110.374138"
            value={form.longitude_center}
            onChange={(e) => onChange("longitude_center", e.target.value)}
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

  const [activeTab, setActiveTab] = useState<TabKey>("kelurahan");
  const [userName, setUserName] = useState("User");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [kelurahanRows, setKelurahanRows] = useState<KelurahanRow[]>([]);
  const [kecamatanRows, setKecamatanRows] = useState<KecamatanRow[]>([]);
  const [kecamatanApiRows, setKecamatanApiRows] = useState<KecamatanApiRow[]>([]);
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

  const [kelurahanSearch, setKelurahanSearch] = useState("");
  const [kecamatanSearch, setKecamatanSearch] = useState("");
  const [keywordSearch, setKeywordSearch] = useState("");

  const [kelurahanSort, setKelurahanSort] = useState<SortType>("newest");
  const [kecamatanSort, setKecamatanSort] = useState<SortType>("newest");
  const [keywordSort, setKeywordSort] = useState<SortType>("newest");

  const [kelurahanPage, setKelurahanPage] = useState(1);
  const [kecamatanPage, setKecamatanPage] = useState(1);
  const [keywordPage, setKeywordPage] = useState(1);

  const [selectedKelurahanIds, setSelectedKelurahanIds] = useState<Set<number>>(new Set());
  const [selectedKecamatanIds, setSelectedKecamatanIds] = useState<Set<number>>(new Set());
  const [selectedKeywordIds, setSelectedKeywordIds] = useState<Set<number>>(new Set());

  const [kelurahanModalMode, setKelurahanModalMode] = useState<KelurahanModalMode>(null);
  const [kecamatanModalMode, setKecamatanModalMode] = useState<KecamatanModalMode>(null);
  const [keywordModalMode, setKeywordModalMode] = useState<KeywordModalMode>(null);

  const [kelurahanForm, setKelurahanForm] = useState<KelurahanForm>(emptyKelurahanForm);
  const [kecamatanForm, setKecamatanForm] = useState<KecamatanForm>(emptyKecamatanForm);
  const [keywordModalValue, setKeywordModalValue] = useState("");

  const [activeKelurahanId, setActiveKelurahanId] = useState<number | null>(null);
  const [activeKecamatanId, setActiveKecamatanId] = useState<number | null>(null);
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

        const [settingsRes, kecamatanRes] = await Promise.all([
          fetch(`${API_BASE_URL}/osint/settings/frontend`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/osint/kecamatan`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const settingsData: FrontendSettingsResponse | { message?: string } = await settingsRes.json();
        const kecamatanData: KecamatanResponse | { message?: string } = await kecamatanRes.json();

        if (!settingsRes.ok) {
          setErrorMsg((settingsData as any)?.message || "Gagal mengambil data settings OSINT");
          return;
        }

        if (!kecamatanRes.ok) {
          setErrorMsg((kecamatanData as any)?.message || "Gagal mengambil data kecamatan");
          return;
        }

        const settings = settingsData as FrontendSettingsResponse;
        const kecamatanResponse = kecamatanData as KecamatanResponse;

        const mappedKelurahanRows: KelurahanRow[] = (settings.daftar_kelurahan || []).map((item) => ({
          id: item.kelurahan_id,
          idKecamatan: item.id_kecamatan ?? null,
          namaKecamatan: item.kecamatan?.nama_kecamatan || "-",
          kelurahan: item.nama_kelurahan,
          latitudeCenter: normalizeCoord(item.kecamatan?.latitude_center),
          longitudeCenter: normalizeCoord(item.kecamatan?.longitude_center),
          createdBy: item.created_by,
          updatedAt: formatDateTime(item.last_update_date),
          updatedAtRaw: item.last_update_date,
        }));

        const mappedKecamatanRows: KecamatanRow[] = (kecamatanResponse.data_kecamatan || []).map((item) => ({
          id: item.kecamatan_id,
          kecamatan: item.nama_kecamatan,
          latitudeCenter: normalizeCoord(item.latitude_center),
          longitudeCenter: normalizeCoord(item.longitude_center),
          hasGeojson: Boolean(item.geojson),
          createdBy: item.created_by,
          updatedAt: formatDateTime(item.last_update_date),
          updatedAtRaw: item.last_update_date,
        }));

        const mappedKeywordRows: KeywordRow[] = (settings.daftar_keyword || []).map((item) => ({
          id: item.keyword_id,
          keyword: item.keyword,
          createdBy: item.created_by,
          updatedAt: formatDateTime(item.last_update_date),
          updatedAtRaw: item.last_update_date,
        }));

        setKelurahanRows(mappedKelurahanRows);
        setKecamatanRows(mappedKecamatanRows);
        setKecamatanApiRows(kecamatanResponse.data_kecamatan || []);
        setKeywordRows(mappedKeywordRows);
        setKpiData({
          osint_settings_id: settings.nilai_kpi?.osint_settings_id ?? null,
          set_jumlah_postingan: Number(settings.nilai_kpi?.set_jumlah_postingan ?? 0),
          set_jumlah_like: Number(settings.nilai_kpi?.set_jumlah_like ?? 0),
          set_jumlah_comment: Number(settings.nilai_kpi?.set_jumlah_comment ?? 0),
          set_jumlah_share: Number(settings.nilai_kpi?.set_jumlah_share ?? 0),
          last_updated_by: settings.nilai_kpi?.last_updated_by ?? null,
          last_update_date: settings.nilai_kpi?.last_update_date ?? null,
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

  const filteredKelurahanRows = useMemo(() => {
    const keyword = kelurahanSearch.trim().toLowerCase();
    const rows = kelurahanRows.filter((row) =>
      [row.kelurahan, row.namaKecamatan, row.latitudeCenter, row.longitudeCenter, row.createdBy, row.updatedAt]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );

    return [...rows].sort((a, b) => {
      const ta = parseDate(a.updatedAtRaw);
      const tb = parseDate(b.updatedAtRaw);
      return kelurahanSort === "newest" ? tb - ta : ta - tb;
    });
  }, [kelurahanRows, kelurahanSearch, kelurahanSort]);

  const filteredKecamatanRows = useMemo(() => {
    const keyword = kecamatanSearch.trim().toLowerCase();
    const rows = kecamatanRows.filter((row) =>
      [row.kecamatan, row.latitudeCenter, row.longitudeCenter, row.createdBy, row.updatedAt]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );

    return [...rows].sort((a, b) => {
      const ta = parseDate(a.updatedAtRaw);
      const tb = parseDate(b.updatedAtRaw);
      return kecamatanSort === "newest" ? tb - ta : ta - tb;
    });
  }, [kecamatanRows, kecamatanSearch, kecamatanSort]);

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

  const kelurahanTotalPages = Math.max(1, Math.ceil(filteredKelurahanRows.length / rowsPerPage));
  const kecamatanTotalPages = Math.max(1, Math.ceil(filteredKecamatanRows.length / rowsPerPage));
  const keywordTotalPages = Math.max(1, Math.ceil(filteredKeywordRows.length / rowsPerPage));

  const currentKelurahanRows = filteredKelurahanRows.slice(
    (kelurahanPage - 1) * rowsPerPage,
    kelurahanPage * rowsPerPage
  );
  const currentKecamatanRows = filteredKecamatanRows.slice(
    (kecamatanPage - 1) * rowsPerPage,
    kecamatanPage * rowsPerPage
  );
  const currentKeywordRows = filteredKeywordRows.slice(
    (keywordPage - 1) * rowsPerPage,
    keywordPage * rowsPerPage
  );

  useEffect(() => setKelurahanPage(1), [kelurahanSearch, kelurahanSort]);
  useEffect(() => setKecamatanPage(1), [kecamatanSearch, kecamatanSort]);
  useEffect(() => setKeywordPage(1), [keywordSearch, keywordSort]);

  useEffect(() => {
    if (kelurahanPage > kelurahanTotalPages) setKelurahanPage(kelurahanTotalPages);
  }, [kelurahanPage, kelurahanTotalPages]);

  useEffect(() => {
    if (kecamatanPage > kecamatanTotalPages) setKecamatanPage(kecamatanTotalPages);
  }, [kecamatanPage, kecamatanTotalPages]);

  useEffect(() => {
    if (keywordPage > keywordTotalPages) setKeywordPage(keywordTotalPages);
  }, [keywordPage, keywordTotalPages]);

  const toggleKelurahanRow = (id: number) => {
    setSelectedKelurahanIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleKecamatanRow = (id: number) => {
    setSelectedKecamatanIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleKeywordRow = (id: number) => {
    setSelectedKeywordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allKelurahanChecked =
    currentKelurahanRows.length > 0 &&
    currentKelurahanRows.every((row) => selectedKelurahanIds.has(row.id));

  const allKecamatanChecked =
    currentKecamatanRows.length > 0 &&
    currentKecamatanRows.every((row) => selectedKecamatanIds.has(row.id));

  const allKeywordChecked =
    currentKeywordRows.length > 0 &&
    currentKeywordRows.every((row) => selectedKeywordIds.has(row.id));

  const toggleAllKelurahan = () => {
    setSelectedKelurahanIds((prev) => {
      const next = new Set(prev);
      if (allKelurahanChecked) {
        currentKelurahanRows.forEach((row) => next.delete(row.id));
      } else {
        currentKelurahanRows.forEach((row) => next.add(row.id));
      }
      return next;
    });
  };

  const toggleAllKecamatan = () => {
    setSelectedKecamatanIds((prev) => {
      const next = new Set(prev);
      if (allKecamatanChecked) {
        currentKecamatanRows.forEach((row) => next.delete(row.id));
      } else {
        currentKecamatanRows.forEach((row) => next.add(row.id));
      }
      return next;
    });
  };

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

  const closeKelurahanModal = () => {
    if (modalSaving) return;
    setKelurahanModalMode(null);
    setKelurahanForm(emptyKelurahanForm);
    setActiveKelurahanId(null);
    setModalErrorMsg("");
  };

  const closeKecamatanModal = () => {
    if (modalSaving) return;
    setKecamatanModalMode(null);
    setKecamatanForm(emptyKecamatanForm);
    setActiveKecamatanId(null);
    setModalErrorMsg("");
  };

  const closeKeywordModal = () => {
    if (modalSaving) return;
    setKeywordModalMode(null);
    setKeywordModalValue("");
    setActiveKeywordId(null);
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

  const openEditKelurahan = (row: KelurahanRow) => {
    setKelurahanModalMode("edit");
    setKelurahanForm({
      id_kecamatan: row.idKecamatan ? String(row.idKecamatan) : "",
      nama_kelurahan: row.kelurahan,
    });
    setActiveKelurahanId(row.id);
    setModalErrorMsg("");
  };

  const openAddKecamatan = () => {
    setKecamatanModalMode("add");
    setKecamatanForm(emptyKecamatanForm);
    setActiveKecamatanId(null);
    setModalErrorMsg("");
  };

  const openEditKecamatan = (row: KecamatanRow) => {
    const source = kecamatanApiRows.find((item) => item.kecamatan_id === row.id);
    setKecamatanModalMode("edit");
    setKecamatanForm({
      nama_kecamatan: source?.nama_kecamatan || row.kecamatan,
      latitude_center:
        source?.latitude_center !== null && source?.latitude_center !== undefined
          ? String(source.latitude_center)
          : "",
      longitude_center:
        source?.longitude_center !== null && source?.longitude_center !== undefined
          ? String(source.longitude_center)
          : "",
      geojson_file: null,
      geojson_file_name: "",
    });
    setActiveKecamatanId(row.id);
    setModalErrorMsg("");
  };

  const openAddKeyword = () => {
    setKeywordModalMode("add");
    setKeywordModalValue("");
    setActiveKeywordId(null);
    setModalErrorMsg("");
  };

  const openEditKeyword = (row: KeywordRow) => {
    setKeywordModalMode("edit");
    setKeywordModalValue(row.keyword);
    setActiveKeywordId(row.id);
    setModalErrorMsg("");
  };

  const openMetricModal = (field: MetricField) => {
    setMetricModalField(field);
    setMetricModalValue(String(kpiData[field] ?? 0));
    setModalErrorMsg("");
  };

  const saveKelurahan = async () => {
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

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_kecamatan: Number(kelurahanForm.id_kecamatan),
          nama_kelurahan: kelurahanForm.nama_kelurahan.trim(),
        }),
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

  const saveKecamatan = async () => {
    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (!kecamatanForm.nama_kecamatan.trim()) {
      setModalErrorMsg("Nama kecamatan wajib diisi.");
      return;
    }

    if (kecamatanModalMode === "add" && !kecamatanForm.geojson_file) {
      setModalErrorMsg("File geojson wajib diupload.");
      return;
    }

    try {
      setModalSaving(true);
      setModalErrorMsg("");

      const isEdit = kecamatanModalMode === "edit";
      const url = isEdit
        ? `${API_BASE_URL}/osint/kecamatan/${activeKecamatanId}`
        : `${API_BASE_URL}/osint/kecamatan`;

      const formData = new FormData();
      formData.append("nama_kecamatan", kecamatanForm.nama_kecamatan.trim());
      formData.append("latitude_center", kecamatanForm.latitude_center.trim());
      formData.append("longitude_center", kecamatanForm.longitude_center.trim());

      if (kecamatanForm.geojson_file) {
        formData.append("geojson_file", kecamatanForm.geojson_file);
      }

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setModalErrorMsg(data?.message || "Gagal menyimpan data kecamatan.");
        return;
      }

      closeKecamatanModal();
      await fetchSettingsData(false);
    } catch (err: any) {
      setModalErrorMsg(err?.message || "Terjadi error saat menyimpan kecamatan.");
    } finally {
      setModalSaving(false);
    }
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

      const isEdit = keywordModalMode === "edit";
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

  const currentSearch = activeTab === "kelurahan"
    ? kelurahanSearch
    : activeTab === "kecamatan"
    ? kecamatanSearch
    : keywordSearch;

  const setCurrentSearch = (value: string) => {
    if (activeTab === "kelurahan") setKelurahanSearch(value);
    else if (activeTab === "kecamatan") setKecamatanSearch(value);
    else setKeywordSearch(value);
  };

  const toggleCurrentSort = () => {
    if (activeTab === "kelurahan") {
      setKelurahanSort((prev) => (prev === "newest" ? "oldest" : "newest"));
    } else if (activeTab === "kecamatan") {
      setKecamatanSort((prev) => (prev === "newest" ? "oldest" : "newest"));
    } else {
      setKeywordSort((prev) => (prev === "newest" ? "oldest" : "newest"));
    }
  };

  const handleAddByTab = () => {
    if (activeTab === "kelurahan") openAddKelurahan();
    else if (activeTab === "kecamatan") openAddKecamatan();
    else openAddKeyword();
  };

  const addButtonLabel =
    activeTab === "kelurahan"
      ? "Tambah Kelurahan"
      : activeTab === "kecamatan"
      ? "Tambah Kecamatan"
      : "Tambah Keyword";

  const pageNumbers =
    activeTab === "kelurahan"
      ? getVisiblePages(kelurahanPage, kelurahanTotalPages)
      : activeTab === "kecamatan"
      ? getVisiblePages(kecamatanPage, kecamatanTotalPages)
      : getVisiblePages(keywordPage, keywordTotalPages);

  const handlePrevPage = () => {
    if (activeTab === "kelurahan") setKelurahanPage((prev) => Math.max(1, prev - 1));
    else if (activeTab === "kecamatan") setKecamatanPage((prev) => Math.max(1, prev - 1));
    else setKeywordPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    if (activeTab === "kelurahan") {
      setKelurahanPage((prev) => Math.min(kelurahanTotalPages, prev + 1));
    } else if (activeTab === "kecamatan") {
      setKecamatanPage((prev) => Math.min(kecamatanTotalPages, prev + 1));
    } else {
      setKeywordPage((prev) => Math.min(keywordTotalPages, prev + 1));
    }
  };

  const isPrevDisabled =
    activeTab === "kelurahan"
      ? kelurahanPage === 1
      : activeTab === "kecamatan"
      ? kecamatanPage === 1
      : keywordPage === 1;

  const isNextDisabled =
    activeTab === "kelurahan"
      ? kelurahanPage === kelurahanTotalPages
      : activeTab === "kecamatan"
      ? kecamatanPage === kecamatanTotalPages
      : keywordPage === keywordTotalPages;

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

        {errorMsg ? <div className={`${styles.dataState} ${styles.errorState}`}>{errorMsg}</div> : null}

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

            <section className={styles.panel}>
              <div className={styles.tabRow}>
                <button
                  type="button"
                  className={`${styles.tabButton} ${activeTab === "kelurahan" ? styles.tabButtonActive : ""}`}
                  onClick={() => setActiveTab("kelurahan")}
                >
                  Data Kelurahan
                </button>
                <button
                  type="button"
                  className={`${styles.tabButton} ${activeTab === "kecamatan" ? styles.tabButtonActive : ""}`}
                  onClick={() => setActiveTab("kecamatan")}
                >
                  Data Kecamatan
                </button>
                <button
                  type="button"
                  className={`${styles.tabButton} ${activeTab === "keyword" ? styles.tabButtonActive : ""}`}
                  onClick={() => setActiveTab("keyword")}
                >
                  Data Keyword
                </button>
              </div>

              <div className={styles.panelToolbar}>
                <div className={styles.searchBox}>
                  <span className={styles.searchIconWrap}>
                    <SearchIcon />
                  </span>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Cari berdasarkan ..."
                    value={currentSearch}
                    onChange={(e) => setCurrentSearch(e.target.value)}
                  />
                </div>

                <div className={styles.actionsGroup}>
                  <button type="button" className={styles.toolbarButton} onClick={toggleCurrentSort}>
                    <SortIcon />
                    <span>Sort</span>
                  </button>

                  <button type="button" className={styles.addButton} onClick={handleAddByTab}>
                    <PlusIcon />
                    <span>{addButtonLabel}</span>
                  </button>
                </div>
              </div>

              <div className={styles.tableWrap}>
                {activeTab === "kelurahan" && (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.checkboxCol}>
                          <input
                            type="checkbox"
                            className={styles.checkInput}
                            checked={allKelurahanChecked}
                            onChange={toggleAllKelurahan}
                          />
                        </th>
                        <th>No</th>
                        <th>Kelurahan</th>
                        <th>Kecamatan</th>
                        <th>Latitude</th>
                        <th>Longitude</th>
                        <th>Created By</th>
                        <th>Last Updated Date</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentKelurahanRows.length > 0 ? (
                        currentKelurahanRows.map((row, index) => (
                          <tr key={`kelurahan-${row.id}`}>
                            <td className={styles.checkboxCol}>
                              <input
                                type="checkbox"
                                className={styles.checkInput}
                                checked={selectedKelurahanIds.has(row.id)}
                                onChange={() => toggleKelurahanRow(row.id)}
                              />
                            </td>
                            <td>{(kelurahanPage - 1) * rowsPerPage + index + 1}</td>
                            <td>{row.kelurahan}</td>
                            <td>{row.namaKecamatan}</td>
                            <td>{row.latitudeCenter}</td>
                            <td>{row.longitudeCenter}</td>
                            <td>{row.createdBy}</td>
                            <td>{row.updatedAt}</td>
                            <td>
                              <button
                                type="button"
                                className={styles.actionButton}
                                onClick={() => openEditKelurahan(row)}
                              >
                                <PencilIcon />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className={styles.emptyState}>
                            Data kelurahan tidak ditemukan.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                {activeTab === "kecamatan" && (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.checkboxCol}>
                          <input
                            type="checkbox"
                            className={styles.checkInput}
                            checked={allKecamatanChecked}
                            onChange={toggleAllKecamatan}
                          />
                        </th>
                        <th>No</th>
                        <th>Kecamatan</th>
                        <th>Latitude</th>
                        <th>Longitude</th>
                        <th>GeoJSON</th>
                        <th>Created By</th>
                        <th>Last Updated Date</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentKecamatanRows.length > 0 ? (
                        currentKecamatanRows.map((row, index) => (
                          <tr key={`kecamatan-${row.id}`}>
                            <td className={styles.checkboxCol}>
                              <input
                                type="checkbox"
                                className={styles.checkInput}
                                checked={selectedKecamatanIds.has(row.id)}
                                onChange={() => toggleKecamatanRow(row.id)}
                              />
                            </td>
                            <td>{(kecamatanPage - 1) * rowsPerPage + index + 1}</td>
                            <td>{row.kecamatan}</td>
                            <td>{row.latitudeCenter}</td>
                            <td>{row.longitudeCenter}</td>
                            <td>{row.hasGeojson ? "Ada file" : "-"}</td>
                            <td>{row.createdBy}</td>
                            <td>{row.updatedAt}</td>
                            <td>
                              <button
                                type="button"
                                className={styles.actionButton}
                                onClick={() => openEditKecamatan(row)}
                              >
                                <PencilIcon />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className={styles.emptyState}>
                            Data kecamatan tidak ditemukan.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                {activeTab === "keyword" && (
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
                )}
              </div>

              <div className={styles.paginationWrap}>
                <div className={styles.pagination}>
                  <button
                    type="button"
                    className={styles.pageArrow}
                    onClick={handlePrevPage}
                    disabled={isPrevDisabled}
                  >
                    <ChevronLeftIcon />
                  </button>

                  <div className={styles.pageNumbers}>
                    {pageNumbers.map((item, index) =>
                      item === "..." ? (
                        <span key={`dots-${index}`} className={styles.pageDots}>
                          ...
                        </span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          className={`${styles.pageNumber} ${
                            (activeTab === "kelurahan" && kelurahanPage === item) ||
                            (activeTab === "kecamatan" && kecamatanPage === item) ||
                            (activeTab === "keyword" && keywordPage === item)
                              ? styles.pageNumberActive
                              : ""
                          }`}
                          onClick={() => {
                            if (activeTab === "kelurahan") setKelurahanPage(Number(item));
                            else if (activeTab === "kecamatan") setKecamatanPage(Number(item));
                            else setKeywordPage(Number(item));
                          }}
                        >
                          {item}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    className={styles.pageArrow}
                    onClick={handleNextPage}
                    disabled={isNextDisabled}
                  >
                    <ChevronRightIcon />
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      <KelurahanModal
        open={kelurahanModalMode !== null}
        mode={kelurahanModalMode}
        form={kelurahanForm}
        kecamatanOptions={kecamatanApiRows}
        saving={modalSaving}
        errorMsg={modalErrorMsg}
        onChange={(field, value) =>
          setKelurahanForm((prev) => ({
            ...prev,
            [field]: value,
          }))
        }
        onClose={closeKelurahanModal}
        onSave={saveKelurahan}
      />

      <KecamatanModal
        open={kecamatanModalMode !== null}
        mode={kecamatanModalMode}
        form={kecamatanForm}
        saving={modalSaving}
        errorMsg={modalErrorMsg}
        onChange={(field, value) =>
          setKecamatanForm((prev) => ({
            ...prev,
            [field]: value as never,
          }))
        }
        onClose={closeKecamatanModal}
        onSave={saveKecamatan}
      />

      <KeywordModal
        open={keywordModalMode !== null}
        mode={keywordModalMode}
        value={keywordModalValue}
        saving={modalSaving}
        errorMsg={modalErrorMsg}
        onChange={setKeywordModalValue}
        onClose={closeKeywordModal}
        onSave={saveKeyword}
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