"use client";

import styles from "./settings.module.css";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

// decode payload JWT (tanpa library)
function decodeJwtPayload(token: string): any | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

type AreaRow = {
  no: number;
  kelurahan: string;
  createdBy: string;
  updatedAt: string;
};

type KeywordRow = {
  no: number;
  keyword: string;
  createdBy: string;
  updatedAt: string;
};

type SortType = "newest" | "oldest";

const areaRows: AreaRow[] = [
  { no: 1, kelurahan: "Bojongsoang", createdBy: "Arif Samsudin", updatedAt: "2025-01-12 14:30" },
  { no: 2, kelurahan: "Bojongsoang", createdBy: "Gusti Restu", updatedAt: "2025-01-12 14:30" },
  { no: 3, kelurahan: "Bojongsoang", createdBy: "Arif Samsudin", updatedAt: "2025-01-12 14:30" },
  { no: 4, kelurahan: "Bojongsoang", createdBy: "Arif Samsudin", updatedAt: "2025-01-12 14:30" },
  { no: 5, kelurahan: "Lowokwaru", createdBy: "Arif Samsudin", updatedAt: "2025-01-12 14:30" },
  { no: 6, kelurahan: "Rampal Celaket", createdBy: "Arif Samsudin", updatedAt: "2025-01-12 14:30" },
  { no: 7, kelurahan: "Oro Oro Dowo", createdBy: "Arif Samsudin", updatedAt: "2025-01-12 14:30" },
  { no: 8, kelurahan: "Samaan", createdBy: "Gusti Restu", updatedAt: "2025-01-12 14:30" },
  { no: 9, kelurahan: "Buring", createdBy: "Gusti Restu", updatedAt: "2025-01-12 14:30" },
  { no: 10, kelurahan: "Wonokoyo", createdBy: "Gusti Restu", updatedAt: "2025-01-12 14:30" },
  { no: 11, kelurahan: "Tasikmadu", createdBy: "Gusti Restu", updatedAt: "2025-01-12 14:30" },
  { no: 12, kelurahan: "Jodipan", createdBy: "Gusti Restu", updatedAt: "2025-01-12 14:30" },
  { no: 13, kelurahan: "Balearjosari", createdBy: "Gusti Restu", updatedAt: "2025-01-12 14:30" },
  { no: 14, kelurahan: "Bojongsoang", createdBy: "Arif Samsudin", updatedAt: "2025-01-12 14:30" },
  { no: 15, kelurahan: "Bojongsoang", createdBy: "Arif Samsudin", updatedAt: "2025-01-12 14:30" },
  { no: 16, kelurahan: "Bojongsoang", createdBy: "Arif Samsudin", updatedAt: "2025-01-12 14:30" },
  { no: 17, kelurahan: "Bojongsoang", createdBy: "Arif Samsudin", updatedAt: "2025-01-12 14:30" },
  { no: 18, kelurahan: "Bojongsoang", createdBy: "Arif Samsudin", updatedAt: "2025-01-12 14:30" },
  { no: 19, kelurahan: "Bojongsoang", createdBy: "Arif Samsudin", updatedAt: "2025-01-12 14:30" },
  { no: 20, kelurahan: "Bojongsoang", createdBy: "Arif Samsudin", updatedAt: "2025-01-12 14:30" },
  { no: 21, kelurahan: "Klojen", createdBy: "Gusti Restu", updatedAt: "2025-01-11 11:20" },
  { no: 22, kelurahan: "Kiduldalem", createdBy: "Arif Samsudin", updatedAt: "2025-01-10 09:10" },
  { no: 23, kelurahan: "Tlogomas", createdBy: "Gusti Restu", updatedAt: "2025-01-09 15:45" },
  { no: 24, kelurahan: "Merjosari", createdBy: "Arif Samsudin", updatedAt: "2025-01-08 07:30" },
];

