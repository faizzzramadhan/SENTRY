"use client";

import styles from "./manage-staff.module.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

// api backend
const RAW_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5555/api";

const API_BASE_URL = RAW_API_BASE_URL
  .replace(/\/$/, "")
  .replace(/\/humint$/i, "")
  .replace(/\/osint$/i, "");

async function parseJsonResponse(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  const rawText = await res.text();

  if (!contentType.includes("application/json")) {
    throw new Error(
      `Endpoint mengembalikan HTML, bukan JSON. Periksa NEXT_PUBLIC_API_URL dan route backend. Status ${res.status}. Isi awal: ${rawText.slice(0, 80)}`
    );
  }

  return JSON.parse(rawText);
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
type UserRole = "staff" | "admin";
type ModalMode = "add" | "edit" | null;

type StaffApiRow = {
  usr_id: number;
  usr_nama_lengkap: string;
  usr_email: string;
  usr_no_hp: string;
  usr_role: UserRole;
  created_by: string;
  creation_date: string;
  last_updated_by: string;
  last_update_date: string;
};

type StaffResponse = {
  count: number;
  users: StaffApiRow[];
};

type StaffRow = {
  id: number;
  nama: string;
  email: string;
  noHp: string;
  role: UserRole;
  roleLabel: string;
  lastUpdatedDate: string;
  lastUpdatedDateRaw: string;
  createdBy: string;
};

type StaffForm = {
  usr_nama_lengkap: string;
  usr_email: string;
  usr_no_hp: string;
  usr_password: string;
  usr_role: UserRole;
};

type DeleteTarget = {
  mode: "single" | "bulk";
  ids: number[];
  label: string;
};

type FeedbackModal = {
  type: "success" | "error";
  title: string;
  message: string;
} | null;

const emptyForm: StaffForm = {
  usr_nama_lengkap: "",
  usr_email: "",
  usr_no_hp: "",
  usr_password: "",
  usr_role: "staff",
};


function getRoleLabel(role: UserRole | string) {
  return role === "admin" ? "Admin" : "Staff";
}

function validateEmail(value: string) {
  const email = value.trim().toLowerCase();

  if (!email) {
    return "Email wajib diisi.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Format email tidak valid.";
  }

  if (!email.endsWith("@gmail.com")) {
    return "Email harus menggunakan domain @gmail.com.";
  }

  return "";
}

function validatePhone(value: string) {
  const phone = value.trim();

  if (!phone) {
    return "Nomor telepon wajib diisi.";
  }

  if (!/^\d+$/.test(phone)) {
    return "Nomor telepon hanya boleh berisi angka.";
  }

  if (phone.length !== 12) {
    return "Nomor telepon harus terdiri dari 12 digit.";
  }

  return "";
}

function validatePassword(value: string, isEdit: boolean) {
  const password = value.trim();

  if (!isEdit && !password) {
    return "Password wajib diisi.";
  }

  if (password && password.length < 8) {
    return "Password minimal 8 karakter.";
  }

  return "";
}

function validateName(value: string) {
  const name = value.trim();

  if (!name) {
    return "Nama lengkap wajib diisi.";
  }

  if (name.length < 3) {
    return "Nama lengkap minimal 3 karakter.";
  }

  if (name.length > 30) {
    return "Nama lengkap maksimal 30 karakter.";
  }

  if (!/^[A-Za-zÀ-ÿ' .-]+$/.test(name)) {
    return "Nama lengkap hanya boleh berisi huruf, spasi, titik, apostrof, atau tanda hubung.";
  }

  return "";
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

function parseDate(dateString: string) {
  return new Date(dateString).getTime();
}

function getVisiblePages(currentPage: number, totalPages: number): Array<number | "..."> {
  if (totalPages <= 4) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 2) return [1, 2, 3, "..."];
  if (currentPage >= totalPages - 1) return ["...", totalPages - 2, totalPages - 1, totalPages];
  return [currentPage - 1, currentPage, currentPage + 1, "..."];
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20L16.65 16.65" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.actionIcon} aria-hidden="true">
      <path d="M4 7h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 3h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 7v12m8-12v12M6 7l1 13a1 1 0 0 0 1 .93h8a1 1 0 0 0 1-.93L18 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
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

type StaffModalProps = {
  open: boolean;
  mode: ModalMode;
  form: StaffForm;
  saving: boolean;
  errorMsg: string;
  onChange: (field: keyof StaffForm, value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

function StaffModal({
  open,
  mode,
  form,
  saving,
  errorMsg,
  onChange,
  onClose,
  onSave,
}: StaffModalProps) {
  if (!open) return null;

  const isEdit = mode === "edit";

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className={styles.modalCard}>
        <div className={styles.modalField}>
          <label className={styles.modalLabel}>
            Nama Lengkap<span className={styles.modalRequired}>*</span>
          </label>
          <input
            className={styles.modalInput}
            type="text"
            placeholder="Masukkan nama lengkap"
            value={form.usr_nama_lengkap}
            onChange={(e) => onChange("usr_nama_lengkap", e.target.value)}
            autoFocus
          />
        </div>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>
            Email<span className={styles.modalRequired}>*</span>
          </label>
          <input
            className={styles.modalInput}
            type="email"
            placeholder="Contoh: nama@gmail.com"
            value={form.usr_email}
            onChange={(e) => onChange("usr_email", e.target.value)}
          />
          <div className={styles.modalHint}>Email harus menggunakan domain @gmail.com.</div>
        </div>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>
            Handphone<span className={styles.modalRequired}>*</span>
          </label>
          <input
            className={styles.modalInput}
            type="text"
            inputMode="numeric"
            maxLength={12}
            placeholder="Masukkan 12 digit nomor telepon"
            value={form.usr_no_hp}
            onChange={(e) => onChange("usr_no_hp", e.target.value)}
          />
          <div className={styles.modalHint}>Nomor telepon harus 12 digit angka.</div>
        </div>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>
            Role<span className={styles.modalRequired}>*</span>
          </label>
          <select
            className={styles.modalInput}
            value={form.usr_role}
            onChange={(e) => onChange("usr_role", e.target.value)}
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
          <div className={styles.modalHint}>
            Pilih role sesuai hak akses akun.
          </div>
        </div>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>
            Password<span className={styles.modalRequired}>*</span>
          </label>
          <input
            className={styles.modalInput}
            type="password"
            placeholder="Masukkan password"
            value={form.usr_password}
            onChange={(e) => onChange("usr_password", e.target.value)}
          />
          {isEdit ? (
            <div className={styles.modalHint}>Kosongkan jika password tidak ingin diubah.</div>
          ) : null}
        </div>

        {errorMsg ? <div className={styles.modalError}>{errorMsg}</div> : null}

        <button
          type="button"
          className={styles.modalSaveButton}
          onClick={() => onSave()}
          disabled={saving}
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </div>
  );
}

export default function ManageStaffPage() {
  const router = useRouter();

  const [userName, setUserName] = useState("Admin");

  const [search, setSearch] = useState("");
  const [sortType, setSortType] = useState<SortType>("newest");
  const [selectedRole, setSelectedRole] = useState("Semua");
  const [openFilter, setOpenFilter] = useState(false);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [apiRows, setApiRows] = useState<StaffApiRow[]>([]);
  const [page, setPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [activeStaffId, setActiveStaffId] = useState<number | null>(null);
  const [form, setForm] = useState<StaffForm>(emptyForm);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalErrorMsg, setModalErrorMsg] = useState("");
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModal>(null);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchData = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setErrorMsg("");

      const res = await fetch(`${API_BASE_URL}/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: StaffResponse | { message?: string } = await parseJsonResponse(res);

      if (!res.ok) {
        setErrorMsg((data as any)?.message || "Gagal mengambil data pengguna");
        return;
      }

      const result = data as StaffResponse;

      setApiRows(result.users);

      const validIds = new Set(result.users.map((item) => item.usr_id));
      setSelectedIds((prev) => new Set([...prev].filter((id) => validIds.has(id))));

      const mappedRows: StaffRow[] = result.users.map((item) => ({
        id: item.usr_id,
        nama: item.usr_nama_lengkap,
        email: item.usr_email,
        noHp: item.usr_no_hp,
        role: item.usr_role,
        roleLabel: getRoleLabel(item.usr_role),
        lastUpdatedDate: formatDateTime(item.last_update_date),
        lastUpdatedDateRaw: item.last_update_date,
        createdBy: item.created_by,
      }));

      setRows(mappedRows);
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi kesalahan saat mengambil data pengguna");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const payload = token ? decodeJwtPayload(token) : null;

    if (!token) {
      router.replace("/login");
      return;
    }

    setUserName(payload?.usr_nama_lengkap || "Admin");

    if (payload?.usr_role !== "admin") {
      router.replace("/dashboard");
      return;
    }
  }, [router, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const roleOptions = ["Semua", "Admin", "Staff"];

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const result = rows.filter((row) => {
      const matchSearch =
        keyword === ""
          ? true
          : [row.nama, row.email, row.noHp, row.roleLabel, row.lastUpdatedDate]
              .join(" ")
              .toLowerCase()
              .includes(keyword);

      const matchRole =
        selectedRole === "Semua" ? true : row.roleLabel === selectedRole;

      return matchSearch && matchRole;
    });

    return [...result].sort((a, b) => {
      const timeA = parseDate(a.lastUpdatedDateRaw);
      const timeB = parseDate(b.lastUpdatedDateRaw);
      return sortType === "newest" ? timeB - timeA : timeA - timeB;
    });
  }, [rows, search, selectedRole, sortType]);

  const filteredIds = useMemo(() => filteredRows.map((row) => row.id), [filteredRows]);

  const selectedCount = useMemo(
    () => [...selectedIds].filter((id) => rows.some((row) => row.id === id)).length,
    [selectedIds, rows]
  );

  const isAllFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));

  const rowsPerPage = 15;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));

  const currentRows = filteredRows.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const visiblePages = getVisiblePages(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [search, selectedRole, sortType]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const toggleRowSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (isAllFilteredSelected) {
        filteredIds.forEach((id) => next.delete(id));
      } else {
        filteredIds.forEach((id) => next.add(id));
      }

      return next;
    });
  };

  const resetModal = () => {
    setModalMode(null);
    setActiveStaffId(null);
    setForm(emptyForm);
    setModalErrorMsg("");
    setModalSaving(false);
    setEditConfirmOpen(false);
  };

  const openAddModal = () => {
    setModalMode("add");
    setActiveStaffId(null);
    setForm(emptyForm);
    setModalErrorMsg("");
  };

  const openEditModal = (id: number) => {
    const target = apiRows.find((item) => item.usr_id === id);
    if (!target) return;

    setModalMode("edit");
    setActiveStaffId(id);
    setForm({
      usr_nama_lengkap: target.usr_nama_lengkap,
      usr_email: target.usr_email,
      usr_no_hp: target.usr_no_hp,
      usr_password: "",
      usr_role: target.usr_role,
    });
    setModalErrorMsg("");
  };

  const handleFormChange = (field: keyof StaffForm, value: string) => {
    if (field === "usr_role") {
      setForm((prev) => ({
        ...prev,
        usr_role: value === "admin" ? "admin" : "staff",
      }));
      return;
    }

    if (field === "usr_no_hp") {
      const numericOnly = value.replace(/\D/g, "").slice(0, 12);
      setForm((prev) => ({
        ...prev,
        usr_no_hp: numericOnly,
      }));
      return;
    }

    if (field === "usr_nama_lengkap") {
      setForm((prev) => ({
        ...prev,
        usr_nama_lengkap: value.slice(0, 30),
      }));
      return;
    }

    if (field === "usr_email") {
      setForm((prev) => ({
        ...prev,
        usr_email: value.slice(0, 50),
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveStaff = async (confirmed = false) => {
    if (!token) {
      router.replace("/login");
      return;
    }

    const isEdit = modalMode === "edit";
    const validationErrors = [
      validateName(form.usr_nama_lengkap),
      validateEmail(form.usr_email),
      validatePhone(form.usr_no_hp),
      validatePassword(form.usr_password, isEdit),
      !["staff", "admin"].includes(form.usr_role) ? "Role wajib dipilih." : "",
    ].filter(Boolean);

    if (validationErrors.length > 0) {
      setModalErrorMsg(validationErrors[0]);
      setFeedbackModal({
        type: "error",
        title: "Validasi Gagal",
        message: validationErrors[0],
      });
      return;
    }

    if (isEdit && !confirmed) {
      setEditConfirmOpen(true);
      return;
    }

    try {
      setModalSaving(true);
      setModalErrorMsg("");

      const url = isEdit
        ? `${API_BASE_URL}/user/${activeStaffId}`
        : `${API_BASE_URL}/user`;

      const body: Record<string, any> = {
        usr_nama_lengkap: form.usr_nama_lengkap.trim(),
        usr_email: form.usr_email.trim(),
        usr_no_hp: form.usr_no_hp.trim(),
        usr_role: form.usr_role,
      };

      if (!isEdit || form.usr_password.trim()) {
        body.usr_password = form.usr_password.trim();
      }

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await parseJsonResponse(res);

      if (!res.ok) {
        const message = data?.message || (isEdit ? "Gagal memperbarui data user." : "Gagal menyimpan data user.");
        setModalErrorMsg(message);
        setFeedbackModal({
          type: "error",
          title: isEdit ? "Update Gagal" : "Simpan Gagal",
          message,
        });
        return;
      }

      resetModal();
      await fetchData();
      setFeedbackModal({
        type: "success",
        title: isEdit ? "Update Berhasil" : "Data Berhasil Ditambahkan",
        message: isEdit
          ? "Data user berhasil diperbarui."
          : "Data user berhasil ditambahkan.",
      });
    } catch (err: any) {
      const message = err?.message || (isEdit ? "Terjadi kesalahan saat memperbarui data user." : "Terjadi kesalahan saat menyimpan data user.");
      setModalErrorMsg(message);
      setFeedbackModal({
        type: "error",
        title: isEdit ? "Update Gagal" : "Simpan Gagal",
        message,
      });
    } finally {
      setModalSaving(false);
    }
  };

  const openDeleteModal = (target: DeleteTarget) => {
  setDeleteTarget(target);
  };

  const closeDeleteModal = () => {
    if (deleteSaving) return;
    setDeleteTarget(null);
  };

  const handleDeleteStaff = (id: number, nama: string) => {
      openDeleteModal({
        mode: "single",
        ids: [id],
        label: nama,
      });
    };

    const handleDeleteSelected = () => {
    const idsToDelete = [...selectedIds];

    if (idsToDelete.length === 0) return;

    openDeleteModal({
      mode: "bulk",
      ids: idsToDelete,
      label: `${idsToDelete.length} data user terpilih`,
    });
  };

  const confirmDeleteStaff = async () => {
    if (!token) {
      router.replace("/login");
      return;
    }

    if (!deleteTarget || deleteTarget.ids.length === 0) return;

    try {
      setDeleteSaving(true);
      setErrorMsg("");

      const results = await Promise.allSettled(
        deleteTarget.ids.map(async (id) => {
          const res = await fetch(`${API_BASE_URL}/user/${id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const data = await parseJsonResponse(res);

          if (!res.ok) {
            throw new Error(data?.message || `Gagal menghapus pengguna dengan ID ${id}`);
          }

          return id;
        })
      );

      const failed = results.filter((result) => result.status === "rejected");

      await fetchData();

      if (failed.length > 0) {
        const message = `${failed.length} data gagal dihapus. Silakan cek kembali.`;
        setErrorMsg(message);
        setFeedbackModal({
          type: "error",
          title: "Hapus Data Gagal",
          message,
        });
        return;
      }

      setSelectedIds(new Set());
      setDeleteTarget(null);
      setFeedbackModal({
        type: "success",
        title: "Hapus Data Berhasil",
        message:
          deleteTarget.mode === "single"
            ? "Data user berhasil dihapus."
            : "Data user terpilih berhasil dihapus.",
      });
    } catch (err: any) {
      const message = err?.message || "Terjadi kesalahan saat menghapus data user.";
      setErrorMsg(message);
      setFeedbackModal({
        type: "error",
        title: "Hapus Data Gagal",
        message,
      });
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <>
      <div className={styles.page}>
        <div className={styles.topRow}>
          <h1 className={styles.pageTitle}>MANAJEMEN USER</h1>
          <div className={styles.hello}>Halo, {userName}</div>
        </div>

        {errorMsg ? <div className={styles.errorBox}>{errorMsg}</div> : null}

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
            {selectedCount > 0 ? (
              <button
                type="button"
                className={`${styles.toolbarButton} ${styles.deleteSelectedButton}`}
                onClick={handleDeleteSelected}
              >
                <TrashIcon />
                <span>Hapus Terpilih ({selectedCount})</span>
              </button>
            ) : null}

            <button
              type="button"
              className={`${styles.toolbarButton} ${styles.addButton}`}
              onClick={openAddModal}
            >
              <PlusIcon />
              <span>Tambah Pengguna</span>
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
                  <div className={styles.dropdownTitle}>Filter berdasarkan role</div>

                  <div className={styles.dropdownOptionList}>
                    {roleOptions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`${styles.dropdownOption} ${
                          selectedRole === item ? styles.dropdownOptionActive : ""
                        }`}
                        onClick={() => {
                          setSelectedRole(item);
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
              onClick={() => setSortType((prev) => (prev === "newest" ? "oldest" : "newest"))}
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
                <th className={styles.checkboxTh}>
                  <input
                    type="checkbox"
                    className={styles.rowCheckbox}
                    checked={isAllFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    aria-label="Pilih semua data pengguna"
                    disabled={filteredIds.length === 0}
                  />
                </th>
                <th>No</th>
                <th>Nama Lengkap</th>
                <th>Email</th>
                <th>No Handphone</th>
                <th>Role</th>
                <th>Terakhir Diperbarui</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className={styles.emptyState}>
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : currentRows.length > 0 ? (
                currentRows.map((row, index) => (
                  <tr key={row.id}>
                    <td className={styles.checkboxCell}>
                      <input
                        type="checkbox"
                        className={styles.rowCheckbox}
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleRowSelection(row.id)}
                        aria-label={`Pilih pengguna ${row.nama}`}
                      />
                    </td>
                    <td>{(page - 1) * rowsPerPage + index + 1}</td>
                    <td>{row.nama}</td>
                    <td>{row.email}</td>
                    <td>{row.noHp}</td>
                    <td>
                      <span
                        className={`${styles.roleBadge} ${
                          row.role === "admin" ? styles.roleBadgeAdmin : styles.roleBadgeStaff
                        }`}
                      >
                        {row.roleLabel}
                      </span>
                    </td>
                    <td>{row.lastUpdatedDate}</td>
                    <td>
                      <div className={styles.actionGroup}>
                        <button
                          type="button"
                          className={styles.actionButton}
                          aria-label="Hapus pengguna"
                          onClick={() => handleDeleteStaff(row.id, row.nama)}
                        >
                          <TrashIcon />
                        </button>
                        <button
                          type="button"
                          className={styles.actionButton}
                          aria-label="Edit pengguna"
                          onClick={() => openEditModal(row.id)}
                        >
                          <PencilIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className={styles.emptyState}>
                    Data pengguna tidak ditemukan.
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
      </div>

      <StaffModal
        open={modalMode !== null}
        mode={modalMode}
        form={form}
        saving={modalSaving}
        errorMsg={modalErrorMsg}
        onChange={handleFormChange}
        onClose={resetModal}
        onSave={handleSaveStaff}
      />

      {editConfirmOpen ? (
        <div
          className={styles.confirmModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-confirm-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !modalSaving) {
              setEditConfirmOpen(false);
            }
          }}
        >
          <div className={styles.confirmModalCard}>
            <h2 id="edit-confirm-title" className={styles.confirmModalTitle}>
              Konfirmasi Edit Data
            </h2>
            <p className={styles.confirmModalText}>
              Apakah Anda yakin ingin melakukan edit pada akun
              <strong> {form.usr_nama_lengkap || "user ini"}</strong>?
            </p>
            <div className={styles.confirmModalActions}>
              <button
                type="button"
                className={styles.confirmCancelButton}
                onClick={() => setEditConfirmOpen(false)}
                disabled={modalSaving}
              >
                Batal
              </button>
              <button
                type="button"
                className={styles.confirmPrimaryButton}
                onClick={() => handleSaveStaff(true)}
                disabled={modalSaving}
              >
                {modalSaving ? "Menyimpan..." : "Ya, Simpan"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {feedbackModal ? (
        <div
          className={styles.feedbackModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setFeedbackModal(null);
          }}
        >
          <div
            className={`${styles.feedbackModalCard} ${
              feedbackModal.type === "success"
                ? styles.feedbackModalSuccess
                : styles.feedbackModalError
            }`}
          >
            <div className={styles.feedbackModalIcon}>
              {feedbackModal.type === "success" ? "✓" : "!"}
            </div>
            <h2 id="feedback-modal-title" className={styles.feedbackModalTitle}>
              {feedbackModal.title}
            </h2>
            <p className={styles.feedbackModalText}>{feedbackModal.message}</p>
            <button
              type="button"
              className={styles.feedbackModalButton}
              onClick={() => setFeedbackModal(null)}
            >
              Tutup
            </button>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div
          className={styles.deleteModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDeleteModal();
          }}
        >
          <div className={styles.deleteModalCard}>
            <div className={styles.deleteModalIconDanger}>!</div>
            <h2 id="delete-modal-title" className={styles.deleteModalTitle}>
              Konfirmasi Hapus Data
            </h2>

            <div className={styles.deleteModalInfo}>
              Apakah Anda yakin ingin menghapus
              <strong> {deleteTarget.label}</strong>?
            </div>

            <div className={styles.deleteModalActions}>
              <button
                type="button"
                className={styles.deleteCancelButton}
                onClick={closeDeleteModal}
                disabled={deleteSaving}
              >
                Batal
              </button>

              <button
                type="button"
                className={styles.deleteConfirmButton}
                onClick={confirmDeleteStaff}
                disabled={deleteSaving}
              >
                {deleteSaving ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}