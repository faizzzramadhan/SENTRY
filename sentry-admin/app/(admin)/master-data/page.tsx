"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./master-data.module.css";

const RAW_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5555";

const API_BASE_URL = RAW_API_BASE_URL
  .replace(/\/$/, "")
  .replace(/\/api\/humint$/i, "")
  .replace(/\/humint$/i, "")
  .replace(/\/api$/i, "");

const ENDPOINTS = {
  kelurahan: `${API_BASE_URL}/osint/kelurahan`,
  kecamatan: `${API_BASE_URL}/osint/kecamatan`,
  jenisBencana: `${API_BASE_URL}/jenis-bencana`,
  namaBencana: `${API_BASE_URL}/nama-bencana`,
};

type TabKey = "kelurahan" | "kecamatan" | "jenis_bencana" | "nama_bencana";
type SortType = "newest" | "oldest";
type NotificationType = "success" | "error";

type KelurahanItem = {
  kelurahan_id: number;
  nama_kelurahan: string;
  latitude_center?: string | number | null;
  longitude_center?: string | number | null;
  created_by: string;
  last_update_date: string;
};

type KecamatanItem = {
  kecamatan_id: number;
  nama_kecamatan: string;
  latitude_center?: string | number | null;
  longitude_center?: string | number | null;
  geojson?: string | null;
  created_by: string;
  last_update_date: string;
};

type JenisBencanaItem = {
  jenis_id: number;
  nama_jenis: string;
  created_by: string;
  last_update_date: string;
};

type NamaBencanaItem = {
  bencana_id: number;
  nama_bencana: string;
  jenis_id: number;
  created_by: string;
  last_update_date: string;
  jenis_bencana?: {
    jenis_id: number;
    nama_jenis: string;
  } | null;
};

function decodeJwtPayload(token: string): any | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

async function parseApiResponse(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  const rawText = await res.text();

  if (!contentType.includes("application/json")) {
    throw new Error(
      `Response bukan JSON. Status ${res.status}. Isi awal: ${rawText.slice(0, 120)}`
    );
  }

  return JSON.parse(rawText);
}

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