const keywordRows: KeywordRow[] = [
  { no: 1, keyword: "Longsor", createdBy: "Arif Samsudin", updatedAt: "2025-01-12 14:30" },
  { no: 2, keyword: "Banjir", createdBy: "Arif Samsudin", updatedAt: "2025-01-12 14:30" },
  { no: 3, keyword: "Longsor", createdBy: "Arif Samsudin", updatedAt: "2025-01-12 14:30" },
  { no: 4, keyword: "Longsor", createdBy: "Gusti Restu", updatedAt: "2025-01-12 14:30" },
  { no: 5, keyword: "Longsor", createdBy: "Gusti Restu", updatedAt: "2025-01-12 14:30" },
  { no: 6, keyword: "Longsor", createdBy: "Gusti Restu", updatedAt: "2025-01-12 14:30" },
  { no: 7, keyword: "Longsor", createdBy: "Gusti Restu", updatedAt: "2025-01-12 14:30" },
  { no: 8, keyword: "Banjir", createdBy: "Gusti Restu", updatedAt: "2025-01-12 14:30" },
  { no: 9, keyword: "Banjir", createdBy: "Gusti Restu", updatedAt: "2025-01-12 14:30" },
  { no: 10, keyword: "Banjir", createdBy: "Arif Samsudin", updatedAt: "2025-01-12 14:30" },
  { no: 11, keyword: "Banjir", createdBy: "Arif Samsudin", updatedAt: "2025-01-12 14:30" },
  { no: 12, keyword: "Banjir", createdBy: "Arif Samsudin", updatedAt: "2025-01-12 14:30" },
  { no: 13, keyword: "Banjir", createdBy: "Arif Samsudin", updatedAt: "2025-01-12 14:30" },
  { no: 14, keyword: "Banjir", createdBy: "Arif Samsudin", updatedAt: "2025-01-12 14:30" },
  { no: 15, keyword: "Pohon Tumbang", createdBy: "Arif Samsudin", updatedAt: "2025-01-12 14:30" },
  { no: 16, keyword: "Gempa", createdBy: "Gusti Restu", updatedAt: "2025-01-11 09:00" },
  { no: 17, keyword: "Angin Kencang", createdBy: "Arif Samsudin", updatedAt: "2025-01-10 08:00" },
  { no: 18, keyword: "Kebakaran", createdBy: "Gusti Restu", updatedAt: "2025-01-09 20:15" },
];

