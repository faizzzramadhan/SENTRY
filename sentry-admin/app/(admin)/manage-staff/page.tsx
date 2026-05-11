"use client";

import styles from "./manage-staff.module.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

// api backend
const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5555/api";
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/humint\/?$/, "");

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
type ModalMode = "add" | "edit" | null;

type StaffApiRow = {
  usr_id: number;
  usr_nama_lengkap: string;
  usr_email: string;
  usr_no_hp: string;
  usr_role: "staff" | "admin";
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
  lastUpdatedDate: string;
  lastUpdatedDateRaw: string;
  createdBy: string;
};

type StaffForm = {
  usr_nama_lengkap: string;
  usr_email: string;
  usr_no_hp: string;
  usr_password: string;
};

type DeleteTarget = {
  mode: "single" | "bulk";
  ids: number[];
  label: string;
};

const emptyForm: StaffForm = {
  usr_nama_lengkap: "",
  usr_email: "",
  usr_no_hp: "",
  usr_password: "",
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
            Nama Staff Pusdalops<span className={styles.modalRequired}>*</span>
          </label>
          <input
            className={styles.modalInput}
            type="text"
            placeholder="isi data Nama Staff disini...."
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
            placeholder="isi data email disini...."
            value={form.usr_email}
            onChange={(e) => onChange("usr_email", e.target.value)}
          />
        </div>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>
            Handphone<span className={styles.modalRequired}>*</span>
          </label>
          <input
            className={styles.modalInput}
            type="text"
            placeholder="isi data Handphone disini...."
            value={form.usr_no_hp}
            onChange={(e) => onChange("usr_no_hp", e.target.value)}
          />
        </div>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>
            Password<span className={styles.modalRequired}>*</span>
          </label>
          <input
            className={styles.modalInput}
            type="password"
            placeholder="isi data password disini...."
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
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save"}
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
  const [selectedCreatedBy, setSelectedCreatedBy] = useState("Semua");
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

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchData = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setErrorMsg("");

      const res = await fetch(`${API_BASE_URL}/user/staff`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: StaffResponse | { message?: string } = await res.json();

      if (!res.ok) {
        setErrorMsg((data as any)?.message || "Gagal mengambil data staff");
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
        lastUpdatedDate: formatDateTime(item.last_update_date),
        lastUpdatedDateRaw: item.last_update_date,
        createdBy: item.created_by,
      }));

      setRows(mappedRows);
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi error saat mengambil data");
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

  const createdByOptions = useMemo(() => {
    const unique = Array.from(new Set(rows.map((item) => item.createdBy)));
    return ["Semua", ...unique];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const result = rows.filter((row) => {
      const matchSearch =
        keyword === ""
          ? true
          : [row.nama, row.email, row.noHp, row.lastUpdatedDate]
              .join(" ")
              .toLowerCase()
              .includes(keyword);

      const matchCreatedBy =
        selectedCreatedBy === "Semua" ? true : row.createdBy === selectedCreatedBy;

      return matchSearch && matchCreatedBy;
    });

    return [...result].sort((a, b) => {
      const timeA = parseDate(a.lastUpdatedDateRaw);
      const timeB = parseDate(b.lastUpdatedDateRaw);
      return sortType === "newest" ? timeB - timeA : timeA - timeB;
    });
  }, [rows, search, selectedCreatedBy, sortType]);

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
  }, [search, selectedCreatedBy, sortType]);

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
    });
    setModalErrorMsg("");
  };

  const handleFormChange = (field: keyof StaffForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveStaff = async () => {
    if (!token) {
      router.replace("/login");
      return;
    }

    if (!form.usr_nama_lengkap.trim()) {
      setModalErrorMsg("Nama staff wajib diisi.");
      return;
    }

    if (!form.usr_email.trim()) {
      setModalErrorMsg("Email wajib diisi.");
      return;
    }

    if (!form.usr_no_hp.trim()) {
      setModalErrorMsg("Handphone wajib diisi.");
      return;
    }

    if (modalMode === "add" && !form.usr_password.trim()) {
      setModalErrorMsg("Password wajib diisi.");
      return;
    }

    try {
      setModalSaving(true);
      setModalErrorMsg("");

      const isEdit = modalMode === "edit";
      const url = isEdit
        ? `${API_BASE_URL}/user/${activeStaffId}`
        : `${API_BASE_URL}/user`;

      const body: Record<string, any> = {
        usr_nama_lengkap: form.usr_nama_lengkap.trim(),
        usr_email: form.usr_email.trim(),
        usr_no_hp: form.usr_no_hp.trim(),
        usr_role: "staff",
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

      const data = await res.json();

      if (!res.ok) {
        setModalErrorMsg(data?.message || "Gagal menyimpan data staff.");
        return;
      }

      resetModal();
      await fetchData();
    } catch (err: any) {
      setModalErrorMsg(err?.message || "Terjadi error saat menyimpan staff.");
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
      label: `${idsToDelete.length} data staff terpilih`,
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

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data?.message || `Gagal menghapus staff dengan ID ${id}`);
          }

          return id;
        })
      );

      const failed = results.filter((result) => result.status === "rejected");

      await fetchData();

      if (failed.length > 0) {
        setErrorMsg(`${failed.length} data gagal dihapus. Silakan cek kembali.`);
        return;
      }

      setSelectedIds(new Set());
      setDeleteTarget(null);
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi error saat menghapus data staff.");
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <>
      <div className={styles.page}>
        <div className={styles.topRow}>
          <h1 className={styles.pageTitle}>MANAGE USER</h1>
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
              <span>Tambah</span>
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
                  <div className={styles.dropdownTitle}>Filter by Created By</div>

                  <div className={styles.dropdownOptionList}>
                    {createdByOptions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`${styles.dropdownOption} ${
                          selectedCreatedBy === item ? styles.dropdownOptionActive : ""
                        }`}
                        onClick={() => {
                          setSelectedCreatedBy(item);
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
                    aria-label="Pilih semua data staff"
                    disabled={filteredIds.length === 0}
                  />
                </th>
                <th>No</th>
                <th>Nama Staff Pusdalops</th>
                <th>email</th>
                <th>No Handphone</th>
                <th>Last Updated Date</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className={styles.emptyState}>
                    Memuat data staff...
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
                        aria-label={`Pilih staff ${row.nama}`}
                      />
                    </td>
                    <td>{(page - 1) * rowsPerPage + index + 1}</td>
                    <td>{row.nama}</td>
                    <td>{row.email}</td>
                    <td>{row.noHp}</td>
                    <td>{row.lastUpdatedDate}</td>
                    <td>
                      <div className={styles.actionGroup}>
                        <button
                          type="button"
                          className={styles.actionButton}
                          aria-label="Hapus staff"
                          onClick={() => handleDeleteStaff(row.id, row.nama)}
                        >
                          <TrashIcon />
                        </button>
                        <button
                          type="button"
                          className={styles.actionButton}
                          aria-label="Edit staff"
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
                  <td colSpan={7} className={styles.emptyState}>
                    Data staff tidak ditemukan.
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
            <h2 id="delete-modal-title" className={styles.deleteModalTitle}>
              Apakah anda
              <br />
              yakin Menghapus data ini?
            </h2>

            <div className={styles.deleteModalInfo}>
              {deleteTarget.mode === "single"
                ? deleteTarget.label
                : deleteTarget.label}
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
                {deleteSaving ? "Menghapus..." : "Iya"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}