function parseDate(value?: string | null) {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
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

function TextModal({
  open,
  title,
  fields,
  saving,
  errorMsg,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  fields: React.ReactNode;
  saving: boolean;
  errorMsg: string;
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
      <div className={styles.formModalCard}>
        <div className={styles.modalTitle}>{title}</div>
        {fields}
        {errorMsg ? <div className={styles.modalError}>{errorMsg}</div> : null}
        <button
          type="button"
          className={styles.modalSaveButton}
          onClick={() => onSave()}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

export default function MasterDataPage() {
  const router = useRouter();

  const [userName, setUserName] = useState("User");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [activeTab, setActiveTab] = useState<TabKey>("kelurahan");
  const [search, setSearch] = useState("");
  const [sortType, setSortType] = useState<SortType>("newest");
  const [page, setPage] = useState(1);

  const [kelurahanRows, setKelurahanRows] = useState<KelurahanItem[]>([]);
  const [kecamatanRows, setKecamatanRows] = useState<KecamatanItem[]>([]);
  const [jenisRows, setJenisRows] = useState<JenisBencanaItem[]>([]);
  const [namaBencanaRows, setNamaBencanaRows] = useState<NamaBencanaItem[]>([]);

  const [selectedKelurahanIds, setSelectedKelurahanIds] = useState<Set<number>>(new Set());
  const [selectedKecamatanIds, setSelectedKecamatanIds] = useState<Set<number>>(new Set());
  const [selectedJenisIds, setSelectedJenisIds] = useState<Set<number>>(new Set());
  const [selectedNamaBencanaIds, setSelectedNamaBencanaIds] = useState<Set<number>>(new Set());

  const [modalSaving, setModalSaving] = useState(false);
  const [modalErrorMsg, setModalErrorMsg] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmText: string;
    action: null | (() => Promise<void> | void);
  }>({
    open: false,
    title: "",
    message: "",
    confirmText: "Lanjutkan",
    action: null,
  });
  const [notification, setNotification] = useState<{
    open: boolean;
    type: NotificationType;
    message: string;
  }>({
    open: false,
    type: "success",
    message: "",
  });

  const [kelurahanModalOpen, setKelurahanModalOpen] = useState(false);
  const [kecamatanModalOpen, setKecamatanModalOpen] = useState(false);
  const [jenisModalOpen, setJenisModalOpen] = useState(false);
  const [namaBencanaModalOpen, setNamaBencanaModalOpen] = useState(false);

  const [editingKelurahanId, setEditingKelurahanId] = useState<number | null>(null);
  const [editingKecamatanId, setEditingKecamatanId] = useState<number | null>(null);
  const [editingJenisId, setEditingJenisId] = useState<number | null>(null);
  const [editingNamaBencanaId, setEditingNamaBencanaId] = useState<number | null>(null);

  const [kelurahanForm, setKelurahanForm] = useState({
    nama_kelurahan: "",
    latitude_center: "",
    longitude_center: "",
  });

  const [kecamatanForm, setKecamatanForm] = useState({
    nama_kecamatan: "",
    latitude_center: "",
    longitude_center: "",
    geojson_file: null as File | null,
    geojson_file_name: "",
  });

  const [jenisForm, setJenisForm] = useState({
    nama_jenis: "",
  });

  const [namaBencanaForm, setNamaBencanaForm] = useState({
    nama_bencana: "",
    jenis_id: "",
  });

  const token = useMemo(
    () => (typeof window !== "undefined" ? localStorage.getItem("token") : null),
    []
  );

  const showNotification = (type: NotificationType, message: string) => {
    setNotification({
      open: true,
      type,
      message,
    });
  };

  const closeNotification = () => {
    setNotification((prev) => ({ ...prev, open: false }));
  };

  useEffect(() => {
    const payload = token ? decodeJwtPayload(token) : null;

    if (!token) {
      window.location.href = "/login";
      return;
    }

    const name = payload?.usr_nama_lengkap || payload?.usr_email || "User";
    setUserName(name);
  }, [token]);

  const fetchAllData = useCallback(
    async (withLoading = true) => {
      if (!token) {
        window.location.href = "/login";
        return;
      }

      try {
        if (withLoading) setLoading(true);
        setErrorMsg("");

        const [kelRes, kecRes, jenisRes, namaRes] = await Promise.all([
          fetch(ENDPOINTS.kelurahan, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(ENDPOINTS.kecamatan, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(ENDPOINTS.jenisBencana, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(ENDPOINTS.namaBencana, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const kelData = await parseApiResponse(kelRes);
        const kecData = await parseApiResponse(kecRes);
        const jenisData = await parseApiResponse(jenisRes);
        const namaData = await parseApiResponse(namaRes);

        if (!kelRes.ok) throw new Error(kelData?.message || "Gagal mengambil data kelurahan");
        if (!kecRes.ok) throw new Error(kecData?.message || "Gagal mengambil data kecamatan");
        if (!jenisRes.ok) throw new Error(jenisData?.message || "Gagal mengambil data jenis bencana");
        if (!namaRes.ok) throw new Error(namaData?.message || "Gagal mengambil data nama bencana");

        setKelurahanRows(kelData?.data_kelurahan || []);
        setKecamatanRows(kecData?.data_kecamatan || []);
        setJenisRows(jenisData?.jenis_bencana || []);
        setNamaBencanaRows(namaData?.nama_bencana || []);
      } catch (err: any) {
        setErrorMsg(err?.message || "Terjadi error saat mengambil data master");
      } finally {
        if (withLoading) setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchAllData(true);
  }, [fetchAllData]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, search, sortType]);

  const normalizedKelurahan = useMemo(
    () =>
      kelurahanRows.map((item) => ({
        id: item.kelurahan_id,
        nama: item.nama_kelurahan,
        latitude: item.latitude_center ?? "-",
        longitude: item.longitude_center ?? "-",
        createdBy: item.created_by,
        updatedAt: item.last_update_date,
        raw: item,
      })),
    [kelurahanRows]
  );

  const normalizedKecamatan = useMemo(
    () =>
      kecamatanRows.map((item) => ({
        id: item.kecamatan_id,
        nama: item.nama_kecamatan,
        latitude: item.latitude_center ?? "-",
        longitude: item.longitude_center ?? "-",
        createdBy: item.created_by,
        updatedAt: item.last_update_date,
        raw: item,
      })),
    [kecamatanRows]
  );

  const normalizedJenis = useMemo(
    () =>
      jenisRows.map((item) => ({
        id: item.jenis_id,
        nama: item.nama_jenis,
        createdBy: item.created_by,
        updatedAt: item.last_update_date,
        raw: item,
      })),
    [jenisRows]
  );

  const normalizedNamaBencana = useMemo(
    () =>
      namaBencanaRows.map((item) => ({
        id: item.bencana_id,
        nama: item.nama_bencana,
        jenisNama: item.jenis_bencana?.nama_jenis || "-",
        createdBy: item.created_by,
        updatedAt: item.last_update_date,
        raw: item,
      })),
    [namaBencanaRows]
  );

  const currentRows = useMemo(() => {
    let rows: any[] = [];

    if (activeTab === "kelurahan") rows = normalizedKelurahan;
    if (activeTab === "kecamatan") rows = normalizedKecamatan;
    if (activeTab === "jenis_bencana") rows = normalizedJenis;
    if (activeTab === "nama_bencana") rows = normalizedNamaBencana;

    const q = search.trim().toLowerCase();

    const filtered = rows.filter((row) =>
      Object.values(row)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );

    return filtered.sort((a, b) => {
      const ta = parseDate(a.updatedAt);
      const tb = parseDate(b.updatedAt);
      return sortType === "newest" ? tb - ta : ta - tb;
    });
  }, [
    activeTab,
    normalizedKelurahan,
    normalizedKecamatan,
    normalizedJenis,
    normalizedNamaBencana,
    search,
    sortType,
  ]);

  const rowsPerPage = 15;
  const totalPages = Math.max(1, Math.ceil(currentRows.length / rowsPerPage));
  const paginatedRows = currentRows.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const visiblePages = getVisiblePages(page, totalPages);

  const currentSelection = useMemo(() => {
    if (activeTab === "kelurahan") return selectedKelurahanIds;
    if (activeTab === "kecamatan") return selectedKecamatanIds;
    if (activeTab === "jenis_bencana") return selectedJenisIds;
    return selectedNamaBencanaIds;
  }, [activeTab, selectedKelurahanIds, selectedKecamatanIds, selectedJenisIds, selectedNamaBencanaIds]);

  const setCurrentSelection = (next: Set<number>) => {
    if (activeTab === "kelurahan") setSelectedKelurahanIds(next);
    else if (activeTab === "kecamatan") setSelectedKecamatanIds(next);
    else if (activeTab === "jenis_bencana") setSelectedJenisIds(next);
    else setSelectedNamaBencanaIds(next);
  };

  const allChecked =
    paginatedRows.length > 0 &&
    paginatedRows.every((row) => currentSelection.has(row.id));

  const toggleRow = (id: number) => {
    const next = new Set(currentSelection);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCurrentSelection(next);
  };

  const toggleAll = () => {
    const next = new Set(currentSelection);
    if (allChecked) {
      paginatedRows.forEach((row) => next.delete(row.id));
    } else {
      paginatedRows.forEach((row) => next.add(row.id));
    }
    setCurrentSelection(next);
  };

  const resetModalError = () => setModalErrorMsg("");

  const openConfirmDialog = ({
    title,
    message,
    confirmText = "Lanjutkan",
    action,
  }: {
    title: string;
    message: string;
    confirmText?: string;
    action: () => Promise<void> | void;
  }) => {
    setConfirmDialog({
      open: true,
      title,
      message,
      confirmText,
      action,
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({
      open: false,
      title: "",
      message: "",
      confirmText: "Lanjutkan",
      action: null,
    });
  };

  const executeConfirmDialog = async () => {
    const action = confirmDialog.action;
    closeConfirmDialog();

    if (action) {
      await action();
    }
  };

  const openAddModal = () => {
    resetModalError();

    if (activeTab === "kelurahan") {
      setEditingKelurahanId(null);
      setKelurahanForm({ nama_kelurahan: "", latitude_center: "", longitude_center: "" });
      setKelurahanModalOpen(true);
    } else if (activeTab === "kecamatan") {
      setEditingKecamatanId(null);
      setKecamatanForm({
        nama_kecamatan: "",
        latitude_center: "",
        longitude_center: "",
        geojson_file: null,
        geojson_file_name: "",
      });
      setKecamatanModalOpen(true);
    } else if (activeTab === "jenis_bencana") {
      setEditingJenisId(null);
      setJenisForm({
        nama_jenis: "",
      });
      setJenisModalOpen(true);
    } else {
      setEditingNamaBencanaId(null);
      setNamaBencanaForm({ nama_bencana: "", jenis_id: "" });
      setNamaBencanaModalOpen(true);
    }
  };

  const openEditModal = (row: any) => {
    resetModalError();

    if (activeTab === "kelurahan") {
      setEditingKelurahanId(row.raw.kelurahan_id);
      setKelurahanForm({
        nama_kelurahan: row.raw.nama_kelurahan || "",
        latitude_center: row.raw.latitude_center ? String(row.raw.latitude_center) : "",
        longitude_center: row.raw.longitude_center ? String(row.raw.longitude_center) : "",
      });
      setKelurahanModalOpen(true);
    } else if (activeTab === "kecamatan") {
      setEditingKecamatanId(row.raw.kecamatan_id);
      setKecamatanForm({
        nama_kecamatan: row.raw.nama_kecamatan || "",
        latitude_center: row.raw.latitude_center ? String(row.raw.latitude_center) : "",
        longitude_center: row.raw.longitude_center ? String(row.raw.longitude_center) : "",
        geojson_file: null,
        geojson_file_name: "",
      });
      setKecamatanModalOpen(true);
    } else if (activeTab === "jenis_bencana") {
      setEditingJenisId(row.raw.jenis_id);
      setJenisForm({
        nama_jenis: row.raw.nama_jenis || "",
      });
      setJenisModalOpen(true);
    } else {
      setEditingNamaBencanaId(row.raw.bencana_id);
      setNamaBencanaForm({
        nama_bencana: row.raw.nama_bencana || "",
        jenis_id: row.raw.jenis_id ? String(row.raw.jenis_id) : "",
      });
      setNamaBencanaModalOpen(true);
    }
  };

  const saveKelurahan = async (confirmed = false) => {
    if (!token) return;

    if (!kelurahanForm.nama_kelurahan.trim()) {
      setModalErrorMsg("Nama kelurahan wajib diisi.");
      return;
    }

    if (!confirmed) {
      const isEditAction = Boolean(editingKelurahanId);
      openConfirmDialog({
        title: isEditAction ? "Konfirmasi Perubahan Data" : "Konfirmasi Tambah Data",
        message: isEditAction
          ? "Apakah Anda yakin ingin menyimpan perubahan data kelurahan?"
          : "Apakah Anda yakin ingin menambahkan data kelurahan?",
        confirmText: isEditAction ? "Simpan Perubahan" : "Tambah Data",
        action: () => saveKelurahan(true),
      });
      return;
    }

    try {
      setModalSaving(true);
      setModalErrorMsg("");

      const isEdit = Boolean(editingKelurahanId);
      const url = isEdit
        ? `${ENDPOINTS.kelurahan}/${editingKelurahanId}`
        : ENDPOINTS.kelurahan;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nama_kelurahan: kelurahanForm.nama_kelurahan.trim(),
          latitude_center: kelurahanForm.latitude_center.trim() || null,
          longitude_center: kelurahanForm.longitude_center.trim() || null,
        }),
      });

      const data = await parseApiResponse(res);
      if (!res.ok) {
        const message = data?.message || "Gagal menyimpan data kelurahan.";
        setModalErrorMsg(message);
        showNotification("error", message);
        return;
      }

      setKelurahanModalOpen(false);
      await fetchAllData(false);
      showNotification(
        "success",
        isEdit ? "Data kelurahan berhasil diperbarui." : "Data kelurahan berhasil ditambahkan."
      );
    } catch (err: any) {
      const message = err?.message || "Terjadi error saat menyimpan kelurahan.";
      setModalErrorMsg(message);
      showNotification("error", message);
    } finally {
      setModalSaving(false);
    }
  };

  const saveKecamatan = async (confirmed = false) => {
    if (!token) return;

    if (!kecamatanForm.nama_kecamatan.trim()) {
      setModalErrorMsg("Nama kecamatan wajib diisi.");
      return;
    }

    if (!editingKecamatanId && !kecamatanForm.geojson_file) {
      setModalErrorMsg("File geojson wajib diupload.");
      return;
    }

    if (!confirmed) {
      const isEditAction = Boolean(editingKecamatanId);
      openConfirmDialog({
        title: isEditAction ? "Konfirmasi Perubahan Data" : "Konfirmasi Tambah Data",
        message: isEditAction
          ? "Apakah Anda yakin ingin menyimpan perubahan data kecamatan?"
          : "Apakah Anda yakin ingin menambahkan data kecamatan?",
        confirmText: isEditAction ? "Simpan Perubahan" : "Tambah Data",
        action: () => saveKecamatan(true),
      });
      return;
    }

    try {
      setModalSaving(true);
      setModalErrorMsg("");

      const isEdit = Boolean(editingKecamatanId);
      const url = isEdit
        ? `${ENDPOINTS.kecamatan}/${editingKecamatanId}`
        : ENDPOINTS.kecamatan;

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

      const data = await parseApiResponse(res);
      if (!res.ok) {
        const message = data?.message || "Gagal menyimpan data kecamatan.";
        setModalErrorMsg(message);
        showNotification("error", message);
        return;
      }

      setKecamatanModalOpen(false);
      await fetchAllData(false);
      showNotification(
        "success",
        isEdit ? "Data kecamatan berhasil diperbarui." : "Data kecamatan berhasil ditambahkan."
      );
    } catch (err: any) {
      const message = err?.message || "Terjadi error saat menyimpan kecamatan.";
      setModalErrorMsg(message);
      showNotification("error", message);
    } finally {
      setModalSaving(false);
    }
  };

  const saveJenis = async (confirmed = false) => {
    if (!token) return;

    if (!jenisForm.nama_jenis.trim()) {
      setModalErrorMsg("Nama jenis bencana wajib diisi.");
      return;
    }

    if (!confirmed) {
      const isEditAction = Boolean(editingJenisId);
      openConfirmDialog({
        title: isEditAction ? "Konfirmasi Perubahan Data" : "Konfirmasi Tambah Data",
        message: isEditAction
          ? "Apakah Anda yakin ingin menyimpan perubahan data jenis bencana?"
          : "Apakah Anda yakin ingin menambahkan data jenis bencana?",
        confirmText: isEditAction ? "Simpan Perubahan" : "Tambah Data",
        action: () => saveJenis(true),
      });
      return;
    }

    try {
      setModalSaving(true);
      setModalErrorMsg("");

      const isEdit = Boolean(editingJenisId);
      const url = isEdit
        ? `${ENDPOINTS.jenisBencana}/${editingJenisId}`
        : ENDPOINTS.jenisBencana;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nama_jenis: jenisForm.nama_jenis.trim(),
        }),
      });

      const data = await parseApiResponse(res);
      if (!res.ok) {
        const message = data?.message || "Gagal menyimpan data jenis bencana.";
        setModalErrorMsg(message);
        showNotification("error", message);
        return;
      }

      setJenisModalOpen(false);
      await fetchAllData(false);
      showNotification(
        "success",
        isEdit ? "Data jenis bencana berhasil diperbarui." : "Data jenis bencana berhasil ditambahkan."
      );
    } catch (err: any) {
      const message = err?.message || "Terjadi error saat menyimpan jenis bencana.";
      setModalErrorMsg(message);
      showNotification("error", message);
    } finally {
      setModalSaving(false);
    }
  };

  const saveNamaBencana = async (confirmed = false) => {
    if (!token) return;

    if (!namaBencanaForm.nama_bencana.trim()) {
      setModalErrorMsg("Nama bencana wajib diisi.");
      return;
    }

    if (!namaBencanaForm.jenis_id) {
      setModalErrorMsg("Jenis bencana wajib dipilih.");
      return;
    }

    if (!confirmed) {
      const isEditAction = Boolean(editingNamaBencanaId);
      openConfirmDialog({
        title: isEditAction ? "Konfirmasi Perubahan Data" : "Konfirmasi Tambah Data",
        message: isEditAction
          ? "Apakah Anda yakin ingin menyimpan perubahan data nama bencana?"
          : "Apakah Anda yakin ingin menambahkan data nama bencana?",
        confirmText: isEditAction ? "Simpan Perubahan" : "Tambah Data",
        action: () => saveNamaBencana(true),
      });
      return;
    }

    try {
      setModalSaving(true);
      setModalErrorMsg("");

      const isEdit = Boolean(editingNamaBencanaId);
      const url = isEdit
        ? `${ENDPOINTS.namaBencana}/${editingNamaBencanaId}`
        : ENDPOINTS.namaBencana;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nama_bencana: namaBencanaForm.nama_bencana.trim(),
          jenis_id: Number(namaBencanaForm.jenis_id),
        }),
      });

      const data = await parseApiResponse(res);
      if (!res.ok) {
        const message = data?.message || "Gagal menyimpan data nama bencana.";
        setModalErrorMsg(message);
        showNotification("error", message);
        return;
      }

      setNamaBencanaModalOpen(false);
      await fetchAllData(false);
      showNotification(
        "success",
        isEdit ? "Data nama bencana berhasil diperbarui." : "Data nama bencana berhasil ditambahkan."
      );
    } catch (err: any) {
      const message = err?.message || "Terjadi error saat menyimpan nama bencana.";
      setModalErrorMsg(message);
      showNotification("error", message);
    } finally {
      setModalSaving(false);
    }
  };

  const handleBulkDelete = async (confirmed = false) => {
    if (!token) return;
    const ids = Array.from(currentSelection);
    if (ids.length === 0) return;

    if (!confirmed) {
      openConfirmDialog({
        title: "Konfirmasi Hapus Data",
        message: `Apakah Anda yakin ingin menghapus ${ids.length} data terpilih? Data yang dihapus tidak dapat dikembalikan.`,
        confirmText: "Hapus Data",
        action: () => handleBulkDelete(true),
      });
      return;
    }

    let url = "";
    if (activeTab === "kelurahan") url = `${ENDPOINTS.kelurahan}/bulk-delete`;
    if (activeTab === "kecamatan") url = `${ENDPOINTS.kecamatan}/bulk-delete`;
    if (activeTab === "jenis_bencana") url = `${ENDPOINTS.jenisBencana}/bulk-delete`;
    if (activeTab === "nama_bencana") url = `${ENDPOINTS.namaBencana}/bulk-delete`;

    try {
      setLoading(true);
      setErrorMsg("");

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids }),
      });

      const data = await parseApiResponse(res);
      if (!res.ok) {
        const message = data?.message || "Gagal menghapus data.";
        setErrorMsg(message);
        showNotification("error", message);
        return;
      }

      setCurrentSelection(new Set());
      await fetchAllData(false);
      showNotification("success", `${ids.length} data berhasil dihapus.`);
    } catch (err: any) {
      const message = err?.message || "Terjadi error saat menghapus data.";
      setErrorMsg(message);
      showNotification("error", message);
    } finally {
      setLoading(false);
    }
  };

  const renderTable = () => {
    if (activeTab === "kelurahan") {
      return (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkboxCol}>
                <input type="checkbox" className={styles.checkInput} checked={allChecked} onChange={toggleAll} />
              </th>
              <th>No</th>
              <th>Kelurahan</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th>Created By</th>
              <th>Last Updated Date</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length > 0 ? (
              paginatedRows.map((row, index) => (
                <tr key={row.id}>
                  <td className={styles.checkboxCol}>
                    <input
                      type="checkbox"
                      className={styles.checkInput}
                      checked={currentSelection.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                    />
                  </td>
                  <td>{(page - 1) * rowsPerPage + index + 1}</td>
                  <td>{row.nama}</td>
                  <td>{String(row.latitude)}</td>
                  <td>{String(row.longitude)}</td>
                  <td>{row.createdBy}</td>
                  <td>{formatDateTime(row.updatedAt)}</td>
                  <td>
                    <button type="button" className={styles.actionButton} onClick={() => openEditModal(row)}>
                      <PencilIcon />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className={styles.emptyState}>Data kelurahan tidak ditemukan.</td>
              </tr>
            )}
          </tbody>
        </table>
      );
    }

    if (activeTab === "kecamatan") {
      return (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkboxCol}>
                <input type="checkbox" className={styles.checkInput} checked={allChecked} onChange={toggleAll} />
              </th>
              <th>No</th>
              <th>Kecamatan</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th>Created By</th>
              <th>Last Updated Date</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length > 0 ? (
              paginatedRows.map((row, index) => (
                <tr key={row.id}>
                  <td className={styles.checkboxCol}>
                    <input
                      type="checkbox"
                      className={styles.checkInput}
                      checked={currentSelection.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                    />
                  </td>
                  <td>{(page - 1) * rowsPerPage + index + 1}</td>
                  <td>{row.nama}</td>
                  <td>{String(row.latitude)}</td>
                  <td>{String(row.longitude)}</td>
                  <td>{row.createdBy}</td>
                  <td>{formatDateTime(row.updatedAt)}</td>
                  <td>
                    <button type="button" className={styles.actionButton} onClick={() => openEditModal(row)}>
                      <PencilIcon />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className={styles.emptyState}>Data kecamatan tidak ditemukan.</td>
              </tr>
            )}
          </tbody>
        </table>
      );
    }

    if (activeTab === "jenis_bencana") {
      return (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkboxCol}>
                <input type="checkbox" className={styles.checkInput} checked={allChecked} onChange={toggleAll} />
              </th>
              <th>No</th>
              <th>Nama Jenis Bencana</th>
              <th>Created By</th>
              <th>Last Updated Date</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length > 0 ? (
              paginatedRows.map((row, index) => (
                <tr key={row.id}>
                  <td className={styles.checkboxCol}>
                    <input
                      type="checkbox"
                      className={styles.checkInput}
                      checked={currentSelection.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                    />
                  </td>
                  <td>{(page - 1) * rowsPerPage + index + 1}</td>
                  <td>{row.nama}</td>
                  <td>{row.createdBy}</td>
                  <td>{formatDateTime(row.updatedAt)}</td>
                  <td>
                    <button type="button" className={styles.actionButton} onClick={() => openEditModal(row)}>
                      <PencilIcon />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className={styles.emptyState}>Data jenis bencana tidak ditemukan.</td>
              </tr>
            )}
          </tbody>
        </table>
      );
    }

    return (
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.checkboxCol}>
              <input type="checkbox" className={styles.checkInput} checked={allChecked} onChange={toggleAll} />
            </th>
            <th>No</th>
            <th>Nama Bencana</th>
            <th>Nama Jenis Bencana</th>
            <th>Created By</th>
            <th>Last Updated Date</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {paginatedRows.length > 0 ? (
            paginatedRows.map((row, index) => (
              <tr key={row.id}>
                <td className={styles.checkboxCol}>
                  <input
                    type="checkbox"
                    className={styles.checkInput}
                    checked={currentSelection.has(row.id)}
                    onChange={() => toggleRow(row.id)}
                  />
                </td>
                <td>{(page - 1) * rowsPerPage + index + 1}</td>
                <td>{row.nama}</td>
                <td>{row.jenisNama}</td>
                <td>{row.createdBy}</td>
                <td>{formatDateTime(row.updatedAt)}</td>
                <td>
                  <button type="button" className={styles.actionButton} onClick={() => openEditModal(row)}>
                    <PencilIcon />
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className={styles.emptyState}>Data nama bencana tidak ditemukan.</td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  const addButtonLabel =
    activeTab === "kecamatan"
      ? "Tambah Kecamatan"
      : activeTab === "kelurahan"
      ? "Tambah Kelurahan"
      : "Tambah Data";

  return (
    <>
      <div className={styles.page}>
        <div className={styles.topRow}>
          <div className={styles.titleWrap}>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => router.push("/dashboard")}
              aria-label="Kembali"
            >
              <BackIcon />
            </button>

            <h1 className={styles.pageTitle}>SETTINGS MASTER DATA</h1>
          </div>

          <div className={styles.hello}>Halo, {userName}</div>
        </div>

        {errorMsg ? <div className={`${styles.dataState} ${styles.errorState}`}>{errorMsg}</div> : null}

        {loading ? (
          <div className={styles.dataState}>Memuat data master...</div>
        ) : (
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
                className={`${styles.tabButton} ${activeTab === "jenis_bencana" ? styles.tabButtonActive : ""}`}
                onClick={() => setActiveTab("jenis_bencana")}
              >
                Jenis Bencana
              </button>
              <button
                type="button"
                className={`${styles.tabButton} ${activeTab === "nama_bencana" ? styles.tabButtonActive : ""}`}
                onClick={() => setActiveTab("nama_bencana")}
              >
                Nama Bencana
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
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className={styles.actionsGroup}>
                {currentSelection.size > 0 ? (
                  <button type="button" className={styles.dangerButton} onClick={() => handleBulkDelete()}>
                    Hapus Terpilih ({currentSelection.size})
                  </button>
                ) : null}

                <button
                  type="button"
                  className={styles.toolbarButton}
                  onClick={() => setSortType((prev) => (prev === "newest" ? "oldest" : "newest"))}
                >
                  <SortIcon />
                  <span>Sort</span>
                </button>

                <button type="button" className={styles.addButton} onClick={openAddModal}>
                  <PlusIcon />
                  <span>{addButtonLabel}</span>
                </button>
              </div>
            </div>

            <div className={styles.tableWrap}>{renderTable()}</div>

            <div className={styles.paginationWrap}>
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
                        className={`${styles.pageNumber} ${page === item ? styles.pageNumberActive : ""}`}
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
          </section>
        )}
      </div>

      <TextModal
        open={kelurahanModalOpen}
        title={editingKelurahanId ? "Edit Data Kelurahan" : "Tambah Data Kelurahan"}
        saving={modalSaving}
        errorMsg={modalErrorMsg}
        onClose={() => setKelurahanModalOpen(false)}
        onSave={saveKelurahan}
        fields={
          <>
            <div className={styles.formField}>
              <label className={styles.modalLabel}>
                Nama Kelurahan<span className={styles.modalRequired}>*</span>
              </label>
              <input
                className={styles.modalInput}
                value={kelurahanForm.nama_kelurahan}
                onChange={(e) =>
                  setKelurahanForm((prev) => ({
                    ...prev,
                    nama_kelurahan: e.target.value,
                  }))
                }
                placeholder="isi data kelurahan disini...."
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.modalLabel}>Latitude</label>
              <input
                className={styles.modalInput}
                value={kelurahanForm.latitude_center}
                onChange={(e) =>
                  setKelurahanForm((prev) => ({
                    ...prev,
                    latitude_center: e.target.value,
                  }))
                }
                placeholder="contoh: -7.8028333"
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.modalLabel}>Longitude</label>
              <input
                className={styles.modalInput}
                value={kelurahanForm.longitude_center}
                onChange={(e) =>
                  setKelurahanForm((prev) => ({
                    ...prev,
                    longitude_center: e.target.value,
                  }))
                }
                placeholder="contoh: 110.374138"
              />
            </div>
          </>
        }
      />

      <TextModal
        open={kecamatanModalOpen}
        title={editingKecamatanId ? "Edit Data Kecamatan" : "Tambah Data Kecamatan"}
        saving={modalSaving}
        errorMsg={modalErrorMsg}
        onClose={() => setKecamatanModalOpen(false)}
        onSave={saveKecamatan}
        fields={
          <>
            <div className={styles.formField}>
              <label className={styles.modalLabel}>Nama Kecamatan<span className={styles.modalRequired}>*</span></label>
              <input
                className={styles.modalInput}
                value={kecamatanForm.nama_kecamatan}
                onChange={(e) => setKecamatanForm((prev) => ({ ...prev, nama_kecamatan: e.target.value }))}
                placeholder="isi data kecamatan disini...."
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.modalLabel}>File GeoJSON{!editingKecamatanId ? <span className={styles.modalRequired}>*</span> : null}</label>
              <input
                className={styles.fileInput}
                type="file"
                accept=".json,.geojson,application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setKecamatanForm((prev) => ({
                    ...prev,
                    geojson_file: file,
                    geojson_file_name: file?.name || "",
                  }));
                }}
              />
              <div className={styles.fileHint}>
                {kecamatanForm.geojson_file_name
                  ? `File dipilih: ${kecamatanForm.geojson_file_name}`
                  : editingKecamatanId
                  ? "Kosongkan jika tidak ingin mengganti file geojson."
                  : "Upload file .json atau .geojson"}
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.modalLabel}>Latitude</label>
              <input
                className={styles.modalInput}
                value={kecamatanForm.latitude_center}
                onChange={(e) => setKecamatanForm((prev) => ({ ...prev, latitude_center: e.target.value }))}
                placeholder="contoh: -7.8028333"
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.modalLabel}>Longitude</label>
              <input
                className={styles.modalInput}
                value={kecamatanForm.longitude_center}
                onChange={(e) => setKecamatanForm((prev) => ({ ...prev, longitude_center: e.target.value }))}
                placeholder="contoh: 110.374138"
              />
            </div>
          </>
        }
      />

      <TextModal
        open={jenisModalOpen}
        title={editingJenisId ? "Edit Jenis Bencana" : "Tambah Jenis Bencana"}
        saving={modalSaving}
        errorMsg={modalErrorMsg}
        onClose={() => setJenisModalOpen(false)}
        onSave={saveJenis}
        fields={
          <>
            <div className={styles.formField}>
              <label className={styles.modalLabel}>
                Nama Jenis Bencana<span className={styles.modalRequired}>*</span>
              </label>
              <input
                className={styles.modalInput}
                value={jenisForm.nama_jenis}
                onChange={(e) =>
                  setJenisForm((prev) => ({
                    ...prev,
                    nama_jenis: e.target.value,
                  }))
                }
                placeholder="isi nama jenis bencana..."
              />
            </div>
          </>
        }
      />

      <TextModal
        open={namaBencanaModalOpen}
        title={editingNamaBencanaId ? "Edit Nama Bencana" : "Tambah Nama Bencana"}
        saving={modalSaving}
        errorMsg={modalErrorMsg}
        onClose={() => setNamaBencanaModalOpen(false)}
        onSave={saveNamaBencana}
        fields={
          <>
            <div className={styles.formField}>
              <label className={styles.modalLabel}>Jenis Bencana<span className={styles.modalRequired}>*</span></label>
              <select
                className={styles.modalInput}
                value={namaBencanaForm.jenis_id}
                onChange={(e) => setNamaBencanaForm((prev) => ({ ...prev, jenis_id: e.target.value }))}
              >
                <option value="">Pilih jenis bencana</option>
                {jenisRows.map((item) => (
                  <option key={item.jenis_id} value={item.jenis_id}>
                    {item.nama_jenis}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formField}>
              <label className={styles.modalLabel}>Nama Bencana<span className={styles.modalRequired}>*</span></label>
              <input
                className={styles.modalInput}
                value={namaBencanaForm.nama_bencana}
                onChange={(e) => setNamaBencanaForm((prev) => ({ ...prev, nama_bencana: e.target.value }))}
                placeholder="isi nama bencana..."
              />
            </div>
          </>
        }
      />

      {confirmDialog.open ? (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmCard}>
            <div className={styles.confirmIcon}>!</div>
            <h3 className={styles.confirmTitle}>{confirmDialog.title}</h3>
            <p className={styles.confirmMessage}>{confirmDialog.message}</p>

            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.confirmCancelButton}
                onClick={closeConfirmDialog}
              >
                Batal
              </button>
              <button
                type="button"
                className={styles.confirmSubmitButton}
                onClick={executeConfirmDialog}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {notification.open ? (
        <div className={styles.notificationOverlay}>
          <div className={styles.notificationCard}>
            <div
              className={`${styles.notificationIcon} ${
                notification.type === "success"
                  ? styles.notificationIconSuccess
                  : styles.notificationIconError
              }`}
            >
              {notification.type === "success" ? "✓" : "!"}
            </div>
            <h3 className={styles.notificationTitle}>
              {notification.type === "success" ? "Berhasil" : "Gagal"}
            </h3>
            <p className={styles.notificationMessage}>{notification.message}</p>
            <button
              type="button"
              className={styles.notificationButton}
              onClick={closeNotification}
            >
              Oke
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