function parseDate(dateString: string) {
  return new Date(dateString.replace(" ", "T")).getTime();
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

export default function SettingsOsintPage() {
  const router = useRouter();

  const [adminName, setAdminName] = useState("Admin");
  const [search, setSearch] = useState("");
  const [selectedKelurahan, setSelectedKelurahan] = useState<string>("Semua");
  const [sortType, setSortType] = useState<SortType>("newest");
  const [openFilter, setOpenFilter] = useState(false);

  const [areaPage, setAreaPage] = useState(1);
  const [keywordPage, setKeywordPage] = useState(1);

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

  const kelurahanOptions = useMemo(() => {
    const uniqueKelurahan = Array.from(new Set(areaRows.map((row) => row.kelurahan)));
    return ["Semua", ...uniqueKelurahan];
  }, []);

  // HANYA UNTUK TABEL KIRI
  const filteredAreaRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const result = areaRows.filter((row) => {
      const matchSearch =
        keyword === ""
          ? true
          : [row.kelurahan, row.createdBy, row.updatedAt]
              .join(" ")
              .toLowerCase()
              .includes(keyword);

      const matchKelurahan =
        selectedKelurahan === "Semua" ? true : row.kelurahan === selectedKelurahan;

      return matchSearch && matchKelurahan;
    });

    return [...result].sort((a, b) => {
      const timeA = parseDate(a.updatedAt);
      const timeB = parseDate(b.updatedAt);
      return sortType === "newest" ? timeB - timeA : timeA - timeB;
    });
  }, [search, selectedKelurahan, sortType]);

  // TABEL KANAN TIDAK TERPENGARUH SEARCH/FILTER/SORT
  const keywordRowsPerPage = 15;
  const areaRowsPerPage = 20;

  const areaTotalPages = Math.max(1, Math.ceil(filteredAreaRows.length / areaRowsPerPage));
  const keywordTotalPages = Math.max(1, Math.ceil(keywordRows.length / keywordRowsPerPage));

  const currentAreaRows = filteredAreaRows.slice(
    (areaPage - 1) * areaRowsPerPage,
    areaPage * areaRowsPerPage
  );

  const currentKeywordRows = keywordRows.slice(
    (keywordPage - 1) * keywordRowsPerPage,
    keywordPage * keywordRowsPerPage
  );

  const visibleAreaPages = getVisiblePages(areaPage, areaTotalPages);
  const visibleKeywordPages = getVisiblePages(keywordPage, keywordTotalPages);

  useEffect(() => {
    setAreaPage(1);
  }, [search, selectedKelurahan, sortType]);

  useEffect(() => {
    if (areaPage > areaTotalPages) setAreaPage(areaTotalPages);
  }, [areaPage, areaTotalPages]);

  useEffect(() => {
    if (keywordPage > keywordTotalPages) setKeywordPage(keywordTotalPages);
  }, [keywordPage, keywordTotalPages]);

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <div className={styles.titleWrap}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => router.push("/monitoring-osint")}
            aria-label="Kembali"
          >
            <BackIcon />
          </button>

          <h1 className={styles.pageTitle}>SETTINGS OSINT</h1>
        </div>

        <div className={styles.hello}>Halo, {adminName}</div>
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.leftSection}>
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
                <span>{sortType === "newest" ? "Sort" : "Terlama"}</span>
              </button>

              <button type="button" className={styles.addButton}>
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
                  <th>Kelurahan</th>
                  <th>Created By</th>
                  <th>Last Updated Date</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {currentAreaRows.length > 0 ? (
                  currentAreaRows.map((row, index) => (
                    <tr key={`${row.no}-${row.kelurahan}-${index}`}>
                      <td>{(areaPage - 1) * areaRowsPerPage + index + 1}</td>
                      <td>{row.kelurahan}</td>
                      <td>{row.createdBy}</td>
                      <td>{row.updatedAt}</td>
                      <td>
                        <button type="button" className={styles.actionButton} aria-label="Edit kelurahan">
                          <PencilIcon />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className={styles.emptyState}>
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

        <div className={styles.rightSection}>
          <div className={styles.metricGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricTitle}>SET JUMLAH POSTINGAN</div>
              <div className={styles.metricContent}>
                <div className={styles.metricValueWrap}>
                  <PostIcon />
                  <span className={styles.metricValue}>50</span>
                </div>
                <button type="button" className={styles.editMiniButton}>
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
                  <span className={styles.metricValue}>50</span>
                </div>
                <button type="button" className={styles.editMiniButton}>
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
                  <span className={styles.metricValue}>50</span>
                </div>
                <button type="button" className={styles.editMiniButton}>
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
                  <span className={styles.metricValue}>50</span>
                </div>
                <button type="button" className={styles.editMiniButton}>
                  <span>Edit</span>
                  <span className={styles.arrowMini}>→</span>
                </button>
              </div>
            </div>
          </div>

          <div className={styles.keywordSection}>
            <div className={styles.smallTableWrap}>
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
                      <tr key={`${row.no}-${row.keyword}-${index}`}>
                        <td>{(keywordPage - 1) * keywordRowsPerPage + index + 1}</td>
                        <td>{row.keyword}</td>
                        <td>{row.createdBy}</td>
                        <td>{row.updatedAt}</td>
                        <td>
                          <button type="button" className={styles.actionButton} aria-label="Edit keyword">
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

            <div className={styles.smallPaginationWrap}>
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
      </div>
    </div>
  );
}


// asdjadkadhsbhbdsha