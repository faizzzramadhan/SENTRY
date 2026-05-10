"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../components/navbar";
import styles from "./weather.module.css";

type WeatherPayload = {
  city: string;
  current: {
    temp: number;
    desc: string;
    icon: string;
    humidity: number;
    windKmh: number;
  };
  daily: {
    label: string;
    dateIso: string;
    min: number;
    max: number;
    icon: string;
    desc: string;
  }[];
};

type OsintXItem = {
  osint_id: number;
  osint_source: "X";
  osint_event_type?: string | null;
  osint_area_text?: string | null;
  osint_account_name?: string | null;
  osint_account_username?: string | null;
  osint_content?: string | null;
  osint_post_time?: string | null;
  osint_link_url?: string | null;
  osint_media_url?: string | null;
  osint_like_count?: number | null;
  osint_share_count?: number | null;
  osint_reply_count?: number | null;
  osint_view_count?: number | null;
  osint_verification_status?: string | null;
  osint_priority_level?: string | null;
  creation_date?: string | null;
  last_update_date?: string | null;
};

type OsintXResponse = {
  count: number;
  osint_data: OsintXItem[];
};

function titleCaseId(s: string) {
  return s
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function normalizeTitle(value?: string | null) {
  const text = String(value || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "Data Bencana";

  return titleCaseId(text.toLowerCase());
}

function truncateText(value?: string | null, maxLength = 96) {
  const text = String(value || "").replace(/\s+/g, " ").trim();

  if (!text) return "Keterangan bencana belum tersedia.";
  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength)}...`;
}

function formatDateIndo(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(date)
    .replace(/\./g, ":");
}

export default function PrakiraanCuacaPage() {
  const [data, setData] = useState<WeatherPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [osintRows, setOsintRows] = useState<OsintXItem[]>([]);
  const [osintLoading, setOsintLoading] = useState(true);
  const [osintErr, setOsintErr] = useState("");

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const [selectedOsint, setSelectedOsint] = useState<OsintXItem | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationAction, setVerificationAction] = useState<"YA" | "TIDAK" | null>(null);

  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const todayLabel = useMemo(() => {
    const now = new Date();
    const date = new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(now);

    return `Hari ini, ${date}`;
  }, []);

  const updateScrollState = () => {
    const el = scrollerRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const maxScrollLeft = el.scrollWidth - el.clientWidth;

    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < maxScrollLeft - 4);
  };

  useEffect(() => {
    const runWeather = async () => {
      try {
        setLoading(true);
        setErr("");

        const res = await fetch("/api/weather", {
          cache: "no-store",
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.message || "Gagal ambil data cuaca");
        }

        setData(json);
      } catch (e: any) {
        setErr(e?.message || "Terjadi error");
      } finally {
        setLoading(false);
      }
    };

    const runOsint = async () => {
      try {
        setOsintLoading(true);
        setOsintErr("");

        const res = await fetch("/api/osint/x-unverified?limit=4", {
          cache: "no-store",
        });

        const json: OsintXResponse = await res.json();

        if (!res.ok) {
          throw new Error(
            (json as any)?.message || "Gagal ambil data OSINT X"
          );
        }

        setOsintRows(Array.isArray(json.osint_data) ? json.osint_data : []);
      } catch (e: any) {
        setOsintErr(e?.message || "Gagal memuat data OSINT X");
        setOsintRows([]);
      } finally {
        setOsintLoading(false);
      }
    };

    runWeather();
    runOsint();
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    updateScrollState();

    el.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);

    const timeout = window.setTimeout(updateScrollState, 150);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      window.clearTimeout(timeout);
    };
  }, [data?.daily?.length]);

  const scrollDaily = (direction: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;

    const firstCard = el.querySelector<HTMLElement>("[data-day-card='true']");
    const scrollAmount = firstCard
      ? firstCard.offsetWidth + 18
      : 320;

    el.scrollBy({
      left: direction === "right" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    });

    window.setTimeout(updateScrollState, 260);
  };

  const openXPost = (item: OsintXItem) => {
    if (!item.osint_link_url) {
      window.alert("Link postingan X belum tersedia.");
      return;
    }

    window.open(item.osint_link_url, "_blank", "noopener,noreferrer");
  };

  const openVerifyModal = (item: OsintXItem) => {
    setSelectedOsint(item);
    setShowVerifyModal(true);
  };

  const closeVerifyModal = () => {
    if (verificationLoading) return;

    setShowVerifyModal(false);
    setSelectedOsint(null);
    setVerificationAction(null);
  };

  const submitVerification = async (action: "YA" | "TIDAK") => {
    if (!selectedOsint) return;

    try {
      setVerificationLoading(true);
      setVerificationAction(action);

      const res = await fetch(`/api/osint/x-verify/${selectedOsint.osint_id}`, {
        method: "PUT",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          action,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || json?.error || "Gagal memproses verifikasi.");
      }

      setOsintRows((prev) =>
        prev.filter((item) => item.osint_id !== selectedOsint.osint_id)
      );

      setShowVerifyModal(false);
      setSelectedOsint(null);
      setVerificationAction(null);
    } catch (error: any) {
      window.alert(error?.message || "Gagal memproses verifikasi.");
    } finally {
      setVerificationLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        <h1 className={styles.title}>Prakiraan Cuaca</h1>

        <div className={styles.subTitle}>
          <span className={styles.pin}>📍</span>
          <span className={styles.city}>{data?.city || "Kota Malang"}</span>
        </div>

        <div className={styles.dateLine}>{todayLabel}</div>

        <section className={styles.panel}>
          {loading ? (
            <div className={styles.state}>Memuat data cuaca...</div>
          ) : err ? (
            <div className={styles.stateError}>{err}</div>
          ) : data ? (
            <>
              <div className={styles.summary}>
                <div className={styles.summaryLeft}>
                  <img
                    className={styles.bigIcon}
                    src={`https://openweathermap.org/img/wn/${data.current.icon}@4x.png`}
                    alt={data.current.desc}
                  />

                  <div>
                    <div className={styles.desc}>
                      {titleCaseId(data.current.desc)}
                    </div>

                    <div className={styles.temp}>{data.current.temp}°C</div>

                    <div className={styles.small}>
                      Kelembapan: {data.current.humidity}%
                    </div>
                  </div>
                </div>

                <div className={styles.summaryRight}>
                  <div className={styles.infoBox}>
                    <div className={styles.infoRow}>
                      <span className={styles.infoIcon}>💧</span>
                      <span>Kelembapan: {data.current.humidity}%</span>
                    </div>

                    <div className={styles.infoRow}>
                      <span className={styles.infoIcon}>🧭</span>
                      <span>Angin: {data.current.windKmh} km/jam</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.dailyWrap}>
                <button
                  className={`${styles.arrowBtn} ${styles.arrowLeft}`}
                  type="button"
                  onClick={() => scrollDaily("left")}
                  aria-label="Geser prakiraan cuaca ke kiri"
                  disabled={!canScrollLeft}
                >
                  ‹
                </button>

                <div className={styles.dailyScroller} ref={scrollerRef}>
                  {data.daily.map((d) => (
                    <div
                      key={d.dateIso}
                      className={styles.dayCard}
                      data-day-card="true"
                    >
                      <div className={styles.dayLabel}>{d.label}</div>

                      <img
                        className={styles.dayIcon}
                        src={`https://openweathermap.org/img/wn/${d.icon}@2x.png`}
                        alt={d.desc}
                      />

                      <div className={styles.dayTemp}>
                        {d.max}°/{d.min}°
                      </div>

                      <div className={styles.dayTemp2}>
                        {d.max}°/{d.min}°
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  className={`${styles.arrowBtn} ${styles.arrowRight}`}
                  type="button"
                  onClick={() => scrollDaily("right")}
                  aria-label="Geser prakiraan cuaca ke kanan"
                  disabled={!canScrollRight}
                >
                  ›
                </button>
              </div>
            </>
          ) : null}
        </section>

        <section className={styles.osintSection}>
          <div className={styles.osintHeader}>
            <div>
              <h2 className={styles.osintTitle}>
                Bantu Verifikasi Informasi dari X
              </h2>
              <p className={styles.osintSubtitle}>
                Data di bawah ini berasal dari X dan masih belum terverifikasi.
                Klik tombol verifikasi untuk membuka postingan asli.
              </p>
            </div>

            <span className={styles.osintBadge}>
              {osintLoading ? "Memuat..." : `${osintRows.length} Data`}
            </span>
          </div>

          {osintLoading ? (
            <div className={styles.osintState}>
              Memuat data OSINT X belum terverifikasi...
            </div>
          ) : osintErr ? (
            <div className={styles.osintStateError}>{osintErr}</div>
          ) : osintRows.length > 0 ? (
            <div className={styles.osintGrid}>
              {osintRows.map((item) => (
                <article
                  key={item.osint_id}
                  className={styles.osintCard}
                  role="button"
                  tabIndex={0}
                  onClick={() => openXPost(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openXPost(item);
                    }
                  }}
                >
                  <div className={styles.osintImageWrap}>
                    {item.osint_media_url ? (
                      <img
                        src={item.osint_media_url}
                        alt={item.osint_event_type || "Data OSINT X"}
                        className={styles.osintImage}
                      />
                    ) : (
                      <div className={styles.osintPlaceholder}>
                        <span>X</span>
                      </div>
                    )}

                    <span className={styles.osintSourceBadge}>X</span>
                  </div>

                  <div className={styles.osintContent}>
                    <div className={styles.osintCardTitle}>
                      {normalizeTitle(item.osint_event_type)}
                    </div>

                    <div className={styles.osintCardMeta}>sumber data: X</div>

                    <p className={styles.osintSnippet}>
                      {truncateText(item.osint_content, 112)}
                    </p>

                    <div className={styles.osintLocation}>
                      {item.osint_area_text || "Lokasi belum terdeteksi"}
                    </div>

                    <div className={styles.osintTime}>
                      {formatDateIndo(
                        item.osint_post_time ||
                          item.creation_date ||
                          item.last_update_date
                      )}
                    </div>

                    <button
                      type="button"
                      className={styles.verifyButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        openVerifyModal(item);
                      }}
                    >
                      apakah data ini benar?
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.osintEmpty}>
              Belum ada data X yang membutuhkan verifikasi.
            </div>
          )}
        </section>
      </main>

      <footer className={styles.footer}>
        SENTRY © 2026. All rights reserved.
      </footer>

      {showVerifyModal && selectedOsint && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="verify-modal-title"
        >
          <div className={styles.modalBox}>
            <button
              type="button"
              className={styles.modalCloseButton}
              onClick={closeVerifyModal}
              disabled={verificationLoading}
              aria-label="Tutup popup verifikasi"
            >
              ×
            </button>

            <div className={styles.modalIcon}>?</div>

            <h3 id="verify-modal-title" className={styles.modalTitle}>
              Yakin ingin verifikasi?
            </h3>

            <p className={styles.modalText}>
              Pilih <strong>Ya</strong> jika informasi pada data X ini benar.
              Pilih <strong>Tidak</strong> jika informasi tidak sesuai atau tidak valid.
            </p>

            <div className={styles.modalPreview}>
              {truncateText(selectedOsint.osint_content, 120)}
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalRejectButton}
                onClick={() => submitVerification("TIDAK")}
                disabled={verificationLoading}
              >
                {verificationLoading && verificationAction === "TIDAK"
                  ? "Memproses..."
                  : "Tidak"}
              </button>

              <button
                type="button"
                className={styles.modalConfirmButton}
                onClick={() => submitVerification("YA")}
                disabled={verificationLoading}
              >
                {verificationLoading && verificationAction === "YA"
                  ? "Memproses..."
                  : "Ya"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}